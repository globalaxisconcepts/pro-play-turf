import { Bucket, type PrismaClient } from "@prisma/client";
import type { LedgerService } from "@/server/ledger/ledger-service";
import { SYSTEM_WALLET_ID } from "@/server/ledger/system";
import type { CardCustodian } from "./custodian";
import {
  CardNotFoundError,
  CardNotOwnedError,
  ListingNotAvailableError,
  SelfPurchaseError,
} from "./errors";

const BPS = 10_000n;

export interface MarketOptions {
  /** House cut of every sale, in basis points. */
  feeBps?: number;
}

/**
 * Trading Passes between players.
 *
 * Money moves through LedgerService exactly like every other flow — the buyer's
 * AVAILABLE falls by the price, the seller's rises by the price minus fee, and
 * the fee lands in HOUSE, all in one balanced transaction. Custody moves
 * through the CardCustodian in the same breath, so a Pass can never be paid for
 * without changing hands, or change hands without being paid for.
 */
export class MarketService {
  private readonly feeBps: number;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly ledger: LedgerService,
    private readonly custodian: CardCustodian,
    opts: MarketOptions = {},
  ) {
    this.feeBps = opts.feeBps ?? 500;
  }

  /** Offer a Pass for sale. */
  async list(input: {
    instanceId: string;
    sellerId: string;
    priceCents: bigint;
  }): Promise<{ listingId: string }> {
    const { instanceId, sellerId, priceCents } = input;
    if (priceCents <= 0n) throw new Error("A listing needs a price above zero.");

    const card = await this.prisma.cardInstance.findUnique({
      where: { id: instanceId },
      select: { id: true, ownerUserId: true, status: true },
    });
    if (!card) throw new CardNotFoundError(instanceId);
    if (card.ownerUserId !== sellerId) throw new CardNotOwnedError(instanceId);
    // Only an idle Pass can be offered: a listed one is already promised, and a
    // surrendered one no longer exists.
    if (card.status !== "OWNED") {
      throw new Error("That Pass isn't available to list.");
    }

    return this.prisma.$transaction(async (tx) => {
      const listing = await tx.cardListing.create({
        data: { cardInstanceId: instanceId, sellerUserId: sellerId, priceCents },
        select: { id: true },
      });
      await tx.cardInstance.update({
        where: { id: instanceId },
        data: { status: "LISTED" },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: sellerId,
          action: "CARD_LISTED",
          entityType: "card",
          entityId: instanceId,
          detail: `Listed for ${priceCents} cents.`,
        },
      });
      return { listingId: listing.id };
    });
  }

  /** Withdraw an offer and take the Pass back off the market. */
  async cancel(input: { listingId: string; sellerId: string }): Promise<void> {
    const listing = await this.prisma.cardListing.findUnique({
      where: { id: input.listingId },
      select: {
        id: true,
        status: true,
        sellerUserId: true,
        cardInstanceId: true,
      },
    });
    if (!listing) throw new ListingNotAvailableError(input.listingId);
    if (listing.sellerUserId !== input.sellerId) {
      throw new CardNotOwnedError(listing.cardInstanceId);
    }
    if (listing.status !== "ACTIVE") {
      throw new ListingNotAvailableError(input.listingId);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cardListing.update({
        where: { id: listing.id },
        data: { status: "CANCELLED" },
      });
      await tx.cardInstance.update({
        where: { id: listing.cardInstanceId },
        data: { status: "OWNED" },
      });
    });
  }

  /** Buy a listed Pass. Money and custody move together or not at all. */
  async buy(input: {
    listingId: string;
    buyerId: string;
  }): Promise<{ paidCents: bigint; feeCents: bigint }> {
    const { listingId, buyerId } = input;

    const listing = await this.prisma.cardListing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        status: true,
        priceCents: true,
        sellerUserId: true,
        cardInstanceId: true,
      },
    });
    if (!listing || listing.status !== "ACTIVE") {
      throw new ListingNotAvailableError(listingId);
    }
    if (listing.sellerUserId === buyerId) throw new SelfPurchaseError();

    const [buyerWallet, sellerWallet] = await Promise.all([
      this.prisma.wallet.findUnique({
        where: { userId: buyerId },
        select: { id: true },
      }),
      this.prisma.wallet.findUnique({
        where: { userId: listing.sellerUserId },
        select: { id: true },
      }),
    ]);
    if (!buyerWallet) throw new Error(`Buyer ${buyerId} has no wallet.`);
    if (!sellerWallet) {
      throw new Error(`Seller ${listing.sellerUserId} has no wallet.`);
    }

    const feeCents = (listing.priceCents * BigInt(this.feeBps)) / BPS;
    const proceeds = listing.priceCents - feeCents;

    // Money first: if the buyer can't cover it this throws and nothing else has
    // happened yet, so the Pass stays exactly where it was.
    await this.ledger.post({
      txnId: `market-${listingId}`,
      reason: "CARD_BUY",
      refType: "card",
      refId: listing.cardInstanceId,
      lines: [
        {
          walletId: buyerWallet.id,
          bucket: Bucket.AVAILABLE,
          amountCents: -listing.priceCents,
        },
        {
          walletId: sellerWallet.id,
          bucket: Bucket.AVAILABLE,
          amountCents: proceeds,
        },
        ...(feeCents > 0n
          ? [
              {
                walletId: SYSTEM_WALLET_ID,
                bucket: Bucket.HOUSE,
                amountCents: feeCents,
              },
            ]
          : []),
      ],
    });

    await this.prisma.$transaction(async (tx) => {
      await this.custodian.transfer(tx, {
        instanceId: listing.cardInstanceId,
        toUserId: buyerId,
      });
      await tx.cardListing.update({
        where: { id: listing.id },
        data: { status: "SOLD", buyerUserId: buyerId, soldAt: new Date() },
      });
      await tx.cardTxn.create({
        data: {
          cardInstanceId: listing.cardInstanceId,
          fromUserId: listing.sellerUserId,
          toUserId: buyerId,
          priceCents: listing.priceCents,
          feeCents,
          ledgerTxnId: `market-${listingId}`,
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: buyerId,
          action: "CARD_SOLD",
          entityType: "card",
          entityId: listing.cardInstanceId,
          detail: `Sold by ${listing.sellerUserId} for ${listing.priceCents} cents (fee ${feeCents}).`,
        },
      });
    });

    return { paidCents: listing.priceCents, feeCents };
  }

  /** Everything currently for sale. */
  async listActive() {
    return this.prisma.cardListing.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        priceCents: true,
        sellerUserId: true,
        seller: { select: { displayName: true } },
        cardInstance: {
          select: {
            id: true,
            serial: true,
            cardType: {
              select: {
                tier: true,
                name: true,
                qualifier: true,
                faceValueCents: true,
              },
            },
          },
        },
      },
    });
  }

  /** The fee a sale at this price would incur, for display before confirming. */
  feeFor(priceCents: bigint): bigint {
    return (priceCents * BigInt(this.feeBps)) / BPS;
  }
}

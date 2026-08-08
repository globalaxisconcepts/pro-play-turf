import { Bucket, type PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { InProcessWalletLock } from "@/lib/lock/in-process-lock";
import { InsufficientFundsError } from "@/server/ledger/errors";
import { LedgerService } from "@/server/ledger/ledger-service";
import { SYSTEM_USER_ID, SYSTEM_WALLET_ID } from "@/server/ledger/system";
import { InternalCardCustodian } from "@/server/cards/custodian";
import {
  CardNotOwnedError,
  ListingNotAvailableError,
  SelfPurchaseError,
} from "@/server/cards/errors";
import { MarketService } from "@/server/cards/market-service";
import { createTestDb, type TestDb } from "../helpers/pglite";

describe("MarketService (PGlite integration)", () => {
  let db: TestDb;
  let prisma: PrismaClient;
  let ledger: LedgerService;
  let market: MarketService;
  let cardId: string;

  const PRICE = 10_000n; // $100
  const FEE_BPS = 500; // 5% -> 500 cents

  beforeEach(async () => {
    db = await createTestDb();
    prisma = db.prisma;
    ledger = new LedgerService(prisma, new InProcessWalletLock());
    market = new MarketService(prisma, ledger, new InternalCardCustodian(), {
      feeBps: FEE_BPS,
    });

    await prisma.user.create({
      data: {
        id: SYSTEM_USER_ID,
        email: "sys@t.test",
        displayName: "House",
        role: "SYSTEM",
      },
    });
    await prisma.wallet.create({
      data: { id: SYSTEM_WALLET_ID, userId: SYSTEM_USER_ID },
    });
    await prisma.cardType.create({
      data: {
        id: "ct",
        tier: "ELITE",
        name: "Elite Premier Pass",
        qualifier: "Premier",
        faceValueCents: 5_000n,
      },
    });

    for (const id of ["seller", "buyer", "other"]) {
      await prisma.user.create({
        data: { id, email: `${id}@t.test`, displayName: id },
      });
      const w = await prisma.wallet.create({
        data: { id: `w-${id}`, userId: id },
      });
      await ledger.post({
        txnId: `fund-${id}`,
        reason: "ADMIN_GRANT",
        lines: [
          { walletId: w.id, bucket: Bucket.AVAILABLE, amountCents: 50_000n },
          {
            walletId: SYSTEM_WALLET_ID,
            bucket: Bucket.HOUSE,
            amountCents: -50_000n,
          },
        ],
      });
    }

    const card = await prisma.cardInstance.create({
      data: { cardTypeId: "ct", ownerUserId: "seller", serial: 1 },
    });
    cardId = card.id;
  });

  afterEach(async () => {
    await db.close();
  });

  const available = async (userId: string) =>
    (
      await prisma.wallet.findUniqueOrThrow({
        where: { userId },
        select: { availableCents: true },
      })
    ).availableCents;

  async function assertBalanced() {
    const txns = await prisma.ledgerTransaction.findMany({
      select: { id: true, entries: { select: { amountCents: true } } },
    });
    for (const t of txns) {
      const sum = t.entries.reduce((a, e) => a + e.amountCents, 0n);
      expect(`${t.id}=${sum}`).toBe(`${t.id}=0`);
    }
  }

  const listIt = () =>
    market.list({ instanceId: cardId, sellerId: "seller", priceCents: PRICE });

  describe("list", () => {
    it("marks the Pass listed and opens an active listing", async () => {
      const { listingId } = await listIt();

      expect(
        (await prisma.cardInstance.findUniqueOrThrow({ where: { id: cardId } }))
          .status,
      ).toBe("LISTED");
      expect(
        (await prisma.cardListing.findUniqueOrThrow({ where: { id: listingId } }))
          .status,
      ).toBe("ACTIVE");
    });

    it("refuses to list a Pass you don't own", async () => {
      await expect(
        market.list({ instanceId: cardId, sellerId: "buyer", priceCents: PRICE }),
      ).rejects.toThrow(CardNotOwnedError);
    });

    it("refuses to list the same Pass twice", async () => {
      await listIt();
      await expect(listIt()).rejects.toThrow();
    });

    it("refuses a zero or negative price", async () => {
      await expect(
        market.list({ instanceId: cardId, sellerId: "seller", priceCents: 0n }),
      ).rejects.toThrow();
    });
  });

  describe("cancel", () => {
    it("returns the Pass to the owner and closes the listing", async () => {
      const { listingId } = await listIt();
      await market.cancel({ listingId, sellerId: "seller" });

      expect(
        (await prisma.cardInstance.findUniqueOrThrow({ where: { id: cardId } }))
          .status,
      ).toBe("OWNED");
      expect(
        (await prisma.cardListing.findUniqueOrThrow({ where: { id: listingId } }))
          .status,
      ).toBe("CANCELLED");
    });

    it("refuses to cancel someone else's listing", async () => {
      const { listingId } = await listIt();
      await expect(
        market.cancel({ listingId, sellerId: "other" }),
      ).rejects.toThrow(CardNotOwnedError);
    });
  });

  describe("buy", () => {
    it("moves the money, the fee, and the Pass together", async () => {
      const { listingId } = await listIt();

      await market.buy({ listingId, buyerId: "buyer" });

      // 10000 price, 5% fee = 500 -> seller nets 9500
      expect(await available("buyer")).toBe(50_000n - PRICE);
      expect(await available("seller")).toBe(50_000n + 9_500n);

      const card = await prisma.cardInstance.findUniqueOrThrow({
        where: { id: cardId },
      });
      expect(card.ownerUserId).toBe("buyer");
      expect(card.status).toBe("OWNED");
      await assertBalanced();
    });

    it("routes the market fee to HOUSE", async () => {
      const before = (
        await prisma.ledgerEntry.aggregate({
          _sum: { amountCents: true },
          where: { walletId: SYSTEM_WALLET_ID, bucket: Bucket.HOUSE },
        })
      )._sum.amountCents;

      const { listingId } = await listIt();
      await market.buy({ listingId, buyerId: "buyer" });

      const after = (
        await prisma.ledgerEntry.aggregate({
          _sum: { amountCents: true },
          where: { walletId: SYSTEM_WALLET_ID, bucket: Bucket.HOUSE },
        })
      )._sum.amountCents;
      expect((after ?? 0n) - (before ?? 0n)).toBe(500n);
    });

    it("closes the listing and records the provenance", async () => {
      const { listingId } = await listIt();
      await market.buy({ listingId, buyerId: "buyer" });

      const listing = await prisma.cardListing.findUniqueOrThrow({
        where: { id: listingId },
      });
      expect(listing).toMatchObject({ status: "SOLD", buyerUserId: "buyer" });

      const txn = await prisma.cardTxn.findFirstOrThrow({
        where: { cardInstanceId: cardId },
      });
      expect(txn).toMatchObject({
        fromUserId: "seller",
        toUserId: "buyer",
        priceCents: PRICE,
        feeCents: 500n,
      });
    });

    it("refuses to let a seller buy their own Pass", async () => {
      const { listingId } = await listIt();
      await expect(
        market.buy({ listingId, buyerId: "seller" }),
      ).rejects.toThrow(SelfPurchaseError);
    });

    it("refuses to sell the same listing twice", async () => {
      const { listingId } = await listIt();
      await market.buy({ listingId, buyerId: "buyer" });

      await expect(
        market.buy({ listingId, buyerId: "other" }),
      ).rejects.toThrow(ListingNotAvailableError);
    });

    it("refuses to buy a cancelled listing", async () => {
      const { listingId } = await listIt();
      await market.cancel({ listingId, sellerId: "seller" });

      await expect(
        market.buy({ listingId, buyerId: "buyer" }),
      ).rejects.toThrow(ListingNotAvailableError);
    });

    it("rejects an underfunded buyer and leaves the Pass with the seller", async () => {
      await prisma.cardInstance.update({
        where: { id: cardId },
        data: { status: "OWNED" },
      });
      const { listingId } = await market.list({
        instanceId: cardId,
        sellerId: "seller",
        priceCents: 500_000n,
      });

      await expect(
        market.buy({ listingId, buyerId: "buyer" }),
      ).rejects.toThrow(InsufficientFundsError);

      const card = await prisma.cardInstance.findUniqueOrThrow({
        where: { id: cardId },
      });
      expect(card.ownerUserId).toBe("seller");
      expect(await available("buyer")).toBe(50_000n);
      await assertBalanced();
    });
  });

  describe("marketplace listing feed", () => {
    it("shows active listings from other players", async () => {
      await listIt();
      const open = await market.listActive();
      expect(open).toHaveLength(1);
      expect(open[0]).toMatchObject({ sellerUserId: "seller" });
    });

    it("drops sold listings from the feed", async () => {
      const { listingId } = await listIt();
      await market.buy({ listingId, buyerId: "buyer" });
      expect(await market.listActive()).toEqual([]);
    });
  });
});

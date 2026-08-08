import type { PrismaClient } from "@prisma/client";
import type { CardCustodian } from "./custodian";
import {
  CardNotFoundError,
  CardNotOwnedError,
  CardNotSurrenderableError,
  NoCardTypeError,
  SupplyExhaustedError,
} from "./errors";

/** Placements that earn a Pass. */
const MINTING_POSITIONS = 3;

export interface MintResult {
  leagueId: string;
  minted: number;
}

/**
 * Access Passes: minted for a top-3 finish, surrendered to climb a division.
 *
 * Ownership is only ever changed through the CardCustodian, so moving custody
 * elsewhere later touches one class. Minting is idempotent on
 * (mintedForLeagueId, ownerUserId) — a league can be settled twice without
 * printing a second Pass for the same finish.
 */
export class CardService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly custodian: CardCustodian,
  ) {}

  /** Mint a Pass for each top-3 finisher in a settled league. */
  async mintForPlacements(leagueId: string): Promise<MintResult> {
    const league = await this.prisma.league.findUnique({
      where: { id: leagueId },
      select: { division: { select: { tier: true } } },
    });
    if (!league) return { leagueId, minted: 0 };

    const placings = await this.prisma.standing.findMany({
      where: { leagueId, position: { lte: MINTING_POSITIONS } },
      orderBy: { position: "asc" },
      select: { userId: true, position: true },
    });
    if (placings.length === 0) return { leagueId, minted: 0 };

    const tier = league.division.tier;
    const cardType = await this.prisma.cardType.findUnique({
      where: { tier },
      select: { id: true, maxSupply: true, minted: true },
    });
    if (!cardType) throw new NoCardTypeError(tier);

    let minted = 0;
    for (const placing of placings) {
      const already = await this.prisma.cardInstance.findFirst({
        where: { mintedForLeagueId: leagueId, ownerUserId: placing.userId },
        select: { id: true },
      });
      if (already) continue;

      // Serial and supply move together inside one transaction so two
      // concurrent mints can't hand out the same serial or overshoot the cap.
      await this.prisma.$transaction(async (tx) => {
        const type = await tx.cardType.findUniqueOrThrow({
          where: { id: cardType.id },
          select: { minted: true, maxSupply: true },
        });
        if (type.maxSupply !== null && type.minted >= type.maxSupply) {
          throw new SupplyExhaustedError(tier);
        }
        const serial = type.minted + 1;

        await tx.cardInstance.create({
          data: {
            cardTypeId: cardType.id,
            ownerUserId: placing.userId,
            serial,
            mintedForLeagueId: leagueId,
            mintedPosition: placing.position,
          },
        });
        await tx.cardType.update({
          where: { id: cardType.id },
          data: { minted: serial },
        });
        await tx.auditLog.create({
          data: {
            action: "CARD_MINTED",
            entityType: "card",
            entityId: `${cardType.id}#${serial}`,
            detail: `Minted to ${placing.userId} for position ${placing.position} in league ${leagueId}.`,
          },
        });
      });
      minted += 1;
    }

    return { leagueId, minted };
  }

  /**
   * Burn a Pass to move up a division next season. Irreversible by design —
   * the confirm modal says so, and there is no un-surrender path anywhere.
   */
  async surrender(input: {
    instanceId: string;
    userId: string;
  }): Promise<{ promotedTo: string | null }> {
    const { instanceId, userId } = input;

    const card = await this.prisma.cardInstance.findUnique({
      where: { id: instanceId },
      select: { id: true, ownerUserId: true, status: true },
    });
    if (!card) throw new CardNotFoundError(instanceId);
    if (card.ownerUserId !== userId) throw new CardNotOwnedError(instanceId);
    // A listed Pass is promised to the market; a burned one is gone.
    if (card.status !== "OWNED") throw new CardNotSurrenderableError(instanceId);

    // The perk applies to the player's most recent finish: it lifts where they
    // are placed next season by one rung.
    const standing = await this.prisma.standing.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        nextDivisionId: true,
        league: { select: { division: { select: { seasonId: true, rank: true } } } },
      },
    });

    let promotedTo: string | null = null;
    if (standing) {
      const currentRank =
        standing.nextDivisionId === null
          ? standing.league.division.rank
          : ((
              await this.prisma.division.findUnique({
                where: { id: standing.nextDivisionId },
                select: { rank: true },
              })
            )?.rank ?? standing.league.division.rank);

      const higher = await this.prisma.division.findFirst({
        where: {
          seasonId: standing.league.division.seasonId,
          rank: { gt: currentRank },
        },
        orderBy: { rank: "asc" },
        select: { id: true },
      });
      promotedTo = higher?.id ?? null;
    }

    await this.prisma.$transaction(async (tx) => {
      await this.custodian.burn(tx, { instanceId });

      if (standing && promotedTo) {
        await tx.standing.update({
          where: { id: standing.id },
          data: { nextDivisionId: promotedTo, outcome: "PROMOTED" },
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: "CARD_SURRENDERED",
          entityType: "card",
          entityId: instanceId,
          detail: promotedTo
            ? `Burned for promotion to division ${promotedTo}.`
            : "Burned; no higher division was available.",
        },
      });
    });

    return { promotedTo };
  }

  /** A player's Passes. Burned ones are gone and never listed. */
  async collectionFor(userId: string) {
    return this.prisma.cardInstance.findMany({
      where: { ownerUserId: userId, status: { in: ["OWNED", "LISTED"] } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        serial: true,
        status: true,
        mintedPosition: true,
        cardType: {
          select: {
            tier: true,
            name: true,
            qualifier: true,
            faceValueCents: true,
          },
        },
      },
    });
  }

  /** One Pass with everything the detail view needs. */
  async getCard(instanceId: string) {
    return this.prisma.cardInstance.findUnique({
      where: { id: instanceId },
      select: {
        id: true,
        serial: true,
        status: true,
        ownerUserId: true,
        mintedPosition: true,
        mintedForLeagueId: true,
        owner: { select: { displayName: true } },
        cardType: {
          select: {
            tier: true,
            name: true,
            qualifier: true,
            faceValueCents: true,
          },
        },
      },
    });
  }
}

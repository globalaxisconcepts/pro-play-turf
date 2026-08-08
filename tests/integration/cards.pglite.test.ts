import type { PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CardService } from "@/server/cards/card-service";
import { InternalCardCustodian } from "@/server/cards/custodian";
import {
  CardNotOwnedError,
  CardNotSurrenderableError,
  SupplyExhaustedError,
} from "@/server/cards/errors";
import { createTestDb, type TestDb } from "../helpers/pglite";

describe("CardService (PGlite integration)", () => {
  let db: TestDb;
  let prisma: PrismaClient;
  let cards: CardService;

  const LEAGUE = "lg1";
  const LOW = "div-low";
  const HIGH = "div-high";

  beforeEach(async () => {
    db = await createTestDb();
    prisma = db.prisma;
    cards = new CardService(prisma, new InternalCardCustodian());

    await prisma.season.create({ data: { id: "s1", name: "S1", status: "ACTIVE" } });
    await prisma.division.createMany({
      data: [
        { id: LOW, seasonId: "s1", name: "Advanced", tier: "ADVANCED", rank: 2 },
        { id: HIGH, seasonId: "s1", name: "Elite", tier: "ELITE", rank: 3 },
      ],
    });
    await prisma.league.create({
      data: { id: LEAGUE, divisionId: LOW, name: "Conference North" },
    });
    await prisma.cardType.createMany({
      data: [
        {
          id: "ct-adv",
          tier: "ADVANCED",
          name: "Advanced Conference Pass",
          qualifier: "Conference",
          faceValueCents: 2_500n,
        },
        {
          id: "ct-elite",
          tier: "ELITE",
          name: "Elite Premier Pass",
          qualifier: "Premier",
          faceValueCents: 5_000n,
        },
      ],
    });

    for (const id of ["a", "b", "c", "d"]) {
      await prisma.user.create({
        data: { id, email: `${id}@t.test`, displayName: id.toUpperCase() },
      });
    }
  });

  afterEach(async () => {
    await db.close();
  });

  /** Freeze a finished table so there are placements to mint against. */
  async function standings(order: string[]) {
    await prisma.standing.createMany({
      data: order.map((userId, i) => ({
        leagueId: LEAGUE,
        userId,
        position: i + 1,
        played: 3,
        won: 3 - i,
        drawn: 0,
        lost: i,
        goalsFor: 6 - i,
        goalsAgainst: i,
        points: (3 - i) * 3,
        nextDivisionId: i === 0 ? HIGH : LOW,
      })),
    });
  }

  describe("mintForPlacements", () => {
    it("mints a Pass for each of the top three", async () => {
      await standings(["a", "b", "c", "d"]);

      const { minted } = await cards.mintForPlacements(LEAGUE);

      expect(minted).toBe(3);
      const owners = await prisma.cardInstance.findMany({
        select: { ownerUserId: true, mintedPosition: true },
        orderBy: { mintedPosition: "asc" },
      });
      expect(owners).toEqual([
        { ownerUserId: "a", mintedPosition: 1 },
        { ownerUserId: "b", mintedPosition: 2 },
        { ownerUserId: "c", mintedPosition: 3 },
      ]);
    });

    it("mints the Pass for the league's own tier", async () => {
      await standings(["a", "b", "c", "d"]);
      await cards.mintForPlacements(LEAGUE);

      const card = await prisma.cardInstance.findFirstOrThrow({
        where: { ownerUserId: "a" },
        include: { cardType: true },
      });
      expect(card.cardType.tier).toBe("ADVANCED");
    });

    it("numbers serials from 1 and never repeats one", async () => {
      await standings(["a", "b", "c", "d"]);
      await cards.mintForPlacements(LEAGUE);

      const serials = (
        await prisma.cardInstance.findMany({ select: { serial: true } })
      )
        .map((c) => c.serial)
        .sort();
      expect(serials).toEqual([1, 2, 3]);
      expect(
        (await prisma.cardType.findUniqueOrThrow({ where: { id: "ct-adv" } })).minted,
      ).toBe(3);
    });

    it("is idempotent — re-running mints nothing extra", async () => {
      await standings(["a", "b", "c", "d"]);
      await cards.mintForPlacements(LEAGUE);
      const second = await cards.mintForPlacements(LEAGUE);

      expect(second.minted).toBe(0);
      expect(await prisma.cardInstance.count()).toBe(3);
    });

    it("mints nothing for a league with no final table", async () => {
      expect((await cards.mintForPlacements(LEAGUE)).minted).toBe(0);
    });

    it("refuses to mint past a supply cap", async () => {
      await prisma.cardType.update({
        where: { id: "ct-adv" },
        data: { maxSupply: 2 },
      });
      await standings(["a", "b", "c", "d"]);

      await expect(cards.mintForPlacements(LEAGUE)).rejects.toThrow(
        SupplyExhaustedError,
      );
      // The two that fit were still minted — the cap stopped the third.
      expect(await prisma.cardInstance.count()).toBe(2);
    });
  });

  describe("surrender", () => {
    async function mintOne() {
      await standings(["a", "b", "c", "d"]);
      await cards.mintForPlacements(LEAGUE);
      return prisma.cardInstance.findFirstOrThrow({ where: { ownerUserId: "a" } });
    }

    it("burns the Pass and promotes the player a division", async () => {
      const card = await mintOne();
      // Start them level so the promotion is visible.
      await prisma.standing.update({
        where: { leagueId_userId: { leagueId: LEAGUE, userId: "a" } },
        data: { nextDivisionId: LOW, outcome: "STAYED" },
      });

      await cards.surrender({ instanceId: card.id, userId: "a" });

      const burned = await prisma.cardInstance.findUniqueOrThrow({
        where: { id: card.id },
      });
      expect(burned.status).toBe("SURRENDERED");
      expect(burned.surrenderedAt).toBeInstanceOf(Date);

      const standing = await prisma.standing.findUniqueOrThrow({
        where: { leagueId_userId: { leagueId: LEAGUE, userId: "a" } },
      });
      expect(standing.nextDivisionId).toBe(HIGH);
      expect(standing.outcome).toBe("PROMOTED");
    });

    it("is irreversible — a burned Pass can't be surrendered again", async () => {
      const card = await mintOne();
      await cards.surrender({ instanceId: card.id, userId: "a" });

      await expect(
        cards.surrender({ instanceId: card.id, userId: "a" }),
      ).rejects.toThrow(CardNotSurrenderableError);
    });

    it("refuses to burn someone else's Pass", async () => {
      const card = await mintOne();
      await expect(
        cards.surrender({ instanceId: card.id, userId: "b" }),
      ).rejects.toThrow(CardNotOwnedError);
      expect(
        (await prisma.cardInstance.findUniqueOrThrow({ where: { id: card.id } }))
          .status,
      ).toBe("OWNED");
    });

    it("refuses to burn a Pass that is listed for sale", async () => {
      const card = await mintOne();
      await prisma.cardInstance.update({
        where: { id: card.id },
        data: { status: "LISTED" },
      });

      await expect(
        cards.surrender({ instanceId: card.id, userId: "a" }),
      ).rejects.toThrow(CardNotSurrenderableError);
    });

    it("records the burn in the audit log", async () => {
      const card = await mintOne();
      await cards.surrender({ instanceId: card.id, userId: "a" });

      const log = await prisma.auditLog.findFirstOrThrow({
        where: { action: "CARD_SURRENDERED" },
      });
      expect(log).toMatchObject({ actorUserId: "a", entityId: card.id });
    });
  });

  describe("collection", () => {
    it("lists a player's Passes, newest first, excluding burned ones", async () => {
      await standings(["a", "b", "c", "d"]);
      await cards.mintForPlacements(LEAGUE);
      const card = await prisma.cardInstance.findFirstOrThrow({
        where: { ownerUserId: "a" },
      });
      await cards.surrender({ instanceId: card.id, userId: "a" });

      expect(await cards.collectionFor("a")).toEqual([]);
      expect(await cards.collectionFor("b")).toHaveLength(1);
    });
  });
});

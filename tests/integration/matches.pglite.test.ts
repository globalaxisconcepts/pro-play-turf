import type { PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AlreadySubmittedError,
  FixturesExistError,
  MatchClosedError,
  NotAPlayerError,
  NotEnoughEntrantsError,
} from "@/server/matches/errors";
import { MatchService } from "@/server/matches/match-service";
import { createTestDb, type TestDb } from "../helpers/pglite";

describe("MatchService (PGlite integration)", () => {
  let db: TestDb;
  let prisma: PrismaClient;
  let matches: MatchService;
  const LEAGUE = "lg1";

  beforeEach(async () => {
    db = await createTestDb();
    prisma = db.prisma;
    matches = new MatchService(prisma);

    await prisma.season.create({ data: { id: "s1", name: "S1", status: "ACTIVE" } });
    await prisma.division.create({
      data: { id: "d1", seasonId: "s1", name: "Div", tier: "ADVANCED", rank: 2 },
    });
    await prisma.league.create({
      data: { id: LEAGUE, divisionId: "d1", name: "Conference North", capacity: 16 },
    });
  });

  afterEach(async () => {
    await db.close();
  });

  async function entrants(...ids: string[]) {
    for (const id of ids) {
      await prisma.user.create({
        data: { id, email: `${id}@t.test`, displayName: id.toUpperCase() },
      });
      await prisma.leagueEntry.create({
        data: { leagueId: LEAGUE, userId: id, status: "ACTIVE" },
      });
    }
  }

  const statusOf = async (matchId: string) =>
    (await prisma.match.findUniqueOrThrow({ where: { id: matchId } })).status;

  describe("generateFixtures", () => {
    it("creates a full round-robin from the active entrants", async () => {
      await entrants("a", "b", "c", "d");

      const { created } = await matches.generateFixtures(LEAGUE);

      expect(created).toBe(6); // 4 players -> 4*3/2
      expect(await prisma.match.count({ where: { leagueId: LEAGUE } })).toBe(6);
    });

    it("ignores refunded entrants — they gave up their seat", async () => {
      await entrants("a", "b", "c");
      await prisma.leagueEntry.update({
        where: { leagueId_userId: { leagueId: LEAGUE, userId: "c" } },
        data: { status: "REFUNDED" },
      });

      const { created } = await matches.generateFixtures(LEAGUE);
      expect(created).toBe(1); // just a v b
    });

    it("marks the league LIVE once fixtures exist", async () => {
      await entrants("a", "b");
      await matches.generateFixtures(LEAGUE);

      const league = await prisma.league.findUniqueOrThrow({ where: { id: LEAGUE } });
      expect(league.status).toBe("LIVE");
    });

    it("refuses to generate twice", async () => {
      await entrants("a", "b");
      await matches.generateFixtures(LEAGUE);

      await expect(matches.generateFixtures(LEAGUE)).rejects.toThrow(
        FixturesExistError,
      );
      expect(await prisma.match.count()).toBe(1);
    });

    it("refuses a league with nobody to play", async () => {
      await entrants("a");
      await expect(matches.generateFixtures(LEAGUE)).rejects.toThrow(
        NotEnoughEntrantsError,
      );
    });
  });

  describe("submitResult", () => {
    let matchId: string;

    beforeEach(async () => {
      await entrants("a", "b");
      await matches.generateFixtures(LEAGUE);
      matchId = (await prisma.match.findFirstOrThrow()).id;
    });

    it("leaves the match AWAITING after one player reports", async () => {
      const result = await matches.submitResult({
        matchId,
        userId: "a",
        homeScore: 3,
        awayScore: 1,
      });

      expect(result.status).toBe("AWAITING");
      expect(await statusOf(matchId)).toBe("AWAITING");
      // No authoritative score until both agree.
      const m = await prisma.match.findUniqueOrThrow({ where: { id: matchId } });
      expect(m.homeScore).toBeNull();
      expect(m.awayScore).toBeNull();
    });

    it("VERIFIES the match when both players report the same score", async () => {
      await matches.submitResult({ matchId, userId: "a", homeScore: 3, awayScore: 1 });
      const result = await matches.submitResult({
        matchId,
        userId: "b",
        homeScore: 3,
        awayScore: 1,
      });

      expect(result.status).toBe("VERIFIED");
      const m = await prisma.match.findUniqueOrThrow({ where: { id: matchId } });
      expect(m.homeScore).toBe(3);
      expect(m.awayScore).toBe(1);
      expect(m.verifiedAt).toBeInstanceOf(Date);
    });

    it("sends disagreeing reports to review with no score recorded", async () => {
      await matches.submitResult({ matchId, userId: "a", homeScore: 3, awayScore: 1 });
      const result = await matches.submitResult({
        matchId,
        userId: "b",
        homeScore: 2,
        awayScore: 2,
      });

      expect(result.status).toBe("UNDER_REVIEW");
      const m = await prisma.match.findUniqueOrThrow({ where: { id: matchId } });
      expect(m.homeScore).toBeNull();
      expect(m.awayScore).toBeNull();
      // Both reports survive as evidence.
      expect(await prisma.matchSubmission.count({ where: { matchId } })).toBe(2);
    });

    it("refuses a second report from the same player", async () => {
      await matches.submitResult({ matchId, userId: "a", homeScore: 3, awayScore: 1 });

      await expect(
        matches.submitResult({ matchId, userId: "a", homeScore: 5, awayScore: 0 }),
      ).rejects.toThrow(AlreadySubmittedError);
      expect(await prisma.matchSubmission.count({ where: { matchId } })).toBe(1);
    });

    it("refuses a report from someone not in the match", async () => {
      await prisma.user.create({
        data: { id: "stranger", email: "s@t.test", displayName: "S" },
      });

      await expect(
        matches.submitResult({
          matchId,
          userId: "stranger",
          homeScore: 1,
          awayScore: 0,
        }),
      ).rejects.toThrow(NotAPlayerError);
    });

    it("refuses to report on an already-verified match", async () => {
      await matches.submitResult({ matchId, userId: "a", homeScore: 3, awayScore: 1 });
      await matches.submitResult({ matchId, userId: "b", homeScore: 3, awayScore: 1 });

      await prisma.matchSubmission.deleteMany({ where: { userId: "a" } });
      await expect(
        matches.submitResult({ matchId, userId: "a", homeScore: 9, awayScore: 0 }),
      ).rejects.toThrow(MatchClosedError);
    });

    it("rejects negative scores", async () => {
      await expect(
        matches.submitResult({ matchId, userId: "a", homeScore: -1, awayScore: 0 }),
      ).rejects.toThrow();
    });

    it("stores a stream-URL proof alongside the report", async () => {
      await matches.submitResult({
        matchId,
        userId: "a",
        homeScore: 2,
        awayScore: 0,
        proof: { kind: "STREAM_URL", url: "https://twitch.tv/videos/123" },
      });

      const proofs = await prisma.matchProof.findMany({ where: { matchId } });
      expect(proofs).toHaveLength(1);
      expect(proofs[0]).toMatchObject({
        userId: "a",
        kind: "STREAM_URL",
        url: "https://twitch.tv/videos/123",
      });
    });

    it("rejects a proof URL that isn't a real link", async () => {
      await expect(
        matches.submitResult({
          matchId,
          userId: "a",
          homeScore: 1,
          awayScore: 0,
          proof: { kind: "STREAM_URL", url: "javascript:alert(1)" },
        }),
      ).rejects.toThrow();
      expect(await prisma.matchSubmission.count({ where: { matchId } })).toBe(0);
    });
  });
});

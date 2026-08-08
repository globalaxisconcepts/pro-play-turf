import type { PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MatchService } from "@/server/matches/match-service";
import {
  DisputeExistsError,
  MatchClosedError,
  NotAPlayerError,
  NotUnderReviewError,
} from "@/server/matches/errors";
import { ReviewService } from "@/server/matches/review-service";
import { createTestDb, type TestDb } from "../helpers/pglite";

describe("ReviewService (PGlite integration)", () => {
  let db: TestDb;
  let prisma: PrismaClient;
  let matches: MatchService;
  let review: ReviewService;
  let matchId: string;
  const LEAGUE = "lg1";
  const REVIEWER = "ref";

  beforeEach(async () => {
    db = await createTestDb();
    prisma = db.prisma;
    matches = new MatchService(prisma);
    review = new ReviewService(prisma);

    await prisma.season.create({ data: { id: "s1", name: "S1", status: "ACTIVE" } });
    await prisma.division.create({
      data: { id: "d1", seasonId: "s1", name: "Div", tier: "ADVANCED", rank: 2 },
    });
    await prisma.league.create({
      data: { id: LEAGUE, divisionId: "d1", name: "North" },
    });
    for (const id of ["a", "b"]) {
      await prisma.user.create({
        data: { id, email: `${id}@t.test`, displayName: id.toUpperCase() },
      });
      await prisma.leagueEntry.create({
        data: { leagueId: LEAGUE, userId: id, status: "ACTIVE" },
      });
    }
    await prisma.user.create({
      data: { id: REVIEWER, email: "ref@t.test", displayName: "Ref", role: "REVIEWER" },
    });
    await matches.generateFixtures(LEAGUE);
    matchId = (await prisma.match.findFirstOrThrow()).id;
  });

  afterEach(async () => {
    await db.close();
  });

  /** Push the match into UNDER_REVIEW via disagreeing reports. */
  async function disagree() {
    await matches.submitResult({ matchId, userId: "a", homeScore: 3, awayScore: 1 });
    await matches.submitResult({ matchId, userId: "b", homeScore: 0, awayScore: 4 });
  }

  const matchRow = () =>
    prisma.match.findUniqueOrThrow({ where: { id: matchId } });

  const audits = () =>
    prisma.auditLog.findMany({ orderBy: { createdAt: "asc" } });

  describe("queue", () => {
    it("lists matches waiting on a human", async () => {
      await disagree();
      const queue = await review.listQueue();
      expect(queue.map((m) => m.id)).toEqual([matchId]);
      expect(queue[0].submissions).toHaveLength(2);
    });

    it("is empty when everything is settled", async () => {
      await matches.submitResult({ matchId, userId: "a", homeScore: 1, awayScore: 0 });
      await matches.submitResult({ matchId, userId: "b", homeScore: 1, awayScore: 0 });
      expect(await review.listQueue()).toEqual([]);
    });
  });

  describe("resolveMatch — verify", () => {
    it("records the reviewer's score and verifies the match", async () => {
      await disagree();

      await review.resolveMatch({
        matchId,
        reviewerId: REVIEWER,
        decision: "VERIFY",
        homeScore: 3,
        awayScore: 1,
        note: "Home VOD is conclusive.",
      });

      const m = await matchRow();
      expect(m.status).toBe("VERIFIED");
      expect(m.homeScore).toBe(3);
      expect(m.awayScore).toBe(1);
      expect(m.verifiedAt).toBeInstanceOf(Date);
    });

    it("writes an audit entry naming the reviewer", async () => {
      await disagree();
      await review.resolveMatch({
        matchId,
        reviewerId: REVIEWER,
        decision: "VERIFY",
        homeScore: 2,
        awayScore: 2,
      });

      const log = await audits();
      const entry = log.find((a) => a.action === "MATCH_VERIFIED");
      expect(entry).toMatchObject({
        actorUserId: REVIEWER,
        entityType: "match",
        entityId: matchId,
      });
      expect(entry?.detail).toContain("2-2");
    });

    it("keeps both original reports as evidence", async () => {
      await disagree();
      await review.resolveMatch({
        matchId,
        reviewerId: REVIEWER,
        decision: "VERIFY",
        homeScore: 3,
        awayScore: 1,
      });
      expect(await prisma.matchSubmission.count({ where: { matchId } })).toBe(2);
    });

    it("refuses a verify with no score", async () => {
      await disagree();
      await expect(
        review.resolveMatch({ matchId, reviewerId: REVIEWER, decision: "VERIFY" }),
      ).rejects.toThrow();
    });
  });

  describe("resolveMatch — void", () => {
    it("annuls the match and records no score", async () => {
      await disagree();

      await review.resolveMatch({
        matchId,
        reviewerId: REVIEWER,
        decision: "VOID",
        note: "Neither side produced proof.",
      });

      const m = await matchRow();
      expect(m.status).toBe("VOID");
      expect(m.homeScore).toBeNull();
      expect(m.awayScore).toBeNull();
      expect((await audits()).some((a) => a.action === "MATCH_VOIDED")).toBe(true);
    });

    it("clears a previously recorded score when voiding a verified match", async () => {
      await matches.submitResult({ matchId, userId: "a", homeScore: 5, awayScore: 0 });
      await matches.submitResult({ matchId, userId: "b", homeScore: 5, awayScore: 0 });
      await review.raiseDispute({
        matchId,
        userId: "b",
        reason: "Opponent used a banned squad.",
      });

      await review.resolveMatch({
        matchId,
        reviewerId: REVIEWER,
        decision: "VOID",
        note: "Confirmed.",
      });

      const m = await matchRow();
      expect(m.status).toBe("VOID");
      expect(m.homeScore).toBeNull();
      expect(m.verifiedAt).toBeNull();
    });

    it("refuses to resolve a match nobody has questioned", async () => {
      await expect(
        review.resolveMatch({ matchId, reviewerId: REVIEWER, decision: "VOID" }),
      ).rejects.toThrow(NotUnderReviewError);
    });
  });

  describe("raiseDispute", () => {
    it("moves a verified match to DISPUTED and logs it", async () => {
      await matches.submitResult({ matchId, userId: "a", homeScore: 2, awayScore: 0 });
      await matches.submitResult({ matchId, userId: "b", homeScore: 2, awayScore: 0 });

      await review.raiseDispute({
        matchId,
        userId: "b",
        reason: "He disconnected at 80 minutes.",
        evidenceUrl: "https://twitch.tv/videos/9",
      });

      expect((await matchRow()).status).toBe("DISPUTED");
      const d = await prisma.matchDispute.findFirstOrThrow();
      expect(d).toMatchObject({ raisedByUserId: "b", status: "OPEN" });
      expect((await audits()).some((a) => a.action === "DISPUTE_RAISED")).toBe(true);
    });

    it("refuses a dispute from someone not in the match", async () => {
      await disagree();
      await prisma.user.create({
        data: { id: "rando", email: "r@t.test", displayName: "R" },
      });
      await expect(
        review.raiseDispute({ matchId, userId: "rando", reason: "because" }),
      ).rejects.toThrow(NotAPlayerError);
    });

    it("allows only one open dispute per player per match", async () => {
      await disagree();
      await review.raiseDispute({ matchId, userId: "a", reason: "first" });
      await expect(
        review.raiseDispute({ matchId, userId: "a", reason: "again" }),
      ).rejects.toThrow(DisputeExistsError);
    });

    it("refuses a dispute on a match that was never played", async () => {
      await expect(
        review.raiseDispute({ matchId, userId: "a", reason: "nothing happened" }),
      ).rejects.toThrow(MatchClosedError);
    });

    it("closes open disputes when the match is resolved", async () => {
      await disagree();
      await review.raiseDispute({ matchId, userId: "a", reason: "he cheated" });

      await review.resolveMatch({
        matchId,
        reviewerId: REVIEWER,
        decision: "VOID",
        note: "Upheld.",
      });

      const d = await prisma.matchDispute.findFirstOrThrow();
      expect(d.status).toBe("UPHELD");
      expect(d.resolvedByUserId).toBe(REVIEWER);
      expect(d.resolvedAt).toBeInstanceOf(Date);
    });

    it("rejects open disputes when the result is upheld instead", async () => {
      await disagree();
      await review.raiseDispute({ matchId, userId: "a", reason: "he cheated" });

      await review.resolveMatch({
        matchId,
        reviewerId: REVIEWER,
        decision: "VERIFY",
        homeScore: 0,
        awayScore: 4,
      });

      expect((await prisma.matchDispute.findFirstOrThrow()).status).toBe("REJECTED");
    });
  });
});

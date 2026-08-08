import {
  type MatchStatus,
  Prisma,
  type PrismaClient,
  type ProofKind,
} from "@prisma/client";
import {
  AlreadySubmittedError,
  FixturesExistError,
  MatchClosedError,
  MatchNotFoundError,
  NotAPlayerError,
  NotEnoughEntrantsError,
} from "./errors";
import { isSafeProofUrl } from "./proof-storage";
import { generateSchedule } from "./schedule";

export interface SubmitResultInput {
  matchId: string;
  userId: string;
  homeScore: number;
  awayScore: number;
  proof?: { kind: ProofKind; url: string };
}

/** Statuses that still accept a player report. */
const OPEN_TO_REPORTS: ReadonlySet<MatchStatus> = new Set<MatchStatus>([
  "SCHEDULED",
  "LIVE",
  "AWAITING",
]);

/**
 * Fixtures and result reporting.
 *
 * There is no EA match API, so a match has no authoritative score until two
 * independent reports agree. Reports are append-only evidence: a player gets
 * exactly one, it is never overwritten, and both survive a disagreement so a
 * reviewer can see what each side claimed (Slice 6).
 */
export class MatchService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Build the league's round-robin from whoever holds a seat, and set it LIVE.
   * Refuses to run twice — regenerating would orphan played matches.
   */
  async generateFixtures(leagueId: string): Promise<{ created: number }> {
    const existing = await this.prisma.match.count({ where: { leagueId } });
    if (existing > 0) throw new FixturesExistError(leagueId);

    const entries = await this.prisma.leagueEntry.findMany({
      where: { leagueId, status: "ACTIVE" },
      orderBy: { joinedAt: "asc" },
      select: { userId: true },
    });
    if (entries.length < 2) throw new NotEnoughEntrantsError(leagueId);

    const fixtures = generateSchedule(entries.map((e) => e.userId));

    await this.prisma.$transaction(async (tx) => {
      await tx.match.createMany({
        data: fixtures.map((f) => ({
          leagueId,
          round: f.round,
          homeUserId: f.homeUserId,
          awayUserId: f.awayUserId,
        })),
      });
      await tx.league.update({
        where: { id: leagueId },
        data: { status: "LIVE" },
      });
    });

    return { created: fixtures.length };
  }

  /**
   * Record one player's report. Returns the match's status afterwards:
   * AWAITING (waiting on the opponent), VERIFIED (both agreed — this is now the
   * result), or UNDER_REVIEW (they disagreed; a human decides in Slice 6).
   */
  async submitResult(input: SubmitResultInput): Promise<{ status: MatchStatus }> {
    const { matchId, userId, homeScore, awayScore, proof } = input;

    if (!isScore(homeScore) || !isScore(awayScore)) {
      throw new Error("Scores must be whole numbers of 0 or more.");
    }
    if (proof && !isSafeProofUrl(proof.url)) {
      throw new Error("Proof must be an http(s) link.");
    }

    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        status: true,
        homeUserId: true,
        awayUserId: true,
        submissions: { select: { userId: true, homeScore: true, awayScore: true } },
      },
    });
    if (!match) throw new MatchNotFoundError(matchId);
    if (match.homeUserId !== userId && match.awayUserId !== userId) {
      throw new NotAPlayerError(matchId);
    }
    if (!OPEN_TO_REPORTS.has(match.status)) throw new MatchClosedError(matchId);
    if (match.submissions.some((s) => s.userId === userId)) {
      throw new AlreadySubmittedError(matchId);
    }

    const opponent = match.submissions[0];
    const agreed =
      opponent &&
      opponent.homeScore === homeScore &&
      opponent.awayScore === awayScore;
    const next: MatchStatus = !opponent
      ? "AWAITING"
      : agreed
        ? "VERIFIED"
        : "UNDER_REVIEW";

    await this.prisma.$transaction(async (tx) => {
      try {
        await tx.matchSubmission.create({
          data: { matchId, userId, homeScore, awayScore },
        });
      } catch (err) {
        // Lost a race with the same player's other tab.
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          throw new AlreadySubmittedError(matchId);
        }
        throw err;
      }

      if (proof) {
        await tx.matchProof.create({
          data: { matchId, userId, kind: proof.kind, url: proof.url },
        });
      }

      await tx.match.update({
        where: { id: matchId },
        data: {
          status: next,
          // A score is recorded ONLY when both reports agree.
          ...(next === "VERIFIED"
            ? { homeScore, awayScore, verifiedAt: new Date() }
            : {}),
        },
      });
    });

    return { status: next };
  }

  /** Every fixture in a league, with both players' names. */
  async listFixtures(leagueId: string) {
    return this.prisma.match.findMany({
      where: { leagueId },
      orderBy: [{ round: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        round: true,
        status: true,
        homeScore: true,
        awayScore: true,
        scheduledAt: true,
        homeUserId: true,
        awayUserId: true,
        home: { select: { displayName: true } },
        away: { select: { displayName: true } },
      },
    });
  }

  /** One match with everything the Match Room renders. */
  async getMatch(id: string) {
    return this.prisma.match.findUnique({
      where: { id },
      select: {
        id: true,
        leagueId: true,
        round: true,
        status: true,
        homeScore: true,
        awayScore: true,
        scheduledAt: true,
        verifiedAt: true,
        homeUserId: true,
        awayUserId: true,
        home: { select: { displayName: true } },
        away: { select: { displayName: true } },
        league: { select: { name: true, divisionId: true } },
        submissions: {
          orderBy: { submittedAt: "asc" },
          select: {
            userId: true,
            homeScore: true,
            awayScore: true,
            submittedAt: true,
          },
        },
        proofs: {
          orderBy: { createdAt: "asc" },
          select: { id: true, userId: true, kind: true, url: true },
        },
      },
    });
  }
}

function isScore(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= 99;
}

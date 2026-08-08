import { type MatchStatus, Prisma, type PrismaClient } from "@prisma/client";
import {
  DisputeExistsError,
  MatchClosedError,
  MatchNotFoundError,
  NotAPlayerError,
  NotUnderReviewError,
} from "./errors";
import { isSafeProofUrl } from "./proof-storage";

export interface RaiseDisputeInput {
  matchId: string;
  userId: string;
  reason: string;
  evidenceUrl?: string;
}

export interface ResolveMatchInput {
  matchId: string;
  reviewerId: string;
  decision: "VERIFY" | "VOID";
  /** Required when verifying — the score the reviewer rules as correct. */
  homeScore?: number;
  awayScore?: number;
  note?: string;
}

/** A match only reaches a human once it's in review or formally disputed. */
const ADJUDICABLE: ReadonlySet<MatchStatus> = new Set<MatchStatus>([
  "UNDER_REVIEW",
  "DISPUTED",
]);

/**
 * Only a played result is worth complaining about. DISPUTED is included so the
 * second player can file their own account of the same match.
 */
const DISPUTABLE: ReadonlySet<MatchStatus> = new Set<MatchStatus>([
  "VERIFIED",
  "UNDER_REVIEW",
  "DISPUTED",
  "AWAITING",
]);

/**
 * The tribunal: the review queue, reviewer decisions, and player disputes.
 *
 * Every decision that changes a result is written to the append-only AuditLog
 * in the same transaction as the change, so the log can never disagree with
 * what happened. Evidence is never destroyed — voiding a match leaves both
 * players' reports and proofs intact.
 */
export class ReviewService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Matches waiting on a human, oldest first. */
  async listQueue() {
    return this.prisma.match.findMany({
      where: { status: { in: ["UNDER_REVIEW", "DISPUTED"] } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        round: true,
        status: true,
        leagueId: true,
        league: { select: { name: true } },
        home: { select: { displayName: true } },
        away: { select: { displayName: true } },
        homeUserId: true,
        awayUserId: true,
        submissions: {
          select: { userId: true, homeScore: true, awayScore: true, submittedAt: true },
        },
        proofs: { select: { id: true, userId: true, kind: true, url: true } },
        disputes: {
          where: { status: "OPEN" },
          select: { id: true, raisedByUserId: true, reason: true, evidenceUrl: true },
        },
      },
    });
  }

  /**
   * A reviewer's ruling. VERIFY records the score they judge correct; VOID
   * annuls the match so it counts for nobody — standings derive from VERIFIED
   * matches, so voiding removes its effect automatically.
   */
  async resolveMatch(input: ResolveMatchInput): Promise<void> {
    const { matchId, reviewerId, decision, note } = input;

    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, status: true },
    });
    if (!match) throw new MatchNotFoundError(matchId);
    if (!ADJUDICABLE.has(match.status)) throw new NotUnderReviewError(matchId);

    if (decision === "VERIFY") {
      if (!isScore(input.homeScore) || !isScore(input.awayScore)) {
        throw new Error("Verifying a match requires both scores.");
      }
    }

    const verifying = decision === "VERIFY";
    await this.prisma.$transaction(async (tx) => {
      await tx.match.update({
        where: { id: matchId },
        data: verifying
          ? {
              status: "VERIFIED",
              homeScore: input.homeScore,
              awayScore: input.awayScore,
              verifiedAt: new Date(),
            }
          : // A void has no score, even if one was previously recorded.
            {
              status: "VOID",
              homeScore: null,
              awayScore: null,
              verifiedAt: null,
            },
      });

      // The complaint asked for the result to be thrown out: voiding grants
      // that, verifying denies it.
      await tx.matchDispute.updateMany({
        where: { matchId, status: "OPEN" },
        data: {
          status: verifying ? "REJECTED" : "UPHELD",
          resolvedByUserId: reviewerId,
          resolutionNote: note ?? null,
          resolvedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: reviewerId,
          action: verifying ? "MATCH_VERIFIED" : "MATCH_VOIDED",
          entityType: "match",
          entityId: matchId,
          detail: verifying
            ? `Reviewer set the result to ${input.homeScore}-${input.awayScore}.${note ? ` ${note}` : ""}`
            : `Reviewer voided the match.${note ? ` ${note}` : ""}`,
        },
      });
    });
  }

  /** A player formally contests a result. Moves the match to the tribunal. */
  async raiseDispute(input: RaiseDisputeInput): Promise<{ disputeId: string }> {
    const { matchId, userId, reason, evidenceUrl } = input;

    if (!reason.trim()) throw new Error("A dispute needs a reason.");
    if (evidenceUrl && !isSafeProofUrl(evidenceUrl)) {
      throw new Error("Evidence must be an http(s) link.");
    }

    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, status: true, homeUserId: true, awayUserId: true },
    });
    if (!match) throw new MatchNotFoundError(matchId);
    if (match.homeUserId !== userId && match.awayUserId !== userId) {
      throw new NotAPlayerError(matchId);
    }
    // Checked before the status guard so a repeat filer gets "you already
    // disputed this" rather than the confusing "match is closed".
    const already = await this.prisma.matchDispute.findUnique({
      where: { matchId_raisedByUserId: { matchId, raisedByUserId: userId } },
      select: { id: true },
    });
    if (already) throw new DisputeExistsError(matchId);
    if (!DISPUTABLE.has(match.status)) throw new MatchClosedError(matchId);

    return this.prisma.$transaction(async (tx) => {
      let disputeId: string;
      try {
        const dispute = await tx.matchDispute.create({
          data: {
            matchId,
            raisedByUserId: userId,
            reason: reason.trim(),
            evidenceUrl: evidenceUrl ?? null,
          },
          select: { id: true },
        });
        disputeId = dispute.id;
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          throw new DisputeExistsError(matchId);
        }
        throw err;
      }

      await tx.match.update({
        where: { id: matchId },
        data: { status: "DISPUTED" },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          action: "DISPUTE_RAISED",
          entityType: "match",
          entityId: matchId,
          detail: reason.trim().slice(0, 500),
        },
      });

      return { disputeId };
    });
  }

  /** Audit trail for one entity, newest first. */
  async auditFor(entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        actorUserId: true,
        detail: true,
        createdAt: true,
      },
    });
  }
}

function isScore(n: number | undefined): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 99;
}

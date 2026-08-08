"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isDatabaseConfigured } from "@/lib/db";
import { auth } from "@/server/auth";
import {
  AlreadySubmittedError,
  DisputeExistsError,
  MatchClosedError,
  MatchNotFoundError,
  NotAPlayerError,
} from "@/server/matches/errors";
import {
  ActionBlockedError,
  RateLimitedError,
} from "@/server/compliance/compliance-service";
import { complianceService, matchService, reviewService } from "@/server/services";

export type ReportState = {
  ok: boolean;
  error?: string;
  status?: string;
};

const schema = z.object({
  matchId: z.string().min(1),
  homeScore: z.coerce.number().int().min(0).max(99),
  awayScore: z.coerce.number().int().min(0).max(99),
  proofUrl: z
    .string()
    .trim()
    .url()
    .refine((u) => u.startsWith("http://") || u.startsWith("https://"), {
      message: "Link must start with http:// or https://",
    })
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

/** Report your score for a match. Both players must agree before it counts. */
export async function reportResultAction(
  _prev: ReportState,
  formData: FormData,
): Promise<ReportState> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "Match reporting is unavailable right now." };
  }

  const parsed = schema.safeParse({
    matchId: formData.get("matchId"),
    homeScore: formData.get("homeScore"),
    awayScore: formData.get("awayScore"),
    proofUrl: formData.get("proofUrl") ?? undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ??
        "Enter both scores as whole numbers, and a valid link if adding proof.",
    };
  }

  const { userId } = await auth();
  const { matchId, homeScore, awayScore, proofUrl } = parsed.data;

  try {
    await complianceService.guard(userId, "matchReport");
    const { status } = await matchService.submitResult({
      matchId,
      userId,
      homeScore,
      awayScore,
      proof: proofUrl ? { kind: "STREAM_URL", url: proofUrl } : undefined,
    });
    revalidatePath(`/matches/${matchId}`);
    return { ok: true, status };
  } catch (err) {
    if (err instanceof ActionBlockedError || err instanceof RateLimitedError) {
      return { ok: false, error: err.message };
    }
    if (err instanceof AlreadySubmittedError) {
      return { ok: false, error: "You've already reported this match." };
    }
    if (err instanceof NotAPlayerError) {
      return { ok: false, error: "Only the two players can report this match." };
    }
    if (err instanceof MatchClosedError) {
      return { ok: false, error: "This match is settled and can't be reported." };
    }
    if (err instanceof MatchNotFoundError) {
      return { ok: false, error: "That match no longer exists." };
    }
    console.error("[matches] report failed:", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

const disputeSchema = z.object({
  matchId: z.string().min(1),
  reason: z.string().trim().min(10, "Explain what went wrong (10+ characters).").max(500),
  evidenceUrl: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

/** Formally contest a result. Sends the match to the tribunal. */
export async function raiseDisputeAction(
  _prev: ReportState,
  formData: FormData,
): Promise<ReportState> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "Disputes are unavailable right now." };
  }
  const parsed = disputeSchema.safeParse({
    matchId: formData.get("matchId"),
    reason: formData.get("reason"),
    evidenceUrl: formData.get("evidenceUrl") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid dispute." };
  }

  const { userId } = await auth();
  try {
    await complianceService.guard(userId, "matchReport");
    await reviewService.raiseDispute({
      matchId: parsed.data.matchId,
      userId,
      reason: parsed.data.reason,
      evidenceUrl: parsed.data.evidenceUrl,
    });
    revalidatePath(`/matches/${parsed.data.matchId}`);
    return { ok: true, status: "DISPUTED" };
  } catch (err) {
    if (err instanceof ActionBlockedError || err instanceof RateLimitedError) {
      return { ok: false, error: err.message };
    }
    if (err instanceof DisputeExistsError) {
      return { ok: false, error: "You've already disputed this match." };
    }
    if (err instanceof NotAPlayerError) {
      return { ok: false, error: "Only the two players can dispute this match." };
    }
    if (err instanceof MatchClosedError) {
      return { ok: false, error: "This match can't be disputed." };
    }
    console.error("[matches] dispute failed:", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

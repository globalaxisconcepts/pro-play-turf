"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isDatabaseConfigured } from "@/lib/db";
import { auth } from "@/server/auth";
import { InsufficientFundsError } from "@/server/ledger/errors";
import {
  AlreadyJoinedError,
  LeagueClosedError,
  LeagueFullError,
  LeagueNotFoundError,
  NotEnteredError,
  NoWalletError,
  RefundNotAllowedError,
} from "@/server/leagues/errors";
import { joinService } from "@/server/services";

/**
 * `needsFunds` drives the insufficient-balance → Deposit branch in the confirm
 * modal: the CTA swaps to "Add funds", which returns here after the deposit.
 */
export type JoinState = {
  ok: boolean;
  error?: string;
  needsFunds?: boolean;
};

const schema = z.object({ leagueId: z.string().min(1) });

/** Join a league: holds the buy-in in ESCROW via LedgerService. */
export async function joinLeagueAction(
  _prev: JoinState,
  formData: FormData,
): Promise<JoinState> {
  const parsed = schema.safeParse({ leagueId: formData.get("leagueId") });
  if (!parsed.success) return { ok: false, error: "Unknown league." };
  if (!isDatabaseConfigured()) {
    return { ok: false, error: unavailable };
  }

  const { userId } = await auth();
  try {
    await joinService.joinLeague({ leagueId: parsed.data.leagueId, userId });
  } catch (err) {
    return toJoinState(err);
  }

  revalidatePath(`/leagues/${parsed.data.leagueId}`);
  revalidatePath("/leagues");
  return { ok: true };
}

/** Withdraw before kick-off: reverses the escrow hold exactly. */
export async function leaveLeagueAction(
  _prev: JoinState,
  formData: FormData,
): Promise<JoinState> {
  const parsed = schema.safeParse({ leagueId: formData.get("leagueId") });
  if (!parsed.success) return { ok: false, error: "Unknown league." };
  if (!isDatabaseConfigured()) {
    return { ok: false, error: unavailable };
  }

  const { userId } = await auth();
  try {
    await joinService.refundEntry({ leagueId: parsed.data.leagueId, userId });
  } catch (err) {
    return toJoinState(err);
  }

  revalidatePath(`/leagues/${parsed.data.leagueId}`);
  revalidatePath("/leagues");
  return { ok: true };
}

const unavailable =
  "Leagues aren't accepting entries right now — please try again later.";

/** Map service errors onto copy a player can act on. Never leak internals. */
function toJoinState(err: unknown): JoinState {
  if (err instanceof InsufficientFundsError) {
    return {
      ok: false,
      needsFunds: true,
      error: "Your available balance doesn't cover this buy-in.",
    };
  }
  if (err instanceof LeagueFullError) {
    return { ok: false, error: "This league just filled up." };
  }
  if (err instanceof AlreadyJoinedError) {
    return { ok: false, error: "You're already in this league." };
  }
  if (err instanceof LeagueClosedError) {
    return { ok: false, error: "This league is no longer accepting entries." };
  }
  if (err instanceof RefundNotAllowedError) {
    return {
      ok: false,
      error: "The league has started — entries can no longer be refunded.",
    };
  }
  if (err instanceof NotEnteredError) {
    return { ok: false, error: "You don't have an active entry here." };
  }
  if (err instanceof LeagueNotFoundError) {
    return { ok: false, error: "That league no longer exists." };
  }
  if (err instanceof NoWalletError) {
    return { ok: false, needsFunds: true, error: "Your wallet isn't set up yet." };
  }
  console.error("[leagues] join/leave failed:", err);
  return { ok: false, error: "Something went wrong. Please try again." };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isDatabaseConfigured } from "@/lib/db";
import { testCreditDepositsEnabled } from "@/lib/flags";
import { zPositiveCents } from "@/lib/money";
import { auth } from "@/server/auth";
import {
  ActionBlockedError,
  RateLimitedError,
} from "@/server/compliance/compliance-service";
import { complianceService, paymentProvider } from "@/server/services";
import type { ActionState } from "./types";

const depositSchema = z.object({ amount: zPositiveCents });

/** Stub deposit: completes immediately as a HOUSE → AVAILABLE ledger txn. */
export async function depositAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      error: "Deposits aren't available right now — please try again later.",
    };
  }
  if (!testCreditDepositsEnabled()) {
    return {
      ok: false,
      error:
        "Deposits aren't open yet. We'll let you know when funding goes live.",
    };
  }
  const parsed = depositSchema.safeParse({ amount: formData.get("amount") });
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid amount greater than $0." };
  }
  const { userId } = await auth();
  try {
    await complianceService.guard(userId, "deposit");
    await paymentProvider.createDeposit({
      userId,
      amountCents: parsed.data.amount,
    });
    revalidatePath("/wallet");
    return { ok: true };
  } catch (err) {
    if (err instanceof ActionBlockedError || err instanceof RateLimitedError) {
      return { ok: false, error: err.message };
    }
    console.error("[wallet] deposit failed:", err);
    return { ok: false, error: "Deposit failed." };
  }
}

/** Admin/dev: grant $100 in test credits (same ledger machinery as a deposit). */
export async function grantTestCreditsAction(): Promise<void> {
  if (!isDatabaseConfigured()) return; // no-op until Postgres is wired
  // Same gate as deposits: this mints money out of nothing.
  if (!testCreditDepositsEnabled()) return;
  const { userId } = await auth();
  await paymentProvider.createDeposit({
    userId,
    amountCents: 10_000n,
    reason: "ADMIN_GRANT",
  });
  revalidatePath("/wallet");
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { zPositiveCents } from "@/lib/money";
import { auth } from "@/server/auth";
import { paymentProvider } from "@/server/services";
import type { ActionState } from "./types";

const depositSchema = z.object({ amount: zPositiveCents });

/** Stub deposit: completes immediately as a HOUSE → AVAILABLE ledger txn. */
export async function depositAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = depositSchema.safeParse({ amount: formData.get("amount") });
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid amount greater than $0." };
  }
  const { userId } = await auth();
  try {
    await paymentProvider.createDeposit({
      userId,
      amountCents: parsed.data.amount,
    });
    revalidatePath("/wallet");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Deposit failed.",
    };
  }
}

/** Admin/dev: grant $100 in test credits (same ledger machinery as a deposit). */
export async function grantTestCreditsAction(): Promise<void> {
  const { userId } = await auth();
  await paymentProvider.createDeposit({
    userId,
    amountCents: 10_000n,
    reason: "ADMIN_GRANT",
  });
  revalidatePath("/wallet");
}

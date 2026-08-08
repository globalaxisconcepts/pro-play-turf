"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isDatabaseConfigured } from "@/lib/db";
import { auth } from "@/server/auth";
import {
  CardNotOwnedError,
  CardNotSurrenderableError,
} from "@/server/cards/errors";
import { cardService } from "@/server/services";

export type StoreState = { ok: boolean; error?: string; message?: string };

const idSchema = z.object({ instanceId: z.string().min(1) });

/**
 * Burn a Pass for a promotion. Irreversible — the confirm modal says so, and
 * there is no path anywhere that un-burns one.
 */
export async function surrenderPassAction(
  _prev: StoreState,
  formData: FormData,
): Promise<StoreState> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "Passes are unavailable right now." };
  }
  const parsed = idSchema.safeParse({ instanceId: formData.get("instanceId") });
  if (!parsed.success) return { ok: false, error: "Unknown Pass." };

  const { userId } = await auth();
  try {
    const { promotedTo } = await cardService.surrender({
      instanceId: parsed.data.instanceId,
      userId,
    });
    revalidatePath("/store");
    return {
      ok: true,
      message: promotedTo
        ? "Pass surrendered. You'll start next season a division higher."
        : "Pass surrendered. You're already in the top division, so there was no promotion to apply.",
    };
  } catch (err) {
    if (err instanceof CardNotOwnedError) {
      return { ok: false, error: "That Pass isn't yours." };
    }
    if (err instanceof CardNotSurrenderableError) {
      return {
        ok: false,
        error: "That Pass can't be surrendered — it may be listed or already burned.",
      };
    }
    console.error("[store] surrender failed:", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

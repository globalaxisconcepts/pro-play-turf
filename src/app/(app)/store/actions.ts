"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isDatabaseConfigured } from "@/lib/db";
import { parseCents } from "@/lib/money";
import { auth } from "@/server/auth";
import {
  CardNotOwnedError,
  CardNotSurrenderableError,
  ListingNotAvailableError,
  SelfPurchaseError,
} from "@/server/cards/errors";
import { InsufficientFundsError } from "@/server/ledger/errors";
import { cardService, marketService } from "@/server/services";

export type StoreState = {
  ok: boolean;
  error?: string;
  message?: string;
  /** Drives the insufficient-balance -> Deposit branch in the buy modal. */
  needsFunds?: boolean;
};

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

const listSchema = z.object({
  instanceId: z.string().min(1),
  price: z.string().trim().min(1),
});

/** Offer a Pass for sale at a price you set. */
export async function listPassAction(
  _prev: StoreState,
  formData: FormData,
): Promise<StoreState> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "The marketplace is unavailable right now." };
  }
  const parsed = listSchema.safeParse({
    instanceId: formData.get("instanceId"),
    price: formData.get("price"),
  });
  if (!parsed.success) return { ok: false, error: "Enter a valid price." };

  let priceCents: bigint;
  try {
    priceCents = parseCents(parsed.data.price);
  } catch {
    return { ok: false, error: "Enter a valid price, e.g. 25.00." };
  }
  if (priceCents <= 0n) return { ok: false, error: "Price must be above $0." };

  const { userId } = await auth();
  try {
    await marketService.list({
      instanceId: parsed.data.instanceId,
      sellerId: userId,
      priceCents,
    });
    revalidatePath("/store");
    return { ok: true, message: "Listed on the marketplace." };
  } catch (err) {
    if (err instanceof CardNotOwnedError) {
      return { ok: false, error: "That Pass isn't yours." };
    }
    console.error("[store] list failed:", err);
    return { ok: false, error: "Couldn't list that Pass. Please try again." };
  }
}

/** Take a Pass back off the market. */
export async function cancelListingAction(
  _prev: StoreState,
  formData: FormData,
): Promise<StoreState> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "The marketplace is unavailable right now." };
  }
  const listingId = String(formData.get("listingId") ?? "");
  if (!listingId) return { ok: false, error: "Unknown listing." };

  const { userId } = await auth();
  try {
    await marketService.cancel({ listingId, sellerId: userId });
    revalidatePath("/store");
    return { ok: true, message: "Listing cancelled." };
  } catch (err) {
    if (err instanceof ListingNotAvailableError) {
      return { ok: false, error: "That listing is already closed." };
    }
    if (err instanceof CardNotOwnedError) {
      return { ok: false, error: "That listing isn't yours." };
    }
    console.error("[store] cancel failed:", err);
    return { ok: false, error: "Couldn't cancel. Please try again." };
  }
}

/** Buy a listed Pass. Money and custody move together or not at all. */
export async function buyPassAction(
  _prev: StoreState,
  formData: FormData,
): Promise<StoreState> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "The marketplace is unavailable right now." };
  }
  const listingId = String(formData.get("listingId") ?? "");
  if (!listingId) return { ok: false, error: "Unknown listing." };

  const { userId } = await auth();
  try {
    await marketService.buy({ listingId, buyerId: userId });
    revalidatePath("/store");
    revalidatePath("/wallet");
    return { ok: true, message: "Bought. The Pass is in your collection." };
  } catch (err) {
    if (err instanceof InsufficientFundsError) {
      return {
        ok: false,
        needsFunds: true,
        error: "Your available balance doesn't cover this price.",
      };
    }
    if (err instanceof SelfPurchaseError) {
      return { ok: false, error: "That's your own Pass." };
    }
    if (err instanceof ListingNotAvailableError) {
      return { ok: false, error: "Someone just bought that one." };
    }
    console.error("[store] buy failed:", err);
    return { ok: false, error: "Couldn't complete the purchase." };
  }
}

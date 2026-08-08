"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isDatabaseConfigured } from "@/lib/db";
import { auth } from "@/server/auth";
import { streamService } from "@/server/services";
import { InvalidChannelError } from "@/server/streams/stream-service";

export type SettingsState = { ok: boolean; error?: string; message?: string };

const linkSchema = z.object({
  platform: z.enum(["TWITCH", "YOUTUBE"]),
  channel: z.string().trim().min(2).max(64),
});

/** Link a Twitch or YouTube channel so your matches can be watched. */
export async function linkStreamAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "Settings are unavailable right now." };
  }
  const parsed = linkSchema.safeParse({
    platform: formData.get("platform"),
    channel: formData.get("channel"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Enter your channel name or id." };
  }

  const { userId } = await auth();
  try {
    await streamService.link({ userId, ...parsed.data });
    revalidatePath("/settings");
    revalidatePath("/watch");
    return { ok: true, message: "Channel linked." };
  } catch (err) {
    if (err instanceof InvalidChannelError) {
      return { ok: false, error: err.message };
    }
    console.error("[settings] link stream failed:", err);
    return { ok: false, error: "Couldn't link that channel." };
  }
}

/** Remove the linked channel. */
export async function unlinkStreamAction(): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const { userId } = await auth();
  await streamService.unlink(userId);
  revalidatePath("/settings");
  revalidatePath("/watch");
}

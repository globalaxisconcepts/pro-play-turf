"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/server/auth";
import { reviewService } from "@/server/services";

/** Reviewers and admins may adjudicate; re-checked on every invocation. */
async function requireReviewer(): Promise<string> {
  const { role, userId } = await auth();
  if (role !== "ADMIN" && role !== "REVIEWER") throw new Error("Not authorized");
  return userId;
}

const schema = z.object({
  matchId: z.string().min(1),
  decision: z.enum(["VERIFY", "VOID"]),
  homeScore: z.coerce.number().int().min(0).max(99).optional(),
  awayScore: z.coerce.number().int().min(0).max(99).optional(),
  note: z.string().trim().max(500).optional(),
});

export async function resolveMatchAction(formData: FormData): Promise<void> {
  const reviewerId = await requireReviewer();
  const parsed = schema.parse({
    matchId: formData.get("matchId"),
    decision: formData.get("decision"),
    homeScore: formData.get("homeScore") ?? undefined,
    awayScore: formData.get("awayScore") ?? undefined,
    note: formData.get("note") ?? undefined,
  });

  await reviewService.resolveMatch({ ...parsed, reviewerId });
  revalidatePath("/admin/reviews");
  revalidatePath(`/matches/${parsed.matchId}`);
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isDatabaseConfigured } from "@/lib/db";
import { env } from "@/lib/env";
import { auth } from "@/server/auth";
import { ageInYears } from "@/server/compliance/gate";
import { complianceService } from "@/server/services";

export type OnboardingState = { ok: boolean; error?: string };

const schema = z.object({
  dateOfBirth: z.string().trim().min(1),
  acceptTerms: z.literal("on", {
    message: "You must accept the terms to continue.",
  }),
});

/**
 * Record age and consent. Both are checked server-side — the client control is
 * a convenience, not the gate, and a date typed into a form is trusted only as
 * far as "they told us this", which is exactly what we store.
 */
export async function acceptTermsAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "Unavailable right now — please try again later." };
  }
  const parsed = schema.safeParse({
    dateOfBirth: formData.get("dateOfBirth"),
    acceptTerms: formData.get("acceptTerms"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check the form and try again.",
    };
  }

  const dob = new Date(`${parsed.data.dateOfBirth}T00:00:00Z`);
  if (Number.isNaN(dob.getTime())) {
    return { ok: false, error: "Enter a valid date of birth." };
  }
  const now = new Date();
  if (dob > now) {
    return { ok: false, error: "Enter a valid date of birth." };
  }
  if (ageInYears(dob, now) < env.MIN_AGE_YEARS) {
    return {
      ok: false,
      error: `You must be at least ${env.MIN_AGE_YEARS} to take part.`,
    };
  }

  const { userId } = await auth();
  await complianceService.acceptTerms({ userId, dateOfBirth: dob });
  revalidatePath("/wallet");
  revalidatePath("/leagues");
  return { ok: true };
}

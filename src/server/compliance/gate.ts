import { CONTACT } from "@/lib/contact";

export const CURRENT_TERMS_VERSION = "2026-08-01";

export interface ComplianceRecord {
  dateOfBirth: Date | null;
  termsAcceptedAt: Date | null;
  termsVersion: string | null;
  restrictedAt: Date | null;
  restrictedReason: string | null;
}

export type GateFailure =
  | "NO_DOB"
  | "UNDERAGE"
  | "TERMS_NOT_ACCEPTED"
  | "TERMS_OUTDATED"
  | "RESTRICTED";

export interface GateResult {
  allowed: boolean;
  reason?: GateFailure;
  message?: string;
}

/** Whole years elapsed, counting the calendar rather than dividing by 365.25. */
export function ageInYears(dob: Date, now: Date): number {
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return age;
}

const MESSAGES: Record<GateFailure, string> = {
  NO_DOB: "Confirm your date of birth before taking part.",
  UNDERAGE: "You must meet the minimum age to take part.",
  TERMS_NOT_ACCEPTED: "Accept the terms and responsible-play policy to continue.",
  TERMS_OUTDATED: "Our terms have changed — please review and accept them.",
  RESTRICTED: `This account is restricted. Email ${CONTACT.support} and we'll explain why.`,
};

/**
 * The gate every money action passes through.
 *
 * Checked server-side on each action rather than once at signup: a record can
 * be restricted, or the terms revised, long after the account was created, and
 * a stale client would never know. Restriction is checked FIRST so a restricted
 * account is told that, not sent to re-accept terms.
 */
export function checkCompliance(
  record: ComplianceRecord | null,
  opts: { minAgeYears: number; now?: Date },
): GateResult {
  const now = opts.now ?? new Date();

  if (!record) return fail("NO_DOB");
  if (record.restrictedAt) {
    return {
      allowed: false,
      reason: "RESTRICTED",
      message: record.restrictedReason
        ? `This account is restricted: ${record.restrictedReason}`
        : MESSAGES.RESTRICTED,
    };
  }
  if (!record.dateOfBirth) return fail("NO_DOB");
  if (ageInYears(record.dateOfBirth, now) < opts.minAgeYears) {
    return fail("UNDERAGE");
  }
  if (!record.termsAcceptedAt) return fail("TERMS_NOT_ACCEPTED");
  if (record.termsVersion !== CURRENT_TERMS_VERSION) return fail("TERMS_OUTDATED");

  return { allowed: true };
}

function fail(reason: GateFailure): GateResult {
  return { allowed: false, reason, message: MESSAGES[reason] };
}

import { CURRENT_TERMS_VERSION } from "@/server/compliance/gate";

/**
 * Shared facts for the policy pages.
 *
 * `TERMS_LAST_UPDATED` is derived from `CURRENT_TERMS_VERSION` rather than
 * written out twice. The gate re-prompts users whenever that constant changes,
 * so a hardcoded date on the page could silently disagree with the version
 * people actually consented to — which is exactly the sort of discrepancy that
 * makes a consent record worthless.
 */
export const TERMS_LAST_UPDATED = CURRENT_TERMS_VERSION;
export const PRIVACY_LAST_UPDATED = CURRENT_TERMS_VERSION;
export const RULES_LAST_UPDATED = CURRENT_TERMS_VERSION;

/** Human-readable form of an ISO date, e.g. "1 August 2026". */
export function formatPolicyDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * The trading name. The registered entity behind it is a fill-in: naming a
 * company number or address that doesn't exist would make these documents
 * fabricated corporate records rather than drafts.
 */
export const OPERATOR = {
  brand: "Pro Play Turf",
  legalName: "[LEGAL ENTITY NAME]",
  companyNumber: "[COMPANY NUMBER]",
  registeredAddress: "[REGISTERED ADDRESS]",
  site: "proplayturf.com",
} as const;

export { CONTACT } from "@/lib/contact";

/**
 * The primary governing law. A contract can only have one, however many markets
 * it serves; local mandatory consumer rights are preserved by clause instead.
 * England & Wales is the working assumption — confirm or change with counsel.
 */
export const GOVERNING_LAW = "England and Wales";

/** Minimum age, mirrored from `MIN_AGE_YEARS` so the pages can't contradict the gate. */
export const MIN_AGE_DISPLAY = 18;

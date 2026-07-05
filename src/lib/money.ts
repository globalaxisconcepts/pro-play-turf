import { z } from "zod";

/**
 * Money is BigInt **cents** everywhere in Pro Play Turf. Never a float, never a
 * Number for a balance. This module is the single place that parses and formats
 * money, and it also provides the `sumZero` invariant used by the ledger.
 */

/** True iff the signed amounts net to exactly zero (double-entry invariant). */
export function sumZero(amounts: bigint[]): boolean {
  return amounts.reduce((acc, n) => acc + n, 0n) === 0n;
}

/** Sum of signed cents. */
export function sumCents(amounts: bigint[]): bigint {
  return amounts.reduce((acc, n) => acc + n, 0n);
}

/**
 * Parse a human amount into integer cents. Accepts "$1,234.50", "25", "10.5",
 * 49.99 — strips currency symbols/commas/whitespace, supports a leading sign,
 * and rounds half-up at the third decimal. Throws on anything non-numeric.
 */
export function parseCents(input: string | number): bigint {
  let s = typeof input === "number" ? input.toString() : input.trim();
  s = s.replace(/[$,\s]/g, "");
  let neg = false;
  if (s.startsWith("-")) {
    neg = true;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  }
  if (s === "" || !/^\d*(\.\d*)?$/.test(s)) {
    throw new Error(`Invalid money amount: ${JSON.stringify(input)}`);
  }
  const [whole = "0", frac = ""] = s.split(".");
  const fracPadded = (frac + "00").slice(0, 2);
  let cents = BigInt(whole || "0") * 100n + BigInt(fracPadded || "0");
  // round half-up using the third fractional digit
  if (frac.length > 2 && frac.charCodeAt(2) - 48 >= 5) {
    cents += 1n;
  }
  return neg ? -cents : cents;
}

/**
 * Format cents as a display string, e.g. 123450n → "$1,234.50".
 * `sign: true` prefixes a "+" for positive values (ledger deltas).
 */
export function formatCents(
  cents: bigint,
  opts: { sign?: boolean; currency?: string } = {},
): string {
  const { sign = false, currency = "$" } = opts;
  const neg = cents < 0n;
  const abs = neg ? -cents : cents;
  const dollars = (abs / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const rem = (abs % 100n).toString().padStart(2, "0");
  const signStr = neg ? "-" : sign ? "+" : "";
  return `${signStr}${currency}${dollars}.${rem}`;
}

/** Serialize cents for transport across the RSC / Server-Action boundary. */
export function centsToString(cents: bigint): string {
  return cents.toString();
}

/** Deserialize cents received as a string. */
export function centsFromString(value: string): bigint {
  return BigInt(value);
}

/**
 * Zod schema that accepts a string or number at a boundary and yields bigint
 * cents. Use in Server Actions / API handlers where money enters the system.
 */
export const zCents = z
  .union([z.string(), z.number()])
  .transform((v, ctx) => {
    try {
      return parseCents(v);
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid money amount" });
      return z.NEVER;
    }
  });

/** A strictly-positive money amount (deposits, buy-ins, prices). */
export const zPositiveCents = zCents.refine((c) => c > 0n, {
  message: "Amount must be greater than zero",
});

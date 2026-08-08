import type { Tier } from "@prisma/client";
import type { PassTier } from "@/components/ui/PassCard";

// Client-safe Pass display helpers. No server-only imports, so both Server
// Components and Client Components can use them.

/** Prisma tier -> PassCard visual variant. */
export const PASS_TIER: Record<Tier, PassTier> = {
  AMATEUR: "amateur",
  INTERMEDIATE: "intermediate",
  ADVANCED: "advanced",
  ELITE: "elite",
  CHAMPIONS: "champions",
};

/** The big tier word on the card face. */
export const PASS_WORD: Record<Tier, string> = {
  AMATEUR: "Amateur",
  INTERMEDIATE: "Interm.",
  ADVANCED: "Advanced",
  ELITE: "Elite",
  CHAMPIONS: "Champions",
};

/** Serials read as a mint code rather than a bare integer. */
export function formatSerial(tier: Tier, serial: number): string {
  return `${tier.slice(0, 3)}-${String(serial).padStart(5, "0")}`;
}

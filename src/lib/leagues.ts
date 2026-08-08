import type { LeagueStatus, Tier } from "@prisma/client";

// Client-safe display constants for the league surface. No server-only imports,
// so both Server Components (cards, admin) and Client Components (filter bar)
// can use them.

export const TIER_LABEL: Record<Tier, string> = {
  AMATEUR: "Amateur",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  ELITE: "Elite",
  CHAMPIONS: "Champions",
};

/** Low → high. Drives selects and tiebreak ordering. */
export const TIER_ORDER: Tier[] = [
  "AMATEUR",
  "INTERMEDIATE",
  "ADVANCED",
  "ELITE",
  "CHAMPIONS",
];

export const STATUS_LABEL: Record<LeagueStatus, string> = {
  OPEN: "Open",
  FILLING: "Filling",
  LIVE: "Live",
  ENDED: "Ended",
};

export const STATUS_ORDER: LeagueStatus[] = ["OPEN", "FILLING", "LIVE", "ENDED"];

export const BUYIN_OPTIONS = [
  { value: "any", label: "Any buy-in" },
  { value: "free", label: "Free only" },
  { value: "low", label: "$25 & under" },
  { value: "high", label: "$25 & up" },
] as const;

export const SORT_OPTIONS = [
  { value: "prize", label: "Prize pool" },
  { value: "spots", label: "Spots left" },
  { value: "start", label: "Start time" },
] as const;

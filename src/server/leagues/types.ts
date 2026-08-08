import type { LeagueStatus, Tier } from "@prisma/client";

/**
 * A league flattened with its division context, as used by the browse grid and
 * the pure `selectLeagues` filter/sort. Money stays as BigInt cents; the RSC
 * formats it before render (BigInt never crosses to a Client Component).
 */
export interface LeagueRow {
  id: string;
  name: string;
  divisionId: string;
  divisionName: string;
  tier: Tier;
  divisionRank: number;
  buyInCents: bigint;
  rakeBps: number;
  capacity: number;
  spotsFilled: number;
  status: LeagueStatus;
  startsAt: Date | null;
}

export type EntryFilter = "all" | "free" | "paid";
export type LeagueSort = "prize" | "spots" | "start";

export interface LeagueCriteria {
  tier?: Tier | "all";
  entry?: EntryFilter;
  status?: LeagueStatus | "all";
  minBuyInCents?: bigint;
  maxBuyInCents?: bigint;
  search?: string;
  sort?: LeagueSort;
}

/**
 * Projected prize pool = the full pot at capacity (buy-in × seats). Until entries
 * exist (Slice 4) this is the advertised ceiling; Slice 8 settles the real pool.
 */
export function projectedPoolCents(
  row: Pick<LeagueRow, "buyInCents" | "capacity">,
): bigint {
  return row.buyInCents * BigInt(row.capacity);
}

export function spotsLeft(
  row: Pick<LeagueRow, "capacity" | "spotsFilled">,
): number {
  return Math.max(0, row.capacity - row.spotsFilled);
}

import type { Tier } from "@prisma/client";
import type { LeagueCriteria, LeagueRow } from "./types";
import { projectedPoolCents, spotsLeft } from "./types";

/**
 * Pure filter + sort for the league browse grid. Kept free of Prisma so it can
 * be unit-tested directly and reused on any pre-fetched list. Deterministic:
 * ties resolve by tier (desc) then name (asc) so ordering is stable.
 */
export function selectLeagues(
  rows: LeagueRow[],
  c: LeagueCriteria = {},
): LeagueRow[] {
  const search = c.search?.trim().toLowerCase();

  const filtered = rows.filter((r) => {
    if (c.tier && c.tier !== "all" && r.tier !== c.tier) return false;
    if (c.status && c.status !== "all" && r.status !== c.status) return false;
    if (c.entry === "free" && r.buyInCents !== 0n) return false;
    if (c.entry === "paid" && r.buyInCents <= 0n) return false;
    if (c.minBuyInCents != null && r.buyInCents < c.minBuyInCents) return false;
    if (c.maxBuyInCents != null && r.buyInCents > c.maxBuyInCents) return false;
    if (search) {
      const hay = `${r.name} ${r.divisionName}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  const sort = c.sort ?? "prize";
  return [...filtered].sort((a, b) => {
    if (sort === "prize") {
      const d = projectedPoolCents(b) - projectedPoolCents(a);
      if (d !== 0n) return d > 0n ? 1 : -1;
      return tiebreak(a, b);
    }
    if (sort === "spots") {
      const d = spotsLeft(b) - spotsLeft(a);
      return d !== 0 ? d : tiebreak(a, b);
    }
    // "start": soonest first, unscheduled (null) last.
    const at = a.startsAt?.getTime() ?? Number.POSITIVE_INFINITY;
    const bt = b.startsAt?.getTime() ?? Number.POSITIVE_INFINITY;
    return at !== bt ? at - bt : tiebreak(a, b);
  });
}

function tiebreak(a: LeagueRow, b: LeagueRow): number {
  if (a.divisionRank !== b.divisionRank) return b.divisionRank - a.divisionRank;
  return a.name.localeCompare(b.name);
}

/** One division's slice of the browse grid. */
export interface DivisionGroup {
  divisionId: string;
  divisionName: string;
  tier: Tier;
  divisionRank: number;
  rows: LeagueRow[];
}

/**
 * Bucket already-sorted rows into their divisions — the browse lists leagues by
 * division, per the build plan. Order follows the sort rather than overriding
 * it: a division appears where its best-placed league appeared, and leagues keep
 * their sort order within it. Pure, so it never re-sorts what selectLeagues did.
 */
export function groupByDivision(rows: LeagueRow[]): DivisionGroup[] {
  const groups = new Map<string, DivisionGroup>();
  for (const r of rows) {
    const group = groups.get(r.divisionId);
    if (group) {
      group.rows.push(r);
    } else {
      groups.set(r.divisionId, {
        divisionId: r.divisionId,
        divisionName: r.divisionName,
        tier: r.tier,
        divisionRank: r.divisionRank,
        rows: [r],
      });
    }
  }
  return [...groups.values()];
}

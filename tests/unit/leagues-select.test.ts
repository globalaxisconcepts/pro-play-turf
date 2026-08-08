import { describe, expect, it } from "vitest";
import { groupByDivision, selectLeagues } from "@/server/leagues/select";
import type { LeagueRow } from "@/server/leagues/types";

/** Minimal row factory — only the fields selectLeagues reads. */
function row(over: Partial<LeagueRow>): LeagueRow {
  return {
    id: over.id ?? "x",
    name: over.name ?? "League",
    divisionId: over.divisionId ?? "d",
    divisionName: over.divisionName ?? "Division",
    tier: over.tier ?? "AMATEUR",
    divisionRank: over.divisionRank ?? 0,
    buyInCents: over.buyInCents ?? 0n,
    rakeBps: over.rakeBps ?? 0,
    capacity: over.capacity ?? 16,
    spotsFilled: over.spotsFilled ?? 0,
    status: over.status ?? "OPEN",
    startsAt: over.startsAt ?? null,
  };
}

const rows: LeagueRow[] = [
  row({ id: "free1", name: "Amateur Open A", tier: "AMATEUR", divisionRank: 0, buyInCents: 0n, capacity: 16 }),
  row({ id: "int1", name: "Regional Cup", tier: "INTERMEDIATE", divisionRank: 1, buyInCents: 1_000n, capacity: 16, status: "LIVE" }),
  row({ id: "adv1", name: "Conference North", tier: "ADVANCED", divisionRank: 2, buyInCents: 2_500n, capacity: 16 }),
  row({ id: "elite1", name: "Premier A", tier: "ELITE", divisionRank: 3, buyInCents: 5_000n, capacity: 16 }),
  row({ id: "elite2", name: "Premier Legacy", tier: "ELITE", divisionRank: 3, buyInCents: 5_000n, capacity: 16, status: "ENDED" }),
];

const ids = (rs: LeagueRow[]) => rs.map((r) => r.id);

describe("selectLeagues — filtering", () => {
  it("returns all rows with no criteria", () => {
    expect(selectLeagues(rows)).toHaveLength(rows.length);
  });

  it("filters by tier", () => {
    expect(ids(selectLeagues(rows, { tier: "ELITE" })).sort()).toEqual([
      "elite1",
      "elite2",
    ]);
  });

  it("treats tier/status 'all' as no filter", () => {
    expect(selectLeagues(rows, { tier: "all", status: "all" })).toHaveLength(
      rows.length,
    );
  });

  it("filters free-only and paid-only via entry", () => {
    expect(ids(selectLeagues(rows, { entry: "free" }))).toEqual(["free1"]);
    expect(selectLeagues(rows, { entry: "paid" }).every((r) => r.buyInCents > 0n)).toBe(true);
    expect(selectLeagues(rows, { entry: "paid" })).toHaveLength(4);
  });

  it("filters by buy-in range (inclusive)", () => {
    const cheap = selectLeagues(rows, { entry: "paid", maxBuyInCents: 2_500n });
    expect(ids(cheap).sort()).toEqual(["adv1", "int1"]);
    const pricey = selectLeagues(rows, { minBuyInCents: 2_500n });
    expect(ids(pricey).sort()).toEqual(["adv1", "elite1", "elite2"]);
  });

  it("filters by status", () => {
    expect(ids(selectLeagues(rows, { status: "LIVE" }))).toEqual(["int1"]);
    expect(ids(selectLeagues(rows, { status: "ENDED" }))).toEqual(["elite2"]);
  });

  it("searches name and division, case-insensitively", () => {
    expect(ids(selectLeagues(rows, { search: "premier" })).sort()).toEqual([
      "elite1",
      "elite2",
    ]);
    expect(selectLeagues(rows, { search: "nomatch" })).toHaveLength(0);
  });

  it("combines filters (AND semantics)", () => {
    const out = selectLeagues(rows, { tier: "ELITE", status: "OPEN" });
    expect(ids(out)).toEqual(["elite1"]);
  });
});

describe("selectLeagues — sorting", () => {
  it("sorts by projected prize pool (desc) by default", () => {
    // pools: elite 80000, adv 40000, int 16000, free 0 (elite1/elite2 tie -> name asc)
    expect(ids(selectLeagues(rows))).toEqual([
      "elite1",
      "elite2",
      "adv1",
      "int1",
      "free1",
    ]);
  });

  it("sorts by spots left (desc); ties break by higher tier", () => {
    // all have capacity 16, spotsFilled 0 -> equal spots; tier desc then name asc
    expect(ids(selectLeagues(rows, { sort: "spots" }))).toEqual([
      "elite1",
      "elite2",
      "adv1",
      "int1",
      "free1",
    ]);
  });

  it("sorts by start time with unscheduled last", () => {
    const t = (iso: string) => new Date(iso);
    const scheduled: LeagueRow[] = [
      row({ id: "late", startsAt: t("2026-09-10T00:00:00Z") }),
      row({ id: "soon", startsAt: t("2026-09-01T00:00:00Z") }),
      row({ id: "tbd", startsAt: null }),
    ];
    expect(ids(selectLeagues(scheduled, { sort: "start" }))).toEqual([
      "soon",
      "late",
      "tbd",
    ]);
  });

  it("does not mutate the input array", () => {
    const input = [...rows];
    const before = ids(input);
    selectLeagues(input, { sort: "prize" });
    expect(ids(input)).toEqual(before);
  });
});

describe("groupByDivision", () => {
  const grouped: LeagueRow[] = [
    row({ id: "e1", divisionId: "elite", divisionName: "Elite Premier", tier: "ELITE", divisionRank: 3 }),
    row({ id: "e2", divisionId: "elite", divisionName: "Elite Premier", tier: "ELITE", divisionRank: 3 }),
    row({ id: "a1", divisionId: "am", divisionName: "Amateur Open", tier: "AMATEUR", divisionRank: 0 }),
    row({ id: "e3", divisionId: "elite", divisionName: "Elite Premier", tier: "ELITE", divisionRank: 3 }),
  ];

  it("buckets rows by division and carries the division context", () => {
    const out = groupByDivision(grouped);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      divisionId: "elite",
      divisionName: "Elite Premier",
      tier: "ELITE",
      divisionRank: 3,
    });
    expect(ids(out[0].rows)).toEqual(["e1", "e2", "e3"]);
    expect(ids(out[1].rows)).toEqual(["a1"]);
  });

  it("orders groups by first appearance, so the active sort still drives order", () => {
    // Same rows, reversed: Amateur is now seen first and leads.
    const out = groupByDivision([...grouped].reverse());
    expect(out.map((g) => g.divisionId)).toEqual(["elite", "am"]);
    // e3 came first in the reversed input, so it leads its group.
    expect(ids(out[0].rows)).toEqual(["e3", "e2", "e1"]);
  });

  it("returns no groups for no rows", () => {
    expect(groupByDivision([])).toEqual([]);
  });

  it("groups the sorted output of selectLeagues without re-ordering it", () => {
    const sorted = selectLeagues(grouped);
    expect(groupByDivision(sorted).flatMap((g) => ids(g.rows))).toEqual(
      ids(sorted),
    );
  });
});

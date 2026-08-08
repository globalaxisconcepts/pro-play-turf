import { describe, expect, it } from "vitest";
import { computeStandings, zonesFor } from "@/server/leagues/standings";

const P = [
  { userId: "a", displayName: "Ana" },
  { userId: "b", displayName: "Ben" },
  { userId: "c", displayName: "Cal" },
  { userId: "d", displayName: "Dee" },
];

const m = (
  homeUserId: string,
  awayUserId: string,
  homeScore: number | null,
  awayScore: number | null,
  status = "VERIFIED",
) => ({ homeUserId, awayUserId, homeScore, awayScore, status });

const table = (matches: ReturnType<typeof m>[]) => computeStandings(P, matches);

describe("computeStandings", () => {
  it("lists every entrant even before a ball is kicked", () => {
    const rows = table([]);
    expect(rows).toHaveLength(4);
    expect(rows.every((r) => r.played === 0 && r.points === 0)).toBe(true);
    expect(rows.map((r) => r.position)).toEqual([1, 2, 3, 4]);
  });

  it("awards 3 for a win and 0 for a loss", () => {
    const rows = table([m("a", "b", 2, 0)]);
    const ana = rows.find((r) => r.userId === "a")!;
    const ben = rows.find((r) => r.userId === "b")!;
    expect(ana).toMatchObject({ played: 1, won: 1, lost: 0, points: 3 });
    expect(ben).toMatchObject({ played: 1, won: 0, lost: 1, points: 0 });
  });

  it("awards 1 each for a draw", () => {
    const rows = table([m("a", "b", 1, 1)]);
    expect(rows.find((r) => r.userId === "a")!.points).toBe(1);
    expect(rows.find((r) => r.userId === "b")!.points).toBe(1);
    expect(rows.find((r) => r.userId === "a")!.drawn).toBe(1);
  });

  it("tracks goals for, against, and difference from both sides", () => {
    const rows = table([m("a", "b", 4, 1)]);
    expect(rows.find((r) => r.userId === "a")).toMatchObject({
      goalsFor: 4,
      goalsAgainst: 1,
      goalDifference: 3,
    });
    expect(rows.find((r) => r.userId === "b")).toMatchObject({
      goalsFor: 1,
      goalsAgainst: 4,
      goalDifference: -3,
    });
  });

  it("counts only VERIFIED matches — a void never happened", () => {
    const rows = table([
      m("a", "b", 5, 0, "VOID"),
      m("a", "c", 1, 0, "UNDER_REVIEW"),
      m("a", "d", 2, 0, "VERIFIED"),
    ]);
    expect(rows.find((r) => r.userId === "a")).toMatchObject({
      played: 1,
      points: 3,
      goalsFor: 2,
    });
  });

  it("ignores a verified match that somehow has no score", () => {
    const rows = table([m("a", "b", null, null)]);
    expect(rows.every((r) => r.played === 0)).toBe(true);
  });

  it("ranks by points first", () => {
    const rows = table([m("a", "b", 1, 0), m("c", "d", 1, 0), m("a", "c", 1, 0)]);
    expect(rows[0].userId).toBe("a"); // 6 pts
  });

  it("breaks a points tie on goal difference", () => {
    // Ben and Cal both win once; Cal wins by more.
    const rows = table([m("b", "d", 1, 0), m("c", "a", 5, 0)]);
    const order = rows.map((r) => r.userId);
    expect(order.indexOf("c")).toBeLessThan(order.indexOf("b"));
  });

  it("breaks a points-and-difference tie on goals scored", () => {
    // Both +1, but Ana scored more.
    const rows = table([m("a", "c", 3, 2), m("b", "d", 1, 0)]);
    const order = rows.map((r) => r.userId);
    expect(order.indexOf("a")).toBeLessThan(order.indexOf("b"));
  });

  it("falls back to name so the order is never arbitrary", () => {
    const rows = table([]);
    expect(rows.map((r) => r.displayName)).toEqual(["Ana", "Ben", "Cal", "Dee"]);
  });

  it("numbers positions from 1 with no gaps", () => {
    const rows = table([m("a", "b", 3, 0)]);
    expect(rows.map((r) => r.position)).toEqual([1, 2, 3, 4]);
  });
});

describe("zonesFor", () => {
  const rows = table([]); // 4 players, all level, ordered by name

  it("promotes the top N and relegates the bottom N", () => {
    expect(zonesFor(rows, { promote: 1, relegate: 1 })).toEqual({
      promoted: ["a"],
      relegated: ["d"],
    });
  });

  it("never puts a player in both zones", () => {
    const { promoted, relegated } = zonesFor(rows, { promote: 3, relegate: 3 });
    expect(promoted.filter((id) => relegated.includes(id))).toEqual([]);
    expect(promoted.length + relegated.length).toBeLessThanOrEqual(rows.length);
  });

  it("leaves everyone put when the zones are zero", () => {
    expect(zonesFor(rows, { promote: 0, relegate: 0 })).toEqual({
      promoted: [],
      relegated: [],
    });
  });

  it("handles a table smaller than the zones", () => {
    const tiny = computeStandings([P[0]], []);
    const { promoted, relegated } = zonesFor(tiny, { promote: 3, relegate: 3 });
    expect(promoted.length + relegated.length).toBeLessThanOrEqual(1);
  });

  it("has nothing to move in an empty league", () => {
    expect(zonesFor([], { promote: 3, relegate: 3 })).toEqual({
      promoted: [],
      relegated: [],
    });
  });
});

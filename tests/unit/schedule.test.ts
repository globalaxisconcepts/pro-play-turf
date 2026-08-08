import { describe, expect, it } from "vitest";
import { generateSchedule } from "@/server/matches/schedule";

const players = (n: number) =>
  Array.from({ length: n }, (_, i) => `p${i + 1}`);

const pairKey = (a: string, b: string) => [a, b].sort().join("|");

describe("generateSchedule — single round-robin", () => {
  it("pairs every player with every other exactly once", () => {
    const fixtures = generateSchedule(players(6));
    expect(fixtures).toHaveLength((6 * 5) / 2);

    const seen = new Set(fixtures.map((f) => pairKey(f.homeUserId, f.awayUserId)));
    expect(seen.size).toBe(fixtures.length); // no repeated pairing
  });

  it("never schedules a player twice in the same round", () => {
    const fixtures = generateSchedule(players(8));
    const byRound = new Map<number, string[]>();
    for (const f of fixtures) {
      const list = byRound.get(f.round) ?? [];
      list.push(f.homeUserId, f.awayUserId);
      byRound.set(f.round, list);
    }
    for (const [round, ids] of byRound) {
      expect(`round ${round}: ${ids.length}`).toBe(
        `round ${round}: ${new Set(ids).size}`,
      );
    }
  });

  it("uses n-1 rounds for an even field", () => {
    const rounds = new Set(generateSchedule(players(8)).map((f) => f.round));
    expect(rounds.size).toBe(7);
    expect([...rounds].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("gives every player the same number of matches", () => {
    const fixtures = generateSchedule(players(6));
    const counts = new Map<string, number>();
    for (const f of fixtures) {
      counts.set(f.homeUserId, (counts.get(f.homeUserId) ?? 0) + 1);
      counts.set(f.awayUserId, (counts.get(f.awayUserId) ?? 0) + 1);
    }
    expect([...counts.values()]).toEqual([5, 5, 5, 5, 5, 5]);
  });

  it("handles an odd field by resting one player per round", () => {
    const fixtures = generateSchedule(players(5));
    expect(fixtures).toHaveLength((5 * 4) / 2);
    const rounds = new Set(fixtures.map((f) => f.round));
    expect(rounds.size).toBe(5); // one bye each round
    for (const r of rounds) {
      expect(fixtures.filter((f) => f.round === r)).toHaveLength(2);
    }
  });

  // Perfect home/away balance isn't achievable in a single round-robin and the
  // spec doesn't ask for it. The floor that matters is that no player is stuck
  // on one side all season.
  it("gives every player both home and away matches", () => {
    const fixtures = generateSchedule(players(6));
    const oneSided = players(6).filter((id) => {
      const home = fixtures.filter((f) => f.homeUserId === id).length;
      const away = fixtures.filter((f) => f.awayUserId === id).length;
      return home === 0 || away === 0;
    });
    expect(oneSided).toEqual([]);
  });

  it("schedules a two-player league as a single match", () => {
    expect(generateSchedule(players(2))).toEqual([
      { round: 1, homeUserId: "p1", awayUserId: "p2" },
    ]);
  });

  it("returns nothing when there is nobody to play", () => {
    expect(generateSchedule([])).toEqual([]);
    expect(generateSchedule(["solo"])).toEqual([]);
  });

  it("is deterministic — the same field yields the same schedule", () => {
    expect(generateSchedule(players(7))).toEqual(generateSchedule(players(7)));
  });
});

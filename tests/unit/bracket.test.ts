import { describe, expect, it } from "vitest";
import {
  BracketSizeError,
  loserOf,
  pairWinners,
  seedBracket,
  winnerOf,
} from "@/server/matches/bracket";

const pair = (h: string, a: string) => `${h}v${a}`;
const show = (ps: { homeUserId: string; awayUserId: string }[]) =>
  ps.map((p) => pair(p.homeUserId, p.awayUserId));

describe("seedBracket", () => {
  it("draws a four-player bracket as 1v4 and 2v3", () => {
    expect(show(seedBracket(["s1", "s2", "s3", "s4"]))).toEqual([
      "s1vs4",
      "s2vs3",
    ]);
  });

  it("draws an eight-player bracket by strength", () => {
    const seeds = ["1", "2", "3", "4", "5", "6", "7", "8"];
    expect(show(seedBracket(seeds))).toEqual(["1v8", "2v7", "3v6", "4v5"]);
  });

  it("puts every tie in round one", () => {
    expect(seedBracket(["a", "b", "c", "d"]).every((p) => p.round === 1)).toBe(
      true,
    );
  });

  it("refuses a field that isn't a power of two", () => {
    // A bye would hand someone a free round in a prestige knockout.
    for (const n of [3, 5, 6, 7, 1, 0]) {
      expect(() =>
        seedBracket(Array.from({ length: n }, (_, i) => `p${i}`)),
      ).toThrow(BracketSizeError);
    }
  });
});

describe("pairWinners", () => {
  it("pairs adjacent winners so the draw stays a tree", () => {
    expect(show(pairWinners(["w1", "w2", "w3", "w4"], 2))).toEqual([
      "w1vw2",
      "w3vw4",
    ]);
  });

  it("stamps the round it was told", () => {
    expect(pairWinners(["a", "b"], 3)[0].round).toBe(3);
  });

  it("produces no tie once a single winner remains", () => {
    expect(pairWinners(["champion"], 4)).toEqual([]);
    expect(pairWinners([], 2)).toEqual([]);
  });
});

describe("winnerOf", () => {
  const base = { homeUserId: "h", awayUserId: "a" };

  it("advances whoever scored more", () => {
    expect(winnerOf({ ...base, homeScore: 2, awayScore: 1, status: "VERIFIED" })).toBe("h");
    expect(winnerOf({ ...base, homeScore: 0, awayScore: 3, status: "VERIFIED" })).toBe("a");
  });

  it("advances nobody on a draw — a knockout tie has no winner", () => {
    expect(
      winnerOf({ ...base, homeScore: 1, awayScore: 1, status: "VERIFIED" }),
    ).toBeNull();
  });

  it("advances nobody until the result is verified", () => {
    for (const status of ["AWAITING", "UNDER_REVIEW", "DISPUTED", "VOID", "SCHEDULED"]) {
      expect(
        winnerOf({ ...base, homeScore: 3, awayScore: 0, status }),
      ).toBeNull();
    }
  });

  it("advances nobody when a verified match somehow has no score", () => {
    expect(
      winnerOf({ ...base, homeScore: null, awayScore: null, status: "VERIFIED" }),
    ).toBeNull();
  });
});

describe("loserOf", () => {
  it("names the beaten player", () => {
    expect(
      loserOf({
        homeUserId: "h",
        awayUserId: "a",
        homeScore: 2,
        awayScore: 1,
        status: "VERIFIED",
      }),
    ).toBe("a");
  });

  it("names nobody when nobody won", () => {
    expect(
      loserOf({
        homeUserId: "h",
        awayUserId: "a",
        homeScore: 1,
        awayScore: 1,
        status: "VERIFIED",
      }),
    ).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { prizeBreakdown } from "@/server/leagues/prize";

/**
 * The advertised prize split shown on league detail. Display-only for now —
 * Slice 8 does the actual distribution — but the arithmetic must already be
 * exact: rake plus every place must account for the pool to the cent.
 */
describe("prizeBreakdown", () => {
  it("pools the buy-in across every seat", () => {
    const b = prizeBreakdown({
      buyInCents: 2_500n,
      capacity: 16,
      rakeBps: 0,
      tier: "ADVANCED",
    });
    expect(b.poolCents).toBe(40_000n);
    expect(b.rakeCents).toBe(0n);
  });

  it("takes the rake off the top in basis points", () => {
    const b = prizeBreakdown({
      buyInCents: 2_500n,
      capacity: 16,
      rakeBps: 500, // 5%
      tier: "ADVANCED",
    });
    expect(b.poolCents).toBe(40_000n);
    expect(b.rakeCents).toBe(2_000n);
  });

  it("splits the remainder 50/30/20 across the top three", () => {
    const b = prizeBreakdown({
      buyInCents: 2_500n,
      capacity: 16,
      rakeBps: 500,
      tier: "ADVANCED",
    });
    // 40000 - 2000 rake = 38000 distributable
    expect(b.places.map((p) => p.amountCents)).toEqual([19_000n, 11_400n, 7_600n]);
  });

  it("pays the Champions winner 70%", () => {
    const b = prizeBreakdown({
      buyInCents: 15_000n,
      capacity: 8,
      rakeBps: 0,
      tier: "CHAMPIONS",
    });
    expect(b.poolCents).toBe(120_000n);
    expect(b.places.map((p) => p.amountCents)).toEqual([
      84_000n,
      24_000n,
      12_000n,
    ]);
  });

  it("never loses a cent — rake plus places equal the pool exactly", () => {
    // 333 x 7 = 2331; 7% rake = 163.17 -> must not round money away.
    const b = prizeBreakdown({
      buyInCents: 333n,
      capacity: 7,
      rakeBps: 700,
      tier: "AMATEUR",
    });
    const paid = b.places.reduce((sum, p) => sum + p.amountCents, 0n);
    expect(paid + b.rakeCents).toBe(b.poolCents);
  });

  it("gives the rounding remainder to first place", () => {
    const b = prizeBreakdown({
      buyInCents: 1n,
      capacity: 7,
      rakeBps: 0,
      tier: "AMATEUR",
    });
    // 7 cents, 50/30/20 -> 3.5 / 2.1 / 1.4 -> 3/2/1 = 6, remainder 1 to first.
    expect(b.places.map((p) => p.amountCents)).toEqual([4n, 2n, 1n]);
    expect(b.poolCents).toBe(7n);
  });

  it("labels the places", () => {
    const b = prizeBreakdown({
      buyInCents: 100n,
      capacity: 10,
      rakeBps: 0,
      tier: "ELITE",
    });
    expect(b.places.map((p) => p.place)).toEqual([1, 2, 3]);
  });

  it("has nothing to pay out in a free league", () => {
    const b = prizeBreakdown({
      buyInCents: 0n,
      capacity: 16,
      rakeBps: 500,
      tier: "AMATEUR",
    });
    expect(b.poolCents).toBe(0n);
    expect(b.rakeCents).toBe(0n);
    expect(b.places.every((p) => p.amountCents === 0n)).toBe(true);
  });
});

import type { Tier } from "@prisma/client";

export interface PrizePlace {
  place: number;
  /** Share of the distributable pool, in basis points. */
  shareBps: number;
  amountCents: bigint;
}

export interface PrizeBreakdown {
  /** Every seat's buy-in, if the league fills. */
  poolCents: bigint;
  /** House cut, taken off the top. */
  rakeCents: bigint;
  places: PrizePlace[];
}

export interface PrizeInput {
  buyInCents: bigint;
  capacity: number;
  rakeBps: number;
  tier: Tier;
}

const BPS = 10_000n;

/** Top-3 split. Champions concentrates on the winner (70%), per the brief. */
const STANDARD_SPLIT = [5_000, 3_000, 2_000];
const CHAMPIONS_SPLIT = [7_000, 2_000, 1_000];

/**
 * The advertised prize split for a league at full capacity. Display-only —
 * Slice 8 settles the real pool from actual entries — but the arithmetic is
 * already exact: rake plus every place sums to the pool with no cent lost.
 * Lower places are floored and first place absorbs the remainder, so the
 * rounding never invents money.
 */
export function prizeBreakdown(input: PrizeInput): PrizeBreakdown {
  const shares =
    input.tier === "CHAMPIONS" ? CHAMPIONS_SPLIT : STANDARD_SPLIT;

  const poolCents = input.buyInCents * BigInt(Math.max(0, input.capacity));
  const rakeCents = (poolCents * BigInt(input.rakeBps)) / BPS;
  const distributable = poolCents - rakeCents;

  // Compute 2nd..Nth exactly, then let 1st take whatever is left over.
  const tail = shares
    .slice(1)
    .map((bps) => (distributable * BigInt(bps)) / BPS);
  const first = distributable - tail.reduce((sum, cents) => sum + cents, 0n);

  return {
    poolCents,
    rakeCents,
    places: [first, ...tail].map((amountCents, i) => ({
      place: i + 1,
      shareBps: shares[i],
      amountCents,
    })),
  };
}

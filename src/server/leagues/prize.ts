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
  const poolCents = input.buyInCents * BigInt(Math.max(0, input.capacity));
  return splitPool({
    poolCents,
    rakeBps: input.rakeBps,
    tier: input.tier,
    places: 3,
  });
}

export interface SplitInput {
  poolCents: bigint;
  rakeBps: number;
  tier: Tier;
  /** How many places to pay. Capped at the number of defined shares. */
  places: number;
}

/**
 * Divide a real pool: rake off the top, then the remainder across the paying
 * places. Lower places are floored and first place absorbs the remainder, so
 * rake plus every place always sums back to the pool — no cent is invented or
 * lost. This is what settlement posts to the ledger, so it must be exact.
 *
 * Paying fewer places than the split defines (a league that only drew two
 * players) is handled by the same rule: the unallocated share falls to first.
 */
export function splitPool(input: SplitInput): PrizeBreakdown {
  const shares = (
    input.tier === "CHAMPIONS" ? CHAMPIONS_SPLIT : STANDARD_SPLIT
  ).slice(0, Math.max(0, input.places));

  const poolCents = input.poolCents > 0n ? input.poolCents : 0n;
  const rakeCents = (poolCents * BigInt(input.rakeBps)) / BPS;
  const distributable = poolCents - rakeCents;

  if (shares.length === 0) {
    // Nobody to pay — the whole pool is rake. Callers must handle this.
    return { poolCents, rakeCents: poolCents, places: [] };
  }

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

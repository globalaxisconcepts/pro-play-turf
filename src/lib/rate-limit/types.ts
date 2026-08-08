export interface RateLimitRule {
  /** Maximum allowed hits inside the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Milliseconds until the window resets. */
  resetMs: number;
}

/**
 * A fixed-window counter. Deliberately simple: the goal is to stop runaway
 * loops and casual abuse, not to be an exact token bucket.
 */
export interface RateLimiter {
  readonly name: string;
  consume(key: string, rule: RateLimitRule): Promise<RateLimitResult>;
}

/** Named limits, so the numbers live in one place instead of at call sites. */
export const LIMITS = {
  /** Money leaving or entering a wallet. */
  deposit: { limit: 10, windowMs: 60_000 },
  /** Joining or withdrawing from leagues. */
  leagueEntry: { limit: 20, windowMs: 60_000 },
  /** Reporting results and filing disputes. */
  matchReport: { limit: 30, windowMs: 60_000 },
  /** Marketplace listing and buying. */
  market: { limit: 20, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitRule>;

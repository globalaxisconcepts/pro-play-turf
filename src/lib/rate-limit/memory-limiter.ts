import type { RateLimitResult, RateLimitRule, RateLimiter } from "./types";

interface Window {
  count: number;
  resetAt: number;
}

/**
 * Per-process fixed-window counter. On serverless each instance keeps its own
 * tally, so this bounds a burst rather than a distributed attacker — which is
 * the honest limit of what it can do. Use the Redis driver when that matters.
 */
export class InProcessRateLimiter implements RateLimiter {
  readonly name = "memory";
  private readonly windows = new Map<string, Window>();

  async consume(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    const now = Date.now();
    const existing = this.windows.get(key);

    if (!existing || existing.resetAt <= now) {
      const resetAt = now + rule.windowMs;
      this.windows.set(key, { count: 1, resetAt });
      this.sweep(now);
      return {
        allowed: true,
        remaining: Math.max(0, rule.limit - 1),
        resetMs: rule.windowMs,
      };
    }

    existing.count += 1;
    return {
      allowed: existing.count <= rule.limit,
      remaining: Math.max(0, rule.limit - existing.count),
      resetMs: existing.resetAt - now,
    };
  }

  /** Drop expired windows so a long-lived instance doesn't grow unbounded. */
  private sweep(now: number): void {
    if (this.windows.size < 1_000) return;
    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) this.windows.delete(key);
    }
  }
}

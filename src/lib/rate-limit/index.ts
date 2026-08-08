import { env } from "@/lib/env";
import { InProcessRateLimiter } from "./memory-limiter";
import { RedisRateLimiter } from "./redis-limiter";
import type { RateLimiter } from "./types";

export type { RateLimiter, RateLimitResult, RateLimitRule } from "./types";
export { LIMITS } from "./types";
export { InProcessRateLimiter } from "./memory-limiter";
export { RedisRateLimiter } from "./redis-limiter";

/**
 * Rate limiting driver, chosen the same way the wallet lock is.
 *
 * The in-process limiter counts per Node instance, so on serverless it bounds
 * a burst rather than a determined attacker — useful against accidents and
 * scripts, not a security control. Redis makes it global. Neither is a
 * substitute for the correctness guards in the services themselves.
 */
export function createRateLimiter(): RateLimiter {
  return env.RATE_LIMIT_DRIVER === "redis"
    ? new RedisRateLimiter()
    : new InProcessRateLimiter();
}

let singleton: RateLimiter | null = null;

export function rateLimiter(): RateLimiter {
  return (singleton ??= createRateLimiter());
}

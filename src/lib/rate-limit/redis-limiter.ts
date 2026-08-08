import { getRedis } from "@/lib/redis";
import type { RateLimitResult, RateLimitRule, RateLimiter } from "./types";

/**
 * Global fixed-window counter in Redis: INCR the window key, and set its TTL
 * on first use so the window expires by itself.
 *
 * Fails OPEN. A rate limiter that goes down must not take the whole app with
 * it — losing throttling for a few minutes is a far smaller problem than
 * refusing every player's action because Upstash blipped. The correctness
 * guards that actually protect money live in the services and the database.
 */
export class RedisRateLimiter implements RateLimiter {
  readonly name = "redis";

  async consume(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    const bucket = Math.floor(Date.now() / rule.windowMs);
    const redisKey = `rl:${key}:${bucket}`;

    try {
      const redis = getRedis();
      const count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.pexpire(redisKey, rule.windowMs);
      }
      return {
        allowed: count <= rule.limit,
        remaining: Math.max(0, rule.limit - count),
        resetMs: (bucket + 1) * rule.windowMs - Date.now(),
      };
    } catch (err) {
      console.error("[rate-limit] redis unavailable, allowing:", err);
      return { allowed: true, remaining: rule.limit, resetMs: rule.windowMs };
    }
  }
}

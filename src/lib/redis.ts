import { Redis } from "@upstash/redis";
import { env } from "./env";

/**
 * Upstash Redis via the REST client. It makes no network connection on
 * construction (it dials per request), so this is safe at build/import time.
 * Used only by the Redis wallet-lock implementation in production.
 */
let client: Redis | null = null;

export function getRedis(): Redis {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error(
      "Upstash Redis is not configured. Set UPSTASH_REDIS_REST_URL and " +
        "UPSTASH_REDIS_REST_TOKEN, or use LEDGER_LOCK_DRIVER=memory.",
    );
  }
  if (!client) {
    client = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return client;
}

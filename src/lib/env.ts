import { z } from "zod";

/**
 * Environment schema. Deliberately **placeholder-tolerant**: every field is
 * optional or defaulted, so importing this module never throws — `next build`
 * and module load succeed with a bare `.env`. Code that actually needs a
 * connection (db.ts, redis.ts) fails loudly at first use instead of at import.
 * Honors `SKIP_ENV_VALIDATION=1` for CI builds.
 */
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  /** Which wallet-lock implementation the ledger uses. */
  LEDGER_LOCK_DRIVER: z.enum(["memory", "redis"]).default("memory"),
  /** Rate-limit backend. "memory" counts per instance; "redis" is global. */
  RATE_LIMIT_DRIVER: z.enum(["memory", "redis"]).default("memory"),
  /**
   * Deposits mint test credits with no payment taken, so this must stay unset
   * anywhere real people can reach. Slice 13 replaces the stub with a real
   * gateway; until then "1" is the only thing that switches deposits on.
   */
  ENABLE_TEST_CREDIT_DEPOSITS: z.string().optional(),
  /** Minimum age to hold an account. Enforced at signup and on money actions. */
  MIN_AGE_YEARS: z.coerce.number().int().min(13).max(25).default(18),
  /**
   * Base64 (or raw JSON) of the Firebase Admin service-account key. Optional:
   * when unset in dev, auth() falls back to the seeded demo player. The public
   * NEXT_PUBLIC_FIREBASE_* client config is read directly in firebase/client.ts
   * so Next can inline it at build time.
   */
  FIREBASE_SERVICE_ACCOUNT_KEY: z.string().optional(),
  /**
   * Dev-only: which seeded user the offline `auth()` fallback resolves to.
   * Defaults to the demo player; point it at the seeded admin
   * (`demo-admin-user`) to exercise /admin without Firebase. Ignored entirely
   * in production and whenever FIREBASE_SERVICE_ACCOUNT_KEY is set.
   */
  DEV_SESSION_USER_ID: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

function loadEnv(): Env {
  if (process.env.SKIP_ENV_VALIDATION) {
    // Trust the environment during builds; still apply defaults.
    return schema.parse({});
  }
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // Non-fatal by design — warn and fall back to defaults.
    console.warn(
      "[env] validation warnings:",
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    );
    return schema.parse({});
  }
  return parsed.data;
}

export const env = loadEnv();

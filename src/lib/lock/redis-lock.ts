import { getRedis } from "@/lib/redis";
import {
  orderedLockKeys,
  WalletLockTimeoutError,
  type WalletLock,
} from "./wallet-lock";

/**
 * Single-instance Redis lock: `SET key token NX PX ttl` to acquire, and a Lua
 * compare-and-delete to release only if we still own it. Deliberately NOT
 * Redlock — its multi-master safety buys nothing against a single Upstash
 * endpoint, and Upstash's async replication means a lock can never be the sole
 * correctness guarantee anyway (the database is). This just reduces contention
 * and guards read-check-write windows.
 */
const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end`;

function newToken(): string {
  return globalThis.crypto.randomUUID();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class RedisWalletLock implements WalletLock {
  constructor(
    private readonly ttlMs = 5_000,
    private readonly maxWaitMs = 5_000,
  ) {}

  private async acquireOne(key: string, token: string): Promise<void> {
    const redis = getRedis();
    const deadline = Date.now() + this.maxWaitMs;
    for (;;) {
      const ok = await redis.set(key, token, { nx: true, px: this.ttlMs });
      if (ok === "OK") return;
      if (Date.now() >= deadline) throw new WalletLockTimeoutError(key);
      // bounded backoff with jitter so a stuck holder doesn't wedge callers
      await sleep(20 + Math.floor(Math.random() * 40));
    }
  }

  private async releaseOne(key: string, token: string): Promise<void> {
    const redis = getRedis();
    try {
      await redis.eval(RELEASE_SCRIPT, [key], [token]);
    } catch {
      // If release fails, the TTL guarantees the lock eventually frees itself.
    }
  }

  async withLocks<T>(walletIds: string[], fn: () => Promise<T>): Promise<T> {
    const keys = orderedLockKeys(walletIds).map((id) => `lock:wallet:${id}`);
    const held: { key: string; token: string }[] = [];
    try {
      for (const key of keys) {
        const token = newToken();
        await this.acquireOne(key, token);
        held.push({ key, token });
      }
      return await fn();
    } finally {
      for (const { key, token } of held.reverse()) {
        await this.releaseOne(key, token);
      }
    }
  }
}

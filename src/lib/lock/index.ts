import { env } from "@/lib/env";
import { InProcessWalletLock } from "./in-process-lock";
import { RedisWalletLock } from "./redis-lock";
import type { WalletLock } from "./wallet-lock";

export type { WalletLock } from "./wallet-lock";
export { WalletLockTimeoutError } from "./wallet-lock";
export { InProcessWalletLock } from "./in-process-lock";
export { RedisWalletLock } from "./redis-lock";

/** Build a wallet lock from configuration (memory by default, redis in prod). */
export function createWalletLock(): WalletLock {
  return env.LEDGER_LOCK_DRIVER === "redis"
    ? new RedisWalletLock()
    : new InProcessWalletLock();
}

let singleton: WalletLock | null = null;

/** Process-wide wallet lock used by the app's ledger service. */
export function walletLock(): WalletLock {
  return (singleton ??= createWalletLock());
}

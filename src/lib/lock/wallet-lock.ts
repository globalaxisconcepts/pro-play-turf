/**
 * A wallet lock serializes concurrent balance-affecting operations per wallet.
 *
 * IMPORTANT: the lock is a best-effort contention / read-check-write guard, NOT
 * the correctness guarantee for money. Correctness lives in the database
 * (balanced double-entry, atomic increments, a unique txn id for idempotency,
 * and Serializable isolation). See LedgerService.
 */
export interface WalletLock {
  /**
   * Run `fn` while holding a lock on every given wallet id. Ids are deduped and
   * acquired in a deterministic global order (ascending) to avoid deadlock when
   * a transaction touches more than one wallet; locks are released in reverse.
   */
  withLocks<T>(walletIds: string[], fn: () => Promise<T>): Promise<T>;
}

export class WalletLockTimeoutError extends Error {
  constructor(key: string) {
    super(`Timed out acquiring wallet lock: ${key}`);
    this.name = "WalletLockTimeoutError";
  }
}

/** Dedupe + sort wallet ids into the canonical global lock-acquisition order. */
export function orderedLockKeys(walletIds: string[]): string[] {
  return [...new Set(walletIds)].sort();
}

import { Mutex, type MutexInterface } from "async-mutex";
import { orderedLockKeys, type WalletLock } from "./wallet-lock";

/**
 * In-process wallet lock backed by one async-mutex per wallet id. Genuinely
 * serializes concurrent `post()` calls within a single Node process, which is
 * exactly what the ledger's overdraft/double-spend tests exercise offline. Used
 * for dev and tests; production uses the Redis implementation.
 */
export class InProcessWalletLock implements WalletLock {
  private readonly mutexes = new Map<string, Mutex>();

  private mutexFor(id: string): Mutex {
    let m = this.mutexes.get(id);
    if (!m) {
      m = new Mutex();
      this.mutexes.set(id, m);
    }
    return m;
  }

  async withLocks<T>(walletIds: string[], fn: () => Promise<T>): Promise<T> {
    const keys = orderedLockKeys(walletIds);
    const releasers: MutexInterface.Releaser[] = [];
    try {
      for (const key of keys) {
        releasers.push(await this.mutexFor(key).acquire());
      }
      return await fn();
    } finally {
      for (const release of releasers.reverse()) release();
    }
  }
}

import { describe, expect, it } from "vitest";
import { InProcessWalletLock } from "@/lib/lock/in-process-lock";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("InProcessWalletLock", () => {
  it("serializes concurrent critical sections on the same wallet", async () => {
    const lock = new InProcessWalletLock();
    let active = 0;
    let maxActive = 0;

    const task = () =>
      lock.withLocks(["w1"], async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await sleep(10);
        active -= 1;
      });

    await Promise.all([task(), task(), task(), task()]);
    expect(maxActive).toBe(1);
    expect(active).toBe(0);
  });

  it("allows concurrency across different wallets", async () => {
    const lock = new InProcessWalletLock();
    let active = 0;
    let maxActive = 0;

    const task = (id: string) =>
      lock.withLocks([id], async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await sleep(15);
        active -= 1;
      });

    await Promise.all([task("a"), task("b"), task("c")]);
    expect(maxActive).toBeGreaterThan(1);
  });

  it("acquires multiple wallets in a global order without deadlocking", async () => {
    const lock = new InProcessWalletLock();
    const order: string[] = [];

    // Opposing acquisition orders would deadlock a naive lock; ordered
    // acquisition (sorted ids) prevents it.
    const t1 = lock.withLocks(["b", "a"], async () => {
      order.push("t1");
      await sleep(10);
    });
    const t2 = lock.withLocks(["a", "b"], async () => {
      order.push("t2");
      await sleep(10);
    });

    await expect(Promise.all([t1, t2])).resolves.toBeDefined();
    expect(order).toHaveLength(2);
  });

  it("releases locks even when the critical section throws", async () => {
    const lock = new InProcessWalletLock();
    await expect(
      lock.withLocks(["w1"], async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    // If the lock leaked, this would hang past the test timeout.
    let ran = false;
    await lock.withLocks(["w1"], async () => {
      ran = true;
    });
    expect(ran).toBe(true);
  });
});

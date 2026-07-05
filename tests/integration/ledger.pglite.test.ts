import { Bucket, type PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { InProcessWalletLock } from "@/lib/lock/in-process-lock";
import { InsufficientFundsError } from "@/server/ledger/errors";
import { LedgerService } from "@/server/ledger/ledger-service";
import { StubPaymentProvider } from "@/server/payments/stub-provider";
import { createTestDb, seedWallets, type TestDb } from "../helpers/pglite";

describe("LedgerService (PGlite integration)", () => {
  let db: TestDb;
  let prisma: PrismaClient;
  let ledger: LedgerService;
  let systemWalletId: string;
  let playerWalletId: string;
  let playerUserId: string;

  beforeEach(async () => {
    db = await createTestDb();
    prisma = db.prisma;
    ledger = new LedgerService(prisma, new InProcessWalletLock());
    ({ systemWalletId, playerWalletId, playerUserId } = await seedWallets(prisma));
  });

  afterEach(async () => {
    await db.close();
  });

  function deposit(txnId: string, amountCents: bigint) {
    return ledger.post({
      txnId,
      reason: "DEPOSIT",
      lines: [
        { walletId: playerWalletId, bucket: Bucket.AVAILABLE, amountCents },
        { walletId: systemWalletId, bucket: Bucket.HOUSE, amountCents: -amountCents },
      ],
    });
  }

  async function available(): Promise<bigint> {
    const w = await prisma.wallet.findUniqueOrThrow({
      where: { id: playerWalletId },
    });
    return w.availableCents;
  }

  it("posts a balanced deposit and updates the cached balance", async () => {
    await deposit("t1", 5000n);

    expect(await available()).toBe(5000n);
    const entries = await prisma.ledgerEntry.findMany({ where: { txnId: "t1" } });
    expect(entries).toHaveLength(2);
    expect(entries.reduce((acc, e) => acc + e.amountCents, 0n)).toBe(0n);
  });

  it("keeps cache == ledger sum after many operations", async () => {
    let expected = 0n;
    for (let i = 0; i < 30; i++) {
      const amount = BigInt(((i * 37) % 500) + 1) * 100n;
      await deposit(`d${i}`, amount);
      expected += amount;
    }

    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: { id: playerWalletId },
    });
    const ledgerSum = await prisma.ledgerEntry.aggregate({
      _sum: { amountCents: true },
      where: { walletId: playerWalletId, bucket: Bucket.AVAILABLE },
    });

    expect(wallet.availableCents).toBe(expected);
    expect(wallet.availableCents).toBe(ledgerSum._sum.amountCents ?? 0n);

    // And every transaction in the system nets to zero.
    const all = await prisma.ledgerEntry.findMany();
    const byTxn = new Map<string, bigint>();
    for (const e of all) {
      byTxn.set(e.txnId, (byTxn.get(e.txnId) ?? 0n) + e.amountCents);
    }
    for (const sum of byTxn.values()) expect(sum).toBe(0n);
  });

  it("rejects an overdraft and rolls back completely", async () => {
    await deposit("seed", 5000n);
    await expect(
      ledger.post({
        txnId: "overdraw",
        reason: "ENTRY_HOLD",
        lines: [
          { walletId: playerWalletId, bucket: Bucket.AVAILABLE, amountCents: -6000n },
          { walletId: playerWalletId, bucket: Bucket.ESCROW, amountCents: 6000n },
        ],
      }),
    ).rejects.toBeInstanceOf(InsufficientFundsError);

    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: { id: playerWalletId },
    });
    expect(wallet.availableCents).toBe(5000n); // unchanged
    expect(wallet.escrowCents).toBe(0n);
    // no partial entries from the failed txn
    expect(await prisma.ledgerEntry.count({ where: { txnId: "overdraw" } })).toBe(0);
  });

  it("lets exactly one of two concurrent spends of the last cents win", async () => {
    await deposit("seed", 100n);

    const move = (txnId: string) =>
      ledger.post({
        txnId,
        reason: "ENTRY_HOLD",
        lines: [
          { walletId: playerWalletId, bucket: Bucket.AVAILABLE, amountCents: -100n },
          { walletId: playerWalletId, bucket: Bucket.ESCROW, amountCents: 100n },
        ],
      });

    const results = await Promise.allSettled([move("m1"), move("m2")]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled).toHaveLength(1);

    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: { id: playerWalletId },
    });
    expect(wallet.availableCents).toBe(0n);
    expect(wallet.escrowCents).toBe(100n);
  });

  it("is idempotent — reposting the same txnId is a no-op", async () => {
    await deposit("dup", 2500n);
    await deposit("dup", 2500n); // same id => already applied, no throw

    expect(await available()).toBe(2500n);
    expect(await prisma.ledgerEntry.count({ where: { txnId: "dup" } })).toBe(2);
  });

  it("StubPaymentProvider.createDeposit posts a HOUSE→AVAILABLE txn", async () => {
    const provider = new StubPaymentProvider(prisma, ledger);
    const result = await provider.createDeposit({
      userId: playerUserId,
      amountCents: 2500n,
    });

    expect(result.status).toBe("COMPLETED");
    expect(await available()).toBe(2500n);

    // HOUSE side recorded on the system wallet, summing the txn to zero.
    const houseSum = await prisma.ledgerEntry.aggregate({
      _sum: { amountCents: true },
      where: { walletId: systemWalletId, bucket: Bucket.HOUSE },
    });
    expect(houseSum._sum.amountCents).toBe(-2500n);
  });
});

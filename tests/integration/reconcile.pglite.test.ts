import { Bucket, type PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { InProcessWalletLock } from "@/lib/lock/in-process-lock";
import { LedgerService } from "@/server/ledger/ledger-service";
import { describeReport, reconcileLedger } from "@/server/ledger/reconcile";
import { createTestDb, seedWallets, type TestDb } from "../helpers/pglite";

describe("reconcileLedger (PGlite integration)", () => {
  let db: TestDb;
  let prisma: PrismaClient;
  let ledger: LedgerService;
  let systemWalletId: string;
  let playerWalletId: string;

  beforeEach(async () => {
    db = await createTestDb();
    prisma = db.prisma;
    ledger = new LedgerService(prisma, new InProcessWalletLock());
    ({ systemWalletId, playerWalletId } = await seedWallets(prisma));

    await ledger.post({
      txnId: "dep-1",
      reason: "DEPOSIT",
      lines: [
        { walletId: playerWalletId, bucket: Bucket.AVAILABLE, amountCents: 10_000n },
        { walletId: systemWalletId, bucket: Bucket.HOUSE, amountCents: -10_000n },
      ],
    });
  });

  afterEach(async () => {
    await db.close();
  });

  it("reports clean when the caches match the ledger", async () => {
    const report = await reconcileLedger(prisma);
    expect(report.clean).toBe(true);
    expect(report.drift).toEqual([]);
    expect(report.unbalanced).toEqual([]);
    expect(report.walletsChecked).toBeGreaterThan(0);
    expect(describeReport(report)).toContain("Ledger clean");
  });

  it("is clean on an untouched database", async () => {
    const fresh = await createTestDb();
    try {
      const report = await reconcileLedger(fresh.prisma);
      expect(report.clean).toBe(true);
    } finally {
      await fresh.close();
    }
  });

  it("catches a balance written outside LedgerService", async () => {
    // Exactly the corruption the architecture forbids.
    await prisma.wallet.update({
      where: { id: playerWalletId },
      data: { availableCents: 999_999n },
    });

    const report = await reconcileLedger(prisma);
    expect(report.clean).toBe(false);
    expect(report.drift).toHaveLength(1);
    expect(report.drift[0]).toMatchObject({
      bucket: "AVAILABLE",
      cachedCents: 999_999n,
      ledgerCents: 10_000n,
    });
    expect(describeReport(report)).toContain("LEDGER DRIFT DETECTED");
  });

  it("catches escrow drift separately from available", async () => {
    await prisma.wallet.update({
      where: { id: playerWalletId },
      data: { escrowCents: 5_000n },
    });

    const report = await reconcileLedger(prisma);
    expect(report.drift.map((d) => d.bucket)).toEqual(["ESCROW"]);
  });

  it("catches a transaction that no longer sums to zero", async () => {
    // Delete one side of a balanced pair.
    await prisma.ledgerEntry.deleteMany({
      where: { txnId: "dep-1", walletId: systemWalletId },
    });

    const report = await reconcileLedger(prisma);
    expect(report.clean).toBe(false);
    expect(report.unbalanced).toEqual([{ txnId: "dep-1", sumCents: 10_000n }]);
  });

  it("does not repair what it finds — drift stays visible", async () => {
    await prisma.wallet.update({
      where: { id: playerWalletId },
      data: { availableCents: 1n },
    });

    await reconcileLedger(prisma);

    const after = await prisma.wallet.findUniqueOrThrow({
      where: { id: playerWalletId },
      select: { availableCents: true },
    });
    // Silently rewriting the balance would destroy the evidence.
    expect(after.availableCents).toBe(1n);
  });

  it("stays clean through a burst of real ledger activity", async () => {
    for (let i = 0; i < 12; i++) {
      await ledger.post({
        txnId: `hold-${i}`,
        reason: "ENTRY_HOLD",
        lines: [
          { walletId: playerWalletId, bucket: Bucket.AVAILABLE, amountCents: -100n },
          { walletId: playerWalletId, bucket: Bucket.ESCROW, amountCents: 100n },
        ],
      });
    }
    const report = await reconcileLedger(prisma);
    expect(report.clean).toBe(true);
    expect(report.txnsChecked).toBe(13);
  });
});

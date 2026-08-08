import { Bucket, type PrismaClient } from "@prisma/client";

export interface WalletDrift {
  walletId: string;
  userId: string;
  bucket: "AVAILABLE" | "ESCROW";
  cachedCents: bigint;
  ledgerCents: bigint;
}

export interface UnbalancedTxn {
  txnId: string;
  sumCents: bigint;
}

export interface ReconciliationReport {
  walletsChecked: number;
  txnsChecked: number;
  drift: WalletDrift[];
  unbalanced: UnbalancedTxn[];
  /** True when the ledger and its caches agree completely. */
  clean: boolean;
}

/**
 * Prove the money is still right.
 *
 * `Wallet.availableCents` / `escrowCents` are caches of the ledger, so the two
 * must agree exactly and every transaction must still sum to zero. If either
 * ever fails, something wrote a balance outside LedgerService or a transaction
 * was written unbalanced — both are corruption, not rounding, and the numbers
 * stop being trustworthy from that point on.
 *
 * Read-only by design: it reports drift and never "repairs" it. Silently
 * rewriting a balance to match would destroy the evidence of what went wrong.
 */
export async function reconcileLedger(
  prisma: PrismaClient,
): Promise<ReconciliationReport> {
  const wallets = await prisma.wallet.findMany({
    select: {
      id: true,
      userId: true,
      availableCents: true,
      escrowCents: true,
    },
  });

  const sums = await prisma.ledgerEntry.groupBy({
    by: ["walletId", "bucket"],
    _sum: { amountCents: true },
  });
  const sumFor = (walletId: string, bucket: Bucket): bigint =>
    sums.find((s) => s.walletId === walletId && s.bucket === bucket)?._sum
      .amountCents ?? 0n;

  const drift: WalletDrift[] = [];
  for (const wallet of wallets) {
    const available = sumFor(wallet.id, Bucket.AVAILABLE);
    if (available !== wallet.availableCents) {
      drift.push({
        walletId: wallet.id,
        userId: wallet.userId,
        bucket: "AVAILABLE",
        cachedCents: wallet.availableCents,
        ledgerCents: available,
      });
    }
    const escrow = sumFor(wallet.id, Bucket.ESCROW);
    if (escrow !== wallet.escrowCents) {
      drift.push({
        walletId: wallet.id,
        userId: wallet.userId,
        bucket: "ESCROW",
        cachedCents: wallet.escrowCents,
        ledgerCents: escrow,
      });
    }
  }

  const txnSums = await prisma.ledgerEntry.groupBy({
    by: ["txnId"],
    _sum: { amountCents: true },
  });
  const unbalanced: UnbalancedTxn[] = txnSums
    .filter((t) => (t._sum.amountCents ?? 0n) !== 0n)
    .map((t) => ({ txnId: t.txnId, sumCents: t._sum.amountCents ?? 0n }));

  return {
    walletsChecked: wallets.length,
    txnsChecked: txnSums.length,
    drift,
    unbalanced,
    clean: drift.length === 0 && unbalanced.length === 0,
  };
}

/** One-line summary for logs and alerts. */
export function describeReport(report: ReconciliationReport): string {
  if (report.clean) {
    return `Ledger clean: ${report.walletsChecked} wallets, ${report.txnsChecked} transactions, no drift.`;
  }
  const parts: string[] = [];
  if (report.drift.length > 0) {
    parts.push(
      `${report.drift.length} cache drift(s): ` +
        report.drift
          .map(
            (d) =>
              `${d.userId}/${d.bucket} cached=${d.cachedCents} ledger=${d.ledgerCents}`,
          )
          .join("; "),
    );
  }
  if (report.unbalanced.length > 0) {
    parts.push(
      `${report.unbalanced.length} unbalanced txn(s): ` +
        report.unbalanced.map((t) => `${t.txnId}=${t.sumCents}`).join("; "),
    );
  }
  return `LEDGER DRIFT DETECTED — ${parts.join(" | ")}`;
}

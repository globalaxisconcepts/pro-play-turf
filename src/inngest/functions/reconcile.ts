import { inngest } from "@/lib/inngest";
import { prisma } from "@/lib/db";
import { describeReport, reconcileLedger } from "@/server/ledger/reconcile";

/**
 * Nightly proof that the money is still right: cached wallet balances must
 * equal their ledger sums, and every transaction must still net to zero.
 *
 * THROWS on drift rather than returning quietly. Drift means something wrote a
 * balance outside LedgerService or a transaction was written unbalanced —
 * corruption, not a warning — and a failed job is what actually gets noticed.
 * It never repairs anything: rewriting a balance to match would destroy the
 * evidence of what went wrong.
 */
export const nightlyReconcile = inngest.createFunction(
  { id: "ledger-reconcile", retries: 0 },
  { cron: "0 3 * * *" },
  async ({ step }) => {
    const report = await step.run("reconcile", () => reconcileLedger(prisma));
    const summary = describeReport(report);

    if (!report.clean) {
      console.error(`[reconcile] ${summary}`);
      throw new Error(summary);
    }

    console.log(`[reconcile] ${summary}`);
    return { clean: true, summary };
  },
);

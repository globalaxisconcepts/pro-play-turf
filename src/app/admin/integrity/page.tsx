import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { formatCents } from "@/lib/money";
import { auth } from "@/server/auth";
import { reconcileLedger } from "@/server/ledger/reconcile";
import { testCreditDepositsEnabled } from "@/lib/flags";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin · Integrity" };

/**
 * The pre-launch dashboard: is the money provably intact, and which gates are
 * currently open? Runs the same reconciliation as the nightly job, on demand.
 */
export default async function AdminIntegrityPage() {
  const { role } = await auth();
  if (role !== "ADMIN") notFound();

  const [report, audit] = await Promise.all([
    reconcileLedger(prisma),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        action: true,
        actorUserId: true,
        entityType: true,
        entityId: true,
        detail: true,
        createdAt: true,
      },
    }),
  ]);

  const gates = [
    {
      label: "Test-credit deposits",
      on: testCreditDepositsEnabled(),
      // ON is the dangerous state here — it mints money with no payment.
      danger: testCreditDepositsEnabled(),
      note: "Mints balance with no payment taken. Must be OFF in production until the real gateway ships.",
    },
    {
      label: "Rate limiting",
      on: true,
      danger: env.RATE_LIMIT_DRIVER !== "redis",
      note:
        env.RATE_LIMIT_DRIVER === "redis"
          ? "Redis driver — limits are global."
          : "Memory driver — limits are per-instance only. Switch to redis before real traffic.",
    },
    {
      label: "Wallet lock",
      on: true,
      danger: env.LEDGER_LOCK_DRIVER !== "redis",
      note:
        env.LEDGER_LOCK_DRIVER === "redis"
          ? "Redis driver — contention guarded across instances."
          : "Memory driver — per-instance only. Postgres still guarantees correctness.",
    },
    {
      label: `Age gate (${env.MIN_AGE_YEARS}+)`,
      on: true,
      danger: false,
      note: "Checked server-side on every money action, not just at signup.",
    },
  ];

  return (
    <div className="admin-page">
      <h1>Integrity</h1>
      <p className="admin-sub">
        Reconciliation runs nightly and fails loudly on drift. This page runs it
        on demand.
      </p>

      <section
        className={report.clean ? "int-ok" : "int-bad"}
        role={report.clean ? undefined : "alert"}
      >
        <h2>{report.clean ? "✅ Ledger reconciled" : "🚨 Ledger drift detected"}</h2>
        <p>
          {report.walletsChecked} wallets · {report.txnsChecked} transactions
        </p>
        {!report.clean && (
          <>
            {report.drift.length > 0 && (
              <table className="tx-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Bucket</th>
                    <th>Cached</th>
                    <th>Ledger</th>
                  </tr>
                </thead>
                <tbody>
                  {report.drift.map((d) => (
                    <tr key={`${d.walletId}-${d.bucket}`}>
                      <td>{d.userId}</td>
                      <td>{d.bucket}</td>
                      <td>{formatCents(d.cachedCents)}</td>
                      <td>{formatCents(d.ledgerCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {report.unbalanced.length > 0 && (
              <ul className="rv-disputes">
                {report.unbalanced.map((t) => (
                  <li key={t.txnId}>
                    <strong>{t.txnId}</strong> sums to {t.sumCents} — must be 0.
                  </li>
                ))}
              </ul>
            )}
            <p className="admin-empty" style={{ marginTop: 12 }}>
              Nothing is repaired automatically — rewriting a balance would
              destroy the evidence of what went wrong.
            </p>
          </>
        )}
      </section>

      <section className="admin-list">
        <h2>Launch gates</h2>
        <table className="tx-table">
          <thead>
            <tr>
              <th>Gate</th>
              <th>State</th>
              <th className="hide-sm">Note</th>
            </tr>
          </thead>
          <tbody>
            {gates.map((g) => (
              <tr key={g.label}>
                <td>{g.label}</td>
                <td className={g.danger ? "int-warn" : undefined}>
                  {g.on ? "On" : "Off"}
                  {g.danger ? " ⚠" : ""}
                </td>
                <td className="hide-sm">{g.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="admin-list">
        <h2>Recent audit log</h2>
        {audit.length === 0 ? (
          <p className="admin-empty">Nothing recorded yet.</p>
        ) : (
          <table className="tx-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>Actor</th>
                <th className="hide-sm">Detail</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((a) => (
                <tr key={a.id}>
                  <td>{a.createdAt.toLocaleString()}</td>
                  <td>{a.action}</td>
                  <td>{a.actorUserId ?? "system"}</td>
                  <td className="hide-sm">{a.detail ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import { isDatabaseConfigured } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { auth } from "@/server/auth";
import { walletService } from "@/server/services";
import type { LedgerHistoryItem } from "@/server/wallet/wallet-service";
import { grantTestCreditsAction } from "./actions";
import { DepositModal } from "./_components/DepositModal";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Wallet" };

const REASON_LABEL: Record<string, string> = {
  DEPOSIT: "Deposit",
  ADMIN_GRANT: "Bonus credit",
  ENTRY_HOLD: "League buy-in",
  REFUND: "Refund",
  PRIZE: "Prize payout",
  PAYOUT: "Withdrawal",
  RAKE: "Platform fee",
  CARD_BUY: "Pass purchase",
  CARD_SELL: "Pass sale",
  MARKET_FEE: "Market fee",
};

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

export default async function WalletPage() {
  const { userId, role } = await auth();
  const dbReady = isDatabaseConfigured();
  const isAdmin = role === "ADMIN";
  const balances = await safe(walletService.getBalances(userId), null);
  const availableCents = balances?.availableCents ?? 0n;
  const escrowCents = balances?.escrowCents ?? 0n;

  const walletId = balances
    ? await safe(walletService.getWalletId(userId), null)
    : null;
  const history = walletId
    ? await safe(walletService.getLedgerPage(walletId, { take: 12 }), {
        items: [] as LedgerHistoryItem[],
        nextCursor: null,
      })
    : { items: [] as LedgerHistoryItem[], nextCursor: null };

  return (
    <main className="app-main">
      <div className="wallet-head">
        <div>
          <span className="eyebrow">Your Wallet</span>
          <h1>Balance &amp; History</h1>
          <p>
            Track your available balance, escrow, and match earnings — all in
            one place.
          </p>
        </div>
        {dbReady && (
          <div className="wallet-actions">
            {isAdmin && (
              <form action={grantTestCreditsAction}>
                <button type="submit" className="btn btn-ghost">
                  Grant $100 test credits
                </button>
              </form>
            )}
            <DepositModal />
          </div>
        )}
      </div>

      {!dbReady && (
        <div className="wallet-notice">
          <span className="wallet-notice-ic" aria-hidden="true">
            ✨
          </span>
          <div>
            <strong>Your wallet is almost ready.</strong> Balances, deposits,
            and match earnings will appear here soon.
          </div>
        </div>
      )}

      <div className="bal-grid">
        <div className="bal-card primary">
          <div className="bal-k">Available</div>
          <div className="bal-v">{formatCents(availableCents)}</div>
          <div className="bal-sub">Ready to enter leagues or withdraw</div>
        </div>
        <div className="bal-card">
          <div className="bal-k">In Escrow</div>
          <div className="bal-v">{formatCents(escrowCents)}</div>
          <div className="bal-sub">Held against active league entries</div>
        </div>
      </div>

      <section className="tx-section">
        <h2>Transaction History</h2>
        {history.items.length === 0 ? (
          <div className="empty">
            <div className="ic" aria-hidden="true">
              💸
            </div>
            <h3>No transactions yet</h3>
            <p>
              Your deposits, league buy-ins, prizes, and payouts will appear
              here.
            </p>
          </div>
        ) : (
          <div className="tx-wrap">
            <table className="tx-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th className="hide-sm">Bucket</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {history.items.map((tx) => {
                  const positive = tx.amountCents > 0n;
                  return (
                    <tr key={tx.id}>
                      <td>{dateFmt.format(tx.createdAt)}</td>
                      <td className="tx-type">
                        {REASON_LABEL[tx.reason] ?? tx.reason}
                      </td>
                      <td className="hide-sm">
                        <span className="tx-bucket">{tx.bucket}</span>
                      </td>
                      <td className={`amt ${positive ? "pos" : "neg"}`}>
                        {formatCents(tx.amountCents, { sign: true })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

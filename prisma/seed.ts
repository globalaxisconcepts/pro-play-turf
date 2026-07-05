import { Bucket } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DEMO_USER_ID } from "@/server/auth";
import { SYSTEM_USER_ID, SYSTEM_WALLET_ID } from "@/server/ledger/system";
import { ledgerService } from "@/server/services";

/**
 * Seeds a believable demo on test credits. Idempotent: users/wallets are
 * upserted and ledger txns use fixed ids, so re-running `db:seed` is a no-op.
 * Balances are ONLY ever created by posting through LedgerService — never by
 * writing Wallet rows directly (per the money invariants).
 */
async function main() {
  // --- SYSTEM / HOUSE singleton ---
  await prisma.user.upsert({
    where: { id: SYSTEM_USER_ID },
    update: {},
    create: {
      id: SYSTEM_USER_ID,
      email: "system@proplayturf.internal",
      displayName: "House",
      role: "SYSTEM",
    },
  });
  await prisma.wallet.upsert({
    where: { id: SYSTEM_WALLET_ID },
    update: {},
    create: { id: SYSTEM_WALLET_ID, userId: SYSTEM_USER_ID },
  });

  // --- Demo pro (rich account) ---
  await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {},
    create: {
      id: DEMO_USER_ID,
      email: "pro@proplayturf.com",
      displayName: "Demo Pro",
      role: "PLAYER",
    },
  });
  const demoWallet = await prisma.wallet.upsert({
    where: { userId: DEMO_USER_ID },
    update: {},
    create: { userId: DEMO_USER_ID },
    select: { id: true },
  });

  // --- Rookie (empty wallet, to demo empty states) ---
  await prisma.user.upsert({
    where: { id: "rookie-user" },
    update: {},
    create: {
      id: "rookie-user",
      email: "rookie@proplayturf.com",
      displayName: "Rookie",
      role: "PLAYER",
    },
  });
  await prisma.wallet.upsert({
    where: { userId: "rookie-user" },
    update: {},
    create: { userId: "rookie-user" },
  });

  // --- Demo history via the ledger (fixed ids => idempotent) ---
  await ledgerService.post({
    txnId: "seed-deposit-1",
    reason: "DEPOSIT",
    refType: "deposit",
    refId: "seed-deposit-1",
    lines: [
      { walletId: demoWallet.id, bucket: Bucket.AVAILABLE, amountCents: 25_000n },
      { walletId: SYSTEM_WALLET_ID, bucket: Bucket.HOUSE, amountCents: -25_000n },
    ],
  });
  await ledgerService.post({
    txnId: "seed-prize-1",
    reason: "PRIZE",
    refType: "league",
    refId: "elite-premier",
    lines: [
      { walletId: demoWallet.id, bucket: Bucket.AVAILABLE, amountCents: 42_000n },
      { walletId: SYSTEM_WALLET_ID, bucket: Bucket.PRIZE_POOL, amountCents: -42_000n },
    ],
  });
  await ledgerService.post({
    txnId: "seed-hold-1",
    reason: "ENTRY_HOLD",
    refType: "league",
    refId: "contender-league",
    lines: [
      { walletId: demoWallet.id, bucket: Bucket.AVAILABLE, amountCents: -5_000n },
      { walletId: demoWallet.id, bucket: Bucket.ESCROW, amountCents: 5_000n },
    ],
  });

  await reconcile();
  console.log("✓ Seed complete. Ledger reconciled; cached balances == ledger sums.");
}

/** Fail loudly if any cached balance drifts from its ledger sum. */
async function reconcile() {
  const wallets = await prisma.wallet.findMany({
    select: { id: true, availableCents: true, escrowCents: true },
  });
  for (const w of wallets) {
    const avail = await prisma.ledgerEntry.aggregate({
      _sum: { amountCents: true },
      where: { walletId: w.id, bucket: Bucket.AVAILABLE },
    });
    const escrow = await prisma.ledgerEntry.aggregate({
      _sum: { amountCents: true },
      where: { walletId: w.id, bucket: Bucket.ESCROW },
    });
    if ((avail._sum.amountCents ?? 0n) !== w.availableCents) {
      throw new Error(`Reconciliation failed: wallet ${w.id} AVAILABLE drift`);
    }
    if ((escrow._sum.amountCents ?? 0n) !== w.escrowCents) {
      throw new Error(`Reconciliation failed: wallet ${w.id} ESCROW drift`);
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

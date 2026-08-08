import { Bucket, type LeagueStatus, type Tier } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DEMO_ADMIN_USER_ID, DEMO_USER_ID } from "@/server/auth";
import { SYSTEM_USER_ID, SYSTEM_WALLET_ID } from "@/server/ledger/system";
import { AlreadyJoinedError } from "@/server/leagues/errors";
import { joinService, ledgerService } from "@/server/services";

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

  // --- Admin (owns /admin; reachable offline via DEV_SESSION_USER_ID) ---
  // `update` heals the role if the row already exists as a PLAYER.
  await prisma.user.upsert({
    where: { id: DEMO_ADMIN_USER_ID },
    update: { role: "ADMIN" },
    create: {
      id: DEMO_ADMIN_USER_ID,
      email: "admin@proplayturf.com",
      displayName: "Admin",
      role: "ADMIN",
    },
  });
  await prisma.wallet.upsert({
    where: { userId: DEMO_ADMIN_USER_ID },
    update: {},
    create: { userId: DEMO_ADMIN_USER_ID },
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
  // --- Slice 3: current season + divisions + leagues ---
  await seedLeagues();

  // --- Slice 4: real entries. Escrow is created by joining, never by hand, so
  // the held funds always have an entry behind them. ---
  await seedEntries();

  await reconcile();
  console.log("✓ Seed complete. Ledger reconciled; cached balances == ledger sums.");
}

/**
 * Seeds an ACTIVE "Season 2" with the full division ladder and a spread of
 * leagues across tiers, buy-ins, and statuses so the browse + filters have
 * believable data. Idempotent: fixed ids + `update: {}` make re-seeding a no-op.
 * No money is created here — entries/escrow arrive with Slice 4.
 */
async function seedLeagues() {
  const seasonId = "season-2";
  await prisma.season.upsert({
    where: { id: seasonId },
    update: {},
    create: {
      id: seasonId,
      name: "Season 2",
      status: "ACTIVE",
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 30 * 86_400_000),
    },
  });

  const divisions: Array<{ id: string; name: string; tier: Tier; rank: number }> = [
    { id: "div-amateur", name: "Amateur Open", tier: "AMATEUR", rank: 0 },
    { id: "div-intermediate", name: "Intermediate Regional", tier: "INTERMEDIATE", rank: 1 },
    { id: "div-advanced", name: "Advanced Conference", tier: "ADVANCED", rank: 2 },
    { id: "div-elite", name: "Elite Premier", tier: "ELITE", rank: 3 },
    { id: "div-champions", name: "Champions Circuit", tier: "CHAMPIONS", rank: 4 },
  ];
  for (const d of divisions) {
    await prisma.division.upsert({
      where: { id: d.id },
      update: {},
      create: { id: d.id, seasonId, name: d.name, tier: d.tier, rank: d.rank },
    });
  }

  const leagues: Array<{
    id: string;
    divisionId: string;
    name: string;
    buyInCents: bigint;
    rakeBps: number;
    capacity: number;
    status: LeagueStatus;
  }> = [
    { id: "lg-am-a", divisionId: "div-amateur", name: "Amateur Open A", buyInCents: 0n, rakeBps: 0, capacity: 16, status: "OPEN" },
    { id: "lg-am-b", divisionId: "div-amateur", name: "Amateur Open B", buyInCents: 0n, rakeBps: 0, capacity: 16, status: "OPEN" },
    { id: "lg-int-a", divisionId: "div-intermediate", name: "Regional League A", buyInCents: 1_000n, rakeBps: 500, capacity: 16, status: "OPEN" },
    { id: "lg-int-cup", divisionId: "div-intermediate", name: "Regional Cup", buyInCents: 1_000n, rakeBps: 500, capacity: 16, status: "LIVE" },
    { id: "lg-adv-a", divisionId: "div-advanced", name: "Conference North", buyInCents: 2_500n, rakeBps: 500, capacity: 16, status: "OPEN" },
    { id: "lg-adv-b", divisionId: "div-advanced", name: "Conference South", buyInCents: 2_500n, rakeBps: 500, capacity: 16, status: "OPEN" },
    { id: "lg-elite-a", divisionId: "div-elite", name: "Premier A", buyInCents: 5_000n, rakeBps: 500, capacity: 16, status: "OPEN" },
    { id: "lg-elite-legacy", divisionId: "div-elite", name: "Premier Legacy", buyInCents: 5_000n, rakeBps: 500, capacity: 16, status: "ENDED" },
    { id: "lg-champ", divisionId: "div-champions", name: "Champions Invitational", buyInCents: 15_000n, rakeBps: 500, capacity: 8, status: "LIVE" },
  ];
  for (const l of leagues) {
    await prisma.league.upsert({
      where: { id: l.id },
      update: {},
      create: l,
    });
  }
}

/**
 * Puts players into leagues through the real join path, so the demo shows
 * genuine escrow and honest capacity bars. Idempotent: a re-seed hits the
 * double-join guard, which we treat as "already done".
 */
async function seedEntries() {
  // The demo pro holds a real $50 buy-in in escrow.
  await ensureEntry("lg-elite-a", DEMO_USER_ID);

  // A few rivals fill the free Amateur league so the capacity bar isn't empty.
  for (let i = 1; i <= 5; i++) {
    const id = `rival-${i}`;
    await prisma.user.upsert({
      where: { id },
      update: {},
      create: {
        id,
        email: `${id}@proplayturf.com`,
        displayName: `Rival ${i}`,
        role: "PLAYER",
      },
    });
    await prisma.wallet.upsert({
      where: { userId: id },
      update: {},
      create: { userId: id },
    });
    await ensureEntry("lg-am-a", id);
  }
}

async function ensureEntry(leagueId: string, userId: string) {
  try {
    await joinService.joinLeague({ leagueId, userId });
  } catch (err) {
    if (err instanceof AlreadyJoinedError) return; // re-seed, already in
    throw err;
  }
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

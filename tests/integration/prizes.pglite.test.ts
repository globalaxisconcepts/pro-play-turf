import { Bucket, type PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { InProcessWalletLock } from "@/lib/lock/in-process-lock";
import { LedgerService } from "@/server/ledger/ledger-service";
import { SYSTEM_USER_ID, SYSTEM_WALLET_ID } from "@/server/ledger/system";
import { JoinService } from "@/server/leagues/join-service";
import { PrizeService } from "@/server/leagues/prize-service";
import { SeasonService } from "@/server/leagues/season-service";
import { MatchService } from "@/server/matches/match-service";
import { createTestDb, type TestDb } from "../helpers/pglite";

describe("PrizeService.settleLeague (PGlite integration)", () => {
  let db: TestDb;
  let prisma: PrismaClient;
  let ledger: LedgerService;
  let join: JoinService;
  let matches: MatchService;
  let prizes: PrizeService;

  const LEAGUE = "lg1";
  const BUY_IN = 10_000n; // $100 each
  const RAKE_BPS = 500; // 5%

  beforeEach(async () => {
    db = await createTestDb();
    prisma = db.prisma;
    ledger = new LedgerService(prisma, new InProcessWalletLock());
    join = new JoinService(prisma, ledger);
    matches = new MatchService(prisma);
    prizes = new PrizeService(prisma, ledger);

    await prisma.user.create({
      data: {
        id: SYSTEM_USER_ID,
        email: "system@t.test",
        displayName: "House",
        role: "SYSTEM",
      },
    });
    await prisma.wallet.create({
      data: { id: SYSTEM_WALLET_ID, userId: SYSTEM_USER_ID },
    });
    await prisma.season.create({ data: { id: "s1", name: "S1", status: "ACTIVE" } });
    await prisma.division.create({
      data: { id: "d1", seasonId: "s1", name: "Elite", tier: "ELITE", rank: 3 },
    });
    await prisma.league.create({
      data: {
        id: LEAGUE,
        divisionId: "d1",
        name: "Premier A",
        buyInCents: BUY_IN,
        rakeBps: RAKE_BPS,
        capacity: 16,
      },
    });
  });

  afterEach(async () => {
    await db.close();
  });

  async function fund(id: string, cents: bigint) {
    await prisma.user.create({
      data: { id, email: `${id}@t.test`, displayName: id.toUpperCase() },
    });
    const w = await prisma.wallet.create({ data: { id: `w-${id}`, userId: id } });
    await ledger.post({
      txnId: `fund-${id}`,
      reason: "ADMIN_GRANT",
      lines: [
        { walletId: w.id, bucket: Bucket.AVAILABLE, amountCents: cents },
        { walletId: SYSTEM_WALLET_ID, bucket: Bucket.HOUSE, amountCents: -cents },
      ],
    });
    return w.id;
  }

  /** Four funded players join and play out, A first ... D last. */
  async function playSeason() {
    for (const id of ["a", "b", "c", "d"]) {
      await fund(id, 50_000n);
      await join.joinLeague({ leagueId: LEAGUE, userId: id });
    }
    await matches.generateFixtures(LEAGUE);

    const order = ["a", "b", "c", "d"];
    for (const m of await prisma.match.findMany()) {
      const homeRank = order.indexOf(m.homeUserId);
      const awayRank = order.indexOf(m.awayUserId);
      const [home, away] = homeRank < awayRank ? [2, 0] : [0, 2];
      await matches.submitResult({
        matchId: m.id,
        userId: m.homeUserId,
        homeScore: home,
        awayScore: away,
      });
      await matches.submitResult({
        matchId: m.id,
        userId: m.awayUserId,
        homeScore: home,
        awayScore: away,
      });
    }
  }

  const balances = (userId: string) =>
    prisma.wallet.findUniqueOrThrow({
      where: { userId },
      select: { availableCents: true, escrowCents: true },
    });

  async function houseCents(): Promise<bigint> {
    const agg = await prisma.ledgerEntry.aggregate({
      _sum: { amountCents: true },
      where: { walletId: SYSTEM_WALLET_ID, bucket: Bucket.HOUSE },
    });
    return agg._sum.amountCents ?? 0n;
  }

  async function assertBalanced() {
    const txns = await prisma.ledgerTransaction.findMany({
      select: { id: true, entries: { select: { amountCents: true } } },
    });
    for (const t of txns) {
      const sum = t.entries.reduce((acc, e) => acc + e.amountCents, 0n);
      expect(`${t.id}=${sum}`).toBe(`${t.id}=0`);
    }
  }

  it("releases every entrant's escrow", async () => {
    await playSeason();
    await prizes.settleLeague(LEAGUE);

    for (const id of ["a", "b", "c", "d"]) {
      expect((await balances(id)).escrowCents).toBe(0n);
    }
  });

  it("pays the top three from the real pool, after rake", async () => {
    await playSeason();
    // pool = 4 x 10000 = 40000; rake 5% = 2000; distributable = 38000
    // 50/30/20 -> 1st 19000, 2nd 11400, 3rd 7600
    await prizes.settleLeague(LEAGUE);

    // Each started with 50000 and paid a 10000 buy-in.
    expect((await balances("a")).availableCents).toBe(40_000n + 19_000n);
    expect((await balances("b")).availableCents).toBe(40_000n + 11_400n);
    expect((await balances("c")).availableCents).toBe(40_000n + 7_600n);
    expect((await balances("d")).availableCents).toBe(40_000n);
  });

  it("routes the rake to HOUSE", async () => {
    const before = await houseCents();
    await playSeason();
    await prizes.settleLeague(LEAGUE);
    // HOUSE also funded the players, so compare the delta across settlement.
    const after = await houseCents();
    expect(after - before + 200_000n).toBe(2_000n);
  });

  it("allocates the pool to the cent — nothing invented, nothing lost", async () => {
    await playSeason();
    const { poolCents, rakeCents, paid } = await prizes.settleLeague(LEAGUE);
    expect(poolCents).toBe(40_000n);
    expect(paid.reduce((s, p) => s + p.amountCents, 0n) + rakeCents).toBe(poolCents);
  });

  it("keeps every ledger transaction balanced", async () => {
    await playSeason();
    await prizes.settleLeague(LEAGUE);
    await assertBalanced();
  });

  it("writes a PRIZE transaction the wallet history can show", async () => {
    await playSeason();
    await prizes.settleLeague(LEAGUE);

    const txn = await prisma.ledgerTransaction.findFirstOrThrow({
      where: { reason: "PRIZE", refId: LEAGUE },
    });
    expect(txn.refType).toBe("league");
  });

  it("is idempotent — settling twice pays nobody twice", async () => {
    await playSeason();
    await prizes.settleLeague(LEAGUE);
    const afterFirst = (await balances("a")).availableCents;

    await prizes.settleLeague(LEAGUE);
    expect((await balances("a")).availableCents).toBe(afterFirst);
    await assertBalanced();
  });

  it("pays a two-player league without leaving money stranded", async () => {
    for (const id of ["a", "b"]) {
      await fund(id, 50_000n);
      await join.joinLeague({ leagueId: LEAGUE, userId: id });
    }
    await matches.generateFixtures(LEAGUE);
    const m = await prisma.match.findFirstOrThrow();
    for (const uid of [m.homeUserId, m.awayUserId]) {
      await matches.submitResult({
        matchId: m.id,
        userId: uid,
        homeScore: m.homeUserId === "a" ? 3 : 0,
        awayScore: m.homeUserId === "a" ? 0 : 3,
      });
    }

    const { poolCents, rakeCents, paid } = await prizes.settleLeague(LEAGUE);
    expect(poolCents).toBe(20_000n);
    expect(paid).toHaveLength(2);
    expect(paid.reduce((s, p) => s + p.amountCents, 0n) + rakeCents).toBe(poolCents);
    expect((await balances("a")).escrowCents).toBe(0n);
  });

  it("settles a free league with no ledger movement at all", async () => {
    await prisma.league.update({
      where: { id: LEAGUE },
      data: { buyInCents: 0n },
    });
    for (const id of ["a", "b"]) {
      await fund(id, 1_000n);
      await join.joinLeague({ leagueId: LEAGUE, userId: id });
    }
    const before = await prisma.ledgerTransaction.count();

    const result = await prizes.settleLeague(LEAGUE);

    expect(result.poolCents).toBe(0n);
    expect(result.paid).toEqual([]);
    expect(await prisma.ledgerTransaction.count()).toBe(before);
  });

  it("refuses to settle a league nobody entered", async () => {
    const result = await prizes.settleLeague(LEAGUE);
    expect(result.poolCents).toBe(0n);
    expect(result.paid).toEqual([]);
  });

  // A full season plus settlement is ~40 transactions; PGlite (WASM Postgres)
  // needs longer than the default budget for that.
  it("pays out when the season closes, end to end", { timeout: 60_000 }, async () => {
    await playSeason();
    const seasons = new SeasonService(prisma, prizes);

    await seasons.closeSeason("s1", { promote: 1, relegate: 1 });

    // Winner paid, escrow released, league ended, table frozen — all from one
    // admin action.
    expect((await balances("a")).availableCents).toBe(40_000n + 19_000n);
    expect((await balances("d")).escrowCents).toBe(0n);
    expect(
      (await prisma.league.findUniqueOrThrow({ where: { id: LEAGUE } })).status,
    ).toBe("ENDED");
    expect(await prisma.standing.count({ where: { leagueId: LEAGUE } })).toBe(4);
    await assertBalanced();
  });
});

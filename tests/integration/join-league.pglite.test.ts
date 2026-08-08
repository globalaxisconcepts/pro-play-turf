import { Bucket, type PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { InProcessWalletLock } from "@/lib/lock/in-process-lock";
import { InsufficientFundsError } from "@/server/ledger/errors";
import { LedgerService } from "@/server/ledger/ledger-service";
import { SYSTEM_USER_ID, SYSTEM_WALLET_ID } from "@/server/ledger/system";
import {
  AlreadyJoinedError,
  LeagueClosedError,
  LeagueFullError,
  LeagueNotFoundError,
  NotEnteredError,
  RefundNotAllowedError,
} from "@/server/leagues/errors";
import { JoinService } from "@/server/leagues/join-service";
import { createTestDb, type TestDb } from "../helpers/pglite";

/**
 * Slice 4 acceptance, against real SQL (PGlite): joining holds exactly the
 * buy-in in ESCROW, refund restores it, capacity + double-join are enforced,
 * and the ledger stays balanced through all of it.
 */
describe("JoinService (PGlite integration)", () => {
  let db: TestDb;
  let prisma: PrismaClient;
  let ledger: LedgerService;
  let join: JoinService;
  let leagueId: string;

  const BUY_IN = 2_500n;

  beforeEach(async () => {
    db = await createTestDb();
    prisma = db.prisma;
    ledger = new LedgerService(prisma, new InProcessWalletLock());
    join = new JoinService(prisma, ledger);

    await prisma.user.create({
      data: {
        id: SYSTEM_USER_ID,
        email: "system@proplayturf.internal",
        displayName: "House",
        role: "SYSTEM",
      },
    });
    await prisma.wallet.create({
      data: { id: SYSTEM_WALLET_ID, userId: SYSTEM_USER_ID },
    });

    const season = await prisma.season.create({
      data: { id: "s1", name: "Season 1", status: "ACTIVE" },
    });
    const division = await prisma.division.create({
      data: {
        id: "d1",
        seasonId: season.id,
        name: "Advanced Conference",
        tier: "ADVANCED",
        rank: 2,
      },
    });
    const league = await prisma.league.create({
      data: {
        id: "lg1",
        divisionId: division.id,
        name: "Conference North",
        buyInCents: BUY_IN,
        rakeBps: 500,
        capacity: 2,
        status: "OPEN",
      },
    });
    leagueId = league.id;
  });

  afterEach(async () => {
    await db.close();
  });

  /** A funded player. Credits arrive through the ledger, never a direct write. */
  async function player(id: string, fundCents: bigint): Promise<string> {
    await prisma.user.create({
      data: { id, email: `${id}@proplayturf.test`, displayName: id },
    });
    const wallet = await prisma.wallet.create({
      data: { id: `w-${id}`, userId: id },
    });
    if (fundCents > 0n) {
      await ledger.post({
        txnId: `fund-${id}`,
        reason: "ADMIN_GRANT",
        lines: [
          { walletId: wallet.id, bucket: Bucket.AVAILABLE, amountCents: fundCents },
          {
            walletId: SYSTEM_WALLET_ID,
            bucket: Bucket.HOUSE,
            amountCents: -fundCents,
          },
        ],
      });
    }
    return wallet.id;
  }

  async function balances(walletId: string) {
    const w = await prisma.wallet.findUniqueOrThrow({
      where: { id: walletId },
      select: { availableCents: true, escrowCents: true },
    });
    return w;
  }

  /** Every ledger transaction must net to exactly zero. */
  async function assertLedgerBalanced() {
    const txns = await prisma.ledgerTransaction.findMany({
      select: { id: true, entries: { select: { amountCents: true } } },
    });
    expect(txns.length).toBeGreaterThan(0);
    for (const txn of txns) {
      const sum = txn.entries.reduce((acc, e) => acc + e.amountCents, 0n);
      expect(`${txn.id}=${sum}`).toBe(`${txn.id}=0`);
    }
  }

  describe("joinLeague", () => {
    it("holds exactly the buy-in in ESCROW and debits AVAILABLE", async () => {
      const walletId = await player("p1", 10_000n);

      await join.joinLeague({ leagueId, userId: "p1" });

      expect(await balances(walletId)).toEqual({
        availableCents: 10_000n - BUY_IN,
        escrowCents: BUY_IN,
      });
      await assertLedgerBalanced();
    });

    it("records an ACTIVE entry pointing at the escrow transaction", async () => {
      await player("p1", 10_000n);

      const { entryId } = await join.joinLeague({ leagueId, userId: "p1" });

      const entry = await prisma.leagueEntry.findUniqueOrThrow({
        where: { id: entryId },
      });
      expect(entry).toMatchObject({
        leagueId,
        userId: "p1",
        status: "ACTIVE",
        buyInCents: BUY_IN,
      });
      expect(entry.escrowTxnId).toBeTruthy();

      const txn = await prisma.ledgerTransaction.findUniqueOrThrow({
        where: { id: entry.escrowTxnId! },
        select: { reason: true, refType: true, refId: true },
      });
      expect(txn).toMatchObject({
        reason: "ENTRY_HOLD",
        refType: "league",
        refId: leagueId,
      });
    });

    it("joins a free league without moving any money", async () => {
      const walletId = await player("p1", 0n);
      const free = await prisma.league.create({
        data: {
          id: "lg-free",
          divisionId: "d1",
          name: "Amateur Open A",
          buyInCents: 0n,
          capacity: 16,
          status: "OPEN",
        },
      });

      const { entryId } = await join.joinLeague({
        leagueId: free.id,
        userId: "p1",
      });

      const entry = await prisma.leagueEntry.findUniqueOrThrow({
        where: { id: entryId },
      });
      expect(entry.status).toBe("ACTIVE");
      expect(entry.escrowTxnId).toBeNull();
      expect(entry.buyInCents).toBe(0n);
      expect(await balances(walletId)).toEqual({
        availableCents: 0n,
        escrowCents: 0n,
      });
    });

    it("rejects an underfunded player and leaves no entry behind", async () => {
      const walletId = await player("broke", 100n);

      await expect(
        join.joinLeague({ leagueId, userId: "broke" }),
      ).rejects.toThrow(InsufficientFundsError);

      expect(await prisma.leagueEntry.count({ where: { leagueId } })).toBe(0);
      expect(await balances(walletId)).toEqual({
        availableCents: 100n,
        escrowCents: 0n,
      });
    });

    it("refuses a second join and holds the buy-in only once", async () => {
      const walletId = await player("p1", 10_000n);
      await join.joinLeague({ leagueId, userId: "p1" });

      await expect(join.joinLeague({ leagueId, userId: "p1" })).rejects.toThrow(
        AlreadyJoinedError,
      );

      expect(await balances(walletId)).toEqual({
        availableCents: 10_000n - BUY_IN,
        escrowCents: BUY_IN,
      });
      expect(await prisma.leagueEntry.count({ where: { leagueId } })).toBe(1);
    });

    it("refuses to exceed capacity", async () => {
      await player("p1", 10_000n);
      await player("p2", 10_000n);
      const thirdWallet = await player("p3", 10_000n);
      await join.joinLeague({ leagueId, userId: "p1" });
      await join.joinLeague({ leagueId, userId: "p2" }); // capacity is 2

      await expect(join.joinLeague({ leagueId, userId: "p3" })).rejects.toThrow(
        LeagueFullError,
      );

      expect(await balances(thirdWallet)).toEqual({
        availableCents: 10_000n,
        escrowCents: 0n,
      });
      await assertLedgerBalanced();
    });

    it("frees the seat again once someone refunds", async () => {
      await player("p1", 10_000n);
      await player("p2", 10_000n);
      await player("p3", 10_000n);
      await join.joinLeague({ leagueId, userId: "p1" });
      await join.joinLeague({ leagueId, userId: "p2" });
      await join.refundEntry({ leagueId, userId: "p2" });

      await expect(
        join.joinLeague({ leagueId, userId: "p3" }),
      ).resolves.toBeTruthy();
    });

    it("lets a refunded player re-enter while the league is still open", async () => {
      const walletId = await player("p1", 10_000n);
      await join.joinLeague({ leagueId, userId: "p1" });
      await join.refundEntry({ leagueId, userId: "p1" });

      await join.joinLeague({ leagueId, userId: "p1" });

      expect(await balances(walletId)).toEqual({
        availableCents: 10_000n - BUY_IN,
        escrowCents: BUY_IN,
      });
      expect(
        await prisma.leagueEntry.count({ where: { leagueId, status: "ACTIVE" } }),
      ).toBe(1);
      await assertLedgerBalanced();
    });

    it("rejects an unknown league", async () => {
      await player("p1", 10_000n);

      await expect(
        join.joinLeague({ leagueId: "nope", userId: "p1" }),
      ).rejects.toThrow(LeagueNotFoundError);
    });

    it("refuses to join a league that is already underway", async () => {
      const walletId = await player("p1", 10_000n);
      await prisma.league.update({
        where: { id: leagueId },
        data: { status: "LIVE" },
      });

      await expect(join.joinLeague({ leagueId, userId: "p1" })).rejects.toThrow(
        LeagueClosedError,
      );

      expect(await balances(walletId)).toEqual({
        availableCents: 10_000n,
        escrowCents: 0n,
      });
    });
  });

  describe("refundEntry", () => {
    it("returns the exact buy-in to AVAILABLE and marks the entry REFUNDED", async () => {
      const walletId = await player("p1", 10_000n);
      const { entryId } = await join.joinLeague({ leagueId, userId: "p1" });

      await join.refundEntry({ leagueId, userId: "p1" });

      expect(await balances(walletId)).toEqual({
        availableCents: 10_000n,
        escrowCents: 0n,
      });
      const entry = await prisma.leagueEntry.findUniqueOrThrow({
        where: { id: entryId },
      });
      expect(entry.status).toBe("REFUNDED");
      await assertLedgerBalanced();
    });

    it("refunds what was actually held, even if the buy-in changed since", async () => {
      const walletId = await player("p1", 10_000n);
      await join.joinLeague({ leagueId, userId: "p1" });
      await prisma.league.update({
        where: { id: leagueId },
        data: { buyInCents: 9_000n },
      });

      await join.refundEntry({ leagueId, userId: "p1" });

      expect(await balances(walletId)).toEqual({
        availableCents: 10_000n,
        escrowCents: 0n,
      });
    });

    it("refuses to refund twice", async () => {
      await player("p1", 10_000n);
      await join.joinLeague({ leagueId, userId: "p1" });
      await join.refundEntry({ leagueId, userId: "p1" });

      await expect(
        join.refundEntry({ leagueId, userId: "p1" }),
      ).rejects.toThrow(NotEnteredError);
    });

    it("refuses to refund once the league has started", async () => {
      const walletId = await player("p1", 10_000n);
      await join.joinLeague({ leagueId, userId: "p1" });
      await prisma.league.update({
        where: { id: leagueId },
        data: { status: "LIVE" },
      });

      await expect(
        join.refundEntry({ leagueId, userId: "p1" }),
      ).rejects.toThrow(RefundNotAllowedError);

      expect(await balances(walletId)).toEqual({
        availableCents: 10_000n - BUY_IN,
        escrowCents: BUY_IN,
      });
    });

    it("refuses to refund a player who never entered", async () => {
      await player("p1", 10_000n);

      await expect(
        join.refundEntry({ leagueId, userId: "p1" }),
      ).rejects.toThrow(NotEnteredError);
    });
  });
});

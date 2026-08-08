import { randomUUID } from "node:crypto";
import {
  Bucket,
  type League,
  type LeagueStatus,
  Prisma,
  type PrismaClient,
} from "@prisma/client";
import type { LedgerService } from "@/server/ledger/ledger-service";
import {
  AlreadyJoinedError,
  LeagueClosedError,
  LeagueFullError,
  LeagueNotFoundError,
  NoWalletError,
  NotEnteredError,
  RefundNotAllowedError,
} from "./errors";

export interface JoinInput {
  leagueId: string;
  userId: string;
}

export interface JoinResult {
  entryId: string;
}

/** Statuses that still accept entries — and, symmetrically, still allow refunds. */
const JOINABLE: ReadonlySet<LeagueStatus> = new Set<LeagueStatus>([
  "OPEN",
  "FILLING",
]);

type LeagueForJoin = Pick<
  League,
  "id" | "buyInCents" | "capacity" | "status"
>;

/**
 * Joining and leaving a league. Money moves ONLY through LedgerService — this
 * service never touches wallet balances itself.
 *
 * Ordering matters: the seat is claimed first (the unique `(leagueId, userId)`
 * index is the double-join guard, and the capacity count runs Serializable so
 * two players can't both take the last seat), and the buy-in is escrowed second.
 * If the hold fails — an underfunded player is the common case — the seat is
 * released again, so a league is never blocked by an entry that never paid.
 */
export class JoinService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ledger: LedgerService,
  ) {}

  async joinLeague({ leagueId, userId }: JoinInput): Promise<JoinResult> {
    const league = await this.prisma.league.findUnique({
      where: { id: leagueId },
      select: { id: true, buyInCents: true, capacity: true, status: true },
    });
    if (!league) throw new LeagueNotFoundError(leagueId);
    if (!JOINABLE.has(league.status)) throw new LeagueClosedError(leagueId);

    // A free league moves no money, so it needs no wallet.
    const walletId =
      league.buyInCents > 0n ? await this.walletId(userId) : null;

    // Each join generation gets its own txn id, so a re-entry after a refund
    // posts a fresh hold instead of colliding with the old one (which the
    // ledger would treat as already-applied and silently skip).
    const escrowTxnId = league.buyInCents > 0n ? `hold-${randomUUID()}` : null;
    const entryId = await this.claimSeat(league, userId, escrowTxnId);

    if (!walletId || !escrowTxnId) return { entryId };

    try {
      await this.ledger.post({
        txnId: escrowTxnId,
        reason: "ENTRY_HOLD",
        refType: "league",
        refId: leagueId,
        lines: [
          {
            walletId,
            bucket: Bucket.AVAILABLE,
            amountCents: -league.buyInCents,
          },
          { walletId, bucket: Bucket.ESCROW, amountCents: league.buyInCents },
        ],
      });
    } catch (err) {
      // The hold never landed, so the entry must not survive it. The ledger is
      // untouched either way — post() is all-or-nothing.
      await this.prisma.leagueEntry.delete({ where: { id: entryId } });
      throw err;
    }

    return { entryId };
  }

  async refundEntry({ leagueId, userId }: JoinInput): Promise<void> {
    const entry = await this.prisma.leagueEntry.findUnique({
      where: { leagueId_userId: { leagueId, userId } },
      select: {
        id: true,
        status: true,
        buyInCents: true,
        escrowTxnId: true,
        league: { select: { status: true } },
      },
    });
    if (!entry || entry.status !== "ACTIVE") throw new NotEnteredError(leagueId);
    if (!JOINABLE.has(entry.league.status)) {
      throw new RefundNotAllowedError(leagueId);
    }

    // Reverse exactly what was held, not today's buy-in — the league's price
    // may have been edited since this player entered.
    if (entry.buyInCents > 0n && entry.escrowTxnId) {
      const walletId = await this.walletId(userId);
      await this.ledger.post({
        txnId: `refund-${entry.escrowTxnId}`,
        reason: "ENTRY_REFUND",
        refType: "league",
        refId: leagueId,
        lines: [
          { walletId, bucket: Bucket.ESCROW, amountCents: -entry.buyInCents },
          { walletId, bucket: Bucket.AVAILABLE, amountCents: entry.buyInCents },
        ],
      });
    }

    await this.prisma.leagueEntry.update({
      where: { id: entry.id },
      data: { status: "REFUNDED" },
    });
  }

  /**
   * Take a seat, or fail loudly. Serializable so the capacity check and the
   * insert can't interleave with a competing join; a REFUNDED row is reused so
   * a player who withdrew can come back while the league is still open.
   */
  private async claimSeat(
    league: LeagueForJoin,
    userId: string,
    escrowTxnId: string | null,
  ): Promise<string> {
    return this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.leagueEntry.findUnique({
          where: { leagueId_userId: { leagueId: league.id, userId } },
          select: { id: true, status: true },
        });
        if (existing?.status === "ACTIVE") {
          throw new AlreadyJoinedError(league.id);
        }

        const taken = await tx.leagueEntry.count({
          where: { leagueId: league.id, status: "ACTIVE" },
        });
        if (taken >= league.capacity) throw new LeagueFullError(league.id);

        const data = {
          status: "ACTIVE" as const,
          buyInCents: league.buyInCents,
          escrowTxnId,
        };
        if (existing) {
          await tx.leagueEntry.update({ where: { id: existing.id }, data });
          return existing.id;
        }

        try {
          const created = await tx.leagueEntry.create({
            data: { leagueId: league.id, userId, ...data },
            select: { id: true },
          });
          return created.id;
        } catch (err) {
          // Lost the race to another join for the same player.
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === "P2002"
          ) {
            throw new AlreadyJoinedError(league.id);
          }
          throw err;
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async walletId(userId: string): Promise<string> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!wallet) throw new NoWalletError(userId);
    return wallet.id;
  }
}

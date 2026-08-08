import { Bucket, type PrismaClient } from "@prisma/client";
import type { LedgerService } from "@/server/ledger/ledger-service";
import { SYSTEM_WALLET_ID } from "@/server/ledger/system";
import type { LedgerLine } from "@/server/ledger/types";
import { splitPool } from "./prize";
import { computeStandings } from "./standings";

export interface PrizeAward {
  place: number;
  userId: string;
  amountCents: bigint;
}

export interface SettlementResult {
  leagueId: string;
  poolCents: bigint;
  rakeCents: bigint;
  paid: PrizeAward[];
}

/** How many places share a pool. */
const PAYING_PLACES = 3;

/**
 * Turns a finished league into money.
 *
 * The pool is the escrow actually held — the sum of what each entrant paid —
 * not the advertised pool for a full league. A half-full league pays out half
 * as much, because that is all the money there is.
 *
 * Settlement is ONE ledger transaction: every entrant's escrow is released,
 * the rake goes to HOUSE, and the winners are credited. Because it is a single
 * transaction it either all happens or none of it does, and because its id is
 * derived from the league it is idempotent — settling twice pays nobody twice.
 */
export class PrizeService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ledger: LedgerService,
  ) {}

  async settleLeague(leagueId: string): Promise<SettlementResult> {
    const league = await this.prisma.league.findUnique({
      where: { id: leagueId },
      select: {
        id: true,
        rakeBps: true,
        division: { select: { tier: true } },
      },
    });
    if (!league) throw new Error(`League ${leagueId} not found.`);

    const entries = await this.prisma.leagueEntry.findMany({
      where: { leagueId, status: "ACTIVE" },
      select: {
        userId: true,
        buyInCents: true,
        user: {
          select: { displayName: true, wallet: { select: { id: true } } },
        },
      },
    });

    const poolCents = entries.reduce((sum, e) => sum + e.buyInCents, 0n);
    const empty: SettlementResult = {
      leagueId,
      poolCents: 0n,
      rakeCents: 0n,
      paid: [],
    };
    // A free league (or an empty one) moves no money. There is nothing for the
    // ledger to record — posting a zero transaction would be noise, not truth.
    if (entries.length === 0 || poolCents === 0n) return empty;

    const played = await this.prisma.match.findMany({
      where: { leagueId },
      select: {
        homeUserId: true,
        awayUserId: true,
        homeScore: true,
        awayScore: true,
        status: true,
      },
    });
    const table = computeStandings(
      entries.map((e) => ({
        userId: e.userId,
        displayName: e.user.displayName,
      })),
      played,
    );

    const winners = table.slice(0, Math.min(PAYING_PLACES, table.length));
    const breakdown = splitPool({
      poolCents,
      rakeBps: league.rakeBps,
      tier: league.division.tier,
      places: winners.length,
    });

    const paid: PrizeAward[] = breakdown.places.map((p, i) => ({
      place: p.place,
      userId: winners[i].userId,
      amountCents: p.amountCents,
    }));

    // Release every entrant's escrow, take the rake, credit the winners. The
    // signed lines net to zero: -pool + rake + prizes === 0.
    const lines: LedgerLine[] = [];
    for (const entry of entries) {
      const walletId = entry.user.wallet?.id;
      if (!walletId) throw new Error(`User ${entry.userId} has no wallet.`);
      if (entry.buyInCents === 0n) continue;
      lines.push({
        walletId,
        bucket: Bucket.ESCROW,
        amountCents: -entry.buyInCents,
      });
    }
    if (breakdown.rakeCents > 0n) {
      lines.push({
        walletId: SYSTEM_WALLET_ID,
        bucket: Bucket.HOUSE,
        amountCents: breakdown.rakeCents,
      });
    }
    for (const award of paid) {
      if (award.amountCents === 0n) continue;
      const walletId = entries.find((e) => e.userId === award.userId)?.user
        .wallet?.id;
      if (!walletId) throw new Error(`Winner ${award.userId} has no wallet.`);
      lines.push({
        walletId,
        bucket: Bucket.AVAILABLE,
        amountCents: award.amountCents,
      });
    }

    await this.ledger.post({
      // Derived from the league, so a retry is a no-op rather than a double pay.
      txnId: `prize-${leagueId}`,
      reason: "PRIZE",
      refType: "league",
      refId: leagueId,
      lines,
    });

    await this.prisma.auditLog.create({
      data: {
        action: "LEAGUE_SETTLED",
        entityType: "league",
        entityId: leagueId,
        detail: `Pool ${poolCents} cents; rake ${breakdown.rakeCents}; paid ${paid
          .map((p) => `${p.place}:${p.userId}=${p.amountCents}`)
          .join(", ")}`,
      },
    });

    return {
      leagueId,
      poolCents,
      rakeCents: breakdown.rakeCents,
      paid,
    };
  }
}

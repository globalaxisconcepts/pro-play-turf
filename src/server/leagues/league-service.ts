import type {
  EntryStatus,
  LeagueStatus,
  Prisma,
  PrismaClient,
  SeasonStatus,
  Tier,
} from "@prisma/client";
import type { LeagueRow } from "./types";

export interface CurrentSeason {
  id: string;
  name: string;
  status: SeasonStatus;
  endsAt: Date | null;
}

export interface SeasonListing {
  season: CurrentSeason | null;
  rows: LeagueRow[];
}

/** One prize actually paid out of a settled league's pool. */
export interface Payout {
  position: number;
  userId: string;
  displayName: string;
  amountCents: bigint;
}

/** A player holding a seat in a league. */
export interface Entrant {
  userId: string;
  displayName: string;
  joinedAt: Date;
}

/** The signed-in player's own entry, as the detail page needs it. */
export interface ViewerEntry {
  id: string;
  status: EntryStatus;
  buyInCents: bigint;
  joinedAt: Date;
}

/**
 * Division context plus the live seat count. Only ACTIVE entries occupy a seat —
 * a REFUNDED entry has released its escrow and freed the spot.
 */
const LEAGUE_ROW_INCLUDE = {
  division: { select: { name: true, tier: true, rank: true } },
  _count: { select: { entries: { where: { status: "ACTIVE" } } } },
} satisfies Prisma.LeagueInclude;

type LeagueWithContext = Prisma.LeagueGetPayload<{
  include: typeof LEAGUE_ROW_INCLUDE;
}>;

function toRow(l: LeagueWithContext): LeagueRow {
  return {
    id: l.id,
    name: l.name,
    divisionId: l.divisionId,
    divisionName: l.division.name,
    tier: l.division.tier,
    divisionRank: l.division.rank,
    buyInCents: l.buyInCents,
    rakeBps: l.rakeBps,
    capacity: l.capacity,
    spotsFilled: l._count.entries,
    status: l.status,
    startsAt: l.startsAt,
  };
}

/**
 * Read + admin-write access to the league structure. Holds no money logic —
 * buy-in escrow (Slice 4) and prize settlement (Slice 8) run through
 * LedgerService. Read-only queries never mutate.
 */
export class LeagueService {
  constructor(private readonly prisma: PrismaClient) {}

  /** The ACTIVE season if there is one, else the most recently created. */
  private async currentSeason(): Promise<CurrentSeason | null> {
    return (
      (await this.prisma.season.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, status: true, endsAt: true },
      })) ??
      (await this.prisma.season.findFirst({
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, status: true, endsAt: true },
      }))
    );
  }

  /** Every league in the current season, flattened with division context. */
  async listCurrentSeasonLeagues(): Promise<SeasonListing> {
    const season = await this.currentSeason();
    if (!season) return { season: null, rows: [] };

    const leagues = await this.prisma.league.findMany({
      where: { division: { seasonId: season.id } },
      include: LEAGUE_ROW_INCLUDE,
    });

    return { season, rows: leagues.map(toRow) };
  }

  /** Single league with division context, or null. Used by /leagues/[id]. */
  async getLeague(id: string): Promise<LeagueRow | null> {
    const league = await this.prisma.league.findUnique({
      where: { id },
      include: LEAGUE_ROW_INCLUDE,
    });
    return league ? toRow(league) : null;
  }

  /**
   * Everyone currently holding a seat, in join order. Standings proper arrive
   * with the match engine (Slices 5/7) — until then this is the roster.
   */
  async entrants(leagueId: string): Promise<Entrant[]> {
    const entries = await this.prisma.leagueEntry.findMany({
      where: { leagueId, status: "ACTIVE" },
      orderBy: { joinedAt: "asc" },
      select: {
        userId: true,
        joinedAt: true,
        user: { select: { displayName: true } },
      },
    });
    return entries.map((e) => ({
      userId: e.userId,
      displayName: e.user.displayName,
      joinedAt: e.joinedAt,
    }));
  }

  /**
   * The viewer's live entry in a league, or null. A REFUNDED entry is not an
   * entry — the seat was released — so the detail page renders "not entered".
   */
  async entryFor(leagueId: string, userId: string): Promise<ViewerEntry | null> {
    const entry = await this.prisma.leagueEntry.findUnique({
      where: { leagueId_userId: { leagueId, userId } },
      select: {
        id: true,
        status: true,
        buyInCents: true,
        joinedAt: true,
      },
    });
    return entry && entry.status === "ACTIVE" ? entry : null;
  }

  /**
   * What a settled league actually paid, read back from the ledger rather than
   * recomputed — the ledger is the source of truth for money, so this can never
   * advertise a payout that didn't happen. Empty until settlement.
   */
  async payoutsFor(leagueId: string): Promise<Payout[]> {
    const entries = await this.prisma.ledgerEntry.findMany({
      where: {
        bucket: "AVAILABLE",
        amountCents: { gt: 0 },
        txn: { reason: "PRIZE", refType: "league", refId: leagueId },
      },
      orderBy: { amountCents: "desc" },
      select: {
        amountCents: true,
        wallet: {
          select: {
            userId: true,
            user: { select: { displayName: true } },
          },
        },
      },
    });

    return entries.map((e, i) => ({
      position: i + 1,
      userId: e.wallet.userId,
      displayName: e.wallet.user.displayName,
      amountCents: e.amountCents,
    }));
  }

  // --- Admin authoring --------------------------------------------------

  async createSeason(input: {
    name: string;
    status?: SeasonStatus;
    startsAt?: Date | null;
    endsAt?: Date | null;
  }): Promise<string> {
    const s = await this.prisma.season.create({
      data: {
        name: input.name,
        status: input.status ?? "UPCOMING",
        startsAt: input.startsAt ?? null,
        endsAt: input.endsAt ?? null,
      },
      select: { id: true },
    });
    return s.id;
  }

  async createDivision(input: {
    seasonId: string;
    name: string;
    tier: Tier;
    rank: number;
  }): Promise<string> {
    const d = await this.prisma.division.create({
      data: input,
      select: { id: true },
    });
    return d.id;
  }

  async createLeague(input: {
    divisionId: string;
    name: string;
    buyInCents: bigint;
    rakeBps: number;
    capacity: number;
    status?: LeagueStatus;
    startsAt?: Date | null;
  }): Promise<string> {
    const l = await this.prisma.league.create({
      data: {
        divisionId: input.divisionId,
        name: input.name,
        buyInCents: input.buyInCents,
        rakeBps: input.rakeBps,
        capacity: input.capacity,
        status: input.status ?? "OPEN",
        startsAt: input.startsAt ?? null,
      },
      select: { id: true },
    });
    return l.id;
  }

  /** Seasons with their divisions, for the admin create-league form. */
  async listSeasonsWithDivisions() {
    return this.prisma.season.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        divisions: {
          orderBy: { rank: "desc" },
          select: { id: true, name: true, tier: true, rank: true },
        },
      },
    });
  }
}

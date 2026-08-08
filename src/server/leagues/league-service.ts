import type {
  LeagueStatus,
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
      include: {
        division: { select: { name: true, tier: true, rank: true } },
      },
    });

    const rows: LeagueRow[] = leagues.map((l) => ({
      id: l.id,
      name: l.name,
      divisionId: l.divisionId,
      divisionName: l.division.name,
      tier: l.division.tier,
      divisionRank: l.division.rank,
      buyInCents: l.buyInCents,
      rakeBps: l.rakeBps,
      capacity: l.capacity,
      // Entries arrive in Slice 4; until then every league reads as open.
      spotsFilled: 0,
      status: l.status,
      startsAt: l.startsAt,
    }));

    return { season, rows };
  }

  /** Single league with division context, or null. Used by /leagues/[id]. */
  async getLeague(id: string): Promise<LeagueRow | null> {
    const l = await this.prisma.league.findUnique({
      where: { id },
      include: {
        division: { select: { name: true, tier: true, rank: true } },
      },
    });
    if (!l) return null;
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
      spotsFilled: 0,
      status: l.status,
      startsAt: l.startsAt,
    };
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

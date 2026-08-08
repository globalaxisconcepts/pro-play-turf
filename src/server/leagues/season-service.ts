import type { Prisma, PrismaClient } from "@prisma/client";
import { computeStandings, zonesFor, type ZoneConfig } from "./standings";

export interface SeasonCloseResult {
  seasonId: string;
  nextSeasonId: string;
  leaguesSettled: number;
  promoted: number;
  relegated: number;
}

/** Matches the "top 3 up, bottom 3 down" promise on the league cards. */
export const DEFAULT_ZONES: ZoneConfig = { promote: 3, relegate: 3 };

export class SeasonNotFoundError extends Error {
  constructor(seasonId: string) {
    super(`Season ${seasonId} not found.`);
    this.name = "SeasonNotFoundError";
  }
}

/**
 * The season lifecycle: freeze every league's final table, work out who goes up
 * and down, archive the season, and open the next with the same ladder.
 *
 * Promotion is an *invitation*, not an enrolment. A player's next division is
 * recorded on their Standing row, but nobody is auto-joined to next season's
 * leagues — joining costs a buy-in, and no code may move a player's money
 * without them asking for it.
 *
 * Idempotent: a CLOSED season short-circuits to its existing successor, so the
 * job can be retried or re-fired without double-promoting anyone or opening a
 * second season.
 */
export class SeasonService {
  /**
   * `prizes` is optional so the lifecycle can be exercised without money in
   * play; when supplied, closing a season also settles every league's pool.
   */
  constructor(
    private readonly prisma: PrismaClient,
    private readonly prizes?: { settleLeague(leagueId: string): Promise<unknown> },
  ) {}

  async closeSeason(
    seasonId: string,
    zones: ZoneConfig = DEFAULT_ZONES,
  ): Promise<SeasonCloseResult> {
    const season = await this.prisma.season.findUnique({
      where: { id: seasonId },
      include: {
        divisions: {
          orderBy: { rank: "asc" },
          include: { leagues: { select: { id: true } } },
        },
      },
    });
    if (!season) throw new SeasonNotFoundError(seasonId);

    // Already closed — return the successor we opened last time.
    if (season.status === "CLOSED") {
      const existing = await this.prisma.season.findFirst({
        where: { previousSeasonId: seasonId },
        select: { id: true },
      });
      const counts = await this.prisma.standing.groupBy({
        by: ["outcome"],
        where: { league: { division: { seasonId } } },
        _count: true,
      });
      const of = (o: string) =>
        counts.find((c) => c.outcome === o)?._count ?? 0;
      return {
        seasonId,
        nextSeasonId: existing?.id ?? seasonId,
        leaguesSettled: season.divisions.reduce(
          (n, d) => n + d.leagues.length,
          0,
        ),
        promoted: of("PROMOTED"),
        relegated: of("RELEGATED"),
      };
    }

    const ranks = season.divisions.map((d) => d.rank);
    const maxRank = Math.max(...ranks, 0);
    const minRank = Math.min(...ranks, 0);

    // Mirror the ladder into the next season so promoted players have somewhere
    // to land. Same tiers and ranks; leagues are authored per season by an admin.
    const nextSeason = await this.prisma.season.create({
      data: {
        name: nextSeasonName(season.name),
        status: "ACTIVE",
        previousSeasonId: seasonId,
        startsAt: new Date(),
        divisions: {
          create: season.divisions.map((d) => ({
            name: d.name,
            tier: d.tier,
            rank: d.rank,
          })),
        },
      },
      include: { divisions: { select: { id: true, rank: true } } },
    });
    const nextDivisionByRank = new Map(
      nextSeason.divisions.map((d) => [d.rank, d.id]),
    );

    let leaguesSettled = 0;
    let promoted = 0;
    let relegated = 0;

    for (const division of season.divisions) {
      for (const league of division.leagues) {
        const [entries, played] = await Promise.all([
          this.prisma.leagueEntry.findMany({
            where: { leagueId: league.id, status: "ACTIVE" },
            select: { userId: true, user: { select: { displayName: true } } },
          }),
          this.prisma.match.findMany({
            where: { leagueId: league.id },
            select: {
              homeUserId: true,
              awayUserId: true,
              homeScore: true,
              awayScore: true,
              status: true,
            },
          }),
        ]);

        const rows = computeStandings(
          entries.map((e) => ({
            userId: e.userId,
            displayName: e.user.displayName,
          })),
          played,
        );
        const { promoted: up, relegated: down } = zonesFor(rows, zones);
        const upSet = new Set(up);
        const downSet = new Set(down);

        // Pay out before the table is frozen and the league is closed. Settling
        // is idempotent, so a retry after a partial close cannot double-pay.
        if (this.prizes) await this.prizes.settleLeague(league.id);

        await this.prisma.$transaction(async (tx) => {
          for (const row of rows) {
            const outcome = upSet.has(row.userId)
              ? "PROMOTED"
              : downSet.has(row.userId)
                ? "RELEGATED"
                : "STAYED";
            // Clamp at the ends of the ladder: the top division has nowhere up,
            // the bottom nowhere down.
            const targetRank =
              outcome === "PROMOTED"
                ? Math.min(division.rank + 1, maxRank)
                : outcome === "RELEGATED"
                  ? Math.max(division.rank - 1, minRank)
                  : division.rank;

            await tx.standing.upsert({
              where: {
                leagueId_userId: { leagueId: league.id, userId: row.userId },
              },
              update: {},
              create: {
                leagueId: league.id,
                userId: row.userId,
                position: row.position,
                played: row.played,
                won: row.won,
                drawn: row.drawn,
                lost: row.lost,
                goalsFor: row.goalsFor,
                goalsAgainst: row.goalsAgainst,
                points: row.points,
                outcome,
                nextDivisionId: nextDivisionByRank.get(targetRank) ?? null,
              },
            });
          }

          await tx.league.update({
            where: { id: league.id },
            data: { status: "ENDED" },
          });
        });

        promoted += up.length;
        relegated += down.length;
        leaguesSettled += 1;
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.season.update({
        where: { id: seasonId },
        data: { status: "CLOSED", endsAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          action: "SEASON_CLOSED",
          entityType: "season",
          entityId: seasonId,
          detail: `Settled ${leaguesSettled} league(s): ${promoted} promoted, ${relegated} relegated. Opened ${nextSeason.name}.`,
        },
      });
    });

    return {
      seasonId,
      nextSeasonId: nextSeason.id,
      leaguesSettled,
      promoted,
      relegated,
    };
  }

  /** Live table for a league, derived from verified matches. */
  async standingsFor(leagueId: string) {
    const [entries, played] = await Promise.all([
      this.prisma.leagueEntry.findMany({
        where: { leagueId, status: "ACTIVE" },
        select: { userId: true, user: { select: { displayName: true } } },
      }),
      this.prisma.match.findMany({
        where: { leagueId },
        select: {
          homeUserId: true,
          awayUserId: true,
          homeScore: true,
          awayScore: true,
          status: true,
        },
      }),
    ]);
    return computeStandings(
      entries.map((e) => ({ userId: e.userId, displayName: e.user.displayName })),
      played,
    );
  }
}

/** "Season 2" -> "Season 3"; anything else gets a suffix rather than a guess. */
function nextSeasonName(current: string): string {
  const match = current.match(/^(.*?)(\d+)\s*$/);
  if (!match) return `${current} (next)`;
  return `${match[1]}${Number(match[2]) + 1}`;
}

export type { Prisma };

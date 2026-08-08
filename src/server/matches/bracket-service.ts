import type { PrismaClient } from "@prisma/client";
import { loserOf, pairWinners, seedBracket, winnerOf } from "./bracket";

export interface BracketRound {
  round: number;
  matches: Array<{
    id: string;
    status: string;
    homeUserId: string;
    awayUserId: string;
    homeScore: number | null;
    awayScore: number | null;
    home: { displayName: string };
    away: { displayName: string };
  }>;
}

export class BracketExistsError extends Error {
  constructor(leagueId: string) {
    super(`League ${leagueId} already has a bracket.`);
    this.name = "BracketExistsError";
  }
}

/**
 * The Champions League knockout.
 *
 * Qualification is earned, not bought: the top finishers of the Elite division
 * are seeded into the draw. Advancement is derived from VERIFIED results only,
 * so a match under review simply holds its round open rather than sending the
 * wrong player through — and a reviewer voiding a tie un-advances it for free.
 */
export class BracketService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Who qualified: the best finishers across the Elite division of a season.
   * Takes `size` players, which must be a power of two for a clean draw.
   */
  async qualifiers(seasonId: string, size = 4): Promise<string[]> {
    const standings = await this.prisma.standing.findMany({
      where: {
        league: { division: { seasonId, tier: "ELITE" } },
      },
      orderBy: [{ position: "asc" }, { points: "desc" }],
      take: size,
      select: { userId: true },
    });
    return standings.map((s) => s.userId);
  }

  /** Draw round one. Refuses to redraw a bracket that already exists. */
  async generateBracket(
    leagueId: string,
    seedsInOrder: string[],
  ): Promise<{ created: number }> {
    const existing = await this.prisma.match.count({ where: { leagueId } });
    if (existing > 0) throw new BracketExistsError(leagueId);

    const pairs = seedBracket(seedsInOrder);
    await this.prisma.$transaction(async (tx) => {
      await tx.match.createMany({
        data: pairs.map((p) => ({
          leagueId,
          round: p.round,
          homeUserId: p.homeUserId,
          awayUserId: p.awayUserId,
        })),
      });
      await tx.league.update({
        where: { id: leagueId },
        data: { status: "LIVE" },
      });
    });
    return { created: pairs.length };
  }

  /**
   * Create the next round if — and only if — every tie in the current one has
   * a verified, decisive winner. Idempotent: if the next round already exists
   * this does nothing.
   */
  async advance(leagueId: string): Promise<{ created: number; round: number }> {
    const matches = await this.prisma.match.findMany({
      where: { leagueId },
      orderBy: [{ round: "asc" }, { createdAt: "asc" }],
      select: {
        round: true,
        homeUserId: true,
        awayUserId: true,
        homeScore: true,
        awayScore: true,
        status: true,
      },
    });
    if (matches.length === 0) return { created: 0, round: 0 };

    const currentRound = Math.max(...matches.map((m) => m.round));
    const ties = matches.filter((m) => m.round === currentRound);
    if (ties.length < 2) return { created: 0, round: currentRound }; // final done

    const winners = ties.map(winnerOf);
    if (winners.some((w) => w === null)) {
      // A tie is unplayed, unreported, drawn, or under review — hold the round.
      return { created: 0, round: currentRound };
    }

    const nextRound = currentRound + 1;
    const pairs = pairWinners(winners as string[], nextRound);
    if (pairs.length === 0) return { created: 0, round: currentRound };

    await this.prisma.match.createMany({
      data: pairs.map((p) => ({
        leagueId,
        round: p.round,
        homeUserId: p.homeUserId,
        awayUserId: p.awayUserId,
      })),
    });
    return { created: pairs.length, round: nextRound };
  }

  /** The bracket as rounds, for rendering. */
  async bracketFor(leagueId: string): Promise<BracketRound[]> {
    const matches = await this.prisma.match.findMany({
      where: { leagueId },
      orderBy: [{ round: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        round: true,
        status: true,
        homeUserId: true,
        awayUserId: true,
        homeScore: true,
        awayScore: true,
        home: { select: { displayName: true } },
        away: { select: { displayName: true } },
      },
    });

    const byRound = new Map<number, BracketRound>();
    for (const m of matches) {
      const bucket = byRound.get(m.round) ?? { round: m.round, matches: [] };
      bucket.matches.push(m);
      byRound.set(m.round, bucket);
    }
    return [...byRound.values()].sort((a, b) => a.round - b.round);
  }

  /**
   * Final placements: champion, runner-up, then the beaten semi-finalist with
   * the better goal difference. Empty until the final is verified — a knockout
   * has no standings to fall back on, so a half-played bracket has no result.
   */
  async placements(leagueId: string): Promise<string[]> {
    const rounds = await this.bracketFor(leagueId);
    if (rounds.length === 0) return [];

    const final = rounds[rounds.length - 1];
    if (final.matches.length !== 1) return [];

    const champion = winnerOf(final.matches[0]);
    const runnerUp = loserOf(final.matches[0]);
    if (!champion || !runnerUp) return [];

    const placements = [champion, runnerUp];

    // Third: the better-performing loser of the round before the final.
    const semis = rounds[rounds.length - 2];
    if (semis) {
      const beaten = semis.matches
        .map((m) => {
          const id = loserOf(m);
          if (!id) return null;
          const scored = id === m.homeUserId ? m.homeScore : m.awayScore;
          const conceded = id === m.homeUserId ? m.awayScore : m.homeScore;
          return { id, diff: (scored ?? 0) - (conceded ?? 0) };
        })
        .filter((x): x is { id: string; diff: number } => x !== null)
        .sort((a, b) => b.diff - a.diff);
      if (beaten[0]) placements.push(beaten[0].id);
    }

    return placements;
  }
}

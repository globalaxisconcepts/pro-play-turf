import type { PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MatchService } from "@/server/matches/match-service";
import { SeasonService } from "@/server/leagues/season-service";
import { createTestDb, type TestDb } from "../helpers/pglite";

describe("SeasonService.closeSeason (PGlite integration)", () => {
  let db: TestDb;
  let prisma: PrismaClient;
  let matches: MatchService;
  let seasons: SeasonService;

  const SEASON = "s1";
  const LOW = "div-low";
  const HIGH = "div-high";
  const LEAGUE_LOW = "lg-low";

  beforeEach(async () => {
    db = await createTestDb();
    prisma = db.prisma;
    matches = new MatchService(prisma);
    seasons = new SeasonService(prisma);

    await prisma.season.create({
      data: { id: SEASON, name: "Season 1", status: "ACTIVE" },
    });
    await prisma.division.createMany({
      data: [
        { id: LOW, seasonId: SEASON, name: "Amateur", tier: "AMATEUR", rank: 0 },
        { id: HIGH, seasonId: SEASON, name: "Elite", tier: "ELITE", rank: 1 },
      ],
    });
    await prisma.league.create({
      data: { id: LEAGUE_LOW, divisionId: LOW, name: "Amateur A", capacity: 16 },
    });

    for (const id of ["a", "b", "c", "d"]) {
      await prisma.user.create({
        data: { id, email: `${id}@t.test`, displayName: id.toUpperCase() },
      });
      await prisma.leagueEntry.create({
        data: { leagueId: LEAGUE_LOW, userId: id, status: "ACTIVE" },
      });
    }
    await matches.generateFixtures(LEAGUE_LOW);
  });

  afterEach(async () => {
    await db.close();
  });

  /** Make A win everything and D lose everything, via agreeing reports. */
  async function playOut() {
    const all = await prisma.match.findMany();
    for (const m of all) {
      let home: number;
      let away: number;
      if (m.homeUserId === "a") {
        [home, away] = [3, 0]; // A wins at home
      } else if (m.awayUserId === "a") {
        [home, away] = [0, 3]; // A wins away
      } else if (m.homeUserId === "d") {
        [home, away] = [0, 2]; // D loses at home
      } else {
        [home, away] = [2, 0]; // D loses away
      }

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

  it("freezes the final table for every league", async () => {
    await playOut();
    await seasons.closeSeason(SEASON, { promote: 1, relegate: 1 });

    const standings = await prisma.standing.findMany({
      where: { leagueId: LEAGUE_LOW },
      orderBy: { position: "asc" },
    });
    expect(standings).toHaveLength(4);
    expect(standings[0]).toMatchObject({ userId: "a", position: 1 });
    expect(standings[0].points).toBe(9);
    expect(standings[3].userId).toBe("d");
  });

  it("promotes the winner and relegates the bottom", async () => {
    await playOut();
    await seasons.closeSeason(SEASON, { promote: 1, relegate: 1 });

    const rows = await prisma.standing.findMany({ where: { leagueId: LEAGUE_LOW } });
    const byUser = Object.fromEntries(rows.map((r) => [r.userId, r]));
    expect(byUser.a.outcome).toBe("PROMOTED");
    expect(byUser.d.outcome).toBe("RELEGATED");
    expect(byUser.b.outcome).toBe("STAYED");
  });

  it("points a promoted player at the division above", async () => {
    await playOut();
    const { nextSeasonId } = await seasons.closeSeason(SEASON, {
      promote: 1,
      relegate: 1,
    });

    const winner = await prisma.standing.findFirstOrThrow({
      where: { leagueId: LEAGUE_LOW, userId: "a" },
    });
    const target = await prisma.division.findUniqueOrThrow({
      where: { id: winner.nextDivisionId! },
    });
    expect(target.seasonId).toBe(nextSeasonId);
    expect(target.rank).toBe(1); // moved up from rank 0
  });

  it("keeps the bottom player in the lowest division — there is nowhere down", async () => {
    await playOut();
    await seasons.closeSeason(SEASON, { promote: 1, relegate: 1 });

    const last = await prisma.standing.findFirstOrThrow({
      where: { leagueId: LEAGUE_LOW, userId: "d" },
    });
    const target = await prisma.division.findUniqueOrThrow({
      where: { id: last.nextDivisionId! },
    });
    expect(target.rank).toBe(0);
  });

  it("archives the season and opens the next with the same ladder", async () => {
    await playOut();
    const { nextSeasonId } = await seasons.closeSeason(SEASON, {
      promote: 1,
      relegate: 1,
    });

    expect((await prisma.season.findUniqueOrThrow({ where: { id: SEASON } })).status).toBe(
      "CLOSED",
    );
    const next = await prisma.season.findUniqueOrThrow({
      where: { id: nextSeasonId },
      include: { divisions: true },
    });
    expect(next.status).toBe("ACTIVE");
    expect(next.previousSeasonId).toBe(SEASON);
    expect(next.divisions.map((d) => d.rank).sort()).toEqual([0, 1]);
  });

  it("ends every league in the closed season", async () => {
    await playOut();
    await seasons.closeSeason(SEASON, { promote: 1, relegate: 1 });
    const league = await prisma.league.findUniqueOrThrow({ where: { id: LEAGUE_LOW } });
    expect(league.status).toBe("ENDED");
  });

  it("is idempotent — re-running changes nothing and opens no second season", async () => {
    await playOut();
    const first = await seasons.closeSeason(SEASON, { promote: 1, relegate: 1 });
    const second = await seasons.closeSeason(SEASON, { promote: 1, relegate: 1 });

    expect(second.nextSeasonId).toBe(first.nextSeasonId);
    expect(await prisma.season.count()).toBe(2);
    expect(await prisma.standing.count()).toBe(4);
  });

  it("excludes a voided match from the final table", async () => {
    await playOut();
    const anyMatch = await prisma.match.findFirstOrThrow({
      where: { homeUserId: "a" },
    });
    await prisma.match.update({
      where: { id: anyMatch.id },
      data: { status: "VOID", homeScore: null, awayScore: null },
    });

    await seasons.closeSeason(SEASON, { promote: 1, relegate: 1 });
    const winner = await prisma.standing.findFirstOrThrow({
      where: { leagueId: LEAGUE_LOW, userId: "a" },
    });
    expect(winner.played).toBe(2); // one of A's three was annulled
  });

  it("refuses to close a season that does not exist", async () => {
    await expect(seasons.closeSeason("nope", { promote: 1, relegate: 1 })).rejects.toThrow();
  });
});

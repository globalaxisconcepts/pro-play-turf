import type { PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appRole } from "@/lib/roles";
import { LeagueService } from "@/server/leagues/league-service";
import { groupByDivision } from "@/server/leagues/select";
import { createTestDb, type TestDb } from "../helpers/pglite";

/**
 * Real SQL coverage for the league reads the browse depends on, plus the role
 * lookup that lets the seeded admin reach /admin offline. Runs on PGlite —
 * embedded Postgres, no server (see tests/helpers/pglite.ts).
 */
describe("LeagueService (PGlite integration)", () => {
  let db: TestDb;
  let prisma: PrismaClient;
  let leagues: LeagueService;

  beforeEach(async () => {
    db = await createTestDb();
    prisma = db.prisma;
    leagues = new LeagueService(prisma);
  });

  afterEach(async () => {
    await db.close();
  });

  /** Two divisions in one ACTIVE season, three leagues between them. */
  async function seedStructure() {
    const seasonId = await leagues.createSeason({
      name: "Season 2",
      status: "ACTIVE",
      endsAt: new Date("2026-12-01T00:00:00Z"),
    });
    const amateur = await leagues.createDivision({
      seasonId,
      name: "Amateur Open",
      tier: "AMATEUR",
      rank: 0,
    });
    const elite = await leagues.createDivision({
      seasonId,
      name: "Elite Premier",
      tier: "ELITE",
      rank: 3,
    });
    const freeId = await leagues.createLeague({
      divisionId: amateur,
      name: "Amateur Open A",
      buyInCents: 0n,
      rakeBps: 0,
      capacity: 16,
    });
    const premierId = await leagues.createLeague({
      divisionId: elite,
      name: "Premier A",
      buyInCents: 5_000n,
      rakeBps: 500,
      capacity: 16,
    });
    await leagues.createLeague({
      divisionId: elite,
      name: "Premier B",
      buyInCents: 5_000n,
      rakeBps: 500,
      capacity: 16,
      status: "LIVE",
    });
    return { seasonId, amateur, elite, freeId, premierId };
  }

  it("lists the current season's leagues with their division context", async () => {
    const { amateur, elite } = await seedStructure();

    const { season, rows } = await leagues.listCurrentSeasonLeagues();
    expect(season?.name).toBe("Season 2");
    expect(rows).toHaveLength(3);

    const premier = rows.find((r) => r.name === "Premier A");
    expect(premier).toMatchObject({
      divisionId: elite,
      divisionName: "Elite Premier",
      tier: "ELITE",
      divisionRank: 3,
      buyInCents: 5_000n,
      capacity: 16,
    });
    expect(rows.filter((r) => r.divisionId === amateur)).toHaveLength(1);
  });

  it("feeds groupByDivision — every league lands in exactly one division", async () => {
    const { amateur, elite } = await seedStructure();

    const { rows } = await leagues.listCurrentSeasonLeagues();
    const groups = groupByDivision(rows);

    expect(groups).toHaveLength(2);
    expect(new Set(groups.map((g) => g.divisionId))).toEqual(
      new Set([amateur, elite]),
    );
    expect(groups.flatMap((g) => g.rows)).toHaveLength(rows.length);
    expect(groups.find((g) => g.divisionId === elite)?.rows).toHaveLength(2);
  });

  it("prefers the ACTIVE season over a newer upcoming one", async () => {
    await seedStructure();
    await leagues.createSeason({ name: "Season 3", status: "UPCOMING" });

    const { season } = await leagues.listCurrentSeasonLeagues();
    expect(season?.name).toBe("Season 2");
  });

  it("returns null for an unknown league id", async () => {
    await seedStructure();
    expect(await leagues.getLeague("does-not-exist")).toBeNull();
  });

  it("getLeague returns the same shape the detail page renders", async () => {
    const { premierId, elite } = await seedStructure();

    expect(await leagues.getLeague(premierId)).toMatchObject({
      id: premierId,
      name: "Premier A",
      divisionId: elite,
      tier: "ELITE",
      buyInCents: 5_000n,
      status: "OPEN",
    });
  });

  it("reads an ADMIN role back off the User row (the offline /admin path)", async () => {
    await prisma.user.create({
      data: {
        id: "demo-admin-user",
        email: "admin@proplayturf.com",
        displayName: "Admin",
        role: "ADMIN",
      },
    });
    await prisma.user.create({
      data: {
        id: "demo-player-user",
        email: "pro@proplayturf.com",
        displayName: "Demo Pro",
        role: "PLAYER",
      },
    });

    const admin = await prisma.user.findUnique({
      where: { id: "demo-admin-user" },
      select: { role: true },
    });
    const player = await prisma.user.findUnique({
      where: { id: "demo-player-user" },
      select: { role: true },
    });

    expect(appRole(admin?.role ?? "PLAYER")).toBe("ADMIN");
    expect(appRole(player?.role ?? "PLAYER")).toBe("PLAYER");
    // A SYSTEM row must never be mistaken for an app role.
    expect(appRole("SYSTEM")).toBe("PLAYER");
  });
});

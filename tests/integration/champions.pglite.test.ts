import { Bucket, type PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { InProcessWalletLock } from "@/lib/lock/in-process-lock";
import { LedgerService } from "@/server/ledger/ledger-service";
import { SYSTEM_USER_ID, SYSTEM_WALLET_ID } from "@/server/ledger/system";
import { JoinService } from "@/server/leagues/join-service";
import { PrizeService } from "@/server/leagues/prize-service";
import { BracketService } from "@/server/matches/bracket-service";
import { MatchService } from "@/server/matches/match-service";
import { createTestDb, type TestDb } from "../helpers/pglite";

describe("Champions League knockout (PGlite integration)", () => {
  let db: TestDb;
  let prisma: PrismaClient;
  let ledger: LedgerService;
  let matches: MatchService;
  let bracket: BracketService;
  let prizes: PrizeService;
  let join: JoinService;

  const CL = "lg-champions";
  const BUY_IN = 10_000n;

  beforeEach(async () => {
    db = await createTestDb();
    prisma = db.prisma;
    ledger = new LedgerService(prisma, new InProcessWalletLock());
    matches = new MatchService(prisma);
    bracket = new BracketService(prisma);
    prizes = new PrizeService(prisma, ledger);
    join = new JoinService(prisma, ledger);

    await prisma.user.create({
      data: { id: SYSTEM_USER_ID, email: "s@t.test", displayName: "House", role: "SYSTEM" },
    });
    await prisma.wallet.create({
      data: { id: SYSTEM_WALLET_ID, userId: SYSTEM_USER_ID },
    });
    await prisma.season.create({ data: { id: "s1", name: "S1", status: "ACTIVE" } });
    await prisma.division.create({
      data: { id: "d-ch", seasonId: "s1", name: "Champions", tier: "CHAMPIONS", rank: 4 },
    });
    await prisma.league.create({
      data: {
        id: CL,
        divisionId: "d-ch",
        name: "Champions Invitational",
        buyInCents: BUY_IN,
        rakeBps: 0,
        capacity: 8,
      },
    });

    for (const id of ["s1p", "s2p", "s3p", "s4p"]) {
      await prisma.user.create({
        data: { id, email: `${id}@t.test`, displayName: id },
      });
      const w = await prisma.wallet.create({ data: { id: `w-${id}`, userId: id } });
      await ledger.post({
        txnId: `fund-${id}`,
        reason: "ADMIN_GRANT",
        lines: [
          { walletId: w.id, bucket: Bucket.AVAILABLE, amountCents: 50_000n },
          { walletId: SYSTEM_WALLET_ID, bucket: Bucket.HOUSE, amountCents: -50_000n },
        ],
      });
      await join.joinLeague({ leagueId: CL, userId: id });
    }
  });

  afterEach(async () => {
    await db.close();
  });

  const SEEDS = ["s1p", "s2p", "s3p", "s4p"];

  async function play(round: number, results: Array<[string, number, number]>) {
    const ties = await prisma.match.findMany({ where: { leagueId: CL, round } });
    for (const [homeId, home, away] of results) {
      const tie = ties.find((t) => t.homeUserId === homeId);
      if (!tie) throw new Error(`no round ${round} tie for ${homeId}`);
      for (const uid of [tie.homeUserId, tie.awayUserId]) {
        await matches.submitResult({
          matchId: tie.id,
          userId: uid,
          homeScore: home,
          awayScore: away,
        });
      }
    }
  }

  it("seeds the draw 1v4 and 2v3", async () => {
    await bracket.generateBracket(CL, SEEDS);
    const ties = await prisma.match.findMany({
      where: { leagueId: CL },
      orderBy: { createdAt: "asc" },
    });
    expect(ties).toHaveLength(2);
    expect([ties[0].homeUserId, ties[0].awayUserId]).toEqual(["s1p", "s4p"]);
    expect([ties[1].homeUserId, ties[1].awayUserId]).toEqual(["s2p", "s3p"]);
  });

  it("holds the round open until every tie is verified", async () => {
    await bracket.generateBracket(CL, SEEDS);
    await play(1, [["s1p", 2, 0]]); // only one semi decided

    expect((await bracket.advance(CL)).created).toBe(0);
    expect(await prisma.match.count({ where: { leagueId: CL } })).toBe(2);
  });

  it("advances the winners into the final", async () => {
    await bracket.generateBracket(CL, SEEDS);
    await play(1, [
      ["s1p", 2, 0],
      ["s2p", 0, 1],
    ]);

    const { created, round } = await bracket.advance(CL);
    expect({ created, round }).toEqual({ created: 1, round: 2 });

    const final = await prisma.match.findFirstOrThrow({
      where: { leagueId: CL, round: 2 },
    });
    expect([final.homeUserId, final.awayUserId]).toEqual(["s1p", "s3p"]);
  });

  it("does not advance a drawn tie — a knockout has no draws", async () => {
    await bracket.generateBracket(CL, SEEDS);
    await play(1, [
      ["s1p", 1, 1],
      ["s2p", 0, 1],
    ]);
    expect((await bracket.advance(CL)).created).toBe(0);
  });

  it("un-advances when a reviewer voids a tie", async () => {
    await bracket.generateBracket(CL, SEEDS);
    await play(1, [
      ["s1p", 2, 0],
      ["s2p", 0, 1],
    ]);
    const semi = await prisma.match.findFirstOrThrow({
      where: { leagueId: CL, round: 1, homeUserId: "s1p" },
    });
    await prisma.match.update({
      where: { id: semi.id },
      data: { status: "VOID", homeScore: null, awayScore: null },
    });

    expect((await bracket.advance(CL)).created).toBe(0);
  });

  it("refuses to redraw an existing bracket", async () => {
    await bracket.generateBracket(CL, SEEDS);
    await expect(bracket.generateBracket(CL, SEEDS)).rejects.toThrow();
  });

  it("has no placements until the final is verified", async () => {
    await bracket.generateBracket(CL, SEEDS);
    expect(await bracket.placements(CL)).toEqual([]);

    await play(1, [
      ["s1p", 2, 0],
      ["s2p", 0, 1],
    ]);
    await bracket.advance(CL);
    expect(await bracket.placements(CL)).toEqual([]);
  });

  it("crowns the champion and pays 70/20/10 from the real pool", async () => {
    await bracket.generateBracket(CL, SEEDS);
    await play(1, [
      ["s1p", 3, 0], // s1p beats s4p, +3
      ["s2p", 0, 1], // s3p beats s2p, s2p -1
    ]);
    await bracket.advance(CL);
    await play(2, [["s1p", 2, 1]]); // s1p champion, s3p runner-up

    const placings = await bracket.placements(CL);
    expect(placings.slice(0, 2)).toEqual(["s1p", "s3p"]);
    // Third is the beaten semi-finalist with the better goal difference:
    // s2p lost 0-1 (-1) beats s4p who lost 0-3 (-3).
    expect(placings[2]).toBe("s2p");

    const result = await prizes.settleLeague(CL, placings);
    // Pool 4 x 10000 = 40000, no rake -> 70/20/10
    expect(result.poolCents).toBe(40_000n);
    expect(result.paid.map((p) => p.amountCents)).toEqual([
      28_000n,
      8_000n,
      4_000n,
    ]);
    expect(result.paid[0].userId).toBe("s1p");

    const champ = await prisma.wallet.findUniqueOrThrow({
      where: { userId: "s1p" },
      select: { availableCents: true, escrowCents: true },
    });
    expect(champ).toEqual({
      availableCents: 40_000n + 28_000n,
      escrowCents: 0n,
    });
  });

  it("never pays someone who wasn't in the tournament", async () => {
    await bracket.generateBracket(CL, SEEDS);
    await play(1, [
      ["s1p", 1, 0],
      ["s2p", 1, 0],
    ]);
    await bracket.advance(CL);
    await play(2, [["s1p", 1, 0]]);

    const result = await prizes.settleLeague(CL, ["ghost", "s1p", "s2p"]);
    expect(result.paid.every((p) => p.userId !== "ghost")).toBe(true);
  });

  it("picks qualifiers from the Elite standings", async () => {
    await prisma.division.create({
      data: { id: "d-el", seasonId: "s1", name: "Elite", tier: "ELITE", rank: 3 },
    });
    await prisma.league.create({
      data: { id: "lg-el", divisionId: "d-el", name: "Premier A" },
    });
    await prisma.standing.createMany({
      data: SEEDS.map((userId, i) => ({
        leagueId: "lg-el",
        userId,
        position: i + 1,
        played: 3,
        won: 3 - i,
        drawn: 0,
        lost: i,
        goalsFor: 9 - i,
        goalsAgainst: i,
        points: (3 - i) * 3,
      })),
    });

    expect(await bracket.qualifiers("s1", 4)).toEqual(SEEDS);
  });
});

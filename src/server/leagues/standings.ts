export interface StandingsPlayer {
  userId: string;
  displayName: string;
}

export interface StandingsMatch {
  homeUserId: string;
  awayUserId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
}

export interface StandingRow {
  position: number;
  userId: string;
  displayName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface ZoneConfig {
  promote: number;
  relegate: number;
}

const WIN_POINTS = 3;
const DRAW_POINTS = 1;

/**
 * The league table, derived from VERIFIED matches only.
 *
 * Derived rather than incrementally maintained on purpose: a reviewer voiding a
 * match (Slice 6) removes its effect automatically, with no reversal step to
 * get wrong. An unverified match has no score by design, so it cannot move the
 * table — which is exactly the guarantee the tribunal depends on.
 *
 * Ordering: points, then goal difference, then goals scored, then name. The
 * final key means the order is never arbitrary, so two renders of the same data
 * always agree.
 */
export function computeStandings(
  players: StandingsPlayer[],
  matches: StandingsMatch[],
): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const p of players) {
    rows.set(p.userId, {
      position: 0,
      userId: p.userId,
      displayName: p.displayName,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
  }

  for (const match of matches) {
    if (match.status !== "VERIFIED") continue;
    if (match.homeScore == null || match.awayScore == null) continue;

    const home = rows.get(match.homeUserId);
    const away = rows.get(match.awayUserId);
    if (!home || !away) continue; // a player who left the league

    record(home, match.homeScore, match.awayScore);
    record(away, match.awayScore, match.homeScore);
  }

  return [...rows.values()]
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor ||
        a.displayName.localeCompare(b.displayName),
    )
    .map((row, i) => ({ ...row, position: i + 1 }));
}

function record(row: StandingRow, scored: number, conceded: number): void {
  row.played += 1;
  row.goalsFor += scored;
  row.goalsAgainst += conceded;
  row.goalDifference = row.goalsFor - row.goalsAgainst;
  if (scored > conceded) {
    row.won += 1;
    row.points += WIN_POINTS;
  } else if (scored === conceded) {
    row.drawn += 1;
    row.points += DRAW_POINTS;
  } else {
    row.lost += 1;
  }
}

/**
 * Who goes up and who goes down. The zones are clamped so they can never
 * overlap — in a league too small to hold both, promotion wins and relegation
 * takes what's left, so no player is told they were both promoted and relegated.
 */
export function zonesFor(
  rows: StandingRow[],
  config: ZoneConfig,
): { promoted: string[]; relegated: string[] } {
  const size = rows.length;
  const promote = clamp(config.promote, size);
  const relegate = clamp(config.relegate, size - promote);

  return {
    promoted: rows.slice(0, promote).map((r) => r.userId),
    relegated: relegate > 0 ? rows.slice(size - relegate).map((r) => r.userId) : [],
  };
}

function clamp(n: number, max: number): number {
  return Math.max(0, Math.min(Math.floor(n), Math.max(0, max)));
}

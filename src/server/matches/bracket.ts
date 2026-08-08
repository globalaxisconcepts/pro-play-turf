export interface BracketPair {
  round: number;
  homeUserId: string;
  awayUserId: string;
}

export class BracketSizeError extends Error {
  constructor(size: number) {
    super(
      `A knockout bracket needs a power of two (2, 4, 8, 16…); got ${size}.`,
    );
    this.name = "BracketSizeError";
  }
}

function isPowerOfTwo(n: number): boolean {
  return n >= 2 && (n & (n - 1)) === 0;
}

/**
 * Round one of a knockout, seeded so the strongest qualifier meets the weakest:
 * 1v4 and 2v3 in a four-player draw, 1v8 / 2v7 / 3v6 / 4v5 in an eight.
 *
 * `seedsInOrder` must be ranked best-first. A power-of-two field is required
 * rather than padded with byes — a bye in a prestige knockout would hand
 * someone a free round, which is worse than refusing to draw the bracket.
 */
export function seedBracket(seedsInOrder: string[]): BracketPair[] {
  const size = seedsInOrder.length;
  if (!isPowerOfTwo(size)) throw new BracketSizeError(size);

  const pairs: BracketPair[] = [];
  for (let i = 0; i < size / 2; i++) {
    pairs.push({
      round: 1,
      homeUserId: seedsInOrder[i],
      awayUserId: seedsInOrder[size - 1 - i],
    });
  }
  return pairs;
}

/**
 * Pair the winners of a completed round, preserving bracket order so the draw
 * stays a tree: winners of the first two ties meet, and so on.
 */
export function pairWinners(winners: string[], round: number): BracketPair[] {
  if (winners.length < 2) return [];
  if (!isPowerOfTwo(winners.length)) throw new BracketSizeError(winners.length);

  const pairs: BracketPair[] = [];
  for (let i = 0; i < winners.length; i += 2) {
    pairs.push({
      round,
      homeUserId: winners[i],
      awayUserId: winners[i + 1],
    });
  }
  return pairs;
}

export interface DecidedMatch {
  homeUserId: string;
  awayUserId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
}

/**
 * Who went through. Only a VERIFIED match with a decisive score advances
 * anybody — a draw in a knockout has no winner, so it is treated as unresolved
 * and the round simply doesn't progress until it is settled.
 */
export function winnerOf(match: DecidedMatch): string | null {
  if (match.status !== "VERIFIED") return null;
  if (match.homeScore == null || match.awayScore == null) return null;
  if (match.homeScore === match.awayScore) return null;
  return match.homeScore > match.awayScore
    ? match.homeUserId
    : match.awayUserId;
}

/** The beaten player, for third-place reckoning. */
export function loserOf(match: DecidedMatch): string | null {
  const winner = winnerOf(match);
  if (!winner) return null;
  return winner === match.homeUserId ? match.awayUserId : match.homeUserId;
}

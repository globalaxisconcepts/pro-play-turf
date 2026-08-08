export interface ScoreboardMatch {
  id: string;
  status: string;
}

export interface ScoreBuckets<T extends ScoreboardMatch> {
  live: T[];
  upcoming: T[];
  completed: T[];
}

/**
 * Sort matches into the three segments of the public scoreboard.
 *
 * A half-reported match (AWAITING) reads as live: it has been played but has no
 * agreed result yet, so showing it under "completed" would advertise a score
 * that isn't settled.
 *
 * Contested and annulled matches — UNDER_REVIEW, DISPUTED, VOID — appear in no
 * public bucket at all. Broadcasting a result that a human is still weighing,
 * or one that has been thrown out, would be worse than showing nothing.
 */
export function bucketMatches<T extends ScoreboardMatch>(
  matches: T[],
): ScoreBuckets<T> {
  const buckets: ScoreBuckets<T> = { live: [], upcoming: [], completed: [] };
  for (const match of matches) {
    if (match.status === "LIVE" || match.status === "AWAITING") {
      buckets.live.push(match);
    } else if (match.status === "SCHEDULED") {
      buckets.upcoming.push(match);
    } else if (match.status === "VERIFIED") {
      buckets.completed.push(match);
    }
  }
  return buckets;
}

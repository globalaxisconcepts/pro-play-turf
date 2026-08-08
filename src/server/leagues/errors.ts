/** No such league. */
export class LeagueNotFoundError extends Error {
  constructor(leagueId: string) {
    super(`League ${leagueId} not found.`);
    this.name = "LeagueNotFoundError";
  }
}

/** The player already holds an entry in this league. */
export class AlreadyJoinedError extends Error {
  constructor(leagueId: string) {
    super(`Already entered league ${leagueId}.`);
    this.name = "AlreadyJoinedError";
  }
}

/** Every seat is taken. */
export class LeagueFullError extends Error {
  constructor(leagueId: string) {
    super(`League ${leagueId} is full.`);
    this.name = "LeagueFullError";
  }
}

/** The league is no longer accepting entries (LIVE or ENDED). */
export class LeagueClosedError extends Error {
  constructor(leagueId: string) {
    super(`League ${leagueId} is not accepting entries.`);
    this.name = "LeagueClosedError";
  }
}

/** No active entry to act on. */
export class NotEnteredError extends Error {
  constructor(leagueId: string) {
    super(`No active entry in league ${leagueId}.`);
    this.name = "NotEnteredError";
  }
}

/** Entries are only refundable before the league starts. */
export class RefundNotAllowedError extends Error {
  constructor(leagueId: string) {
    super(`League ${leagueId} has started — entries are no longer refundable.`);
    this.name = "RefundNotAllowedError";
  }
}

/** The player has no wallet — provisioning never completed. */
export class NoWalletError extends Error {
  constructor(userId: string) {
    super(`User ${userId} has no wallet.`);
    this.name = "NoWalletError";
  }
}

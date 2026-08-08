/** No such match. */
export class MatchNotFoundError extends Error {
  constructor(matchId: string) {
    super(`Match ${matchId} not found.`);
    this.name = "MatchNotFoundError";
  }
}

/** The league already has a schedule — regenerating would erase played matches. */
export class FixturesExistError extends Error {
  constructor(leagueId: string) {
    super(`League ${leagueId} already has fixtures.`);
    this.name = "FixturesExistError";
  }
}

/** Fewer than two players hold a seat, so there is nothing to schedule. */
export class NotEnoughEntrantsError extends Error {
  constructor(leagueId: string) {
    super(`League ${leagueId} needs at least two entrants to schedule.`);
    this.name = "NotEnoughEntrantsError";
  }
}

/** Only the two players in a match may report it. */
export class NotAPlayerError extends Error {
  constructor(matchId: string) {
    super(`You are not a player in match ${matchId}.`);
    this.name = "NotAPlayerError";
  }
}

/** Reports are evidence — a player gets exactly one. */
export class AlreadySubmittedError extends Error {
  constructor(matchId: string) {
    super(`You have already reported match ${matchId}.`);
    this.name = "AlreadySubmittedError";
  }
}

/** The match is settled or annulled and no longer accepts reports. */
export class MatchClosedError extends Error {
  constructor(matchId: string) {
    super(`Match ${matchId} is no longer accepting reports.`);
    this.name = "MatchClosedError";
  }
}

/** Screenshot upload needs blob storage, which isn't provisioned yet. */
export class ProofUploadUnavailableError extends Error {
  constructor() {
    super("Screenshot upload isn't available yet — paste a stream or VOD link instead.");
    this.name = "ProofUploadUnavailableError";
  }
}

export interface SubmissionView {
  userId: string;
  homeScore: number;
  awayScore: number;
}

export interface ValidationContext {
  submissions: SubmissionView[];
  /** Set when something upstream distrusts this match (anti-cheat, a report). */
  flagged?: boolean;
}

export type ValidationOutcome =
  | { kind: "VERIFIED"; homeScore: number; awayScore: number }
  | { kind: "UNDER_REVIEW"; reason: string }
  /** Not enough evidence to rule yet — wait for the other player. */
  | { kind: "PENDING" };

/**
 * One step in the adjudication chain. Returns an outcome to rule, or null to
 * pass the decision to the next validator.
 *
 * The chain exists so future automated checks — a stream-AI validator, or EA
 * telemetry if one ever appears — can slot in ahead of human review without
 * touching match code. Per the golden rules, no validator may assume an EA API
 * exists: evidence plus adjudication is the only source of truth.
 */
export interface ResultValidator {
  readonly name: string;
  validate(ctx: ValidationContext): ValidationOutcome | null;
}

/** Two independent reports that agree are the result. Nothing else verifies. */
export class AgreementValidator implements ResultValidator {
  readonly name = "agreement";

  validate(ctx: ValidationContext): ValidationOutcome | null {
    if (ctx.flagged) return null; // a flag overrides agreement
    if (ctx.submissions.length < 2) return { kind: "PENDING" };

    const [first, ...rest] = ctx.submissions;
    const unanimous = rest.every(
      (s) => s.homeScore === first.homeScore && s.awayScore === first.awayScore,
    );
    if (!unanimous) return null; // let a human decide

    return {
      kind: "VERIFIED",
      homeScore: first.homeScore,
      awayScore: first.awayScore,
    };
  }
}

/** Terminal fallback: anything unresolved becomes a human's problem. */
export class HumanReviewValidator implements ResultValidator {
  readonly name = "human-review";

  validate(ctx: ValidationContext): ValidationOutcome {
    return {
      kind: "UNDER_REVIEW",
      reason: ctx.flagged
        ? "Match was flagged for review."
        : "Players reported different scores.",
    };
  }
}

/**
 * Order matters — the first validator to rule wins. Future automated checks go
 * between agreement and human review.
 */
export const DEFAULT_VALIDATORS: ResultValidator[] = [
  new AgreementValidator(),
  // new StreamAiValidator(),      // later
  // new EaTelemetryValidator(),   // only if EA ever ships an API
  new HumanReviewValidator(),
];

export function runValidators(
  validators: ResultValidator[],
  ctx: ValidationContext,
): ValidationOutcome {
  for (const validator of validators) {
    const outcome = validator.validate(ctx);
    if (outcome) return outcome;
  }
  // An empty or fully-abstaining chain must never silently verify a match.
  return { kind: "UNDER_REVIEW", reason: "No validator could rule." };
}

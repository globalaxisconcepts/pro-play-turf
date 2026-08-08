import { describe, expect, it } from "vitest";
import {
  AgreementValidator,
  HumanReviewValidator,
  runValidators,
  DEFAULT_VALIDATORS,
} from "@/server/matches/validation";

const sub = (userId: string, homeScore: number, awayScore: number) => ({
  userId,
  homeScore,
  awayScore,
});

describe("AgreementValidator", () => {
  const v = new AgreementValidator();

  it("verifies when both players report the same score", () => {
    expect(v.validate({ submissions: [sub("a", 3, 1), sub("b", 3, 1)] })).toEqual({
      kind: "VERIFIED",
      homeScore: 3,
      awayScore: 1,
    });
  });

  it("holds when only one player has reported", () => {
    expect(v.validate({ submissions: [sub("a", 3, 1)] })).toEqual({
      kind: "PENDING",
    });
  });

  it("holds when nobody has reported", () => {
    expect(v.validate({ submissions: [] })).toEqual({ kind: "PENDING" });
  });

  it("declines to rule when the reports disagree", () => {
    expect(v.validate({ submissions: [sub("a", 3, 1), sub("b", 2, 2)] })).toBeNull();
  });

  it("declines to rule on a reversed scoreline — 3-1 is not 1-3", () => {
    expect(v.validate({ submissions: [sub("a", 3, 1), sub("b", 1, 3)] })).toBeNull();
  });

  it("declines to rule on a flagged match even when the scores agree", () => {
    expect(
      v.validate({ submissions: [sub("a", 3, 1), sub("b", 3, 1)], flagged: true }),
    ).toBeNull();
  });
});

describe("HumanReviewValidator", () => {
  it("always routes to review — it is the terminal fallback", () => {
    const outcome = new HumanReviewValidator().validate({
      submissions: [sub("a", 3, 1), sub("b", 2, 2)],
    });
    expect(outcome?.kind).toBe("UNDER_REVIEW");
  });
});

describe("runValidators", () => {
  it("verifies agreeing reports without reaching human review", () => {
    expect(
      runValidators(DEFAULT_VALIDATORS, {
        submissions: [sub("a", 2, 0), sub("b", 2, 0)],
      }),
    ).toEqual({ kind: "VERIFIED", homeScore: 2, awayScore: 0 });
  });

  it("falls through to human review when reports disagree", () => {
    const outcome = runValidators(DEFAULT_VALIDATORS, {
      submissions: [sub("a", 2, 0), sub("b", 0, 2)],
    });
    expect(outcome.kind).toBe("UNDER_REVIEW");
  });

  it("stays pending until both players have reported", () => {
    expect(
      runValidators(DEFAULT_VALIDATORS, { submissions: [sub("a", 1, 1)] }),
    ).toEqual({ kind: "PENDING" });
  });

  it("uses the first validator that rules, in order", () => {
    const alwaysVoid = {
      name: "always",
      validate: () => ({ kind: "UNDER_REVIEW" as const, reason: "first" }),
    };
    const outcome = runValidators(
      [alwaysVoid, new AgreementValidator(), new HumanReviewValidator()],
      { submissions: [sub("a", 1, 0), sub("b", 1, 0)] },
    );
    expect(outcome).toMatchObject({ reason: "first" });
  });

  it("routes to review rather than crashing if no validator rules", () => {
    expect(runValidators([], { submissions: [] }).kind).toBe("UNDER_REVIEW");
  });
});

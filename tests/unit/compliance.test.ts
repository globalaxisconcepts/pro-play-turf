import { describe, expect, it } from "vitest";
import {
  ageInYears,
  checkCompliance,
  type ComplianceRecord,
  CURRENT_TERMS_VERSION,
} from "@/server/compliance/gate";

const NOW = new Date("2026-08-08T12:00:00Z");
const ok: ComplianceRecord = {
  dateOfBirth: new Date("2000-01-01T00:00:00Z"),
  termsAcceptedAt: new Date("2026-08-02T00:00:00Z"),
  termsVersion: CURRENT_TERMS_VERSION,
  restrictedAt: null,
  restrictedReason: null,
};
const gate = (over: Partial<ComplianceRecord> = {}) =>
  checkCompliance({ ...ok, ...over }, { minAgeYears: 18, now: NOW });

describe("ageInYears", () => {
  it("counts whole years", () => {
    expect(ageInYears(new Date("2000-08-08T00:00:00Z"), NOW)).toBe(26);
  });

  it("does not count a birthday that hasn't happened yet", () => {
    expect(ageInYears(new Date("2000-08-09T00:00:00Z"), NOW)).toBe(25);
  });

  it("counts a birthday earlier in the same month", () => {
    expect(ageInYears(new Date("2000-08-07T00:00:00Z"), NOW)).toBe(26);
  });

  it("handles a birthday later in the year", () => {
    expect(ageInYears(new Date("2000-12-31T00:00:00Z"), NOW)).toBe(25);
  });
});

describe("checkCompliance", () => {
  it("allows a verified, consenting, unrestricted account", () => {
    expect(gate()).toEqual({ allowed: true });
  });

  it("blocks an account with no record at all", () => {
    const result = checkCompliance(null, { minAgeYears: 18, now: NOW });
    expect(result).toMatchObject({ allowed: false, reason: "NO_DOB" });
  });

  it("blocks an account with no date of birth", () => {
    expect(gate({ dateOfBirth: null }).reason).toBe("NO_DOB");
  });

  it("blocks an underage account", () => {
    expect(gate({ dateOfBirth: new Date("2012-01-01T00:00:00Z") }).reason).toBe(
      "UNDERAGE",
    );
  });

  it("allows someone exactly at the minimum age", () => {
    expect(gate({ dateOfBirth: new Date("2008-08-08T00:00:00Z") }).allowed).toBe(
      true,
    );
  });

  it("blocks someone one day short of the minimum age", () => {
    expect(gate({ dateOfBirth: new Date("2008-08-09T00:00:00Z") }).reason).toBe(
      "UNDERAGE",
    );
  });

  it("blocks an account that never accepted the terms", () => {
    expect(gate({ termsAcceptedAt: null }).reason).toBe("TERMS_NOT_ACCEPTED");
  });

  it("re-prompts when the terms have been revised since acceptance", () => {
    expect(gate({ termsVersion: "2020-01-01" }).reason).toBe("TERMS_OUTDATED");
  });

  it("blocks a restricted account before anything else", () => {
    // Restricted AND underage AND no terms — must report the restriction.
    const result = gate({
      restrictedAt: NOW,
      restrictedReason: "Suspected result-fixing",
      dateOfBirth: new Date("2015-01-01T00:00:00Z"),
      termsAcceptedAt: null,
    });
    expect(result.reason).toBe("RESTRICTED");
    expect(result.message).toContain("Suspected result-fixing");
  });

  it("always explains itself so the UI never has to guess", () => {
    for (const over of [
      { dateOfBirth: null },
      { dateOfBirth: new Date("2015-01-01T00:00:00Z") },
      { termsAcceptedAt: null },
      { termsVersion: "old" },
      { restrictedAt: NOW },
    ]) {
      const result = gate(over);
      expect(`${result.reason}:${Boolean(result.message)}`).toBe(
        `${result.reason}:true`,
      );
    }
  });

  it("respects a different minimum age", () => {
    const teen: ComplianceRecord = {
      ...ok,
      dateOfBirth: new Date("2010-01-01T00:00:00Z"),
    };
    expect(checkCompliance(teen, { minAgeYears: 16, now: NOW }).allowed).toBe(true);
    expect(checkCompliance(teen, { minAgeYears: 18, now: NOW }).allowed).toBe(false);
  });
});

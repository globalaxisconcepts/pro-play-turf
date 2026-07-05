import { describe, expect, it } from "vitest";
import {
  centsFromString,
  centsToString,
  formatCents,
  parseCents,
  sumCents,
  sumZero,
} from "@/lib/money";

describe("parseCents", () => {
  it("parses plain and decimal dollar strings", () => {
    expect(parseCents("25")).toBe(2500n);
    expect(parseCents("10.5")).toBe(1050n);
    expect(parseCents("0.01")).toBe(1n);
    expect(parseCents("1234.56")).toBe(123456n);
  });

  it("strips currency symbols and thousands separators", () => {
    expect(parseCents("$1,234.50")).toBe(123450n);
    expect(parseCents("  $99.99 ")).toBe(9999n);
  });

  it("accepts numbers and signs", () => {
    expect(parseCents(49.99)).toBe(4999n);
    expect(parseCents("-5.00")).toBe(-500n);
    expect(parseCents("+2.50")).toBe(250n);
  });

  it("rounds half-up at the third decimal", () => {
    expect(parseCents("1.005")).toBe(101n);
    expect(parseCents("1.004")).toBe(100n);
    expect(parseCents("0.999")).toBe(100n);
  });

  it("throws on non-numeric input", () => {
    expect(() => parseCents("abc")).toThrow();
    expect(() => parseCents("")).toThrow();
    expect(() => parseCents("$")).toThrow();
  });
});

describe("formatCents", () => {
  it("formats with grouping and two decimals", () => {
    expect(formatCents(0n)).toBe("$0.00");
    expect(formatCents(2500n)).toBe("$25.00");
    expect(formatCents(123450n)).toBe("$1,234.50");
    expect(formatCents(1n)).toBe("$0.01");
  });

  it("handles negatives and explicit sign", () => {
    expect(formatCents(-500n)).toBe("-$5.00");
    expect(formatCents(420n, { sign: true })).toBe("+$4.20");
    expect(formatCents(-420n, { sign: true })).toBe("-$4.20");
  });
});

describe("round-trip", () => {
  it("parse → format → parse is stable", () => {
    for (const input of ["0", "0.01", "25", "10.50", "1234.56", "999999.99"]) {
      const cents = parseCents(input);
      expect(parseCents(formatCents(cents))).toBe(cents);
    }
  });

  it("string transport is lossless", () => {
    const cents = 987654321n;
    expect(centsFromString(centsToString(cents))).toBe(cents);
  });
});

describe("sumZero / sumCents", () => {
  it("detects balanced and unbalanced sets", () => {
    expect(sumZero([1000n, -600n, -400n])).toBe(true);
    expect(sumZero([1000n, -600n, -300n])).toBe(false);
    expect(sumZero([])).toBe(true);
    expect(sumCents([1000n, -600n, -400n])).toBe(0n);
  });
});

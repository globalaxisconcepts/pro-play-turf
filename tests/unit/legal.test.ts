import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CONTACT,
  formatPolicyDate,
  OPERATOR,
  PRIVACY_LAST_UPDATED,
  RULES_LAST_UPDATED,
  TERMS_LAST_UPDATED,
} from "@/lib/legal";
import { CURRENT_TERMS_VERSION } from "@/server/compliance/gate";

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), "utf8");

describe("policy dates", () => {
  it("shows the same version users actually consented to", () => {
    // If these drift, the gate re-prompts for a version the page never
    // published — which makes the consent record meaningless.
    expect(TERMS_LAST_UPDATED).toBe(CURRENT_TERMS_VERSION);
    expect(PRIVACY_LAST_UPDATED).toBe(CURRENT_TERMS_VERSION);
    expect(RULES_LAST_UPDATED).toBe(CURRENT_TERMS_VERSION);
  });

  it("renders a date a person can read", () => {
    expect(formatPolicyDate("2026-08-01")).toBe("1 August 2026");
  });

  it("uses an ISO date so the <time> element is valid", () => {
    expect(CURRENT_TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("operator details", () => {
  it("marks unregistered company details as fill-ins rather than inventing them", () => {
    // Naming a company number that doesn't exist would make these documents
    // fabricated corporate records instead of drafts.
    for (const value of [
      OPERATOR.legalName,
      OPERATOR.companyNumber,
      OPERATOR.registeredAddress,
    ]) {
      expect(`${value} bracketed=${value.startsWith("[")}`).toBe(
        `${value} bracketed=true`,
      );
    }
  });

  it("names the brand plainly", () => {
    expect(OPERATOR.brand).toBe("Pro Play Turf");
  });
});

describe("the policy pages", () => {
  const terms = read("src/app/(marketing)/terms/page.tsx");
  const privacy = read("src/app/(marketing)/privacy/page.tsx");
  const responsible = read("src/app/(marketing)/responsible-play/page.tsx");
  const rules = read("src/app/(marketing)/rules/page.tsx");

  it("states plainly that balances have no cash value", () => {
    expect(terms).toContain("no cash value");
  });

  it("does not claim an EA/publisher data feed anywhere", () => {
    // Golden rule 5: no EA API fiction. Rules bind players; they can't be
    // fiction, and the marketing page's "API Validation" claim must not
    // propagate into a document people are held to.
    for (const [name, source] of [
      ["terms", terms],
      ["rules", rules],
    ] as const) {
      expect(`${name}:${/API Validation|AI Match Detection/.test(source)}`).toBe(
        `${name}:false`,
      );
    }
    expect(rules).toContain("no automated feed of match data");
  });

  it("tells the truth about tracking", () => {
    expect(privacy).toContain("no advertising pixels and no third-party");
    expect(privacy).toContain("__session");
  });

  it("does not promise erasure the schema cannot deliver", () => {
    expect(privacy).toContain("What we retain even after a deletion request");
    expect(privacy).toContain("append-only");
  });

  it("separates responsible-play tools that exist from ones that do not", () => {
    expect(responsible).toContain("Not yet built");
    expect(responsible).toContain("Available now");
  });

  it("gives a real contact route on every document", () => {
    // The pages render the shared CONTACT constants rather than hardcoding
    // addresses, so assert they reach for them — and that the constants are
    // real addresses.
    for (const [name, source] of [
      ["terms", terms],
      ["privacy", privacy],
      ["responsible-play", responsible],
      ["rules", rules],
    ] as const) {
      expect(`${name}:${source.includes("CONTACT.")}`).toBe(`${name}:true`);
    }
    for (const address of Object.values(CONTACT)) {
      expect(address).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/);
    }
  });
});

describe("consent links", () => {
  it("links every document the age gate asks users to accept", () => {
    const form = read(
      "src/app/(app)/onboarding/_components/AgeGateForm.tsx",
    );
    for (const href of ["/terms", "/rules", "/responsible-play"]) {
      expect(`${href} linked=${form.includes(`href="${href}"`)}`).toBe(
        `${href} linked=true`,
      );
    }
  });

  it("leaves no dead placeholder links in the footer's legal column", () => {
    const footer = read("src/components/shell/SiteFooter.tsx");
    const legal = footer.slice(footer.indexOf('heading: "Legal"'));
    expect(legal).not.toContain('href: "/#how"');
  });
});

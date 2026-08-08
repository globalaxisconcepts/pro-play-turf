import { describe, expect, it } from "vitest";
import { InProcessRateLimiter } from "@/lib/rate-limit/memory-limiter";
import { LIMITS } from "@/lib/rate-limit/types";

const rule = { limit: 3, windowMs: 50 };

describe("InProcessRateLimiter", () => {
  it("allows up to the limit", async () => {
    const limiter = new InProcessRateLimiter();
    for (let i = 0; i < 3; i++) {
      expect((await limiter.consume("k", rule)).allowed).toBe(true);
    }
  });

  it("blocks the request past the limit", async () => {
    const limiter = new InProcessRateLimiter();
    for (let i = 0; i < 3; i++) await limiter.consume("k", rule);
    expect((await limiter.consume("k", rule)).allowed).toBe(false);
  });

  it("counts each key separately", async () => {
    const limiter = new InProcessRateLimiter();
    for (let i = 0; i < 3; i++) await limiter.consume("user-a", rule);
    expect((await limiter.consume("user-b", rule)).allowed).toBe(true);
  });

  it("reports how many attempts remain", async () => {
    const limiter = new InProcessRateLimiter();
    expect((await limiter.consume("k", rule)).remaining).toBe(2);
    expect((await limiter.consume("k", rule)).remaining).toBe(1);
    expect((await limiter.consume("k", rule)).remaining).toBe(0);
  });

  it("lets the caller through again once the window passes", async () => {
    const limiter = new InProcessRateLimiter();
    for (let i = 0; i < 4; i++) await limiter.consume("k", rule);
    expect((await limiter.consume("k", rule)).allowed).toBe(false);

    await new Promise((r) => setTimeout(r, rule.windowMs + 10));
    expect((await limiter.consume("k", rule)).allowed).toBe(true);
  });

  it("always reports a positive reset time", async () => {
    const limiter = new InProcessRateLimiter();
    const result = await limiter.consume("k", rule);
    expect(result.resetMs).toBeGreaterThan(0);
    expect(result.resetMs).toBeLessThanOrEqual(rule.windowMs);
  });
});

describe("LIMITS", () => {
  it("defines a positive limit and window for every rule", () => {
    for (const [name, r] of Object.entries(LIMITS)) {
      expect(`${name}:${r.limit > 0 && r.windowMs > 0}`).toBe(`${name}:true`);
    }
  });
});

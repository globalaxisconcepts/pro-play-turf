import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = fileURLToPath(new URL("../../src", import.meta.url));
const LEDGER_DIR = join(SRC, "server", "ledger");
const LEDGER_SERVICE = join(LEDGER_DIR, "ledger-service.ts");

function sourceFiles(): string[] {
  return (readdirSync(SRC, { recursive: true }) as string[])
    .filter((f) => /\.tsx?$/.test(f))
    .map((f) => join(SRC, f));
}

const WALLET_UPDATE = /\.wallet\.update(Many)?\s*\(/;

describe("architecture guard: balances only mutate inside LedgerService", () => {
  it("no code outside src/server/ledger calls wallet.update", () => {
    const offenders = sourceFiles().filter(
      (file) =>
        !file.startsWith(LEDGER_DIR) && WALLET_UPDATE.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("LedgerService is where the balance mutation actually lives", () => {
    // Sanity: the guard is meaningful because the ledger really does mutate.
    expect(WALLET_UPDATE.test(readFileSync(LEDGER_SERVICE, "utf8"))).toBe(true);
  });
});

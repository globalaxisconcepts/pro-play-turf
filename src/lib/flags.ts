import { env } from "@/lib/env";

/**
 * Launch gates.
 *
 * Deliberately NOT in a `"use server"` module — those may only export async
 * functions, and these are plain predicates that both server actions and pages
 * need to read.
 */

/**
 * Test-credit deposits mint balance with no payment taken, so they are off
 * unless explicitly switched on. Without this gate, anyone who can reach the
 * site can grant themselves an unlimited balance. Slice 13 replaces the stub
 * with a real gateway; until then this flag is the only thing in the way.
 */
export function testCreditDepositsEnabled(): boolean {
  return env.ENABLE_TEST_CREDIT_DEPOSITS === "1";
}

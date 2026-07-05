import { inngest } from "@/lib/inngest";

/**
 * Trivial background job proving the Inngest wiring works end-to-end. Trigger
 * it by sending an `app/health.check` event (or via the Inngest dev server UI).
 * Real jobs — season close, standings recompute, stream polling, ledger
 * reconciliation, provider webhooks — land in later slices.
 */
export const healthCheck = inngest.createFunction(
  { id: "health-check" },
  { event: "app/health.check" },
  async ({ step }) => {
    const result = await step.run("ping", async () => ({ ok: true }));
    return result;
  },
);

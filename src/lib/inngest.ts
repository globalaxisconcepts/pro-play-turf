import { Inngest } from "inngest";

/**
 * Inngest client. Pure configuration — no connection is made on construction,
 * so this is safe to import during `next build`. Background jobs (season close,
 * standings recompute, stream polling, ledger reconciliation, real-provider
 * webhooks) register against this client in later slices.
 */
export const inngest = new Inngest({ id: "pro-play-turf" });

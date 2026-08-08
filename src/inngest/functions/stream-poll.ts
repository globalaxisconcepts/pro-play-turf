import { inngest } from "@/lib/inngest";
import { streamService } from "@/server/services";

/**
 * Refresh which linked channels are live.
 *
 * Runs on a short cron because "live" is only useful while it's true. A no-op
 * until a platform app is registered — the StreamProvider reports no statuses,
 * the job succeeds, and nothing changes. That is deliberate: a missing API key
 * should not turn into a failing job that pages someone.
 */
export const streamPoll = inngest.createFunction(
  { id: "stream-poll", retries: 1 },
  { cron: "*/2 * * * *" },
  async ({ step }) => step.run("refresh", () => streamService.refreshLiveStatus()),
);

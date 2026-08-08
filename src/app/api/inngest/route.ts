import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { healthCheck } from "@/inngest/functions/health";
import { seasonClose } from "@/inngest/functions/season-close";
import { nightlyReconcile } from "@/inngest/functions/reconcile";
import { streamPoll } from "@/inngest/functions/stream-poll";

// Inngest serve endpoint. Register future background functions here.
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [healthCheck, seasonClose, streamPoll, nightlyReconcile],
});

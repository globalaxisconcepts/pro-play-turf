import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { healthCheck } from "@/inngest/functions/health";

// Inngest serve endpoint. Register future background functions here.
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [healthCheck],
});

import { inngest } from "@/lib/inngest";
import { DEFAULT_ZONES } from "@/server/leagues/season-service";
import { seasonService } from "@/server/services";

/**
 * Close a season: freeze every league's final table, apply promotion and
 * relegation, archive it, and open the next.
 *
 * Triggered by a `season/close.requested` event rather than a cron — a season
 * ends when its fixtures are done, not on a calendar. `closeSeason` is
 * idempotent, so an Inngest retry or a duplicate event is harmless: a season
 * that is already CLOSED returns its existing successor instead of promoting
 * anyone twice.
 */
export const seasonClose = inngest.createFunction(
  { id: "season-close", retries: 3 },
  { event: "season/close.requested" },
  async ({ event, step }) => {
    const seasonId = String(event.data?.seasonId ?? "");
    if (!seasonId) throw new Error("season/close.requested needs a seasonId");

    const zones = {
      promote: Number(event.data?.promote ?? DEFAULT_ZONES.promote),
      relegate: Number(event.data?.relegate ?? DEFAULT_ZONES.relegate),
    };

    return step.run("close-season", () =>
      seasonService.closeSeason(seasonId, zones),
    );
  },
);

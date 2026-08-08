"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseCents } from "@/lib/money";
import { auth } from "@/server/auth";
import { leagueService, matchService, seasonService } from "@/server/services";

/** Server actions are directly invocable — re-check ADMIN on every one. */
async function requireAdmin(): Promise<void> {
  const { role } = await auth();
  if (role !== "ADMIN") throw new Error("Not authorized");
}

const seasonSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  status: z.enum(["UPCOMING", "ACTIVE", "CLOSED"]),
  endsAt: z.string().trim().optional(),
});

export async function createSeasonAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = seasonSchema.parse({
    name: formData.get("name"),
    status: formData.get("status"),
    endsAt: formData.get("endsAt") ?? undefined,
  });
  const endsAt = parsed.endsAt ? new Date(parsed.endsAt) : null;
  await leagueService.createSeason({
    name: parsed.name,
    status: parsed.status,
    endsAt: Number.isNaN(endsAt?.getTime() ?? NaN) ? null : endsAt,
  });
  revalidatePath("/admin/leagues");
  revalidatePath("/leagues");
}

const divisionSchema = z.object({
  seasonId: z.string().min(1),
  name: z.string().trim().min(1, "Name is required"),
  tier: z.enum(["AMATEUR", "INTERMEDIATE", "ADVANCED", "ELITE", "CHAMPIONS"]),
  rank: z.coerce.number().int().min(0),
});

export async function createDivisionAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = divisionSchema.parse({
    seasonId: formData.get("seasonId"),
    name: formData.get("name"),
    tier: formData.get("tier"),
    rank: formData.get("rank"),
  });
  await leagueService.createDivision(parsed);
  revalidatePath("/admin/leagues");
  revalidatePath("/leagues");
}

const leagueSchema = z.object({
  divisionId: z.string().min(1),
  name: z.string().trim().min(1, "Name is required"),
  buyIn: z.string().trim().default("0"),
  rakeBps: z.coerce.number().int().min(0).max(10_000),
  capacity: z.coerce.number().int().min(2).max(256),
  status: z.enum(["OPEN", "FILLING", "LIVE", "ENDED"]),
});

export async function createLeagueAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = leagueSchema.parse({
    divisionId: formData.get("divisionId"),
    name: formData.get("name"),
    buyIn: formData.get("buyIn") ?? "0",
    rakeBps: formData.get("rakeBps"),
    capacity: formData.get("capacity"),
    status: formData.get("status"),
  });
  await leagueService.createLeague({
    divisionId: parsed.divisionId,
    name: parsed.name,
    buyInCents: parseCents(parsed.buyIn || "0"),
    rakeBps: parsed.rakeBps,
    capacity: parsed.capacity,
    status: parsed.status,
  });
  revalidatePath("/admin/leagues");
  revalidatePath("/leagues");
}

/**
 * Kick a league off: build its round-robin from the current entrants and set it
 * LIVE. Deliberately manual — an admin decides when a league stops filling.
 */
export async function generateFixturesAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const leagueId = z.string().min(1).parse(formData.get("leagueId"));
  await matchService.generateFixtures(leagueId);
  revalidatePath("/admin/leagues");
  revalidatePath(`/leagues/${leagueId}`);
  revalidatePath("/leagues");
}

/**
 * Close the season: freeze every final table, apply promotion/relegation, and
 * open the next. Runs inline rather than via Inngest so the admin sees the
 * result immediately; the same call is idempotent either way.
 */
export async function closeSeasonAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const seasonId = z.string().min(1).parse(formData.get("seasonId"));
  await seasonService.closeSeason(seasonId);
  revalidatePath("/admin/leagues");
  revalidatePath("/leagues");
}

import type { Metadata } from "next";
import { TIER_LABEL, TIER_ORDER } from "@/lib/leagues";
import { leagueService } from "@/server/services";
import {
  createDivisionAction,
  createLeagueAction,
  createSeasonAction,
} from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin · Leagues" };

export default async function AdminLeaguesPage() {
  const seasons = await leagueService.listSeasonsWithDivisions();
  const divisions = seasons.flatMap((s) =>
    s.divisions.map((d) => ({ ...d, seasonName: s.name })),
  );

  return (
    <div className="admin-page">
      <h1>League structure</h1>
      <p className="admin-sub">
        Create seasons, divisions, and leagues. New leagues appear immediately on
        the public browse.
      </p>

      <section className="admin-grid">
        {/* Create season */}
        <form action={createSeasonAction} className="admin-card">
          <h2>New season</h2>
          <label className="field-label">
            Name
            <input name="name" required placeholder="Season 3" />
          </label>
          <label className="field-label">
            Status
            <select name="status" defaultValue="ACTIVE">
              <option value="UPCOMING">Upcoming</option>
              <option value="ACTIVE">Active</option>
              <option value="CLOSED">Closed</option>
            </select>
          </label>
          <label className="field-label">
            Ends at (optional)
            <input name="endsAt" type="date" />
          </label>
          <button type="submit" className="btn btn-primary">
            Create season
          </button>
        </form>

        {/* Create division */}
        <form action={createDivisionAction} className="admin-card">
          <h2>New division</h2>
          <label className="field-label">
            Season
            <select name="seasonId" required>
              {seasons.length === 0 && <option value="">— none yet —</option>}
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.status})
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Name
            <input name="name" required placeholder="Elite Premier" />
          </label>
          <label className="field-label">
            Tier
            <select name="tier" defaultValue="AMATEUR">
              {TIER_ORDER.map((t) => (
                <option key={t} value={t}>
                  {TIER_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Rank (higher = more prestigious)
            <input name="rank" type="number" min={0} defaultValue={0} required />
          </label>
          <button type="submit" className="btn btn-primary">
            Create division
          </button>
        </form>

        {/* Create league */}
        <form action={createLeagueAction} className="admin-card">
          <h2>New league</h2>
          <label className="field-label">
            Division
            <select name="divisionId" required>
              {divisions.length === 0 && <option value="">— none yet —</option>}
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.seasonName} · {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Name
            <input name="name" required placeholder="Premier A" />
          </label>
          <div className="admin-row">
            <label className="field-label">
              Buy-in (USD)
              <input name="buyIn" defaultValue="0" inputMode="decimal" />
            </label>
            <label className="field-label">
              Rake (bps)
              <input name="rakeBps" type="number" min={0} max={10000} defaultValue={0} />
            </label>
          </div>
          <div className="admin-row">
            <label className="field-label">
              Capacity
              <input name="capacity" type="number" min={2} max={256} defaultValue={16} />
            </label>
            <label className="field-label">
              Status
              <select name="status" defaultValue="OPEN">
                <option value="OPEN">Open</option>
                <option value="FILLING">Filling</option>
                <option value="LIVE">Live</option>
                <option value="ENDED">Ended</option>
              </select>
            </label>
          </div>
          <button type="submit" className="btn btn-primary">
            Create league
          </button>
        </form>
      </section>

      <section className="admin-list">
        <h2>Current structure</h2>
        {seasons.length === 0 ? (
          <p className="admin-empty">No seasons yet — create one above.</p>
        ) : (
          seasons.map((s) => (
            <div key={s.id} className="admin-season">
              <h3>
                {s.name} <span className="admin-pill">{s.status}</span>
              </h3>
              {s.divisions.length === 0 ? (
                <p className="admin-empty">No divisions.</p>
              ) : (
                <ul>
                  {s.divisions.map((d) => (
                    <li key={d.id}>
                      <strong>{d.name}</strong> — {TIER_LABEL[d.tier]} · rank{" "}
                      {d.rank}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}

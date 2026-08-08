"use client";

import { useState, useTransition } from "react";
import {
  linkStreamAction,
  unlinkStreamAction,
  type SettingsState,
} from "../actions";

export function StreamLinkForm({
  platform,
  channel,
}: {
  platform?: "TWITCH" | "YOUTUBE";
  channel?: string;
}) {
  const [state, setState] = useState<SettingsState>({ ok: false });
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      setState(await linkStreamAction({ ok: false }, formData));
    });
  }

  return (
    <div className="set-panel">
      <form action={submit} className="mr-report">
        <label className="field-label">
          Platform
          <select name="platform" defaultValue={platform ?? "TWITCH"}>
            <option value="TWITCH">Twitch</option>
            <option value="YOUTUBE">YouTube</option>
          </select>
        </label>
        <label className="field-label">
          Channel
          <input
            name="channel"
            defaultValue={channel ?? ""}
            placeholder="your_twitch_name or UCxxxxxxxx"
            maxLength={64}
            required
          />
        </label>
        <p className="mr-hint">
          Twitch: just your channel name. YouTube: your channel id (starts with
          UC). Letters, numbers, dot, dash and underscore only.
        </p>
        {state.error && <p className="form-error">{state.error}</p>}
        {state.ok && state.message && (
          <p className="mr-ok" role="status">
            {state.message}
          </p>
        )}
        <div className="rv-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? "Saving…" : channel ? "Update channel" : "Link channel"}
          </button>
        </div>
      </form>

      {channel && (
        <form action={unlinkStreamAction} style={{ marginTop: 12 }}>
          <button type="submit" className="btn btn-ghost">
            Unlink channel
          </button>
        </form>
      )}
    </div>
  );
}

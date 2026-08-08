"use client";

import { useState, useTransition } from "react";
import { reportResultAction, type ReportState } from "../actions";

export interface ReportFormProps {
  matchId: string;
  homeName: string;
  awayName: string;
  /** False when blob storage isn't provisioned — link proof only. */
  uploadsEnabled: boolean;
}

/**
 * Score entry for one player. Both players submit independently and the scores
 * must match before the result counts, so this deliberately shows no hint of
 * what the opponent reported.
 */
export function ReportForm({
  matchId,
  homeName,
  awayName,
  uploadsEnabled,
}: ReportFormProps) {
  const [state, setState] = useState<ReportState>({ ok: false });
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      setState(await reportResultAction({ ok: false }, formData));
    });
  }

  return (
    <form action={submit} className="mr-report">
      <input type="hidden" name="matchId" value={matchId} />

      <div className="mr-score-row">
        <label className="mr-score">
          <span>{homeName}</span>
          <input
            name="homeScore"
            type="number"
            min={0}
            max={99}
            defaultValue={0}
            required
            inputMode="numeric"
          />
        </label>
        <span className="mr-dash" aria-hidden>
          –
        </span>
        <label className="mr-score">
          <span>{awayName}</span>
          <input
            name="awayScore"
            type="number"
            min={0}
            max={99}
            defaultValue={0}
            required
            inputMode="numeric"
          />
        </label>
      </div>

      <label className="field-label">
        Proof — stream or VOD link {uploadsEnabled ? "" : "(required evidence)"}
        <input
          name="proofUrl"
          type="url"
          placeholder="https://twitch.tv/videos/…"
          inputMode="url"
        />
      </label>
      {!uploadsEnabled && (
        <p className="mr-hint">
          Screenshot upload isn&apos;t available yet — paste your stream or VOD
          link as evidence.
        </p>
      )}

      {state.error && <p className="form-error">{state.error}</p>}
      {state.ok && (
        <p className="mr-ok" role="status">
          {state.status === "VERIFIED"
            ? "Both reports match — the result is verified."
            : state.status === "UNDER_REVIEW"
              ? "Your report doesn't match your opponent's. It's gone to review."
              : "Reported. Waiting on your opponent."}
        </p>
      )}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={pending || state.ok}
        aria-busy={pending}
      >
        {pending ? "Submitting…" : "Submit result"}
      </button>
    </form>
  );
}

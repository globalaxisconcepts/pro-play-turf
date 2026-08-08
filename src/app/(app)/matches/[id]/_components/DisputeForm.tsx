"use client";

import { useState, useTransition } from "react";
import { raiseDisputeAction, type ReportState } from "../actions";

/**
 * Formally contest a result. Deliberately behind a disclosure rather than a
 * prominent button — disputing should be a considered act, not a reflex.
 */
export function DisputeForm({ matchId }: { matchId: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ReportState>({ ok: false });
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      setState(await raiseDisputeAction({ ok: false }, formData));
    });
  }

  if (state.ok) {
    return (
      <p className="mr-ok" role="status">
        Dispute filed. A reviewer will look at the evidence and decide.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => setOpen(true)}
      >
        Dispute this result
      </button>
    );
  }

  return (
    <form action={submit} className="mr-report">
      <input type="hidden" name="matchId" value={matchId} />
      <label className="field-label">
        What went wrong?
        <input
          name="reason"
          required
          minLength={10}
          maxLength={500}
          placeholder="e.g. Opponent disconnected at 80 minutes while losing."
        />
      </label>
      <label className="field-label">
        Evidence link (optional)
        <input name="evidenceUrl" type="url" placeholder="https://twitch.tv/videos/…" />
      </label>
      {state.error && <p className="form-error">{state.error}</p>}
      <div className="rv-actions">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? "Filing…" : "File dispute"}
        </button>
      </div>
    </form>
  );
}

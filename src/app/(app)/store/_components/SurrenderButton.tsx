"use client";

import { useState, useTransition } from "react";
import { surrenderPassAction, type StoreState } from "../actions";

/**
 * Surrender is destructive and permanent, so it sits behind a confirm modal
 * that names the Pass and states plainly that it will be destroyed. The
 * confirm button is not the default action.
 */
export function SurrenderButton({
  instanceId,
  passName,
  serial,
}: {
  instanceId: string;
  passName: string;
  serial: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<StoreState>({ ok: false });
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await surrenderPassAction({ ok: false }, formData);
      setState(result);
      if (result.ok) setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => setOpen(true)}
      >
        Surrender to rank up
      </button>

      {state.ok && state.message && (
        <p className="mr-ok" role="status">
          {state.message}
        </p>
      )}

      {open && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Surrender Pass"
          onClick={() => setOpen(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Surrender this Pass?</h3>
            <p className="modal-sub">
              {passName} · {serial}
            </p>
            <p className="lg-escrow-note">
              This <strong>destroys the Pass permanently</strong> and places you
              one division higher for next season. It cannot be undone, and the
              Pass cannot be recovered, re-minted, or sold afterwards.
            </p>
            {state.error && <p className="form-error">{state.error}</p>}
            <form action={submit}>
              <input type="hidden" name="instanceId" value={instanceId} />
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setOpen(false)}
                >
                  Keep my Pass
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={pending}
                  aria-busy={pending}
                >
                  {pending ? "Burning…" : "Surrender permanently"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

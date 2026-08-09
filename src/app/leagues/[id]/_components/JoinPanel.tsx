"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { joinLeagueAction, leaveLeagueAction, type JoinState } from "../actions";

export type JoinAvailability =
  | "joinable"
  | "entered"
  | "full"
  | "closed"
  | "signed-out";

export interface JoinPanelProps {
  leagueId: string;
  leagueName: string;
  availability: JoinAvailability;
  isFree: boolean;
  /** Pre-formatted server-side — BigInt never crosses this boundary. */
  buyInLabel: string;
  availableLabel: string;
  /** False when the known balance is already short of the buy-in. */
  canAfford: boolean;
  /** True while the league still allows a pre-start withdrawal. */
  refundable: boolean;
}

/**
 * The Join / Withdraw control and its confirm modal. The modal states the exact
 * debit, explains that the buy-in is held in escrow (not spent), and requires
 * the rules to be accepted before the action is enabled.
 *
 * The balance check here is a courtesy — the authoritative guard is the ledger,
 * which rejects an underfunded hold and comes back as `needsFunds`, swapping
 * the CTA to Add Funds.
 */
export function JoinPanel(props: JoinPanelProps) {
  const {
    leagueId,
    leagueName,
    availability,
    isFree,
    buyInLabel,
    availableLabel,
    canAfford,
    refundable,
  } = props;

  const [mode, setMode] = useState<"join" | "leave" | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [state, setState] = useState<JoinState>({ ok: false });
  const [pending, startTransition] = useTransition();

  const depositHref = `/wallet?deposit=1&next=${encodeURIComponent(`/leagues/${leagueId}`)}`;
  const shortOnFunds = state.needsFunds || (!isFree && !canAfford);

  function close() {
    setMode(null);
    setAccepted(false);
    setState({ ok: false });
  }

  function submit(formData: FormData) {
    const action = mode === "leave" ? leaveLeagueAction : joinLeagueAction;
    startTransition(async () => {
      const result = await action({ ok: false }, formData);
      setState(result);
      if (result.ok) close();
    });
  }

  if (availability === "signed-out") {
    return (
      <Link href="/signin" className="btn btn-primary lg-join">
        Sign in to join
      </Link>
    );
  }

  if (availability === "full") {
    return (
      <button type="button" className="btn btn-primary lg-join" disabled>
        League full
      </button>
    );
  }

  if (availability === "closed") {
    return (
      <button type="button" className="btn btn-primary lg-join" disabled>
        Entries closed
      </button>
    );
  }

  const leaving = mode === "leave";

  return (
    <>
      {availability === "entered" ? (
        <div className="lg-entered">
          <span className="lg-entered-tag">✓ You&apos;re in</span>
          {refundable && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setMode("leave")}
            >
              Withdraw entry
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-primary lg-join"
          onClick={() => setMode("join")}
        >
          {isFree ? "Join League" : `Join · ${buyInLabel}`}
        </button>
      )}

      {mode && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={leaving ? "Withdraw entry" : "Confirm league entry"}
          onClick={close}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{leaving ? "Withdraw entry" : "Confirm entry"}</h3>
            <p className="modal-sub">{leagueName}</p>

            <dl className="lg-confirm">
              <div>
                <dt>{leaving ? "Refund" : "Buy-in"}</dt>
                <dd className={isFree ? "free" : "gold"}>
                  {isFree ? "Free" : buyInLabel}
                </dd>
              </div>
              <div>
                <dt>Available balance</dt>
                <dd>{availableLabel}</dd>
              </div>
            </dl>

            <p className="lg-escrow-note">
              {leaving
                ? "Your buy-in is released from escrow and returned to your available balance."
                : isFree
                  ? "This league is free to enter. No funds are held."
                  : "Your buy-in is held in escrow — not spent. It's returned in full if you withdraw before the league starts."}
            </p>

            <form action={submit}>
              <input type="hidden" name="leagueId" value={leagueId} />

              {!leaving && (
                <label className="lg-accept">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                  />
                  <span>
                    I accept the{" "}
                    <Link href={`/leagues/${leagueId}?tab=rules`}>
                      league rules
                    </Link>{" "}
                    and the{" "}
                    <Link href="/rules" target="_blank">
                      fair-play policy
                    </Link>
                    .
                  </span>
                </label>
              )}

              {state.error && <p className="form-error">{state.error}</p>}

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={close}>
                  Cancel
                </button>
                {!leaving && shortOnFunds ? (
                  <Link href={depositHref} className="btn btn-gold">
                    Add funds
                  </Link>
                ) : (
                  <button
                    type="submit"
                    className={`btn ${leaving ? "btn-ghost" : "btn-primary"}`}
                    disabled={pending || (!leaving && !accepted)}
                    aria-busy={pending}
                  >
                    {pending
                      ? "Processing…"
                      : leaving
                        ? "Withdraw entry"
                        : "Confirm entry"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

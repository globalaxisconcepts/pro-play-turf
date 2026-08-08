"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  buyPassAction,
  cancelListingAction,
  listPassAction,
  type StoreState,
} from "../actions";

function useAction() {
  const [state, setState] = useState<StoreState>({ ok: false });
  const [pending, startTransition] = useTransition();
  const run = (
    action: (p: StoreState, f: FormData) => Promise<StoreState>,
    formData: FormData,
    onOk?: () => void,
  ) =>
    startTransition(async () => {
      const result = await action({ ok: false }, formData);
      setState(result);
      if (result.ok) onOk?.();
    });
  return { state, pending, run, reset: () => setState({ ok: false }) };
}

/** Offer an owned Pass for sale, with the house fee shown before confirming. */
export function ListButton({
  instanceId,
  passName,
  feeBps,
}: {
  instanceId: string;
  passName: string;
  feeBps: number;
}) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState("25.00");
  const { state, pending, run, reset } = useAction();

  const parsed = Number(price.replace(/[$,\s]/g, ""));
  const fee = Number.isFinite(parsed) ? (parsed * feeBps) / 10_000 : 0;

  function close() {
    setOpen(false);
    reset();
  }

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        List for sale
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
          aria-label="List Pass for sale"
          onClick={close}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>List for sale</h3>
            <p className="modal-sub">{passName}</p>
            <form action={(fd) => run(listPassAction, fd, close)}>
              <input type="hidden" name="instanceId" value={instanceId} />
              <label className="field-label" htmlFor="price">
                Asking price (USD)
              </label>
              <div className="amount-field">
                <span>$</span>
                <input
                  id="price"
                  name="price"
                  inputMode="decimal"
                  autoComplete="off"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <p className="lg-escrow-note">
                A {feeBps / 100}% house fee is taken from the sale, so you&apos;d
                receive about ${(parsed - fee || 0).toFixed(2)}. Your Pass stays
                yours until someone buys it, and you can cancel any time.
              </p>
              {state.error && <p className="form-error">{state.error}</p>}
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={close}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={pending}
                  aria-busy={pending}
                >
                  {pending ? "Listing…" : "List Pass"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/** Withdraw your own listing. */
export function CancelListingButton({ listingId }: { listingId: string }) {
  const { state, pending, run } = useAction();
  return (
    <form action={(fd) => run(cancelListingAction, fd)}>
      <input type="hidden" name="listingId" value={listingId} />
      <button type="submit" className="btn btn-ghost" disabled={pending}>
        {pending ? "Cancelling…" : "Cancel listing"}
      </button>
      {state.error && <p className="form-error">{state.error}</p>}
    </form>
  );
}

/** Buy someone else's Pass, with the insufficient-balance → Deposit branch. */
export function BuyButton({
  listingId,
  passName,
  priceLabel,
  availableLabel,
  canAfford,
}: {
  listingId: string;
  passName: string;
  priceLabel: string;
  availableLabel: string;
  canAfford: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { state, pending, run, reset } = useAction();
  const short = state.needsFunds || !canAfford;

  function close() {
    setOpen(false);
    reset();
  }

  return (
    <>
      <button type="button" className="btn btn-gold" onClick={() => setOpen(true)}>
        Buy · {priceLabel}
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
          aria-label="Buy Pass"
          onClick={close}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Buy this Pass</h3>
            <p className="modal-sub">{passName}</p>
            <dl className="lg-confirm">
              <div>
                <dt>Price</dt>
                <dd className="gold">{priceLabel}</dd>
              </div>
              <div>
                <dt>Available balance</dt>
                <dd>{availableLabel}</dd>
              </div>
            </dl>
            <p className="lg-escrow-note">
              The Pass transfers to you the moment payment clears. Ownership and
              payment move together — one can&apos;t happen without the other.
            </p>
            {state.error && <p className="form-error">{state.error}</p>}
            <form action={(fd) => run(buyPassAction, fd, close)}>
              <input type="hidden" name="listingId" value={listingId} />
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={close}>
                  Cancel
                </button>
                {short ? (
                  <Link
                    href={`/wallet?deposit=1&next=${encodeURIComponent("/store?tab=market")}`}
                    className="btn btn-gold"
                  >
                    Add funds
                  </Link>
                ) : (
                  <button
                    type="submit"
                    className="btn btn-gold"
                    disabled={pending}
                    aria-busy={pending}
                  >
                    {pending ? "Buying…" : "Confirm purchase"}
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

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { depositAction } from "../actions";
import type { ActionState } from "../types";

const CHIPS = [
  { label: "$10", value: "10.00" },
  { label: "$25", value: "25.00" },
  { label: "$50", value: "50.00" },
  { label: "$100", value: "100.00" },
];

export function DepositModal() {
  const router = useRouter();
  const params = useSearchParams();
  const wantsDeposit = params.get("deposit") === "1";

  const [localOpen, setLocalOpen] = useState(false);
  const [amount, setAmount] = useState("25.00");
  const [state, setState] = useState<ActionState>({ ok: false });
  const [pending, startTransition] = useTransition();

  // Open when the local trigger was used OR we arrived via ?deposit=1.
  const open = localOpen || wantsDeposit;

  function close() {
    setLocalOpen(false);
    if (wantsDeposit) router.replace("/wallet");
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await depositAction({ ok: false }, formData);
      setState(result);
      if (result.ok) close();
    });
  }

  return (
    <>
      <button className="btn btn-gold" onClick={() => setLocalOpen(true)}>
        + Deposit
      </button>
      {open && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Add funds"
          onClick={close}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add Funds</h3>
            <p className="modal-sub">
              Choose an amount to add to your available balance.
            </p>
            <form action={handleSubmit}>
              <div className="chips">
                {CHIPS.map((c) => (
                  <button
                    type="button"
                    key={c.value}
                    className={`chip-btn${amount === c.value ? " on" : ""}`}
                    onClick={() => setAmount(c.value)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <label className="field-label" htmlFor="amount">
                Amount (USD)
              </label>
              <div className="amount-field">
                <span>$</span>
                <input
                  id="amount"
                  name="amount"
                  inputMode="decimal"
                  autoComplete="off"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              {state.error && <p className="form-error">{state.error}</p>}
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={close}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-gold"
                  disabled={pending}
                  aria-busy={pending}
                >
                  {pending ? "Processing…" : "Confirm Deposit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

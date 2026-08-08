"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { acceptTermsAction, type OnboardingState } from "../actions";

export function AgeGateForm({ minAge }: { minAge: number }) {
  const router = useRouter();
  const [state, setState] = useState<OnboardingState>({ ok: false });
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await acceptTermsAction({ ok: false }, formData);
      setState(result);
      if (result.ok) router.push("/leagues");
    });
  }

  return (
    <form action={submit} className="mr-report">
      <label className="field-label">
        Date of birth
        <input
          name="dateOfBirth"
          type="date"
          required
          max={new Date().toISOString().slice(0, 10)}
        />
      </label>
      <p className="mr-hint">
        You must be at least {minAge} to take part. We store this to confirm
        eligibility.
      </p>

      <label className="lg-accept">
        <input type="checkbox" name="acceptTerms" required />
        <span>
          I accept the terms, the fair-play policy, and the responsible-play
          policy, and confirm the details above are true.
        </span>
      </label>

      {state.error && <p className="form-error">{state.error}</p>}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? "Saving…" : "Confirm and continue"}
      </button>
    </form>
  );
}

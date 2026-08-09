"use client";

import Link from "next/link";
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

      {/* Every named document is linked. Consent to something a person cannot
          read is not consent. */}
      <label className="lg-accept">
        <input type="checkbox" name="acceptTerms" required />
        <span>
          I accept the{" "}
          <Link href="/terms" target="_blank">
            Terms of Service
          </Link>
          , the{" "}
          <Link href="/rules" target="_blank">
            Fair Play Rules
          </Link>
          , and the{" "}
          <Link href="/responsible-play" target="_blank">
            Responsible Play Policy
          </Link>
          , and confirm the details above are true.
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

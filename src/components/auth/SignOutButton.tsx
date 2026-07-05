"use client";

import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { getFirebaseAuth } from "@/lib/firebase/client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      try {
        await fetch("/api/auth/session", { method: "DELETE" });
      } catch {
        // ignore — clearing the cookie is best-effort
      }
      try {
        await signOut(getFirebaseAuth());
      } catch {
        // ignore — client may already be signed out
      }
      router.refresh();
      router.push("/");
    });
  }

  return (
    <button
      type="button"
      className="btn btn-ghost"
      style={{ padding: "9px 16px" }}
      onClick={handleSignOut}
      disabled={pending}
    >
      {pending ? "…" : "Sign out"}
    </button>
  );
}

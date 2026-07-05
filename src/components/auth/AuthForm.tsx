"use client";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  type UserCredential,
} from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { Logo } from "@/components/shell/Logo";
import { getFirebaseAuth, googleProvider } from "@/lib/firebase/client";

/** Only allow internal redirect targets (no open-redirect). */
function safePath(returnTo?: string): string {
  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return "/wallet";
}

function friendlyError(err: unknown): string {
  const code = (err as { code?: string }).code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "That email is already registered — try logging in.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Google sign-in was cancelled.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export function AuthForm({
  mode,
  returnTo,
}: {
  mode: "signin" | "signup";
  returnTo?: string;
}) {
  const isSignup = mode === "signup";
  const router = useRouter();
  const dest = safePath(returnTo);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function establishSession(cred: UserCredential) {
    const idToken = await cred.user.getIdToken();
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) throw new Error("Could not establish session.");
  }

  function finish() {
    router.refresh();
    router.push(dest);
  }

  function handleEmail(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const auth = getFirebaseAuth();
        const cred = isSignup
          ? await createUserWithEmailAndPassword(auth, email, password)
          : await signInWithEmailAndPassword(auth, email, password);
        if (isSignup && displayName.trim()) {
          await updateProfile(cred.user, { displayName: displayName.trim() });
        }
        await establishSession(cred);
        finish();
      } catch (err) {
        setError(friendlyError(err));
      }
    });
  }

  function handleGoogle() {
    setError(null);
    startTransition(async () => {
      try {
        const cred = await signInWithPopup(getFirebaseAuth(), googleProvider);
        await establishSession(cred);
        finish();
      } catch (err) {
        setError(friendlyError(err));
      }
    });
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel" aria-hidden="true">
        <div className="auth-panel-glow" />
        <span className="eyebrow">Season is Live</span>
        <h2 className="auth-panel-h">
          {isSignup ? "Stake Your Turf" : "Welcome Back, Pro"}
        </h2>
        <p>
          Skill-based 1v1 EA Sports FC leagues, streamed and verified, with
          top-3 payouts every season.
        </p>
      </div>

      <div className="auth-card">
        <Logo />
        <h1 className="auth-h">
          {isSignup ? "Create your account" : "Log in"}
        </h1>

        <button
          type="button"
          className="btn btn-google"
          onClick={handleGoogle}
          disabled={pending}
        >
          <span aria-hidden="true">G</span> Continue with Google
        </button>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <form onSubmit={handleEmail} className="auth-form">
          {isSignup && (
            <div className="auth-field">
              <label className="field-label" htmlFor="displayName">
                Display name
              </label>
              <input
                id="displayName"
                className="auth-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="nickname"
                placeholder="Your gamertag"
              />
            </div>
          )}
          <div className="auth-field">
            <label className="field-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>
          <div className="auth-field">
            <label className="field-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignup ? "new-password" : "current-password"}
              placeholder={isSignup ? "At least 6 characters" : "••••••••"}
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <button
            type="submit"
            className="btn btn-primary btn-lg auth-cta"
            disabled={pending}
            aria-busy={pending}
          >
            {pending
              ? "Processing…"
              : isSignup
                ? "Create account"
                : "Log in"}
          </button>
        </form>

        <p className="auth-alt">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <Link href="/signin" className="auth-link">
                Log in
              </Link>
            </>
          ) : (
            <>
              New to Pro Play Turf?{" "}
              <Link href="/signup" className="auth-link">
                Play now
              </Link>
            </>
          )}
        </p>
        <Link href="/" className="auth-back">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}

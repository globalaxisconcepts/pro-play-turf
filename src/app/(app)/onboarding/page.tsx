import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isDatabaseConfigured } from "@/lib/db";
import { env } from "@/lib/env";
import { auth } from "@/server/auth";
import { complianceService } from "@/server/services";
import { AgeGateForm } from "./_components/AgeGateForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Before you play" };

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!isDatabaseConfigured()) redirect("/leagues");

  const status = await complianceService.status(userId);
  // Nothing to do — don't make a compliant player re-consent.
  if (status.allowed) redirect("/leagues");
  if (status.reason === "RESTRICTED") {
    return (
      <main className="app-main">
        <div className="empty" role="alert">
          <div className="ic" aria-hidden>
            ⛔
          </div>
          <h3>This account is restricted</h3>
          <p>{status.message}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="app-main">
      <header className="lg-head">
        <span className="eyebrow">One last thing</span>
        <h1>Before you play</h1>
        <p>
          {status.reason === "TERMS_OUTDATED"
            ? "Our terms have changed since you last accepted them. Please review and confirm to carry on."
            : "We need your age and your agreement to the rules before you can join a league or hold a balance."}
        </p>
      </header>

      <section className="mr-panel">
        <AgeGateForm minAge={env.MIN_AGE_YEARS} />
      </section>
    </main>
  );
}

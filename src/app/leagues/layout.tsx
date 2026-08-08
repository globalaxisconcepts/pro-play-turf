import { SiteFooter } from "@/components/shell/SiteFooter";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { isDatabaseConfigured } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { getSession } from "@/server/auth";
import { walletService } from "@/server/services";

// Browse reads live league/season data, so never statically prerender.
export const dynamic = "force-dynamic";

/**
 * Public shell for the leagues surface. Unlike (app), it does NOT require auth —
 * anyone can browse — but it shows the signed-in header (wallet chip, deposit)
 * when a session exists. Join actions on the detail page enforce auth themselves.
 */
export default async function LeaguesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();

  let walletLabel = "$0.00";
  if (session) {
    try {
      const balances = await walletService.getBalances(session.userId);
      if (balances) walletLabel = formatCents(balances.availableCents);
    } catch {
      // DB not wired yet — keep the zero chip.
    }
  }

  return (
    <>
      <SiteHeader
        variant={session ? "app" : "marketing"}
        walletLabel={walletLabel}
        depositsEnabled={isDatabaseConfigured()}
      />
      {children}
      <SiteFooter />
    </>
  );
}

import { SiteFooter } from "@/components/shell/SiteFooter";
import { SiteHeader } from "@/components/shell/SiteHeader";
import { isDatabaseConfigured } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { auth } from "@/server/auth";
import { walletService } from "@/server/services";

// The wallet reads live balances, so this segment must never be statically
// prerendered (that would hit the DB at build with placeholder creds).
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Authoritative guard — MUST be outside the try/catch so redirect()'s
  // NEXT_REDIRECT isn't swallowed. Unauthenticated users are sent to /signin.
  const { userId } = await auth();

  let walletLabel = "$0.00";
  try {
    const balances = await walletService.getBalances(userId);
    if (balances) walletLabel = formatCents(balances.availableCents);
  } catch {
    // DB not wired yet — fall back to a zero chip so the shell still renders.
  }

  return (
    <>
      <SiteHeader
        variant="app"
        walletLabel={walletLabel}
        depositsEnabled={isDatabaseConfigured()}
      />
      {children}
      <SiteFooter />
    </>
  );
}

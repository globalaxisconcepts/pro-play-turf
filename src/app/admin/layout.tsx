import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/shell/Logo";
import { auth } from "@/server/auth";

export const dynamic = "force-dynamic";

/**
 * Admin console shell. Requires an ADMIN role — everyone else gets a 404 (we
 * don't reveal the route exists). Role is assigned on the User record; a proper
 * in-app role manager arrives with the Slice 14 admin polish.
 */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { role } = await auth();
  if (role !== "ADMIN") notFound();

  return (
    <div className="admin-shell">
      <header className="admin-bar">
        <Logo />
        <span className="admin-tag">Admin</span>
        <nav className="admin-nav">
          <Link href="/admin/leagues">Leagues</Link>
          <Link href="/leagues">View site →</Link>
        </nav>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}

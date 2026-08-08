import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/shell/Logo";
import { auth } from "@/server/auth";

export const dynamic = "force-dynamic";

/**
 * Admin console shell. ADMIN gets everything; REVIEWER gets the tribunal only
 * (each page enforces its own floor). Everyone else gets a 404 — we don't
 * reveal the route exists. A proper in-app role manager arrives with Slice 14.
 */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { role } = await auth();
  if (role !== "ADMIN" && role !== "REVIEWER") notFound();

  return (
    <div className="admin-shell">
      <header className="admin-bar">
        <Logo />
        <span className="admin-tag">Admin</span>
        <nav className="admin-nav">
          {role === "ADMIN" && <Link href="/admin/leagues">Leagues</Link>}
          <Link href="/admin/reviews">Reviews</Link>
          <Link href="/leagues">View site →</Link>
        </nav>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}

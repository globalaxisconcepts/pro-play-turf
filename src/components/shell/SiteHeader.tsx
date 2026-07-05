"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { Logo } from "./Logo";

type Variant = "marketing" | "app";

const PRIMARY_LINKS = [
  { href: "/#leagues", label: "Leagues", match: "leagues" },
  { href: "/#scores", label: "Scores", match: "scores" },
  { href: "/#champions", label: "Champions League", match: "champions" },
  { href: "/#how", label: "How It Works", match: "how" },
];

export function SiteHeader({
  variant = "marketing",
  walletLabel = "$0.00",
}: {
  variant?: Variant;
  walletLabel?: string;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`nav${scrolled ? " scrolled" : ""}`} data-open={menuOpen}>
      <div className="nav-in">
        <Logo />

        <div className="nav-links">
          {PRIMARY_LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
          {variant === "app" && (
            <Link
              href="/wallet"
              className={pathname === "/wallet" ? "active" : undefined}
            >
              Wallet
            </Link>
          )}
        </div>

        <div className="nav-right">
          {variant === "app" ? (
            <>
              <Link
                href="/wallet"
                className="wchip"
                aria-label={`Wallet balance ${walletLabel}`}
              >
                <span className="coin" aria-hidden="true">
                  ◉
                </span>
                {walletLabel}
              </Link>
              <Link
                href="/wallet?deposit=1"
                className="btn btn-gold"
                style={{ padding: "11px 20px" }}
              >
                + Deposit
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/signin"
                className="btn btn-ghost"
                style={{ padding: "11px 20px" }}
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="btn btn-primary"
                style={{ padding: "11px 22px" }}
              >
                Play Now
              </Link>
            </>
          )}
          <button
            className="nav-toggle"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="nav-sheet">
          {PRIMARY_LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}>
              {l.label}
            </Link>
          ))}
          {variant === "app" ? (
            <Link href="/wallet" onClick={() => setMenuOpen(false)}>
              Wallet
            </Link>
          ) : (
            <>
              <Link href="/signin" onClick={() => setMenuOpen(false)}>
                Log In
              </Link>
              <Link href="/signup" onClick={() => setMenuOpen(false)}>
                Play Now
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

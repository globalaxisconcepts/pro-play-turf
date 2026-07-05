import Link from "next/link";
import { Logo } from "./Logo";

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] =
  [
    {
      heading: "Platform",
      links: [
        { label: "Find Leagues", href: "/#leagues" },
        { label: "Live & VODs", href: "/#scores" },
        { label: "Champions League", href: "/#champions" },
        { label: "Leaderboards", href: "/#champions" },
        { label: "Streaming Guide", href: "/#how" },
      ],
    },
    {
      heading: "Company",
      links: [
        { label: "About", href: "/#how" },
        { label: "Press", href: "/#how" },
        { label: "Contact", href: "/#how" },
        { label: "Support Center", href: "/#how" },
      ],
    },
    {
      heading: "Legal",
      links: [
        { label: "Terms of Service", href: "/#how" },
        { label: "Privacy Policy", href: "/#how" },
        { label: "Responsible Play", href: "/#how" },
        { label: "Cookie Settings", href: "/#how" },
      ],
    },
  ];

const SOCIALS = ["X", "YT", "TW", "TT", "DC"];

export function SiteFooter() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <Logo />
            <p className="mission">
              The premier arena for competitive EA Sports FC. Play. Prove.
              Profit.
            </p>
            <div className="socials">
              {SOCIALS.map((s) => (
                <a key={s} href="#" aria-label={s}>
                  {s}
                </a>
              ))}
            </div>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h4>{col.heading}</h4>
              {col.links.map((l, i) => (
                <Link key={`${l.label}-${i}`} href={l.href}>
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="foot-bot">
          <span>© 2026 Pro Play Turf. All Rights Reserved.</span>
          <span className="made">Made for the FC Community · 18+</span>
        </div>
      </div>
    </footer>
  );
}

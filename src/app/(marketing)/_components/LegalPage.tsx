import type { ReactNode } from "react";
import { CONTACT, formatPolicyDate } from "@/lib/legal";

export interface LegalSection {
  /** Anchor id — must be unique on the page and stable, since people link to them. */
  id: string;
  title: string;
  body: ReactNode;
}

export interface LegalPageProps {
  eyebrow: string;
  title: string;
  intro: ReactNode;
  /** ISO date, e.g. "2026-08-01". */
  lastUpdated: string;
  sections: LegalSection[];
  /** Shown above the contents, for anything a reader must not miss. */
  notice?: ReactNode;
}

/**
 * Shared shell for the long-form policy pages (design brief §5.19: one layout,
 * three content instances).
 *
 * Server-rendered with no client JS: the contents list is plain anchor links, so
 * it works with JavaScript disabled and keyboard navigation comes for free. The
 * measure is constrained in CSS rather than by breaking the text into columns,
 * because policy text gets read, searched and printed.
 */
export function LegalPage({
  eyebrow,
  title,
  intro,
  lastUpdated,
  sections,
  notice,
}: LegalPageProps) {
  return (
    <main className="app-main legal" id="top">
      <header className="lg-head">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <div className="legal-intro">{intro}</div>
        <p className="legal-updated">
          Last updated <time dateTime={lastUpdated}>{formatPolicyDate(lastUpdated)}</time>
        </p>
      </header>

      {notice && <div className="legal-notice">{notice}</div>}

      <div className="legal-body">
        <nav className="legal-toc" aria-label="On this page">
          <h2>On this page</h2>
          <ol>
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>
                  <span className="legal-toc-n">{i + 1}</span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="legal-prose">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`}>
              <h2 id={`${s.id}-h`}>
                <span className="legal-n">{i + 1}.</span> {s.title}
              </h2>
              {s.body}
            </section>
          ))}

          <p className="legal-foot">
            Questions about this document? Email{" "}
            <a href={`mailto:${CONTACT.legal}`}>{CONTACT.legal}</a>.{" "}
            <a href="#top">Back to top</a>
          </p>
        </div>
      </div>
    </main>
  );
}

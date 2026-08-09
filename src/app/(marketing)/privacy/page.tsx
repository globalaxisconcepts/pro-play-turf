import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT, OPERATOR, PRIVACY_LAST_UPDATED } from "@/lib/legal";
import { LegalPage, type LegalSection } from "../_components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Exactly what data Pro Play Turf collects, where it goes, how long we keep it, and your rights over it.",
};

const SECTIONS: LegalSection[] = [
  {
    id: "summary",
    title: "The short version",
    body: (
      <>
        <ul>
          <li>
            We collect what we need to run competitions and keep the money
            straight: your email, display name, date of birth, and everything you
            do on the platform.
          </li>
          <li>
            <strong>
              We run no analytics, no advertising pixels and no third-party
              trackers.
            </strong>{" "}
            There are none in the product. We set exactly one cookie, and it only
            keeps you signed in.
          </li>
          <li>We do not sell your data. We do not share it for advertising.</li>
          <li>
            Our financial and competition records are append-only, so some of your
            data cannot be deleted even on request. We explain precisely which,
            and why, in <a href="#retention">section 6</a>.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "controller",
    title: "Who is responsible for your data",
    body: (
      <>
        <p>
          {OPERATOR.legalName}, trading as {OPERATOR.brand}, of{" "}
          {OPERATOR.registeredAddress}, is the controller of the personal data
          described here.
        </p>
        <p>
          For anything about this policy or your data, email{" "}
          <a href={`mailto:${CONTACT.privacy}`}>{CONTACT.privacy}</a>.
        </p>
      </>
    ),
  },
  {
    id: "what-we-collect",
    title: "What we collect",
    body: (
      <>
        <h3>Identity and account</h3>
        <ul>
          <li>
            <strong>Email address</strong> — from your sign-in. Used to identify
            your account and contact you. We never display it publicly.
          </li>
          <li>
            <strong>Display name</strong> — chosen by you.{" "}
            <strong>This is public.</strong> It appears in league standings,
            fixtures, results, the marketplace and the scoreboard, and can be seen
            by visitors who are not signed in.
          </li>
          <li>
            <strong>Sign-in identifier</strong> — the unique id issued by Firebase
            Authentication, which links your account across our systems.
          </li>
          <li>
            <strong>Profile picture</strong> — only if you sign in with Google, in
            which case we store the URL Google provides.
          </li>
          <li>
            <strong>Account role</strong> — whether you are a player, reviewer or
            administrator.
          </li>
        </ul>
        <p>
          We never receive or store your password. Sign-in is handled entirely by
          Google Firebase Authentication.
        </p>

        <h3>Age and consent</h3>
        <ul>
          <li>
            <strong>Date of birth</strong> — as you declare it.{" "}
            <strong>We do not currently verify it against any document.</strong>{" "}
            We store it to confirm eligibility.
          </li>
          <li>
            <strong>Consent record</strong> — when you accepted these terms and
            which version, so we can re-ask you when they change.
          </li>
          <li>
            <strong>Restriction record</strong> — if an administrator restricts
            your account, the reason they gave is stored.
          </li>
        </ul>

        <h3>Money and competition</h3>
        <ul>
          <li>
            <strong>Wallet balances and full transaction history</strong> — every
            credit and debit, permanently. This is a double-entry ledger; entries
            are never amended or removed.
          </li>
          <li>
            <strong>League entries</strong> — which leagues you joined, what you
            paid, and when you withdrew.
          </li>
          <li>
            <strong>Match reports</strong> — the scores you submit.{" "}
            <strong>These cannot be edited after submission</strong> — they are
            evidence.
          </li>
          <li>
            <strong>Dispute text</strong> — anything you write when contesting a
            result, and the reviewer&rsquo;s note in response.
          </li>
          <li>
            <strong>Standings</strong> — your results and final placings, kept as
            a permanent competitive record.
          </li>
          <li>
            <strong>Access Passes</strong> — what you hold, and the full trading
            history of every Pass, including who bought and sold it and at what
            price.
          </li>
        </ul>

        <h3>Streaming</h3>
        <ul>
          <li>
            <strong>Channel handle</strong> — the Twitch or YouTube channel you
            link, if you choose to link one. It is shown publicly.
          </li>
          <li>
            <strong>VOD and stream links</strong> — any link you attach as match
            evidence. These are shown publicly on the Watch page and to reviewers.
          </li>
        </ul>

        <h3>Audit log</h3>
        <p>
          Every consequential action — a result verified or voided, a dispute
          raised, a Pass minted or sold, a league settled, an account restricted —
          is written to an append-only audit log recording who did it, when, and a
          short description. Some of those descriptions contain your account
          identifier and text you wrote.
        </p>
      </>
    ),
  },
  {
    id: "why",
    title: "Why we use it, and our lawful basis",
    body: (
      <>
        <table className="tx-table">
          <thead>
            <tr>
              <th>Purpose</th>
              <th>Data</th>
              <th>Lawful basis</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Provide the platform and run competitions</td>
              <td>Account, entries, matches, standings</td>
              <td>Performance of a contract</td>
            </tr>
            <tr>
              <td>Keep balances and prizes correct</td>
              <td>Wallet, ledger</td>
              <td>Performance of a contract; legal obligation</td>
            </tr>
            <tr>
              <td>Confirm you are old enough</td>
              <td>Date of birth</td>
              <td>Legal obligation; legitimate interests</td>
            </tr>
            <tr>
              <td>Adjudicate disputes and prevent cheating</td>
              <td>Reports, evidence, audit log</td>
              <td>Legitimate interests — competitive integrity</td>
            </tr>
            <tr>
              <td>Prevent abuse and rate-limit actions</td>
              <td>Account identifier</td>
              <td>Legitimate interests — security</td>
            </tr>
            <tr>
              <td>Show streams and VODs</td>
              <td>Channel handle, links</td>
              <td>Consent — you choose to link a channel</td>
            </tr>
          </tbody>
        </table>
        <p>
          Where we rely on legitimate interests, we have considered your rights
          and concluded these uses are necessary to run a fair competition with
          money at stake. You may object — see <a href="#rights">section 8</a>.
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "Who else sees it",
    body: (
      <>
        <p>
          We do not sell your data or share it for advertising. We use the
          following service providers, who process data on our instructions:
        </p>
        <table className="tx-table">
          <thead>
            <tr>
              <th>Provider</th>
              <th>What reaches them</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Google (Firebase Authentication)</td>
              <td>Email, password, display name; the full Google account handshake if you use Google sign-in</td>
            </tr>
            <tr>
              <td>Google (Cloud Firestore)</td>
              <td>Your profile: sign-in id, email, display name, avatar URL</td>
            </tr>
            <tr>
              <td>Neon (database hosting)</td>
              <td>Everything in <a href="#what-we-collect">section 3</a> other than the Firestore profile</td>
            </tr>
            <tr>
              <td>Vercel (hosting)</td>
              <td>All request traffic and server logs</td>
            </tr>
            <tr>
              <td>Inngest (background jobs)</td>
              <td>Job metadata; failure reports may contain account identifiers</td>
            </tr>
            <tr>
              <td>Upstash (optional, rate limiting)</td>
              <td>Your account identifier only, in short-lived counter keys. No names, emails or amounts.</td>
            </tr>
          </tbody>
        </table>

        <h3>Twitch and YouTube embeds</h3>
        <p>
          The Watch page embeds players&rsquo; streams directly.{" "}
          <strong>
            Your browser connects to Twitch or YouTube itself when you load that
            page
          </strong>
          , so they receive your IP address and user agent and may set their own
          cookies, under their own privacy policies and not ours. If you would
          rather not, avoid the Watch page.
        </p>
        <p>
          We may also disclose data where the law requires it, to establish or
          defend legal claims, or to investigate a serious breach of the rules.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long we keep it — and what we cannot delete",
    body: (
      <>
        <p>
          This section is deliberately blunt, because the honest answer is more
          complicated than &ldquo;we delete it on request&rdquo;.
        </p>
        <p>
          <strong>What we will delete on request:</strong> your Firestore profile,
          your display name (replaced with a placeholder), your avatar, your
          linked streaming channel, and your Firebase sign-in record. You can
          unlink your streaming channel yourself at any time in Settings.
        </p>
        <p>
          <strong>What we retain even after a deletion request:</strong>
        </p>
        <ul>
          <li>
            <strong>Ledger entries and transactions.</strong> The ledger is
            append-only double-entry accounting. Deleting an entry would make the
            books stop balancing and would destroy the record of money that moved
            between accounts, including other people&rsquo;s.
          </li>
          <li>
            <strong>Match reports, results and standings.</strong> These are the
            competitive record and other players&rsquo; results depend on them.
          </li>
          <li>
            <strong>Disputes and the audit log.</strong> These record how
            decisions were made and by whom. They are the accountability trail for
            adjudication.
          </li>
          <li>
            <strong>Pass trading history.</strong> Provenance is shared between
            buyer and seller.
          </li>
        </ul>
        <p>
          We keep these under the exemptions for establishing and defending legal
          claims, for compliance with financial record-keeping obligations, and
          for our legitimate interest in competitive integrity. Where practical we
          disassociate them from your identifying details rather than keeping the
          full record linked to you.
        </p>
        <p>
          We are being explicit about this rather than promising erasure we cannot
          deliver. If that trade-off is not acceptable to you, please do not open
          an account.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and local storage",
    body: (
      <>
        <p>
          <strong>We set one cookie.</strong>
        </p>
        <table className="tx-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Purpose</th>
              <th>Lifetime</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>__session</code>
              </td>
              <td>Keeps you signed in. HTTP-only, so scripts cannot read it.</td>
              <td>5 days</td>
            </tr>
          </tbody>
        </table>
        <p>
          It is strictly necessary for the service to work, so no consent banner
          is required and there is nothing to opt out of other than not signing
          in.
        </p>
        <p>
          Separately, the Firebase sign-in library stores authentication state in
          your browser&rsquo;s local storage so you are not signed out on every
          page load. Clearing your browser storage removes it.
        </p>
        <p>
          <strong>
            There is no analytics, no advertising, and no tracking of any kind on
            this site.
          </strong>{" "}
          Our fonts are served from our own servers, not from a font provider.
        </p>
      </>
    ),
  },
  {
    id: "rights",
    title: "Your rights",
    body: (
      <>
        <p>
          Whatever country you are in, you can ask us to: give you a copy of your
          data; correct it if it is wrong; delete it (subject to{" "}
          <a href="#retention">section 6</a>); restrict or object to how we use
          it; or send it to another provider.
        </p>
        <p>
          Email <a href={`mailto:${CONTACT.privacy}`}>{CONTACT.privacy}</a>. We
          will respond within one month. We do not charge for this.
        </p>

        <h3>If you are in the UK or the EU</h3>
        <p>
          You have the rights in the UK GDPR / EU GDPR set out above, and you may
          complain to your supervisory authority — in the UK, the Information
          Commissioner&rsquo;s Office (ico.org.uk); in the EU, your national data
          protection authority. Where we rely on consent you may withdraw it at
          any time without affecting past processing.
        </p>

        <h3>If you are in Nigeria</h3>
        <p>
          You have the rights under the Nigeria Data Protection Act 2023,
          including access, rectification, erasure, restriction, objection and
          portability, and you may complain to the Nigeria Data Protection
          Commission.
        </p>

        <h3>If you are in the United States</h3>
        <p>
          Depending on your state you may have the right to know what we collect,
          to delete it, to correct it, to obtain a portable copy, and to opt out
          of sale or sharing.{" "}
          <strong>
            We do not sell personal information and do not share it for
            cross-context behavioural advertising
          </strong>
          , so there is nothing to opt out of. We do not use or disclose sensitive
          personal information beyond what is needed to provide the service. We
          will not discriminate against you for exercising a right.
        </p>

        <h3>International transfers</h3>
        <p>
          Our providers may process data outside your country, including in the
          United States and the European Union. Where data leaves the UK or EEA we
          rely on adequacy decisions or standard contractual clauses. Ask us for
          details.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <>
        <p>
          Sign-in is delegated to Google, so we never hold your password. Session
          cookies are HTTP-only and signed. Access to the administration and
          review tools is restricted by role and every action taken there is
          logged. Balances are reconciled nightly against the ledger and
          discrepancies are raised as failures rather than quietly corrected.
        </p>
        <p>
          No system is perfectly secure. If you find a vulnerability, please tell
          us at <a href={`mailto:${CONTACT.support}`}>{CONTACT.support}</a> rather
          than disclosing it publicly, and we will work with you.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        The platform is not for under-18s. We do not knowingly collect data from
        children. If you believe a child has given us data, email{" "}
        <a href={`mailto:${CONTACT.privacy}`}>{CONTACT.privacy}</a> and we will
        delete what we lawfully can and close the account.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <>
        <p>
          We will update this policy as the platform changes — connecting a
          payment provider and adding identity verification will both require
          substantial revisions. Each version is dated. Material changes will be
          notified to you before they take effect.
        </p>
        <p>
          This policy sits alongside our{" "}
          <Link href="/terms">Terms of Service</Link>, the{" "}
          <Link href="/rules">Fair Play Rules</Link> and our{" "}
          <Link href="/responsible-play">Responsible Play Policy</Link>.
        </p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      lastUpdated={PRIVACY_LAST_UPDATED}
      intro={
        <p>
          What we collect, where it goes, how long we keep it, and what you can
          ask us to do about it. Written from an audit of what the software
          actually stores — not from a template.
        </p>
      }
      notice={
        <>
          <strong>Draft pending legal review.</strong> Accurate as a description
          of the system, but not yet reviewed by a qualified data-protection
          adviser. A review is required before the platform accepts real money or
          collects identity documents.
        </>
      }
      sections={SECTIONS}
    />
  );
}

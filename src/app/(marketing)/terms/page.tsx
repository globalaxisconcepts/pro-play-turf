import type { Metadata } from "next";
import Link from "next/link";
import {
  CONTACT,
  GOVERNING_LAW,
  MIN_AGE_DISPLAY,
  OPERATOR,
  TERMS_LAST_UPDATED,
} from "@/lib/legal";
import { LegalPage, type LegalSection } from "../_components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The agreement between you and Pro Play Turf — eligibility, entries, prizes, conduct and disputes.",
};

const SECTIONS: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who we are and what this covers",
    body: (
      <>
        <p>
          {OPERATOR.brand} is a competitive EA Sports FC platform operated by{" "}
          {OPERATOR.legalName}, a company registered in {GOVERNING_LAW} under
          number {OPERATOR.companyNumber}, whose registered office is{" "}
          {OPERATOR.registeredAddress} (&ldquo;we&rdquo;, &ldquo;us&rdquo;,
          &ldquo;the platform&rdquo;).
        </p>
        <p>
          These Terms form a binding agreement between you and us. They apply
          every time you use {OPERATOR.site} or any part of the service. If you
          do not accept them, do not use the platform.
        </p>
        <p>
          Two further documents form part of this agreement and are incorporated
          by reference: the{" "}
          <Link href="/rules">Fair Play Rules</Link>, which govern how matches
          are played and results decided, and the{" "}
          <Link href="/responsible-play">Responsible Play Policy</Link>. Our{" "}
          <Link href="/privacy">Privacy Policy</Link> explains what we do with
          your data.
        </p>
      </>
    ),
  },
  {
    id: "current-phase",
    title: "Current phase — no real-money transactions",
    body: (
      <>
        <p className="legal-callout">
          <strong>Read this before anything else.</strong> The platform is
          operating on internal credits only. There is no payment gateway
          connected. You cannot deposit real money, you cannot withdraw, and any
          balance shown in your wallet has{" "}
          <strong>no cash value and is not redeemable</strong> for money, goods
          or anything else of value.
        </p>
        <p>
          Credits are a scorekeeping mechanism for testing competitive formats.
          They are not e-money, not a stored-value instrument, and confer no
          proprietary right. We may adjust, reset or remove credit balances
          during this phase, including to correct errors.
        </p>
        <p>
          Sections{" "}
          <a href="#entries">5</a>, <a href="#prizes">6</a> and{" "}
          <a href="#passes">7</a> describe how entry fees and prizes will work
          once real-money play is enabled. Those sections have no monetary effect
          while this clause is in force. We will update these Terms and ask you
          to accept them again before any real-money feature goes live —{" "}
          see <a href="#changes">section 13</a>.
        </p>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "Eligibility",
    body: (
      <>
        <p>To hold an account you must:</p>
        <ul>
          <li>
            be at least <strong>{MIN_AGE_DISPLAY} years old</strong>;
          </li>
          <li>
            have the legal capacity to enter into a contract in the country where
            you live;
          </li>
          <li>
            not be resident in, or accessing the platform from, a territory we
            have restricted (see <a href="#territories">Schedule A</a>); and
          </li>
          <li>
            not have been previously excluded from the platform, whether at your
            own request or ours.
          </li>
        </ul>
        <p>
          We ask you to confirm your date of birth before you can join a league
          or hold a balance. You are responsible for the accuracy of what you
          tell us. Giving a false date of birth is a breach of these Terms and we
          may close your account and forfeit any entry as a result. We do not
          currently carry out documentary age verification; we will do so before
          real-money play is enabled.
        </p>
      </>
    ),
  },
  {
    id: "account",
    title: "Your account",
    body: (
      <>
        <p>
          You may hold one account. Accounts are personal to you and must not be
          shared, sold, transferred or accessed by anyone else. You are
          responsible for everything that happens under your account and for
          keeping your sign-in credentials secure.
        </p>
        <p>
          Sign-in is handled by Google Firebase Authentication. We never see or
          store your password. If you sign in with Google, we receive the account
          details described in our <Link href="/privacy">Privacy Policy</Link>.
        </p>
        <p>
          Tell us immediately at{" "}
          <a href={`mailto:${CONTACT.support}`}>{CONTACT.support}</a> if you
          believe someone else has used your account.
        </p>
      </>
    ),
  },
  {
    id: "entries",
    title: "League entries, escrow and withdrawal",
    body: (
      <>
        <p>
          Leagues may be free to enter or carry a buy-in. When you join a league
          with a buy-in, the amount is moved from your available balance into{" "}
          <strong>escrow</strong>. It is held, not spent.
        </p>
        <ul>
          <li>
            <strong>Before the league starts</strong>, you may withdraw your
            entry at any time and the full buy-in is returned to your available
            balance. We return the amount actually held, even if the league&rsquo;s
            advertised buy-in has changed since you joined.
          </li>
          <li>
            <strong>Once the league goes live</strong>, entries are locked. You
            cannot withdraw and the buy-in is not refundable, except where we
            cancel the league or a decision under{" "}
            <a href="#results">section 8</a> requires it.
          </li>
          <li>
            A league has a fixed capacity. Once it is full, no further entries
            are accepted.
          </li>
        </ul>
        <p>
          If we cancel a league before it starts, every entry is returned in
          full. If we cancel a league after it has started — for example because
          it cannot be completed fairly — we will return entries or settle the
          pool on a basis we consider equitable, and we will tell you which and
          why.
        </p>
      </>
    ),
  },
  {
    id: "prizes",
    title: "Prizes and platform fee",
    body: (
      <>
        <p>
          The prize pool for a league is the total of the entry fees actually
          paid by the players who entered it. A league that does not fill pays
          out proportionately less than its advertised maximum, because the pool
          is only ever the money that was actually put in.
        </p>
        <p>
          We deduct a platform fee (the &ldquo;rake&rdquo;) from the pool. The
          fee for a given league is shown on that league&rsquo;s page before you
          enter. The remainder is distributed to the top three finishers in the
          proportions shown in the league&rsquo;s Prize Breakdown. Knockout
          competitions may use a different split, which is shown on the
          competition page.
        </p>
        <p>
          Prizes are credited to your available balance when the league settles.
          Placings are determined by the final table or bracket as decided under{" "}
          <a href="#results">section 8</a>. A match that has been voided does not
          count towards any placing.
        </p>
      </>
    ),
  },
  {
    id: "passes",
    title: "Access Passes",
    body: (
      <>
        <p>
          Finishing in the top three of a league mints an Access Pass to your
          collection. A Pass is a <strong>limited, revocable licence</strong> to
          the digital item and the benefits we attach to it. It is not a security,
          not a token, and does not give you ownership of any underlying
          intellectual property.
        </p>
        <ul>
          <li>
            <strong>Surrender is irreversible.</strong> Surrendering a Pass
            destroys it permanently in exchange for a division promotion. It
            cannot be recovered, re-minted or reversed, by you or by us.
          </li>
          <li>
            <strong>Trading.</strong> You may list a Pass on the marketplace at a
            price you set. We deduct a marketplace fee from completed sales,
            shown to you before you list. Ownership transfers only when payment
            completes.
          </li>
          <li>
            A Pass listed for sale cannot be surrendered until the listing is
            cancelled.
          </li>
        </ul>
        <p>
          We may retire or alter Pass benefits with reasonable notice. We will not
          confiscate a Pass except where it was obtained in breach of these Terms.
        </p>
      </>
    ),
  },
  {
    id: "results",
    title: "Results, evidence and disputes",
    body: (
      <>
        <p>
          There is no automated feed of match results from the game publisher. A
          result becomes official only when{" "}
          <strong>both players independently report the same score</strong>. Until
          then the match has no recorded result.
        </p>
        <p>
          Where reports disagree, or a match is flagged, it goes to human review.
          Reviewers decide on the evidence submitted — stream links, VODs and the
          players&rsquo; own reports — and may confirm a score or void the match.
          Every reported score is retained as evidence and is not editable after
          submission.
        </p>
        <p>
          You may formally dispute a result. Disputes should be raised promptly;
          the timescales are in the{" "}
          <Link href="/rules">Fair Play Rules</Link>. A reviewer&rsquo;s decision
          on a match is <strong>final</strong> as a matter of competition
          administration. That does not affect any statutory right you have to
          bring a claim.
        </p>
        <p>
          Every decision that changes a result is recorded in an audit log,
          together with who made it and why.
        </p>
      </>
    ),
  },
  {
    id: "conduct",
    title: "Conduct and prohibited behaviour",
    body: (
      <>
        <p>You must not:</p>
        <ul>
          <li>
            fix, manipulate or agree the outcome of a match, or bet on matches you
            take part in;
          </li>
          <li>
            play on an account that is not yours, or arrange for anyone else to
            play on yours (&ldquo;boosting&rdquo; or account sharing);
          </li>
          <li>
            hold more than one account, or create a new account to enter a
            division below your standard (&ldquo;smurfing&rdquo;);
          </li>
          <li>
            use cheats, mods, exploits or any tool that alters game behaviour;
          </li>
          <li>falsify a score, a proof link or any evidence;</li>
          <li>
            abuse, harass, threaten or discriminate against another player, a
            reviewer or our staff;
          </li>
          <li>
            attempt to disrupt, probe or gain unauthorised access to the platform.
          </li>
        </ul>
        <p>
          Penalties are set out in the{" "}
          <Link href="/rules">Fair Play Rules</Link> and escalate with severity
          and repetition. Confirmed match-fixing or cheating forfeits the entry
          and any prize arising from it.
        </p>
      </>
    ),
  },
  {
    id: "suspension",
    title: "Restriction, suspension and closure",
    body: (
      <>
        <p>
          We may restrict your account from transacting, suspend it, or close it
          where we reasonably believe you have breached these Terms, where we are
          required to by law, or where restriction is necessary to protect other
          players or the integrity of a competition.
        </p>
        <p>
          A restriction is recorded with a reason. We will tell you that your
          account is restricted and, unless doing so would prejudice an
          investigation or breach a legal duty, why. You may respond by emailing{" "}
          <a href={`mailto:${CONTACT.support}`}>{CONTACT.support}</a>.
        </p>
        <p>
          You may stop using the platform at any time. Because our financial and
          competition records are append-only, closing your account does not
          erase entries, results or ledger history — see the{" "}
          <Link href="/privacy#retention">Privacy Policy</Link> for what is kept
          and why.
        </p>
      </>
    ),
  },
  {
    id: "availability",
    title: "Availability and changes to the service",
    body: (
      <>
        <p>
          We aim to keep the platform available but do not guarantee it will be
          uninterrupted or error-free. We may suspend it for maintenance, and we
          may add, change or remove features.
        </p>
        <p>
          Competitive formats, division structures, fees and prize splits may
          change between seasons. Changes do not apply retrospectively to a league
          you have already entered.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    title: "Liability",
    body: (
      <>
        <p>
          Nothing in these Terms limits our liability for death or personal injury
          caused by our negligence, for fraud or fraudulent misrepresentation, or
          for any other liability that cannot lawfully be limited.
        </p>
        <p>
          Subject to that, we are not liable for loss that was not reasonably
          foreseeable, for loss of profit, opportunity or reputation, for loss
          caused by your internet connection, hardware, the game itself or a
          third-party platform, or for the acts of other players.
        </p>
        <p>
          Where we are liable, our total liability to you is limited to the
          greater of the amounts you actually paid us in the twelve months before
          the claim, or £100.
        </p>
        <p>
          You agree to indemnify us against claims arising from your breach of
          these Terms or your unlawful use of the platform.
        </p>
      </>
    ),
  },
  {
    id: "ip",
    title: "Intellectual property",
    body: (
      <>
        <p>
          The platform, its design, and the {OPERATOR.brand} name and marks belong
          to us or our licensors. You may not copy, adapt or reuse them without
          permission.
        </p>
        <p>
          EA SPORTS FC and related marks belong to Electronic Arts Inc. We are not
          affiliated with, endorsed by, or sponsored by Electronic Arts.
        </p>
        <p>
          You keep ownership of the content you submit — including stream links
          and VODs. By submitting it you grant us a non-exclusive, worldwide,
          royalty-free licence to host, display and use it for operating the
          platform, adjudicating matches and promoting competitions.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to these Terms",
    body: (
      <>
        <p>
          We may update these Terms. Each version carries a date. When we make a
          change that affects your rights or obligations, we will{" "}
          <strong>ask you to accept the new version</strong> before you can
          continue to join leagues or hold a balance — the platform records which
          version you accepted and re-prompts you when it changes.
        </p>
        <p>
          If you do not accept an updated version, you may stop using the platform
          and ask us to return any withdrawable balance you hold at that time,
          subject to leagues already in progress.
        </p>
      </>
    ),
  },
  {
    id: "law",
    title: "Governing law and disputes",
    body: (
      <>
        <p>
          These Terms are governed by the law of {GOVERNING_LAW}, and the courts
          of {GOVERNING_LAW} have non-exclusive jurisdiction.
        </p>
        <p>
          <strong>If you are a consumer</strong>, this does not deprive you of the
          protection of the mandatory consumer-protection law of the country where
          you live, and you may bring proceedings in your local courts. Nothing
          here removes a right you have under local law that cannot be excluded by
          agreement.
        </p>
        <p>
          Before starting proceedings, please contact us at{" "}
          <a href={`mailto:${CONTACT.legal}`}>{CONTACT.legal}</a>. Most issues can
          be resolved quickly.
        </p>
      </>
    ),
  },
  {
    id: "territories",
    title: "Schedule A — Restricted territories",
    body: (
      <>
        <p>
          The platform is not available to residents of, or persons accessing it
          from, the following territories:
        </p>
        <p className="legal-fill">
          [RESTRICTED TERRITORIES — to be completed on legal advice. Whether paid
          entry with cash prizes is lawful, and whether a licence is required,
          varies by country and by state or province. This list must be settled
          before real-money play is enabled.]
        </p>
        <p>
          We may add territories to this list where the law requires it, with
          effect from the date of the change.
        </p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      lastUpdated={TERMS_LAST_UPDATED}
      intro={
        <p>
          These Terms govern your use of {OPERATOR.brand}. We have written them to
          be read, not endured — plain sentences, short sections, and the
          important parts flagged rather than buried.
        </p>
      }
      notice={
        <>
          <strong>Draft pending legal review.</strong> This document has been
          prepared for review by a qualified solicitor and is not yet
          counsel-approved. The governing-law choice and the restricted-territories
          schedule in particular require professional advice before the platform
          accepts real money.
        </>
      }
      sections={SECTIONS}
    />
  );
}

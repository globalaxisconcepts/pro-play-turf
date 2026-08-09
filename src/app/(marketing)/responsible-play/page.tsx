import type { Metadata } from "next";
import Link from "next/link";
import {
  CONTACT,
  MIN_AGE_DISPLAY,
  OPERATOR,
  TERMS_LAST_UPDATED,
} from "@/lib/legal";
import { LegalPage, type LegalSection } from "../_components/LegalPage";

export const metadata: Metadata = {
  title: "Responsible Play",
  description:
    "Playing for stakes should stay enjoyable. How to keep control, what we do, and where to get help.",
};

const SECTIONS: LegalSection[] = [
  {
    id: "position",
    title: "Where we stand",
    body: (
      <>
        <p>
          {OPERATOR.brand} runs skill-based competitions. Outcomes are decided by
          how well you play, not by chance. That is a real distinction, and it is
          why we describe this as competition rather than gambling.
        </p>
        <p>
          It is also not a reason to be complacent. Where entry costs money and
          outcomes are uncertain to the player, the same patterns can appear:
          chasing losses, playing longer than intended, staking more than you can
          afford. Skill does not make those harmless.
        </p>
        <p>
          This policy sets out what we do about it, what we do not yet do, and
          where to get help.
        </p>
      </>
    ),
  },
  {
    id: "age",
    title: "Age",
    body: (
      <p>
        You must be at least {MIN_AGE_DISPLAY} to hold an account. We ask for your
        date of birth before you can join a league or hold a balance, and we
        re-check that you are eligible on every action that involves money. We do
        not currently verify age against documents; we will before real-money play
        is enabled.
      </p>
    ),
  },
  {
    id: "signs",
    title: "Signs worth taking seriously",
    body: (
      <>
        <p>
          Ask yourself honestly. Any of these is worth paying attention to, and
          several together is a reason to stop and talk to someone:
        </p>
        <ul>
          <li>Entering a league to win back what you lost in the last one.</li>
          <li>
            Playing for longer than you meant to, or at times that damage your
            sleep, work or study.
          </li>
          <li>
            Staking money you need for something else — rent, bills, food.
          </li>
          <li>Hiding how much you play or spend from people close to you.</li>
          <li>
            Feeling anxious, irritable or low when you cannot play, or after a
            loss.
          </li>
          <li>Borrowing money to enter.</li>
          <li>Believing you are &ldquo;due&rdquo; a win.</li>
        </ul>
        <p>
          None of this means you have a problem. All of it means it is worth
          stopping to think.
        </p>
      </>
    ),
  },
  {
    id: "control",
    title: "Staying in control",
    body: (
      <>
        <p>Practical things that help:</p>
        <ul>
          <li>
            Decide before you start what you are willing to lose, and treat it as
            the cost of playing rather than an investment.
          </li>
          <li>Set a time limit and stop when you reach it, win or lose.</li>
          <li>Do not play to recover a loss. It is the single most common trap.</li>
          <li>Do not play when upset, tired or drinking.</li>
          <li>Take regular breaks from competitive play entirely.</li>
          <li>Keep track of what you have actually spent, not what you remember spending.</li>
        </ul>
        <p>
          Your wallet history shows every transaction on your account, permanently
          and in full. Use it — memory is unreliable about this.
        </p>
      </>
    ),
  },
  {
    id: "tools",
    title: "What we offer today — and what we do not yet",
    body: (
      <>
        <p>
          We would rather tell you plainly what exists than imply protections we
          have not built.
        </p>
        <h3>Available now</h3>
        <ul>
          <li>
            <strong>Account restriction on request.</strong> Email us and we will
            block your account from entering leagues or transacting. Say how long
            you want it to last, or ask for it to be permanent.
          </li>
          <li>
            <strong>Full transaction history.</strong> Every credit and debit on
            your account, always visible in your wallet.
          </li>
          <li>
            <strong>Withdraw before kick-off.</strong> You can leave any league
            before it starts and get your entry back in full.
          </li>
        </ul>
        <h3>Not yet built</h3>
        <ul>
          <li>Self-imposed deposit or spending limits.</li>
          <li>Session time limits and reality-check reminders.</li>
          <li>Automated self-exclusion you can trigger yourself, without emailing us.</li>
          <li>Cooling-off periods between leagues.</li>
        </ul>
        <p>
          These are planned and will be in place before the platform accepts real
          money. Until then, restriction by email is the mechanism, and we will
          action it promptly.
        </p>
      </>
    ),
  },
  {
    id: "exclusion",
    title: "How to exclude yourself",
    body: (
      <>
        <p>
          Email <a href={`mailto:${CONTACT.support}`}>{CONTACT.support}</a> from
          the address on your account with the subject{" "}
          <strong>&ldquo;Self-exclusion&rdquo;</strong>, and tell us how long you
          want it to last.
        </p>
        <p>We will:</p>
        <ul>
          <li>restrict the account so it cannot enter leagues or transact;</li>
          <li>
            return any refundable entry from leagues that have not yet started;
            and
          </li>
          <li>confirm by email when it is done.</li>
        </ul>
        <p>
          <strong>We will not reverse a self-exclusion on the same day you ask.</strong>{" "}
          If you ask us to lift it, we will wait at least 24 hours and confirm
          with you before doing anything — the point of the tool is to be harder
          to undo than it was to set.
        </p>
        <p>
          Leagues already under way will continue to their conclusion, because
          other players&rsquo; results depend on them. Any prize is credited to
          your balance as normal.
        </p>
      </>
    ),
  },
  {
    id: "help",
    title: "Where to get help",
    body: (
      <>
        <p>
          If any of this feels close to home, these organisations are free,
          confidential and independent of us.
        </p>
        <h3>United Kingdom</h3>
        <ul>
          <li>
            <strong>National Gambling Helpline</strong> — 0808 8020 133, 24 hours,
            free.
          </li>
          <li>
            <strong>GamCare</strong> — gamcare.org.uk — advice, counselling and
            support groups.
          </li>
          <li>
            <strong>GAMSTOP</strong> — gamstop.co.uk — free self-exclusion across
            licensed British gambling sites.
          </li>
          <li>
            <strong>Gordon Moody</strong> — gordonmoody.org.uk — intensive support
            for severe problems.
          </li>
        </ul>
        <h3>Ireland and the EU</h3>
        <ul>
          <li>
            <strong>Problem Gambling Ireland</strong> — problemgambling.ie.
          </li>
          <li>
            <strong>Gambling Therapy</strong> — gamblingtherapy.org — multilingual
            online support worldwide.
          </li>
        </ul>
        <h3>United States</h3>
        <ul>
          <li>
            <strong>National Problem Gambling Helpline</strong> — call or text
            1-800-GAMBLER, 24 hours.
          </li>
          <li>
            <strong>National Council on Problem Gambling</strong> — ncpgambling.org.
          </li>
        </ul>
        <h3>Nigeria and elsewhere</h3>
        <ul>
          <li>
            <strong>Gamblers Anonymous</strong> — gamblersanonymous.org — meetings
            worldwide, including online.
          </li>
          <li>
            <strong>Gambling Therapy</strong> — gamblingtherapy.org — free online
            support in many languages, wherever you are.
          </li>
        </ul>
        <p>
          If you are in immediate distress, please contact your local emergency
          services or a crisis line in your country.
        </p>
      </>
    ),
  },
  {
    id: "others",
    title: "Worried about someone else",
    body: (
      <>
        <p>
          The organisations above support friends and family too, not just
          players. GamCare and Gambling Therapy both run services specifically for
          people affected by someone else&rsquo;s play.
        </p>
        <p>
          You cannot exclude another adult from their account on their behalf —
          the request has to come from them. But if you are concerned about
          someone on this platform, you can tell us at{" "}
          <a href={`mailto:${CONTACT.support}`}>{CONTACT.support}</a> and we will
          handle it sensitively and confidentially.
        </p>
      </>
    ),
  },
  {
    id: "related",
    title: "Related documents",
    body: (
      <p>
        This policy forms part of our{" "}
        <Link href="/terms">Terms of Service</Link>. See also the{" "}
        <Link href="/rules">Fair Play Rules</Link> and our{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    ),
  },
];

export default function ResponsiblePlayPage() {
  return (
    <LegalPage
      eyebrow="Player Safety"
      title="Responsible Play"
      lastUpdated={TERMS_LAST_UPDATED}
      intro={
        <p>
          Competing for stakes should stay enjoyable. This explains how to keep
          control, what protections exist today, which ones we have not built
          yet, and where to get independent help.
        </p>
      }
      sections={SECTIONS}
    />
  );
}

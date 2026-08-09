import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT, RULES_LAST_UPDATED, formatPolicyDate } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Fair Play Rules",
  description:
    "Match conduct, result reporting, disputes, anti-cheat verification and the penalty ladder.",
};

interface Rule {
  id: string;
  summary: string;
  body: React.ReactNode;
}

const RULES: Rule[] = [
  {
    id: "conduct",
    summary: "Match conduct",
    body: (
      <>
        <p>
          Play the fixture as scheduled, on the platform and settings agreed for
          your division. Both players are responsible for turning up.
        </p>
        <h4>Disconnections</h4>
        <ul>
          <li>
            <strong>Before 5 minutes played</strong> — the match is void and
            replayed from 0-0. Report it as a rematch, not a result.
          </li>
          <li>
            <strong>Between 5 and 75 minutes</strong> — the players should agree
            to replay. If you cannot agree, report separately and it goes to
            review with your evidence.
          </li>
          <li>
            <strong>After 75 minutes played</strong> — the score at the moment of
            disconnection stands.
          </li>
        </ul>
        <p>
          Repeatedly disconnecting while losing is treated as result manipulation,
          not bad luck.
        </p>
        <h4>No-shows</h4>
        <p>
          If your opponent does not appear within 15 minutes of the agreed start,
          report the fixture and submit your evidence. A reviewer decides the
          outcome.
        </p>
      </>
    ),
  },
  {
    id: "reporting",
    summary: "Reporting results",
    body: (
      <>
        <p>
          <strong>Both players report the score independently.</strong> Neither of
          you can see the other&rsquo;s report before submitting, and a report
          cannot be changed once submitted — it is evidence.
        </p>
        <ul>
          <li>
            <strong>Reports agree</strong> — the result is verified immediately
            and counts towards the table.
          </li>
          <li>
            <strong>Reports disagree</strong> — no score is recorded and the match
            goes to human review.
          </li>
          <li>
            <strong>Only one player reports</strong> — the match waits. It is not
            decided by default.
          </li>
        </ul>
        <p>
          Report promptly after the final whistle. Attach a stream or VOD link
          where you have one; it is the single most useful thing you can do to
          make a dispute resolvable in your favour.
        </p>
      </>
    ),
  },
  {
    id: "disputes",
    summary: "Disputes and review",
    body: (
      <>
        <p>
          Raise a dispute from the Match Room if a result does not reflect what
          happened. File within <strong>15 minutes</strong> of the match ending
          while the evidence is fresh. We aim to resolve within{" "}
          <strong>48 hours</strong>.
        </p>
        <p>Say what happened and attach evidence. A reviewer will either:</p>
        <ul>
          <li>
            <strong>confirm a score</strong> — recording the result they judge
            correct on the evidence; or
          </li>
          <li>
            <strong>void the match</strong> — it counts for neither player and
            disappears from the table.
          </li>
        </ul>
        <p>
          Both players&rsquo; original reports are preserved either way. Every
          decision is written to an audit log with the reviewer&rsquo;s identity
          and reasoning. A reviewer&rsquo;s decision is final for competition
          purposes.
        </p>
        <p>
          Filing dishonest disputes to stall or harass an opponent is itself a
          breach of these rules.
        </p>
      </>
    ),
  },
  {
    id: "anti-cheat",
    summary: "How results are verified",
    body: (
      <>
        <p>
          We will be straight with you about how verification works, because
          knowing it is what lets you protect yourself.
        </p>
        <p>
          <strong>
            There is no automated feed of match data from the game publisher.
          </strong>{" "}
          No third party tells us what happened in your match. Anyone claiming
          otherwise — including any marketing that has said so — is wrong, and we
          would rather correct it than trade on it.
        </p>
        <p>Verification therefore rests on three things:</p>
        <ol>
          <li>
            <strong>Two independent reports.</strong> Agreement between two people
            who cannot see each other&rsquo;s answer, and who each lose by lying
            if the other is honest, is strong evidence. Disagreement is caught
            automatically and always escalates.
          </li>
          <li>
            <strong>Evidence you supply.</strong> Stream and VOD links attached to
            a match are what a reviewer actually watches. A match with a VOD is
            far more likely to be resolved correctly than one without.
          </li>
          <li>
            <strong>Human review.</strong> A person weighs the evidence and
            decides, and their decision and reasoning are recorded permanently.
          </li>
        </ol>
        <p>
          The practical consequence: <strong>stream or record your matches</strong>.
          It is the difference between a dispute you can win and one that comes
          down to two conflicting accounts.
        </p>
      </>
    ),
  },
  {
    id: "prohibited",
    summary: "Prohibited behaviour",
    body: (
      <>
        <ul>
          <li>
            <strong>Result-fixing</strong> — agreeing an outcome, or throwing a
            match for any reason.
          </li>
          <li>
            <strong>Account sharing and boosting</strong> — letting anyone else
            play on your account, or playing on someone else&rsquo;s.
          </li>
          <li>
            <strong>Smurfing</strong> — a second account to enter a division below
            your standard.
          </li>
          <li>
            <strong>Cheating</strong> — mods, trainers, exploits, or anything that
            alters game behaviour.
          </li>
          <li>
            <strong>Falsifying evidence</strong> — editing a score, doctoring a
            clip, or submitting a link that is not your match.
          </li>
          <li>
            <strong>Abuse</strong> — harassment, threats or discrimination toward
            a player, reviewer or member of staff.
          </li>
          <li>
            <strong>Deliberate disconnection</strong> — quitting to avoid a loss.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "streaming",
    summary: "Streaming requirements",
    body: (
      <>
        <p>
          Streaming is optional in most divisions and expected in the highest
          ones. Where you do stream, these standards make your footage usable as
          evidence:
        </p>
        <ul>
          <li>
            <strong>720p60 or better</strong>, at roughly 4,500 kbps — the
            scoreboard and clock must be legible.
          </li>
          <li>
            <strong>Controller input overlay</strong> visible where your division
            requires it.
          </li>
          <li>
            <strong>Keep VODs public for at least 14 days</strong> after the
            match. A VOD that has been deleted cannot support your case.
          </li>
          <li>
            <strong>No private or subscriber-only streams</strong> for competitive
            matches — reviewers must be able to watch them.
          </li>
          <li>Stream the full match, uncut, including the result screen.</li>
        </ul>
        <p>
          Link your channel in Settings so your matches appear on the Watch page.
        </p>
      </>
    ),
  },
  {
    id: "penalties",
    summary: "Penalty ladder",
    body: (
      <>
        <p>
          Penalties escalate with severity and repetition. A first honest mistake
          is treated differently from deliberate cheating.
        </p>
        <div className="tx-wrap">
          <table className="tx-table">
            <thead>
              <tr>
                <th>Tier</th>
                <th>Penalty</th>
                <th>Typically applied for</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>
                  <strong>Formal warning</strong>
                </td>
                <td>
                  First minor breach — late reporting, an unexplained
                  disconnection, poor conduct in chat.
                </td>
              </tr>
              <tr>
                <td>2</td>
                <td>
                  <strong>−150 points</strong>
                </td>
                <td>
                  Repeat minor breaches, repeated disconnections while losing, or
                  a dishonest dispute.
                </td>
              </tr>
              <tr>
                <td>3</td>
                <td>
                  <strong>Seasonal ban</strong>
                </td>
                <td>
                  Account sharing, smurfing, falsified evidence, or serious abuse.
                  Entries are forfeited.
                </td>
              </tr>
              <tr>
                <td>4</td>
                <td>
                  <strong>Permanent ban</strong>
                </td>
                <td>
                  Result-fixing, cheating software, or repeat tier-3 breaches. All
                  entries and prizes arising are forfeited.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          We take context into account and will tell you what we found and why. To
          appeal, email{" "}
          <a href={`mailto:${CONTACT.support}`}>{CONTACT.support}</a> within 14
          days.
        </p>
      </>
    ),
  },
];

export default function RulesPage() {
  return (
    <main className="app-main legal">
      <header className="lg-head">
        <span className="eyebrow">Fair Play Center</span>
        <h1>Competitive Integrity First</h1>
        <div className="legal-intro">
          <p>
            Every player deserves to know a result was decided by how well they
            played. These rules explain how matches are conducted, how results
            are verified, and what happens when someone breaks them.
          </p>
        </div>
        <p className="legal-updated">
          Last updated{" "}
          <time dateTime={RULES_LAST_UPDATED}>
            {formatPolicyDate(RULES_LAST_UPDATED)}
          </time>
        </p>
      </header>

      <div className="rules-list">
        {RULES.map((rule, i) => (
          <details key={rule.id} id={rule.id} className="rule" open={i === 0}>
            <summary>
              <span className="rule-n">{String(i + 1).padStart(2, "0")}</span>
              <span className="rule-title">{rule.summary}</span>
              <span className="rule-chev" aria-hidden>
                ▾
              </span>
            </summary>
            <div className="rule-body legal-prose">{rule.body}</div>
          </details>
        ))}
      </div>

      <section className="rules-foot">
        <p>
          These rules form part of our <Link href="/terms">Terms of Service</Link>
          . See also <Link href="/responsible-play">Responsible Play</Link>.
        </p>
        <p>
          Something not covered here? Email{" "}
          <a href={`mailto:${CONTACT.support}`}>{CONTACT.support}</a>.
        </p>
      </section>
    </main>
  );
}

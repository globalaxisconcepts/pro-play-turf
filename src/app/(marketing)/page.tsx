import Link from "next/link";
import { PassCard } from "@/components/ui/PassCard";

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <header className="hero">
        <div className="hero-bg">
          <div className="pitch" />
          <div className="circle" />
          <div className="circle two" />
          <div className="scrim" />
        </div>
        <div className="hero-in">
          <span className="eyebrow">1v1 · EA Sports FC</span>
          <h1 style={{ marginTop: 16 }}>
            Dominate
            <span className="l2">
              <span className="hl">The Turf</span>
            </span>
          </h1>
          <p className="sub">
            Enter skill-based leagues, stream every match for total
            transparency, and get paid the moment you finish on top. No luck.
            Just play.
          </p>
          <div className="hero-cta">
            <Link href="/signup" className="btn btn-primary btn-lg">
              Play Now — It&apos;s Free
            </Link>
            <Link href="/#how" className="btn btn-ghost btn-lg">
              See How It Works
            </Link>
          </div>
          <div className="chip">
            <span className="tick">✓</span> Certified Cross-Play · PS5 · Xbox ·
            PC
          </div>
          <div className="partners">
            <span className="lbl">Integrated with</span>
            <span>YouTube</span>
            <span>Twitch</span>
            <span>EA Sports</span>
          </div>
          <div className="stats rv">
            <div className="stat gold">
              <div className="n" data-count="250">
                $0
              </div>
              <div className="k">Paid Out (K)</div>
            </div>
            <div className="stat">
              <div className="n" data-count="18">
                0
              </div>
              <div className="k">Active Players (K)</div>
            </div>
            <div className="stat">
              <div className="n" data-count="100" data-suffix="%">
                0%
              </div>
              <div className="k">Dispute Resolution</div>
            </div>
            <div className="stat">
              <div className="n">Top 3</div>
              <div className="k">Get Paid Every League</div>
            </div>
          </div>
        </div>
      </header>

      {/* HOW IT WORKS */}
      <section className="section alt" id="how">
        <div className="wrap">
          <div className="head center rv">
            <span className="eyebrow">How It Works</span>
            <h2>Your Path to Glory</h2>
            <p className="sub">
              Three steps from lobby to payout. The platform handles
              verification, streaming, and prizes — you just win.
            </p>
          </div>
          <div className="grid3">
            <div className="card rv">
              <div className="ic">🎮</div>
              <span className="step-no">STEP 01</span>
              <h3 style={{ marginTop: 6 }}>Join a League</h3>
              <p>
                Pick a division that matches your skill. Start free, or buy into
                paid leagues with real prize pools.
              </p>
            </div>
            <div className="card cyan rv">
              <div className="ic">📡</div>
              <span className="step-no">STEP 02</span>
              <h3 style={{ marginTop: 6 }}>Play Live</h3>
              <p>
                Stream each match to Twitch or YouTube. Our AI and game data
                verify every result automatically.
              </p>
            </div>
            <div className="card gold rv">
              <div className="ic">🏆</div>
              <span className="step-no">STEP 03</span>
              <h3 style={{ marginTop: 6 }}>Rank &amp; Earn</h3>
              <p>
                Climb the table. Finish top-three and the prize pool hits your
                wallet — withdraw instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MONETIZE */}
      <section className="section" id="leagues">
        <div className="wrap">
          <div className="split">
            <div className="rv">
              <span className="eyebrow">For Serious Gamers</span>
              <h2
                style={{
                  fontSize: "clamp(28px,4.4vw,48px)",
                  marginTop: 14,
                  textTransform: "uppercase",
                }}
              >
                Monetize Your God-Tier Skills
              </h2>
              <p
                style={{
                  color: "var(--t2)",
                  margin: "16px 0 26px",
                  fontSize: 16,
                }}
              >
                Your ranked grind should pay. Pro Play Turf turns wins into
                withdrawable earnings.
              </p>
              <div className="feat">
                <div className="fic">💰</div>
                <div>
                  <h3>Top-3 Payout Model</h3>
                  <p>
                    Every league pays its top three finishers from the pooled
                    buy-ins.
                  </p>
                </div>
              </div>
              <div className="feat">
                <div className="fic">📺</div>
                <div>
                  <h3>Stream &amp; Earn Revenue</h3>
                  <p>
                    Grow an audience while you compete — your matches are the
                    content.
                  </p>
                </div>
              </div>
              <div className="feat">
                <div className="fic">⚡</div>
                <div>
                  <h3>Instant Withdrawals</h3>
                  <p>
                    Cash out winnings the moment a match is verified. No waiting
                    periods.
                  </p>
                </div>
              </div>
            </div>
            <div className="wallet rv">
              <div className="wlab">Available Balance</div>
              <div className="wbal">
                <small>$</small>1,248<small>.50</small>
              </div>
              <div className="wrow">
                <span className="wsub">In escrow · $50.00</span>
                <span className="badge-up">▲ +$320 this week</span>
              </div>
              <div className="spark">
                <i style={{ height: "40%" }} />
                <i style={{ height: "55%" }} />
                <i style={{ height: "35%" }} />
                <i style={{ height: "70%" }} />
                <i style={{ height: "60%" }} />
                <i style={{ height: "85%" }} />
                <i style={{ height: "72%" }} />
                <i style={{ height: "100%" }} />
              </div>
              <div className="wtx">
                <span>Elite Premier — 1st place</span>
                <b className="pos">+$420.00</b>
              </div>
              <div className="wtx">
                <span>Instant withdrawal</span>
                <b>-$200.00</b>
              </div>
              <div className="wtx">
                <span>Contender League — buy-in</span>
                <b>-$10.00</b>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LEAGUE STRUCTURE */}
      <section className="section alt" id="champions">
        <div className="wrap">
          <div className="head rv">
            <span className="eyebrow gold">League Structure</span>
            <h2>
              Fight for Promotion.
              <br />
              Play for Payouts.
            </h2>
            <p className="sub" style={{ marginLeft: 0 }}>
              Every season you climb or you fall. Reach the top and the
              invite-only Champions League — and its five-figure pool — opens up.
            </p>
          </div>
          <div className="split" style={{ marginTop: 40 }}>
            <div className="league-hi rv">
              <span className="eyebrow gold">Champions League · Invite Only</span>
              <div className="pool" style={{ marginTop: 10 }}>
                $15,000
              </div>
              <div style={{ color: "var(--t2)", fontSize: 14 }}>
                Season prize pool · Elite Tier · Top 4 qualify
              </div>
              <Link
                href="/#leagues"
                className="btn btn-gold"
                style={{ marginTop: 22 }}
              >
                View All Leagues
              </Link>
            </div>
            <div className="pr-grid rv">
              <div className="pr up">
                <div className="arr">▲</div>
                <h3>Promotion</h3>
                <p>
                  Finish in the top 3 of your division and move up a tier next
                  season — bigger pools, tougher opponents.
                </p>
              </div>
              <div className="pr dn">
                <div className="arr">▼</div>
                <h3>Relegation</h3>
                <p>
                  Bottom 3 drop a division. Complacency costs you. Every match on
                  the table matters.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAIR PLAY */}
      <section className="section" id="scores">
        <div className="wrap">
          <div className="head center rv">
            <span className="eyebrow cyan">Fair Play</span>
            <h2>Zero Tolerance</h2>
            <p className="sub">
              Three layers of verification stand between the table and the truth.
              Cheaters don&apos;t last a season here.
            </p>
          </div>
          <div className="grid3">
            <div className="card cyan rv">
              <div className="ic">🛡️</div>
              <h3>API Validation</h3>
              <p>
                Reported scores are checked against match data pulled from the
                game itself. Mismatches get flagged instantly.
              </p>
            </div>
            <div className="card cyan rv">
              <div className="ic">🤖</div>
              <h3>AI Match Detection</h3>
              <p>
                Every stream is watched by detection models tracking the
                scoreboard, disconnects, and irregular play in real time.
              </p>
            </div>
            <div className="card cyan rv">
              <div className="ic">⚖️</div>
              <h3>Active Tribunal</h3>
              <p>
                A 24/7 human review team resolves every dispute with the VOD in
                hand. No result stands unchecked.
              </p>
            </div>
          </div>
          <div className="fp-stat rv">
            <div className="n" data-count="100" data-suffix="%">
              0%
            </div>
            <div className="k">
              Dispute Resolution Rate · Every Case, Every Season
            </div>
          </div>
        </div>
      </section>

      {/* DIGITAL ASSETS / PASS CARDS */}
      <section className="section alt">
        <div className="wrap">
          <div className="head center rv">
            <span className="eyebrow gold">Digital Assets</span>
            <h2>Mint, Trade &amp; Surrender Cards</h2>
            <p className="sub">
              Access Passes are your key to premium divisions. Earn them, trade
              them on the marketplace, or surrender one to climb.
            </p>
          </div>
          <div className="passes">
            <PassCard
              className="rv"
              tier="champions"
              tierWord="Champions"
              qualifier="League Pass"
              name="Champions League Pass"
              faceValue="$150.00"
              serial="Q0HBTVBJT0"
              status="owned"
            />
            <PassCard
              className="rv"
              tier="elite"
              tierWord="Elite"
              qualifier="Premier"
              name="Elite Premier Pass"
              faceValue="$50.00"
              serial="RUXJVEVQUK"
              status="listed"
            />
            <PassCard
              className="rv"
              tier="advanced"
              tierWord="Advanced"
              qualifier="Conference"
              name="Advanced Conference Pass"
              faceValue="$25.00"
              serial="QURWQ0FEVg"
              status="owned"
            />
            <PassCard
              className="rv"
              tier="intermediate"
              tierWord="Interm."
              qualifier="Regional"
              name="Intermediate Regional Pass"
              faceValue="$10.00"
              serial="SU5UUkVHSU8"
              status="reserved"
            />
          </div>
          <div className="mini-steps">
            <div className="ms rv">
              <div className="msn">MINT &amp; ENTER</div>
              <h3>Mint &amp; Enter</h3>
              <p>Place top-three and mint a Pass to unlock the next division up.</p>
            </div>
            <div className="ms rv">
              <div className="msn">SURRENDER TO CLIMB</div>
              <h3>Surrender to Climb</h3>
              <p>Burn a Pass to fast-track your promotion into premium leagues.</p>
            </div>
            <div className="ms rv">
              <div className="msn">TRADE FOR VALUE</div>
              <h3>Trade for Value</h3>
              <p>
                List Passes on the marketplace and sell to other players for real
                balance.
              </p>
            </div>
          </div>
          <div className="center" style={{ marginTop: 40 }}>
            <Link href="/#leagues" className="btn btn-gold btn-lg">
              Visit the Store
            </Link>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="section">
        <div className="wrap">
          <div className="cta-band rv">
            <span className="eyebrow">Season is Live</span>
            <h2 style={{ marginTop: 12 }}>
              Ready to Stake
              <br />
              Your Turf?
            </h2>
            <p className="sub">
              Create a free account, link your EA ID, and drop into your first
              league in under two minutes.
            </p>
            <Link href="/signup" className="btn btn-primary btn-lg">
              Create Free Account
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

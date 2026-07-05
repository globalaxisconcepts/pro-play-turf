# Pro Play Turf — Page Build Queue (finish the design)

> Hand this to the design/build agent and work **top to bottom**. Every page from the design brief is accounted for here.
> Pairs with: the landing page (visual reference + tokens), `proplayturf-design-brief.md` (§5 has full per-page detail), and `proplayturf-wiring-prompt.md` (behavior).
> **Goal: complete every page below before moving to the builder.**

---

## Global rules (apply to every page)

1. **No placeholder / "coming soon" / "next in build queue" screens.** Build each page in full. Placeholders are only allowed if explicitly requested.
2. **Use the landing page's visual system and tokens exactly** (colors, fonts — Archivo/Chakra Petch/Inter — spacing, radii, glows). No new visual language.
3. **Reuse shared components**, don't fork them: nav (logged-out + logged-in), footer, buttons, badges, Pass Card, League Card, Match Room card, Standings table, Bracket, Stream card, Wallet widget, modals, toasts.
4. **Every page: desktop + mobile** (test to 360px).
5. **Include the states** listed per page (default / loading / empty / error / success) and the modals/confirms it triggers.
6. **Keep nav + footer** on every page; highlight the active nav item.
7. Full section-by-section detail for any page is in **design brief §5** — this queue is the ordered summary to work from.

**Definition of done (per page):** built in full · matches landing look · desktop + mobile · required states present · CTAs wired to the right destinations · uses shared components · keyboard focus + AA contrast + reduced-motion respected.

---

## The queue

### ✅ Reference (already done)
- [x] **Home / Landing** (`/`) — the aesthetic lock. Everything else matches this.

### Phase A — Public shell (build first: what a visitor hits)
- [ ] A1. Champions League (`/champions-league`)
- [ ] A2. Leagues browse (`/leagues`)
- [ ] A3. League detail (`/leagues/[id]`)
- [ ] A4. How It Works (`/how-it-works`)
- [ ] A5. Scores (`/scores`)
- [ ] A6. Bracket / Leaderboards (`/champions-league/bracket`)
- [ ] A7. Watch (`/watch`)
- [ ] A8. Store (`/store`) + Pass detail (`/store/[passId]`)
- [ ] A9. Rules (`/rules`)

### Phase B — Auth & onboarding
- [ ] B1. Sign Up (`/signup`)
- [ ] B2. Sign In (`/signin`)
- [ ] B3. Onboarding wizard (`/onboarding`)
- [ ] B4. Logged-in nav + wallet chip + notifications + avatar menu (shared surface)

### Phase C — Authed app
- [ ] C1. Dashboard (`/dashboard`)
- [ ] C2. Wallet (`/wallet`)
- [ ] C3. Match Room (`/matches/[id]`)
- [ ] C4. Profile — owner + public (`/profile`, `/u/[gamertag]`)
- [ ] C5. Notifications (`/notifications` + dropdown)
- [ ] C6. Settings (`/settings`)

### Phase D — System, support, legal, utility
- [ ] D1. Support (`/support`)
- [ ] D2. Contact (`/contact`)
- [ ] D3. Legal — Terms / Privacy / Responsible Play
- [ ] D4. Utility — 404, 500, Maintenance, Email-verify, Password-reset, Age-gate
- [ ] D5. Transactional email templates

### Phase E — Admin (internal — can follow, not a launch blocker)
- [ ] E1. Admin shell — reviews, disputes, seasons, cards, payouts, users, audit log

---

## Per-page instructions

> Each: build in full, landing look, keep nav/footer, include the noted states. Detail = brief §5.

### A1 — Champions League (`/champions-league`)
Prestige page. Eyebrow "Sponsor-Backed Tournament" → headline "Champions League" → subhead "Zero buy-in, ultimate glory." Hero pairs two Pass Cards (QUALIFIED · $0 and INVITE ONLY · $15,000 qualification pass). Stat strip: Prize Pool $15,000 · Status "Elite Verified" · 16 Top Players · Entry "Free" · Format "Knockout" · Qualification "Elite Top 4." Section "The Ultimate Showdown" — three blocks: Qualification (finish top 4 of Elite), Entry & Trade (surrender pass or buy from store), The Prize (winner takes 70% → $10,500). Official partners strip (YouTube · Twitch · EA Sports FC). Primary CTA → bracket. *States: default.*

### A2 — Leagues browse (`/leagues`)
Page header + filter bar (division/tier, buy-in range, status, entry type, search) + sort (prize pool, spots left, start time) + season strip with countdown. Grid of **League Cards** (division badge, buy-in, capacity bar, prize pool, status, promo/relegation hint, Join/View). Card → league detail; Join → confirm-modal flow. *States: default, loading (skeleton grid), empty ("no leagues match — clear filters").*

### A3 — League detail (`/leagues/[id]`)
Header: division + tier badge, buy-in, prize pool (gold), capacity bar, season/countdown, **Join** (confirm modal: debit, escrow note, rules checkbox). Tabs: Standings (promo zone green ▲ / relegation zone red ▼) · Fixtures/Results (Match Room cards) · Prize Breakdown · Rules. Entered vs not-entered variants; your-position highlight; standings row → profile; fixture → match room. *States: default, entered, loading, full-league (Join disabled + waitlist).*

### A4 — How It Works (`/how-it-works`)
Eyebrow "The Playbook" → headline "From Lobby to Legend." Six alternating step modules, each with a UI mockup: 01 Setup & Verification (EA + Twitch link, 12ms ping chip) · 02 Join a Tier League (Elite $50 / Contender $10 / Amateur Free) · 03 Play & Report (Match Room mockup, "Match Verified") · 04 Stream & Validate ("AI Detection Active" panel, LIVE 1.2k) · 05 Mint Your Access Pass (Pass Cards) · 06 Climb & Conquer ($15,000 pool, instant payouts, promote top 20% / relegate bottom 20%). Closing CTA band → signup. *States: default.*

### A5 — Scores (`/scores`)
Broadcast live board. Segmented control: Live · Upcoming · Completed. Featured live match hero (larger card + Watch). Auto-refreshing grid of Match Room cards (live score, minute, LIVE pulse, viewers). Filters by league/division. Timezone-aware. Subtle "updating" indicator. *States: default, live-populated, empty ("no matches — check upcoming"), loading.*

### A6 — Bracket / Leaderboards (`/champions-league/bracket`)
Full knockout **Bracket** (Ro16 → Final → Champion crowned gold) + season **Leaderboards** table; toggle bracket ↔ standings. Bracket node → match detail/watch; leaderboard row → profile. Live nodes pulse. Mobile: horizontal scroll + minimap. *States: default, live, pre-season empty.*

### A7 — Watch (`/watch`)
Tabs Live / VODs. Optional featured embedded player + side rail (up-next/chat). Grid of **Stream Cards** (thumbnail, LIVE badge + viewers, streamer, league context, platform glyph). VOD variant: duration, date, view count, sort. Filters by league/division/platform. *States: default, live-populated, empty ("no live matches — browse VODs"), loading.*

### A8 — Store (`/store`) + Pass detail (`/store/[passId]`)
Toggle: My Passes / Marketplace. Filters: tier, price range, status. Grid of Pass Cards. **Pass detail**: full art, tier, face value, market price, serial, owner, price history, actions — Buy (confirm modal: price, fee, balance; insufficient → deposit branch) · List for sale (set price) · Surrender to rank up (irreversible confirm) · Cancel listing. Wallet balance + fee shown. *States: default, my-passes, marketplace, first-time empty ("how to earn a card"), loading.*

### A9 — Rules (`/rules`)
Eyebrow "Fair Play Center" → headline "Competitive Integrity First." Accordions: Match Conduct (disconnect <5min → rematch 0-0; >75min → score stands) · Reporting Disputes (file ≤15 min; resolve ≤48h) · Anti-Cheat Verification (Server Check → VOD Review → Validation) · Penalty Ladder (4-tier table: Warning → −150 pts → Seasonal Ban → Lifetime Ban) · Stream Requirements (720p60 @ 4500kbps, controller overlay, VODs public 14 days, "Download OBS Preset" button). Last-updated date + support link. *States: default.*

### B1 — Sign Up (`/signup`)
Split layout: form left on `--surface-1`, cinematic panel right with rotating trust stats. Fields: email, password (strength meter), username/gamertag, region select, DOB/age-gate, terms + responsible-play checkboxes; OAuth/EA option. Submit → `/onboarding`. *States: default, inline validation errors, submitting, success.*

### B2 — Sign In (`/signin`)
Email/password, remember me, forgot-password link, OAuth. Success → return-to/`/dashboard`. *States: default, error (bad credentials), submitting; forgot-password sub-flow → reset request → confirmation.*

### B3 — Onboarding wizard (`/onboarding`)
Progress indicator + 4 steps: (1) link EA ID, (2) link streaming account, (3) connection/latency check (mirrors How-It-Works 01), (4) choose first league / claim free entry. Back between steps, skip/later, complete → dashboard or chosen league. *States: per-step default, connecting, error, complete.*

### B4 — Logged-in shell
Build the logged-in nav variant: My Leagues · Watch · Store added; wallet balance chip (→ wallet); + Deposit (opens modal); notifications bell + dropdown; avatar menu (Dashboard, My Leagues, Wallet, Store, Profile, Settings, Log Out). Mobile bottom bar swaps a tab for Wallet. This surface is reused across all Phase C pages.

### C1 — Dashboard (`/dashboard`)
Personalized greeting. Cards: wallet balance + quick Deposit/Withdraw; My Active Leagues (rank + next fixture); upcoming matches; recent results; owned Passes strip; season countdown; promotion/relegation alert; notifications preview; "Find a league" CTA. *States: default, first-time empty (no leagues yet → onboarding nudge), loading.*

### C2 — Wallet (`/wallet`)
Balance hero (Available / In-Escrow). Deposit + Withdraw actions (gateway deferred → provider-agnostic UI: amount chips + custom, method placeholder, review, success). Transaction history table (date, type, ± amount, status, ref) with filters/pagination. Earnings summary + chart with range toggle. Withdrawal KYC-prompt state. *States: default, zero-balance empty, loading, deposit modal, withdraw (KYC-gated) modal.*

### C3 — Match Room (`/matches/[id]`)
Opponent info + connect instructions; live score entry (both players submit); proof upload (screenshot / stream URL); embedded stream + "AI Detection Active" panel; verify/dispute buttons; countdown. *States: Scheduled, Live, Awaiting-opponent (you submitted), Verified ✓, Under Review, Disputed — each wired with next-step + timeline.*

### C4 — Profile (`/profile`, public `/u/[gamertag]`)
Avatar, gamertag, platform, tier/division, career stats (W/L, win rate, goals, earnings), trophy + Pass collection, current leagues, recent VODs, streaming links. Owner view: edit avatar/bio/linked accounts (→ settings). Public view: follow, VODs → watch. *States: owner, public, empty (new player, no stats yet).*

### C5 — Notifications (`/notifications` + dropdown)
Items grouped by day (match scheduled/started, result verified/disputed, promotion/relegation, prize paid, card sold, league starting soon, system). Read/unread, filters, mark-all-read, item → deep link. Both the dropdown (from bell) and full page. *States: default, unread, empty ("you're all caught up").*

### C6 — Settings (`/settings`)
Tabs: Account (email, password, delete → destructive confirm) · Profile (avatar, bio, gamertag) · Connections (EA/Twitch/YouTube/Discord connect/disconnect states) · Payments (methods, payout details, KYC status) · Notifications (per-event email/push toggles) · Privacy (visibility, data export) · Responsible Play (limits, self-exclusion). *States: default, connected vs disconnected, saving, saved toast.*

### D1 — Support (`/support`)
Search + categories (Account, Payments, Matches & Disputes, Streaming, Cards) + FAQ accordions + "Open a ticket" form + ticket status. *States: default, search results, no-results, ticket-submitted.*

### D2 — Contact (`/contact`)
Form (name, email, topic, message) + response-time note + socials/Discord. *States: default, validation errors, submitted.*

### D3 — Legal (Terms `/terms`, Privacy `/privacy`, Responsible Play `/responsible-play`)
Long-form readable template: sticky ToC/section nav, generous measure, last-updated date, clear headings. Themed dark, neutral. One layout, three content instances. *States: default.*

### D4 — Utility pages
404 (on-brand "Off the pitch" + search + Back Home) · 500/error (retry) · Maintenance ("Pitch under maintenance") · Email-verify landing (→ continue) · Password-reset (request + set-new + confirmation) · Age-gate interstitial (confirm/exit). *States: as applicable per page.*

### D5 — Transactional email templates
Dark-branded templates, consistent header (wordmark) + body card + single primary CTA + footer (legal + unsubscribe): welcome/verify, match scheduled, result verified, dispute update, promotion/relegation, prize paid, withdrawal status, card sold, password reset, weekly digest.

### E1 — Admin shell (internal — after public/app)
Sidebar dashboard reusing the library: review queue (matches w/ proof/VOD), disputes tribunal, seasons/divisions/leagues config, card-type management, payouts approval, users/KYC/bans, audit log, metrics. Utilitarian dark. Not a launch blocker for the public design, so it trails Phases A–D.

---

## When the queue is clear

Every box above ticked = the design is complete and internally consistent. **Then** hand off to the builder using `proplayturf-build-handover.md` (CLAUDE.md) + the architecture doc. Do not start the builder on pages that are still placeholders — finish the design queue first.

# Pro Play Turf — Master Design Brief (Replica-Grade, Detailed)

> A complete visual + UX specification for a design agent to produce a near-replica of the reference platform's look and feel, rebranded as **Pro Play Turf** (`proplayturf.com`).
> **Brand:** Pro Play Turf · short forms: "Pro Play Turf", "PPT", handle `@proplayturf`.
> **Foundation from the reference:** dark-navy theme (`#050b17`), competitive esports energy, promotional "Pass" cards as the signature component, promotion/relegation league structure, streaming-first fair play, top-3 / Champions payout economics.
> **Copy in this brief is illustrative placeholder** written in the correct tone — the agent should treat it as voice guidance, not final strings.

---

## 0. How to use this brief

Work in this sequence:
1. **Brand + tokens** (§1–2) — lock identity, palette, type, spacing before any screen.
2. **Global shell** (§3) — nav, footer, section scaffolding.
3. **Component library** (§4) — build the **Pass Card** first; it defines the entire visual language.
4. **Pages** (§5) — compose from components; deliver desktop + mobile.
5. **States, motion, a11y, assets** (§6–10).

Deliverables and file structure are in §11. A "reads-as-replica" fidelity checklist is in §12.

---

## 1. Brand identity — Pro Play Turf

**Name meaning & concept.** "Turf" = the pitch, the grass, your territory. "Pro Play" = elite competitive play. Together: *the professional arena where players stake their turf.* Lean into **pitch-green energy, territory/ownership, and broadcast prestige**. The brand should feel like a nocturnal floodlit stadium meets a fintech earnings app.

**Positioning.** Premium competitive EA Sports FC. Confident, high-stakes, elite, trustworthy. Not cartoonish — sharp, dark, cinematic, broadcast-grade.

**Personality:** elite · electric · disciplined (fair play) · rewarding · nocturnal.

**Wordmark.** "Pro Play Turf" set in a bold wide/condensed grotesque. Options for the agent to explore:
- Stacked lockup with "TURF" emphasized (heavier weight or green fill), "PRO PLAY" as a smaller kicker above.
- Inline lockup "PRO PLAY **TURF**" with the last word carrying the accent color or a turf-blade motif dotting a letter.
- Monogram **PPT** for favicon / app icon / compact nav — consider three angled turf blades or a stadium-arch mark.

**Logo motif ideas.** Turf blades, a pitch centre-circle/centre-line, floodlight glow, an upward promotion chevron, a hexagonal "verified" badge. Keep one primary mark + one monogram + one horizontal lockup.

**Clear space & sizing.** Minimum clear space = height of the "T" in Turf on all sides. Minimum wordmark width 120px desktop / 96px mobile. Provide light-on-dark (primary), mono white, mono black, and single-color green variants.

**Tagline options (pick/adapt):** "Stake Your Turf." · "Where Pros Play for Keeps." · "Play. Prove. Profit." Footer mission line: "The premier arena for competitive EA Sports FC."

---

## 2. Design tokens (source of truth)

### 2.1 Color — palette
Base is confirmed from the reference; accents are the recommended Pro Play Turf direction (neon-on-dark, turf-green led).

```
/* Surfaces */
--bg:              #050B17   /* app background, confirmed */
--surface-1:       #0B1424   /* cards / nav on scroll */
--surface-2:       #0E1A2E   /* elevated cards */
--surface-3:       #132238   /* hover / raised */
--overlay-scrim:   linear-gradient(180deg, rgba(5,11,23,0) 0%, #050B17 92%)

/* Lines */
--border:          rgba(255,255,255,0.08)
--border-strong:   rgba(255,255,255,0.14)
--border-accent:   rgba(61,255,136,0.35)

/* Brand accents */
--primary:         #3DFF88   /* TURF GREEN — primary action, energy */
--primary-hover:   #2FE578
--primary-press:   #23C86A
--primary-ink:     #04210F   /* text on green */
--accent:          #38BDF8   /* AZURE — trust, links, verification */
--gold:            #F6C453   /* REWARD — prize pools, premium tiers */
--gold-deep:       #E8A93B
--live:            #FF4D4D   /* LIVE, errors, relegation */
--warning:         #FFB020

/* Text */
--text-1:          #F4F7FB
--text-2:          #9FB0C6
--text-3:          #63748C
--text-on-gold:    #1A1204

/* Tier ramp (divisions & passes) */
--tier-amateur:      #7C8AA0   /* slate */
--tier-intermediate: #C08457   /* bronze */
--tier-advanced:     #C9D2DE   /* silver */
--tier-elite:        #F6C453   /* gold */
--tier-champions:    conic/iridescent (violet #A78BFA → cyan #38BDF8 → gold #F6C453)
```

**Usage rules (do / don't).**
- Green = **action & positive/promotion** only. Don't flood large areas with it; use for CTAs, active states, promotion zones, live-positive.
- Gold = **money & prestige** (prize pools, Champions, face value, elite tier). Don't use gold for generic buttons.
- Cyan = **information, links, verification, focus rings**.
- Red = **live indicator, relegation, destructive/error** — never as a normal accent.
- Keep 90% of surface area in the navy/graphite range; accents are punctuation.

### 2.2 Typography
- **Display (headlines/eyebrows):** wide/condensed bold grotesque — e.g. **Clash Display / Druk Wide / Anton / Archivo Expanded**. Headlines are oversized, tight leading, frequently two lines with the 2nd line offset or double-spaced.
- **Body/UI:** **Inter / Geist / Satoshi** (neo-grotesque, high legibility on dark).
- **Numeric/technical:** tabular figures; a techy face (**Chakra Petch / Rajdhani / mono**) for scores, ping, serials, prize figures.

**Type scale (desktop → mobile):**

| Token | Font | Size px | Line | Weight | Tracking | Case |
|---|---|---|---|---|---|---|
| display-xl (hero) | Display | 88 → 44 | 0.95 | 800 | -0.02em | Title |
| display-lg | Display | 64 → 36 | 1.0 | 800 | -0.01em | Title |
| h2 section | Display | 48 → 30 | 1.05 | 700 | -0.01em | Title |
| h3 | Display | 32 → 24 | 1.1 | 700 | 0 | Title |
| eyebrow | Body | 13 → 12 | 1.2 | 600 | 0.16em | UPPER |
| lead | Body | 20 → 17 | 1.5 | 400 | 0 | — |
| body | Body | 16 | 1.6 | 400 | 0 | — |
| body-sm | Body | 14 | 1.5 | 400 | 0 | — |
| caption | Body | 13 | 1.4 | 500 | 0.02em | — |
| stat-xl | Numeric | 56 → 40 | 1.0 | 700 | 0 | — |
| label/badge | Body | 11 | 1 | 700 | 0.08em | UPPER |
| serial code | Mono | 12 | 1.2 | 500 | 0.1em | UPPER |

### 2.3 Spacing, grid, radii, elevation
```
--space: 2,4,8,12,16,20,24,32,40,48,64,80,96,128 (px)
--container-max: 1280px  --container-pad: 24px (mobile 16px)
--grid: 12 col, gutter 24px desktop / 16px tablet / 12px mobile
--section-py: 96px desktop / 64px tablet / 48px mobile
--radius: sm 8 · md 14 · lg 22 · xl 28 · pill 999
--shadow-card:  0 12px 40px rgba(0,0,0,0.45)
--shadow-pop:   0 20px 60px rgba(0,0,0,0.55)
--glow-primary: 0 0 40px rgba(61,255,136,0.25)
--glow-gold:    0 0 40px rgba(246,196,83,0.22)
--blur-nav: backdrop-blur(14px)
```

### 2.4 Buttons (all states)
- **Primary:** green fill, `--primary-ink` text, radius md/pill, 14px×24px pad, weight 600. Hover: `--primary-hover` + `--glow-primary` + 1px lift. Active: `--primary-press`, no lift. Disabled: 40% opacity, no glow. Focus: 2px cyan ring + 2px offset. Loading: inline spinner + label "Processing…".
- **Secondary (ghost):** transparent, `--border-strong` 1px, white text. Hover: `--surface-2` fill. 
- **Tertiary (text):** white/cyan text, cyan underline on hover.
- **Gold (premium):** gold gradient fill, `--text-on-gold`, for Deposit / Buy Pass / Enter Champions.
- **Destructive:** red text/outline; filled red only for final confirm.
- Sizes: sm 36px, md 44px, lg 52px height. Icon-left optional.

### 2.5 Badges & pills
Small caps, 11px, letter-spaced, tinted bg at 12% of semantic color + 1px border at 24%. Set: `LIVE` (red, pulsing dot) · `OWNED` (green) · `LISTED` (cyan) · `RESERVED` (amber) · `QUALIFIED` (green) · `INVITE ONLY` (gold) · `OPEN` `FILLING` `ENDED` (neutral) · `VERIFIED ✓` (cyan) · `DISPUTED` (amber) · promotion `▲` (green) / relegation `▼` (red).

### 2.6 Form fields
Dark input `--surface-2`, 1px `--border`, radius md, 44px min height, 14–16px text, placeholder `--text-3`. Focus: cyan ring + border. Error: red border + helper text + icon. Success: green check. Labels above field, 13px `--text-2`. Include: text, password (show/hide), select/dropdown, combobox (gamertag search), amount stepper (money), toggle, checkbox, radio cards (tier select), file upload (proof), OTP.

---

## 3. Global shell

### 3.1 Top nav — desktop
- Left: **Pro Play Turf** wordmark (→ home).
- Primary links: **Leagues · Scores · Champions League · How It Works**.
- Right (logged out): **Log In** (ghost) + **Play Now** (primary green).
- Behavior: transparent over hero; on scroll gains `--surface-1` @ 85% + `--blur-nav` + bottom hairline; sticky; 72px tall (64px scrolled).

### 3.2 Top nav — logged in
Add authed links **My Leagues · Watch · Store**. Right cluster: **wallet balance chip** (gold coin + `$0.00`, → wallet), **+ Deposit** (gold), **notifications bell** (badge count), **avatar menu** (Dashboard, My Leagues, Wallet, Store, Profile, Settings, Log Out). Active link = green underline/indicator.

### 3.3 Mobile nav
Top bar: wordmark + Play Now (or wallet chip if logged in). **Bottom tab bar** (fixed, `--surface-1`, hairline top): Home · Leagues · Scores · Champions · **More**. Active tab = green icon + label. "More" opens a sheet: How It Works, Watch, Store, Rules, Support, and account section. Logged-in swaps one tab for **Wallet**.

### 3.4 Footer
Dark, 4 columns + brand block:
- **Brand:** wordmark + mission line + socials (X, YouTube, Twitch, TikTok, Discord).
- **Platform:** Find Leagues · Live & VODs · Champions League · Leaderboards · Tournament Rules · Streaming Guide.
- **Company:** About · Careers · Press · Contact · Support Center.
- **Legal:** Terms of Service · Privacy Policy · Responsible Play · Cookie Settings.
- Bottom bar: `© 2026 Pro Play Turf. All Rights Reserved.` + "Made for the FC Community." + region/language selector.
- Optional trust row: age-gate note (18+/19+ where applicable) + partner logos.

### 3.5 Recurring section pattern
Uppercase **eyebrow** → oversized two-line **headline** → one-sentence **subhead** → content grid → optional CTA. Generous `--section-py`. Alternating background tint (`--bg` ↔ subtle `--surface-1`) to separate sections. Optional faint pitch-line or hex texture in section backgrounds.

---

## 4. Component library

### 4.1 Pass Card — signature component ★
Premium collectible "Official Pass". Feels like a metallic membership / trading card. Used on Home, How It Works, Champions League, Store, Dashboard, Profile.

**Anatomy (top→bottom):**
1. Header: micro-label "Official Pass" + issuer **Pro Play Turf** + **status badge** (OWNED/LISTED/RESERVED/QUALIFIED/INVITE ONLY).
2. "Access Level" caption.
3. **Tier lockup** — two-part: tier word in tier-accent + qualifier beneath (e.g. *Champions / LEAGUE PASS*, *Elite / Premier*, *Advanced / Conference*, *Intermediate / Regional*, *Amateur / Open*).
4. Descriptive name line (e.g. "Champions League Pass").
5. Footer: "Face Value" + amount in gold (`$150.00 USD`) + **serial/hex code** in mono (e.g. `Q0HBTVBJT0`).

**Surface:** tier-tinted gradient, metallic sheen, holographic edge on higher tiers; Champions = iridescent conic. Corner cut or notch detail for "card" feel. Faint guilloché/security texture.
**Dimensions:** ~320×440 desktop, aspect ~5:7; scales to 240×330 in rows.
**States:** default · owned · listed (price + "View in Store") · reserved · qualified · locked/greyed · loading skeleton.
**Interaction:** hover = 3D tilt (max 8°) toward cursor + sheen sweep + `--shadow-pop`. Reduced-motion = static glow only.

### 4.2 League Card
Division badge + name; buy-in (Free / `$10` / `$50` — gold if paid); capacity bar (filled/total, e.g. "14/16"); prize pool (gold stat); status badge; skill-tier chip; promotion/relegation hint (▲ top 3 / ▼ bottom 3); primary **Join** / **View**. Hover lift + border-accent. ~360px wide, responsive grid 3→2→1.

### 4.3 Match Room card
Two player columns (avatar 48px, gamertag, platform glyph) flanking a large **VS** + score numerals; status pill (Scheduled / **LIVE** / Verified ✓ / Under Review / Disputed); optional watch link + viewer count (`1.2k`); timestamp/minute. Compact list variant + expanded featured variant.

### 4.4 Standings / Leaderboard table
Columns: Rank · Player (avatar+tag) · P · W · D · L · GF · GA · GD · **Pts**. Promotion zone (top N) rows tinted green with ▲; relegation zone (bottom N) tinted red with ▼; Champions-qualification zone tinted gold; labeled zone dividers. Sticky header, hairline rows, tabular numerals, rank-movement chips. "Your row" highlighted. Mobile: horizontal scroll or condensed (Rank/Player/Pts + expand).

### 4.5 Bracket
Knockout tree Ro16 → QF → SF → Final → **Champion** (crowned gold). Nodes = mini match cards (seed, score, winner highlighted), connective lines. Horizontal scroll + minimap on mobile. Live nodes pulse.

### 4.6 Stat / metric block
Count-up big number (Numeric font) + label. Examples: `$15,000 POOL`, `100% Dispute Resolution`, `16 Top Players`, `12ms Ping`, `Top 3 Paid`. 3–4 across strip; gold variant for money.

### 4.7 Stream card
16:9 thumbnail, LIVE badge + viewers, streamer name/avatar, league context, platform glyph. VOD variant: duration + date + view count. Grid on Watch.

### 4.8 Prize pool display
Gold gradient figure + distribution breakdown (segmented bar or list: 1st/2nd/3rd, or "Winner 70% → $10,500"). Optional trophy icon.

### 4.9 Step / process module
"Step 0X" eyebrow + headline + bullets on one side; illustrative **UI mockup** (mini wallet, match room, AI-detection panel, pass cards) on the other; alternating L/R down the page.

### 4.10 Wallet widget
Available + In-Escrow balances, Deposit (gold) / Withdraw actions, mini history, earnings sparkline. Compact (nav chip) + full (wallet page) variants.

### 4.11 Supporting components
Tabs/segmented control · dropdown/menu · tooltip · toast (success/error/info, top-right) · modal/dialog (confirm join, deposit, surrender-card, dispute) · drawer/sheet (mobile) · avatar + platform glyph · countdown timer ("Season ends 4d 06h") · progress/capacity bar · pagination + infinite scroll · skeleton loaders · empty-state illustration block · notification item · search bar with filters · chip/filter row · breadcrumb · accordion (rules/FAQ) · rating/rank badge · trophy/medal icons · cookie banner · age-gate modal.

---

## 5. Pages (section-by-section)

### 5.1 Home (`/`)
1. **Hero** — full-bleed EA-FC gameplay/stadium-night image + navy scrim. Massive two-line headline ("Dominate the Turf"). Subhead: next-gen 1v1 FC leagues that pay the best players. **Sign Up Free** (primary) + secondary "How It Works". Trust chip "✓ Certified Cross-Play". Monochrome partner strip: YouTube · Twitch · EA Sports.
2. **How It Works teaser** — eyebrow "How It Works", headline "Your Path to Glory", 3 step cards: *Join a League* (start free) · *Play Live* (stream for transparency) · *Rank & Earn* (top finishers share the pool).
3. **Monetize** — eyebrow "For Serious Gamers", headline "Monetize Your God-Tier Skills". Left: feature rows *Top-3 Payout Model · Stream & Earn Revenue · Instant Withdrawals*. Right: wallet/earnings dashboard mockup.
4. **League Structure** — eyebrow "League Structure", headline "Fight for Promotion. Play for Payouts." Champions highlight card (`10,000+ POOL`, Invite Only, Elite Tier) + Promotion (top 3 ↑) / Relegation (bottom 3 ↓) explainers. CTA **View All Leagues**.
5. **Fair Play** — eyebrow "Fair Play", headline "Zero Tolerance". 3 cards: *API Validation · AI Match Detection · Active Tribunal*. Stat: **100% Dispute Resolution Rate**.
6. **Digital Assets** — eyebrow "Digital Assets", headline "Mint, Trade, and Surrender Cards". Row of 4 Pass Cards (Champions $150 · Elite $50 · Advanced $25 · Intermediate $10). Mini-steps: Mint & Enter · Surrender to Climb · Trade for Value. CTA **Visit Store**.
7. **Final CTA band** — big headline "Ready to stake your turf?" + Create Free Account.
8. **Footer.**

### 5.2 How It Works (`/how-it-works`)
Eyebrow "The Playbook", headline "From Lobby to Legend". **6 alternating step modules**, each with a live-feeling mockup:
- **01 Instant Setup & Verification:** link EA ID + Twitch; "Connection Optimal · 12ms Ping" diagnostic; one-click EA link, latency checks.
- **02 Join a Tier League:** tier chips Elite `$50` · Contender `$10` · Amateur Free; skill-based matchmaking.
- **03 Play & Report:** Match Room mockup (YOU 3 vs OPP 1, "Match Verified"); auto-verify via game API.
- **04 Stream & Validate:** "AI Detection Active" panel — scoreboard tracking, disconnect monitoring, `LIVE 1.2k`.
- **05 Mint Your Access Pass:** Pass Cards; mint to enter premium divisions, surrender to rank up.
- **06 Climb & Conquer:** `$15,000 POOL` Champions Glory, Instant Payouts, Promotion Top 20% / Relegation Bottom 20%.
CTA band: "Start your climb today" → Create Free Account.

### 5.3 Leagues browse (`/leagues`)
Header + **filter bar**: division/tier · buy-in range · status (Open/Live/Filling/Ended) · entry type (Free/Paid) · search. Sort: prize pool · spots left · start time. Season strip + countdown. **Grid of League Cards**. Empty state ("No leagues match your filters — clear filters"). Infinite scroll. Featured league banner optional.

### 5.4 League detail (`/leagues/[id]`)
Header: division + tier badge, buy-in, prize pool (gold), capacity bar, season/countdown, **Join** (opens confirm modal: balance debit / escrow explanation / rules acceptance). Tabs: **Standings** (promo/relegation zones) · **Fixtures/Results** (Match Room cards) · **Prize Breakdown** · **Rules**. If entered: your-position highlight + next fixture CTA.

### 5.5 Scores (`/scores`)
Broadcast-style live board. Segmented: **Live · Upcoming · Completed**. Featured live match hero (bigger card + Watch). Auto-refreshing grid of Match Room cards (live score, minute, LIVE pulse, viewers). Filters by league/division. Timezone-aware. "Updating…" indicator.

### 5.6 Champions League (`/champions-league`)
Prestige page. Eyebrow "Sponsor-Backed Tournament", headline "Champions League", subhead "Zero buy-in, ultimate glory". Hero: two Pass Cards (QUALIFIED `$0` · INVITE ONLY qualification pass `$15,000`). **Stat strip:** Prize Pool `$15,000` · Status "Elite Verified" · Top Players `16` · Entry "Free" · Format "Knockout" · Qualification "Elite Top 4". "The Ultimate Showdown": **Qualification** (top 4 Elite) · **Entry & Trade** (surrender pass / buy from store) · **The Prize** (winner 70% → `$10,500`). Official partners strip. CTA → Bracket.

### 5.7 Bracket / Leaderboards (`/champions-league/bracket`)
Full **Bracket** + season **Leaderboards** table; toggle bracket ↔ standings. Champion crowned gold. Featured matches with Watch links.

### 5.8 Watch (`/watch`)
Tabs **Live / VODs**. Optional featured embedded player (Twitch/YouTube) + side rail (chat/up-next). **Grid of Stream Cards**, filter by league/division/platform. VOD tab: search, date, duration, sort by views. Empty state ("No live matches right now — browse VODs").

### 5.9 Store (`/store`)
Modes: **My Passes** (owned/reserved/listed) + **Marketplace** (buy). Filters: tier, price range, status. Grid of Pass Cards. Detail modal/page: full art, tier, face value, market price, serial, owner, price history, actions — **Buy** · **List for sale** (set price) · **Surrender to rank up** (confirm modal explaining the burn + perk) · **Cancel listing**. Wallet balance + fee shown. First-time empty state explaining how to earn a card.

### 5.10 Rules (`/rules`)
Eyebrow "Fair Play Center", headline "Competitive Integrity First". Accordions/sections: **Match Conduct** (disconnect <5min → rematch 0-0; >75min → score stands) · **Reporting Disputes** (file ≤15 min; resolve ≤48h) · **Anti-Cheat Verification** (Server Check → VOD Review → Validation) · **Penalty Ladder** (4-tier table: Warning → −150 pts → Seasonal Ban → Lifetime Ban) · **Stream Requirements** (720p60 @ 4500kbps, controller-input overlay, VODs public 14 days, no private streams, "Download OBS Preset"). Last-updated date + support link.

### 5.11 Sign Up (`/signup`) & Sign In (`/signin`)
Split layout: form on `--surface-1` left; cinematic gameplay panel with rotating value props/trust stats right.
- **Sign Up:** email, password (strength meter), username/gamertag, region select, DOB/age-gate, terms + responsible-play checkbox; OAuth/EA link option.
- **Onboarding (post-signup):** step wizard — (1) link EA ID, (2) link streaming account, (3) latency/connection check (mirrors How-It-Works 01), (4) pick first league / claim free entry. Progress indicator.
- **Sign In:** email/password, remember me, forgot password, OAuth. Inline validation, cyan focus, clear errors.

### 5.12 Dashboard (`/dashboard`)
Authed home. Cards: wallet balance + quick Deposit/Withdraw; **My Active Leagues** (rank + next fixture); upcoming matches; recent results; owned Passes strip; season countdown; promotion/relegation status alert; notifications preview; "Find a league" CTA. Data-dense but calm; personalized greeting.

### 5.13 Wallet (`/wallet`)
Balance hero (Available / In-Escrow). **Deposit** + **Withdraw** flows — *payment gateway added later; design provider-agnostic UI now*: amount entry (quick chips $10/$25/$50/$100), method placeholder, review, success. **Transaction history** table (date · type: Deposit/Buy-in/Prize/Payout/Card · amount ± · status · ref). Earnings summary + chart. Withdrawal KYC/verification prompt state. Empty state for zero balance.

### 5.14 Match Room (`/matches/[id]`)
Opponent info + connect instructions; **live score entry** (both players submit); proof upload (screenshot / stream URL); embedded stream + AI-detection panel; verify/dispute buttons; countdown; success "Match Verified ✓" / "Under Review" / "Disputed" states with tribunal info + timelines.

### 5.15 Profile (`/profile`, public `/u/[gamertag]`)
Avatar, gamertag, platform, tier/division, career stats (W/L, win rate, goals, earnings), trophy + Pass collection, current leagues, recent VODs, follow/streaming links. Public vs editable owner view (edit avatar, bio, linked accounts, privacy).

### 5.16 Settings (`/settings`)
Tabs: **Account** (email, password, delete) · **Profile** (avatar, bio, gamertag) · **Connections** (EA, Twitch, YouTube, Discord — connect/disconnect) · **Payments** (methods, payout details, KYC status) · **Notifications** (email/push toggles per event) · **Privacy** (profile visibility, data export) · **Responsible Play** (limits, self-exclusion). Region/language.

### 5.17 Notifications center (`/notifications` + dropdown)
List of notification items grouped by day: match scheduled/started, result verified/disputed, promotion/relegation, prize paid, card sold, league starting soon, system. Read/unread, filters, mark-all-read, deep links.

### 5.18 Support (`/support`) & Contact (`/contact`)
Support: search + categories (Account, Payments, Matches & Disputes, Streaming, Cards) + FAQ accordions + "Open a ticket" + ticket status. Contact: form (name, email, topic, message) + response-time note + socials/Discord.

### 5.19 Legal — Terms (`/terms`), Privacy (`/privacy`), Responsible Play (`/responsible-play`)
Long-form readable template: sticky ToC/section nav, generous measure, last-updated date, clear headings. Themed dark, neutral, legible.

### 5.20 Utility pages
**404** (playful on-brand "Off the pitch" + search + home CTA) · **500 / error** · **Maintenance** ("Pitch under maintenance") · **Coming soon / waitlist** (optional) · **Email verification** landing · **Password reset** · **Age-gate interstitial**.

### 5.21 Admin (internal — design the shell)
Sidebar dashboard reusing the library: review queue (matches under review w/ proof/VOD player) · disputes tribunal · seasons/divisions/leagues config · card-type management · payouts approval · users/KYC/bans · audit log · metrics overview. Utilitarian dark.

### 5.22 Transactional emails / notifications (design templates)
Dark-branded email templates: welcome/verify, match scheduled, result verified, dispute update, promotion/relegation, prize paid, withdrawal status, card sold, password reset, weekly digest. Consistent header (wordmark), body card, single primary CTA, footer with legal + unsubscribe.

---

## 6. States, responsive, motion, accessibility

### 6.1 State matrix (every data view)
Default · **loading** (skeletons > spinners) · **empty** (illustration + helpful CTA) · **error** (retry) · **success** (toast + inline) · **partial/updating** (subtle live indicator). Money/join/surrender actions always route through a **confirm modal** with clear consequences.

### 6.2 Responsive breakpoints
- ≥1280 max container · 1024 (3→2 col) · 768 tablet · 640 mobile (single col, bottom tab bar, sticky action bars for Join/Deposit, horizontal scroll for standings/brackets). Hero headline scales but stays dominant. Test 360px min width.

### 6.3 Motion timing table
| Element | Effect | Duration | Easing |
|---|---|---|---|
| Section reveal | fade-up + 8px | 400ms | ease-out |
| Hero bg | slow parallax/zoom | 8–12s loop | linear |
| Hero words | staggered fade-up | 500ms, 60ms stagger | ease-out |
| Card hover | lift + glow | 180ms | ease-out |
| Pass Card | 3D tilt + sheen | 120ms track / 700ms sheen | ease |
| Stat count-up | number roll | 1200ms on view | ease-out |
| Live dot | pulse | 1.4s loop | ease-in-out |
| Modal | scale 0.96→1 + fade | 200ms | ease-out |
| Toast | slide-in top-right | 220ms | ease-out |
Respect `prefers-reduced-motion` (disable parallax, tilt, count-up → instant).

### 6.4 Accessibility
AA contrast on dark (verify green/gold text sizes; use for large/bold or add outline). Visible cyan focus rings on all interactive elements. Keyboard-navigable nav, menus, modals (focus trap), tables. Don't rely on color alone — pair promo/relegation & status with icons + labels. Alt text on imagery. Live regions for score updates. Age-gate + responsible-play surfaced.

---

## 7. Iconography inventory
Line icons, 1.5px stroke, 24px grid: home, trophy, controller/gamepad, shield-check (verified), ping/signal, latency, stream/broadcast, play, card/pass, mint/spark, coin/wallet, deposit, withdraw, arrow-up (promotion), arrow-down (relegation), swords/VS, whistle (rules), gavel (tribunal), AI/scan, calendar, clock/countdown, bell, filter, search, chevrons, external-link, platform glyphs (PS/Xbox/PC, Twitch/YouTube/X/TikTok/Discord), medal, crown, lock, warning, check, close. Plus filled/duotone variants for active states.

## 8. Photography & art-direction shot list
- Hero: floodlit stadium at night / EA-FC gameplay stills with heavy navy scrim.
- Section backgrounds: pitch-line textures, hex/mesh, turf-blade close-ups, subtle grain.
- Wallet/dashboard: clean UI-mockup renders on dark.
- Champions: gold-lit trophy/prestige imagery.
- Consistent treatment: dark, high-contrast, green/gold accent lighting, no bright/flat photography.

## 9. Copy voice guide
Bold, direct, competitive, confident about earning; trustworthy about fairness. Short imperative headlines. Uppercase eyebrows. Avoid gambling framing — frame as **skill, competition, rewards**. Sample tone: headlines like "Stake your turf" / "Play for payouts" / "Zero tolerance"; buttons "Play Now / Join League / Deposit / Surrender Pass / Watch Live". Numbers and money always crisp and specific.

## 10. Brand assets to produce
Wordmark (3 variants) · monogram PPT · favicon set · app icon · OG/social share image · loading/splash · email header · social profile + banner set · partner-logo lockups (mono).

---

## 11. Deliverables & file structure
- [ ] Tokens (colors/type/spacing/radii/shadows/motion) — §2/§6.3.
- [ ] Logo suite + favicon + OG + splash — §1/§10.
- [ ] Component library (§4) — every state, desktop + mobile.
- [ ] **Pass Card** system — all tiers × all statuses (build first).
- [ ] Every page in §5 — desktop + mobile, default + one populated state.
- [ ] Global nav (out/in) + mobile bottom bar + footer.
- [ ] Icon set (§7) + partner lockups.
- [ ] State screens (empty/loading/error/success) for Leagues, Scores, Wallet, Store, Watch, Match Room.
- [ ] Email templates (§5.22).
- [ ] Prototypes: sign-up + onboarding, join a league, submit/verify a match, buy/surrender a card, deposit/withdraw.
- Suggested Figma structure: `00 Cover · 01 Foundations/Tokens · 02 Components · 03 Pass Cards · 04 Marketing Pages · 05 App Pages · 06 Auth & Onboarding · 07 States & Errors · 08 Emails · 09 Prototypes`.

## 12. "Reads-as-replica" fidelity checklist
- [ ] **Dark-navy-first** (`#050b17`) everywhere; never a default light theme.
- [ ] **Pass Card** with tiered access level, USD face value, status badge, mint-style serial — the most recognizable element; nail it first, issuer reads **Pro Play Turf**.
- [ ] **Promotion/relegation** structure and **top-3 / Champions 70%-to-winner** economics are visually explicit.
- [ ] **Streaming + AI + tribunal** fair-play pillar has real estate and its own language (live pulses, "AI Detection Active", verification checks).
- [ ] Headlines **oversized, two-line, punchy** with uppercase eyebrows.
- [ ] Partner logos (YouTube/Twitch/EA Sports) recur as trust signals.
- [ ] Turf-green primary + gold reward + cyan trust used per the usage rules (§2.1).
- [ ] Every reference to the old brand replaced with **Pro Play Turf** / `proplayturf.com`.

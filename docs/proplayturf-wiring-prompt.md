# Pro Play Turf — Interaction & Wiring Design Prompt

> Paste this to the design agent. It pairs with the completed mockups and `proplayturf-design-brief.md`.
> Scope: **wiring only** — connect the existing screens into a fully interactive, navigable prototype. Do not restyle or introduce new visual language; work within the existing mockups and tokens.

---

## Role & objective

You are the interaction/UX designer. Every screen's **visual** design is done. Your job is to **wire** them: define every interaction, navigation path, state transition, modal, confirmation, and multi-step flow so the design becomes a fully connected, clickable prototype an engineer can build without guessing behavior. No dead ends, no orphan screens, no undefined buttons.

## Definition of done (the whole prototype)

- [ ] Every interactive element (button, link, tab, filter, row, card, icon, form field) has a defined **action → result → destination/state**.
- [ ] Every data screen has its full **state set wired**: default, loading (skeleton), empty, error, success — with the transitions between them.
- [ ] Every **core flow** below is a connected click-path from entry to completion, including the failure branch.
- [ ] All **modals, confirmations, toasts, and inline validation** are specified and triggered from the right elements.
- [ ] A complete **route map** exists and every screen is reachable; **auth gating** and redirects are defined.
- [ ] Back/close/cancel behavior defined for every overlay and sub-screen.
- [ ] Logged-out vs logged-in variations wired for shared surfaces (nav, home, league detail, etc.).

---

## 1. Global wiring

### 1.1 Route map
Produce a single route map covering: `/`, `/how-it-works`, `/leagues`, `/leagues/[id]`, `/scores`, `/champions-league`, `/champions-league/bracket`, `/watch`, `/store`, `/store/[passId]`, `/rules`, `/signin`, `/signup`, `/onboarding`, `/dashboard`, `/wallet`, `/matches/[id]`, `/profile`, `/u/[gamertag]`, `/settings`, `/notifications`, `/support`, `/contact`, `/terms`, `/privacy`, `/responsible-play`, `404`, `/maintenance`. Mark each as **public / auth-only / auth-optional**.

### 1.2 Navigation
- **Top nav (logged out):** Leagues, Scores, Champions League, How It Works → their routes. **Log In** → `/signin`. **Play Now** → `/signup`.
- **Top nav (logged in):** add My Leagues, Watch, Store. Replace auth buttons with: **wallet chip** → `/wallet`; **+ Deposit** → opens Deposit modal; **notifications bell** → opens notifications dropdown (and `/notifications` on "see all"); **avatar menu** → Dashboard, My Leagues, Wallet, Store, Profile, Settings, Log Out (Log Out → clears session → `/`). Active route indicated.
- **Mobile bottom bar:** Home, Leagues, Scores, Champions, More. **More** opens a sheet (How It Works, Watch, Store, Rules, Support, account). Logged-in swaps one tab for **Wallet**.
- **Footer:** wire every link to its route; socials open external in new tab; Cookie Settings opens the cookie preferences overlay.

### 1.3 Auth gating & redirects
- Visiting an auth-only route while logged out → redirect to `/signin` with return-to, then back after login.
- After **sign up** → `/onboarding`. After **onboarding complete** → `/dashboard` (or the league they claimed).
- After **sign in** → return-to route or `/dashboard`.
- Withdrawal and paid actions additionally gated by KYC/verification state (see 2.9).
- Region-blocked users → responsible-play/blocked state instead of signup.

### 1.4 Global feedback conventions
- **Toasts** (top-right): success/error/info, auto-dismiss, one action max. Define which actions fire which toast (e.g., "Pass listed", "Deposit added", "Withdrawal requested").
- **Loading:** skeletons for lists/tables/cards; button inline spinner + label ("Processing…") for actions. No blank flashes.
- **Optimistic vs confirmed:** specify per action (e.g., filters update optimistically; money actions only reflect after confirmation).

---

## 2. Core flows (wire each as an end-to-end click-path, incl. the failure branch)

### 2.1 Sign up → onboarding → first league
`/signup` (validate inline → submit) → `/onboarding` wizard: (1) link EA ID, (2) link streaming account, (3) connection/latency check, (4) choose first league / claim free entry → success → `/dashboard` or `/leagues/[id]`. Wire skip/later, back between steps, and the progress indicator.

### 2.2 Sign in
`/signin` → validate → success → return-to/`/dashboard`; error → inline error + retry; forgot password → reset flow → confirmation.

### 2.3 Deposit *(payment gateway deferred — wire the stub/test-credit flow now)*
Any **+ Deposit** entry → Deposit modal: amount (quick chips + custom) → method placeholder → Review → Confirm → success toast + wallet balance updates + modal closes → history row added. Failure branch → error state + retry. Design so the real gateway later slots into the "method" + "confirm" steps without re-wiring.

### 2.4 Join a league (escrow)
League card / league detail **Join** → confirm modal (shows buy-in debit, escrow explanation, rules acceptance checkbox) → Confirm → if sufficient balance: success → entry created → button becomes "View My League" → toast; if **insufficient balance**: branch to Deposit modal, then return to join. Capacity-full → disabled state + "League full" + waitlist/notify option.

### 2.5 Play & submit a match result
From Dashboard/League detail fixture → `/matches/[id]` → connect instructions → **Submit Result** (score entry + proof upload / stream URL) → submitted state ("Awaiting opponent"). Wire both-players-submit logic:
- Scores **agree** → Verified ✓ → standings update → prize logic if final.
- Scores **disagree** → Under Review → tribunal queue (see 2.6).

### 2.6 Verification & dispute
Under-review state → shows what happens next + timeline. **Raise dispute** (from a verified/submitted match) → dispute modal (reason + evidence) → submitted → status Disputed → notification on resolution → result stands or is voided → standings/prizes adjust. Wire the reviewer/admin side too if admin screens are in scope.

### 2.7 Prize payout → wallet
On league/season settle: top-3 receive prize → wallet balance updates → notification + toast → transaction row (type: Prize) → earnings chart updates.

### 2.8 Cards: buy / list / surrender
- **Buy:** `/store` → Pass detail → **Buy** → confirm modal (price, fee, balance) → success → ownership transfers → status becomes Owned → toast. Insufficient balance → Deposit branch.
- **List:** owned Pass → **List for sale** → set price → confirm → status Listed → appears in marketplace → cancel-listing wired.
- **Surrender:** owned Pass → **Surrender to rank up** → confirm modal (explains the burn is irreversible + the promotion perk) → confirm → Pass burned → promotion applied → toast.

### 2.9 Withdraw (KYC-gated)
Wallet **Withdraw** → if **not KYC-verified**: route to verification prompt/flow first → on verified, continue. Amount → destination placeholder → Review (note hold period) → Confirm → status Pending/held → transaction row → toast + notification on completion.

### 2.10 Promotion/relegation season transition
Season-end → dashboard alert + notification → division change reflected on Dashboard, Profile, and Leagues. Wire the "new season / new division" empty-to-populated transition.

---

## 3. Page-by-page wiring

For **every** page below, define: **entry points** (how you arrive), **each interactive element → its behavior**, **all states wired**, and **exits/links out**.

- **Home** — CTAs → signup; nav teasers → their pages; "View All Leagues" → `/leagues`; "Visit Store" → `/store`; Pass cards → `/store/[passId]`; logged-in variant swaps hero CTA for "Go to Dashboard".
- **How It Works** — step CTAs; final CTA → signup; anchor links.
- **Leagues browse** — filters (division, buy-in, status, entry type) update the grid live; sort; search; league card → `/leagues/[id]`; Join → flow 2.4; pagination/infinite scroll; empty state ("clear filters") wired.
- **League detail** — Join (2.4); tabs (Standings / Fixtures / Prize / Rules) switch in place; standings player → `/u/[gamertag]`; fixture → `/matches/[id]`; countdown live; entered vs not-entered variants.
- **Scores** — segmented Live/Upcoming/Completed; filters; auto-refresh indicator; match card → match room or watch; featured match Watch → `/watch`.
- **Champions League** — CTA → `/champions-league/bracket`; qualification/entry explainers; Pass cards → store.
- **Bracket / Leaderboards** — toggle bracket ↔ standings; bracket node → match detail/watch; leaderboard row → profile.
- **Watch** — Live/VOD tabs; stream card → player (embed) / stream page; filters; featured player controls; empty state ("no live — browse VODs").
- **Store** — My Passes / Marketplace toggle; filters; Pass → `/store/[passId]`; buy/list/surrender (2.8); first-time empty state → "how to earn a card".
- **Match Room** — submit result (2.5); proof upload; stream embed; verify/dispute (2.6); all match statuses wired (Scheduled/Live/Verified/Under Review/Disputed).
- **Wallet** — Deposit (2.3), Withdraw (2.9); history filters/pagination; row → detail; empty (zero balance) state; earnings chart range toggle.
- **Dashboard** — quick deposit/withdraw; My Active Leagues → league detail; next match → match room; owned Passes → store; promo/relegation alert → info; notifications preview → `/notifications`; "Find a league" → `/leagues`; first-time empty dashboard wired.
- **Profile / public profile** — owner: edit avatar/bio/linked accounts → settings; public: follow, streaming links, VODs → watch; stat tabs.
- **Settings** — tab switching; connect/disconnect EA/Twitch/YouTube/Discord (connected vs disconnected states); notification toggles persist; payments/KYC status; delete account (destructive confirm); privacy/data export.
- **Notifications** — item → deep link to source; read/unread; filters; mark-all-read; empty state.
- **Rules** — accordions expand/collapse; ToC anchors; "Download OBS Preset" → download; support link.
- **Auth (signup/signin/onboarding)** — inline validation, error/success, OAuth, wizard nav (2.1/2.2).
- **Support / Contact** — search → results; category → articles; "Open a ticket" → form → submitted state; contact form → submitted state.
- **Legal pages** — ToC anchor nav; last-updated visible.
- **Utility** — 404 → search + home; maintenance; email-verify landing → continue; age-gate → confirm/exit.

---

## 4. Global state & transition rules

- Define **default → loading → (empty | error | success)** for every list, table, and card grid, and show the transition in the prototype.
- All **money, join, surrender, delete, dispute** actions → confirmation step before commit; success → toast + updated state; failure → recoverable error.
- **Live data** surfaces (Scores, Watch, Match Room, Wallet) show a subtle updating indicator; define refresh behavior.
- **Back / close / cancel** returns to the prior state without losing context (e.g., cancelling a deposit keeps you on the same page).

## 5. Edge cases to wire

Insufficient balance (→ deposit branch) · league full · match disconnect/no-show · disputed result pending · KYC-not-verified on withdrawal · region-blocked user · no live streams · zero-balance wallet · first-time user (empty dashboard/store) · session expired mid-flow · listing your own only Pass while it's required for entry.

## 6. Deliverable format

- A **Figma interactive prototype** with real connections, overlays (modals/sheets/toasts as overlays, not separate pages), component **variants** for states, and named **flows** for the core journeys in §2.
- A short **interaction spec** (or annotations on frames) capturing action → result for anything not obvious from the click-through.
- The route map from §1.1.
- Keep everything on the existing component library and tokens — wiring must not fork the visual system.

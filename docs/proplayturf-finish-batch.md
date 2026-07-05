# Pro Play Turf — Finish Batch (remaining screens)

> These are the only screens not yet built. The rest of the app is done and is the visual reference — **match it exactly** (tokens, fonts Archivo/Chakra Petch/Inter, nav, footer, buttons, cards, modals). No placeholder/"build queue" screens. Every screen: desktop + mobile + the listed states.
> Full context: `proplayturf-page-build-queue.md` and design brief §5.

## Router note (do this so these stop hitting the stub)
In the route map, these currently point to `'stub'`:
`matches`, `profile`, `settings`, `notifications`, `u`.
Replace each with its own screen key + a real render branch and `is*` flag, exactly like `leagues`/`store`/`wallet` already do (e.g. `'matches': 'matches'` with `isMatches: screen === 'matches'`). Also **add new routes** that aren't in the map yet: `support`, `contact`, `terms`, `privacy`, `responsible-play`, `maintenance`, `verify`, `reset`. Upgrade the `notfound` stub into the designed 404 below.

Build in this order:

---

## 1. Match Room (`/matches/[id]`) — HIGHEST PRIORITY
The core gameplay screen. Where a fixture is played, reported, and resolved.

**Layout:** header with league/division context + countdown; two-player banner (both avatars, gamertags, platform glyphs, VS + live/entered score); main column = the active-state panel; right rail = stream embed + "AI Detection Active" panel (scoreboard tracking, disconnect monitor, LIVE viewer count) reusing the How-It-Works step-04 mockup styling.

**Wire all six states (design each):**
- **Scheduled** — connect instructions (lobby code / how to invite), "I'm Ready" toggle, countdown to kickoff.
- **Live** — live score, minute, LIVE pulse, stream embed active.
- **Submit result** — score entry (home/away steppers), proof upload (screenshot drag-drop + stream URL field), **Submit Result** button → confirm.
- **Awaiting opponent** — "You reported 3–1. Waiting for your opponent to confirm." + what happens on agree/disagree.
- **Verified ✓** — result confirmed, standings-updated note, prize note if final, link back to league.
- **Under Review / Disputed** — status banner + **timeline** (submitted → review → resolution ETA), **Raise Dispute** action (modal: reason + evidence upload), tribunal explainer.

**Components reused:** Match Room card, badges (LIVE/Verified/Under Review/Disputed), proof-upload field, modals, toasts. **Links:** back to league detail; opponent → player profile; "Watch" → stream.
**States to include:** the six above + loading.

---

## 2. Profile (`/profile`) + Public Player Profile (`/u/[gamertag]`)
One layout, two modes.

**Sections:** header (avatar, gamertag, platform, tier/division badge, region, join date, follow button on public); **career stat strip** (W / L / win-rate / goals / total earnings — use the count-up stat blocks); **trophy + Pass collection** (Pass Cards row, tiers owned); **current leagues** (League Cards with rank); **recent VODs** (Stream cards → Watch); streaming links.
- **Owner mode:** "Edit Profile" → Settings; shows private bits (earnings) the public view hides.
- **Public mode:** Follow, public stats only, VODs, no wallet data.

**States:** owner, public, empty (new player — "No matches played yet" with a Find-a-League CTA), loading.

---

## 3. Notifications (`/notifications` + bell dropdown)
Build both the **dropdown** (from the nav bell) and the **full page**.

**Items grouped by day**, each with icon + text + timestamp + read/unread dot, deep-linking to source: match scheduled/started, result verified, result disputed/resolved, promotion/relegation, prize paid, card sold, league starting soon, system/announcement.
**Controls:** filter (All / Unread / Matches / Money / System), Mark all read, item → deep link.
**States:** default (mixed read/unread), all-caught-up empty ("You're all caught up"), loading. Dropdown shows latest ~6 + "See all" → full page.

---

## 4. Settings (`/settings`)
Tabbed settings, dark surfaces, save-on-change with a "Saved" toast.

**Tabs:**
- **Account** — email, change password, delete account (destructive confirm modal).
- **Profile** — avatar upload, bio, gamertag.
- **Connections** — EA ID, Twitch, YouTube, Discord — each with connected vs disconnected states + connect/disconnect buttons.
- **Payments** — payout method placeholder (gateway deferred), KYC/verification status chip.
- **Notifications** — per-event email/push toggles.
- **Privacy** — profile visibility, data export request.
- **Responsible Play** — deposit/time limits, self-exclusion.

**States:** default, connected vs disconnected rows, saving, saved toast, destructive-confirm.

---

## 5. Support (`/support`)
**Sections:** search bar; category tiles (Account, Payments, Matches & Disputes, Streaming, Cards); FAQ accordions per category; "Still need help? Open a ticket" → ticket form (subject, category, message, attachment); ticket status lookup.
**States:** default, search results, no-results, ticket-submitted confirmation.

## 6. Contact (`/contact`)
Simple: form (name, email, topic dropdown, message) + response-time note + socials/Discord links. **States:** default, validation errors, submitted.

## 7. Legal — Terms (`/terms`), Privacy (`/privacy`), Responsible Play (`/responsible-play`)
One long-form template, three content instances: sticky table-of-contents / section nav, generous reading measure, last-updated date, clear headings, dark theme. Keep it legible and neutral. **State:** default. (Use lorem-style placeholder body if final legal copy isn't ready — mark clearly as placeholder text to be replaced.)

## 8. Utility pages
- **404** (`notfound`) — upgrade the current stub into a designed page: "Off the Pitch" headline, short line, **Back Home** + **Browse Leagues** buttons, on-brand.
- **Maintenance** (`/maintenance`) — "Pitch under maintenance", ETA line, socials.
- **Email verify** (`/verify`) — verifying / success / expired states + continue button.
- **Password reset** (`/reset`) — request form → set-new-password → confirmation.

---

## Definition of done for this batch
- [ ] Router: `matches`, `profile`, `settings`, `notifications`, `u` now render real screens (not `stub`); new routes added; 404 upgraded.
- [ ] Each screen matches the existing pages' look exactly (tokens, nav, footer).
- [ ] Desktop + mobile for all.
- [ ] All listed states designed per screen.
- [ ] Match Room's six states all present and wired (submit → confirm/dispute → resolution).
- [ ] No "next in the build queue" text remains anywhere in the bundle.

**When every box is ticked, the design is complete** — then hand to the builder with `proplayturf-build-handover.md` + the architecture doc.

# Pro Play Turf — Design Handoff Guide

You're receiving two files. Use them together.

| File | What it is | How to use it |
|---|---|---|
| `proplayturf-design-brief.md` | The full specification — brand, tokens, components, every page, states, checklist. | **Your source of truth.** Design against it. |
| `proplayturf-landing.html` | The landing page, fully designed and interactive. The aesthetic is locked here. | **Your visual reference.** Match every other screen to this look. Open it in a browser to see motion, hover, and responsive behavior. |

---

## Start here

1. **Open `proplayturf-landing.html` in a browser.** This is the agreed look — dark-navy field, turf-green primary, gold rewards, cyan trust. Study the hero, the section rhythm, and especially the **Pass Card** (the signature component).
2. **Pull the tokens from it.** All colors, fonts, spacing, radii, shadows, and glows are defined as CSS variables at the top of the file (`:root`). These are exact — reuse them, don't re-derive.
   - Fonts: **Archivo** (display/headlines), **Chakra Petch** (data, labels, stats, serials), **Inter** (body).
3. **Read the brief's §0, §2, §4.** §2 = tokens, §4 = component specs (the Pass Card first).

## Then design the rest

Work in this order (from the brief's §5). Every screen must look like it came from the same product as the landing page.

1. **Marketing:** How It Works, Champions League, Rules.
2. **App core:** Leagues (browse + detail), Scores, Store, Dashboard, Wallet, Match Room.
3. **Auth & onboarding:** Sign up / Sign in, onboarding wizard.
4. **System:** Settings, Notifications, empty/loading/error/404/maintenance, email templates.

## Definition of done (per screen)

- [ ] Desktop **and** mobile (test to 360px width).
- [ ] Uses the exact tokens from the landing CSS — no new colors or fonts.
- [ ] All states designed where relevant: default, loading (skeletons), empty, error, success.
- [ ] Money/join/surrender actions have a confirm step.
- [ ] Visible focus states; AA contrast; reduced-motion respected.
- [ ] Reuses the shared components (nav, footer, buttons, badges, cards, Pass Card, tables) — no one-off variants.

## Non-negotiables (from brief §12 — this is what makes it a replica)

- Dark-navy-first (`#050B17`). Never a light default theme.
- The **Pass Card** — tiered access level, USD face value, status badge, mint-style serial — issuer reads **Pro Play Turf**. Nail it first.
- **Promotion/relegation** and **top-3 / Champions 70%-to-winner** economics visually explicit.
- **Streaming + AI + tribunal** fair-play pillar has its own visual language (live pulses, "AI Detection Active", verification checks).
- Oversized two-line headlines with uppercase eyebrows; partner logos (YouTube/Twitch/EA Sports) recur as trust signals.

## Deliverable format

Design in Figma (suggested structure in brief §11). Keep one shared component/token library so the builder gets a consistent system, not disconnected mockups.

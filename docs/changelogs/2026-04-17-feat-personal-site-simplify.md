# Simplify the hero + strip About/contact form
**Date:** 2026-04-17
**Branch:** `feat/personal-site`

## What changed (plain English)
Trimmed the site to match Leon's minimalist direction. The landing view is now
just his name, a one-sentence intro ("I am a data scientist and I love
building products."), and a horizontal career timeline with a dot for each
role at Chinatex, Coach, and Mars, ending in an arrow for "present." The About
section and all the metric tiles are gone. The contact form is replaced with a
simple "Connect" list of links (email, LinkedIn, GitHub, Medium). Education
lives under Connect. Projects and chatbot sections are unchanged.

## Technical details
- **index.html**
  - Hero: name (no italic accent), tagline, `<ol class="career-timeline">` with
    3 `<li class="ct-stop">` items positioned by a CSS custom property `--x`
    (0%, 60%, 79%) representing proportional time from Jan 2017 to present.
  - Removed: About section, metric-grid, hero-actions, vertical timeline,
    tool-box skills grid, contact-form section.
  - Added: `<section id="connect">` with `<ul class="connect-list">` for
    socials + email, followed by the education list.
  - Nav reduced to Projects / Ask / Connect.
- **css/styles.css**
  - Added `.career-timeline` with two media queries: ≥721px renders as a
    horizontal axis with absolutely-positioned stops; <721px falls back to a
    vertical grid timeline with dot markers on the left rail and an arrow at
    the bottom.
  - Added `.connect-list` (label + link rows).
  - Dropped all metric/skills/fact-grid/contact-form CSS.
- **js/config.js** — stripped to a single `chatWorkerUrl` field. Removed
  `formspreeUrl`, `contactEmail`, and `social` (all now hardcoded in HTML).
- **js/main.js** — reduced to the footer year setter. Contact-form + social
  link wiring removed (dead now that the form is gone and socials are static).
- **README.md** — updated structure/sections/config notes to match reality.
- **worker/** — unchanged (still DeepSeek-backed).

### Timeline positioning math
Total span Jan 2017 → Apr 2026 ≈ 111 months. Chinatex start = 0/111 (0%),
Coach start = 67/111 (60%), Mars start = 88/111 (79%). The axis line stops at
`right: 108px` with a CSS-triangle arrow at `right: 88px` so the Mars stop's
"May 2024 — Present" label has breathing room.

### Follow-ups
- Chatbot still depends on deploying the Cloudflare Worker (`worker/`) and
  pasting the URL into `js/config.js`.
- Timeline positions are hardcoded — when a new role starts, either update
  `--x` percentages manually or compute them at render time (currently not
  worth the JS complexity).

## CLAUDE.md updates
- **Section inventory (current):** Hero → Projects → Ask (chatbot) → Connect
  (email + socials + education). No About, no contact form.
- **Hero timeline:** `.career-timeline` uses inline `style="--x: N%"` per
  stop. Percentages are proportional months from the earliest role.
  Responsive fork at 721px (horizontal desktop / vertical mobile).
- **Config surface:** `js/config.js` holds only `chatWorkerUrl`. All social
  URLs and email are baked into `index.html` under the Connect section.

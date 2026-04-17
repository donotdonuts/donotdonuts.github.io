# Adopt stocktaper palette + IBM Plex Mono, add photo and dual-track timeline
**Date:** 2026-04-17
**Branch:** `feat/personal-site`

## What changed (plain English)
The site now looks like a close cousin of stocktaper.com — same cream (#fbf7eb) background, same IBM Plex Mono font everywhere, same medium-gray divider lines. The hero leads with Leon's hedcut portrait next to his name and one-line intro ("Leon Chen — I am a data scientist and I love building products."). The old header brand ("LC" + "Liangqu Chen") is gone so the nav sits clean on the right. The career timeline now carries both work and education on a single horizontal axis: four work roles above the line (including the new Chinatex Account Manager role starting Feb 2015) and three degrees below the line (Donghua BS, NC State MS, Georgia Tech MS). On narrow screens the timeline stacks vertically with "Work" / "Education" section headers.

## Technical details

### Design tokens (matched to stocktaper)
Pulled from stocktaper's compiled CSS (`logo.q9Lf_ojI.css`):
- Font: `"IBM Plex Mono", ui-monospace, SFMono-Regular, ...` applied to `body`.
- Background: `#fbf7eb` (cream).
- Ink: `#141414`; muted: `#525252`; soft: `#404040`.
- Borders: `--border #bebebe` (subtle), `--border-strong #9e9e9e`.
- Hover surface: `#ebe7dc`.
- Success / fail: `#2f7d31` / `#c6392c`.

### Photo
- Source: user-provided `raw.jpg` (1024×1048, 810KB hedcut portrait).
- Resized via `sips -Z 720` → `assets/portrait.jpg` (146KB, 720×737).
- `raw.jpg` is gitignored so only the web-optimized copy is committed.
- Rendered with `aspect-ratio: 1/1` inside a 240px square with a 1px border
  that lets the cream paper blend into the page background.

### Timeline — dual track
- `.career-timeline` is a fixed 280px-tall relative container (desktop).
- `.ct-axis` is a 1px horizontal line at `top: 50%`, with a CSS-triangle
  arrow at its right end.
- `.ct-track-work` (above axis) and `.ct-track-edu` (below axis) are each
  absolutely positioned at 50% height; stops flex-align with label pushed
  away from axis and dot pinned to axis via negative margin `-6px` to
  visually center the 10px dot on the 1px line.
- Work dots are filled (`background: var(--ink)`); education dots are hollow
  (`background: var(--bg)`), to differentiate tracks at a glance.
- Stops positioned by inline `--x` as a percent of months from Jul 2013 to
  Apr 2026 (153 months): Donghua 0%, NCSU 6.5%, Chinatex Account Mgr 12.4%,
  Chinatex Sr Data Analyst 27.5%, Coach 71.2%, Georgia Tech 81.7%, Mars 85%.
- NC State gets `.ct-stop-tier-2` — its label is pushed 32px further from
  the axis via `transform` to avoid horizontal collision with Donghua's label.
- Mobile (`<821px`) switches to a vertical rail with `data-label` attributes
  ("Work", "Education") rendered via CSS `::before` as section headings.

### Name + header
- Hero title changed from `Liangqu "Leon" Chen` to `Leon Chen`.
- `.brand` block (mark + "Liangqu Chen" text) removed from the header; nav
  is now right-aligned via `justify-content: flex-end` on `.header-inner`.
- Title tag and meta description updated to "Leon Chen".

### Chatbot system prompt
- Name references in `worker/worker.js` updated to "Leon Chen".
- Added new block documenting the Chinatex Account Manager role (Feb 2015 →
  Jan 2017) so the bot can answer questions about his commercial-to-analytics
  transition.
- Worker redeploy needed (`cd worker && wrangler deploy`) for prompt changes
  to take effect in the live bot.

### Follow-ups
- Timeline positions are hardcoded. When a new role or degree is added,
  recompute `--x` against the new total month span.
- Portrait `object-position: center 40%` crops the face slightly high; tweak
  if a different crop reads better on mobile.

## CLAUDE.md updates
- **Design reference:** `stocktaper.com` (cream background #fbf7eb, IBM Plex
  Mono everywhere, 1px #9e9e9e dividers). Any new UI must inherit these
  tokens from `:root` in `css/styles.css`.
- **Portrait workflow:** source image lives at repo root as `raw.jpg`
  (gitignored). The committed copy is `assets/portrait.jpg`, resized via
  `sips -Z 720 raw.jpg --out assets/portrait.jpg`.
- **Timeline coordinates:** `.ct-stop { --x }` values are proportional months
  from Jul 2013 (timeline origin). If the origin or present date moves,
  every `--x` needs to be re-derived.
- **Header gotcha:** there is no brand mark or brand name. Nav is the only
  content in the header and is right-aligned.

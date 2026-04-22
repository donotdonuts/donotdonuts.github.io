# Filter projects by experience on timeline hover
**Date:** 2026-04-21
**Branch:** `feat/experience-project-filter`

## What changed (plain English)
Hovering a work/education entry in the Projects-section timeline now dims the project cards that don't belong to that entry, so you can see at a glance which projects came from Mars, Coach, or Georgia Tech. Entries with no tied projects (both Chinatex stops, NC State, Donghua) behave like before — no filter triggers when you hover them. Also added two new Georgia Tech projects: the Personalized National Park Itinerary Flask app and the Hateful Memes multimodal classifier.

## Technical details
- Data binding is a `data-experience="<slug>"` attribute on each `<li class="tl-stop">` and each `<article class="project-card">`. Slugs: `mars`, `coach`, `chinatex-sr`, `chinatex-am`, `gatech`, `ncstate`, `donghua`. Card-to-experience mapping: Mars = 4 (MIP, e-commerce forecast, Copilot, impact measurement); Coach = 2 (embeddings, ML pipelines); Georgia Tech = 2 (new cards).
- Runtime logic in `js/main.js`: on load, compute the set of experiences that have ≥1 tied card, mark those stops with `.tl-stop-has-projects` (and `tabindex="0"` in the HTML for keyboard focus). On `mouseenter` / `focus` of an interactive stop, add `.is-filtering` to the rail + grid, `.is-active` to the stop, and `.is-dim` to non-matching cards. On `mouseleave` / `focusout` of the rail, clear everything.
- CSS: interactive stops get `cursor: pointer`; during filter, non-active stops drop to 0.45 opacity while the active stop's icon + company name go full ink; dimmed cards drop to 0.18 opacity with a 0.2s transition. The timeline rail's existing `:hover` / `:focus-within` 0.45→0.95 opacity bump still does its job — we layer on top.
- Non-filterable stops (`chinatex-sr`, `chinatex-am`, `ncstate`, `donghua`) have `data-experience` but no `tabindex` and never get `.tl-stop-has-projects`, so they're inert on hover.
- Touch devices: no hover, no tap handler — by design. Filtering is a desktop nice-to-have; cards remain fully visible by default.
- **Follow-up candidates:** (1) add Chinatex-tied projects (ARIMAX forecasting, dynamic safety-stock framework) to turn those stops on; (2) pin/click-to-lock behavior so you can read filtered cards without holding hover; (3) tap-to-filter for touch.

## CLAUDE.md updates
- **New pattern to document under `### Timeline`:** Each `<li class="tl-stop">` now carries `data-experience="<slug>"`. Stops with a matching slug in at least one `.project-card[data-experience]` get `.tl-stop-has-projects` at runtime (JS) and become hover/focus-filterable. When adding a new stop: pick a slug, add `data-experience` to both the stop and any tied cards, and add `tabindex="0"` to the stop if it has projects so keyboard focus triggers the filter.
- **Common edit paths:** add a row "Tie a project to an experience" → set matching `data-experience` slugs on the `<li class="tl-stop">` and `<article class="project-card">` in `index.html`.

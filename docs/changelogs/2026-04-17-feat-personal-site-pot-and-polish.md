# Timeline evolution, Pot chatbot, rate limit, locations
**Date:** 2026-04-17
**Branch:** `feat/personal-site`

## What changed (plain English)
This is the polish wave before shipping. The timeline went through three layouts before landing in its final home: tucked under the "Projects" title as a faded vertical rail with an up-arrow, showing both work and education stops (filled vs hollow dots), each labelled with date and location. The chatbot got a proper personality — it's now "Pot" 🫖, Leon's AI assistant, with a teapot avatar on a black disc, a formatted intro message, and proper markdown rendering for its replies. Added a 3-second per-user cooldown plus a 10-per-minute server-side rate limit so nobody can hammer the DeepSeek API. Scrollbars now blend with the cream theme instead of showing the OS default.

## Technical details

### Timeline
- Iterated through: horizontal dual-track → fixed left-side sidebar at 20vw → in-flow section below Projects → nested inside Projects' section-head at `opacity: 0.45` (final).
- Stops positioned by DOM order with a flex-column layout (no more `--x`/`--y` percentages).
- Each stop now carries an `<i class="tl-loc">` location line at 10.5px `--ink-faint`, stacked below the date. GT labelled "Remote" to reflect the OMSA program.
- `section-grid` bumped 240px → 280px to fit the longest role label without wrapping.

### Chatbot — Pot 🫖
- Avatar: 32px circle, black (`--ink`) background, teapot emoji (17px). Old "Leon" text pill replaced.
- Bot replies run through a small built-in markdown parser (`renderMarkdown` in `js/chatbot.js`) supporting `**bold**`, `*italic*`, `` `inline code` ``, fenced code blocks, bullet + numbered lists, and `[links](url)`. Input is HTML-escaped before parsing. Added matching CSS for `p/ul/ol/li/code/pre/a` inside bubbles.
- Initial greeting written as structured HTML (intro → list of topics → prompt) to showcase the markdown styling without a network round-trip.
- `white-space: pre-wrap` scoped to user bubbles only — was collapsing source indentation in bot HTML into giant blank gaps.
- System prompt in `worker/worker.js` updated so DeepSeek self-identifies as Pot.

### Rate limiting
- **Client**: 3 s cooldown between sends (`js/chatbot.js`). Submit stays disabled until cooldown expires; shows a friendly hint if triggered.
- **Worker**: in-memory `Map<ip, timestamps[]>` sliding window in `worker/worker.js`. `RATE_LIMIT_MAX = 10`, `RATE_LIMIT_WINDOW_MS = 60_000`. Keyed on `cf-connecting-ip` (→ `x-forwarded-for` → `"anon"`). Returns 429 + `Retry-After` header. Best-effort per isolate — good enough for a personal site.
- Client also handles 429 responses by showing the bot's "Too many messages — please wait ~Ns" reply.

### Scrollbars
- Firefox: `scrollbar-width: thin; scrollbar-color: var(--border-strong) transparent`.
- WebKit/Chromium: 10 px rounded thumb (`--border`, `--border-strong` on hover) with a 2 px cream `--bg` "padding" border — creates an optically smaller thumb against the cream page. Transparent track, transparent corner.
- `.chat-log` overrides track + thumb-border to `--bg-soft` so the illusion holds inside the darker chat pane.

### Misc
- Removed `white-space: pre-wrap` from default chat bubble → fixed huge blank lines in Pot's greeting.
- Photo's paper tone shifted to match `#fbf7eb` via `jimp` per-channel delta (paper avg went from `#f8f5e8` → within 1 RGB point of the page). `raw.jpg` is gitignored; `assets/portrait.jpg` is the committed web copy.
- Axis line z-index raised above dots via DOM reorder + `z-index: 1` on `.tl-dot` (previously bisected every marker).
- `CLAUDE.md` added covering architecture, the two rate-limit layers, the 280px section-grid constraint, timeline conventions, stocktaper-derived tokens, and the portrait pipeline.

### Worker-side edits preserved
- `cors()` helper accepts a comma-separated origin list (via `ALLOWED_ORIGIN`) — matches local dev origins in addition to the production GitHub Pages URL.
- `worker/package.json` "type": "module" — required for `node --check` to parse the ES-module worker.

## CLAUDE.md updates
(Already folded into `CLAUDE.md` during this wave — see that file for the consolidated architecture notes. Nothing additional to add.)

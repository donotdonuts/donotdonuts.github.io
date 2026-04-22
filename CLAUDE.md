# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Single-page personal site for Leon Chen (`donotdonuts.github.io`). Plain HTML/CSS/JS, no build step. A small Cloudflare Worker acts as a chatbot backend, proxying DeepSeek's chat API so the API key never touches the browser. See `README.md` for the visitor-facing summary and `worker/README.md` for the Worker deploy walkthrough.

## Commands

Local preview of the static site:
```bash
python3 -m http.server 8000     # from repo root — open http://localhost:8000
```

Worker dev loop (from `worker/`):
```bash
wrangler dev                     # local worker at http://127.0.0.1:8787
wrangler deploy                  # push to Cloudflare
wrangler secret put DEEPSEEK_API_KEY   # set / rotate the API key
```

Quick syntax checks:
```bash
node --check js/chatbot.js js/main.js js/config.js
node --check worker/worker.js    # requires worker/package.json "type": "module"
```

Deploy the site: push to `main`. GitHub Pages auto-serves the repo root — no CI step.

## Architecture

### Two surfaces, one repo
1. **Static site** at the repo root — `index.html`, `css/styles.css`, `js/*`, `assets/portrait.jpg`. Served by GitHub Pages directly from `main`.
2. **Cloudflare Worker** in `worker/` — an ES-module Worker (`export default { fetch }`) that proxies `api.deepseek.com/chat/completions`. Deployed independently via Wrangler; the static site talks to it over HTTPS using the URL set in `js/config.js`.

### Chatbot request flow
```
index.html  →  js/chatbot.js  →  fetch(SITE_CONFIG.chatWorkerUrl)
                                        │
                                        ▼
                             worker/worker.js  (Cloudflare)
                             ├─ CORS check (ALLOWED_ORIGIN var — comma-separated)
                             ├─ Rate limit (per-IP, in-memory, 10 req / 60s)
                             ├─ Sanitize { messages[], content } (≤20 msgs, ≤2000 chars)
                             ├─ Prepend SYSTEM_PROMPT (resume knowledge base)
                             └─ POST to api.deepseek.com → { reply }
```

The Worker's `SYSTEM_PROMPT` constant (top of `worker.js`) IS the knowledge base. Editing Leon's resume/bio = edit that string + `wrangler deploy`. No database, no KV. The system prompt also establishes the bot's identity as **"Pot" 🫖** — a tea-themed persona; keep that voice in any prompt tweaks.

### Chatbot UI: floating launcher + panel
The chatbot is **not** an inline page section — it's a floating widget that overlays every page. Three siblings live after `<footer>` in `index.html`:
- `#chat-launcher` — fixed bottom-right circular button (56 px, ink background) showing the 🫖 avatar + a soft pulse ring. Always visible.
- `#chat-panel` — fixed pop-out panel above the launcher (`width: min(494px, calc(100vw - 32px))`, `max-height: min(640px, calc(100vh - 120px))`), starts with the `hidden` attribute. Contains the panel header (avatar + "Pot" + "Ask anything about Leon" + `×` close) and the existing `#chat-widget` (log, form, hint, suggestion chips).
- `#chat-nudge` — a black pill labeled **"Ask me about Leon →"** floating just left of the launcher with a triangular tail pointing at it; `pointer-events: none` so it never blocks the launcher click. It dismisses (sets `hidden`) the first time the panel opens and stays hidden for the rest of the page lifetime. CSS hides it entirely below 480 px.

Open / close is wired in `js/chatbot.js`:
- Click `#chat-launcher` toggles; click `#chat-close` or press `Escape` closes.
- `openPanel()` removes `hidden`, sets `aria-expanded="true"` on the launcher, adds `.is-open` (suppresses the pulse), focuses `#chat-text` (unless disabled), and scrolls the log to the bottom inside `requestAnimationFrame`.
- `closePanel()` re-adds `hidden`, restores `aria-expanded="false"`, returns focus to the launcher.

Inside the panel, `.chat` is a flex column and `.chat-log` uses `flex: 1 1 auto` (no fixed `max-height`) so the message log fills whatever vertical space the panel has. The site `<nav>` only links Home / Projects / Connect — no "Ask" entry, since the launcher is always reachable.

### Chatbot rendering
- Bot's avatar is the 🫖 emoji on a black `--ink` circle (`.chat-avatar`). Initial greeting is inline HTML inside `#chat-panel` (not a fetch) so it ships instantly on page load.
- Bot messages are rendered via a small built-in markdown parser (`renderMarkdown` in `js/chatbot.js`). Supports `**bold**`, `*italic*`, `` `code` ``, fenced code blocks, bullet + numbered lists, and `[links](url)`. Input is HTML-escaped first, so untrusted output from DeepSeek can't inject tags.
- User bubbles keep `white-space: pre-wrap` so multi-space / newlines survive; bot bubbles **must not** have pre-wrap — it preserves source-code indentation from the markdown HTML and creates huge blank gaps.

### Rate limiting — two layers
- **Client** (`js/chatbot.js`): 3-second cooldown between sends, disables submit, shows hint.
- **Worker** (`worker/worker.js`): in-memory `Map<ip, timestamps[]>` sliding window, 10/60s. Best-effort per isolate — Workers may run several isolates, so the real-world cap is slightly higher. For stricter enforcement, swap to Cloudflare's Rate Limiting binding or KV.

### Section layout convention
Every content section uses `.section-grid` = `280px 1fr`. The **280px column width is load-bearing** — the longest timeline label ("Senior Planner / Data Scientist") is calibrated to fit without wrapping. Don't narrow it without shortening labels.
```
<section>
  <div class="container section-grid">
    <div class="section-head">  ← kicker + title (+ timeline, in Projects only)
    <div class="section-body">  ← the main content
```

### Timeline
- Lives **inside the Projects `section-head`** (not its own section), right under the "Projects" title, at `opacity: 0.45` — quiet context, not a focal element. Hovering, focusing, or active filtering all bump it to 0.95.
- DOM order = visual top-to-bottom order. Stops are stacked **present → earliest**. Order is not proportional to time — evenly distributed by flex gap. Mars sits on top, followed by Vibe Coding (the personal AI-assisted side-project category), then Georgia Tech, Coach, and so on down to Donghua.
- Markers are **icons, not dots**. Three kinds:
  - `#icon-wrench` — work stops (`.tl-stop-work`)
  - `#icon-book` — education stops (`.tl-stop-edu`)
  - `#icon-sparkle` — vibe / side-project stops (`.tl-stop-vibe`)
  SVG symbols are defined once in a hidden `<svg>` sprite right after `<header>` in `index.html` and referenced via `<use href="#icon-…">` from each stop. When adding a new stop, pick an existing symbol — don't reinvent. Icon chips have `background: var(--bg)` + `z-index: 1` so the axis line breaks cleanly behind them.
- Each stop has four lines in `.tl-info`: `<strong>` company/school → `<span>` role/degree → `<em>` date → `<i class="tl-loc">` location. Adding a new stop means filling all four.
- Each stop also carries a `data-experience="<slug>"` attribute (e.g. `mars`, `vibe`, `coach`, `gatech`, `chinatex-sr`, `chinatex-am`, `ncstate`, `donghua`). This is what binds the stop to its project cards (see Project filter below).
- When adding a stop that should be filter-interactive (i.e. has ≥1 tied card), include `tabindex="0"` on the `<li>` so keyboard focus can trigger the filter. Stops without projects omit `tabindex` and stay inert.
- When adding a new role or degree, drop a new `<li class="tl-stop tl-stop-work|edu|vibe">` in the right chronological slot. No `--x`/`--y` percentages to maintain.

### Project filter (click + hover)
The project grid filters by experience, driven entirely by `js/main.js`.

- Each `<article class="project-card">` has `data-experience="<slug>"` matching a timeline stop.
- On load, `main.js` tags every stop whose slug is present in at least one card with `.tl-stop-has-projects`; only those stops get hover / click / focus handlers. Stops without tied projects (currently both Chinatex stops, NC State, Donghua) stay inert.
- **Hover** an interactive stop → temp-filter. Non-matching cards drop out via `display: none` (the `.is-dim` class on cards inside `.project-grid.is-filtering`).
- **Click** → lock. Stop gets `.is-locked`: full opacity, ink-colored icon, underlined company name. Click the same stop again to clear, or click another to switch the lock.
- While locked, hovering a different stop previews its projects; `mouseleave` on the rail (or `focusout` out of it) snaps back to the locked view via `restoreLockedView()`.
- Keyboard: stops with `tabindex="0"` are reachable via Tab; `Enter` / `Space` toggles the lock. `role="button"` + `aria-pressed` are set at runtime.
- **To wire up a new experience:** add `data-experience="<slug>"` to both the stop and every tied `.project-card`, plus `tabindex="0"` on the stop. No other code changes needed — the JS auto-detects which stops to activate.

### Project cards (folded by default)
Each card renders collapsed: tag + `h3` + `.tag-list.small` only. The description `<p>` and `.project-metrics` row appear on `:hover` / `:focus-within`.

- Pure CSS — `.project-card > p { display: none }` flips to `display: block` on hover; `.project-metrics` flips to `display: flex`.
- `.project-grid` uses `align-items: start` so an expanded card doesn't force its row neighbors to grow taller.
- The fold state composes cleanly with the filter: hidden (`.is-dim`) cards never expand because they're not in the layout.

### Design tokens
All colors, fonts, and radii live as CSS custom properties in `:root` in `css/styles.css`. The palette was extracted from `stocktaper.com`'s compiled CSS:
- `--bg: #fbf7eb` (cream) / `--ink: #141414`
- `--border: #bebebe` / `--border-strong: #9e9e9e`
- `--up: #2f7d31` / `--down: #c6392c`
- Font stack: `"IBM Plex Mono"` loaded from Google Fonts, used on **every element** (body, headings, buttons). Not mixing sans + mono — stocktaper is all-mono and we match.

### Portrait pipeline
`raw.jpg` is the source upload at repo root — **gitignored**. The committed, web-optimized copy is `assets/portrait.jpg`. The paper tone in the source is slightly warmer than the page cream; we compensate with a uniform per-channel RGB shift so the photo's paper blends seamlessly with `#fbf7eb`. The shift uses `jimp`:

```bash
cd /tmp && mkdir -p img-fix && cd img-fix
npm init -y && npm install jimp@0.22 --silent
# Then run a small script that samples corner pixels of raw.jpg,
# computes (251,247,235) - avg, and adds the delta to every pixel.
# See commit 36a019b for the exact script (~40 lines).
```

After re-running the script, `assets/portrait.jpg` should be committed. If `raw.jpg` is ever replaced, re-run the shift — don't commit the source image.

### Runtime config surface
`js/config.js` holds **only one setting** worth touching: `chatWorkerUrl`. Everything else — copy, social URLs, education, photo — is hardcoded in `index.html`. If you're tempted to add more fields, ask whether they really vary across environments; most don't.

## Worker deploy gotchas

- `worker/package.json` must have `"type": "module"`. Wrangler doesn't care, but `node --check worker/worker.js` and many editors do, so keep it correct.
- `ALLOWED_ORIGIN` in `wrangler.toml` is a **comma-separated list** handled by the `cors()` helper. Local dev origins (`http://localhost:8000`, `http://127.0.0.1:8000`, `http://localhost:5173`) are already included — add your own if you use a different port.
- The Worker reads the client IP from `cf-connecting-ip` (falls back to `x-forwarded-for`, then `"anon"`). Rate-limit key is that string — don't remove the header handling without picking a different key.

## Changelog workflow

Every non-trivial change on a feature branch gets a file in `docs/changelogs/<YYYY-MM-DD>-<branch-name>.md` (plain-English summary first, technical details second, then any CLAUDE.md updates). These are NOT consolidated into CLAUDE.md automatically — they sit there until an explicit "consolidate" pass merges their CLAUDE.md-updates sections into this file. The Stop hook in the plugin's `hooks/hooks.json` blocks ending a session on a feature branch that has commits but no changelog file, so write it proactively.

## Common edit paths

| Change | File(s) |
|---|---|
| Headline / tagline / location | `index.html` hero section |
| Add / edit a project card | `index.html` — `<article class="project-card" data-experience="…">` block. Include the `data-experience` slug to wire the card into the timeline filter. |
| Tie a project to a timeline stop | Set matching `data-experience="<slug>"` on the `<li class="tl-stop">` and every `<article class="project-card">` that belongs to it. Add `tabindex="0"` to the stop if it ends up with ≥1 card. |
| Timeline entry (role, degree, or vibe side-project) | `index.html` — `<li class="tl-stop tl-stop-work\|edu\|vibe" data-experience="…">` inside `.timeline-rail`. Include wrench / book / sparkle icon, strong/span/em/tl-loc lines |
| New timeline icon type | Add a `<symbol id="icon-…">` to the sprite right after `<header>`, then reference from the stop. A matching `.tl-icon-<type>` CSS rule controls its ink color. |
| Social links | `index.html` — `.connect-list` |
| Chatbot knowledge | `worker/worker.js` — `SYSTEM_PROMPT` constant, then `wrangler deploy` |
| Chatbot identity / tone | Same `SYSTEM_PROMPT` (currently "Pot 🫖"). Avatar emoji lives in `js/chatbot.js` `AVATAR`; static greeting + suggestion chips live inside `#chat-panel` in `index.html` |
| Chatbot launcher / nudge copy | `index.html` — `#chat-launcher` `aria-label`, `#chat-nudge` text. Sizing / positioning in `css/styles.css` (`.chat-launcher`, `.chat-panel`, `.chat-nudge`) |
| Rate limit thresholds | `worker/worker.js` — `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS`; client cooldown is `COOLDOWN_MS` in `js/chatbot.js` |
| Worker model / CORS origins | `worker/wrangler.toml` `[vars]` |
| Design tokens (colors, fonts) | `css/styles.css` `:root` block |

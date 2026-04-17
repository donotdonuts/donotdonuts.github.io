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

The Worker's `SYSTEM_PROMPT` constant (top of `worker.js`) IS the knowledge base. Editing Leon's resume/bio = edit that string + `wrangler deploy`. No database, no KV.

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
- Lives **inside the Projects `section-head`** (not its own section), right under the "Projects" title, at `opacity: 0.45` — quiet context, not a focal element. Hovering or focusing bumps it to 0.95.
- DOM order = visual top-to-bottom order. The seven stops are stacked **present → earliest** (Mars first, Donghua last). Positions are NOT proportional to time anymore — they're evenly distributed by flex gap.
- Work stops (`.tl-stop-work`) render filled dots; education stops (`.tl-stop-edu`) render hollow dots. Both use `--ink-mute`.
- When adding a new role or degree, drop a new `<li class="tl-stop tl-stop-work|edu">` in the right chronological slot. No `--x`/`--y` percentages to maintain.

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
| Add / edit a project card | `index.html` — `<article class="project-card">` block |
| Timeline entry (role or degree) | `index.html` — `<li class="tl-stop …">` inside `.timeline-rail` |
| Social links | `index.html` — `.connect-list` |
| Chatbot knowledge | `worker/worker.js` — `SYSTEM_PROMPT` constant, then `wrangler deploy` |
| Worker model / CORS origins | `worker/wrangler.toml` `[vars]` |
| Design tokens (colors, fonts) | `css/styles.css` `:root` block |

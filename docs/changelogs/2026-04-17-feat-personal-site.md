# Scaffold personal website
**Date:** 2026-04-17
**Branch:** `feat/personal-site`

## What changed (plain English)
This is a brand-new personal website for Leon, built to live at
donotdonuts.github.io. It's a single long page with six sections: a hero with
headline stats, about, experience timeline, project case studies, a chatbot,
and a contact form. The visual style is inspired by stocktaper.com — light,
minimal, data-forward, with green/red metric indicators and a clean two-column
section layout. Everything is plain HTML/CSS/JS so edits are just text files
and GitHub Pages serves it without any build step.

## Technical details

- **Stack:** plain HTML/CSS/JS, no bundler. Google Fonts (Inter + JetBrains Mono).
- **index.html:** all content lives here — sections are clearly commented.
  Hero uses a 4-up metric grid modeled on stocktaper's stock-metric strip.
- **css/styles.css:** custom-property-driven design tokens; a light theme with
  blue/green/red accents, sticky backdrop-blur header, two-column section grid
  (`240px 1fr`) collapsing on mobile.
- **js/config.js:** single place to set chatWorkerUrl, formspreeUrl, social URLs,
  and contact email. Unset socials are auto-hidden by main.js.
- **js/main.js:** wires social links, renders year in footer, handles contact
  form POST to Formspree, falls back to `mailto:` when formspreeUrl is empty.
  Includes Formspree honeypot handling.
- **js/chatbot.js:** chat widget with suggestion chips, rolling history, escapes
  HTML in bot replies. Shows a friendly disabled state + error message if
  `chatWorkerUrl` is not set.
- **worker/worker.js:** Cloudflare Worker proxying DeepSeek's OpenAI-compatible
  `/chat/completions` endpoint. Enforces CORS to `donotdonuts.github.io`, caps
  history at 20 messages and 2,000 chars each, injects a resume-grounded system
  prompt. Secrets via `wrangler secret put DEEPSEEK_API_KEY`.
- **worker/wrangler.toml:** deploy config with `MODEL=deepseek-chat` and
  `ALLOWED_ORIGIN` locked down.
- **worker/README.md:** full deploy walkthrough (wrangler install → login →
  secret → deploy → wire into config.js).

### Placeholders to fill in
- `js/config.js`:
  - `chatWorkerUrl` — set after `wrangler deploy` prints the Worker URL.
  - `formspreeUrl` — sign up at formspree.io, paste endpoint.
  - `social.linkedin` / `social.github` / `social.medium`.
- `worker.js` → `SYSTEM_PROMPT` already primed with the full resume; tweak if
  tone/scope changes.
- Project cards in `index.html` derive from resume bullets (no separate project
  list was supplied). Edit freely when Leon shares project-specific work.

### Follow-ups
- Resume PDF link (add `/assets/Leon-Chen-resume.pdf` + hero download button).
- Favicon + og:image for link previews.
- Consider a dark-mode toggle (current design is light-only, matching reference).
- Worker: add basic in-memory rate limit per IP if traffic spikes (Workers KV).

## CLAUDE.md updates
- **Project type:** static site for GitHub Pages (`donotdonuts.github.io`).
  Edit HTML/CSS/JS directly; no build step; push to `main` to deploy.
- **Chatbot architecture:** static frontend → Cloudflare Worker (`worker/`) →
  DeepSeek `chat/completions`. API key lives as a Wrangler secret
  (`DEEPSEEK_API_KEY`); resume content is in `SYSTEM_PROMPT` in
  `worker/worker.js`.
- **Configuration surface:** all runtime config is in `js/config.js`
  (chatWorkerUrl, formspreeUrl, social URLs). No environment variables in the
  frontend.
- **Contact form:** Formspree-backed with mailto fallback. Honeypot field
  `_gotcha` is already in place.
- **Design gotcha:** the layout uses a two-column section grid; any new
  section must follow the `<section-head>` / `<section-body>` structure or it
  breaks mobile stacking.

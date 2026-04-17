# donotdonuts.github.io

Personal website for Liangqu "Leon" Chen. Static HTML/CSS/JS, deployed to
GitHub Pages.

## Live

https://donotdonuts.github.io/

## Structure

```
index.html          Single-page site
css/styles.css      All styles
js/
  config.js         Editable settings (worker URL, Formspree URL, socials)
  main.js           Nav, footer, social links, contact form
  chatbot.js        Chat widget + Worker fetch
worker/             Cloudflare Worker (DeepSeek chatbot proxy)
  worker.js         Worker source
  wrangler.toml     Worker config
  README.md         Deploy instructions
docs/changelogs/    Per-branch change notes (consolidated into CLAUDE.md later)
```

## Editing content

- **Text, experience, projects, skills** → edit directly in `index.html`.
  Sections are clearly commented (`<!-- HERO -->`, `<!-- ABOUT -->`, etc.).
- **Chatbot knowledge** → edit the `SYSTEM_PROMPT` constant at the top of
  `worker/worker.js`, then redeploy the worker (`cd worker && wrangler deploy`).
- **Social links, form endpoint, chat URL** → edit `js/config.js`.

## Chatbot

The chatbot uses DeepSeek's OpenAI-compatible API through a small Cloudflare Worker
that holds the API key. See [`worker/README.md`](./worker/README.md) for step-by-step
deploy instructions. Until the worker is deployed and `chatWorkerUrl` is set in
`js/config.js`, the chat input is disabled and shows a friendly note.

## Contact form

Uses [Formspree](https://formspree.io) (free tier: 50 submissions/month).

1. Sign up at https://formspree.io.
2. Create a new form — Formspree gives you an endpoint like
   `https://formspree.io/f/xxxxxx`.
3. Paste it into `formspreeUrl` in `js/config.js`.
4. Commit + push.

If you leave `formspreeUrl` empty, the form falls back to opening the visitor's
email client via `mailto:`.

## Local preview

```bash
# From the repo root:
python3 -m http.server 8000
# Open http://localhost:8000
```

Or any other static server — no build step required.

## Deploying

GitHub Pages serves straight from the `main` branch at the repo root. Merge your
branch to `main` and push — GitHub Pages picks it up automatically (usually within
a minute).

## Stack

- Plain HTML / CSS / JavaScript — no build, no bundler.
- Google Fonts: Inter, JetBrains Mono.
- Cloudflare Worker (optional): chatbot backend.
- Formspree (optional): contact form backend.

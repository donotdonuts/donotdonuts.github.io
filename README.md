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
  config.js         Single runtime setting (chat worker URL)
  main.js           Footer year
  chatbot.js        Chat widget + Worker fetch
worker/             Cloudflare Worker (DeepSeek chatbot proxy)
  worker.js         Worker source
  wrangler.toml     Worker config
  README.md         Deploy instructions
docs/changelogs/    Per-branch change notes
```

## Sections

1. **Hero** — name, one-line intro, horizontal career timeline.
2. **Projects** — six case-study cards.
3. **Ask** — chatbot grounded in the resume.
4. **Connect** — email + LinkedIn + GitHub + Medium + education.

## Editing content

- **Text, timeline, projects, education, socials** → edit directly in
  `index.html`. Sections are clearly commented.
- **Chatbot knowledge** → edit the `SYSTEM_PROMPT` constant at the top of
  `worker/worker.js`, then redeploy (`cd worker && wrangler deploy`).
- **Chat worker URL** → `js/config.js`.

## Chatbot

The chatbot uses DeepSeek's OpenAI-compatible API through a small Cloudflare
Worker that holds the API key. See [`worker/README.md`](./worker/README.md) for
step-by-step deploy instructions. Until the worker is deployed and
`chatWorkerUrl` is set in `js/config.js`, the chat input is disabled with a
friendly note.

## Local preview

```bash
# From the repo root:
python3 -m http.server 8000
# Open http://localhost:8000
```

## Deploying

GitHub Pages serves straight from the `main` branch at the repo root. Merge
your branch to `main` and push — GitHub Pages picks it up automatically.

## Stack

- Plain HTML / CSS / JavaScript — no build, no bundler.
- Google Fonts: Inter, JetBrains Mono.
- Cloudflare Worker (optional): chatbot backend.

# Chatbot — Cloudflare Worker (DeepSeek)

Tiny proxy that lets the static GitHub Pages site call DeepSeek's chat API without
exposing your API key in the browser.

## What it does

- Accepts `POST { messages: [{role, content}, ...] }` from the website.
- Prepends a system prompt grounded in Leon's resume (see top of `worker.js`).
- Calls `https://api.deepseek.com/chat/completions` (OpenAI-compatible).
- Returns `{ reply: "..." }`.
- CORS-locks the endpoint to your GitHub Pages origin.

## One-time setup

1. **Install Wrangler** (Cloudflare's CLI):
   ```bash
   npm install -g wrangler
   ```

2. **Log in** to Cloudflare:
   ```bash
   wrangler login
   ```
   (Free account is fine. Workers free tier = 100k requests/day.)

3. **Get a DeepSeek API key** from https://platform.deepseek.com/ → API keys.
      
4. **Enter this folder**:
   ```bash
   cd worker
   ```

5. **Set your API key as a secret** (never commit it):
   ```bash
   wrangler secret put DEEPSEEK_API_KEY
   ```
   Paste the key when prompted.

6. **Deploy**:
   ```bash
   wrangler deploy
   ```
   Wrangler prints a URL like `https://leon-chat.<your-subdomain>.workers.dev`.

7. **Wire it into the site**: open `../js/config.js` and set:
   ```js
   chatWorkerUrl: "https://leon-chat.<your-subdomain>.workers.dev",
   ```
   Commit + push — the chatbot goes live.

## Edit the bot's knowledge

Open `worker.js`, edit the `SYSTEM_PROMPT` constant at the top. Redeploy:
```bash
wrangler deploy
```

## Switch model

In `wrangler.toml`, change `MODEL`:
- `deepseek-chat` — fast, default (recommended for a personal site bot)
- `deepseek-reasoner` — slower, better at reasoning, costs more

Redeploy after the change.

## Local testing

```bash
wrangler dev
```
Then set `chatWorkerUrl` to `http://127.0.0.1:8787` temporarily in `js/config.js`.

## Costs & limits

- Cloudflare Workers free tier: 100,000 requests/day.
- DeepSeek pricing: see https://platform.deepseek.com/ (typically cheaper than OpenAI/Anthropic; cache-hit discount).
- Worker enforces a 20-message history cap and 2,000-char cap per message — keeps cost bounded.

## Troubleshooting

- **"missing_api_key"** → you didn't run `wrangler secret put DEEPSEEK_API_KEY`.
- **CORS error in browser console** → `ALLOWED_ORIGIN` in `wrangler.toml` doesn't match your site URL. Fix and redeploy.
- **"upstream_error: 401"** → invalid DeepSeek API key. Reset with `wrangler secret put DEEPSEEK_API_KEY`.
- **Nothing happens on the site** → check `js/config.js` — `chatWorkerUrl` must be set.

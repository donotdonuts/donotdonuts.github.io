# Enrich About Leon section of chatbot knowledge
**Date:** 2026-04-21
**Branch:** `chore/enrich-about-leon`

## What changed (plain English)
Pot (the chatbot on the site) used to know only three short facts about Leon at the top of its knowledge base. We replaced that with a richer "About Leon" section — the same kind of summary recruiters read on Leon's latest resumes. It now includes his full name, the headline "$20M+ in annual savings" impact number, the full list of things he's best known for (forecasting, optimization, causal inference, A/B testing, simulation), how he works with other teams, and where to find his social profiles. After this deploys, Pot should answer "who is Leon?" and "what does Leon do?" questions with a lot more useful detail.

## Technical details
- Rewrote the `# About Leon` bullet list inside `SYSTEM_PROMPT` in `worker/worker.js` (lines 21–24). Went from 3 bullets to 9.
- Source material: eight 2026-04 resume variants in `~/2026 job hunt/2026-04 job hunt/jobs/202604/` (Anthropic, CVS Health, JPMorgan, Lyft Fulfillment, Lyft Urban, RRL, Uber Direct, Walmart). New facts are the intersection/union of their Summary sections, not any single one.
- What was added: full name (Liangqu "Leon" Chen), end-to-end ownership framing (scope → feature eng → backtest → deploy → accuracy track with WMAPE/MAPE), additional strengths not previously listed (Bayesian analysis, simulation, hierarchical reconciliation, BSTS), extended stakeholder list (now includes Finance and Marketing), "analytics product owner" framing, bias-for-action + ambiguous-early-stage phrasing, $20M+ impact number, Python/SQL/R language fluency, and pointer to LinkedIn/GitHub/Medium via the site's Connect section.
- What was deliberately NOT added: phone number (919-455-4748 is on the resumes but the chatbot is public — the user can add this later if they want it exposed to site visitors).
- Syntax checked with `node --check worker/worker.js`.
- **Not yet deployed.** The change only takes effect in the chatbot after `cd worker && wrangler deploy`. Leon needs to run that manually.

## CLAUDE.md updates
None — no architecture, endpoint, or gotcha changes. Only knowledge-base copy.

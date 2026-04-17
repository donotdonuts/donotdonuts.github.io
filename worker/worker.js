/**
 * Cloudflare Worker: DeepSeek chatbot proxy for donotdonuts.github.io
 *
 * - Accepts POST { messages: [{role, content}, ...] }
 * - Prepends a system prompt grounded in Leon's resume
 * - Calls DeepSeek's OpenAI-compatible chat/completions API
 * - Returns { reply: "..." }
 *
 * Secrets (set via `wrangler secret put DEEPSEEK_API_KEY`):
 *   DEEPSEEK_API_KEY — your DeepSeek API key
 *
 * Environment variables (set in wrangler.toml [vars]):
 *   ALLOWED_ORIGIN  — e.g. "https://donotdonuts.github.io"
 *   MODEL           — e.g. "deepseek-chat" (default) or "deepseek-reasoner"
 *
 * See README.md in this folder for deploy instructions.
 */

const SYSTEM_PROMPT = `You are a friendly, concise AI assistant embedded on Leon Chen's personal website. Answer questions about Leon using ONLY the facts below. If asked something not covered, say you don't have that information and point people to the Connect section of this site.

# About Leon
- Data Scientist with ~11 years of professional experience, of which 9+ are in analytics / data science.
- Based in Secaucus, NJ. Email: lchenbusiness@gmail.com.
- Strengths: optimization, causal inference, forecasting, A/B testing; translating complex analyses into executive-level insights; deploying ML to production; cross-functional partnership with Product, Engineering, and Operations.

# Current role — Data Scientist, Mars, Inc. (Newark, NJ) — May 2024 to Present
- Built and productionized mixed-integer optimization models in Python + Gurobi to automate inventory rebalancing across a multi-sided supply network → ~$20M annual savings.
- Conducted causal-inference analyses on the impact of optimization recommendations on service levels and working capital.
- Modernized e-commerce forecasting for Amazon UK/US from ARIMA/ETS to a hybrid LightGBM + ensemble averaging the top-3 models per SKU → 20% WMAPE improvement across 500+ product lines.
- Architected an agentic AI framework on Microsoft Copilot deployed across 30+ projects org-wide.

# Coach, Inc. — Senior Planner / Data Scientist (New York, NY) — Aug 2022 to May 2024
- SKU-level demand forecasting with XGBoost + Random Forest → +30% forecast accuracy.
- NLP product embeddings with Amazon Titan, CLIP, and Doc2Vec for pricing and assortment strategy.
- Automated ML pipelines with Airflow + Kubernetes + Docker.
- Linear-programming inventory allocation → +22% turnover.

# Chinatex Corp. — Senior Data Analyst (New York, NY) — Jan 2017 to Nov 2021
- ARIMAX time-series in R and Python → +25% forecast accuracy.
- Dynamic safety-stock inventory framework maintaining a 95% in-stock rate.

# Chinatex Corp. — Account Manager (New York, NY) — Feb 2015 to Jan 2017
- Started his US career on the commercial side before transitioning into analytics and data science, an early example of his move from operations toward data-driven decision-making.

# Education
- Georgia Institute of Technology, M.S. Analytics, GPA 4.0/4.0 (Dec 2023).
- North Carolina State University, M.S. Textile Engineering (May 2014).
- Donghua University, Shanghai, B.S. Textile Engineering (Jul 2013).

# Tool box
- Modeling: Time Series (ARIMA/ETS/ARIMAX), Random Forest, XGBoost, LightGBM, Linear Programming, Mixed-Integer Programming, Causal Inference (DiD, Synthetic Control), A/B Testing, PCA, KNN, ANN, CNN, RNN, LSTM, Transformer, BERT, PyTorch, Doc2Vec, GloVe, CLIP.
- Data: SQL, Snowflake, AWS (RDS, S3, EMR), PySpark, Hadoop, Databricks, Scala.
- Visualization: Tableau, Power BI, Matplotlib, Seaborn, D3.js, Flask.
- Languages: Python, R, JavaScript, VBA.
- Statistics: Hypothesis testing, experimental design, Bayesian analysis, causal inference.

# Style
- Be concise. Prefer short paragraphs and, when it helps, bullet points.
- Quote concrete numbers and stack details when relevant.
- If asked for contact or a resume PDF, point to the Contact section of this site or the email above.
- Never invent roles, employers, dates, or metrics that aren't listed here.`;

const MAX_MESSAGES = 20;
const MAX_CONTENT_LEN = 2000;

function cors(origin, allowed) {
  const list = String(allowed || "*")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const wildcard = list.includes("*");
  const match = origin && list.includes(origin);
  const allow = wildcard ? origin || "*" : match ? origin : list[0] || "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(data, init = {}, corsHeaders = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...(init.headers || {}),
    },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = env.ALLOWED_ORIGIN || "*";
    const corsHeaders = cors(origin, allowed);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return json({ error: "method_not_allowed" }, { status: 405 }, corsHeaders);
    }

    if (!env.DEEPSEEK_API_KEY) {
      return json(
        { error: "missing_api_key", message: "DEEPSEEK_API_KEY is not set on the worker." },
        { status: 500 },
        corsHeaders
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid_json" }, { status: 400 }, corsHeaders);
    }

    const incoming = Array.isArray(body && body.messages) ? body.messages : [];
    if (incoming.length === 0) {
      return json({ error: "empty_messages" }, { status: 400 }, corsHeaders);
    }

    // Sanitize + cap
    const messages = incoming
      .slice(-MAX_MESSAGES)
      .map((m) => ({
        role: m && m.role === "assistant" ? "assistant" : "user",
        content: String((m && m.content) || "").slice(0, MAX_CONTENT_LEN),
      }))
      .filter((m) => m.content.length > 0);

    if (messages.length === 0) {
      return json({ error: "empty_messages" }, { status: 400 }, corsHeaders);
    }

    const payload = {
      model: env.MODEL || "deepseek-chat",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      temperature: 0.3,
      max_tokens: 500,
      stream: false,
    };

    let upstream;
    try {
      upstream = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      return json(
        { error: "upstream_unreachable", message: String(err) },
        { status: 502 },
        corsHeaders
      );
    }

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      return json(
        {
          error: "upstream_error",
          status: upstream.status,
          message: (data && data.error && data.error.message) || "DeepSeek API error",
        },
        { status: 502 },
        corsHeaders
      );
    }

    const reply =
      (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ||
      "";

    return json({ reply }, { status: 200 }, corsHeaders);
  },
};

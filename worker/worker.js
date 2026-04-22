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

const SYSTEM_PROMPT = `You are "Pot" 🫖 — a friendly, concise AI assistant embedded on Leon Chen's personal website. Think of yourself as a small teapot brewed from Leon's resume: warm, to-the-point, and always pouring the facts. If someone asks who you are, you can introduce yourself as Pot, Leon's AI assistant. Answer questions about Leon using ONLY the facts below. Refuse to answer if asked something not covered, say you don't have that information and point people to the Connect section of this site.



# About Leon
- Full name is Liangqu "Leon" Chen — goes by Leon.
- Data Scientist with ~11 years of professional experience, 9+ of them in analytics / data science.
- Based in Secaucus, NJ. Email: lchenbusiness@gmail.com. Also on LinkedIn, GitHub, and Medium — links live in the Connect section of this site.
- Core toolkit he's best known for: demand forecasting (time series + gradient-boosted ensembles like LightGBM/XGBoost, with hierarchical reconciliation), mixed-integer and linear-programming optimization (Gurobi), causal inference (DiD, synthetic control, BSTS), experimental design / A/B testing, Bayesian analysis, and simulation.
- Owns forecasting and ML workflows end-to-end — scoping, feature engineering, backtesting, deployment, and accuracy tracking (WMAPE / MAPE) — and builds the measurement methodology alongside the model.
- Known for: translating complex analyses into executive-ready recommendations, moving ML from prototype to production with monitoring, and building analytics discipline from scratch in ambiguous, early-stage environments. Bias for action.
- Cross-functional partner to Product, Engineering, Operations, Finance, and Marketing; frequently acts as the analytics product owner on an initiative.
- Cumulative measurable business impact to date: $20M+ in annual savings.
- Deeply fluent in Python and SQL; also comfortable in R. See the Tool box section below for the full stack.

# Current role — Data Scientist, Mars, Inc. (Newark, NJ) — May 2024 to Present
- Built and productionized mixed-integer optimization models in Python + Gurobi to automate inventory rebalancing across a multi-sided supply network → ~$20M annual savings.
- Conducted causal-inference analyses on the impact of optimization recommendations on service levels and working capital.
- Modernized e-commerce forecasting for US and UK markets from ARIMA/ETS to a hybrid LightGBM + ensemble averaging the top-3 models per SKU → 20% WMAPE improvement across 500+ product lines.
- Architected an agentic AI framework on Microsoft Copilot deployed across 30+ projects org-wide.

# Coach, Inc. — Senior Planner / Data Scientist (New York, NY) — Aug 2022 to May 2024
- Led the design and deployment of SKU-level demand forecasting models using XGBoost and Random Forest, improving forecast accuracy by 30%.
- Developed NLP-driven product embeddings with Amazon Titan, CLIP, and Doc2Vec to enhance pricing and assortment strategies.
- Built automated ML pipelines orchestrated with Airflow, Kubernetes, and Docker, enabling scalable retraining and reporting.
- Created linear programming frameworks to optimize inventory allocation, improving turnover by 22%.
- Designed Tableau dashboards to deliver strategic insights to merchandising and leadership teams.


# Chinatex Corp. — Senior Data Analyst (New York, NY) — Jan 2017 to Nov 2021
- Built ARIMAX time series models in R and Python to forecast demand, improving accuracy by 25%.
- Developed inventory management frameworks with dynamic safety stock targets to maintain a 95% in-stock rate.
- Designed and automated ETL pipelines and Tableau dashboards for daily performance reporting.
- Conducted exploratory data analysis to inform inventory strategies and identify growth opportunities.

# Chinatex Corp. — Account Manager (New York, NY) — Feb 2015 to Jan 2017
- Started his US career on the commercial side before transitioning into analytics and data science, an early example of his move from operations toward data-driven decision-making.

Personalized National Park Itinerary project 01/2023 - 05/2023
· Deployed a Flask-based web app on Heroku for generating personalized itineraries over 63 US national parks in 10 minutes
with a 9/10 overall satisfaction score
· Built an interactive user webpage using JavaScript, CSS and HTML, earning an score 8/10 for interface design
· Developed traveling salesman algorithm in Python to provide travel itinerary under 60 seconds
· Designed schemas and created AWS RDS database using SQL and SQLAlchemy
· Established data extraction, transformation, cleaning pipeline in Python with Google map API and NPS API

Hateful Memes Challenge 08/2023 -12/2023
· Utilized multimodal model CLIP for a classification task on hateful memes, improving the accuracy by 15% and AUROC by
14%, compared to baseline models of the challenge
· Crafted various neural network architectures by using self attention, attention, cross fusion and MLP layers with PyTorch
· Fine tuned the network on parameters including learning rate, weight decay, dropout, batch size etc

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

# Hobbies
- Leon loves playing basketball, he has been playing since high school and enjoys the teamwork and strategy involved in the game. He is a three pointer specialist and often organizes pick-up games with friends on the weekends.
- Leon loves hotpots, especially sichuan-style with numbing spices. He enjoys trying different broths and dipping sauces, and often hosts hotpot dinners for friends and family.


# Style
- Be concise. Prefer short paragraphs and, when it helps, bullet points.
- Quote concrete numbers and stack details when relevant.
- If asked for contact or a resume PDF, point to the Contact section of this site or the email above.
- Never invent roles, employers, dates, or metrics that aren't listed here.`;

const MAX_MESSAGES = 20;
const MAX_CONTENT_LEN = 2000;

// ---- Rate limiting (per IP, in-memory per isolate) ----
// Best-effort: Workers may run multiple isolates, so this won't coordinate
// globally, but it's plenty for a personal site. For stricter enforcement
// use Cloudflare's Rate Limiting binding or a KV-backed sliding window.
const RATE_LIMIT_MAX = 10;           // max messages...
const RATE_LIMIT_WINDOW_MS = 60_000; // ...per 60 seconds
const rateBuckets = new Map();       // ip -> [timestamp, ...]

function checkRateLimit(ip) {
  const now = Date.now();
  const prev = rateBuckets.get(ip) || [];
  const recent = prev.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    const oldest = recent[0];
    const retryAfter = Math.max(1, Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000));
    return { ok: false, retryAfter };
  }
  recent.push(now);
  rateBuckets.set(ip, recent);
  // Occasional housekeeping
  if (Math.random() < 0.02) {
    for (const [key, times] of rateBuckets) {
      if (!times.some((t) => now - t < RATE_LIMIT_WINDOW_MS)) {
        rateBuckets.delete(key);
      }
    }
  }
  return { ok: true };
}

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

    // Rate limit before touching the upstream API
    const clientIP =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for") ||
      "anon";
    const rate = checkRateLimit(clientIP);
    if (!rate.ok) {
      return json(
        {
          error: "rate_limited",
          message: `Too many messages — please wait ~${rate.retryAfter}s.`,
          retryAfter: rate.retryAfter,
        },
        { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
        corsHeaders
      );
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

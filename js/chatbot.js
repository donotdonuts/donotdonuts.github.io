(function () {
  "use strict";

  const cfg = window.SITE_CONFIG || {};
  const AVATAR = "🫖";
  const AVATAR_LABEL = "Pot";

  const logEl = document.getElementById("chat-log");
  const formEl = document.getElementById("chat-form");
  const inputEl = document.getElementById("chat-text");
  const hintEl = document.getElementById("chat-hint");
  const submitEl = formEl && formEl.querySelector("button[type=submit]");
  const suggestionButtons = document.querySelectorAll(".chat-suggestions .chip");

  if (!logEl || !formEl || !inputEl) return;

  // Keep a rolling transcript for the worker.
  // The worker is responsible for prepending the system prompt.
  const history = [];

  // ---- Client-side cooldown (defense-in-depth with worker rate limit) ----
  const COOLDOWN_MS = 3000;
  let lastSentAt = 0;
  let cooldownTimer = null;

  // ---- Minimal markdown → HTML renderer ---------------------------------
  // Handles: **bold**, *italic*, `code`, ```code blocks```, bullet + ordered
  // lists, [links](https://...), line breaks, paragraphs. HTML in source is
  // escaped before processing so untrusted input can't inject tags.
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
  }

  function renderMarkdown(raw) {
    let text = escapeHtml(raw);

    // Fenced code blocks first so their contents aren't touched by inline rules
    const codeBlocks = [];
    text = text.replace(/```([\s\S]*?)```/g, (m, code) => {
      codeBlocks.push(code.replace(/^\n+|\n+$/g, ""));
      return `\u0000CODEBLOCK${codeBlocks.length - 1}\u0000`;
    });

    // Inline code
    text = text.replace(/`([^`\n]+)`/g, "<code>$1</code>");
    // Bold then italic (bold first so ** doesn't get eaten by *)
    text = text.replace(/\*\*([^*\n][^*]*?)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/(^|[\s(])\*([^*\n]+?)\*(?=[\s).,!?;:]|$)/g, "$1<em>$2</em>");
    text = text.replace(/(^|[\s(])_([^_\n]+?)_(?=[\s).,!?;:]|$)/g, "$1<em>$2</em>");
    // Links [text](url)
    text = text.replace(
      /\[([^\]]+)\]\(((?:https?|mailto):[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    // Block structure: lists and paragraphs
    const lines = text.split("\n");
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (/^\s*[-*]\s+/.test(line)) {
        out.push("<ul>");
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
          out.push("<li>" + lines[i].replace(/^\s*[-*]\s+/, "") + "</li>");
          i++;
        }
        out.push("</ul>");
        continue;
      }
      if (/^\s*\d+\.\s+/.test(line)) {
        out.push("<ol>");
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          out.push("<li>" + lines[i].replace(/^\s*\d+\.\s+/, "") + "</li>");
          i++;
        }
        out.push("</ol>");
        continue;
      }
      out.push(line);
      i++;
    }

    // Split into paragraphs by blank lines; wrap text paragraphs in <p>
    const joined = out.join("\n");
    const paragraphs = joined.split(/\n\s*\n+/).map((p) => {
      const trimmed = p.trim();
      if (!trimmed) return "";
      if (/^<(ul|ol|pre)/.test(trimmed)) return trimmed;
      return "<p>" + trimmed.replace(/\n/g, "<br />") + "</p>";
    });
    let html = paragraphs.filter(Boolean).join("\n");

    // Restore fenced code blocks
    html = html.replace(/\u0000CODEBLOCK(\d+)\u0000/g, (m, idx) => {
      return "<pre><code>" + escapeHtml(codeBlocks[Number(idx)]) + "</code></pre>";
    });
    return html;
  }

  function addMsg(role, text) {
    const msg = document.createElement("div");
    msg.className = "chat-msg chat-msg-" + (role === "user" ? "user" : "bot");
    if (role !== "user") {
      const avatar = document.createElement("span");
      avatar.className = "chat-avatar";
      avatar.textContent = AVATAR;
      avatar.setAttribute("aria-label", AVATAR_LABEL);
      msg.appendChild(avatar);
    }
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    if (role === "user") {
      bubble.innerHTML = escapeHtml(text).replace(/\n/g, "<br />");
    } else {
      bubble.innerHTML = renderMarkdown(text);
    }
    msg.appendChild(bubble);
    logEl.appendChild(msg);
    logEl.scrollTop = logEl.scrollHeight;
    return bubble;
  }

  function addTyping() {
    const msg = document.createElement("div");
    msg.className = "chat-msg chat-msg-bot";
    const avatar = document.createElement("span");
    avatar.className = "chat-avatar";
    avatar.textContent = AVATAR;
    msg.appendChild(avatar);
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble typing";
    bubble.textContent = "Thinking…";
    msg.appendChild(bubble);
    logEl.appendChild(msg);
    logEl.scrollTop = logEl.scrollHeight;
    return msg;
  }

  function showHint(text, cls) {
    if (!hintEl) return;
    hintEl.textContent = text || "";
    hintEl.className = "chat-hint" + (cls ? " " + cls : "");
  }

  // If the worker URL isn't configured, show a friendly note and disable input.
  if (!cfg.chatWorkerUrl) {
    showHint(
      "Chatbot not yet live — deploy the Cloudflare Worker in /worker and set chatWorkerUrl in js/config.js."
    );
    inputEl.disabled = true;
    if (submitEl) submitEl.disabled = true;
    suggestionButtons.forEach((b) => (b.disabled = true));
    return;
  }

  function setBusy(busy) {
    inputEl.disabled = busy;
    if (submitEl) submitEl.disabled = busy;
  }

  async function send(question) {
    if (!question || !question.trim()) return;

    // Client-side cooldown
    const now = Date.now();
    const waitMs = lastSentAt + COOLDOWN_MS - now;
    if (waitMs > 0) {
      showHint(`Easy tiger — one message every ${Math.ceil(COOLDOWN_MS / 1000)}s.`);
      return;
    }
    lastSentAt = now;

    inputEl.value = "";
    setBusy(true);
    showHint("");

    addMsg("user", question);
    history.push({ role: "user", content: question });
    const typing = addTyping();

    try {
      const res = await fetch(cfg.chatWorkerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      typing.remove();

      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        const retry = (data && data.retryAfter) || 30;
        addMsg(
          "bot",
          `Too many messages in a short window — please wait ~${retry}s and try again.`
        );
        return;
      }

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        addMsg(
          "bot",
          "Sorry — the chatbot is having trouble right now. (" +
            res.status +
            (txt ? ": " + txt.slice(0, 120) : "") +
            ")"
        );
        return;
      }

      const data = await res.json();
      const reply =
        (data && (data.reply || data.content || data.message)) ||
        "I didn't catch that — could you rephrase?";

      addMsg("bot", reply);
      history.push({ role: "assistant", content: reply });
    } catch (err) {
      typing.remove();
      addMsg(
        "bot",
        "Network error reaching the chatbot. Please try again in a moment."
      );
    } finally {
      setBusy(false);
      inputEl.focus();
      // Light visual cue: while cooldown ticks, keep submit disabled.
      if (cooldownTimer) clearTimeout(cooldownTimer);
      submitEl.disabled = true;
      cooldownTimer = setTimeout(() => { submitEl.disabled = false; }, COOLDOWN_MS);
    }
  }

  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    send(inputEl.value);
  });

  suggestionButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const q = btn.getAttribute("data-q");
      if (q) send(q);
    });
  });
})();

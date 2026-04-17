(function () {
  "use strict";

  const cfg = window.SITE_CONFIG || {};

  const logEl = document.getElementById("chat-log");
  const formEl = document.getElementById("chat-form");
  const inputEl = document.getElementById("chat-text");
  const hintEl = document.getElementById("chat-hint");
  const suggestionButtons = document.querySelectorAll(".chat-suggestions .chip");

  if (!logEl || !formEl || !inputEl) return;

  // Keep a rolling transcript for the worker.
  // The worker is responsible for prepending the system prompt.
  const history = [];

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[c]);
  }

  function addMsg(role, text) {
    const msg = document.createElement("div");
    msg.className = "chat-msg chat-msg-" + (role === "user" ? "user" : "bot");
    if (role !== "user") {
      const avatar = document.createElement("span");
      avatar.className = "chat-avatar";
      avatar.textContent = "LC";
      msg.appendChild(avatar);
    }
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    bubble.innerHTML = escapeHtml(text).replace(/\n/g, "<br />");
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
    avatar.textContent = "LC";
    msg.appendChild(avatar);
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble typing";
    bubble.textContent = "Thinking…";
    msg.appendChild(bubble);
    logEl.appendChild(msg);
    logEl.scrollTop = logEl.scrollHeight;
    return msg;
  }

  // If the worker URL isn't configured, show a friendly note and disable input.
  if (!cfg.chatWorkerUrl) {
    hintEl.textContent =
      "Chatbot not yet live — deploy the Cloudflare Worker in /worker and set chatWorkerUrl in js/config.js.";
    inputEl.disabled = true;
    formEl.querySelector("button[type=submit]").disabled = true;
    suggestionButtons.forEach((b) => (b.disabled = true));
    return;
  }

  async function send(question) {
    if (!question || !question.trim()) return;
    inputEl.value = "";
    inputEl.disabled = true;
    formEl.querySelector("button[type=submit]").disabled = true;

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
      inputEl.disabled = false;
      formEl.querySelector("button[type=submit]").disabled = false;
      inputEl.focus();
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

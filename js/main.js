(function () {
  "use strict";

  const cfg = window.SITE_CONFIG || {};

  // Year in footer
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Wire up social links: hide any that aren't configured
  document.querySelectorAll("a[data-social]").forEach((a) => {
    const key = a.getAttribute("data-social");
    const url = cfg.social && cfg.social[key];
    if (url) {
      a.setAttribute("href", url);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    } else {
      // Hide unconfigured social links + the adjacent separator dot
      const dot = a.previousElementSibling;
      if (dot && dot.classList.contains("dot")) dot.remove();
      a.remove();
    }
  });

  // ---- Contact form ----
  const form = document.getElementById("contact-form");
  const status = document.getElementById("contact-status");

  function setStatus(msg, cls) {
    if (!status) return;
    status.textContent = msg;
    status.className = "form-status" + (cls ? " " + cls : "");
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const data = new FormData(form);
      // Honeypot tripped — silently succeed
      if (data.get("_gotcha")) {
        setStatus("Thanks — your message was sent.", "success");
        form.reset();
        return;
      }

      const name = (data.get("name") || "").toString().trim();
      const email = (data.get("email") || "").toString().trim();
      const message = (data.get("message") || "").toString().trim();

      if (!name || !email || !message) {
        setStatus("Please fill in your name, email, and message.", "error");
        return;
      }

      // If no Formspree endpoint, fall back to mailto:
      if (!cfg.formspreeUrl) {
        const subject = encodeURIComponent(
          (data.get("subject") || "Website contact").toString()
        );
        const body = encodeURIComponent(
          `${message}\n\n— ${name} <${email}>`
        );
        window.location.href = `mailto:${cfg.contactEmail}?subject=${subject}&body=${body}`;
        setStatus("Opening your email client…", "success");
        return;
      }

      setStatus("Sending…");
      try {
        const res = await fetch(cfg.formspreeUrl, {
          method: "POST",
          headers: { Accept: "application/json" },
          body: data,
        });
        if (res.ok) {
          setStatus("Thanks — your message was sent.", "success");
          form.reset();
        } else {
          const json = await res.json().catch(() => ({}));
          const err =
            (json.errors && json.errors.map((x) => x.message).join(", ")) ||
            "Something went wrong. Please try again or email me directly.";
          setStatus(err, "error");
        }
      } catch (err) {
        setStatus(
          "Network error. Please try again or email me directly.",
          "error"
        );
      }
    });
  }
})();

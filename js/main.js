(function () {
  "use strict";

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const rail = document.querySelector(".timeline-rail");
  const grid = document.querySelector(".project-grid");
  if (!rail || !grid) return;

  const stops = Array.from(rail.querySelectorAll(".tl-stop[data-experience]"));
  const cards = Array.from(grid.querySelectorAll(".project-card[data-experience]"));
  const tied = new Set(cards.map((c) => c.dataset.experience));

  stops.forEach((stop) => {
    if (tied.has(stop.dataset.experience)) {
      stop.classList.add("tl-stop-has-projects");
    }
  });

  const activate = (stop) => {
    const exp = stop.dataset.experience;
    rail.classList.add("is-filtering");
    grid.classList.add("is-filtering");
    stops.forEach((s) => s.classList.toggle("is-active", s === stop));
    cards.forEach((c) => c.classList.toggle("is-dim", c.dataset.experience !== exp));
  };

  const clear = () => {
    rail.classList.remove("is-filtering");
    grid.classList.remove("is-filtering");
    stops.forEach((s) => s.classList.remove("is-active"));
    cards.forEach((c) => c.classList.remove("is-dim"));
  };

  stops.forEach((stop) => {
    if (!stop.classList.contains("tl-stop-has-projects")) return;
    stop.addEventListener("mouseenter", () => activate(stop));
    stop.addEventListener("focus", () => activate(stop));
  });

  rail.addEventListener("mouseleave", clear);
  rail.addEventListener("focusout", (e) => {
    if (!rail.contains(e.relatedTarget)) clear();
  });
})();

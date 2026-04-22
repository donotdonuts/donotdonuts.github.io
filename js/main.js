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
      stop.setAttribute("role", "button");
      stop.setAttribute("aria-pressed", "false");
      stop.setAttribute("title", "Click to pin this filter · click again to clear");
    }
  });

  let lockedStop = null;

  const showExperience = (exp) => {
    rail.classList.add("is-filtering");
    grid.classList.add("is-filtering");
    stops.forEach((s) => s.classList.toggle("is-active", s.dataset.experience === exp));
    cards.forEach((c) => c.classList.toggle("is-dim", c.dataset.experience !== exp));
  };

  const clearAll = () => {
    rail.classList.remove("is-filtering");
    grid.classList.remove("is-filtering");
    stops.forEach((s) => s.classList.remove("is-active"));
    cards.forEach((c) => c.classList.remove("is-dim"));
  };

  // When the mouse / focus leaves the rail, fall back to whatever's locked —
  // or clear everything if nothing is locked.
  const restoreLockedView = () => {
    if (lockedStop) showExperience(lockedStop.dataset.experience);
    else clearAll();
  };

  const toggleLock = (stop) => {
    if (lockedStop === stop) {
      lockedStop.classList.remove("is-locked");
      lockedStop.setAttribute("aria-pressed", "false");
      lockedStop = null;
      clearAll();
      return;
    }
    if (lockedStop) {
      lockedStop.classList.remove("is-locked");
      lockedStop.setAttribute("aria-pressed", "false");
    }
    lockedStop = stop;
    lockedStop.classList.add("is-locked");
    lockedStop.setAttribute("aria-pressed", "true");
    showExperience(stop.dataset.experience);
  };

  stops.forEach((stop) => {
    if (!stop.classList.contains("tl-stop-has-projects")) return;
    stop.addEventListener("mouseenter", () => showExperience(stop.dataset.experience));
    stop.addEventListener("focus", () => showExperience(stop.dataset.experience));
    stop.addEventListener("click", () => toggleLock(stop));
    stop.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleLock(stop);
      }
    });
  });

  rail.addEventListener("mouseleave", restoreLockedView);
  rail.addEventListener("focusout", (e) => {
    if (!rail.contains(e.relatedTarget)) restoreLockedView();
  });
})();

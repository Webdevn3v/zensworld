(() => {
  "use strict";

  const listeners = new Map();
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");

  const ZenBus = {
    on(event, fn) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(fn);
      return () => listeners.get(event)?.delete(fn);
    },
    emit(event, data) {
      listeners.get(event)?.forEach((fn) => {
        try { fn(data); } catch (error) { console.error(`ZenBus ${event}:`, error); }
      });
    }
  };

  const ZenCommon = {
    getStars() { return Number(localStorage.getItem("zenStars") || 0); },
    updateStars() {
      const stars = this.getStars();
      document.querySelectorAll("[data-stars]").forEach((node) => { node.textContent = String(stars); });
    },
    restartAnimation(el, className) {
      if (!el || reducedMotion?.matches) return;
      el.classList.remove(className);
      void el.offsetWidth;
      el.classList.add(className);
      window.setTimeout(() => el.classList.remove(className), 700);
    },
    celebrate(el) {
      this.restartAnimation(el, "zen-celebrate");
      ZenBus.emit("feedback:success", { element: el });
    },
    shake(el) {
      this.restartAnimation(el, "zen-shake");
      ZenBus.emit("feedback:error", { element: el });
    },
    feedback(ok, feedbackEl, sourceEl) {
      const target = sourceEl || feedbackEl;
      if (ok) this.celebrate(target);
      else this.shake(target);
    },
    addSpaceBackground() {
      if (document.querySelector(".space-bg")) return;
      const bg = document.createElement("div");
      bg.className = "space-bg";
      bg.setAttribute("aria-hidden", "true");
      bg.innerHTML = '<div class="nebula nebula-one"></div><div class="nebula nebula-two"></div><div class="stars stars-one"></div><div class="stars stars-two"></div><i class="ambient-spark"></i>';
      document.body.prepend(bg);
    },
    bindPressStates() {
      document.addEventListener("pointerdown", (event) => {
        const target = event.target.closest(".btn,.answer,.activity-card,.card,.biglink");
        if (target) target.classList.add("is-pressed");
      });
      ["pointerup", "pointercancel", "pointerleave"].forEach((name) => {
        document.addEventListener(name, () => document.querySelectorAll(".is-pressed").forEach((el) => el.classList.remove("is-pressed")), true);
      });
    },
    scheduleAmbientSpark() {
      if (reducedMotion?.matches) return;
      const spark = document.querySelector(".ambient-spark");
      if (!spark) return;
      const trigger = () => {
        spark.style.setProperty("--spark-x", `${10 + Math.random() * 80}vw`);
        spark.style.setProperty("--spark-y", `${10 + Math.random() * 70}vh`);
        this.restartAnimation(spark, "is-twinkling");
        window.setTimeout(trigger, 20000 + Math.random() * 20000);
      };
      window.setTimeout(trigger, 8000 + Math.random() * 8000);
    },
    init() {
      this.addSpaceBackground();
      this.updateStars();
      this.bindPressStates();
      this.scheduleAmbientSpark();
    }
  };

  const ZEN = {
    load(key, fallback) {
      try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
      } catch { return fallback; }
    },
    save(key, value) { localStorage.setItem(key, JSON.stringify(value)); return value; },
    star(amount = 1) {
      const next = ZenCommon.getStars() + Number(amount || 0);
      localStorage.setItem("zenStars", String(next));
      ZenCommon.updateStars();
      ZenBus.emit("stars:changed", { stars: next, amount });
      return next;
    },
    addStat(skill, correct) {
      const stats = this.load("stats", {});
      const current = stats[skill] || { correct: 0, total: 0 };
      current.total += 1;
      if (correct) current.correct += 1;
      stats[skill] = current;
      this.save("stats", stats);
      ZenBus.emit("progress:updated", { skill, correct, stats: current });
    },
    complete(activity) {
      const completed = this.load("completed", {});
      completed[activity] = (completed[activity] || 0) + 1;
      this.save("completed", completed);
      ZenBus.emit("activity:complete", { activity, count: completed[activity] });
    }
  };

  window.ZenBus = ZenBus;
  window.ZenCommon = ZenCommon;
  window.ZEN = ZEN;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => ZenCommon.init());
  else ZenCommon.init();
})();

(() => {
  "use strict";

  const listeners = new Map();
  const ZenBus = {
    on(event, fn) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(fn);
      return () => listeners.get(event)?.delete(fn);
    },
    emit(event, data) {
      listeners.get(event)?.forEach((fn) => {
        try { fn(data); } catch (error) { console.error(`ZenBus:${event}`, error); }
      });
    }
  };

  const storage = {
    load(key, fallback) {
      try {
        const value = localStorage.getItem(`zen:${key}`);
        return value === null ? fallback : JSON.parse(value);
      } catch { return fallback; }
    },
    save(key, value) {
      localStorage.setItem(`zen:${key}`, JSON.stringify(value));
      return value;
    }
  };

  const ZenCommon = {
    reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    getStars() { return Number(localStorage.getItem("zenStars") || 0); },
    updateStars() {
      document.querySelectorAll("[data-stars]").forEach((node) => {
        node.textContent = String(this.getStars());
      });
    },
    restartAnimation(el, className) {
      if (!el || this.reduceMotion) return;
      el.classList.remove(className);
      void el.offsetWidth;
      el.classList.add(className);
      el.addEventListener("animationend", () => el.classList.remove(className), { once: true });
    },
    celebrate(el) {
      this.restartAnimation(el, "zen-celebrate");
      this.sparkle(el);
      ZenBus.emit("feedback:correct", { element: el });
    },
    shake(el) {
      this.restartAnimation(el, "zen-shake");
      ZenBus.emit("feedback:wrong", { element: el });
    },
    sparkle(el) {
      if (this.reduceMotion || !el) return;
      const burst = document.createElement("span");
      burst.className = "zen-spark-burst";
      burst.setAttribute("aria-hidden", "true");
      burst.textContent = "✦ ✧ ★ ✧ ✦";
      const host = el.closest(".game,.card,.glass-panel,.activity-card") || el.parentElement || document.body;
      host.style.position ||= "relative";
      host.appendChild(burst);
      setTimeout(() => burst.remove(), 850);
    },
    speakLabel(el) {
      const label = el?.dataset?.speak || el?.getAttribute?.("aria-label") || el?.textContent?.trim();
      if (label) window.Jarvie?.say?.(label, { force: true, transient: true });
    },
    installPressStates() {
      document.addEventListener("pointerdown", (event) => {
        const el = event.target.closest("button,a,.answer,.activity-card");
        if (!el) return;
        el.classList.add("is-pressed");
      });
      ["pointerup", "pointercancel", "pointerleave"].forEach((type) => {
        document.addEventListener(type, (event) => event.target.closest?.("button,a,.answer,.activity-card")?.classList.remove("is-pressed"));
      });
    },
    addSpaceBackground() {
      if (document.querySelector(".space-bg")) return;
      const bg = document.createElement("div");
      bg.className = "space-bg";
      bg.setAttribute("aria-hidden", "true");
      bg.innerHTML = '<div class="nebula nebula-one"></div><div class="nebula nebula-two"></div><div class="stars stars-one"></div>';
      document.body.prepend(bg);
    },
    installWorldDock() {
      if (document.querySelector(".world-dock")) return;
      const old = document.querySelector(".sitebar,.site-header");
      if (old && !old.classList.contains("site-header")) old.hidden = true;
      const nav = document.createElement("nav");
      nav.className = "world-dock glass-panel";
      nav.setAttribute("aria-label", "Clubhouse world map");
      const items = [
        ["🏠", "Home", "index.html"], ["📚", "Learn World", "learn.html"],
        ["🎨", "Create World", "create.html"], ["🪞", "Weirdo Room", "character-maker.html"],
        ["🏆", "Treasure Room", "my-stuff.html"]
      ];
      nav.innerHTML = items.map(([icon,label,href]) => `<a href="${href}" data-speak="${label}"><span aria-hidden="true">${icon}</span><small>${label}</small></a>`).join("");
      document.body.insertBefore(nav, document.body.firstElementChild?.nextSibling || null);
    },
    scheduleAmbient() {
      if (this.reduceMotion) return;
      const trigger = () => {
        const spark = document.createElement("span");
        spark.className = "ambient-spark";
        spark.textContent = Math.random() > .5 ? "✦" : "·";
        spark.style.left = `${8 + Math.random() * 84}%`;
        spark.style.top = `${8 + Math.random() * 75}%`;
        document.body.appendChild(spark);
        setTimeout(() => spark.remove(), 1800);
        this.ambientTimer = setTimeout(trigger, 20000 + Math.random() * 20000);
      };
      this.ambientTimer = setTimeout(trigger, 12000 + Math.random() * 12000);
    },
    enhanceSpokenControls() {
      document.addEventListener("focusin", (event) => {
        const el = event.target.closest("[data-speak]");
        if (el) this.speakLabel(el);
      });
      document.addEventListener("click", (event) => {
        const el = event.target.closest("[data-speak]");
        if (el && !el.matches("a[href]")) this.speakLabel(el);
      });
    },
    init() {
      this.addSpaceBackground();
      this.installWorldDock();
      this.installPressStates();
      this.enhanceSpokenControls();
      this.updateStars();
      this.scheduleAmbient();
      window.addEventListener("storage", () => this.updateStars());
    }
  };

  const ZEN = {
    load: storage.load,
    save: storage.save,
    star(amount = 1) {
      const next = ZenCommon.getStars() + Number(amount || 1);
      localStorage.setItem("zenStars", String(next));
      ZenCommon.updateStars();
      ZenBus.emit("stars:changed", next);
      return next;
    },
    addStat(skill, correct) {
      const stats = storage.load("stats", {});
      const current = stats[skill] || { tries: 0, correct: 0 };
      current.tries += 1;
      if (correct) current.correct += 1;
      stats[skill] = current;
      storage.save("stats", stats);
      ZenBus.emit("stat:changed", { skill, correct, current });
    },
    complete(activity) {
      const completed = storage.load("completed", {});
      completed[activity] = (completed[activity] || 0) + 1;
      storage.save("completed", completed);
      ZenBus.emit("activity:complete", { activity, count: completed[activity] });
    }
  };

  window.ZenBus = ZenBus;
  window.ZenCommon = ZenCommon;
  window.ZEN = ZEN;
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", () => ZenCommon.init()) : ZenCommon.init();
})();

(() => {
  "use strict";

  const ZenCommon = {
    getStars() {
      return Number(localStorage.getItem("zenStars") || 0);
    },

    updateStars() {
      const stars = this.getStars();

      document.querySelectorAll("[data-stars]").forEach((node) => {
        node.textContent = String(stars);
      });
    }
  };

  window.ZenCommon = ZenCommon;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => ZenCommon.updateStars());
  } else {
    ZenCommon.updateStars();
  }
})();

(() => {
  "use strict";

  const Jarvie = {
    name: "Jarvie",
    mood: "ready",
    soundOn: false,

    ideas: [
      "Draw a creature that lives inside a computer.",
      "Make a character whose superpower is kindness.",
      "Find three words that rhyme with 'star.'",
      "Build a weird outfit using only three colors.",
      "Solve five math problems, then reward yourself with drawing time.",
      "Invent a tiny game you could explain in one sentence."
    ],

    messages: [
      "You do not have to get it perfect. Start weird.",
      "Pick one thing. We can build from there.",
      "I vote for making something no one has seen before.",
      "Your ideas count, even when they are messy.",
      "Need a challenge? Tap Ask Jarvie."
    ],

    init() {
      this.cache();
      this.bindEvents();
      this.updateGreeting();
      window.ZenCommon?.updateStars();
    },

    cache() {
      this.orb = document.getElementById("jarvieOrb");
      this.speech = document.getElementById("jarvieSpeech");
      this.ideaBtn = document.getElementById("jarvieIdeaBtn");
      this.dialog = document.getElementById("jarvieDialog");
      this.dialogMessage = document.getElementById("dialogMessage");
      this.soundToggle = document.getElementById("soundToggle");
      this.journalBtn = document.getElementById("ideaJournalBtn");
      this.journalDialog = document.getElementById("ideaJournalDialog");
      this.journalInput = document.getElementById("ideaJournalInput");
      this.saveIdeaBtn = document.getElementById("saveIdeaBtn");
      this.saveNote = document.getElementById("ideaSaveNote");
    },

    bindEvents() {
      this.orb?.addEventListener("click", () => this.speakRandomMessage());
      this.ideaBtn?.addEventListener("click", () => this.openIdea());
      this.soundToggle?.addEventListener("click", () => this.toggleSound());
      this.journalBtn?.addEventListener("click", () => this.openJournal());
      this.saveIdeaBtn?.addEventListener("click", (event) => this.saveIdea(event));
    },

    updateGreeting() {
      const hour = new Date().getHours();
      let greeting = "Good evening";

      if (hour < 12) greeting = "Good morning";
      else if (hour < 17) greeting = "Good afternoon";

      const heading = document.querySelector(".hero-copy h1");
      if (heading) heading.textContent = `${greeting}, Zen.`;
    },


    speakRandomMessage() {
      const message = this.randomFrom(this.messages);
      if (this.speech) this.speech.textContent = message;
      this.pulseOrb();
    },

    openIdea() {
      if (!this.dialog || !this.dialogMessage) return;
      this.dialogMessage.textContent = this.randomFrom(this.ideas);
      this.dialog.showModal();
    },

    openJournal() {
      if (!this.journalDialog) return;
      this.saveNote.textContent = "";
      this.journalDialog.showModal();
      setTimeout(() => this.journalInput?.focus(), 100);
    },

    saveIdea(event) {
      const idea = this.journalInput?.value.trim();

      if (!idea) {
        event.preventDefault();
        this.saveNote.textContent = "Write your idea first.";
        return;
      }

      const existing = JSON.parse(localStorage.getItem("zenIdeaJournal") || "[]");
      existing.push({
        text: idea,
        createdAt: new Date().toISOString()
      });

      localStorage.setItem("zenIdeaJournal", JSON.stringify(existing));
      this.journalInput.value = "";
      this.saveNote.textContent = "Saved. I will remember that.";
    },

    toggleSound() {
      this.soundOn = !this.soundOn;
      this.soundToggle?.setAttribute("aria-pressed", String(this.soundOn));
      if (this.soundToggle) {
        this.soundToggle.style.boxShadow = this.soundOn
          ? "0 0 22px rgba(255,79,200,.55)"
          : "none";
      }
      if (this.speech) {
        this.speech.textContent = this.soundOn
          ? "Clubhouse sounds are on."
          : "Clubhouse sounds are off.";
      }
    },

    pulseOrb() {
      if (!this.orb) return;
      this.orb.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.08)" },
          { transform: "scale(1)" }
        ],
        { duration: 420, easing: "ease-out" }
      );
    },

    randomFrom(items) {
      return items[Math.floor(Math.random() * items.length)];
    }
  };

  window.Jarvie = Jarvie;
  document.addEventListener("DOMContentLoaded", () => Jarvie.init());
})();

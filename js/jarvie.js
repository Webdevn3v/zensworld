(() => {
  "use strict";

  const Jarvie = {
    name: "Jarvie",
    mood: "ready",
    voiceOn: false,
    hasIntroduced: false,
    selectedVoice: null,

    ideas: [
      "Draw a creature that lives inside a computer.",
      "Make a character whose superpower is kindness.",
      "Find three words that rhyme with star.",
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
      this.prepareVoice();
      this.updateVoiceButton();
    },

    cache() {
      this.orb = document.getElementById("jarvieOrb");
      this.speech = document.getElementById("jarvieSpeech");
      this.ideaBtn = document.getElementById("jarvieIdeaBtn");
      this.dialog = document.getElementById("jarvieDialog");
      this.dialogMessage = document.getElementById("dialogMessage");
      this.soundToggle = document.getElementById("soundToggle");
      this.voiceHint = document.getElementById("voiceHint");
      this.journalBtn = document.getElementById("ideaJournalBtn");
      this.journalDialog = document.getElementById("ideaJournalDialog");
      this.journalInput = document.getElementById("ideaJournalInput");
      this.saveIdeaBtn = document.getElementById("saveIdeaBtn");
      this.saveNote = document.getElementById("ideaSaveNote");
    },

    bindEvents() {
      this.orb?.addEventListener("click", () => this.handleOrbTap());
      this.ideaBtn?.addEventListener("click", () => this.openIdea());
      this.soundToggle?.addEventListener("click", () => this.toggleVoice());
      this.journalBtn?.addEventListener("click", () => this.openJournal());
      this.saveIdeaBtn?.addEventListener("click", (event) => this.saveIdea(event));
    },

    updateGreeting() {
      const hour = new Date().getHours();
      let greeting = "Good evening";

      if (hour < 12) greeting = "Good morning";
      else if (hour < 17) greeting = "Good afternoon";

      this.currentGreeting = `${greeting}, Zen. Ready to make something awesome today?`;

      const heading = document.querySelector(".hero-copy h1");
      if (heading) heading.textContent = `${greeting}, Zen.`;
    },

    prepareVoice() {
      if (!("speechSynthesis" in window)) {
        if (this.speech) {
          this.speech.textContent = "Voice is not available on this device yet.";
        }

        if (this.soundToggle) {
          this.soundToggle.hidden = true;
        }

        if (this.voiceHint) {
          this.voiceHint.textContent = "Jarvie voice is not available on this device yet.";
        }

        return;
      }

      const chooseVoice = () => {
        const voices = window.speechSynthesis.getVoices();

        this.selectedVoice =
          voices.find((voice) => /google us english/i.test(voice.name) && /en-US/i.test(voice.lang)) ||
          voices.find((voice) => /en-US/i.test(voice.lang) && voice.default) ||
          voices.find((voice) => /en-US/i.test(voice.lang)) ||
          voices.find((voice) => /^en/i.test(voice.lang)) ||
          voices[0] ||
          null;
      };

      chooseVoice();
      window.speechSynthesis.addEventListener("voiceschanged", chooseVoice, { once: true });
    },

    handleOrbTap() {
      if (!this.hasIntroduced) {
        this.hasIntroduced = true;
        this.voiceOn = true;
        this.updateVoiceButton();

        if (this.speech) {
          this.speech.textContent = this.currentGreeting;
        }

        this.say(this.currentGreeting);
        this.pulseOrb();
        return;
      }

      this.speakRandomMessage();
    },

    speakRandomMessage() {
      const message = this.randomFrom(this.messages);

      if (this.speech) {
        this.speech.textContent = message;
      }

      this.say(message);
      this.pulseOrb();
    },

    openIdea() {
      if (!this.dialog || !this.dialogMessage) return;

      const idea = this.randomFrom(this.ideas);
      const spokenMessage = `Try this. ${idea}`;

      this.dialogMessage.textContent = idea;
      this.dialog.showModal();
      this.say(spokenMessage);
    },

    openJournal() {
      if (!this.journalDialog) return;

      this.saveNote.textContent = "";
      this.journalDialog.showModal();
      this.say("What should we build next? You can type your idea here.");
      setTimeout(() => this.journalInput?.focus(), 100);
    },

    saveIdea(event) {
      const idea = this.journalInput?.value.trim();

      if (!idea) {
        event.preventDefault();
        this.saveNote.textContent = "Write your idea first.";
        this.say("Write your idea first.");
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
      this.say("Saved. I will remember that.");
    },

    toggleVoice() {
      if (!("speechSynthesis" in window)) return;

      this.voiceOn = !this.voiceOn;
      this.updateVoiceButton();

      if (this.voiceOn) {
        const message = "Jarvie voice is on.";

        if (this.speech) {
          this.speech.textContent = message;
        }

        this.say(message);
      } else {
        window.speechSynthesis.cancel();

        if (this.speech) {
          this.speech.textContent = "Jarvie voice is off.";
        }
      }
    },

    updateVoiceButton() {
      if (!this.soundToggle) return;

      this.soundToggle.setAttribute("aria-pressed", String(this.voiceOn));
      this.soundToggle.setAttribute(
        "aria-label",
        this.voiceOn ? "Turn Jarvie voice off" : "Turn Jarvie voice on"
      );
      this.soundToggle.title = this.voiceOn
        ? "Turn Jarvie voice off"
        : "Turn Jarvie voice on";

      const icon = this.soundToggle.querySelector("span");

      if (icon) {
        icon.textContent = this.voiceOn ? "🔊" : "🔇";
      }
    },

    say(message) {
      if (!this.voiceOn || !("speechSynthesis" in window) || !message) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(message);
      utterance.voice = this.selectedVoice;
      utterance.lang = this.selectedVoice?.lang || "en-US";
      utterance.rate = 0.92;
      utterance.pitch = 1.02;
      utterance.volume = 1;

      window.speechSynthesis.speak(utterance);
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

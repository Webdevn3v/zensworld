(() => {
  "use strict";

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const Jarvie = {
    state: "idle",
    voiceOn: true,
    selectedVoice: null,
    recognition: null,
    recognitionHandled: false,
    currentGreeting: "Hey, Zen. Ready to make something awesome today?",

    intents: [
      { name: "math", url: "math.html", label: "math game", phrases: ["math", "numbers", "adding", "addition", "counting", "counting game", "subtract"] },
      { name: "reading", url: "reading.html", label: "reading lesson", phrases: ["reading", "words", "sight words", "phonics", "story time", "read"] },
      { name: "art", url: "art-studio.html", label: "art studio", phrases: ["draw", "drawing", "art", "art studio", "paint", "coloring", "colouring"] },
      { name: "character", url: "character-maker.html", label: "character maker", phrases: ["make a weirdo", "weirdo", "character", "my character", "dress up"] },
      { name: "stuff", url: "my-stuff.html", label: "my stuff", phrases: ["my stuff", "my stars", "my crew", "show my stuff", "show my crew"] }
    ],

    ideas: [
      "Draw a creature that lives inside a computer.",
      "Make a character whose superpower is kindness.",
      "Find three words that rhyme with star.",
      "Build a weird outfit using only three colors.",
      "Solve five math problems, then reward yourself with drawing time.",
      "Invent a tiny game you could explain in one sentence."
    ],

    init() {
      this.cache();
      if (!this.orb) return;
      this.prepareVoice();
      this.prepareRecognition();
      this.bindEvents();
      this.updateGreeting();
      this.updateVoiceButton();
      this.setState("idle");
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
      this.orb.addEventListener("click", () => this.handleOrbTap());
      this.ideaBtn?.addEventListener("click", () => this.openIdea());
      this.soundToggle?.addEventListener("click", () => this.toggleVoice());
      this.journalBtn?.addEventListener("click", () => this.openJournal());
      this.saveIdeaBtn?.addEventListener("click", (event) => this.saveIdea(event));
      window.ZenBus?.on("stars:changed", ({ stars }) => this.setSpeech(`Nice! You have ${stars} stars now.`));
    },

    setState(next) {
      const allowed = ["idle", "greeting", "listening", "thinking", "speaking", "navigating", "error"];
      if (!allowed.includes(next)) return;
      this.state = next;
      this.orb.dataset.state = next;
      this.orb.setAttribute("aria-label", next === "listening" ? "Jarvie is listening" : "Tap Jarvie to talk");
      window.ZenBus?.emit("jarvie:state", { state: next });
    },

    updateGreeting() {
      const hour = new Date().getHours();
      const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
      this.currentGreeting = `${greeting}, Zen. Ready to make something awesome today?`;
      const heading = document.querySelector(".hero-copy h1");
      if (heading) heading.textContent = `${greeting}, Zen.`;
    },

    prepareVoice() {
      if (!("speechSynthesis" in window)) {
        this.voiceOn = false;
        this.soundToggle && (this.soundToggle.hidden = true);
        return;
      }
      const choose = () => {
        const voices = speechSynthesis.getVoices();
        this.selectedVoice = voices.find(v => v.default && /^en-US/i.test(v.lang)) || voices.find(v => /^en-US/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang)) || voices[0] || null;
      };
      choose();
      speechSynthesis.addEventListener("voiceschanged", choose, { once: true });
    },

    prepareRecognition() {
      if (!Recognition) {
        if (this.voiceHint) this.voiceHint.textContent = "Tap Jarvie to hear him. Voice commands work best in Chrome.";
        return;
      }
      this.recognition = new Recognition();
      this.recognition.lang = "en-US";
      this.recognition.interimResults = false;
      this.recognition.continuous = false;
      this.recognition.maxAlternatives = 3;
      this.recognition.onstart = () => { this.setState("listening"); this.setSpeech("I'm listening..."); };
      this.recognition.onresult = (event) => this.handleRecognitionResult(event);
      this.recognition.onerror = (event) => this.handleRecognitionError(event.error);
      this.recognition.onend = () => {
        if (!this.recognitionHandled && this.state === "listening") this.respondError("no-speech");
      };
    },

    handleOrbTap() {
      if (["listening", "thinking", "speaking", "navigating"].includes(this.state)) return;
      if (!this.recognition) {
        this.say(this.currentGreeting, { state: "greeting" });
        return;
      }
      if ("speechSynthesis" in window) speechSynthesis.cancel();
      this.recognitionHandled = false;
      try { this.recognition.start(); }
      catch { this.respondError("engine"); }
    },

    normalize(text) { return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim(); },

    matchIntent(transcript, confidence = 0) {
      const text = this.normalize(transcript);
      const ranked = this.intents.map(intent => {
        let score = 0;
        intent.phrases.forEach(phrase => {
          const normalized = this.normalize(phrase);
          if (text === normalized) score += 6;
          else if (text.includes(normalized)) score += normalized.includes(" ") ? 4 : 2;
        });
        if (score && confidence > .65) score += .5;
        return { intent, score };
      }).sort((a, b) => b.score - a.score);
      return ranked[0]?.score >= 2 ? ranked[0] : null;
    },

    handleRecognitionResult(event) {
      this.recognitionHandled = true;
      this.setState("thinking");
      const alternatives = Array.from(event.results[0] || []);
      let best = null;
      alternatives.forEach(result => {
        const match = this.matchIntent(result.transcript, Number(result.confidence || 0));
        if (match && (!best || match.score > best.score)) best = { ...match, transcript: result.transcript };
      });
      if (!best) { this.respondError("no-match"); return; }
      this.openIntent(best.intent);
    },

    openIntent(intent) {
      const line = `Opening the ${intent.label}!`;
      this.say(line, {
        onEnd: () => {
          this.setState("navigating");
          window.setTimeout(() => { window.location.href = intent.url; }, 180);
        }
      });
      window.ZenBus?.emit("voice:intent", { intent: intent.name, url: intent.url });
    },

    handleRecognitionError(error) {
      this.recognitionHandled = true;
      const type = error === "not-allowed" || error === "service-not-allowed" ? "permission" : error === "no-speech" ? "no-speech" : error === "audio-capture" ? "mic" : "engine";
      this.respondError(type);
    },

    respondError(type) {
      const messages = {
        "no-speech": "I didn't hear anything. Tap me and try again?",
        permission: "The microphone is blocked. A grown-up can allow it in Chrome settings.",
        mic: "I can't find the microphone right now.",
        engine: "My listening gears got tangled. Try me again in a second.",
        "no-match": "I heard you, but I didn't catch the adventure. Try math, reading, art, a weirdo, or my stuff."
      };
      this.setState("error");
      this.say(messages[type] || messages.engine, { state: "error" });
    },

    say(message, options = {}) {
      this.setSpeech(message);
      if (!this.voiceOn || !("speechSynthesis" in window)) {
        options.onEnd?.();
        this.setState("idle");
        return;
      }
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.voice = this.selectedVoice;
      utterance.lang = this.selectedVoice?.lang || "en-US";
      utterance.rate = .94;
      utterance.pitch = 1.02;
      utterance.onstart = () => this.setState(options.state || "speaking");
      utterance.onend = () => { if (options.onEnd) options.onEnd(); else this.setState("idle"); };
      utterance.onerror = () => this.setState("idle");
      speechSynthesis.speak(utterance);
    },

    setSpeech(message) { if (this.speech) this.speech.textContent = message; },
    toggleVoice() {
      this.voiceOn = !this.voiceOn;
      if (!this.voiceOn && "speechSynthesis" in window) speechSynthesis.cancel();
      this.updateVoiceButton();
      this.setSpeech(this.voiceOn ? "Jarvie voice is on." : "Jarvie voice is off. You can still use voice commands.");
    },
    updateVoiceButton() {
      if (!this.soundToggle) return;
      this.soundToggle.setAttribute("aria-pressed", String(this.voiceOn));
      this.soundToggle.setAttribute("aria-label", this.voiceOn ? "Turn Jarvie voice off" : "Turn Jarvie voice on");
      const icon = this.soundToggle.querySelector("span");
      if (icon) icon.textContent = this.voiceOn ? "🔊" : "🔇";
    },
    openIdea() {
      const idea = this.ideas[Math.floor(Math.random() * this.ideas.length)];
      if (this.dialogMessage) this.dialogMessage.textContent = idea;
      this.dialog?.showModal();
      this.say(`Try this. ${idea}`);
    },
    openJournal() {
      if (!this.journalDialog) return;
      this.saveNote.textContent = "";
      this.journalDialog.showModal();
      this.say("What should we build next? Type your idea here.");
      setTimeout(() => this.journalInput?.focus(), 100);
    },
    saveIdea(event) {
      const idea = this.journalInput?.value.trim();
      if (!idea) { event.preventDefault(); this.saveNote.textContent = "Write your idea first."; return; }
      const existing = JSON.parse(localStorage.getItem("zenIdeaJournal") || "[]");
      existing.push({ text: idea, createdAt: new Date().toISOString() });
      localStorage.setItem("zenIdeaJournal", JSON.stringify(existing));
      this.journalInput.value = "";
      this.saveNote.textContent = "Saved. I will remember that.";
      this.say("Saved. I will remember that.");
    }
  };

  window.Jarvie = Jarvie;
  document.addEventListener("DOMContentLoaded", () => Jarvie.init());
})();

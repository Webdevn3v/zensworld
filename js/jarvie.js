(() => {
  "use strict";
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const states = new Set(["idle","greeting","listening","thinking","speaking","navigating","error"]);

  const Jarvie = {
    state: "idle", voiceOn: true, selectedVoice: null, recognition: null, lastIntroPage: "",
    intents: [
      { name:"math", href:"math.html", words:["math","numbers","adding","addition","counting","counting game"] },
      { name:"reading", href:"reading.html", words:["reading","words","sight words","story time","phonics"] },
      { name:"art", href:"art-studio.html", words:["draw","drawing","art","art studio","paint","coloring","colouring"] },
      { name:"character maker", href:"character-maker.html", words:["make a weirdo","weirdo","character","my character","dress up"] },
      { name:"my stuff", href:"my-stuff.html", words:["my stuff","my stars","my crew","treasure","trophy"] }
    ],
    intros: {
      "index.html":"Welcome to your Clubhouse. Tap a world, or tap Jarvie and tell me where you want to go.",
      "learn.html":"This is Learn World. Tap the book for reading, or the numbers for math.",
      "reading.html":"This is Reading World. We will listen to sounds, blend them together, then play word games.",
      "math.html":"This is Math World. Count the pictures, then tap your answer.",
      "create.html":"This is Create World. Tap the easel to draw, or the mirror to make a weirdo.",
      "art-studio.html":"This is the Art Studio. Pick a color and draw on the big white canvas.",
      "character-maker.html":"This is the Weirdo Room. Tap the choices to build a character.",
      "my-stuff.html":"This is your Treasure Room. Your stars and saved creations live here."
    },
    cache() {
      this.orb = document.getElementById("jarvieOrb"); this.speech = document.getElementById("jarvieSpeech");
      this.soundToggle = document.getElementById("soundToggle"); this.ideaBtn = document.getElementById("jarvieIdeaBtn");
      this.dialog = document.getElementById("jarvieDialog"); this.dialogMessage = document.getElementById("dialogMessage");
      this.journalBtn = document.getElementById("ideaJournalBtn"); this.journalDialog = document.getElementById("ideaJournalDialog");
      this.journalInput = document.getElementById("ideaJournalInput"); this.saveIdeaBtn = document.getElementById("saveIdeaBtn");
      this.saveNote = document.getElementById("ideaSaveNote");
    },
    init() {
      this.cache(); this.prepareVoice(); this.prepareRecognition(); this.bind(); this.updateVoiceButton();
      setTimeout(() => this.autoIntroduce(), 650);
    },
    setState(next, message = "") {
      if (!states.has(next)) return;
      this.state = next;
      document.documentElement.dataset.jarvieState = next;
      this.orb?.setAttribute("data-state", next);
      if (message && this.speech) this.speech.textContent = message;
      window.ZenBus?.emit("jarvie:state", { state: next, message });
    },
    prepareVoice() {
      if (!("speechSynthesis" in window)) { this.voiceOn = false; return; }
      const choose = () => {
        const voices = speechSynthesis.getVoices();
        this.selectedVoice = voices.find(v => v.default && /^en/i.test(v.lang)) || voices.find(v => /en-US/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang)) || voices[0] || null;
      };
      choose(); speechSynthesis.addEventListener("voiceschanged", choose, { once:true });
    },
    prepareRecognition() {
      if (!Recognition) return;
      const recognition = new Recognition();
      recognition.lang = "en-US"; recognition.interimResults = false; recognition.maxAlternatives = 3; recognition.continuous = false;
      recognition.onstart = () => this.setState("listening", "I'm listening. What should we open?");
      recognition.onresult = (event) => {
        this.setState("thinking", "Let me think...");
        const alternatives = Array.from(event.results[0]);
        this.handleTranscript(alternatives);
      };
      recognition.onerror = (event) => {
        if (event.error === "aborted") return;
        const lines = {
          "no-speech":"I didn't hear any words. Tap me and try again.",
          "not-allowed":"The microphone is blocked. Ask a grown-up to allow it.",
          "service-not-allowed":"Voice listening is not available here.",
          "audio-capture":"I cannot find the microphone right now."
        };
        this.fail(lines[event.error] || "My listening ears had a glitch. Try again.");
      };
      recognition.onend = () => { if (this.state === "listening") this.setState("idle"); };
      this.recognition = recognition;
    },
    bind() {
      this.orb?.addEventListener("click", () => this.startListening());
      this.soundToggle?.addEventListener("click", () => this.toggleVoice());
      this.ideaBtn?.addEventListener("click", () => this.openIdea());
      this.journalBtn?.addEventListener("click", () => this.openJournal());
      this.saveIdeaBtn?.addEventListener("click", (event) => this.saveIdea(event));
    },
    autoIntroduce() {
      const page = location.pathname.split("/").pop() || "index.html";
      const line = this.intros[page];
      if (!line || sessionStorage.getItem(`zenIntro:${page}`)) return;
      sessionStorage.setItem(`zenIntro:${page}`, "1");
      this.setState("greeting", line); this.say(line, { force:true });
    },
    say(message, options = {}) {
      if (!message || !("speechSynthesis" in window) || (!this.voiceOn && !options.force)) return Promise.resolve();
      if (this.recognition && this.state === "listening") { try { this.recognition.abort(); } catch {} }
      speechSynthesis.cancel(); this.setState("speaking", message);
      return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.voice = this.selectedVoice; utterance.lang = this.selectedVoice?.lang || "en-US";
        utterance.rate = .9; utterance.pitch = 1.03;
        utterance.onend = () => { if (!options.keepState && this.state === "speaking") this.setState("idle"); resolve(); };
        utterance.onerror = () => { this.setState("idle"); resolve(); };
        speechSynthesis.speak(utterance);
      });
    },
    startListening() {
      if (["speaking","thinking","navigating"].includes(this.state)) return;
      if (!this.recognition) { this.fail("Voice listening works best in Chrome. You can still tap a world to go there."); return; }
      speechSynthesis?.cancel?.();
      try { this.recognition.start(); } catch { this.fail("My listening ears are already waking up. Try once more."); }
    },
    score(text, intent) {
      const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
      return intent.words.reduce((score, word) => score + (normalized.includes(word) ? Math.max(2, word.split(" ").length + 1) : 0), 0);
    },
    handleTranscript(alternatives) {
      const ranked = this.intents.map(intent => {
        let best = 0, confidence = 0;
        alternatives.forEach(alt => {
          const score = this.score(alt.transcript, intent);
          if (score > best) { best = score; confidence = Number(alt.confidence || 0); }
        });
        return { intent, score: best, confidence };
      }).sort((a,b) => b.score - a.score || b.confidence - a.confidence);
      if (!ranked[0] || ranked[0].score === 0) { this.fail("I heard you, but I didn't know that place. Try saying math, reading, art, weirdo, or my stuff."); return; }
      if (ranked[1] && ranked[0].score === ranked[1].score) { this.fail(`Did you mean ${ranked[0].intent.name}? Tap me and say it again.`); return; }
      this.navigate(ranked[0].intent);
    },
    async navigate(intent) {
      await this.say(`Opening ${intent.name}!`, { keepState:true, force:true });
      this.setState("navigating", `Opening ${intent.name}!`);
      setTimeout(() => { location.href = intent.href; }, 260);
    },
    async fail(message) { this.setState("error", message); await this.say(message, { force:true }); setTimeout(() => this.setState("idle"), 250); },
    toggleVoice() { this.voiceOn = !this.voiceOn; if (!this.voiceOn) speechSynthesis?.cancel?.(); this.updateVoiceButton(); if (this.voiceOn) this.say("Jarvie voice is on.", { force:true }); },
    updateVoiceButton() {
      if (!this.soundToggle) return;
      this.soundToggle.setAttribute("aria-pressed", String(this.voiceOn));
      this.soundToggle.setAttribute("aria-label", this.voiceOn ? "Turn Jarvie voice off" : "Turn Jarvie voice on");
      const icon = this.soundToggle.querySelector("span"); if (icon) icon.textContent = this.voiceOn ? "🔊" : "🔇";
    },
    openIdea() {
      const ideas = ["Draw a creature that lives inside a computer.","Make a character with a kindness superpower.","Find three words that rhyme with star.","Build an outfit using only three colors."];
      const idea = ideas[Math.floor(Math.random()*ideas.length)];
      if (this.dialogMessage) this.dialogMessage.textContent = idea; this.dialog?.showModal(); this.say(`Try this. ${idea}`, { force:true });
    },
    openJournal() { this.journalDialog?.showModal(); this.say("Tell me what we should build next.", { force:true }); setTimeout(() => this.journalInput?.focus(), 100); },
    saveIdea(event) {
      event?.preventDefault(); const idea = this.journalInput?.value.trim();
      if (!idea) { if (this.saveNote) this.saveNote.textContent = "Write your idea first."; return; }
      const ideas = window.ZEN.load("ideaJournal", []); ideas.push({ text:idea, createdAt:new Date().toISOString() }); window.ZEN.save("ideaJournal", ideas);
      if (this.journalInput) this.journalInput.value = ""; if (this.saveNote) this.saveNote.textContent = "Saved!"; this.say("Saved. I will remember that.", { force:true });
    }
  };
  window.Jarvie = Jarvie;
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", () => Jarvie.init()) : Jarvie.init();
})();

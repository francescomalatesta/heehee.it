(() => {
  "use strict";

  // Intervalli tra un verso e l'altro, in secondi
  const MODES = {
    smooth:   { min: 300, max: 600 },
    bad:      { min: 120, max: 300 },
    thriller: { min: 60,  max: 120 },
  };
  const FLOOR = { cols: 14, rows: 7 };
  const TITLE = document.title;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = (id) => document.getElementById(id);
  const el = {
    start: $("start"), intro: $("intro"), status: $("status"), word: $("word"),
    fedora: $("fedora"), floor: $("floor"), count: $("count"), volume: $("volume"),
    now: $("now"), pause: $("pause"), modes: $("modes"), canvas: $("sparkles"),
  };

  // ---------- preferenze (solo comodità: la pagina funziona anche senza) ----------
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem("heehee:" + key);
        return v === null ? fallback : JSON.parse(v);
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem("heehee:" + key, JSON.stringify(value)); } catch {}
    },
  };
  const today = new Date().toISOString().slice(0, 10);

  const state = {
    mode: MODES[store.get("mode")] ? store.get("mode") : "smooth",
    volume: store.get("volume", 0.8),
    count: (() => { const c = store.get("count", null); return c && c.day === today ? c.n : 0; })(),
    started: false,
    paused: false,
    timer: null,
  };

  // ---------- audio ----------
  let ctx, gain;
  let clips = [];
  let bag = [];
  let last = null;

  // Il testo a schermo viene dal nome del file:
  //   heehee.mp3           → HEEHEE!
  //   hee-hee.mp3          → HEE-HEE!
  //   annie_are_you_ok.mp3 → ANNIE ARE YOU OK!
  // Un numero finale (shamone-2.mp3) serve solo a distinguere le varianti e non compare.
  function labelFromFile(file) {
    const text = file
      .replace(/\.[^.]+$/, "")
      .replace(/[-_ ]?\d+$/, "")
      .replace(/_/g, " ")
      .trim()
      .toUpperCase();
    return /[!?]$/.test(text) ? text : text + "!";
  }

  async function loadClips() {
    const files = await fetch("sounds/manifest.json").then((r) => r.json());
    const loaded = await Promise.allSettled(files.map(async (file) => {
      const data = await fetch("sounds/" + encodeURIComponent(file)).then((r) => {
        if (!r.ok) throw new Error(file + ": " + r.status);
        return r.arrayBuffer();
      });
      return { file, label: labelFromFile(file), buffer: await ctx.decodeAudioData(data) };
    }));
    clips = loaded.filter((r) => r.status === "fulfilled").map((r) => r.value);
  }

  // "Sacchetto": si pescano tutti i versi prima di rimescolare,
  // e mai lo stesso verso due volte di fila.
  function nextClip() {
    if (!bag.length) {
      bag = [...clips];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    let i = bag.length - 1;
    while (i > 0 && bag[i] === last) i--;
    last = bag.splice(i, 1)[0];
    return last;
  }

  function play(clip = nextClip()) {
    if (!clip) return;
    if (ctx.state === "suspended") ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = clip.buffer;
    src.connect(gain);
    src.start();
    react(clip);
  }

  function schedule() {
    clearTimeout(state.timer);
    if (!state.started || state.paused) return;
    const { min, max } = MODES[state.mode];
    const delay = (min + Math.random() * (max - min)) * 1000;
    state.timer = setTimeout(() => { play(); schedule(); }, delay);
  }

  async function start() {
    if (state.started) return;
    el.start.disabled = true;
    el.start.textContent = "Carico i versi…";
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      gain = ctx.createGain();
      gain.gain.value = state.volume;
      gain.connect(ctx.destination);
      await ctx.resume();
      await loadClips();
    } catch (err) {
      console.error(err);
    }
    if (!clips.length) {
      el.start.disabled = false;
      el.start.textContent = "Riprova";
      el.intro.querySelector("p").textContent =
        "Non riesco a caricare i versi. Controlla la connessione e riprova.";
      return;
    }
    state.started = true;
    el.intro.hidden = true;
    el.status.hidden = false;
    el.pause.disabled = false;
    updateStatus();
    play(); // il primo subito, così sai che l'audio funziona
    schedule();
  }

  async function playNow() {
    if (!state.started) return start();
    play();
    schedule();
  }

  function togglePause() {
    state.paused = !state.paused;
    el.pause.textContent = state.paused ? "Riprendi" : "Pausa";
    updateStatus();
    schedule();
  }

  function updateStatus() {
    el.status.classList.toggle("paused", state.paused);
    el.status.textContent = state.paused
      ? "In pausa. Michael aspetta dietro le quinte."
      : "In ascolto. Il prossimo verso arriva quando meno te lo aspetti.";
  }

  // ---------- reazione visiva ----------
  function restart(node, cls) {
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
  }

  // Rimpicciolisce il testo solo se la parola più lunga non entra nello schermo
  function fitWord(label) {
    el.word.style.fontSize = "";
    const longest = label.split(" ").reduce((a, b) => (b.length > a.length ? b : a));
    const probe = document.createElement("span");
    probe.textContent = longest;
    probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap";
    el.word.appendChild(probe);
    const style = getComputedStyle(el.word);
    const room = (el.word.clientWidth - 2 * parseFloat(style.paddingLeft)) * 0.95;
    const width = probe.offsetWidth;
    probe.remove();
    if (width > room) el.word.style.fontSize = parseFloat(style.fontSize) * room / width + "px";
  }

  let titleTimer;
  function react(clip) {
    el.word.textContent = clip.label;
    fitWord(clip.label);
    restart(el.word, "pop");
    restart(el.fedora, "tip");
    if (!reducedMotion) restart(document.body, "shake");
    ripple();
    burst();

    state.count += 1;
    el.count.textContent = state.count;
    store.set("count", { day: today, n: state.count });

    document.title = clip.label + " 🕺";
    clearTimeout(titleTimer);
    titleTimer = setTimeout(() => { document.title = TITLE; }, 3000);
  }

  // ---------- pavimento ----------
  const tiles = [];
  for (let r = 0; r < FLOOR.rows; r++) {
    for (let c = 0; c < FLOOR.cols; c++) {
      const t = document.createElement("div");
      t.className = "tile";
      el.floor.appendChild(t);
      tiles.push({ node: t, r, c });
    }
  }

  function ripple() {
    // parte da una piastrella vicina al centro, dove "atterra" il verso
    const c = Math.floor(FLOOR.cols / 2) - 2 + Math.floor(Math.random() * 4);
    const origin = tiles[c + FLOOR.cols * Math.floor(Math.random() * 2)];
    for (const t of tiles) {
      const d = Math.hypot(t.r - origin.r, t.c - origin.c);
      if (d > 3.2) continue;
      setTimeout(() => {
        t.node.classList.add("lit");
        setTimeout(() => t.node.classList.remove("lit"), 320);
      }, reducedMotion ? 0 : d * 90);
    }
  }

  if (!reducedMotion) {
    setInterval(() => {
      const t = tiles[Math.floor(Math.random() * tiles.length)].node;
      t.classList.add("dim");
      setTimeout(() => t.classList.remove("dim"), 900);
    }, 700);
  }

  // ---------- brillantini ----------
  const cv = el.canvas;
  const g = cv.getContext("2d");
  let particles = [];
  let raf = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = innerWidth * dpr;
    cv.height = innerHeight * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener("resize", resize);
  resize();

  function spawn(x, y, n, speed) {
    if (reducedMotion) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random());
      particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.3,
        life: 1, size: 1 + Math.random() * 2.4, red: Math.random() < 0.15,
      });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function star(x, y, s) {
    g.beginPath();
    g.moveTo(x, y - s * 2.2); g.lineTo(x + s * 0.5, y - s * 0.5);
    g.lineTo(x + s * 2.2, y); g.lineTo(x + s * 0.5, y + s * 0.5);
    g.lineTo(x, y + s * 2.2); g.lineTo(x - s * 0.5, y + s * 0.5);
    g.lineTo(x - s * 2.2, y); g.lineTo(x - s * 0.5, y - s * 0.5);
    g.closePath();
    g.fill();
  }

  const css = getComputedStyle(document.documentElement);
  const colors = { silver: css.getPropertyValue("--silver").trim(), red: css.getPropertyValue("--red").trim() };

  function tick() {
    g.clearRect(0, 0, innerWidth, innerHeight);
    particles = particles.filter((p) => (p.life -= 0.018) > 0);
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.vx *= 0.98;
      g.globalAlpha = p.life;
      g.fillStyle = p.red ? colors.red : colors.silver;
      star(p.x, p.y, p.size * (0.6 + p.life * 0.4));
    }
    g.globalAlpha = 1;
    raf = particles.length ? requestAnimationFrame(tick) : 0;
  }

  function burst() {
    const r = el.word.getBoundingClientRect();
    spawn(r.left + r.width / 2, r.top + r.height / 2, 70, 7);
  }

  addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse") spawn(e.clientX, e.clientY, 1, 1.2);
  });

  // ---------- comandi ----------
  $("mode-" + state.mode).checked = true;
  el.modes.addEventListener("change", (e) => {
    state.mode = e.target.value;
    store.set("mode", state.mode);
    schedule();
  });

  el.volume.value = state.volume;
  el.volume.addEventListener("input", () => {
    state.volume = Number(el.volume.value);
    store.set("volume", state.volume);
    if (gain) gain.gain.value = state.volume;
  });

  el.count.textContent = state.count;
  el.start.addEventListener("click", start);
  el.now.addEventListener("click", playNow);
  el.pause.addEventListener("click", togglePause);

  addEventListener("keydown", (e) => {
    if (e.code !== "Space" || e.repeat) return;
    if (e.target.closest("button, input, label")) return;
    e.preventDefault();
    playNow();
  });
})();

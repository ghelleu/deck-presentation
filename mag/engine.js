/* Magnetic · deck engine
   Navigation by slides and steps, transitions, overview, print, the magnetic field behind the stage,
   and the drawings built in code: the wordmark, the three phases, the launch.
   Contract of the platform: ../shared/controls.js fills the .hud box; this engine wires
   its buttons by data-act (fullscreen, restart, overview, lang, pdf). No other control. */
(() => {
  "use strict";
  const cfg = window.DECK_CONFIG || {};
  const Q = new URLSearchParams(location.search);
  const PRINT = Q.has("print");
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;
  const stage = document.getElementById("stage");
  const slides = [...stage.querySelectorAll(".slide")];
  const SVG = "http://www.w3.org/2000/svg";
  const TAU = Math.PI * 2;

  /* ---------------------------------------------------------------- small helpers */
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const rnd = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  const svgEl = (w, h, cls, vb) => `<svg class="${cls}" viewBox="${vb || `0 0 ${w} ${h}`}" preserveAspectRatio="xMidYMid meet" xmlns="${SVG}">`;

  /* ---------------------------------------------------------------- folio */
  const F = cfg.FOLIO || [];
  slides.forEach((s) => {
    if (s.dataset.folio === "no" || !F.length) return;
    const p = document.createElement("p");
    p.className = "folio";
    p.setAttribute("aria-hidden", "true");
    p.innerHTML = `<span>${F[0]}</span><i></i><span>${F[1]}</span><i></i><span>${F[2]}</span>`;
    s.appendChild(p);
  });

  /* ================================================================ drawings */
  const WORD = "MAGNETIC";
  function drawWordmark(el) {
    el.innerHTML = WORD.split("").map((c, i) => `<span style="--i:${i};--off:${Math.round((i - 3.5) * 140 + (i - 3.5 > 0 ? 260 : -260))}">${c}</span>`).join("");
  }

  /* The three phases: a triangle that draws particles in, spheres that collide, a star that radiates. */
  function drawPhases(el) {
    const R = rnd(5);
    let dots = "";
    for (let k = 0; k < 18; k++) {
      const a = Math.PI * (0.5 + R()), d = 160 + R() * 120;
      dots += `<circle class="dot" cx="${260 + (R() - 0.5) * 40}" cy="${250 + (R() - 0.5) * 40}" r="${2 + R() * 2.5}" style="--fx:${(Math.cos(a) * d).toFixed(0)}px;--fy:${(Math.sin(a) * d).toFixed(0)}px;animation-delay:${(R() * 2.4).toFixed(2)}s"/>`;
    }
    const orbs = [[770, 190, 34, 22, -14, 3.1], [840, 230, 50, -18, 16, 2.6], [800, 300, 22, 16, -20, 2.2], [880, 320, 40, -12, -10, 3.4], [740, 300, 28, 20, 12, 2.8]];
    let o = "";
    orbs.forEach(([x, y, r, ox, oy, t]) => (o += `<circle class="orb" cx="${x}" cy="${y}" r="${r}" style="--ox:${ox}px;--oy:${oy}px;--t:${t}s"/>`));
    let star = "";
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * TAU, r = k % 2 ? 22 : 92;
      star += `${k ? "L" : "M"}${(1340 + Math.cos(a) * r).toFixed(1)} ${(250 + Math.sin(a) * r).toFixed(1)}`;
    }
    el.innerHTML = `<svg viewBox="0 0 1600 460" xmlns="${SVG}">
      <path class="path" d="M360 230 C 480 120, 600 150, 700 220M360 270 C 480 360, 620 360, 720 300"/>
      <path class="path" d="M930 220 C 1050 120, 1150 140, 1250 230M930 300 C 1050 380, 1160 360, 1260 280"/>
      <g class="grp g1"><path class="tri" d="M260 140L370 340H150Z"/>${dots}</g>
      <g class="grp g2">${o}</g>
      <g class="grp g3"><circle class="ring" cx="1340" cy="250" r="90"/><circle class="ring" cx="1340" cy="250" r="90"/><circle class="ring" cx="1340" cy="250" r="90"/><path class="star" d="${star}Z"/></g>
    </svg>`;
  }

  /* The launch: from the idea to the first project. */
  function drawChain(el) {
    const N = [[120, "Magnetic", "l’idée"], [620, "Laurent Finck", "Lumens 8"], [1120, "François Moncarey", "Geneva Lux"], [1600, "La Tour des Possibles", "premier projet"]];
    let s = `<svg viewBox="0 0 1728 280" xmlns="${SVG}">
      <path class="ln a" pathLength="1" d="M120 120 C 300 40, 440 40, 620 120"/>
      <path class="ln b" pathLength="1" d="M620 120 C 800 200, 940 200, 1120 120 C 1280 40, 1440 40, 1600 120"/>
      <text class="when" x="870" y="230" text-anchor="middle">UN MOIS PLUS TARD</text>`;
    N.forEach(([x, t, sub], i) => {
      const cls = i < 2 ? (i ? "n2" : "n1") : i === 2 ? "n3" : "n3";
      s += `<g class="node ${cls}"><circle class="halo" cx="${x}" cy="120" r="26"/><circle class="${i === 3 ? "red" : ""}" cx="${x}" cy="120" r="${i === 3 ? 12 : 9}"/>
        <text x="${x}" y="${i % 2 ? 190 : 60}" text-anchor="middle">${t}</text><text class="s" x="${x}" y="${i % 2 ? 226 : 24}" text-anchor="middle">${sub}</text></g>`;
    });
    el.innerHTML = s + "</svg>";
  }

  const DRAW = { wordmark: drawWordmark, phases: drawPhases, chain: drawChain };
  $$("[data-draw]").forEach((el) => DRAW[el.dataset.draw] && DRAW[el.dataset.draw](el));
  const widgetsOf = new Map(slides.map((s) => [s, []]));

  /* ================================================================ the field
     Two poles per slide (data-field, fractions of the stage). Particles follow the field of a dipole,
     from the first pole to the second, and leave short blue trails: iron filings in motion.
     When both poles meet (data-mode ring), the field turns around the point. */
  const cfgOf = (s) => {
    const f = (s.dataset.field || "0.3 0.5 0.7 0.5").split(/\s+/).map(Number);
    return { p: f, glow: s.dataset.glow ? 1 : 0, ring: s.dataset.mode === "ring" };
  };
  function fieldStep(P, x, y, p, ring, W, H) {
    const x1 = p[0] * W, y1 = p[1] * H, x2 = p[2] * W, y2 = p[3] * H;
    let dx1 = x - x1, dy1 = y - y1, d1 = dx1 * dx1 + dy1 * dy1 + 400;
    let bx, by;
    if (ring) { bx = -dy1 / d1; by = dx1 / d1; }
    else {
      let dx2 = x - x2, dy2 = y - y2, d2 = dx2 * dx2 + dy2 * dy2 + 400;
      bx = dx1 / d1 - dx2 / d2; by = dy1 / d1 - dy2 / d2;
    }
    const m = Math.hypot(bx, by) || 1;
    return [bx / m, by / m];
  }
  function spawn(pt, p, ring, W, H, R) {
    if (ring || R() < 0.35) { pt.x = R() * W; pt.y = R() * H; }
    else { const a = R() * TAU, r = 10 + R() * 40; pt.x = p[0] * W + Math.cos(a) * r; pt.y = p[1] * H + Math.sin(a) * r; }
    pt.age = 0; pt.life = 120 + R() * 260;
  }
  function paintGlow(ctx, p, W, H, a) {
    const cx = ((p[0] + p[2]) / 2) * W, cy = ((p[1] + p[3]) / 2) * H, r = Math.max(W, H) * 0.62;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(36,51,255,${0.9 * a})`); g.addColorStop(0.45, `rgba(20,28,190,${0.55 * a})`); g.addColorStop(1, "rgba(8,8,13,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  const field = (() => {
    const cv = document.getElementById("field");
    const ctx = cv.getContext("2d", { alpha: false });
    const R = rnd(9);
    let W = 0, H = 0, dpr = 1, pts = [], raf = 0, cur = { p: [0.3, 0.5, 0.7, 0.5], glow: 0, ring: false }, tgt = cur;
    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = innerWidth; H = innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#08080d"; ctx.fillRect(0, 0, W, H);
      const n = Math.round(Math.min(1600, (W * H) / 1100));
      pts = Array.from({ length: n }, () => { const q = {}; spawn(q, cur.p, cur.ring, W, H, R); q.age = R() * q.life; return q; });
    }
    // poles in viewport fractions: the stage is centred and scaled
    function toView(p) {
      const k = parseFloat(getComputedStyle(root).getPropertyValue("--scale")) || 1, sw = 1920 * k, sh = 1080 * k, ox = (W - sw) / 2, oy = (H - sh) / 2;
      return [(ox + p[0] * sw) / W, (oy + p[1] * sh) / H, (ox + p[2] * sw) / W, (oy + p[3] * sh) / H];
    }
    function frame() {
      for (let i = 0; i < 4; i++) cur.p[i] += (tgt.p[i] - cur.p[i]) * 0.035;
      cur.glow += (tgt.glow - cur.glow) * 0.04;
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(8,8,13,0.085)"; ctx.fillRect(0, 0, W, H);
      const p = toView(cur.p);
      if (cur.glow > 0.01) paintGlow(ctx, p, W, H, cur.glow * 0.09);
      ctx.lineWidth = 1.1; ctx.lineCap = "round";
      ctx.strokeStyle = cur.glow > 0.5 ? "rgba(170,180,255,0.55)" : "rgba(80,96,255,0.6)";
      ctx.beginPath();
      const sp = REDUCED ? 0 : 2.2;
      for (const q of pts) {
        const [vx, vy] = fieldStep(null, q.x, q.y, p, tgt.ring, W, H);
        const nx = q.x + vx * sp, ny = q.y + vy * sp;
        ctx.moveTo(q.x, q.y); ctx.lineTo(nx, ny);
        q.x = nx; q.y = ny; q.age++;
        const near2 = !tgt.ring && Math.hypot(q.x - p[2] * W, q.y - p[3] * H) < 14;
        if (q.age > q.life || near2 || q.x < -20 || q.y < -20 || q.x > W + 20 || q.y > H + 20) spawn(q, p, tgt.ring, W, H, R);
      }
      ctx.stroke();
      // the two poles
      if (!tgt.ring) for (const [i, c] of [[0, "rgba(111,123,255,0.9)"], [2, "rgba(255,255,255,0.8)"]]) {
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(p[i] * W, p[i + 1] * H, 3, 0, TAU); ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }
    addEventListener("resize", resize);
    return {
      start(s) { cur = JSON.parse(JSON.stringify(cfgOf(s))); tgt = cfgOf(s); resize(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); },
      target(s) { tgt = cfgOf(s); },
    };
  })();

  /* A still field as an image, behind thumbnails and printed pages. */
  const stillCache = new Map();
  function stillField(s) {
    const c0 = cfgOf(s), key = s.dataset.field + (c0.glow ? "g" : "") + (c0.ring ? "r" : "");
    if (stillCache.has(key)) return stillCache.get(key);
    const W = 960, H = 540, c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d"), Rn = rnd(4);
    x.fillStyle = "#08080d"; x.fillRect(0, 0, W, H);
    if (c0.glow) paintGlow(x, c0.p, W, H, 1);
    x.strokeStyle = c0.glow ? "rgba(190,198,255,0.16)" : "rgba(80,96,255,0.22)"; x.lineWidth = 0.7;
    for (let k = 0; k < 520; k++) {
      const q = {}; spawn(q, c0.p, c0.ring, W, H, Rn);
      x.beginPath(); x.moveTo(q.x, q.y);
      for (let t = 0; t < 70; t++) { const [vx, vy] = fieldStep(null, q.x, q.y, c0.p, c0.ring, W, H); q.x += vx * 3; q.y += vy * 3; x.lineTo(q.x, q.y); }
      x.stroke();
    }
    const url = c.toDataURL("image/jpeg", 0.85);
    stillCache.set(key, url);
    return url;
  }

  /* ================================================================ images */
  function load(slide) {
    $$("img[data-src]", slide).forEach((img) => {
      if (img.getAttribute("src")) return;
      img.addEventListener("load", () => img.classList.add("ready"), { once: true });
      img.src = img.dataset.src;
      if (img.complete) img.classList.add("ready");
    });
  }

  /* ================================================================ print: every slide, last step */
  if (PRINT) {
    root.classList.add("print", "static");
    slides.forEach((s) => {
      s.style.backgroundImage = `url(${stillField(s)})`; s.style.backgroundSize = "cover";
      load(s);
      $$("[data-step]", s).forEach((e) => e.classList.add("on"));
      $$(".note", s).forEach((e) => e.classList.add("on"));
      s.classList.add("active");
    });
    requestAnimationFrame(() => slides.forEach((s) => widgetsOf.get(s).forEach((w) => w.final())));
    return;
  }

  /* ================================================================ navigation */
  const SKIP_KEY = "tdp-skip";
  let skipped = new Set();
  try { skipped = new Set(JSON.parse(sessionStorage.getItem(SKIP_KEY) || "[]")); } catch (e) { /* private mode */ }
  const saveSkip = () => { try { sessionStorage.setItem(SKIP_KEY, JSON.stringify([...skipped])); } catch (e) { /* ignore */ } };

  const maxStep = (s) => +s.dataset.steps || Math.max(0, ...$$("[data-step]", s).map((e) => +e.dataset.step));
  let cur = -1, step = 0;
  const hudCount = document.getElementById("hudCount"), hudTitle = document.getElementById("hudTitle"), bar = document.getElementById("progress");

  function applyStep(s) {
    $$("[data-step]", s).forEach((e) => e.classList.toggle("on", step >= +e.dataset.step));
    $$(".note", s).forEach((e) => e.classList.toggle("on", step >= +e.dataset.note));
    for (let k = 1; k <= 6; k++) s.classList.toggle("s" + k, step >= k);
  }

  function go(i, st = 0, dir) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    const prev = cur;
    if (i === prev) { step = st; applyStep(slides[i]); return; }
    dir = dir || (i > prev ? 1 : -1);
    stage.style.setProperty("--dir", dir);
    if (prev >= 0) {
      const old = slides[prev];
      old.classList.remove("active"); old.classList.add("leaving");
      setTimeout(() => old.classList.remove("leaving"), 1200);
      widgetsOf.get(old).forEach((w) => w.stop());
    }
    cur = i; step = st;
    const s = slides[i];
    field.target(s);
    load(s); if (slides[i + 1]) load(slides[i + 1]); if (slides[i + 2]) load(slides[i + 2]);
    // restart the entrance animations
    void s.offsetWidth;
    s.classList.add("active");
    applyStep(s);
    widgetsOf.get(s).forEach((w) => w.start());
    history.replaceState(null, "", "#" + s.id);
    const total = slides.length;
    hudCount.textContent = String(i + 1).padStart(2, "0") + " / " + total;
    hudTitle.textContent = s.dataset.label || "";
    bar.style.width = ((i + 1) / total) * 100 + "%";
  }

  function nextIndex(from, d) {
    let i = from + d;
    while (i >= 0 && i < slides.length && skipped.has(slides[i].id)) i += d;
    return i >= 0 && i < slides.length ? i : from;
  }
  function next() {
    const s = slides[cur];
    if (step < maxStep(s)) { step++; applyStep(s); return; }
    const i = nextIndex(cur, 1); if (i !== cur) go(i, 0, 1);
  }
  function prev() {
    const s = slides[cur];
    if (step > 0) { step--; applyStep(s); return; }
    const i = nextIndex(cur, -1); if (i !== cur) go(i, maxStep(slides[i]), -1);
  }

  /* ================================================================ overview */
  let ov = null;
  function buildOverview() {
    ov = document.createElement("div");
    ov.className = "overview";
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-label", "Toutes les slides");
    slides.forEach((s, i) => {
      const card = document.createElement("div");
      card.className = "ov-card";
      card.dataset.i = i;
      const thumb = document.createElement("div");
      thumb.className = "ov-thumb";
      thumb.style.backgroundImage = `url(${stillField(s)})`; thumb.style.backgroundSize = "cover";
      const c = s.cloneNode(true);
      c.removeAttribute("id"); $$("[id]", c).forEach((e) => e.removeAttribute("id"));
      c.classList.remove("active", "leaving");
      c.classList.add("active");
      c.style.cssText = "position:absolute;left:0;top:0;width:1920px;height:1080px;inset:auto;";
      $$("img[data-src]", c).forEach((im) => { im.src = im.dataset.src; im.classList.add("ready"); });
      $$("[data-step]", c).forEach((e) => e.classList.add("on"));
      $$(".note", c).forEach((e) => e.classList.add("on"));
      thumb.appendChild(c);
      const cap = document.createElement("div");
      cap.className = "ov-cap";
      cap.innerHTML = `<b>${String(i + 1).padStart(2, "0")}</b><span>${s.dataset.label || ""}</span>`;
      const chk = document.createElement("button");
      chk.type = "button"; chk.className = "ov-check"; chk.textContent = "✓";
      chk.setAttribute("aria-label", "Montrer ou masquer cette slide");
      chk.addEventListener("click", (e) => {
        e.stopPropagation();
        skipped.has(s.id) ? skipped.delete(s.id) : skipped.add(s.id);
        card.classList.toggle("skipped", skipped.has(s.id)); saveSkip();
      });
      card.append(thumb, cap, chk);
      card.classList.toggle("skipped", skipped.has(s.id));
      card.addEventListener("click", () => { closeOverview(); go(i, 0); });
      ov.appendChild(card);
    });
    document.body.appendChild(ov);
  }
  function scaleThumbs() {
    $$(".ov-thumb", ov).forEach((t) => {
      const k = t.clientWidth / 1920;
      const c = t.firstChild; c.style.transform = `scale(${k})`; c.style.transformOrigin = "0 0";
    });
  }
  function openOverview() {
    if (!ov) buildOverview();
    ov.classList.add("open");
    scaleThumbs();
    
    $$(".ov-card", ov).forEach((c) => c.classList.toggle("current", +c.dataset.i === cur));
    const here = ov.children[cur]; if (here) here.scrollIntoView({ block: "center" });
  }
  function closeOverview() { if (ov) ov.classList.remove("open"); }
  const overviewOpen = () => ov && ov.classList.contains("open");
  const toggleOverview = () => (overviewOpen() ? closeOverview() : openOverview());

  /* ================================================================ controls */
  function fullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else root.requestFullscreen && root.requestFullscreen().catch(() => {});
  }
  const restart = () => { closeOverview(); go(nextIndex(-1, 1), 0, -1); };
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const a = b.dataset.act;
    if (a === "fullscreen") fullscreen();
    else if (a === "restart") restart();
    else if (a === "overview") toggleOverview();
    if (a !== "pdf") b.blur();
  });

  addEventListener("keydown", (e) => {
    if (root.classList.contains("gated") || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/input|textarea|select/i.test((e.target && e.target.tagName) || "")) return;
    const k = e.key;
    if (k === "Escape") { toggleOverview(); e.preventDefault(); return; }
    if (k === "o" || k === "O") { toggleOverview(); return; }
    if (k === "f" || k === "F") { fullscreen(); return; }
    if (k === "r" || k === "R") { restart(); return; }
    if (overviewOpen()) return;
    if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(k)) { next(); e.preventDefault(); }
    else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(k)) { prev(); e.preventDefault(); }
    else if (k === "Home") { go(0, 0, -1); e.preventDefault(); }
    else if (k === "End") { go(slides.length - 1, 0, 1); e.preventDefault(); }
  });

  let touch = null;
  addEventListener("touchstart", (e) => (touch = [e.touches[0].clientX, e.touches[0].clientY]), { passive: true });
  addEventListener("touchend", (e) => {
    if (!touch || overviewOpen()) return;
    const dx = e.changedTouches[0].clientX - touch[0], dy = e.changedTouches[0].clientY - touch[1];
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? next : prev)();
    touch = null;
  });

  let hudTimer = 0;
  addEventListener("mousemove", () => {
    document.body.classList.add("hud-on");
    clearTimeout(hudTimer);
    hudTimer = setTimeout(() => document.body.classList.remove("hud-on"), 2200);
  });

  function fit() {
    const k = Math.min(innerWidth / 1920, innerHeight / 1080);
    root.style.setProperty("--scale", k);
    if (overviewOpen()) scaleThumbs();
  }
  addEventListener("resize", fit);
  // anchors (#id) must never scroll the page: the stage is fixed
  addEventListener("scroll", () => { if (scrollX || scrollY) scrollTo(0, 0); });
  addEventListener("hashchange", () => {
    const i = slides.findIndex((s) => "#" + s.id === location.hash);
    if (i >= 0 && i !== cur) go(i, 0);
  });

  fit();
  const startAt = Math.max(0, slides.findIndex((s) => "#" + s.id === location.hash));
  field.start(slides[startAt]);
  go(startAt, 0, 1);

  window.deck = { go: (id, st = 0) => go(typeof id === "number" ? id : slides.findIndex((s) => s.id === id), st), next, prev, state: () => ({ slide: slides[cur].id, step }), reduced: REDUCED };
})();

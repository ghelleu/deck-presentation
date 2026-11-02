/* Le Chalet Disco · deck engine
   One logic from start to end: content pages on Blanc neige that build up step by step, and chapter pages,
   each in one colour of the evening, where the disco ball assembles and turns.
   Slides: section.slide in #stage, 1920 × 1080, scaled to fit.
   Steps: [data-step="n"] is on from step n, [data-only="n m"] on those steps; the slide carries data-s.
   Transitions (data-transition): pan (default, with [data-depth] layers and [data-reveal] pictures) · fade · chapter.
   Platform contract: ../shared/controls.js fills the .hud box, this engine wires its buttons by data-act. */
(() => {
  "use strict";
  const Q = new URLSearchParams(location.search);
  const PRINT = Q.has("print");
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const TAU = Math.PI * 2, SVGNS = "http://www.w3.org/2000/svg";
  const E = "cubic-bezier(0.22, 1, 0.36, 1)", IO = "cubic-bezier(0.65, 0, 0.35, 1)";
  const stage = $("#stage");
  const SLIDES = $$(".slide", stage);

  /* ================================================================ steps */
  const nums = (v) => (v || "").split(" ").filter(Boolean).map(Number);
  SLIDES.forEach((s) => {
    const all = $$("[data-step],[data-only]", s).flatMap((e) => nums(e.dataset.step ?? e.dataset.only));
    s._steps = Math.max(0, ...all);
  });
  function applyStep(s, step) {
    s.dataset.s = step;
    $$("[data-step]", s).forEach((e) => { const k = +e.dataset.step; e.classList.toggle("on", step >= k); e.classList.toggle("at", step === k); });
    $$("[data-only]", s).forEach((e) => e.classList.toggle("on", nums(e.dataset.only).includes(step)));
    // the renders' index: which of the nine we are on
    const strip = $(".strip", s);
    if (strip) $$("li", strip).forEach((li, i) => li.classList.toggle("cur", i === +s.dataset.strip + step));
  }

  /* ================================================================ drawings: the floor plans, in the deck's palette */
  const P = window.CBM_PLANS || {};
  const PAPER = [241, 239, 233];
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const tint = (h, a) => "rgb(" + hex(h).map((v, i) => Math.round(PAPER[i] + (v - PAPER[i]) * a)).join(",") + ")";
  const NUIT = "#15161C", ROUGE = "#DA291C", SOMMET = "#355B88", NEON = "#2A22D9", ARGENT = "#B1B8B6";
  // the PDF's colours → the evening's
  const RECOLOR = {
    "#000000": NUIT, "#ffffff": "#F1EFE9",
    "#95b6f5": tint(SOMMET, 0.42),   // served: the guests' rooms
    "#f59595": tint(ROUGE, 0.5),     // serving: kitchens
    "#b5f9b8": tint(ARGENT, 0.75),   // circulation
    "#8a8a8a": tint(NUIT, 0.42),     // storage
    "#7a4a9c": tint(NEON, 0.6),      // cloakroom
    "#c395f5": tint(NEON, 0.28),     // toilets
    "#09b8a9": SOMMET, "#a3ded9": tint(SOMMET, 0.3), "#c8e8e8": tint(SOMMET, 0.18),   // storage on site (problem 02)
    "#b82309": ROUGE, "#e8d2c8": tint(ROUGE, 0.14),   // the central element (problem 03)
    "#b1d4ec": tint(NEON, 0.3),      // the entrance on the facade
  };
  const color = (c) => RECOLOR[c] || c;
  const svgEl = (vb, inner) => `<svg viewBox="${vb}" xmlns="${SVGNS}" aria-hidden="true">${inner}</svg>`;
  const EXTRA = {
    heat: () => `<defs><linearGradient id="hg" x1="4100" x2="5290" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${ROUGE}" stop-opacity="0"/><stop offset="1" stop-color="${ROUGE}" stop-opacity=".55"/></linearGradient>
      <radialGradient id="cg" cx="5300" cy="2385" r="720" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${NEON}" stop-opacity=".65"/><stop offset=".5" stop-color="${NEON}" stop-opacity=".25"/><stop offset="1" stop-color="${NEON}" stop-opacity="0"/></radialGradient></defs>
      <g class="ov-heat"><rect class="warm" x="4100" y="1765" width="1185" height="1563" fill="url(#hg)"/><circle class="cold" cx="5300" cy="2385" r="720" fill="url(#cg)"/>
      ${[0, 1, 2].map((k) => `<path class="wave" style="--t:${k * 0.8}s" d="M5240 2015 A380 380 0 0 0 5240 2755"/>`).join("")}</g>`,
    store: () => `<g class="ov-store"><path class="arrow" pathLength="1" d="M2290 3380 C 2700 3350 2950 3000 3240 2700"/>${[["02", 2458, 1352], ["03", 3583, 1352], ["01", 2458, 2095]].map(([t, x, y], i) => `<text class="num" style="--t:${0.3 + i * 0.2}s" x="${x}" y="${y}">${t}</text>`).join("")}</g>`,
    lab13: () => opts(),
    // the room names are already drawn (outlined) in the PDF's plans; only the option names are not
    lab14: () => opts(),
    lab15: () => "",
  };
  const opts = () => `<text class="opt" x="2305" y="3245" text-anchor="middle">Option A</text><text class="opt" x="5679" y="3245" text-anchor="middle">Option B</text>`;
  function drawPlan(el) {
    const p = P[el.dataset.page]; if (!p) return;
    const only = el.hasAttribute("data-overlay");
    let s = "", k = 0;
    for (const l of p.layers) {
      const base = l.fill === "#000000" || l.fill === "#ffffff";
      if (only && base) continue;
      const cls = l.fill === "#000000" ? "ink" : l.fill === "#ffffff" ? "wh" : "zone";
      s += `<path class="${cls}" style="--k:${((k++ % 36) * 0.02).toFixed(2)}s" fill="${color(l.fill)}"${l.stroke ? ` stroke="${color(l.stroke)}" stroke-width="${l.w}"` : ""} d="${l.d}"/>`;
    }
    el.innerHTML = svgEl(el.dataset.box, s + (el.dataset.extra ? EXTRA[el.dataset.extra]() : ""));
  }
  $$("[data-draw=plan]").forEach(drawPlan);

  /* ================================================================ the renders' index (nine pictures) */
  const RENDERS = ["rendu-entree", "rendu-vestiaire", "rendu-rideau", "rendu-bar", "rendu-bar-2", "rendu-salle", "rendu-salon", "rendu-scene", "rendu-concert"];
  $$(".strip").forEach((ol) => (ol.innerHTML = RENDERS.map((r, i) => `<li><img src="assets/img/${r}.webp" alt=""><b>${String(i + 1).padStart(2, "0")}</b></li>`).join("")));

  /* ================================================================ the disco ball */
  // a mirror ball: small square facets with dark joints, each reflecting the room (mostly greys, a few
  // cold or warm lights), a soft key light top left, a darker rim, and star glints on the brightest facets
  function drawBall(c, x, y, r, rot, build, t) {
    c.save();
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.clip();
    c.globalAlpha = Math.min(1, build * 1.6); c.fillStyle = "#1c1e24"; c.fillRect(x - r, y - r, 2 * r, 2 * r); c.globalAlpha = 1;
    const nLat = 26, nLon = 52, gap = 0.1, stars = [];
    const Pt = (la, lo) => [x + r * Math.cos(la) * Math.sin(lo), y + r * Math.sin(la), Math.cos(la) * Math.cos(lo)];
    for (let i = 0; i < nLat; i++) {
      const la0 = -Math.PI / 2 + (i / nLat) * Math.PI, la1 = la0 + Math.PI / nLat, lam = (la0 + la1) / 2;
      for (let j = 0; j < nLon; j++) {
        const lo0 = (j / nLon) * TAU + rot, lo1 = lo0 + TAU / nLon, lom = (lo0 + lo1) / 2;
        const z = Math.cos(lam) * Math.cos(lom); if (z < 0.02) continue;
        const h = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453, n = h - Math.floor(h);
        const h2 = Math.sin(i * 39.34 + j * 11.13) * 24634.6345, m = h2 - Math.floor(h2);
        // assembly: each facet arrives at its own moment
        const a = Math.max(0, Math.min(1, (build * 1.35 - n * 0.35) / 0.35)); if (a <= 0) continue;
        // the facet, shrunk a little towards its centre so the joints show
        const dl = (la1 - la0) * gap, dn = (lo1 - lo0) * gap;
        const q = [Pt(la0 + dl, lo0 + dn), Pt(la0 + dl, lo1 - dn), Pt(la1 - dl, lo1 - dn), Pt(la1 - dl, lo0 + dn)];
        // light: a key from the top left, the room reflected, a slow shimmer as it turns
        const nx = Math.cos(lam) * Math.sin(lom), ny = Math.sin(lam);
        const key = Math.max(0, -nx * 0.55 - ny * 0.6 + z * 0.55);
        const shimmer = 0.5 + 0.5 * Math.sin(t * 1.3 + n * 40 + j * 0.4);
        let v = 78 + key * 140 + n * 80 * shimmer;
        const spark = key > 0.62 && Math.sin(t * 2.4 + n * 70) > 0.93;
        if (spark) { v = 255; if (m > 0.72) stars.push([(q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2]); }
        v = Math.min(255, v) * (0.68 + 0.32 * z);
        const tintc = m > 0.9 ? [0.86, 0.92, 1.08] : m < 0.07 ? [1.08, 0.97, 0.86] : [0.98, 1, 1.03];
        c.globalAlpha = a;
        c.beginPath(); c.moveTo(q[0][0], q[0][1]); c.lineTo(q[1][0], q[1][1]); c.lineTo(q[2][0], q[2][1]); c.lineTo(q[3][0], q[3][1]); c.closePath();
        c.fillStyle = `rgb(${Math.min(255, v * tintc[0]) | 0},${Math.min(255, v * tintc[1]) | 0},${Math.min(255, v * tintc[2]) | 0})`;
        c.fill();
      }
    }
    c.globalAlpha = 1;
    // key light and rim
    let g = c.createRadialGradient(x - r * 0.42, y - r * 0.46, 0, x - r * 0.42, y - r * 0.46, r * 0.9);
    g.addColorStop(0, "rgba(255,255,255,.28)"); g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r);
    g = c.createRadialGradient(x, y, r * 0.55, x, y, r);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.42)");
    c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r);
    c.restore();
    // glints
    c.save(); c.globalCompositeOperation = "lighter";
    for (const [sx, sy] of stars) {
      const L = r * 0.16;
      const gl = c.createRadialGradient(sx, sy, 0, sx, sy, L * 0.5); gl.addColorStop(0, "rgba(255,255,255,.9)"); gl.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = gl; c.fillRect(sx - L, sy - L, 2 * L, 2 * L);
      c.strokeStyle = "rgba(255,255,255,.75)"; c.lineWidth = Math.max(1, r / 260);
      c.beginPath(); c.moveTo(sx - L, sy); c.lineTo(sx + L, sy); c.moveTo(sx, sy - L); c.lineTo(sx, sy + L); c.stroke();
    }
    c.restore();
  }
  const BALL_IMG = (() => { const c = document.createElement("canvas"); c.width = c.height = 800; drawBall(c.getContext("2d"), 400, 400, 390, 0.4, 1, 0); return c.toDataURL(); })();
  // every chapter: the ball (a still picture until it is live), its cap with the chapter's numeral
  $$("[data-ball]").forEach((w) => {
    w.innerHTML = `<i class="string"></i><img class="ball-still" src="${BALL_IMG}" alt="">` + (w.dataset.ball ? `<b class="cap">${w.dataset.ball}</b>` : "");
  });

  /* ================================================================ images */
  const loadImages = (s) => $$("img[data-src]", s).forEach((im) => { if (!im.getAttribute("src")) im.src = im.dataset.src; });

  /* ================================================================ snapshots: overview and PDF */
  function snapshot(s, step) {
    const c = s.cloneNode(true);
    c.removeAttribute("id"); $$("[id]", c).forEach((e) => { if (!e.closest("svg")) e.removeAttribute("id"); });
    // drawings keep their own gradients
    $$("svg", c).forEach((sv, k) => {
      if (!$("[id]", sv)) return;
      const tag = "-" + Math.random().toString(36).slice(2, 7) + k;
      $$("[id]", sv).forEach((e) => (e.id += tag));
      $$("*", sv).forEach((e) => { for (const a of ["fill", "stroke", "clip-path"]) { const v = e.getAttribute(a); if (v && v.startsWith("url(#")) e.setAttribute(a, v.replace(/\)$/, tag + ")")); } });
    });
    c.classList.add("snap", "is-active");
    loadImages(c);
    $$("video", c).forEach((v) => { v.removeAttribute("autoplay"); v.preload = "none"; });
    applyStep(c, step);
    if (s.dataset.chapter) {
      const f = document.createElement("footer"); f.className = "folio";
      f.innerHTML = `<span>Caroline Barbier Mueller — Célébration anniversaire</span><span>${s.dataset.chapter}</span><span>2026</span>`;
      c.appendChild(f);
    }
    return c;
  }

  if (PRINT) {
    root.classList.add("print");
    const pages = [];
    SLIDES.forEach((s) => {
      const steps = s.dataset.pages === "steps" ? [...Array(s._steps + 1).keys()] : [s._steps];
      steps.forEach((k) => pages.push(snapshot(s, k)));
    });
    stage.replaceChildren(...pages);
    return;
  }

  /* ================================================================ fit */
  let fit = 1;
  function resize() {
    fit = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = `translate(${(innerWidth - 1920 * fit) / 2}px, ${(innerHeight - 1080 * fit) / 2}px) scale(${fit})`;
    root.style.setProperty("--fit", fit);
    if (overviewOpen()) scaleThumbs();
  }

  /* ================================================================ the live ball (chapters only) */
  let live = null;
  function mountBall(s) {
    unmountBall();
    const w = $("[data-ball]", s); if (!w) return;
    const cv = document.createElement("canvas"); cv.className = "ball-live"; cv.width = cv.height = 1200;
    const sp = document.createElement("canvas"); sp.className = "specks"; sp.width = 1920; sp.height = 1080;
    w.appendChild(cv); s.appendChild(sp);
    s.classList.add("live");
    live = { s, w, cv, sp, t0: performance.now(), neon: s.classList.contains("c-neon"), light: s.classList.contains("c-argent") };
  }
  function unmountBall() {
    if (!live) return;
    live.cv.remove(); live.sp.remove(); live.s.classList.remove("live"); live = null;
  }
  const SPECKS = Array.from({ length: 90 }, (_, i) => { const h = Math.sin(i * 91.7) * 9999, n = h - Math.floor(h), m = Math.sin(i * 17.3) * 9999; return { lo: n * TAU, la: (m - Math.floor(m) - 0.5) * 2, s: 2 + ((i * 7) % 5), c: i % 5 }; });
  const NEONS = ["255,255,255", "255,90,180", "120,220,255", "255,255,255", "255,214,90"];
  const SPRITES = {};
  const sprite = (col) => SPRITES[col] || (SPRITES[col] = (() => { const c = document.createElement("canvas"); c.width = c.height = 48; const x = c.getContext("2d"); const g = x.createRadialGradient(24, 24, 0, 24, 24, 24); g.addColorStop(0, `rgba(${col},1)`); g.addColorStop(0.3, `rgba(${col},.6)`); g.addColorStop(1, `rgba(${col},0)`); x.fillStyle = g; x.fillRect(0, 0, 48, 48); return c; })());
  function tick(now) {
    if (live) {
      const t = (now - live.t0) / 1000;
      const build = REDUCED ? 1 : Math.min(1, t / 1.9);
      const ease = 1 - Math.pow(1 - build, 3);
      const rot = (REDUCED ? 0 : t * 0.28) + 0.4;
      const c = live.cv.getContext("2d");
      c.clearRect(0, 0, 1200, 1200);
      drawBall(c, 600, 600, 590, rot, ease, t);
      // reflections sweep the page once the ball is whole
      const sc = live.sp.getContext("2d");
      sc.clearRect(0, 0, 1920, 1080);
      const on = Math.max(0, Math.min(1, (t - 1.4) / 1.2)) * (REDUCED ? 0 : 1);
      if (on > 0) {
        const cx = live.w.offsetLeft + live.w.offsetWidth / 2, cy = live.w.offsetTop + live.w.offsetHeight / 2;
        sc.globalCompositeOperation = live.light ? "source-over" : "lighter";
        for (const p of SPECKS) {
          const lo = p.lo + rot * 1.15, k = Math.cos(lo); if (k < 0.1) continue;
          const x = cx + Math.sin(lo) * 1500, y = cy + p.la * 760 + Math.sin(lo * 3) * 8;
          const size = p.s * (1.4 + k) * 3;
          sc.globalAlpha = on * k * (live.light ? 0.9 : 0.55);
          sc.drawImage(sprite(live.neon ? NEONS[p.c] : "255,255,255"), x - size, y - size, size * 2, size * 2);
        }
        sc.globalAlpha = 1; sc.globalCompositeOperation = "source-over";
      }
    }
    requestAnimationFrame(tick);
  }

  /* ================================================================ transitions */
  let ending = null;
  const finish = () => ending && ending();
  function transition(from, to, type, back) {
    finish();
    if (REDUCED && type !== "none") type = "fade";
    if (back && type === "chapter") type = "fade";
    if (from) { from.classList.remove("is-active"); from.classList.add("is-leaving"); }
    to.classList.add("is-active");
    if (!from || type === "none") { if (from) from.classList.remove("is-leaving"); return; }
    const anims = [];
    const A = (el, kf, d, e = IO, delay = 0) => anims.push(el.animate(kf, { duration: d, easing: e, delay, fill: "both" }));
    if (type === "pan") {
      const dir = back ? -1 : 1, D = 1150;
      A(from, [{ transform: "translateX(0)" }, { transform: `translateX(${-100 * dir}%)` }], D);
      A(to, [{ transform: `translateX(${100 * dir}%)` }, { transform: "translateX(0)" }], D);
      $$("[data-depth]", from).forEach((el) => A(el, [{ translate: "0 0" }, { translate: `${-dir * +el.dataset.depth * 30}% 0` }], D));
      $$("[data-depth]", to).forEach((el) => A(el, [{ translate: `${dir * +el.dataset.depth * 30}% 0` }, { translate: "0 0" }], D));
      $$("[data-reveal]", to).forEach((el) => A(el, [{ clipPath: dir > 0 ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }], D + 150, E, 180 + (parseFloat(el.style.getPropertyValue("--d")) || 0)));
    } else if (type === "fade") {
      A(to, [{ opacity: 0 }, { opacity: 1 }], 900, E);
    } else if (type === "chapter") {
      // the page's colour rises from the bottom, the ball assembles (tick), the title follows
      A(to, [{ clipPath: "inset(100% 0 0 0)" }, { clipPath: "inset(0 0 0 0)" }], 900, IO);
      A(from, [{ transform: "translateY(0)" }, { transform: "translateY(-6%)" }], 900, IO);
    }
    let ended = false;
    ending = () => { if (ended) return; ended = true; anims.forEach((a) => a.cancel()); if (from) from.classList.remove("is-leaving"); ending = null; };
    Promise.all(anims.map((a) => a.finished)).then(() => ending && ending(), () => {});
  }

  /* ================================================================ navigation */
  const hudCount = $("#hudCount"), hudTitle = $("#hudTitle"), bar = $("#progress"), folioCh = $("#folioChapter");
  let cur = -1, step = 0;
  let skipped = new Set();
  try { skipped = new Set(JSON.parse(sessionStorage.getItem("cbm-skip") || "[]")); } catch (e) { /* private mode */ }
  const saveSkip = () => { try { sessionStorage.setItem("cbm-skip", JSON.stringify([...skipped])); } catch (e) { /* ignore */ } };

  function changed(entered) {
    const s = SLIDES[cur];
    history.replaceState(null, "", "#" + s.id + (step ? "/" + step : ""));
    hudCount.textContent = String(cur + 1).padStart(2, "0") + " / " + SLIDES.length;
    hudTitle.textContent = s.dataset.label || "";
    bar.style.width = ((cur + (s._steps ? step / (s._steps + 1) : 0) + 1) / SLIDES.length) * 100 + "%";
    document.body.dataset.kind = s.classList.contains("chapter") ? "chapter" : s.classList.contains("full") ? "full" : "page";
    folioCh.textContent = s.dataset.chapter || "";
    if (entered) $$("video", s).forEach((v) => { v.currentTime = 0; v.play().catch(() => {}); });
  }
  function go(i, st = 0, opts = {}) {
    i = Math.max(0, Math.min(SLIDES.length - 1, i));
    const to = SLIDES[i], from = cur >= 0 ? SLIDES[cur] : null;
    if (to === from) return setStep(st);
    finish();
    if (from) $$("video", from).forEach((v) => v.pause());
    [i - 1, i, i + 1, i + 2].forEach((k) => SLIDES[k] && loadImages(SLIDES[k]));
    to.classList.add("snapping"); applyStep(to, st); void to.offsetWidth; to.classList.remove("snapping");
    transition(from, to, opts.instant ? "none" : to.dataset.transition || "pan", !!opts.back);
    if (to.classList.contains("chapter")) mountBall(to); else unmountBall();
    cur = i; step = st;
    changed(true);
  }
  function setStep(st) {
    const s = SLIDES[cur];
    step = Math.max(0, Math.min(s._steps, st));
    applyStep(s, step);
    changed(false);
  }
  const nextSlide = (d) => { let i = cur + d; while (i >= 0 && i < SLIDES.length && skipped.has(SLIDES[i].id)) i += d; return i; };
  function next() { const s = SLIDES[cur]; if (step < s._steps) setStep(step + 1); else { const i = nextSlide(1); if (i < SLIDES.length) go(i, 0); } }
  function prev() { if (step > 0) setStep(step - 1); else { const i = nextSlide(-1); if (i >= 0) go(i, SLIDES[i]._steps, { back: true }); } }

  /* ================================================================ overview */
  let ov = null;
  function buildOverview() {
    ov = document.createElement("div");
    ov.className = "overview"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "Toutes les slides");
    SLIDES.forEach((s, i) => {
      const card = document.createElement("div"); card.className = "ov-card"; card.dataset.i = i;
      const thumb = document.createElement("div"); thumb.className = "ov-thumb";
      thumb.appendChild(snapshot(s, s.dataset.pages === "steps" ? 0 : s._steps));
      const cap = document.createElement("div"); cap.className = "ov-cap";
      cap.innerHTML = `<b>${String(i + 1).padStart(2, "0")}</b><span>${s.dataset.label || ""}</span>`;
      const chk = document.createElement("button"); chk.type = "button"; chk.className = "ov-check"; chk.textContent = "✓";
      chk.setAttribute("aria-label", "Montrer ou masquer cette slide");
      chk.addEventListener("click", (e) => { e.stopPropagation(); skipped.has(s.id) ? skipped.delete(s.id) : skipped.add(s.id); card.classList.toggle("skipped", skipped.has(s.id)); saveSkip(); });
      card.classList.toggle("skipped", skipped.has(s.id));
      card.append(thumb, cap, chk);
      card.addEventListener("click", () => { closeOverview(); go(i); });
      ov.appendChild(card);
    });
    document.body.appendChild(ov);
  }
  function scaleThumbs() { $$(".ov-thumb", ov).forEach((t) => (t.firstChild.style.transform = `scale(${t.clientWidth / 1920})`)); }
  function openOverview() {
    if (!ov) buildOverview();
    ov.classList.add("open"); scaleThumbs();
    $$(".ov-card", ov).forEach((c) => c.classList.toggle("current", +c.dataset.i === cur));
    const here = ov.children[cur]; if (here) here.scrollIntoView({ block: "center" });
  }
  function closeOverview() { if (ov) ov.classList.remove("open"); }
  function overviewOpen() { return !!ov && ov.classList.contains("open"); }
  const toggleOverview = () => (overviewOpen() ? closeOverview() : openOverview());

  /* ================================================================ controls */
  function fullscreen() { if (document.fullscreenElement) document.exitFullscreen(); else if (root.requestFullscreen) root.requestFullscreen().catch(() => {}); }
  const restart = () => { closeOverview(); go(0); };
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const a = b.dataset.act;
    if (a === "fullscreen") fullscreen(); else if (a === "restart") restart(); else if (a === "overview") toggleOverview();
    if (a !== "pdf") b.blur();
  });
  addEventListener("keydown", (e) => {
    if (root.classList.contains("gated") || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/input|textarea|select/i.test((e.target && e.target.tagName) || "")) return;
    const k = e.key;
    if (k === "Escape") { toggleOverview(); e.preventDefault(); return; }
    if (k === "o" || k === "O") return toggleOverview();
    if (k === "f" || k === "F") return fullscreen();
    if (k === "r" || k === "R") return restart();
    if (overviewOpen()) return;
    if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(k)) { next(); e.preventDefault(); }
    else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(k)) { prev(); e.preventDefault(); }
    else if (k === "Home") { go(0); e.preventDefault(); }
    else if (k === "End") { go(SLIDES.length - 1); e.preventDefault(); }
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
  addEventListener("mousemove", () => { document.body.classList.add("hud-on"); clearTimeout(hudTimer); hudTimer = setTimeout(() => document.body.classList.remove("hud-on"), 2200); });
  addEventListener("resize", resize);

  resize();
  const [hid, hst] = location.hash.slice(1).split("/");
  const start = Math.max(0, SLIDES.findIndex((s) => s.id === hid));
  go(start, Math.min(+hst || 0, SLIDES[start]._steps), { instant: true });
  requestAnimationFrame(tick);
  window.deck = { go: (id, st = 0) => go(typeof id === "number" ? id : SLIDES.findIndex((s) => s.id === id), st), next, prev, state: () => ({ slide: SLIDES[cur].id, step }) };
})();

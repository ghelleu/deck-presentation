/* Magnetic · deck engine, « plan continu »
   One plane, a camera, a magnetic field whose poles are the content (the plan is the JSON in index.html).
   Each view is a camera position and a set of charges; objects light up in the views they list (data-view).
   Line drawings are built here (data-draw). Platform contract: ../shared/controls.js fills the .hud box (styled by
   ../shared/controls.css), ../shared/i18n.js puts in the texts of the language (content/<lang>.json), ../shared/viewer.js
   owns the keys, the toolbar's buttons, the overview, the ticks and the PDF: this engine hands it the views. */
(async () => {
  "use strict";
  const I18N = await window.DECK_I18N, UI = I18N.ui;
  const Q = new URLSearchParams(location.search);
  const PRINT = Q.has("print");
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;
  const TAU = Math.PI * 2, SVG = "http://www.w3.org/2000/svg";
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const rnd = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  const PLAN = JSON.parse(document.getElementById("plan").textContent);
  const POLES = PLAN.poles, NAMES = Object.keys(POLES), VIEWS = PLAN.views;
  if (I18N.T && I18N.T.views) VIEWS.forEach((v) => { const t = I18N.T.views[v.id]; if (t) [v.label, v.kicker] = t; });
  const world = document.getElementById("world");
  const objs = $$(".obj", world);
  const HI = new Set(objs.map((o) => o.dataset.hi).filter(Boolean));
  const num = (o, k) => parseFloat(o.style.getPropertyValue(k)) || 0;

  /* ================================================================ line drawings */
  let dd = 0;
  const path = (d, cls = "", gap = 90, dur) => { const s = `<path class="d ${cls}" pathLength="1" style="--dd:${dd}${dur ? `;--dur:${dur}s` : ""}" d="${d}"/>`; dd += gap; return s; };
  const circ = (cx, cy, r, cls = "", gap = 90) => path(`M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`, cls, gap);
  const dot = (cx, cy, r, cls = "", gap = 30) => { const s = `<circle class="dot ${cls}" style="--dd:${dd}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}"/>`; dd += gap; return s; };
  const text = (x, y, t, cls = "", anchor = "middle") => `<text class="${cls}" style="--dd:${dd}" x="${x}" y="${y}" text-anchor="${anchor}">${t}</text>`;
  const svg = (w, h, inner) => `<svg viewBox="0 0 ${w} ${h}" xmlns="${SVG}" aria-hidden="true">${inner}</svg>`;

  const DRAW = {
    // the wordmark, from the PDF paths: spacing untouched, letters attracted into place
    wordmark(el) {
      const L = window.MAGNETIC_LOGO;
      el.innerHTML = `<svg viewBox="0 0 ${L.w} ${L.h}">` + L.d.map((d, i) => {
        const cx = L.x[i] - L.w / 2, dx = cx * 1.6 + (cx > 0 ? 420 : -420), dy = (i % 2 ? 1 : -1) * (90 + i * 24);
        return `<g style="--i:${i};--dx:${dx.toFixed(0)}px;--dy:${dy}px"><path d="${d}"/></g>`;
      }).join("") + "</svg>";
    },
    // Geneva: a point, its territory, and what goes beyond
    geneva(w, h) {
      const c = w / 2; let s = "";
      s += circ(c, c, 200, "thin dash", 0);
      const R = rnd(3);
      for (let k = 0; k < 11; k++) { const a = R() * TAU, r = 40 + R() * 140; s += dot(c + Math.cos(a) * r, c + Math.sin(a) * r, 2.6, "", 40); }
      for (let k = 0; k < 3; k++) s += `<circle class="wave" style="--dd:${k * 1200}" cx="${c}" cy="${c}" r="200"/>`;
      s += circ(c, c, 26, "red", 60) + dot(c, c, 9, "red pulse", 0);
      return s;
    },
    // L'Esprit de Genève, Robert de Traz, 1929: the cover, redrawn
    book(w, h) {
      let s = path(`M12 12H${w - 12}V${h - 12}H12Z`, "", 120, 1.6) + path(`M28 28H${w - 28}V${h - 28}H28Z`, "thin", 200, 1.6);
      s += path(`M70 ${h * 0.24}H${w - 70}M70 ${h * 0.62}H${w - 70}`, "blue", 200);
      s += text(w / 2, 92, "Robert de Traz");
      s += text(w / 2, h * 0.36, "L’ESPRIT", "big") + text(w / 2, h * 0.43, "de") + text(w / 2, h * 0.53, "GENÈVE", "big");
      s += text(w / 2, h - 110, "Les Écrits") + text(w / 2, h - 80, "chez Bernard Grasset") + text(w / 2, h * 0.72, "1929", "serif");
      return s;
    },
    // the manifesto ring
    ring(w, h) {
      const c = w / 2; let s = circ(c, c, 760, "thin", 0, 3);
      s += `<g class="spin">${circ(c, c, 800, "dash thin", 0)}</g>`;
      return s;
    },
    // the three phases, one story: particles drawn along field lines into a pole (attraction),
    // two ideas meeting and giving birth to a new core (collision), that core sending waves that light up the world (resonance)
    phases(w, h) {
      const R = rnd(11), f = (n) => n.toFixed(1), cy = h / 2;
      const anim = (attr, vals, kt, dur, extra = "") => `<animate attributeName="${attr}" values="${vals}" keyTimes="${kt}" dur="${dur}s" repeatCount="indefinite" ${extra}/>`;
      // 1 · attraction
      const A = [240, cy]; let g1 = "", n = 0;
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * TAU + R() * 0.3, r0 = 200 + R() * 20, sw = 0.55;
        const sx = A[0] + Math.cos(a) * r0, sy = A[1] + Math.sin(a) * r0;
        const qx = A[0] + Math.cos(a + sw) * 110, qy = A[1] + Math.sin(a + sw) * 110;
        const ex = A[0] + Math.cos(a + sw * 1.4) * 22, ey = A[1] + Math.sin(a + sw * 1.4) * 22;
        const id = `ph-a${k}`;
        g1 += `<path id="${id}" class="fl" d="M${f(sx)} ${f(sy)}Q${f(qx)} ${f(qy)} ${f(ex)} ${f(ey)}"/>`;
        for (let j = 0; j < 2; j++) {
          const d = 3 + R() * 1.4, b = -(R() * d);
          g1 += `<circle class="pt" r="${f(2.4 + R() * 2.2)}" opacity="0"><animateMotion dur="${f(d)}s" begin="${f(b)}s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keyPoints="0;1" keySplines="0.55 0 0.9 0.6"><mpath href="#${id}"/></animateMotion>${anim("opacity", "0;1;1;0", "0;0.18;0.86;1", f(d), `begin="${f(b)}s"`)}</circle>`;
        }
      }
      g1 += `<circle class="core" cx="${A[0]}" cy="${A[1]}" r="13"/><circle class="halo" cx="${A[0]}" cy="${A[1]}" r="24"/>`;
      // 2 · collision
      const C = [800, cy], T = 4.2;
      const pa = `M${C[0] - 210} ${cy + 90}Q${C[0] - 110} ${cy - 90} ${C[0]} ${cy}`, pb = `M${C[0] + 210} ${cy - 90}Q${C[0] + 110} ${cy + 90} ${C[0]} ${cy}`;
      let g2 = `<path class="trail" d="${pa}"/><path class="trail" d="${pb}"/>`;
      // each idea is a small gathered group: a core and its particles turning around it
      const idea = (d, cls) => {
        let sat = "";
        for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + R(), r = 17 + R() * 12; sat += `<circle class="${cls}" cx="${f(Math.cos(a) * r)}" cy="${f(Math.sin(a) * r)}" r="${f(1.8 + R() * 1.6)}"/>`; }
        return `<g opacity="0"><animateMotion path="${d}" dur="${T}s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.42;1" keyPoints="0;1;1" keySplines="0.5 0 0.95 0.7;0 0 1 1"/>${anim("opacity", "0;1;1;0;0", "0;0.08;0.42;0.425;1", T)}<circle class="${cls}" r="9"/><g class="turn">${sat}</g></g>`;
      };
      g2 += idea(pa, "pt") + idea(pb, "pt blue");
      g2 += `<circle class="flash" cx="${C[0]}" cy="${C[1]}" r="4" opacity="0">${anim("r", "4;4;4;95;95", "0;0.41;0.42;0.66;1", T)}${anim("opacity", "0;0;0.95;0;0", "0;0.41;0.42;0.66;1", T)}</circle>`;
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * TAU + R() * 0.4, r1 = 70 + R() * 80;
        g2 += `<circle class="${k % 2 ? "pt" : "pt blue"}" r="${f(2 + R() * 2)}" opacity="0"><animateMotion path="M${C[0]} ${cy}L${f(C[0] + Math.cos(a) * r1)} ${f(cy + Math.sin(a) * r1)}" dur="${T}s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.42;0.8;1" keyPoints="0;0;1;1" keySplines="0 0 1 1;0.2 0.7 0.4 1;0 0 1 1"/>${anim("opacity", "0;0;1;0;0", "0;0.419;0.42;0.8;1", T)}</circle>`;
      }
      g2 += `<g opacity="0">${anim("opacity", "0;0;1;1;0", "0;0.43;0.52;0.92;1", T)}<circle class="core" cx="${C[0]}" cy="${C[1]}" r="13"/><circle class="halo" cx="${C[0]}" cy="${C[1]}" r="24"/></g>`;
      // 3 · resonance
      const S = [1360, cy], P = 3, R0 = 16, R1 = 215;
      let g3 = "";
      for (let k = 0; k < 3; k++) g3 += `<circle class="wv" cx="${S[0]}" cy="${S[1]}" r="${R0}" opacity="0">${anim("r", `${R0};${R1}`, "0;1", P, `begin="${-k}s"`)}${anim("opacity", "0.9;0", "0;1", P, `begin="${-k}s"`)}</circle>`;
      for (let k = 0; k < 22; k++) {
        const a = R() * TAU, r = 95 + R() * 115, hit = (((r - R0) / (R1 - R0)) * P) % 1;
        g3 += `<circle class="pt" cx="${f(S[0] + Math.cos(a) * r)}" cy="${f(S[1] + Math.sin(a) * r)}" r="${f(2.4 + R() * 2.2)}" opacity="0.22">${anim("opacity", "1;0.22;0.22", "0;0.45;1", 1, `begin="${f(hit)}s"`)}</circle>`;
      }
      g3 += `<circle class="core" cx="${S[0]}" cy="${S[1]}" r="13"/><circle class="halo" cx="${S[0]}" cy="${S[1]}" r="24"/>`;
      return `<g class="grp g1">${g1}</g><g class="grp g2">${g2}</g><g class="grp g3">${g3}</g>`;
    },
  };
  function draw(el) {
    const k = el.dataset.draw, f = DRAW[k];
    if (!f) return;
    if (k === "wordmark") return f(el);
    dd = 0;
    const w = num(el, "--w"), h = num(el, "--h");
    el.innerHTML = svg(w, h, f(w, h));
  }
  $$("[data-draw]", world).forEach(draw);

  /* ================================================================ the field */
  function field(x, y, q) {
    let bx = 0, by = 0;
    for (const n in q) {
      const c = q[n], p = POLES[n]; if (!c || !p) continue;
      const dx = x - p[0], dy = y - p[1], d = dx * dx + dy * dy + 900;
      if (p[3] === "spin") { bx += (-c * dy) / Math.sqrt(d) / 300; by += (c * dx) / Math.sqrt(d) / 300; }
      else { bx += (c * dx) / d; by += (c * dy) / d; }
    }
    return [bx, by];
  }
  const sources = (q) => NAMES.filter((n) => (q[n] || 0) > 0.15);
  const sinks = (q) => NAMES.filter((n) => (q[n] || 0) < -0.15);
  function spawn(p, q, box, R) {
    const src = sources(q);
    if (src.length && R() < 0.62) {
      const n = src[Math.floor(R() * src.length)], P = POLES[n], a = R() * TAU;
      const r = P[3] === "spin" ? 120 + R() * 900 : P[2] + 8 + R() * 70;
      p.x = P[0] + Math.cos(a) * r; p.y = P[1] + Math.sin(a) * r;
    } else { p.x = box[0] + R() * (box[2] - box[0]); p.y = box[1] + R() * (box[3] - box[1]); }
    p.age = 0; p.life = 220 + R() * 420;
  }
  const isSunk = (p, q) => sinks(q).some((n) => Math.hypot(p.x - POLES[n][0], p.y - POLES[n][1]) < POLES[n][2] + 8);

  /* ================================================================ camera */
  let W = 0, H = 0, dpr = 1, fit = 1;
  const cam = { x: 0, y: 0, z: 1 };
  let from = { ...cam }, to = { ...cam }, t0 = 0, dur = 1, bump = 0;
  const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const viewBox = (c, zz, w, h) => [c.x - w / 2 / zz, c.y - h / 2 / zz, c.x + w / 2 / zz, c.y + h / 2 / zz];

  /* A still field for a view, as an image: behind thumbnails and printed pages. */
  const stillCache = new Map();
  function stillField(v) {
    if (stillCache.has(v.id)) return stillCache.get(v.id);
    const w = 960, h = 540, k = 0.5 * v.cam[2], c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d"), R = rnd(4), box = viewBox({ x: v.cam[0], y: v.cam[1] }, k, w, h);
    x.fillStyle = "#08080d"; x.fillRect(0, 0, w, h);
    if (v.glow) {
      const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.62);
      g.addColorStop(0, `rgba(36,51,255,${0.9 * v.glow})`); g.addColorStop(0.45, `rgba(20,28,190,${0.5 * v.glow})`); g.addColorStop(1, "rgba(8,8,13,0)");
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    }
    x.setTransform(k, 0, 0, k, w / 2 - v.cam[0] * k, h / 2 - v.cam[1] * k);
    x.strokeStyle = v.glow ? "rgba(190,198,255,0.2)" : "rgba(90,105,255,0.3)"; x.lineWidth = 0.8 / k;
    for (let i = 0; i < 520; i++) {
      const p = {}; spawn(p, v.q, box, R);
      x.beginPath(); x.moveTo(p.x, p.y);
      for (let t = 0; t < 80; t++) { const [bx, by] = field(p.x, p.y, v.q), m = Math.hypot(bx, by) || 1; p.x += (bx / m) * 4 / k; p.y += (by / m) * 4 / k; x.lineTo(p.x, p.y); if (isSunk(p, v.q)) break; }
      x.stroke();
    }
    const url = c.toDataURL("image/jpeg", 0.85);
    stillCache.set(v.id, url);
    return url;
  }

  /* ================================================================ view state, shared by the live plane and the snapshots */
  function applyView(scope, v, idx, live) {
    const prev = VIEWS[idx - 1] && VIEWS[idx - 1].id, next = VIEWS[idx + 1] && VIEWS[idx + 1].id;
    $$(".obj", scope).forEach((o) => {
      if (o.dataset.view === undefined) return;
      const list = o.dataset.view.split(/\s+/);
      const on = list.includes(v.id);
      const near = !on && (o.classList.contains("pic") || o.classList.contains("art")) && (list.includes(prev) || list.includes(next));
      o.classList.toggle("on", on); o.classList.toggle("near", near);
      o.classList.toggle("dim", on && HI.has(v.id) && !!o.dataset.hi && o.dataset.hi !== v.id);
      if (o.dataset.draw === "phases") o.dataset.state = v.id;
      if (o.classList.contains("pic")) {
        const [bx, by] = field(num(o, "--x"), num(o, "--y"), v.q);
        o.style.setProperty("--a", (Math.atan2(by, bx) * 180) / Math.PI + 90 + "deg");
        if (live) { clearTimeout(o._full); o.classList.remove("full"); if (on) o._full = setTimeout(() => o.classList.add("full"), 3300); }
      }
    });
  }
  function loadImages(scope) { $$("img[data-src]", scope).forEach((im) => { if (!im.getAttribute("src")) im.src = im.dataset.src; }); }
  const worldTransform = (c, k, w, h) => `translate(${w / 2 - c.x * k}px, ${h / 2 - c.y * k}px) scale(${k})`;

  /* A view rendered still at 1920 × 1080: for the overview and the PDF. */
  const chrome = document.getElementById("chrome");
  function snapshot(i) {
    const v = VIEWS[i], s = document.createElement("div");
    s.className = "snap static";
    s.style.backgroundImage = `url(${stillField(v)})`;
    const w = world.cloneNode(true);
    w.removeAttribute("id"); $$("[id]", w).forEach((e) => e.removeAttribute("id"));
    w.style.transform = worldTransform({ x: v.cam[0], y: v.cam[1] }, v.cam[2], 1920, 1080);
    loadImages(w);
    $$(".pic", w).forEach((p) => p.classList.add("full"));
    $$(".logo", w).forEach((l) => l.classList.add("lock"));
    applyView(w, v, i, false);
    const c = chrome.cloneNode(true); c.removeAttribute("id");
    c.querySelector(".kicker").removeAttribute("id"); c.querySelector(".kicker").textContent = v.kicker || "";
    s.append(w, c);
    return s;
  }

  if (PRINT) {
    root.classList.add("print");
    VIEWS.forEach((v, i) => document.body.appendChild(snapshot(i)));
    return;
  }

  /* ================================================================ the live plane */
  const back = document.getElementById("back"), front = document.getElementById("front");
  const bctx = back.getContext("2d", { alpha: false }), fctx = front.getContext("2d");
  let pts = [], cur = -1, charge = {}, glow = 0, glowT = 0;
  NAMES.forEach((n) => (charge[n] = 0));
  const Rl = Math.random;

  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; fit = Math.min(W / 1920, H / 1080);
    root.style.setProperty("--fit", fit);
    for (const c of [back, front]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.fillStyle = "#08080d"; bctx.fillRect(0, 0, back.width, back.height);
  }
  const liveBox = () => viewBox(cam, cam.z * fit, W, H);

  function step(now) {
    const k = Math.min(1, (now - t0) / dur), e = easeIO(k);
    cam.x = from.x + (to.x - from.x) * e; cam.y = from.y + (to.y - from.y) * e;
    cam.z = Math.exp(Math.log(from.z) + (Math.log(to.z) - Math.log(from.z)) * e) * (1 - bump * Math.sin(Math.PI * e));
    const z = cam.z * fit, tx = W / 2 - cam.x * z, ty = H / 2 - cam.y * z;
    world.style.transform = `translate(${tx}px, ${ty}px) scale(${z})`;
    const q = VIEWS[cur].q;
    for (const n of NAMES) charge[n] += ((q[n] || 0) - charge[n]) * 0.035;
    glow += (glowT - glow) * 0.035;

    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.fillStyle = "rgba(8,8,13,0.085)"; bctx.fillRect(0, 0, back.width, back.height);
    if (glow > 0.01) {
      const g = bctx.createRadialGradient(back.width / 2, back.height / 2, 0, back.width / 2, back.height / 2, Math.max(back.width, back.height) * 0.62);
      g.addColorStop(0, `rgba(36,51,255,${0.09 * glow})`); g.addColorStop(0.45, `rgba(20,28,190,${0.05 * glow})`); g.addColorStop(1, "rgba(8,8,13,0)");
      bctx.fillStyle = g; bctx.fillRect(0, 0, back.width, back.height);
    }
    fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.clearRect(0, 0, front.width, front.height);
    for (const c of [bctx, fctx]) { c.setTransform(dpr * z, 0, 0, dpr * z, dpr * tx, dpr * ty); c.lineCap = "round"; }
    bctx.lineWidth = 1.15 / z; fctx.lineWidth = 0.9 / z;
    bctx.strokeStyle = glow > 0.5 ? "rgba(170,180,255,0.58)" : "rgba(84,100,255,0.62)";
    fctx.strokeStyle = "rgba(111,123,255,0.26)";
    bctx.beginPath(); fctx.beginPath();
    const box = liveBox(), mx = (box[2] - box[0]) * 0.12, my = (box[3] - box[1]) * 0.12, sp = (REDUCED ? 0.6 : 2.2) / z;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], [bx, by] = field(p.x, p.y, charge), m = Math.hypot(bx, by) || 1;
      const nx = p.x + (bx / m) * sp, ny = p.y + (by / m) * sp, c = i % 6 === 0 ? fctx : bctx;
      c.moveTo(p.x, p.y); c.lineTo(nx, ny);
      p.x = nx; p.y = ny; p.age++;
      if (p.age > p.life || p.x < box[0] - mx || p.x > box[2] + mx || p.y < box[1] - my || p.y > box[3] + my || isSunk(p, charge)) spawn(p, charge, box, Rl);
    }
    bctx.stroke(); fctx.stroke();
  }
  function frame(now) { step(now); requestAnimationFrame(frame); }

  /* ================================================================ navigation
     The platform's viewer (../shared/viewer.js) owns the keys, the swipe, the toolbar, the overview, the ticks,
     the slide count and the PDF; this engine moves the camera to a view. */
  const kicker = document.getElementById("kicker");

  function go(i, instant) {
    i = Math.max(0, Math.min(VIEWS.length - 1, i));
    if (i === cur) return;
    const v = VIEWS[i];
    cur = i;
    from = { ...cam }; to = { x: v.cam[0], y: v.cam[1], z: v.cam[2] };
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    dur = instant || REDUCED ? 1 : 1500 + Math.min(1900, dist * 0.32);
    bump = instant || REDUCED ? 0 : Math.min(0.62, dist / 5200);
    t0 = performance.now();
    glowT = v.glow || 0;
    applyView(world, v, i, true);
    loadImages(world);
    const logo = world.querySelector(".logo");
    if (v.id === "couverture" || v.id === "contact") setTimeout(() => logo.classList.add("lock"), instant ? 0 : 250);
    kicker.classList.add("swap");
    setTimeout(() => { kicker.textContent = v.kicker || ""; kicker.classList.remove("swap"); }, instant ? 0 : 500);
  }

  addEventListener("resize", resize);
  addEventListener("scroll", () => { if (scrollX || scrollY) scrollTo(0, 0); });

  resize();
  const start = Math.max(0, VIEWS.findIndex((v) => "#" + v.id === location.hash));
  const v0 = VIEWS[start];
  Object.assign(cam, { x: v0.cam[0], y: v0.cam[1], z: v0.cam[2] });
  Object.assign(charge, v0.q);
  pts = Array.from({ length: 1700 }, () => { const p = {}; cur = start; spawn(p, v0.q, liveBox(), Rl); p.age = Rl() * p.life; return p; });
  cur = -1;
  requestAnimationFrame(frame);
  const V = DeckViewer.mount({
    stage: document.getElementById("viewport"),
    slides: VIEWS.map((v) => ({ id: v.id, label: v.label || v.id })),
    show: (i, st, instant) => go(i, instant),
    thumb: snapshot,
  });

  // settle(): advance the field without animation frames (checks, stills); state(): where we are
  window.deck = { go: (id) => (typeof id === "number" ? V.go(id) : V.goId(id)), next: V.next, prev: V.prev,
    state: () => ({ view: VIEWS[cur].id }), settle: (n = 240) => { const t = performance.now() + 1e5; for (let i = 0; i < n; i++) step(t); } };
})();

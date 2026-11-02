/* Magnetic · deck engine, « plan continu »
   One plane, a camera, a magnetic field whose poles are the content (the plan is the JSON in index.html).
   Each view is a camera position and a set of charges; objects light up in the views they list (data-view).
   Line drawings are built here (data-draw). Platform contract: ../shared/controls.js fills the .hud box,
   this engine wires its buttons by data-act (fullscreen, restart, overview, pdf). No other control. */
(() => {
  "use strict";
  const Q = new URLSearchParams(location.search);
  const PRINT = Q.has("print");
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;
  const TAU = Math.PI * 2, SVG = "http://www.w3.org/2000/svg";
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const rnd = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  const PLAN = JSON.parse(document.getElementById("plan").textContent);
  const POLES = PLAN.poles, NAMES = Object.keys(POLES), VIEWS = PLAN.views;
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
    // the three phases: a triangle that draws particles in, spheres that collide, a star that radiates
    phases(w, h) {
      const R = rnd(5); let dots = "";
      for (let k = 0; k < 18; k++) {
        const a = Math.PI * (0.5 + R()), d = 160 + R() * 120;
        dots += `<circle class="pdot" cx="${(240 + (R() - 0.5) * 40).toFixed(0)}" cy="${(250 + (R() - 0.5) * 40).toFixed(0)}" r="${(2 + R() * 2.5).toFixed(1)}" style="--fx:${(Math.cos(a) * d).toFixed(0)}px;--fy:${(Math.sin(a) * d).toFixed(0)}px;animation-delay:${(R() * 2.4).toFixed(2)}s"/>`;
      }
      const orbs = [[770, 190, 34, 22, -14, 3.1], [840, 230, 50, -18, 16, 2.6], [800, 300, 22, 16, -20, 2.2], [880, 320, 40, -12, -10, 3.4], [740, 300, 28, 20, 12, 2.8]];
      let o = ""; orbs.forEach(([x, y, r, ox, oy, t]) => (o += `<circle class="orb" cx="${x}" cy="${y}" r="${r}" style="--ox:${ox}px;--oy:${oy}px;--t:${t}s"/>`));
      let star = "";
      for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU, r = k % 2 ? 22 : 92; star += `${k ? "L" : "M"}${(1360 + Math.cos(a) * r).toFixed(1)} ${(250 + Math.sin(a) * r).toFixed(1)}`; }
      return `<path class="path" d="M340 230 C 480 120, 600 150, 700 220M340 270 C 480 360, 620 360, 720 300"/>
        <path class="path" d="M930 220 C 1050 120, 1170 140, 1270 230M930 300 C 1050 380, 1180 360, 1280 280"/>
        <g class="grp g1"><path class="tri" d="M240 140L350 340H130Z"/>${dots}</g><g class="grp g2">${o}</g>
        <g class="grp g3"><circle class="ring" cx="1360" cy="250" r="90"/><circle class="ring" cx="1360" cy="250" r="90"/><circle class="ring" cx="1360" cy="250" r="90"/><path class="star" d="${star}Z"/></g>`;
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
    if (overviewOpen()) scaleThumbs();
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

  /* ================================================================ navigation */
  const kicker = document.getElementById("kicker");
  const hudCount = document.getElementById("hudCount"), hudTitle = document.getElementById("hudTitle"), bar = document.getElementById("progress");
  let skipped = new Set();
  try { skipped = new Set(JSON.parse(sessionStorage.getItem("mag-skip") || "[]")); } catch (e) { /* private mode */ }
  const saveSkip = () => { try { sessionStorage.setItem("mag-skip", JSON.stringify([...skipped])); } catch (e) { /* ignore */ } };

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
    history.replaceState(null, "", "#" + v.id);
    hudCount.textContent = String(i + 1).padStart(2, "0") + " / " + VIEWS.length;
    hudTitle.textContent = v.label || "";
    bar.style.width = ((i + 1) / VIEWS.length) * 100 + "%";
  }
  function nextIndex(d) {
    let i = cur + d;
    while (i >= 0 && i < VIEWS.length && skipped.has(VIEWS[i].id)) i += d;
    return i >= 0 && i < VIEWS.length ? i : cur;
  }
  const next = () => go(nextIndex(1)), prev = () => go(nextIndex(-1));

  /* ================================================================ overview */
  let ov = null;
  function buildOverview() {
    ov = document.createElement("div");
    ov.className = "overview"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "Toutes les vues");
    VIEWS.forEach((v, i) => {
      const card = document.createElement("div"); card.className = "ov-card"; card.dataset.i = i;
      const thumb = document.createElement("div"); thumb.className = "ov-thumb";
      thumb.appendChild(snapshot(i));
      const cap = document.createElement("div"); cap.className = "ov-cap";
      cap.innerHTML = `<b>${String(i + 1).padStart(2, "0")}</b><span>${v.label || ""}</span>`;
      const chk = document.createElement("button"); chk.type = "button"; chk.className = "ov-check"; chk.textContent = "✓";
      chk.setAttribute("aria-label", "Montrer ou masquer cette vue");
      chk.addEventListener("click", (e) => { e.stopPropagation(); skipped.has(v.id) ? skipped.delete(v.id) : skipped.add(v.id); card.classList.toggle("skipped", skipped.has(v.id)); saveSkip(); });
      card.classList.toggle("skipped", skipped.has(v.id));
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
    else if (k === "End") { go(VIEWS.length - 1); e.preventDefault(); }
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
  addEventListener("scroll", () => { if (scrollX || scrollY) scrollTo(0, 0); });
  addEventListener("hashchange", () => { const i = VIEWS.findIndex((v) => "#" + v.id === location.hash); if (i >= 0 && i !== cur) go(i); });

  resize();
  const start = Math.max(0, VIEWS.findIndex((v) => "#" + v.id === location.hash));
  const v0 = VIEWS[start];
  Object.assign(cam, { x: v0.cam[0], y: v0.cam[1], z: v0.cam[2] });
  Object.assign(charge, v0.q);
  pts = Array.from({ length: 1700 }, () => { const p = {}; cur = start; spawn(p, v0.q, liveBox(), Rl); p.age = Rl() * p.life; return p; });
  cur = -1;
  go(start, true);
  requestAnimationFrame(frame);

  // settle(): advance the field without animation frames (checks, stills); state(): where we are
  window.deck = { go: (id) => go(typeof id === "number" ? id : VIEWS.findIndex((v) => v.id === id)), next, prev,
    state: () => ({ view: VIEWS[cur].id }), settle: (n = 240) => { const t = performance.now() + 1e5; for (let i = 0; i < n; i++) step(t); } };
})();

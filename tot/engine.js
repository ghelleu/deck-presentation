/* Powerded by Superheros · deck engine
   A comic book on a table, read by a camera: each view frames panels (fit), the camera glides from one to the next,
   the panel in focus is revealed in colour, the others stay printed. Drawings are built here (data-draw):
   rays and bursts, the speech balloon, the floor plan in Ben Day screens, the labelled axonometry,
   and « ceci devient cela », where the dots of a Pop Art painting re-ink themselves into the plan of the room.
   Platform contract: ../shared/controls.js fills the .hud box, this engine wires its buttons by data-act. No other control. */
(async () => {
  "use strict";
  const Q = new URLSearchParams(location.search);
  const PRINT = Q.has("print");
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;
  const NS = "http://www.w3.org/2000/svg";
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const rnd = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  const VIEWS = JSON.parse(document.getElementById("views").textContent);

  /* ================================================================ language: ../shared/i18n.js has put in the texts of content/<lang>.json;
     ui holds the words drawn by this engine, views the label and chapter of each view. */
  const CFG = Object.assign({ LANG: "fr", LANGS: ["fr"] }, window.DECK_CONFIG);
  const I18N = await window.DECK_I18N, T = I18N.T;
  const UI = Object.assign({ folio: CFG.FOLIO || [], plan: ["Ballroom Zurich", "Ballroom Geneva", "Vestiaire", "Toilettes", "Accès", "Sortie"],
    axo: ["Fresque murale", "Lounge", "Bar / buffet", "Stickers d’onomatopées", "Mange-debout", "Scène", "Photocall", "Vestiaire"],
    overview: "Toutes les vues", check: "Montrer ou masquer cette vue" }, I18N.ui);
  if (T && T.views) VIEWS.forEach((v) => { const t = T.views[v.id]; if (t) [v.label, v.kicker] = t; });
  const world = document.getElementById("world");
  $$(".page, .panel", world).forEach((e) => (e.dataset.pid = e.id));
  const C = { ink: "#17161A", paper: "#F6F0E1", white: "#FFFDF7", yellow: "#FFD60A", red: "#E8262B", blue: "#1C5BD6", cyan: "#19A7E0", pink: "#F27FA0" };

  /* ================================================================ shared screens (Ben Day patterns), outside the world so print can use them */
  const defs = document.createElementNS(NS, "svg");
  defs.setAttribute("width", "0"); defs.setAttribute("height", "0"); defs.setAttribute("aria-hidden", "true");
  defs.style.position = "absolute";
  const dots = (id, col, bg, r = 2.3, p = 7) => `<pattern id="${id}" width="${p}" height="${p}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="${p}" height="${p}" fill="${bg}"/><circle cx="${p / 2}" cy="${p / 2}" r="${r}" fill="${col}"/></pattern>`;
  defs.innerHTML = "<defs>" + dots("te-red", C.red, C.white) + dots("te-blue", C.blue, C.white) + dots("te-cyan", C.cyan, C.white, 2.1) +
    dots("te-yellow", "#E8A900", C.yellow, 1.7) + dots("te-pink", C.pink, C.white, 2.1) + dots("te-blue-soft", C.blue, C.white, 1.5) + "</defs>";
  document.body.prepend(defs);

  /* ================================================================ drawings */
  const burstD = (seed, n = 22, cx = 500, cy = 500, ro = 480, ri = 300) => {
    const R = rnd(seed); let d = "";
    for (let k = 0; k < n * 2; k++) {
      const a = (k / (n * 2)) * Math.PI * 2 + (R() - 0.5) * 0.08;
      const r = k % 2 ? ri * (0.85 + R() * 0.25) : ro * (0.72 + R() * 0.28);
      d += `${k ? "L" : "M"}${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}`;
    }
    return d + "Z";
  };
  const DRAW = {
    rays(el) {
      let s = "";
      for (let k = 0; k < 28; k++) {
        const a0 = (k / 28) * Math.PI * 2, a1 = ((k + 0.5) / 28) * Math.PI * 2;
        s += `<path d="M0 0L${(Math.cos(a0) * 1000).toFixed(0)} ${(Math.sin(a0) * 1000).toFixed(0)}L${(Math.cos(a1) * 1000).toFixed(0)} ${(Math.sin(a1) * 1000).toFixed(0)}Z" fill="${k % 2 ? "#C8161C" : "url(#te-red)"}"/>`;
      }
      el.innerHTML = `<svg viewBox="-1000 -1000 2000 2000">${s}</svg>`;
    },
    burst(el) {
      const seed = +el.dataset.seed || 1, fill = el.dataset.fill || C.yellow;
      const wide = el.classList.contains("burst-bg");
      const vb = wide ? "0 0 1000 1000" : "0 0 1000 1000";
      const d1 = burstD(seed, wide ? 26 : 18), d2 = burstD(seed + 4, wide ? 26 : 18, 500, 500, 400, 250);
      el.innerHTML = `<svg viewBox="${vb}" preserveAspectRatio="${wide ? "none" : "xMidYMid meet"}"><path d="${d1}" fill="${C.ink}" transform="translate(14 16)"/><path d="${d1}" fill="${fill}" stroke="${C.ink}" stroke-width="9" stroke-linejoin="round"/>` +
        (wide ? `<path d="${d2}" fill="${C.white}" stroke="${C.ink}" stroke-width="7" stroke-linejoin="round" opacity="0.92"/>` : "") + "</svg>";
    },
    // the title, letter by letter, each one slammed into place
    letters(el) {
      const R = rnd(21); let k = 0;
      el.innerHTML = el.innerHTML.split(/<br\s*\/?>/i).map((line) => line.trim().split(/\s+/).map((w) => {
        const cls = w.toLowerCase() === "by" ? "w by" : "w";
        return `<span class="${cls}">` + [...w].map((ch) => `<span class="l" style="--k:${k++};--rot:${((R() - 0.5) * 40).toFixed(1)}deg;--tilt:${((R() - 0.5) * 5).toFixed(1)}deg">${ch}</span>`).join("") + "</span>";
      }).join(" ")).join("<br>");
    },
    // a speech balloon, inked, with its tail
    balloon(el) {
      const p = el.closest(".panel"), w = +p.style.getPropertyValue("--w"), h = +p.style.getPropertyValue("--h");
      const cx = w / 2, cy = h * 0.42, rx = w * 0.4, ry = h * 0.33;
      const tail = `M${cx - rx * 0.42} ${cy + ry * 0.7}L${cx - rx * 0.78} ${h - 50}L${cx - rx * 0.08} ${cy + ry * 0.9}Z`;
      // the same tail, a little inside: it covers the outline where the tail joins the balloon
      const cover = `M${cx - rx * 0.38} ${cy + ry * 0.62}L${cx - rx * 0.72} ${h - 66}L${cx - rx * 0.12} ${cy + ry * 0.82}Z`;
      const ell = `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
      el.innerHTML = `<svg viewBox="0 0 ${w} ${h}"><g><path d="${ell}" fill="${C.ink}" transform="translate(12 14)"/><path d="${tail}" fill="${C.ink}" transform="translate(12 14)"/>` +
        `<path d="${tail}" fill="${C.white}" stroke="${C.ink}" stroke-width="8" stroke-linejoin="round"/><path d="${ell}" fill="${C.white}" stroke="${C.ink}" stroke-width="8"/>` +
        `<path d="${cover}" fill="${C.white}"/></g></svg>`;
    },
    // the floor plan, from the PDF paths, screened in Ben Day dots
    plan(el) {
      const P = window.TE_PLAN, layer = el.dataset.layer, [x, y, w, h] = P.view;
      let zones = "", over = "";
      const Z = (d, fill, i) => `<path class="zone" style="--i:${i}" d="${d}" fill="${fill}"/>`;
      if (layer === "zones") {
        [["zurich", "url(#te-red)"], ["lobby", "url(#te-pink)"], ["hall", "url(#te-cyan)"], ["wing", "url(#te-blue)"], ["geneva", "url(#te-yellow)"]]
          .forEach(([k, f], i) => (zones += Z(P.zones[k], f, i)));
      } else if (layer === "salles") {
        zones = Z(P.zones.zurich, "url(#te-blue)", 0) + Z(P.zones.geneva, "url(#te-blue)", 1);
        over = `<path class="link" d="${P.link}"/>` +
          `<text class="lbl" x="1373" y="331" text-anchor="middle">${UI.plan[0]}</text><text class="lbl" x="1243" y="702" text-anchor="middle">${UI.plan[1]}</text>`;
      } else if (layer === "flux") {
        zones = Z(P.zones.hall, "url(#te-blue-soft)", 0);
        over = `<g class="flow guests">${P.guests.map((d) => `<path d="${d}"/>`).join("")}</g><g class="flow service">${P.service.map((d) => `<path d="${d}"/>`).join("")}</g>` +
          [[UI.plan[2], 838, 492], [UI.plan[3], 977, 425], [UI.plan[4], 1067, 312], [UI.plan[5], 1074, 602]].map(([t, tx, ty]) => `<text class="lbl red" x="${tx}" y="${ty}">${t}</text>`).join("");
      }
      el.innerHTML = `<svg viewBox="${x} ${y} ${w} ${h}" role="img" aria-label="Plan du niveau événementiel"><path class="base" d="${P.base}"/>${zones}<path class="walls" d="${P.walls}"/><path class="details" d="${P.details}"/>${over}</svg>`;
    },
    // labels of the axonometry, in the coordinates of the PDF page
    axo(el) {
      const L = [
        [UI.axo[0], 1, 349, 1203, 185.5], [UI.axo[1], 1, 421, 1177, 231], [UI.axo[2], 1, 501, 1277, 600], [UI.axo[3], 1, 566, 1342, 600],
        [UI.axo[4], 1, 870, 1208, 750.5], [UI.axo[5], 1, 995, 1070.5, 941.4], [UI.axo[6], 0, 364, 915.5, 554.7], [UI.axo[7], 0, 697, 649, 844.2],
      ];
      let s = "";
      L.forEach(([t, right, ly, dx, dy], i) => {
        const elbow = right ? dx + Math.abs(dy - ly) : dx - Math.abs(dy - ly), x0 = right ? 1548 : 372;
        s += `<g style="--i:${i}"><path class="ln" pathLength="1" d="M${x0} ${ly}H${elbow.toFixed(1)}L${dx} ${dy}"/><circle class="pt" cx="${dx}" cy="${dy}" r="7"/>` +
          `<text class="tx" x="${right ? 1563 : 357}" y="${ly + 6}" text-anchor="${right ? "start" : "end"}">${t}</text></g>`;
      });
      el.insertAdjacentHTML("beforeend", `<svg viewBox="0 0 1920 1080" aria-hidden="true">${s}</svg>`);
    },
  };
  $$("[data-draw]", world).forEach((el) => DRAW[el.dataset.draw] && DRAW[el.dataset.draw](el));

  /* the folio, printed in the bottom margin of every page, as in a comic book */
  const F = UI.folio;
  $$(".page:not(.cover-page)", world).forEach((pg, i) => {
    const f = document.createElement("p");
    f.className = "runfoot"; f.setAttribute("aria-hidden", "true");
    f.innerHTML = `<span>${F[0] || ""}</span><i></i><b>${i + 1}</b><i></i><span>${F.slice(1).join(" · ")}</span>`;
    pg.appendChild(f);
  });

  /* ================================================================ layout: where each panel lies on the table */
  const boxOf = (el) => { let x = 0, y = 0, e = el; while (e && e !== world) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return [x, y, el.offsetWidth, el.offsetHeight]; };
  const BOX = {};
  let CAMS = [];
  function measure() {
    $$("[data-pid]", world).forEach((e) => (BOX[e.dataset.pid] = boxOf(e)));
    CAMS = VIEWS.map((v) => {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      v.fit.forEach((id) => { const b = BOX[id]; x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[0] + b[2]); y1 = Math.max(y1, b[1] + b[3]); });
      const pad = v.pad != null ? v.pad : v.fit[0].startsWith("pg-") ? 0.035 : 0.055;
      const w = x1 - x0, h = y1 - y0, z = Math.min(1920 / (w * (1 + 2 * pad)), 1080 / (h * (1 + 2 * pad * 1.6)));
      return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z };
    });
  }
  const rectOf = (c, w = 1920, h = 1080) => [c.x - w / 2 / c.z, c.y - h / 2 / c.z, c.x + w / 2 / c.z, c.y + h / 2 / c.z];
  const meets = (b, r) => b[0] < r[2] && b[0] + b[2] > r[0] && b[1] < r[3] && b[1] + b[3] > r[1];

  /* ================================================================ view state, shared by the live table and the snapshots */
  function applyView(scope, v) {
    const fit = new Set(v.fit);
    $$(".panel", scope).forEach((p) => {
      const on = fit.has(p.dataset.pid), page = p.closest(".page");
      p.classList.toggle("cur", on);
      p.classList.toggle("lit", !on && !!page && fit.has(page.dataset.pid));
    });
    $$("[data-view]", scope).forEach((o) => o.classList.toggle("on", o.dataset.view.split(/\s+/).includes(v.id)));
  }
  const load = (im) => { if (!im.getAttribute("src") && im.dataset.src) im.src = im.dataset.src; };
  function loadAround(rect) { $$(".panel", world).forEach((p) => { if (meets(BOX[p.dataset.pid], rect)) $$("img[data-src]", p).forEach(load); }); }
  const worldTransform = (c, k, w, h) => `translate(${w / 2 - c.x * k}px, ${h / 2 - c.y * k}px) scale(${k})`;

  /* A view rendered still at 1920 × 1080: for the overview and the PDF. */
  const chrome = document.getElementById("chrome");
  function snapshot(i) {
    const v = VIEWS[i], c = CAMS[i], r = rectOf(c), s = document.createElement("div");
    s.className = "snap static";
    const w = world.cloneNode(true);
    w.removeAttribute("id"); $$("[id]", w).forEach((e) => e.removeAttribute("id"));
    w.classList.add("focus");
    $$(".panel", w).forEach((p) => { if (!meets(BOX[p.dataset.pid], r)) p.replaceChildren(); });
    $$("canvas", w).forEach((cv) => cv.remove());
    w.style.transform = worldTransform(c, c.z, 1920, 1080);
    applyView(w, v);
    $$("img[data-src]", w).forEach(load);
    const ch = chrome.cloneNode(true); ch.removeAttribute("id");
    const k = ch.querySelector(".kicker"); k.removeAttribute("id"); k.classList.remove("swap"); k.textContent = v.kicker || "";
    s.append(w, ch);
    return s;
  }

  function start() {
    measure();
    if (PRINT) {
      root.classList.add("print");
      VIEWS.forEach((v, i) => document.body.appendChild(snapshot(i)));
      return;
    }
    live();
  }
  // panels have fixed sizes, but the lettering must be in place before measuring the caption boxes
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start);

  /* ================================================================ the live table */
  function live() {
    let W = 0, H = 0, fit = 1, cur = -1;
    const cam = { x: 0, y: 0, z: 1 };
    let from = { ...cam }, to = { ...cam }, t0 = 0, dur = 1, bump = 0, moving = false;
    const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    world.classList.add("focus");

    function resize() {
      W = innerWidth; H = innerHeight; fit = Math.min(W / 1920, H / 1080);
      root.style.setProperty("--fit", fit);
      if (!moving) paint();
      if (overviewOpen()) scaleThumbs();
    }
    function paint() {
      const z = cam.z * fit;
      world.style.transform = `translate(${W / 2 - cam.x * z}px, ${H / 2 - cam.y * z}px) scale(${z})`;
    }
    function frame(now) {
      const k = Math.min(1, (now - t0) / dur), e = easeIO(k);
      cam.x = from.x + (to.x - from.x) * e; cam.y = from.y + (to.y - from.y) * e;
      cam.z = Math.exp(Math.log(from.z) + (Math.log(to.z) - Math.log(from.z)) * e) * (1 - bump * Math.sin(Math.PI * e));
      paint();
      if (k < 1) requestAnimationFrame(frame); else moving = false;
    }

    /* ---------------------------------------------------------- « ceci devient cela » */
    const M = (() => {
      const el = document.getElementById("morph"), cv = el.querySelector("canvas"), ctx = cv.getContext("2d");
      const imA = el.querySelector(".m-a"), imB = el.querySelector(".m-b");
      const CW = 1440, CH = 860, CELL = 12, cols = Math.ceil(CW / CELL), rows = Math.ceil(CH / CELL), N = cols * rows;
      let A = null, B = null, raf = 0, timer = 0;
      cv.width = CW * 2; cv.height = CH * 2;
      function grid(img) {
        const s = Math.min(CW / img.naturalWidth, CH / img.naturalHeight), dw = img.naturalWidth * s, dh = img.naturalHeight * s;
        const mid = document.createElement("canvas"); mid.width = cols * 4; mid.height = rows * 4;
        const m = mid.getContext("2d"); m.fillStyle = C.white; m.fillRect(0, 0, mid.width, mid.height);
        m.drawImage(img, ((CW - dw) / 2 / CELL) * 4, ((CH - dh) / 2 / CELL) * 4, (dw / CELL) * 4, (dh / CELL) * 4);
        const g = document.createElement("canvas"); g.width = cols; g.height = rows;
        const gx = g.getContext("2d"); gx.imageSmoothingQuality = "high"; gx.drawImage(mid, 0, 0, cols, rows);
        const d = gx.getImageData(0, 0, cols, rows).data, out = { r: new Float32Array(N), g: new Float32Array(N), b: new Float32Array(N), s: new Float32Array(N) };
        for (let i = 0; i < N; i++) {
          const r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
          const lum = (0.299 * r + 0.587 * gg + 0.114 * b) / 255, sat = mx ? (mx - mn) / mx : 0;
          let ink = Math.max(1 - lum, sat * 0.95); if (lum > 0.92 && sat < 0.12) ink = 0;
          out.r[i] = r; out.g[i] = gg; out.b[i] = b; out.s[i] = ink > 0 ? CELL * 0.6 * Math.sqrt(Math.min(1, ink * 1.1)) + 0.7 : 0;
        }
        out.dw = dw; out.dh = dh;
        return out;
      }
      const ready = () => imA.complete && imA.naturalWidth && imB.complete && imB.naturalWidth;
      function draw(t) {
        ctx.setTransform(2, 0, 0, 2, 0, 0); ctx.clearRect(0, 0, CW, CH);
        // the ripple leaves the explosion, which becomes the stage
        const ox = (CW - B.dw) / 2 + B.dw * 0.13, oy = (CH - B.dh) / 2 + B.dh * 0.8, far = Math.hypot(CW, CH);
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
          const n = j * cols + i, x = i * CELL + CELL / 2, y = j * CELL + CELL / 2;
          const delay = (Math.hypot(x - ox, y - oy) / far) * 0.55;
          let u = Math.min(1, Math.max(0, (t - delay) / 0.45)); u = u * u * (3 - 2 * u);
          const r = (A.s[n] + (B.s[n] - A.s[n]) * u) * (1 + 0.55 * Math.sin(Math.PI * u));
          if (r < 0.4) continue;
          ctx.fillStyle = `rgb(${A.r[n] + (B.r[n] - A.r[n]) * u | 0},${A.g[n] + (B.g[n] - A.g[n]) * u | 0},${A.b[n] + (B.b[n] - A.b[n]) * u | 0})`;
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
      }
      function stop() { cancelAnimationFrame(raf); clearTimeout(timer); el.classList.remove("playing", "landed"); }
      function play() {
        stop();
        if (REDUCED) return;
        if (!ready()) { load(imA); load(imB); imA.onload = imB.onload = () => cur >= 0 && VIEWS[cur].id === "cela" && play(); return; }
        if (!A) { A = grid(imA); B = grid(imB); }
        draw(0); el.classList.add("playing");
        const T = 2600;
        timer = setTimeout(() => {
          const s = performance.now();
          const tick = (now) => { const t = Math.min(1, (now - s) / T); draw(t); if (t < 1) raf = requestAnimationFrame(tick); else el.classList.add("landed"); };
          raf = requestAnimationFrame(tick);
        }, 500);
      }
      return { play, stop };
    })();

    /* ---------------------------------------------------------- navigation */
    const kicker = document.getElementById("kicker");
    const hudCount = document.getElementById("hudCount"), hudTitle = document.getElementById("hudTitle"), bar = document.getElementById("progress");
    let skipped = new Set();
    try { skipped = new Set(JSON.parse(sessionStorage.getItem("te-skip") || "[]")); } catch (e) { /* private mode */ }
    const saveSkip = () => { try { sessionStorage.setItem("te-skip", JSON.stringify([...skipped])); } catch (e) { /* ignore */ } };

    function go(i, instant) {
      i = Math.max(0, Math.min(VIEWS.length - 1, i));
      if (i === cur) return;
      const v = VIEWS[i], c = CAMS[i];
      cur = i;
      from = { ...cam }; to = { ...c };
      const dist = Math.hypot(to.x - from.x, to.y - from.y) * Math.min(from.z, to.z);
      dur = instant || REDUCED ? 1 : 1150 + Math.min(1500, dist * 0.32);
      bump = instant || REDUCED ? 0 : Math.min(0.5, dist / 7000);
      t0 = performance.now(); moving = true;
      requestAnimationFrame(frame);
      applyView(world, v);
      loadAround(rectOf(c)); if (VIEWS[i + 1]) loadAround(rectOf(CAMS[i + 1]));
      if (v.id === "cela") M.play(); else M.stop();
      kicker.classList.add("swap");
      setTimeout(() => { kicker.textContent = v.kicker || ""; kicker.classList.remove("swap"); }, instant ? 0 : 420);
      history.replaceState(null, "", "#" + v.id);
      hudCount.textContent = String(i + 1).padStart(2, "0") + " / " + VIEWS.length;
      hudTitle.textContent = v.label || "";
      bar.style.setProperty("--p", (i + 1) / VIEWS.length);
    }
    function nextIndex(d) {
      let i = cur + d;
      while (i >= 0 && i < VIEWS.length && skipped.has(VIEWS[i].id)) i += d;
      return i >= 0 && i < VIEWS.length ? i : cur;
    }
    const next = () => go(nextIndex(1)), prev = () => go(nextIndex(-1));

    // the rest of the book, printed in the background, a few pictures at a time
    function preloadAll() {
      const queue = $$("img[data-src]", world).filter((im) => !im.getAttribute("src"));
      let busy = 0;
      const pump = () => { while (busy < 3 && queue.length) { const im = queue.shift(); if (im.getAttribute("src")) continue; busy++; im.onload = im.onerror = () => { busy--; pump(); }; load(im); } };
      pump();
    }

    /* ---------------------------------------------------------- overview */
    let ov = null;
    function buildOverview() {
      ov = document.createElement("div");
      ov.className = "overview"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", UI.overview);
      VIEWS.forEach((v, i) => {
        const card = document.createElement("div"); card.className = "ov-card"; card.dataset.i = i;
        const thumb = document.createElement("div"); thumb.className = "ov-thumb";
        thumb.appendChild(snapshot(i));
        const cap = document.createElement("div"); cap.className = "ov-cap";
        cap.innerHTML = `<b>${String(i + 1).padStart(2, "0")}</b><span>${v.label || ""}</span>`;
        const chk = document.createElement("button"); chk.type = "button"; chk.className = "ov-check"; chk.textContent = "✓";
        chk.setAttribute("aria-label", UI.check);
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

    /* ---------------------------------------------------------- controls */
    function fullscreen() { if (document.fullscreenElement) document.exitFullscreen(); else if (root.requestFullscreen) root.requestFullscreen().catch(() => {}); }
    const restart = () => { closeOverview(); go(0); };
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      const a = b.dataset.act;
      if (a === "fullscreen") fullscreen(); else if (a === "restart") restart(); else if (a === "overview") toggleOverview(); else if (a === "lang") I18N.switchLang();
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
    addEventListener("mousemove", () => { document.body.classList.add("show-hud"); clearTimeout(hudTimer); hudTimer = setTimeout(() => document.body.classList.remove("show-hud"), 2200); });
    addEventListener("resize", resize);
    addEventListener("scroll", () => { if (scrollX || scrollY) scrollTo(0, 0); });
    addEventListener("hashchange", () => { const i = VIEWS.findIndex((v) => "#" + v.id === location.hash); if (i >= 0 && i !== cur) go(i); });

    resize();
    const s0 = Math.max(0, VIEWS.findIndex((v) => "#" + v.id === location.hash));
    Object.assign(cam, CAMS[s0]);
    go(s0, true);
    setTimeout(preloadAll, 1800);

    window.deck = { go: (id) => go(typeof id === "number" ? id : VIEWS.findIndex((v) => v.id === id)), next, prev, state: () => ({ view: VIEWS[cur].id }) };
  }
})();

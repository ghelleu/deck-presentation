/* La Tour des Possibles · deck engine
   Navigation by slides and steps, transitions, overview, print, the sky behind the stage,
   and the drawings built in code: the seven chapters as a constellation, the tower,
   the constellation of the tower, the route of the cities, the graph of wishes,
   the receipt screen and the ledger of the test base.
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
  const CHAPTERS = ["Le vœu", "La tour", "Le projet", "La convocation", "La quittance", "La cartographie", "Un mouvement"];
  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
  const STARS = [[1080, 860], [1215, 700], [1372, 772], [1470, 578], [1622, 508], [1702, 338], [1812, 214]];

  function drawChapters(el) {
    const n = +el.dataset.current; // 0: table of contents (all lit), 1..7: current chapter
    const intro = n === 0;
    const vb = intro ? "1000 150 960 800" : "0 0 1920 1080";
    let s = svgEl(1920, 1080, "chapters", vb) +
      `<defs><radialGradient id="starGlow"><stop offset="0" stop-color="#fffdf8" stop-opacity=".95"/><stop offset=".18" stop-color="#ffe6bd" stop-opacity=".45"/><stop offset="1" stop-color="#ffe6bd" stop-opacity="0"/></radialGradient></defs>`;
    for (let i = 0; i < STARS.length - 1; i++) {
      const [x1, y1] = STARS[i], [x2, y2] = STARS[i + 1];
      const done = intro || i < n - 1;
      s += `<path class="ln ${done ? "done" : "future"}" pathLength="1" style="--i:${i}" d="M${x1} ${y1}L${x2} ${y2}"/>`;
    }
    STARS.forEach(([x, y], i) => {
      const now = !intro && i === n - 1, done = intro || i < n - 1;
      if (now) s += `<circle class="halo" cx="${x}" cy="${y}" r="70"/>`;
      s += `<circle class="st ${now ? "now" : done ? "done" : ""}" cx="${x}" cy="${y}" r="${now ? 7 : done ? 4.5 : 3.5}"/>`;
      const label = intro || now ? `${ROMAN[i]} · ${CHAPTERS[i]}` : ROMAN[i];
      const left = i >= 5 && (intro || now);
      s += `<text class="${now ? "now" : ""}" x="${left ? x - 22 : x + 22}" y="${y + 5}" text-anchor="${left ? "end" : "start"}">${label}</text>`;
    });
    el.innerHTML = s + "</svg>";
  }

  /* The tower, front elevation, after the Studio Chaos model (v5) and its annotated axonometry.
     Metres to pixels around a centre line; heights above ground. */
  function towerGeometry(CX, Y0, S) {
    const X = (m) => CX + m * S, Y = (m) => Y0 - m * S;
    return { X, Y, S };
  }

  function drawTower(el) {
    const lit = el.dataset.lit === "1";
    const small = el.classList.contains("small");
    const { X, Y, S } = towerGeometry(1180, 1000, 58);
    let dd = 0;
    const seg = (d, cls = "", dur = 1.0, gap = 120) => { const out = `<path class="d ${cls}" pathLength="1" style="--dd:${dd};--dur:${dur}s" d="${d}"/>`; dd += gap; return out; };
    const ell = (cx, cy, rx, ry, half) => {
      // half: "front" (lower arc), "back" (upper arc) or full
      const l = `${cx - rx} ${cy}`, r = `${cx + rx} ${cy}`;
      if (half === "front") return `M${l}A${rx} ${ry} 0 0 0 ${r}`;
      if (half === "back") return `M${l}A${rx} ${ry} 0 0 1 ${r}`;
      return `M${l}A${rx} ${ry} 0 1 0 ${r}A${rx} ${ry} 0 1 0 ${l}`;
    };
    let s = svgEl(1920, 1080, "tower-svg", small ? "860 60 640 960" : "0 0 1920 1080") +
      `<defs><radialGradient id="globeGlow"><stop offset="0" stop-color="#fffdf8"/><stop offset=".3" stop-color="#ffe6bd" stop-opacity=".8"/><stop offset="1" stop-color="#ffe6bd" stop-opacity="0"/></radialGradient>
       <linearGradient id="upBeam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fffdf8"/><stop offset="1" stop-color="#dce6ff" stop-opacity="0"/></linearGradient></defs>`;

    // ground and base
    s += `<line class="ground" x1="${X(-6.5)}" y1="${Y(0)}" x2="${X(6.5)}" y2="${Y(0)}"/>`;
    s += seg(ell(X(0), Y(0.12), 1.4 * S, 0.28 * S), "", 1.1, 60);
    s += seg(`M${X(-1.4)} ${Y(0.12)}L${X(-1.4)} ${Y(0)}M${X(1.4)} ${Y(0.12)}L${X(1.4)} ${Y(0)}`, "thin", 0.5, 80);
    s += seg(`M${X(1.7)} ${Y(0)}h${0.9 * S}v${-0.32 * S}h${-0.9 * S}z`, "thin", 0.8, 120); // IP66 box
    // mast: three sections of 5 m
    s += seg(`M${X(-0.09)} ${Y(0.12)}L${X(-0.09)} ${Y(14.2)}M${X(0.09)} ${Y(0.12)}L${X(0.09)} ${Y(14.2)}`, "", 2.2, 200);
    s += seg(`M${X(-0.16)} ${Y(5)}h${0.32 * S}M${X(-0.16)} ${Y(10)}h${0.32 * S}`, "thin", 0.4, 160);
    // phone and screen at hand height
    s += seg(`M${X(0.1)} ${Y(1.95)}h${0.42 * S}v${0.32 * S}h${-0.42 * S}z`, "warm", 0.7, 60);
    s += seg(`M${X(0.12)} ${Y(1.45)}h${0.2 * S}v${0.32 * S}h${-0.2 * S}z`, "thin", 0.5, 160);
    // crown: two truss circles of 6 m, 50 cm apart, centred about 4 m above ground
    const rx = 3 * S, ry = 0.42 * S;
    s += seg(ell(X(0), Y(4.25), rx, ry, "back"), "thin", 1.3, 0);
    s += seg(ell(X(0), Y(3.75), rx, ry, "back"), "thin", 1.3, 160);
    s += seg(ell(X(0), Y(4.25), rx, ry, "front"), "", 1.3, 0);
    s += seg(ell(X(0), Y(3.75), rx, ry, "front"), "", 1.3, 160);
    for (const a of [200, 250, 290, 340]) {
      const c = Math.cos((a * Math.PI) / 180), sn = Math.sin((a * Math.PI) / 180);
      s += seg(`M${X(0) + c * rx} ${Y(4.25) - sn * ry}v${0.5 * S}`, "thin", 0.3, 40);
    }
    // LEDs along the front of the crown
    let leds = "";
    for (let k = 0; k <= 46; k++) {
      const a = Math.PI + (k / 46) * Math.PI;
      for (const h of [4.12, 3.88]) leds += `<circle class="led" style="--dd:${dd + k * 18}" cx="${(X(0) + Math.cos(a) * rx).toFixed(1)}" cy="${(Y(h) - Math.sin(a) * ry).toFixed(1)}" r="1.6"/>`;
    }
    s += leds; dd += 300;
    // three modules of reflectors, flaring upward
    const mod = (b) => {
      const t = b + 1.45, wb = 0.16, wt = 0.58;
      let d = `M${X(-wb)} ${Y(b)}L${X(-wt)} ${Y(t)}M${X(wb)} ${Y(b)}L${X(wt)} ${Y(t)}`;
      d += `M${X(-0.22)} ${Y(b + 0.05)}L${X(-0.3)} ${Y(t)}M${X(0.22)} ${Y(b + 0.05)}L${X(0.3)} ${Y(t)}`;
      let out = seg(d, "", 0.9, 0) + seg(ell(X(0), Y(t), wt * S, 0.1 * S), "thin", 0.7, 220);
      for (let k = 0; k < 9; k++) {
        const f = (k + 0.5) / 9, y = Y(b + f * 1.45);
        for (const sx of [-1, 1]) out += `<circle class="led" style="--dd:${dd + k * 40}" cx="${(X(sx * (wb + (wt - wb) * f * 0.9))).toFixed(1)}" cy="${y.toFixed(1)}" r="1.8"/>`;
        out += `<circle class="led" style="--dd:${dd + k * 40}" cx="${X(0)}" cy="${y.toFixed(1)}" r="1.4"/>`;
      }
      return out;
    };
    s += mod(9.35) + mod(10.85) + mod(12.35);
    // globe on top
    s += `<circle class="globe" cx="${X(0)}" cy="${Y(14.55)}" r="${0.9 * S}"/>`;
    s += seg(`M${X(-0.3)} ${Y(14.55)}a${0.3 * S} ${0.3 * S} 0 1 0 ${0.6 * S} 0a${0.3 * S} ${0.3 * S} 0 1 0 ${-0.6 * S} 0`, "warm", 0.8, 200);
    // guy ropes from a single point under the modules to three ballasts, about 4.5 m out
    const lests = [[-4.23, -0.2], [3.45, -0.38], [0.78, 0.6]];
    let ropes = "";
    lests.forEach(([lx, lz]) => (ropes += `M${X(0)} ${Y(9.3)}L${X(lx)} ${Y(lz + 0.35)}`));
    s += seg(ropes, "thin", 1.6, 300);
    const R = rnd(11);
    lests.forEach(([lx, lz]) => {
      const cx = X(lx), cy = Y(lz + 0.2);
      let d = "";
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * TAU, r = (0.45 + R() * 0.18) * S;
        d += `${k ? "L" : "M"}${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r * 0.7).toFixed(1)}`;
      }
      s += `<path class="rock" d="${d}z"/>` + seg(d + "z", "thin", 0.7, 90);
    });
    // light pulse to the sky (closing slide)
    if (lit) s += `<line class="up" x1="${X(0)}" y1="${Y(14.85)}" x2="${X(0)}" y2="${Y(14.85) - 900}" stroke="url(#upBeam)" stroke-width="3" pathLength="1"/>`;

    if (!small) {
      // notes, after the annotated axonometry (step 1 left, step 2 right)
      const note = (step, side, ty, tx, k, lines, ly = ty) => {
        const L = side === "l";
        const x0 = L ? 140 : 1560, xe = L ? 600 : 1520;
        let t = `<g class="note" data-note="${step}"><text class="k" x="${x0}" y="${ly - 14}">${k}</text>`;
        lines.forEach((ln, i) => (t += `<text x="${x0}" y="${ly + 14 + i * 25}">${ln}</text>`));
        t += `<polyline points="${xe},${ly} ${L ? xe + 40 : xe - 40},${ly} ${tx},${ty}"/><circle cx="${tx}" cy="${ty}" r="4"/></g>`;
        return t;
      };
      s += note(1, "l", Y(14.55), X(-0.36), "Sommet", ["Globe lumineux, protégé", "des intempéries"]);
      s += note(1, "l", Y(12), X(-0.45), "Modules lumineux", ["9 réflecteurs à tubes LED,", "150 × 40 cm"]);
      s += note(1, "l", Y(7), X(-0.1), "Structure", ["Mât en inox Ø 16,7 cm,", "trois sections de 5 m"]);
      s += note(1, "l", Y(1.8), X(0.1), "Interface", ["Combiné téléphonique", "et écran des vœux"], Y(2.6));
      s += note(2, "r", Y(9.3), X(0), "Haubanage", ["Accroche unique", "sous les modules"]);
      s += note(2, "r", Y(4.25) + ry, X(2.6), "Couronne", ["Deux cercles en truss Ø 6 m,", "néon flex LED"], Y(5.4));
      s += note(2, "r", Y(0.35), X(3.45) + 18, "Lests", ["Environ 1,8 t chacun,", "à 4,5 m du mât"], Y(2.6));
      s += note(2, "r", Y(0.12), X(1.4), "Base", ["Plateau en bois noir,", "boîtier étanche IP66"], Y(1.1));
      // dimensions (step 3)
      const dx = X(5.6);
      s += `<g class="note dim" data-note="3"><line x1="${dx}" y1="${Y(0)}" x2="${dx}" y2="${Y(14.85)}"/><line x1="${dx - 10}" y1="${Y(0)}" x2="${dx + 10}" y2="${Y(0)}"/><line x1="${dx - 10}" y1="${Y(14.85)}" x2="${dx + 10}" y2="${Y(14.85)}"/><text x="${dx - 14}" y="${Y(7.4)}" text-anchor="end">≈ 15 m</text>
        <line x1="${X(-3)}" y1="${Y(5.1)}" x2="${X(3)}" y2="${Y(5.1)}"/><line x1="${X(-3)}" y1="${Y(5.1) - 9}" x2="${X(-3)}" y2="${Y(5.1) + 9}"/><line x1="${X(3)}" y1="${Y(5.1) - 9}" x2="${X(3)}" y2="${Y(5.1) + 9}"/><text x="${X(-1.2)}" y="${Y(5.1) - 12}" text-anchor="end">Ø 6 m</text>
        <line x1="${X(-3.4)}" y1="${Y(3.75)}" x2="${X(-3.4)}" y2="${Y(0)}"/><text x="${X(-3.55)}" y="${Y(0.9)}" text-anchor="end">≈ 4 m</text></g>`;
    }
    el.innerHTML = s + "</svg>";
  }

  function drawMiniTower(el) {
    el.innerHTML = `<svg viewBox="0 0 120 120" class="tower-svg" xmlns="${SVG}">
      <path class="d" pathLength="1" style="--dd:0" d="M60 112V20"/>
      <path class="d warm" pathLength="1" style="--dd:200" d="M57 20l-7-11h20l-7 11M57 32l-6-11h18l-6 11M57 44l-5-11h16l-5 11"/>
      <path class="d" pathLength="1" style="--dd:400" d="M28 82a32 6 0 1 0 64 0a32 6 0 1 0 -64 0"/>
      <path class="d thin" pathLength="1" style="--dd:600" d="M60 46L18 112M60 46L102 110M60 46L68 116"/>
      <circle class="globe" cx="60" cy="6" r="9"/></svg>`;
  }
  function drawMiniGraph(el) {
    const P = [[20, 80], [42, 30], [64, 62], [88, 22], [100, 74], [58, 104], [30, 50]];
    const E = [[0, 6], [6, 1], [1, 2], [2, 3], [2, 4], [4, 5], [5, 0], [6, 2]];
    let s = `<svg viewBox="0 0 120 120" class="tower-svg" xmlns="${SVG}">`;
    E.forEach(([a, b], i) => (s += `<path class="d thin" pathLength="1" style="--dd:${200 + i * 90}" d="M${P[a]}L${P[b]}"/>`));
    P.forEach(([x, y], i) => (s += `<circle class="led" style="--dd:${i * 70}" cx="${x}" cy="${y}" r="${i === 2 ? 4 : 2.6}"/>`));
    el.innerHTML = s + "</svg>";
  }

  /* The constellation of the tower: the wishes, joined, draw its figure. */
  function drawConstellation(el) {
    const { X, Y } = towerGeometry(960, 830, 44);
    const ring = [];
    for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + 0.2; ring.push([X(Math.cos(a) * 3), Y(4) - Math.sin(a) * 0.5 * 44]); }
    const pts = {
      top: [X(0), Y(14.7)], a: [X(-0.65), Y(13.8)], b: [X(0.65), Y(13.8)], c: [X(-0.5), Y(11.7)], d: [X(0.5), Y(11.7)],
      e: [X(0), Y(9.3)], m: [X(0), Y(6.6)], base: [X(0), Y(0.3)],
      l1: [X(-4.2), Y(-0.2)], l2: [X(3.5), Y(-0.4)], l3: [X(0.8), Y(0.7)],
    };
    ring.forEach((p, i) => (pts["r" + i] = p));
    const lines = [["top", "a"], ["top", "b"], ["a", "c"], ["b", "d"], ["c", "e"], ["d", "e"], ["e", "m"], ["m", "base"],
      ["e", "l1"], ["e", "l2"], ["e", "l3"], ...ring.map((_, i) => ["r" + i, "r" + ((i + 1) % ring.length)])];
    const order = Object.keys(pts);
    let s = `<svg viewBox="0 0 1920 1080" xmlns="${SVG}"><defs><radialGradient id="cGlow"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".25" stop-color="#dce6ff" stop-opacity=".35"/><stop offset="1" stop-color="#dce6ff" stop-opacity="0"/></radialGradient></defs>`;
    lines.forEach(([a, b], i) => (s += `<path class="ln" pathLength="1" style="--dd:${i * 70}" d="M${pts[a]}L${pts[b]}"/>`));
    order.forEach((k, i) => {
      const [x, y] = pts[k], big = k === "top";
      s += `<circle class="gl" style="--dd:${i * 50}" cx="${x}" cy="${y}" r="${big ? 46 : 22}"/><circle class="st" style="--dd:${i * 50}" cx="${x}" cy="${y}" r="${big ? 4.5 : 2.6}"/>`;
    });
    el.innerHTML = s + "</svg>";
  }

  /* Geneva, Lyon, Zaragoza, and further: projected from longitude and latitude. */
  function drawCities(el) {
    const C = [["Genève", 6.14, 46.2], ["Lyon", 4.84, 45.76], ["Saragosse", -0.89, 41.65]];
    const P = C.map(([n, lo, la]) => [n, 60 + (lo + 1.2) * 72, 18 + (46.6 - la) * 34]);
    let s = `<svg viewBox="0 0 640 200" xmlns="${SVG}">`;
    s += `<path class="ln" pathLength="1" style="--dd:300" d="M${P[0][1]} ${P[0][2]}L${P[1][1]} ${P[1][2]}"/>`;
    s += `<path class="ln" pathLength="1" style="--dd:900" d="M${P[1][1]} ${P[1][2]}L${P[2][1]} ${P[2][2]}"/>`;
    s += `<path class="ln dash" pathLength="1" d="M${P[2][1]} ${P[2][2]}Q 330 210 600 170"/>`;
    P.forEach(([n, x, y], i) => {
      s += `<circle class="${i ? "" : "first"}" cx="${x}" cy="${y}" r="${i ? 4 : 6}"/>`;
      const lx = i === 2 ? x + 14 : x - 14, ly = i === 0 ? y - 14 : i === 1 ? y + 28 : y + 5;
      s += `<text x="${lx}" y="${ly}" text-anchor="${i === 2 ? "start" : "end"}">${n}${i === 0 ? " · 2027" : ""}</text>`;
    });
    s += `<text x="604" y="160" text-anchor="end" style="fill:rgba(220,230,255,.32)">d’autres encore</text>`;
    el.innerHTML = s + "</svg>";
  }

  const DRAW = { chapters: drawChapters, tower: drawTower, "mini-tower": drawMiniTower, "mini-graph": drawMiniGraph, constellation: drawConstellation, cities: drawCities };
  $$("[data-draw]").forEach((el) => DRAW[el.dataset.draw] && DRAW[el.dataset.draw](el));

  /* ================================================================ the graph of wishes */
  const THEME_NAMES = { sante_proche: "santé d’un proche", sante_collective: "santé collective", egalite: "égalité", spiritualite: "spiritualité",
    humanite: "humanité", democratie: "démocratie", liberte: "liberté", education: "éducation", ideal_personnel: "idéal personnel",
    recherche_emploi: "recherche d’emploi", avenir_enfants: "avenir des enfants", bonheur_quotidien: "bonheur quotidien", personnel_anodin: "personnel anodin" };
  const themeName = (t) => THEME_NAMES[t] || t.replace(/_/g, " ");
  const GRAPH = (() => {
    const W = window.WISHES;
    if (!W) return null;
    const N = W.nodes.length, T = W.themes.length;
    const count = new Array(T).fill(0);
    W.nodes.forEach((n) => count[n[0]]++);
    // theme centres on a golden-angle spiral, the largest themes nearer the middle
    const rank = [...Array(T).keys()].sort((a, b) => count[b] - count[a]);
    const centre = [];
    rank.forEach((t, i) => { const r = 0.2 + 0.68 * Math.sqrt((i + 0.5) / T), a = i * 2.39996; centre[t] = [Math.cos(a) * r, Math.sin(a) * r]; });
    const R = rnd(42);
    const gauss = () => { let u = 0; for (let k = 0; k < 4; k++) u += R(); return (u - 2) / 0.58; };
    const x = new Float32Array(N), y = new Float32Array(N), sz = new Float32Array(N);
    W.nodes.forEach((n, i) => {
      const t = n[0], sp = 0.018 + 0.0042 * Math.sqrt(count[t]);
      // a flower: most nodes on a disc, some on petals
      const petal = R() < 0.35, a = R() * TAU;
      const rr = petal ? sp * (1.4 + R() * 0.6) : Math.abs(gauss()) * sp * 0.75;
      x[i] = centre[t][0] + Math.cos(a) * rr; y[i] = centre[t][1] + Math.sin(a) * rr;
      sz[i] = 0.7 + R() * 0.9;
    });
    const order = [...Array(N).keys()];
    for (let i = N - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const rankOf = new Int32Array(N); order.forEach((n, k) => (rankOf[n] = k));
    const textIds = Object.keys(W.texts).map(Number);
    return { W, N, T, x, y, sz, centre, count, order, rankOf, textIds };
  })();

  function graphWidget(canvas) {
    const G = GRAPH;
    if (!G) return null;
    const full = canvas.dataset.mode === "full";
    const slide = canvas.closest(".slide");
    const float = slide && slide.querySelector(".wish-float");
    let raf = 0, t0 = 0, base = null, hl = -1, hlT = 0, w = 0, h = 0, k = 1, cx = 0, cy = 0, R = 0;

    function size() {
      w = canvas.offsetWidth; h = canvas.offsetHeight;
      k = Math.min(2, (window.devicePixelRatio || 1) * Math.max(0.5, parseFloat(getComputedStyle(root).getPropertyValue("--scale")) || 1));
      canvas.width = Math.round(w * k); canvas.height = Math.round(h * k);
      cx = w / 2; cy = h / 2; R = Math.min(w, h) * (full ? 0.47 : 0.48);
    }
    const px = (i) => cx + G.x[i] * R, py = (i) => cy + G.y[i] * R;

    function paint(ctx, upto) {
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = full ? "rgba(220,230,255,0.075)" : "rgba(220,230,255,0.09)";
      ctx.beginPath();
      for (let r = 0; r < upto; r++) {
        const i = G.order[r], n = G.W.nodes[i];
        for (let q = 1; q < n.length; q++) { const j = n[q]; if (G.rankOf[j] < upto) { ctx.moveTo(px(i), py(i)); ctx.lineTo(px(j), py(j)); } }
      }
      ctx.stroke();
      ctx.fillStyle = "#dce6ff";
      for (let r = 0; r < upto; r++) {
        const i = G.order[r];
        ctx.globalAlpha = 0.45 + G.sz[i] * 0.3;
        ctx.beginPath(); ctx.arc(px(i), py(i), G.sz[i] * (full ? 1.15 : 1), 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (full && upto >= G.N) {
        ctx.font = "500 12px 'Plex Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255,230,189,0.75)";
        G.centre.forEach(([ux, uy], t) => {
          const label = themeName(G.W.themes[t]).toUpperCase().split("").join("\u200A");
          ctx.fillText(label, cx + ux * R, cy + uy * R - (0.03 + 0.0042 * Math.sqrt(G.count[t])) * R - 6);
        });
      }
    }

    function highlight(ctx, i, a) {
      const n = G.W.nodes[i];
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.globalAlpha = a;
      ctx.strokeStyle = "#ffe6bd"; ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let q = 1; q < n.length; q++) { ctx.moveTo(px(i), py(i)); ctx.lineTo(px(n[q]), py(n[q])); }
      ctx.stroke();
      ctx.fillStyle = "#fffdf8";
      for (let q = 1; q < n.length; q++) { ctx.beginPath(); ctx.arc(px(n[q]), py(n[q]), 2.6, 0, TAU); ctx.fill(); }
      const g = ctx.createRadialGradient(px(i), py(i), 0, px(i), py(i), 26);
      g.addColorStop(0, "rgba(255,253,248,1)"); g.addColorStop(0.25, "rgba(255,230,189,.5)"); g.addColorStop(1, "rgba(255,230,189,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px(i), py(i), 26, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }

    function showWish(i) {
      if (!float) return;
      $$("p.on", float).forEach((p) => { p.classList.remove("on"); setTimeout(() => p.remove(), 1300); });
      const p = document.createElement("p");
      p.textContent = "« " + G.W.texts[i] + " »";
      p.style.left = px(i) + canvas.offsetLeft + "px";
      p.style.top = py(i) + canvas.offsetTop + "px";
      float.appendChild(p);
      requestAnimationFrame(() => p.classList.add("on"));
    }

    function pick() {
      // a wish with a text, away from the edges of the frame
      for (let tries = 0; tries < 30; tries++) {
        const i = G.textIds[Math.floor(Math.random() * G.textIds.length)];
        if (Math.abs(px(i) - cx) < w * 0.33 && Math.abs(py(i) - cy) < h * 0.38) return i;
      }
      return G.textIds[0];
    }

    function frame(now) {
      const ctx = canvas.getContext("2d");
      const p = REDUCED ? 1 : ease((now - t0) / (full ? 5200 : 6500));
      const upto = Math.round(G.N * p);
      if (p < 1) { paint(ctx, upto); raf = requestAnimationFrame(frame); return; }
      if (!base) {
        paint(ctx, G.N);
        base = document.createElement("canvas"); base.width = canvas.width; base.height = canvas.height;
        base.getContext("2d").drawImage(canvas, 0, 0);
        hlT = now;
      }
      // after the growth: one wish at a time lights up with its three neighbours
      const cycle = 3200, ph = (now - hlT) % cycle, idx = Math.floor((now - hlT) / cycle);
      if (idx !== hl) { hl = idx; canvas._hl = pick(); if (full) showWish(canvas._hl); }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(base, 0, 0);
      const a = Math.min(1, ph / 500, (cycle - ph) / 500);
      highlight(ctx, canvas._hl, a);
      raf = requestAnimationFrame(frame);
    }

    return {
      start() { this.stop(); size(); base = null; hl = -1; t0 = performance.now() + 500; if (float) float.innerHTML = ""; raf = requestAnimationFrame(frame); },
      stop() { cancelAnimationFrame(raf); raf = 0; if (float) $$("p", float).forEach((p) => p.classList.remove("on")); },
      final() { size(); paint(canvas.getContext("2d"), G.N); },
    };
  }

  /* ================================================================ the receipt screen */
  function receiptWidget(screen) {
    const typed = $$("[data-type]", screen).map((el) => ({ el, html: el.innerHTML, text: el.textContent }));
    const count = $("[data-count]"), code = $("[data-scramble]");
    function $(s) { return screen.querySelector(s); }
    let timers = [];
    const later = (f, ms) => timers.push(setTimeout(f, ms));
    function clear() { timers.forEach(clearTimeout); timers = []; }
    function type(item, delay, speed) {
      const caret = '<span class="caret"></span>';
      item.el.innerHTML = "";
      for (let c = 1; c <= item.text.length; c++) later(() => (item.el.innerHTML = escape(item.text.slice(0, c)) + caret), delay + c * speed);
      later(() => (item.el.innerHTML = item.html), delay + item.text.length * speed + 300);
      return delay + item.text.length * speed + 300;
    }
    const escape = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
    const CH = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
    return {
      start() {
        clear();
        typed.forEach((t) => (t.el.innerHTML = ""));
        count.textContent = "——————"; code.textContent = "————";
        let t = type(typed[0], 1200, REDUCED ? 0 : 14);
        t = type(typed[1], t + 200, REDUCED ? 0 : 20);
        const target = count.dataset.count, word = code.dataset.scramble;
        for (let f = 0; f <= 24; f++) later(() => {
          count.textContent = f === 24 ? target : String(Math.floor(100000 + Math.random() * 899999));
          code.textContent = f === 24 ? word : word.split("").map((ch, i) => (f > 12 + i * 3 ? ch : CH[Math.floor(Math.random() * CH.length)])).join("");
        }, t + 200 + f * 45);
      },
      stop() { clear(); },
      final() { clear(); typed.forEach((t) => (t.el.innerHTML = t.html)); count.textContent = count.dataset.count; code.textContent = code.dataset.scramble; },
    };
  }

  /* ================================================================ the ledger of the test base */
  function ledgerWidget(table) {
    const rows = (window.WISHES && window.WISHES.rows) || [];
    let timers = [];
    const row = (r, anim) => {
      const d = document.createElement("div");
      d.className = "tr" + (anim ? " new" : "");
      d.setAttribute("role", "row");
      d.innerHTML = `<span>${r[0]}</span><span>${r[1]}</span><span>${r[2]}</span><span class="tx">${r[3].replace(/</g, "&lt;")}</span><span class="th-tag">${themeName(r[4])}</span>`;
      table.appendChild(d);
    };
    const reset = () => { timers.forEach(clearTimeout); timers = []; $$(".tr:not(.th)", table).forEach((r) => r.remove()); };
    return {
      start() { reset(); rows.forEach((r, i) => timers.push(setTimeout(() => row(r, true), 700 + i * (REDUCED ? 0 : 170)))); },
      stop() { timers.forEach(clearTimeout); timers = []; },
      final() { reset(); rows.forEach((r) => row(r, false)); },
    };
  }

  const WIDGETS = { graph: graphWidget, receipt: receiptWidget, ledger: ledgerWidget };
  function bindWidgets(scope) {
    return $$("[data-widget]", scope).map((el) => (el._w = WIDGETS[el.dataset.widget] && WIDGETS[el.dataset.widget](el))).filter(Boolean);
  }
  const widgetsOf = new Map();
  slides.forEach((s) => widgetsOf.set(s, bindWidgets(s)));

  /* ================================================================ the sky */
  const sky = (() => {
    const cv = document.getElementById("sky");
    const ctx = cv.getContext("2d", { alpha: false });
    const COLORS = ["#DCE6FF", "#E8EEFF", "#FFFFFF"];
    let W = 0, H = 0, dpr = 1, stars = [], ox = 0, tx = 0, raf = 0;
    let px = -1e4, py = -1e4, lastMove = -1e9;
    function seed() {
      const R = rnd(7), n = Math.max(160, Math.min(420, Math.round((W * H) / 7000)));
      stars = Array.from({ length: n }, () => {
        const u = R(), d = u < 0.55 ? 0 : u < 0.85 ? 1 : 2;
        return { x: R() * W, y: R() * H, d, r: [0.5, 0.85, 1.3][d] + R() * 0.35, a: [0.35, 0.55, 0.75][d] + R() * 0.2, ph: R() * TAU, om: TAU / (3 + R() * 5) };
      });
    }
    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = innerWidth; H = innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }
    function draw(now) {
      const t = now / 1000;
      ox += (tx - ox) * 0.035;
      const g = ctx.createRadialGradient(W * 0.7, H * 0.05, 0, W * 0.7, H * 0.05, Math.max(W, H));
      g.addColorStop(0, "#0e1119"); g.addColorStop(0.7, "#07080a");
      ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const live = now - lastMove < 1600 ? 1 - Math.max(0, (now - lastMove - 800) / 800) : 0;
      const lit = [];
      for (const s of stars) {
        const par = [0.25, 0.55, 1][s.d];
        let x = (s.x - ox * par) % W; if (x < 0) x += W;
        let a = s.a * (REDUCED ? 1 : 0.7 + 0.3 * Math.sin(t * s.om + s.ph)), r = s.r;
        if (live > 0) {
          const dx = x - px, dy = s.y - py, d = Math.hypot(dx, dy);
          if (d < 240) { const f = (1 - d / 240) ** 1.5 * live; a += (1 - a) * f; r *= 1 + f; lit.push([x, s.y, f]); }
        }
        ctx.globalAlpha = a; ctx.fillStyle = COLORS[s.d];
        ctx.beginPath(); ctx.arc(x, s.y, r, 0, TAU); ctx.fill();
      }
      if (lit.length) {
        ctx.strokeStyle = "#DCE6FF"; ctx.lineWidth = 0.7;
        for (let i = 0; i < lit.length; i++) for (let j = i + 1; j < lit.length; j++) {
          const [x1, y1, f1] = lit[i], [x2, y2, f2] = lit[j], d = Math.hypot(x1 - x2, y1 - y2);
          if (d < 130) { ctx.globalAlpha = 0.18 * Math.min(f1, f2) * (1 - d / 130) * 3; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
        }
      }
      raf = requestAnimationFrame(draw);
    }
    addEventListener("resize", resize);
    addEventListener("pointermove", (e) => { px = e.clientX; py = e.clientY; lastMove = performance.now(); });
    return {
      start() { resize(); cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); },
      drift(d) { tx += d * 60; },
    };
  })();

  /* A still sky as an image, behind thumbnails and printed pages. */
  function stillSky() {
    const c = document.createElement("canvas"); c.width = 1920; c.height = 1080;
    const x = c.getContext("2d"), R = rnd(3);
    const g = x.createRadialGradient(1340, 60, 0, 1340, 60, 1900);
    g.addColorStop(0, "#0e1119"); g.addColorStop(0.7, "#07080a");
    x.fillStyle = g; x.fillRect(0, 0, 1920, 1080);
    for (let i = 0; i < 300; i++) { x.globalAlpha = 0.25 + R() * 0.6; x.fillStyle = "#dce6ff"; x.beginPath(); x.arc(R() * 1920, R() * 1080, 0.5 + R() * 1.2, 0, TAU); x.fill(); }
    return c.toDataURL("image/jpeg", 0.85);
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
    const bg = stillSky();
    slides.forEach((s) => {
      s.style.backgroundImage = `url(${bg})`; s.style.backgroundSize = "cover";
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
      sky.drift(dir * (slides[i].dataset.transition === "warp" ? 3 : 1));
    }
    cur = i; step = st;
    const s = slides[i];
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
  let ov = null, bgThumb = null;
  function buildOverview() {
    ov = document.createElement("div");
    ov.className = "overview";
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-label", "Toutes les slides");
    bgThumb = bgThumb || stillSky();
    slides.forEach((s, i) => {
      const card = document.createElement("div");
      card.className = "ov-card";
      card.dataset.i = i;
      const thumb = document.createElement("div");
      thumb.className = "ov-thumb";
      thumb.style.backgroundImage = `url(${bgThumb})`; thumb.style.backgroundSize = "cover";
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
    if (!ov._drawn) { ov._drawn = true; $$(".ov-thumb", ov).forEach((t) => bindWidgets(t).forEach((w) => w.final())); }
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
  sky.start();
  const startAt = Math.max(0, slides.findIndex((s) => "#" + s.id === location.hash));
  go(startAt, 0, 1);

  window.deck = { go: (id, st = 0) => go(typeof id === "number" ? id : slides.findIndex((s) => s.id === id), st), next, prev, state: () => ({ slide: slides[cur].id, step }), reduced: REDUCED };
})();

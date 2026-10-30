/* A Century of Exchange · slide engine. No dependencies.
   Adapted from the Bixler's direction-deck engine (same architecture and motion grammar):
   one 1920 × 1080 stage scaled by --scale, slides that declare their behaviour in
   data attributes, steps revealed on the spot, a horizontal pan by default.

   Slide attributes
     id                  URL anchor (#niton-1927)
     data-transition     pan (default) · fade · dissolve · iris · clock · none
     data-steps          clicks spent inside the slide before moving on
     data-kind           film · act · annex · chapter
     data-t-label        content key for the contents label (sets data-label)
   Inside a slide
     [data-step="n"]     .on from step n, .at at step n, .past after n
     [data-only="n m"]   .on at those steps only
     [data-depth="x"]    pan layer: positive travels further, negative lags
     [data-reveal]       opens with a clip-path as the slide pans in
     [data-t="key"]      text from content/<lang>.json · [data-t-alt] for alt text
     [data-notes="key"]  presenter notes (array of paragraphs)
     [data-arb="key"]    hidden unless DECK_CONFIG.ARBITRATION; data-arb-alt="key" replaces instead
     img[data-src]       loaded for the current and the next slide only            */
(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  const stage = $("#stage");
  const ALL = $$(".slide", stage);
  const CFG = Object.assign({ ARBITRATION: false, LANG: "fr", LANGS: ["fr"] }, window.DECK_CONFIG);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pad = (n) => String(n).padStart(2, "0");
  const f1 = (n) => (+n).toFixed(1);
  const E = "cubic-bezier(.22,.61,.36,1)"; // --ease
  const IO = "cubic-bezier(.65,0,.35,1)";

  let T = {}; // current content

  /* ======================================================== Content */

  function lookup(key) {
    return key.split(".").reduce((o, k) => (o == null ? o : o[k]), T);
  }
  function fill(lang) {
    root.lang = lang;
    if (T.meta && T.meta.title) document.title = T.meta.title;
    $$("[data-t]").forEach((el) => {
      const v = lookup(el.dataset.t);
      if (typeof v === "string") el.textContent = v;
    });
    $$("[data-t-alt]").forEach((el) => {
      const v = lookup(el.dataset.tAlt);
      if (typeof v === "string") el.alt = v;
    });
    $$("[data-t-aria]").forEach((el) => {
      const v = lookup(el.dataset.tAria);
      if (typeof v === "string") el.setAttribute("aria-label", v);
    });
    $$("[data-notes]").forEach((el) => {
      const v = lookup(el.dataset.notes) || [];
      el.replaceChildren(
        ...[].concat(v).map((p) => Object.assign(document.createElement("p"), { textContent: p })),
      );
    });
    renderLists();
    ALL.forEach((s) => {
      const v = s.dataset.tLabel && lookup(s.dataset.tLabel);
      if (v) s.dataset.label = v;
      if (!s.dataset.label) s.dataset.label = s.id;
    });
    renderHelp();
    renderControls(lang);
  }
  /* Tables and timelines built from an array of rows in the content file:
       <ol data-list="key" data-cls="label accent num|fact|label num" data-rowsteps="0 0 1 1">
     Each row becomes an <li>, each cell a <span> with the matching class (the last class
     repeats). data-rowsteps gives each row its step; a row whose first cell starts with "*"
     is marked .hl (the star is dropped). */
  function renderLists() {
    $$("[data-list]").forEach((el) => {
      const rows = lookup(el.dataset.list) || [];
      const cls = (el.dataset.cls || "label accent num|fact").split("|");
      const steps = stepsOf(el.dataset.rowsteps);
      el.replaceChildren(
        ...rows.map((row, i) => {
          const li = document.createElement("li");
          if ("num" in el.dataset) {
            const n = document.createElement("span");
            n.className = "label accent num";
            n.textContent = `[${i + 1}]`;
            li.append(n);
          }
          [].concat(row).forEach((cell, j) => {
            let t = String(cell);
            if (j === 0 && t.startsWith("*")) {
              li.classList.add("hl");
              t = t.slice(1);
            }
            const span = document.createElement("span");
            span.className = cls[Math.min(j, cls.length - 1)];
            span.textContent = t;
            li.append(span);
          });
          if (el.dataset.rowsteps) li.dataset.step = steps[Math.min(i, steps.length - 1)];
          return li;
        }),
      );
    });
  }
  function renderHelp() {
    $("#help").replaceChildren(
      ...((T.meta && T.meta.help) || []).map(([k, v]) => {
        const row = document.createElement("div");
        const kbd = document.createElement("kbd");
        kbd.textContent = k;
        row.append(kbd, v);
        return row;
      }),
    );
  }

  // Toolbar tooltips, the PDF of the current language, the annex contents, the tick bar.
  function renderControls(lang) {
    $$(".hud [aria-label]").forEach((el) => (el.title = el.getAttribute("aria-label")));
    const pdf = $('.hud [data-act="pdf"]');
    pdf.setAttribute("href", `export/als-geneve-2027-${lang}.pdf`);
    pdf.setAttribute("download", (T.meta.hud && T.meta.hud.pdfFile) || "deck.pdf");
    if (CFG.LANGS.length < 2) $('.hud [data-act="lang"]').hidden = true;
    const list = $("#annexes .ax-list");
    if (list)
      list.replaceChildren(
        ...ALL.filter((s) => s.dataset.kind === "annex").map((s) => {
          const [no, ...rest] = s.dataset.label.split(" · ");
          const li = document.createElement("li");
          const b = document.createElement("button");
          b.type = "button";
          b.dataset.go = s.id;
          const n = Object.assign(document.createElement("span"), { className: "label accent num", textContent: no });
          const t = Object.assign(document.createElement("span"), { className: "ax-t", textContent: rest.join(" · ") });
          b.append(n, t);
          li.append(b);
          return li;
        }),
      );
    marks();
  }

  // Sensitive statements: hidden or rephrased until the Maison has decided (config.js).
  function arbitrate() {
    $$("[data-arb]").forEach((el) => {
      if (CFG.ARBITRATION) return;
      const alt = el.dataset.arbAlt && lookup(el.dataset.arbAlt);
      if (typeof alt === "string") el.textContent = alt;
      else {
        el.style.display = "none"; // works for HTML and SVG alike
        el.dataset.arbOff = "";
      }
    });
    root.dataset.arbitration = CFG.ARBITRATION ? "on" : "off";
    countSteps(); // a hidden statement must not cost a click
  }

  async function loadContent() {
    const q = new URLSearchParams(location.search).get("lang");
    const lang = CFG.LANGS.includes(q) ? q : CFG.LANG;
    const res = await fetch(`content/${lang}.json`, { cache: "no-cache" });
    T = await res.json();
    fill(lang);
    arbitrate();
  }

  /* ======================================================== Images: current and next slide only */

  function loadImages(slide) {
    if (!slide) return;
    $$("img[data-src]", slide).forEach((img) => {
      if (img.dataset.srcset) img.srcset = img.dataset.srcset;
      img.src = img.dataset.src;
      img.removeAttribute("data-src");
    });
  }
  /* Print: every slide at its last step, every image loaded, no motion.
     [data-print="show"|"hide"] in the markup overrides a step for paper (styles.css). */
  function preparePrint() {
    ALL.forEach((s) => {
      loadImages(s);
      s.classList.add("snap");
      applyStep(s, s._steps);
    });
  }
  function restoreScreen() {
    ALL.forEach((s) => {
      if (s !== state.list[state.i]) applyStep(s, 0);
      s.classList.remove("snap");
    });
    applyStep(state.list[state.i], state.step);
  }
  addEventListener("beforeprint", preparePrint);
  addEventListener("afterprint", restoreScreen);
  const PRINT_MODE = new URLSearchParams(location.search).has("print"); // ?print, for headless PDF export

  /* ======================================================== Line drawings (built here, never imported) */

  /* ---------------------------------------------------- Act dial, in the manner of a Lange 1
     800 × 800. Off-centre hours dial (left), overlapping small seconds (below), power reserve
     AUF / AB (right), outsize date (top right). The date shows the act number:
     01, 02, 03; on arrival its units disc jumps digit by digit. No wordmark on the dial:
     the brief forbids redrawing the house's logotype. */
  const ACT = {
    1: { date: 1, h: 10, pr: -40 }, // the big date shows the act number
    2: { date: 2, h: 11, pr: -6 },
    3: { date: 3, h: 12, pr: 28 },
    4: { date: 4, h: 13, pr: 46 },
  };
  const ACT_BEFORE = { date: 0, h: 9, pr: -50 }; // what the dial shows just before act I
  const ACT_MIN = 8; // a quiet 10:08, 11:08, 12:08
  const DIAL = { M: [290, 420], rm: 200, S: [474, 604], rs: 104, P: [566, 440], D: { x: 470, y: 168, w: 80, h: 98, gap: 10 } };
  const angH = (h) => ((h % 12) + ACT_MIN / 60) * 30;
  const angM = () => ACT_MIN * 6;

  // Lance-shaped hand pointing up from its pivot at (0, 0).
  const lance = (len, w) =>
    `M-2.4 22 L-2.4 ${f1(-len * 0.5)} L${-w} ${f1(-len * 0.7)} L0 ${-len} L${w} ${f1(-len * 0.7)} L2.4 ${f1(-len * 0.5)} L2.4 22 Z`;

  function dial(actNo) {
    const st = ACT[actNo] || ACT[1];
    const [mx, my] = DIAL.M,
      [sx, sy] = DIAL.S,
      [px, py] = DIAL.P,
      rm = DIAL.rm,
      rs = DIAL.rs,
      D = DIAL.D;
    const o = (ms) => `pathLength="1" style="--dd:${ms}"`;
    const seg = (cx, cy, r1, r2, a) => {
      const [x1, y1] = polar(cx, cy, r1, a),
        [x2, y2] = polar(cx, cy, r2, a);
      return `M${f1(x1)} ${f1(y1)} L${f1(x2)} ${f1(y2)}`;
    };

    // Hours dial: minute track, Roman numerals at the quarters (set radially), lozenges between.
    let fine = "",
      bold = "";
    for (let i = 0; i < 60; i++) {
      const a = (i * Math.PI) / 30;
      if (i % 5) fine += seg(mx, my, rm - 12, rm - 3, a) + " ";
      else bold += seg(mx, my, rm - 20, rm - 3, a) + " ";
    }
    const romans = [["XII", 0], ["III", 90], ["VI", 180], ["IX", 270]]
      .map(([t, deg]) => {
        const [x, y] = polar(mx, my, rm - 52, (deg * Math.PI) / 180);
        return `<text class="rn" x="${f1(x)}" y="${f1(y)}" text-anchor="middle" dominant-baseline="central" transform="rotate(${deg} ${f1(x)} ${f1(y)})">${t}</text>`;
      })
      .join("");
    let lozenges = "";
    for (let hr = 1; hr < 12; hr++) {
      if (hr % 3 === 0) continue;
      const [x, y] = polar(mx, my, rm - 50, (hr * Math.PI) / 6);
      lozenges += `<path class="s" transform="rotate(${hr * 30} ${f1(x)} ${f1(y)})" d="M${f1(x)} ${f1(y - 11)} L${f1(x + 4.5)} ${f1(y)} L${f1(x)} ${f1(y + 11)} L${f1(x - 4.5)} ${f1(y)} Z" style="stroke-width:1.1"/>`;
    }

    // Small seconds, drawn over the hours dial as on the watch.
    let sFine = "",
      sFive = "",
      sQuarter = "";
    for (let i = 0; i < 60; i++) {
      const a = (i * Math.PI) / 30;
      if (i % 15 === 0) sQuarter += seg(sx, sy, rs - 22, rs - 3, a) + " ";
      else if (i % 5 === 0) sFive += seg(sx, sy, rs - 15, rs - 3, a) + " ";
      else sFine += seg(sx, sy, rs - 10, rs - 3, a) + " ";
    }

    // Power reserve: five triangles from AUF (top) to AB (bottom); 0° points right.
    const prAt = (deg, r) => [px + r * Math.cos((deg * Math.PI) / 180), py + r * Math.sin((deg * Math.PI) / 180)];
    let prMarks = "";
    for (const deg of [-50, -25, 0, 25, 50]) {
      const [x, y] = prAt(deg, 132);
      // small filled triangles pointing back towards the hand
      prMarks += `<path class="f" transform="rotate(${deg} ${f1(x)} ${f1(y)})" d="M${f1(x + 6)} ${f1(y - 6)} L${f1(x - 6)} ${f1(y)} L${f1(x + 6)} ${f1(y + 6)} Z"/>`;
    }
    const [aufX, aufY] = prAt(-66, 138),
      [abX, abY] = prAt(66, 138);

    // Outsize date: tens on the cross (left window), units on the disc (right window).
    const id = `dw${uid++}`,
      tx = D.x,
      ux = D.x + D.w + D.gap;
    let strip = "";
    for (let d = 0; d <= 10; d++)
      strip += `<text class="dg" x="${ux + D.w / 2}" y="${D.y + D.h / 2 + d * D.h}" text-anchor="middle" dominant-baseline="central">${d % 10}</text>`;

    const hand = (cls, cx, cy, deg, inner, extra = "") =>
      `<g class="rot ${cls}" ${extra} style="transform-origin:${cx}px ${cy}px;transform:rotate(${f1(deg)}deg)"><g transform="translate(${cx} ${cy})">${inner}</g></g>`;

    return `<svg viewBox="0 0 800 800">
      <circle class="s d" ${o(0)} cx="400" cy="400" r="372" style="stroke-width:1.8"/>
      <circle class="t" cx="400" cy="400" r="356"/>

      <circle class="s d" ${o(150)} cx="${mx}" cy="${my}" r="${rm}"/>
      <path class="t d" ${o(250)} d="${fine}"/>
      <path class="s d" ${o(300)} d="${bold}" style="stroke-width:2.2"/>
      <g class="late" style="--cd:900">${romans}${lozenges}</g>

      <circle class="paperfill" cx="${sx}" cy="${sy}" r="${rs + 8}"/>
      <circle class="s d" ${o(400)} cx="${sx}" cy="${sy}" r="${rs}"/>
      <path class="t d" ${o(480)} d="${sFine}"/>
      <path class="s d" ${o(500)} d="${sFive}" style="stroke-width:1.4"/>
      <path class="s d" ${o(520)} d="${sQuarter}" style="stroke-width:3.2"/>

      <g class="late" style="--cd:1000">${prMarks}
        <text class="pr" x="${f1(aufX)}" y="${f1(aufY)}" text-anchor="middle" dominant-baseline="central" transform="rotate(24 ${f1(aufX)} ${f1(aufY)})">AUF</text>
        <text class="pr" x="${f1(abX)}" y="${f1(abY)}" text-anchor="middle" dominant-baseline="central" transform="rotate(-24 ${f1(abX)} ${f1(abY)})">AB</text>
      </g>

      <clipPath id="${id}t"><rect x="${tx}" y="${D.y}" width="${D.w}" height="${D.h}"/></clipPath>
      <clipPath id="${id}u"><rect x="${ux}" y="${D.y}" width="${D.w}" height="${D.h}"/></clipPath>
      <rect class="s d" ${o(600)} x="${tx - 9}" y="${D.y - 9}" width="${2 * D.w + D.gap + 18}" height="${D.h + 18}" style="stroke-width:1.4"/>
      <rect class="s d" ${o(650)} x="${tx}" y="${D.y}" width="${D.w}" height="${D.h}"/>
      <rect class="s d" ${o(700)} x="${ux}" y="${D.y}" width="${D.w}" height="${D.h}"/>
      <g class="late" style="--cd:1000">
        <g clip-path="url(#${id}t)"><text class="dg" x="${tx + D.w / 2}" y="${D.y + D.h / 2}" text-anchor="middle" dominant-baseline="central">0</text></g>
        <g clip-path="url(#${id}u)"><g class="strip" style="transform:translateY(${-st.date * D.h}px)">${strip}</g></g>
      </g>

      <g class="late hands" style="--cd:1100">
        ${hand("pr-hand", px, py, 90 + st.pr, `<path class="s hf" d="${lance(110, 5)}"/><circle class="s hf" r="7"/>`)}
        ${hand("sh", sx, sy, 0, `<path class="s" d="M0 18 L0 -92" style="stroke-width:1.3"/><path class="s hf" d="M0 -76 L4.5 -64 L0 -52 L-4.5 -64 Z"/><circle class="s hf" r="5"/>`)}
        ${hand("hh", mx, my, angH(st.h), `<path class="s hf" d="${lance(120, 9)}"/>`)}
        ${hand("mh", mx, my, angM(), `<path class="s hf" d="${lance(180, 7.5)}"/>`)}
        <circle class="s hf" cx="${mx}" cy="${my}" r="11"/><circle class="f" cx="${mx}" cy="${my}" r="3.5"/>
      </g>
    </svg>`;
  }

  // 1927 → 2027, the reciprocity trace, 1664 × 300. Two cities, two lines: each leaves its
  // city, crosses the other once and arrives on the other side. Drawn in one pass, no loop.
  // The labels are content keys, filled with the rest of the text.
  function trace(el) {
    const k = el.dataset.keys; // prefix of the label keys in content/<lang>.json
    const x0 = 230,
      x1 = 1434,
      yT = 52,
      yB = 248,
      mid = (x0 + x1) / 2;
    const curve = (ya, yb) => `M${x0} ${ya} C${mid - 160} ${ya}, ${mid + 160} ${yb}, ${x1} ${yb}`;
    const city = (x, y, anchor, key) =>
      `<text class="lbl city" x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="central" data-t="${k}.${key}"></text>`;
    return `<svg viewBox="0 0 1664 300">
      <path class="s d" pathLength="1" style="--dd:0" d="${curve(yT, yB)}"/>
      <path class="s d" pathLength="1" style="--dd:0" d="${curve(yB, yT)}"/>
      <path class="s a" d="M${x0} ${yT - 10} V${yT + 10} M${x0} ${yB - 10} V${yB + 10} M${x1} ${yT - 10} V${yT + 10} M${x1} ${yB - 10} V${yB + 10}" style="stroke-width:1"/>
      <circle class="f fa cross" cx="${mid}" cy="${(yT + yB) / 2}" r="5"/>
      ${city(x0 - 28, yT, "end", "fromTop")}${city(x0 - 28, yB, "end", "fromBottom")}
      ${city(x1 + 28, yT, "start", "toTop")}${city(x1 + 28, yB, "start", "toBottom")}
      <text class="lbl cur" x="${x0}" y="${yB + 46}" text-anchor="middle">1927</text>
      <text class="lbl cur" x="${x1}" y="${yB + 46}" text-anchor="middle">2027</text>
    </svg>`;
  }

  /* ---------------------------------------------------- Calibre drawings: shared parts
     Everything is an interpretive diagram. Strokes that build the drawing carry .d and a
     --dd delay ordered from the most structural (plate) to the finest (jewels, screws). */

  let uid = 0;
  const polar = (cx, cy, r, a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  const path = (pts, close = true) =>
    pts.map((p, i) => (i ? "L" : "M") + f1(p[0]) + " " + f1(p[1])).join(" ") + (close ? " Z" : "");
  const dd = (ms) => `pathLength="1" style="--dd:${ms}"`;

  // Barrel-shaped plate: flat-ish top and bottom, convex sides.
  function tonneauPath(cx, cy, hwTop, hwMid, hh) {
    const c = 2 * hwMid - hwTop;
    return `M${cx - hwTop} ${cy - hh} Q${cx} ${cy - hh - 14} ${cx + hwTop} ${cy - hh} Q${cx + c} ${cy} ${cx + hwTop} ${cy + hh} Q${cx} ${cy + hh + 14} ${cx - hwTop} ${cy + hh} Q${cx - c} ${cy} ${cx - hwTop} ${cy - hh} Z`;
  }
  // Wheel with square-ish teeth.
  function gear(cx, cy, r, n, h) {
    const pts = [],
      w = (2 * Math.PI) / n;
    for (let k = 0; k < n; k++) {
      const a = k * w;
      pts.push(polar(cx, cy, r, a), polar(cx, cy, r + h, a + 0.15 * w), polar(cx, cy, r + h, a + 0.5 * w), polar(cx, cy, r, a + 0.65 * w));
    }
    return path(pts);
  }
  // Ratchet: saw teeth.
  function ratchet(cx, cy, r, n, h) {
    const pts = [],
      w = (2 * Math.PI) / n;
    for (let k = 0; k < n; k++) pts.push(polar(cx, cy, r + h, k * w), polar(cx, cy, r, (k + 0.9) * w));
    return path(pts);
  }
  // Breguet hairspring: an Archimedean spiral with a raised end curve.
  function spiral(cx, cy, r0, r1, turns) {
    const pts = [],
      T = turns * 2 * Math.PI;
    for (let t = 0; t <= T; t += 0.18) pts.push(polar(cx, cy, r0 + ((r1 - r0) * t) / T, t));
    const [ex, ey] = pts[pts.length - 1];
    return path(pts, false) + ` Q${f1(ex + r1 * 0.5)} ${f1(ey - r1 * 0.9)} ${f1(cx + 4)} ${f1(cy - r1 * 0.55)}`;
  }
  function arc(cx, cy, r, a1, a2) {
    const [x1, y1] = polar(cx, cy, r, a1),
      [x2, y2] = polar(cx, cy, r, a2);
    return `M${f1(x1)} ${f1(y1)} A${r} ${r} 0 ${a2 - a1 > Math.PI ? 1 : 0} 1 ${f1(x2)} ${f1(y2)}`;
  }
  const jewel = (x, y, ms) =>
    `<circle class="s d" ${dd(ms)} cx="${f1(x)}" cy="${f1(y)}" r="7"/><circle class="f" cx="${f1(x)}" cy="${f1(y)}" r="2.6"/>`;
  const screw = (x, y, ms, a = 0.6) => {
    const [x1, y1] = polar(x, y, 6, a),
      [x2, y2] = polar(x, y, 6, a + Math.PI);
    return `<circle class="s d" ${dd(ms)} cx="${f1(x)}" cy="${f1(y)}" r="7.5"/><path class="s" d="M${f1(x1)} ${f1(y1)} L${f1(x2)} ${f1(y2)}"/>`;
  };
  // Bimetallic balance: a rim cut in two, one arm, timing screws, hairspring.
  function balance(cx, cy, r, ms) {
    let screws = "";
    for (let k = 0; k < 10; k++) {
      const [x, y] = polar(cx, cy, r + 4, (k + 0.5) * ((2 * Math.PI) / 10));
      screws += `<circle class="s" cx="${f1(x)}" cy="${f1(y)}" r="2.6"/>`;
    }
    return `<path class="s d" ${dd(ms)} d="${arc(cx, cy, r, 0.12, Math.PI - 0.12)}"/>
      <path class="s d" ${dd(ms + 60)} d="${arc(cx, cy, r, Math.PI + 0.12, 2 * Math.PI - 0.12)}"/>
      <path class="s d" ${dd(ms + 120)} d="M${cx - r} ${cy} L${cx + r} ${cy}"/>
      <path class="t" d="${arc(cx, cy, r - 6, 0.2, Math.PI - 0.2)} ${arc(cx, cy, r - 6, Math.PI + 0.2, 2 * Math.PI - 0.2)}"/>
      <g class="late" style="--cd:${ms + 600}">${screws}</g>
      <path class="s d" pathLength="1" style="--dd:${ms + 300};stroke-width:0.9" d="${spiral(cx, cy, 7, r * 0.55, 7)}"/>`;
  }
  // Genevan stripes, clipped to a shape.
  function stripes(shapeD, x0, y0, x1, y1, ms) {
    const id = `clip${uid++}`;
    let lines = "";
    for (let x = x0 - (y1 - y0); x < x1; x += 13) lines += `M${x} ${y1} L${x + (y1 - y0) * 0.6} ${y0} `;
    return `<clipPath id="${id}"><path d="${shapeD}"/></clipPath><path class="t late" style="--cd:${ms}" clip-path="url(#${id})" d="${lines}"/>`;
  }
  const label = (k, key, x, y, anchor = "start", cls = "cote") =>
    `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}" data-t="${k}.${key}"></text>`;

  /* ---------------------------------------------------- 1 · Niton 9 × 11 lignes (slide 09)
     After a2_calibre_niton_mouvement_01 (movement 4763), _02 and
     a2_montre_peseux_100118_mouvement for the vocabulary of the bridges.
     1 ligne = 40 units: 9 lignes wide (360), 11 lignes high (440). */
  function niton(el) {
    const k = el.dataset.keys,
      cx = 340,
      cy = 330,
      hh = 220;
    const plate = tonneauPath(cx, cy, 148, 180, hh);
    // Kept inside the plate: train bridge down to y 410, barrel bridge below it carrying the ratchet.
    const train = "M360 114 L470 112 C455 200 400 250 395 330 C393 370 400 395 398 410 L300 410 C312 380 302 360 310 330 C320 260 365 210 360 114 Z";
    const barrel = "M196 410 H486 C506 440 506 490 494 516 Q340 552 192 532 C180 490 182 445 196 410 Z";
    const cock = "M238 248 C246 196 290 160 340 140 L352 170 C312 186 292 214 292 252 Z";
    const shield = (x, y, ms) =>
      `<path class="s d" ${dd(ms)} d="M${x - 6} ${y - 7} H${x + 6} V${y} Q${x + 6} ${y + 7} ${x} ${y + 10} Q${x - 6} ${y + 7} ${x - 6} ${y} Z" style="stroke-width:1"/>`;
    return `<svg viewBox="0 0 880 680">
      <path class="s d" ${dd(0)} d="${plate}" style="stroke-width:1.8"/>
      <path class="s d" ${dd(180)} d="${barrel}"/>
      <path class="s d" ${dd(260)} d="${train}"/>
      <path class="s d" ${dd(340)} d="${cock}"/>
      ${stripes(train, 290, 108, 480, 415, 1500)}${stripes(barrel, 176, 405, 512, 556, 1550)}
      <path class="s d" ${dd(480)} d="${ratchet(420, 468, 56, 40, 6)}"/>
      <circle class="s d" ${dd(520)} cx="420" cy="468" r="16"/>
      <path class="s d" ${dd(540)} d="${gear(470, 360, 22, 18, 5)}"/>
      <path class="s d" ${dd(560)} d="M512 330 H566 M566 322 V338" />
      ${balance(262, 236, 62, 620)}
      <circle class="s d" ${dd(640)} cx="262" cy="236" r="22"/>
      ${jewel(262, 236, 900)}${jewel(425, 165, 950)}${jewel(405, 225, 1000)}${jewel(370, 295, 1050)}${jewel(352, 372, 1100)}
      ${screw(452, 128, 1000, 0.3)}${screw(386, 142, 1040, 1.2)}${screw(344, 156, 1060, 2)}${screw(322, 396, 1080, 0.9)}${screw(226, 446, 1100, 2.4)}${screw(338, 512, 1120, 0.2)}${screw(420, 468, 1140, 1.7)}
      ${shield(252, 500, 1200)}${shield(274, 500, 1220)}
      <text class="eng late" style="--cd:1500" x="206" y="521">A. LANGE &amp; SÖHNE</text>
      <text class="eng late" style="--cd:1500" x="206" y="533">GENEVA-SWISS</text>
      <text class="eng late" style="--cd:1500" x="206" y="478">4763</text>

      <g class="cote" style="--cd:2700">
        <path class="t dash" d="M160 330 V610 M520 330 V610 M226 110 H112 M226 550 H112"/>
        <path class="s a" d="M160 600 H520 M160 592 V608 M520 592 V608 M122 110 V550 M114 110 H130 M114 550 H130" style="stroke-width:1"/>
        ${label(k, "size", 340, 636, "middle")}
      </g>
      <g class="cote" style="--cd:3300">
        <path class="s" d="M800 110 H844 V550 H800 Z" style="stroke-width:1"/>
        <path class="t" d="M800 168 H844 M800 492 H844"/>
        <path class="s a" d="M800 86 H844 M800 78 V94 M844 78 V94" style="stroke-width:1"/>
        ${label(k, "thick", 822, 66, "middle")}
      </g>
      <g class="cote" style="--cd:3900">
        <path class="s a" d="M432 165 H600 L620 150" style="stroke-width:1"/><circle class="f fa" cx="425" cy="165" r="3"/>
        ${label(k, "jewels", 628, 154)}
      </g>
      <g class="cote" style="--cd:4500">
        <path class="s a" d="M263 512 L300 590 H600" style="stroke-width:1"/>
        ${label(k, "seals", 608, 594)}
      </g>
      ${label(k, "note", 880, 676, "end", "note late")}
    </svg>`;
  }

  /* ---------------------------------------------------- 1b · The Cabaret, beside the Niton (slide 09)
     Traced on the product photograph (cabaret-800.jpg, 800 × 800): the SVG uses the photo's own
     pixels as units, so the photo (step 2) lands exactly on the drawing. Same scale as the Niton
     drawing in millimetres (the figure sets the two widths): the case body is 25.5 mm wide. */
  function cabaret(el) {
    const k = el.dataset.keys;
    const rect = (x0, y0, x1, y1, ms, extra = "") =>
      `<path class="s d" ${dd(ms)} ${extra} d="M${x0} ${y0} H${x1} V${y1} H${x0} Z"/>`;
    let stones = "";
    for (let x = 268; x <= 532; x += 13.2) stones += `<circle cx="${f1(x)}" cy="196" r="3.4"/><circle cx="${f1(x)}" cy="582" r="3.4"/>`;
    for (let y = 209; y <= 570; y += 13.4) stones += `<circle cx="269" cy="${f1(y)}" r="3.4"/><circle cx="531" cy="${f1(y)}" r="3.4"/>`;
    let ticks = "";
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * 2 * Math.PI,
        r0 = i % 15 === 0 ? 36 : i % 5 === 0 ? 40 : 43;
      ticks += `M${f1(400 + r0 * Math.sin(a))} ${f1(462 - r0 * Math.cos(a))} L${f1(400 + 47 * Math.sin(a))} ${f1(462 - 47 * Math.cos(a))} `;
    }
    const lozenge = (x, y) => `M${x} ${y - 7} L${x + 3.5} ${y} L${x} ${y + 7} L${x - 3.5} ${y} Z`;
    const marks = [[316, 242], [484, 242], [311, 335], [489, 335], [311, 437], [489, 437], [316, 542], [484, 542]].map(([x, y]) => lozenge(x, y)).join(" ");
    const roman = (t, x, y) => `<text class="cab-num late" style="--cd:1300" x="${x}" y="${y}" text-anchor="middle">${t}</text>`;
    const hand = (x1, y1, w) => {
      const a = Math.atan2(y1 - 387, x1 - 400),
        nx = -Math.sin(a) * w,
        ny = Math.cos(a) * w;
      return `M${f1(400 + nx)} ${f1(387 + ny)} L${x1} ${y1} L${f1(400 - nx)} ${f1(387 - ny)} Z`;
    };
    const clip = `cabclip${uid++}`;
    return `<svg viewBox="225 150 465 500">
      <clipPath id="${clip}"><path d="M241 159 H559 V635 H241 Z"/></clipPath>
      <g class="cab-photo fade" data-step="2"><image href="assets/img/cabaret-800.jpg" x="0" y="0" width="800" height="800" clip-path="url(#${clip})"/></g>
      <g class="cab-lines">
        ${rect(250, 159, 287, 190, 0)}${rect(513, 159, 550, 190, 40)}${rect(250, 588, 287, 635, 80)}${rect(513, 588, 550, 635, 120)}
        <path class="s d" ${dd(60)} d="M263 186 H537 Q541 186 541 190 V588 Q541 592 537 592 H263 Q259 592 259 588 V190 Q259 186 263 186 Z" style="stroke-width:1.8"/>
        <path class="s d" ${dd(200)} d="M259 206 L244 216 V562 L259 572 M541 206 L556 216 V562 L541 572"/>
        ${rect(280, 209, 520, 570, 260)}
        <g class="f fa late" style="--cd:1500;opacity:.55">${stones}</g>
        ${rect(290, 219, 510, 560, 360, 'style="stroke-width:.8"')}
        ${rect(325, 256, 475, 525, 420, 'style="stroke-width:.7"')}
        ${rect(367, 274, 435, 314, 520)}<path class="s d" ${dd(560)} d="M401 274 V314"/>
        <text class="cab-date late" style="--cd:1400" x="384" y="306" text-anchor="middle">2</text><text class="cab-date late" style="--cd:1400" x="418" y="306" text-anchor="middle">5</text>
        ${roman("XII", 400, 254)}${roman("VI", 400, 551)}${roman("IX", 313, 394)}${roman("III", 488, 394)}
        <path class="t late" style="--cd:1200" d="${marks}"/>
        <circle class="s d" ${dd(640)} cx="400" cy="462" r="47"/>
        <path class="t late" style="--cd:1250" d="${ticks}"/>
        <path class="s hf d" ${dd(760)} d="${hand(320, 330, 3.2)}"/>
        <path class="s hf d" ${dd(800)} d="${hand(482, 332, 2.6)}"/>
        <circle class="s hf d" ${dd(840)} cx="400" cy="387" r="7"/>
        <path class="s d" ${dd(880)} d="M386 499 L416 432"/><circle class="s hf" cx="400" cy="462" r="3"/>
        <text class="eng late" style="--cd:1500" x="400" y="342" text-anchor="middle">A. LANGE &amp; SÖHNE</text>
      </g>
      <g class="cote" style="--cd:2700">
        <path class="t dash" d="M259 592 V626 M541 592 V626"/>
        <path class="s a" d="M259 620 H541 M259 612 V628 M541 612 V628" style="stroke-width:1"/>
        ${label(k, "size", 400, 646, "middle")}
      </g>
      <g class="cote" style="--cd:3300">
        <path class="s a" d="M435 294 H560 L572 282" style="stroke-width:1"/><circle class="f fa" cx="435" cy="294" r="3"/>
        ${label(k, "date", 578, 286)}
      </g>
      <g class="cote" style="--cd:3900">
        <path class="s a" d="M447 462 H560 L572 474" style="stroke-width:1"/><circle class="f fa" cx="447" cy="462" r="3"/>
        ${label(k, "seconds", 578, 482)}
      </g>
    </svg>`;
  }

  /* ---------------------------------------------------- 2 · The 10-ligne tonneau and its four houses (A2)
     Same base, lighter drawing; the four names sit on one rule around it (arbitrated step). */
  function tonneau10(el) {
    const k = el.dataset.keys,
      cx = 380,
      cy = 380;
    const plate = tonneauPath(cx, cy, 150, 176, 200);
    const train = "M400 184 L500 186 C488 260 440 300 436 380 C434 412 440 430 438 450 L348 450 C356 424 350 404 356 380 C364 310 404 270 400 184 Z";
    const barrel = "M236 450 H520 C540 480 540 530 528 560 Q380 592 236 572 C226 530 228 490 236 450 Z";
    const cock = "M282 300 C290 250 330 222 380 204 L392 232 C350 246 334 270 330 304 Z";
    const ring = (rx, ry) => `M${cx} ${cy - ry} A${rx} ${ry} 0 1 1 ${cx - 0.1} ${cy - ry} Z`;
    const at = (deg) => polar(cx, cy, 1, (deg * Math.PI) / 180).map((v, i) => (i ? cy + (v - cy) * 300 : cx + (v - cx) * 270));
    const houses = [
      ["h1", -45, "end", -16, -14],
      ["h2", 45, "start", 16, -14],
      ["h3", 225, "end", -16, 26],
      ["h4", 135, "start", 16, 26],
    ]
      .map(([key, deg, anchor, dx, dy], i) => {
        const [x, y] = at(deg);
        return `<circle class="f fa" cx="${f1(x)}" cy="${f1(y)}" r="5"/>${label(k, key, f1(x + dx), f1(y + dy), anchor, "house")}`;
      })
      .join("");
    return `<svg viewBox="0 0 760 760">
      <path class="s d" ${dd(0)} d="${plate}" style="stroke-width:1.8"/>
      <path class="s d" ${dd(200)} d="${train}"/>
      <path class="s d" ${dd(240)} d="${barrel}"/>
      <path class="s d" ${dd(280)} d="${cock}"/>
      ${stripes(train, 340, 180, 510, 455, 1400)}${stripes(barrel, 220, 445, 545, 595, 1450)}
      <path class="s d" ${dd(420)} d="${ratchet(440, 515, 50, 36, 6)}"/>
      <circle class="s d" ${dd(460)} cx="440" cy="515" r="15"/>
      ${balance(300, 300, 58, 520)}
      <circle class="s d" ${dd(540)} cx="300" cy="300" r="20"/>
      ${jewel(300, 300, 900)}${jewel(458, 238, 950)}${jewel(438, 300, 1000)}${jewel(408, 366, 1050)}
      ${screw(484, 202, 1000, 0.4)}${screw(386, 222, 1040, 1.4)}${screw(368, 438, 1080, 2.2)}${screw(440, 515, 1100, 1)}${screw(270, 510, 1120, 0.5)}
      ${label(k, "size", cx, 640, "middle", "cote late")}
      <g class="houses" data-step="4" data-arb="houses">
        <path class="s a d" ${dd(0)} d="${ring(270, 300)}" style="stroke-width:1"/>
        ${houses}
      </g>
      ${label(k, "note", 760, 754, "end", "note late")}
    </svg>`;
  }

  /* ---------------------------------------------------- 3 · The Peseux of 100118, exploded (A2, the piece)
     After a2_montre_peseux_100118_mouvement: round, 9 ¾ lignes. Three layers seen at an angle
     (bridge, wheel, balance) that separate on step 1. */
  function peseux(el) {
    const k = el.dataset.keys,
      R = 150,
      Bx = -72,
      By = -46;
    const sq = (inner) => `<g transform="scale(1 0.45)">${inner}</g>`;
    const ns = 'vector-effect="non-scaling-stroke"';
    const outline = `<circle class="t" ${ns} cx="0" cy="0" r="${R}"/>`;
    const bridgeL = sq(`${outline}
      <path class="s d" ${ns} ${dd(150)} d="M14 -6 L128 -76 A148 148 0 0 1 96 112 L22 62 Z"/>
      <path class="s d" ${ns} ${dd(220)} d="M-36 -134 A142 142 0 0 1 62 -134 L32 -22 L-28 -12 Z"/>
      <path class="s d" ${ns} ${dd(290)} d="M-92 -30 C-124 -64 -132 -98 -112 -122 L-84 -108 C-94 -84 -84 -64 -60 -54 Z"/>
      <circle class="s d" ${ns} ${dd(320)} cx="${Bx}" cy="${By}" r="20"/>
      ${[[Bx, By], [2, -86], [16, -44], [40, 14], [56, 46]].map(([x, y], i) => `<circle class="s d" ${ns} ${dd(700 + i * 50)} cx="${x}" cy="${y}" r="7"/><circle class="f" cx="${x}" cy="${y}" r="2.6"/>`).join("")}
      ${[[100, -80], [112, 58], [-20, -112], [-112, -112], [52, 92]].map(([x, y], i) => `<circle class="s d" ${ns} ${dd(900 + i * 40)} cx="${x}" cy="${y}" r="7.5"/>`).join("")}`);
    const wheelL = sq(`${outline}
      <path class="s d" ${ns} ${dd(400)} d="${ratchet(44, 58, 60, 36, 6)}"/>
      <circle class="s d" ${ns} ${dd(440)} cx="44" cy="58" r="16"/>
      <path class="s d" ${ns} ${dd(470)} d="${gear(24, -28, 32, 30, 5)}"/>
      <path class="s d" ${ns} ${dd(500)} d="${gear(2, -86, 22, 22, 4)}"/>
      <path class="s d" ${ns} ${dd(530)} d="${gear(112, -8, 20, 18, 5)}"/>
      <path class="s d" ${ns} ${dd(560)} d="${gear(-34, -84, 15, 15, 5)}"/>
      <path class="t" ${ns} d="M24 -60 V4 M-8 -28 H56 M44 18 V98 M4 58 H84"/>`);
    const balanceL = sq(`${outline}${balance(Bx, By, 50, 600).replace(/class="(s|t)/g, `${ns} class="$1`)}
      <path class="s d" ${ns} ${dd(820)} d="M${Bx + 20} ${By + 12} L-6 -70 M-14 -76 L2 -64"/>`);
    const S = 1.6; // drawn at 1.6 × so the 9 ¾-ligne plate reads at slide scale
    const layer = (cls, inner, key) =>
      `<g class="layer ${cls}"><g transform="translate(390 450) scale(${S})">${inner}</g>
        <path class="t lead" d="M${390 + R * S + 12} 450 H${390 + R * S + 70}"/>${label(k, key, 390 + R * S + 80, 455, "start", "cote lead")}</g>`;
    return `<svg viewBox="0 0 900 900">
      <path class="t dash axes" d="M${f1(390 + Bx * S)} 70 V830 M${f1(390 + 44 * S)} 70 V830"/>
      ${layer("l3", balanceL, "balance")}
      ${layer("l2", wheelL, "wheel")}
      ${layer("l1", bridgeL, "bridge")}
      ${label(k, "note", 900, 894, "end", "note late")}
    </svg>`;
  }

  /* ---------------------------------------------------- The boutique, redrawn (exploration)
     After the client brief's zoning and journey plans (pp. 31-35). One plan coordinate system for
     the three floors (units ≈ the plan's pixels at 2000 px per page, origin at the top left of the
     building), then a stacked axonometric view: x' = .45x - .175y, y' = .06x + .21y.
     data-mode="zones": the spaces of the story light up floor by floor (slide 06).
     data-mode="route": the clients' visit is traced through the floors (slide 11). */
  const PLAN = {
    outline: [[0, 37], [1595, 0], [1660, 810], [0, 810]],
    lift: [175, 390, 375, 565],
    stairs: [30, 470, 375, 700],
    floorY: [520, 285, 50], // screen y of each floor (ground, first, second) once spread out
    zones: {
      0: {
        wall: [[495, 125], [550, 125], [550, 495], [495, 495]], // Digital History Wall
        saxony: [[660, 385], [945, 385], [945, 440], [660, 440]], // Glashütte / Saxony
        welcome: [[660, 440], [945, 440], [945, 735], [660, 735]],
      },
      1: {
        cinema: [[1150, 30], [1590, 24], [1615, 390], [1150, 390]],
        lounge: [[1150, 390], [1615, 390], [1640, 760], [1150, 760]],
      },
      2: {
        salon: [[10, 37], [545, 30], [545, 385], [10, 385]],
        atelier: [[1210, 330], [1625, 330], [1650, 760], [1210, 760]],
      },
    },
  };
  const STAIR = [790, 170]; // the spiral stair's centre, the same on every floor
  const P0 = { a: 0.45, b: 0.06, c: -0.175, d: 0.21, e: 160 };
  const proj = (k, x, y) => [P0.e + P0.a * x + P0.c * y, PLAN.floorY[k] + P0.b * x + P0.d * y];
  const polyOn = (k, pts) => "M" + pts.map((p) => proj(k, ...p).map(f1).join(" ")).join(" L") + " Z";

  function plan(el) {
    const k = el.dataset.keys,
      mode = el.dataset.mode || "zones";
    const floor = (f) => {
      const g = (pts, cls, extra = "") => `<path class="${cls}" ${extra} d="${polyOn(f, pts)}"/>`;
      // A classic architectural schema after the brief's layout pages: the wall masses
      // (vectorised, assets/plan-data.js) are drawn as outlines then filled; only the landmarks
      // the story needs are drawn by hand: the spiral stair, the first floor's triangular
      // table, the second floor's dinner table.
      const V = window.PLAN_DATA && window.PLAN_DATA[f];
      if (V) {
        const pathOf = (polys) =>
          polys.map((p) => "M" + p.map(([x, y]) => proj(f, x, y).map(f1).join(" ")).join(" L") + " Z").join(" ");
        const slab = [[0, 0], [1660, 0], [1660, 810], [0, 810]];
        const ring = (cx, cy, rx, ry, n = 36) =>
          Array.from({ length: n }, (_, i) => [cx + rx * Math.cos((i / n) * 2 * Math.PI), cy + ry * Math.sin((i / n) * 2 * Math.PI)]);
        const [scx, scy] = STAIR;
        let treads = "";
        for (let i = 0; i < 14; i++) {
          const t = (i / 14) * Math.PI * 2;
          const p1 = proj(f, scx + 42 * Math.cos(t), scy + 42 * Math.sin(t)),
            p2 = proj(f, scx + 118 * Math.cos(t), scy + 118 * Math.sin(t));
          treads += `M${f1(p1[0])} ${f1(p1[1])} L${f1(p2[0])} ${f1(p2[1])} `;
        }
        const marks = []; // landmarks are carried by the zones and stops, not by furniture
        const d0 = f * 180;
        return `<g class="pfloor pf${f}">
          <path class="s hf d" pathLength="1" style="--dd:${d0};stroke-width:1" d="${polyOn(f, slab)}"/>
          <path class="pl-walls late" style="--cd:${900 + d0}" fill-rule="evenodd" d="${pathOf(V.walls)}"/>
          <path class="s d" pathLength="1" style="--dd:${250 + d0};stroke-width:1" d="${pathOf(V.walls)}"/>
          <path class="t late" style="--cd:${800 + d0}" d="${treads}"/>
          <path class="s d" pathLength="1" style="--dd:${500 + d0}" d="${pathOf([ring(scx, scy, 42, 42, 24)])}"/>
          ${marks.map((m) => `<path class="s d" pathLength="1" style="--dd:${650 + d0}" d="${pathOf([m])}"/>`).join("")}
        </g>`;
      }
      const rect = ([x0, y0, x1, y1]) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
      // the spiral stair: a rounded well with its core and treads
      const [scx, scy] = [738, 205];
      let treads = "";
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const p1 = proj(f, scx + 48 * Math.cos(a), scy + 48 * Math.sin(a)),
          p2 = proj(f, scx + 140 * Math.cos(a), scy + 140 * Math.sin(a));
        treads += `M${f1(p1[0])} ${f1(p1[1])} L${f1(p2[0])} ${f1(p2[1])} `;
      }
      let well = [];
      for (let i = 0; i <= 32; i++) {
        const a = (i / 32) * Math.PI * 2;
        well.push([scx + 150 * Math.cos(a), scy + 150 * Math.sin(a)]);
      }
      let flights = "";
      for (let i = 0; i <= 8; i++) {
        const x = 30 + i * 43;
        const p1 = proj(f, x, 470),
          p2 = proj(f, x, 700);
        flights += `M${f1(p1[0])} ${f1(p1[1])} L${f1(p2[0])} ${f1(p2[1])} `;
      }
      return `<g class="pfloor pf${f}">
        ${g(PLAN.outline, "s hf d", `pathLength="1" style="--dd:${f * 180};stroke-width:1.6"`)}
        <path class="t" d="${treads}${flights}"/>
        ${g(well, "s d", `pathLength="1" style="--dd:${300 + f * 180}"`)}
        ${g(rect(PLAN.lift), "s d", `pathLength="1" style="--dd:${360 + f * 180}"`)}
        ${g(rect(PLAN.stairs), "t")}
      </g>`;
    };
    const floorNames = [0, 1, 2]
      .map((f) => {
        const [x, y] = proj(f, 0, 37);
        return `<text class="cote late" style="--cd:${900 + f * 150}" x="${f1(x - 14)}" y="${f1(y - 6)}" text-anchor="end">${["RDC", "1er", "2e"][f]}</text>`;
      })
      .join("");
    const centre = (f, pts) => {
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length,
        cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      return proj(f, cx, cy);
    };
    // A label on the right edge with a leader to its zone.
    const tag = (f, pts, key, ly) => {
      const [x, y] = centre(f, pts);
      return `<path class="s a" d="M${f1(x)} ${f1(y)} L${f1(x + 30)} ${f1(ly)} H905" style="stroke-width:1"/><circle class="f fa" cx="${f1(x)}" cy="${f1(y)}" r="4"/>
        <text class="cote" x="910" y="${f1(ly + 5)}" data-t="${k}.${key}"></text>`;
    };
    let layer = "";
    if (mode === "zones") {
      const Z = PLAN.zones;
      const zoneG = (step, f, list) =>
        `<g class="pzones fade" data-step="${step}">${list.map(([name, key, ly]) => `<path class="zone" d="${polyOn(f, Z[f][name])}"/>${tag(f, Z[f][name], key, ly)}`).join("")}</g>`;
      // archive cases (small squares) and hosts (dots) added on the last step
      const caseAt = (f, x, y) => {
        const s = 34;
        return `<path class="s a" d="${polyOn(f, [[x, y], [x + s, y], [x + s, y + s], [x, y + s]])}" style="stroke-width:1.6"/>`;
      };
      const hostAt = (f, x, y) => `<circle class="f fa" cx="${f1(proj(f, x, y)[0])}" cy="${f1(proj(f, x, y)[1])}" r="5"/>`;
      layer =
        zoneG(1, 0, [["wall", "wall", 640], ["saxony", "saxony", 700]]) +
        zoneG(2, 1, [["cinema", "cinema", 330]]) +
        zoneG(3, 2, [["atelier", "atelier", 130], ["salon", "salon", 60]]) +
        `<g class="fade" data-step="4">${caseAt(0, 760, 560)}${caseAt(0, 1060, 500)}${caseAt(2, 240, 190)}${caseAt(1, 600, 600)}
          ${hostAt(0, 805, 760)}${hostAt(0, 620, 330)}${hostAt(1, 900, 420)}${hostAt(2, 1150, 520)}</g>`;
    } else {
      // The visit: entrance → 1927 case → spiral stair → cinema (1st) → stair → workshop (2nd), then the salon.
      const S = STAIR;
      const pts = (list) =>
        list.map(([f, x, y], i) => `${i ? "L" : "M"}${proj(f, x, y).map(f1).join(" ")}`).join(" ");
      // One direction per floor, no leg crossing another: out to the cinema on one line, back
      // to the stair by the far wall; on the second floor the salon is reached along the front.
      // The stair is climbed twice, on two parallel lines: up to the 1st floor on the cinema
      // side (U); back from the cinema round the far wall, on to the 2nd from the other side (V).
      // The route never runs over itself or crosses its own line.
      const U = [S[0] + 62, S[1] + 30],
        V = [S[0] - 62, S[1] - 30];
      const legA = pts([[0, 805, 800], [0, 805, 600], [0, 790, 430], [0, U[0], U[1] + 120], [0, ...U], [1, ...U], [1, 1050, 300], [1, 1370, 210], [1, 1370, 105], [1, 950, 80], [1, V[0] - 30, V[1] - 60], [1, ...V], [2, ...V], [2, 1000, 420], [2, 1400, 545]]);
      const legB = pts([[2, 1400, 545], [2, 1250, 700], [2, 600, 660], [2, 280, 210]]);
      const stop = (f, x, y, key, dx, dy, step) => {
        const [sx, sy] = proj(f, x, y);
        return `<g class="fade" data-step="${step}"><circle class="s hf a" cx="${f1(sx)}" cy="${f1(sy)}" r="9" style="stroke-width:2"/><circle class="f fa" cx="${f1(sx)}" cy="${f1(sy)}" r="3.5"/>
          <text class="cote" x="${f1(sx + dx)}" y="${f1(sy + dy)}" data-t="${k}.${key}"></text></g>`;
      };
      layer = `<path class="s a route d" pathLength="1" style="--dd:900;stroke-width:2.4" d="${legA}"/>
        <g class="draw" data-step="1"><path class="s a d" pathLength="1" style="--dd:0;stroke-width:2.4" d="${legB}"/></g>
        ${stop(0, 805, 600, "r1", 16, 28, 0)}${stop(1, 1370, 210, "r2", 16, -14, 0)}${stop(2, 1400, 545, "r3", 16, 28, 0)}${stop(2, 280, 210, "r4", 16, -14, 1)}`;
    }
    return `<svg viewBox="0 0 1100 860">${floor(0)}${floor(1)}${floor(2)}${floorNames}${layer}</svg>`;
  }

  /* ---------------------------------------------------- The journeys of learning (slide 02)
     A navigator's chart: a graticule, the cities at their true longitude and latitude
     (equirectangular, 1232 × 760), and the map of Europe that opens as the journey is traced. Step 0: the founder's journeyman years, 1837-1845.
     Step 1: his grandsons' journey to Geneva, 1927. Step 2: Geneva again, 2027. */
  function route(el) {
    const k = el.dataset.keys;
    const X = (lon) => (lon + 1.8) * 68.4,
      Y = (lat) => (52.6 - lat) * 106 + 20;
    const at = (lon, lat) => [f1(X(lon)), f1(Y(lat))];
    const C = {
      london: at(-0.13, 51.51),
      paris: at(2.35, 48.86),
      swiss: at(7.45, 46.95),
      geneva: at(6.14, 46.2),
      dresden: at(13.74, 51.05),
      glashutte: at(13.78, 50.85),
    };
    let grid = "";
    for (let lon = 0; lon <= 16; lon += 2) grid += `M${f1(X(lon))} 0 V760 `;
    for (let lat = 46; lat <= 52; lat += 1) grid += `M0 ${f1(Y(lat))} H1232 `;
    const curve = (a, b, bend) => {
      const [x1, y1] = a.map(Number),
        [x2, y2] = b.map(Number);
      const mx = (x1 + x2) / 2,
        my = (y1 + y2) / 2,
        dx = x2 - x1,
        dy = y2 - y1;
      return `M${x1} ${y1} Q${f1(mx - dy * bend)} ${f1(my + dx * bend)} ${x2} ${y2}`;
    };
    const dot = (p, cls = "f") => `<circle class="${cls}" cx="${p[0]}" cy="${p[1]}" r="6"/>`;
    const name = (p, key, dx, dy, anchor = "start", cls = "cote") =>
      `<text class="${cls}" x="${f1(+p[0] + dx)}" y="${f1(+p[1] + dy)}" text-anchor="${anchor}" data-t="${k}.${key}"></text>`;
    // The journey, leg by leg (delay in ms, line weight). The map of Europe opens in its wake:
    // the same legs, drawn wide and soft, are the mask of the map (assets/map-data.js).
    const legs = [
      [curve(C.dresden, C.paris, 0.12), 0, 2],
      [curve(C.paris, C.london, 0.2), 500, 1.1],
      [curve(C.paris, C.swiss, -0.2), 700, 1.1],
      [curve(C.swiss, C.dresden, -0.2), 1000, 2],
    ];
    const M = window.MAP_DATA || {},
      id = `mapmask${uid++}`;
    const wake = legs
      .map(([d, ms]) => `<path class="d" pathLength="1" style="--dd:${ms}" d="${d}" fill="none" stroke="#fff" stroke-width="250" stroke-linecap="round"/>`)
      .join("");
    const cities = [C.london, C.paris, C.swiss, C.dresden].map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="120" fill="#fff"/>`).join("");
    return `<svg viewBox="0 0 1232 760">
      <defs>
        <filter id="${id}b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="42"/></filter>
        <clipPath id="${id}c"><rect width="1232" height="760"/></clipPath>
        <mask id="${id}" maskUnits="userSpaceOnUse" x="-100" y="-100" width="1432" height="960">
          <g class="draw" data-step="0" filter="url(#${id}b)">${wake}<g class="late" style="--cd:1900">${cities}</g></g>
        </mask>
      </defs>
      <path class="t" d="${grid}"/>
      <g class="map" clip-path="url(#${id}c)" mask="url(#${id})">
        <path class="map-river" d="${M.rivers || ""}"/>
        <path class="map-lake" d="${M.lakes || ""}"/>
        <path class="map-border" d="${M.borders || ""}"/>
        <path class="map-coast" d="${M.coast || ""}"/>
      </g>
      <g class="draw" data-step="0">
        ${legs.map(([d, ms, w]) => `<path class="s d" pathLength="1" style="--dd:${ms};stroke-width:${w}" d="${d}"/>`).join("")}
      </g>
      ${dot(C.london)}${dot(C.paris)}${dot(C.dresden)}${dot(C.glashutte, "f fa")}
      ${name(C.london, "london", 14, -14)}${name(C.paris, "paris", -14, 34, "end")}
      ${name(C.swiss, "swiss", 0, -62, "middle")}
      ${name(C.dresden, "dresden", 14, -12)}${name(C.glashutte, "glashutte", 16, 26)}
      <g class="late" style="--cd:1300">${name(C.paris, "y1837", -14, 58, "end", "cote dim")}${name(C.dresden, "y1841", 14, -36, "start", "cote dim")}</g>
      <g class="late" style="--cd:1500">
        <path class="s" d="M${C.glashutte[0]} ${C.glashutte[1]} L${C.dresden[0]} ${C.dresden[1]}" style="stroke-width:1"/>
        ${name(C.glashutte, "y1845", 16, 50, "start", "cote dim")}
      </g>
    </svg>`;
  }

  /* ---------------------------------------------------- Geneva watches sold, 1927-1931 (slide 10)
     After the shipping books as read by Stegemann: 24, 147, about 150, 49, 116. 760 × 420. */
  function sales(el) {
    const k = el.dataset.keys;
    const V = [
        [1927, 24],
        [1928, 147],
        [1929, 150],
        [1930, 49],
        [1931, 116],
      ],
      base = 360,
      sc = 2,
      bw = 84,
      gap = 62;
    const bars = V.map(([y, v], i) => {
      const x = 40 + i * (bw + gap),
        h = v * sc;
      return `<path class="s d" pathLength="1" style="--dd:${200 + i * 140}" d="M${x} ${base} V${base - h} H${x + bw} V${base}"/>
        <rect class="barfill late" style="--cd:${900 + i * 140}" x="${x}" y="${base - h}" width="${bw}" height="${h}"/>
        <text class="cote late" style="--cd:${1100 + i * 140}" x="${x + bw / 2}" y="${base - h - 14}" text-anchor="middle">${i === 2 ? "~" : ""}${v}</text>
        <text class="lbl${i === 0 ? " cur" : ""}" x="${x + bw / 2}" y="${base + 40}" text-anchor="middle">${y}</text>`;
    }).join("");
    return `<svg viewBox="0 0 760 420"><path class="s" d="M20 ${base} H740"/>${bars}
      ${label(k, "note", 740, 416, "end", "note late")}</svg>`;
  }

  /* ---------------------------------------------------- Cover dial, after a Richard Lange
     perpetual calendar with 14-day remontoir (reference photograph, 1000 × 1000): three
     overlapping rings, minutes (top), seconds (left), hours (right), outsize date, day, month,
     leap year, power-reserve slot. White line on black; no wordmark (the brief forbids
     redrawing the logotype). Hands turn into place (CSS, .tl-hand, --a). */
  function terraluna() {
    // Geometry measured on a photograph of the real dial (assets/src/cadran-richard-lange-2000.webp),
    // brought into this 1000 frame (dial centre 500, 500; radius 470). Lines as before; the
    // typography is drawn: Roman numerals built stroke by stroke, figures and inscriptions from
    // Bodoni Moda outlines (assets/dial-glyphs.js) placed glyph by glyph. No wordmark.
    const G = window.DIAL_GLYPHS;
    const M = [496.4, 383.0], // minutes, outsize date above
      Sx = [343.1, 622.9], // small seconds
      H = [655.9, 622.6]; // hours
    const D2R = Math.PI / 180;
    const at = (c, r, deg) => polar(c[0], c[1], r, deg * D2R);
    // ---- figures and letters: one outline per glyph, centred on (0, 0), cap height h
    const CAP = 755;
    const run = (str, style, h, sx = 1, track = 0) => {
      const g = G[style],
        sc = h / CAP;
      let x = 0,
        parts = "";
      const chars = [...str];
      chars.forEach((ch, i) => {
        const q = g[ch];
        if (q) parts += `<path transform="translate(${f1(x)} 0)" d="${q.d}"/>`;
        x += (q ? q.adv : 300) + (i < chars.length - 1 ? track : 0);
      });
      const first = g[chars[0]],
        last = g[chars[chars.length - 1]];
      const x0 = first ? first.box[0] : 0,
        x1 = x - (last ? last.adv - last.box[2] : 0);
      return `<g transform="scale(${(sc * sx).toFixed(5)} ${sc.toFixed(5)}) translate(${f1(-(x0 + x1) / 2)} ${CAP / 2})">${parts}</g>`;
    };
    const textAt = (x, y, rot, str, style, h, cls = "cv-glyph", sx = 1, track = 0) =>
      `<g class="${cls}" transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})">${run(str, style, h, sx, track)}</g>`;
    // along a circle, spread over an angular span; tops outward reading clockwise, or inward reading anticlockwise
    const textArc = (c, r, a0, a1, str, style, h, inward = false, cls = "cv-glyph") => {
      const g = G[style],
        sc = h / CAP,
        chars = [...str];
      const adv = chars.map((ch) => (g[ch] ? g[ch].adv : 330) * sc);
      const natural = adv.reduce((p, v) => p + v, 0);
      const L = Math.abs(a1 - a0) * D2R * r;
      const extra = (L - natural) / Math.max(chars.length - 1, 1);
      let pos = 0,
        out = "";
      chars.forEach((ch, i) => {
        const mid = pos + adv[i] / 2;
        pos += adv[i] + extra;
        if (ch === " ") return;
        const t = mid / L;
        const deg = inward ? a1 - t * (a1 - a0) : a0 + t * (a1 - a0);
        const [x, y] = at(c, r, deg);
        out += textAt(x, y, inward ? deg - 180 : deg, ch, style, h, cls);
      });
      return out;
    };
    // radial figures: tops outward, those of the lower half turned to stay readable
    const upright = (deg) => {
      let r = ((deg % 360) + 360) % 360;
      if (r > 180) r -= 360;
      return Math.abs(r) > 90 ? r - 180 * Math.sign(r) : r;
    };
    // ---- Roman numerals, drawn: thick stems and hairlines, flat serifs, as on the dial
    const RN = { h: 71.5, stem: 5.9, thick: 7.6, hair: 2.7, serif: 2.5, over: 2.7, gap: 1.0 };
    const rect = (x0, y0, x1, y1) => `M${f1(x0)} ${f1(y0)} H${f1(x1)} V${f1(y1)} H${f1(x0)} Z`;
    const quad = (p) => "M" + p.map(([x, y]) => `${f1(x)} ${f1(y)}`).join(" L") + " Z";
    const letter = (ch, x) => {
      const { h, stem, thick, hair, serif: st, over } = RN;
      if (ch === "I") {
        const w = stem + 2 * over,
          br = 1.6;
        const d = `M${f1(x)} 0 H${f1(x + w)} V${st} Q${f1(x + w - over)} ${st} ${f1(x + w - over)} ${f1(st + br)} V${f1(h - st - br)} Q${f1(x + w - over)} ${f1(h - st)} ${f1(x + w)} ${f1(h - st)} V${h} H${f1(x)} V${f1(h - st)} Q${f1(x + over)} ${f1(h - st)} ${f1(x + over)} ${f1(h - st - br)} V${f1(st + br)} Q${f1(x + over)} ${st} ${f1(x)} ${st} Z`;
        return [d, w];
      }
      if (ch === "V") {
        const w = 20.6,
          tip = x + w / 2;
        const d =
          quad([[x + over, st], [x + over + thick, st], [tip + 1.2, h], [tip - 1.4, h]]) +
          quad([[x + w - over - hair, st], [x + w - over, st], [tip + 1.2, h], [tip - 0.4, h]]) +
          rect(x, 0, x + 2 * over + thick, st) +
          rect(x + w - 2 * over - hair, 0, x + w, st);
        return [d, w];
      }
      // X
      const w = 21.1;
      const d =
        quad([[x + over, st], [x + over + thick, st], [x + w - over, h - st], [x + w - over - thick, h - st]]) +
        quad([[x + w - over - hair, st], [x + w - over, st], [x + over + hair, h - st], [x + over, h - st]]) +
        rect(x, 0, x + 2 * over + thick, st) +
        rect(x + w - 2 * over - hair, 0, x + w, st) +
        rect(x, h - st, x + 2 * over + hair, h) +
        rect(x + w - 2 * over - thick, h - st, x + w, h);
      return [d, w];
    };
    const roman = (str) => {
      let x = 0,
        d = "";
      [...str].forEach((ch) => {
        const [p, w] = letter(ch, x);
        d += p;
        x += w + RN.gap;
      });
      return `<path transform="translate(${f1(-(x - RN.gap) / 2)} ${-RN.h / 2})" d="${d}"/>`;
    };
    const ROM = ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
    const romans = ROM.map((t, i) => {
      const [x, y] = at(H, 183.9, i * 30);
      return `<g class="cv-glyph" transform="translate(${f1(x)} ${f1(y)}) rotate(${i * 30})">${roman(t)}</g>`;
    }).join("");
    // ---- tracks
    const ring = (c, r, w, ms) => `<circle class="s d" pathLength="1" style="--dd:${ms};stroke-width:${w}" cx="${c[0]}" cy="${c[1]}" r="${r}"/>`;
    const ticks = (c, r1, r2, n, w, ms, skip = () => false) => {
      let d = "";
      for (let i = 0; i < n; i++) {
        if (skip(i)) continue;
        const [x1, y1] = at(c, r1, (i * 360) / n),
          [x2, y2] = at(c, r2, (i * 360) / n);
        d += `M${f1(x1)} ${f1(y1)} L${f1(x2)} ${f1(y2)} `;
      }
      return `<path class="s late" style="--cd:${ms};stroke-width:${w}" d="${d}"/>`;
    };
    const dots = [0, 60, 120, 180, 240, 300].map((deg) => {
      const [x, y] = at(Sx, 232.5, deg);
      return `<circle class="f" cx="${f1(x)}" cy="${f1(y)}" r="3.9"/>`;
    }).join("");
    const secNums = [[0, "60"], [60, "10"], [120, "20"], [180, "30"], [240, "40"], [300, "50"]]
      .map(([deg, t]) => {
        const [x, y] = at(Sx, 210, deg);
        return textAt(x, y, upright(deg), t, "book", 15.2);
      })
      .join("");
    // red minute figures, each digit where it stands on the dial
    const red = [
      [483.6, 92.2, 0, "6"], [514.9, 92.2, 0, "0"],
      [483.3, 684.2, 0, "3"], [513.8, 684.2, 0, "0"],
      [203.9, 402.1, -90, "4"], [203.0, 372.1, -90, "5"],
      [795.9, 371.6, 90, "1"], [797.0, 402.5, 90, "5"],
    ].map(([x, y, r, t]) => textAt(x, y, r, t, "bold", 18.6, "cv-glyph acc")).join("");
    // ---- hands, from their measured profiles: [distance from the pivot, half width]
    const handPath = (prof) => {
      const L = prof.map(([d, w]) => [w, -d]),
        R = prof.map(([d, w]) => [-w, -d]).reverse();
      const pts = [...L, ...R];
      // smooth closed outline through the points (Catmull-Rom as cubic Béziers)
      let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(i - 1, 0)],
          p1 = pts[i],
          p2 = pts[i + 1],
          p3 = pts[Math.min(i + 2, pts.length - 1)];
        d += ` C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
      }
      return d + " Z";
    };
    const minuteHand = handPath([[-4, 4], [12, 4.6], [40, 5], [58, 8.4], [78, 13.2], [100, 12.4], [140, 10.6], [190, 8.2], [240, 5.2], [290, 2.4], [321, 0.2]]);
    const hourHand = handPath([[-4, 4], [12, 4.2], [32, 4.4], [48, 8.4], [60, 13], [80, 11.6], [120, 8.9], [160, 5.4], [190, 2], [203.5, 0.2]]);
    const secHand = handPath([[-112, 2.3], [-60, 3.6], [-14, 3.2], [0, 3], [40, 3.6], [62, 4.6], [100, 3.5], [160, 2.5], [220, 1.5], [241.8, 0.3]]);
    const lozenge = `M0 117 L10.4 128 L0 139 L-10.4 128 Z M0 121.5 L-6.2 128 L0 134.5 L6.2 128 Z`;
    const hand = (c, deg, inner, cls, ms) =>
      `<g class="tl-hand ${cls}" style="--a:${deg}deg;--hd:${ms}ms;transform-origin:${c[0]}px ${c[1]}px"><g transform="translate(${c[0]} ${c[1]})">${inner}</g></g>`;
    const cap = (c, r) => `<circle class="s hf" cx="${c[0]}" cy="${c[1]}" r="${r}"/><circle class="s" cx="${c[0]}" cy="${c[1]}" r="${f1(r * 0.5)}" style="stroke-width:1"/><circle class="f" cx="${c[0]}" cy="${c[1]}" r="${f1(r * 0.18)}"/>`;
    // ---- windows
    const win = (x0, y0, x1, y1, ms, rx = 3) => `<rect class="s hf d" pathLength="1" style="--dd:${ms}" x="${x0}" y="${y0}" width="${f1(x1 - x0)}" height="${f1(y1 - y0)}" rx="${rx}"/>`;
    return `<svg viewBox="0 0 1000 1000">
      ${ring([500, 500], 470, 1.6, 0)}
      ${ring(M, 318.4, 2, 300)}${ring(M, 306.4, 1.3, 380)}
      ${ticks(M, 306.4, 318.4, 60, 1.7, 1500, (i) => i % 15 === 0)}
      ${ticks(M, 280.5, 318.4, 4, 2.2, 1550)}
      ${ring(Sx, 240, 2, 600)}${ring(Sx, 225.1, 1.3, 680)}
      ${ticks(Sx, 225.1, 240, 60, 1.5, 1650)}
      <g class="late" style="--cd:1700">${dots}</g>
      ${ring(H, 241.4, 2, 850)}
      ${ticks(H, 241.4, 250, 12, 2.2, 1750, (i) => i === 3)}
      <g class="late" style="--cd:1900">${red}</g>
      <g class="late" style="--cd:2000">${secNums}</g>
      <g class="late" style="--cd:2100">${romans}</g>
      ${win(417.0, 135.0, 580.6, 234.7, 1100, 4)}${win(425.8, 144.3, 493.2, 224.1, 1200, 2)}${win(502.1, 144.3, 572.4, 224.1, 1250, 2)}
      <g class="late" style="--cd:2300">${textAt(459.5, 184.2, 0, "2", "date", 64)}${textAt(537.3, 184.2, 0, "5", "date", 64)}</g>
      ${win(150.2, 589.4, 232.3, 648.1, 1300)}${win(771.7, 589.4, 853.8, 648.1, 1350)}
      <g class="late" style="--cd:2400">${textAt(191.2, 618.8, 0, "TUE", "bold", 30, "cv-glyph", 0.78, 40)}${textAt(812.8, 618.8, 0, "OCT", "bold", 30, "cv-glyph", 0.78, 40)}</g>
      <circle class="s hf d" pathLength="1" style="--dd:1400" cx="865.5" cy="380.7" r="20.5"/><circle class="s" cx="865.5" cy="380.7" r="15.2" style="stroke-width:0.8"/>
      <g class="late" style="--cd:2450">${textAt(865.3, 381.6, 0, "4", "bold", 15.5, "cv-glyph acc")}</g>
      <path class="s d" pathLength="1" style="--dd:1450" d="M266.3 868 Q500 928 735.4 868 Q500 1013 266.3 868 Z"/>
      <path class="f late" style="--cd:2500" d="M497.6 838.6 L509.8 852 L497.6 882.6 L485.4 852 Z"/>
      <g class="late" style="--cd:2500">${textAt(372.8, 895.5, 17.8, "13", "bold", 18.5)}${textAt(498.3, 916, 0, "14", "bold", 18.5)}</g>
      <g class="late" style="--cd:2600">
        ${textArc([500, 500], 441, 266.2, 309.2, "14 DAYS REMONTOIR", "book", 14.6)}
        ${textArc([500, 500], 439, 50.1, 93.5, "PERPETUAL CALENDAR", "book", 14.6)}
        ${textArc(M, 343.4, 196.5, 222.8, "MADE IN GERMANY", "book", 8.6, true)}
      </g>
      ${hand(H, 55.9, `<path class="s hf" d="${hourHand}"/>`, "tl-h", 2700)}
      ${hand(Sx, 202.3, `<path class="s hf" d="${secHand}"/><path class="s hf" fill-rule="evenodd" d="${lozenge}"/>`, "tl-s", 2800)}
      ${hand(M, 303.6, `<path class="s hf" d="${minuteHand}"/>`, "tl-m", 2600)}
      <g class="late" style="--cd:2700">${cap(M, 24)}${cap(H, 20)}${cap(Sx, 12)}</g>
    </svg>`;
  }

  /* ---------------------------------------------------- Cabaret Tourbillon calibre, dial side
     (slide 20), after the manufacture's photographs of the rectangular movement: the plate,
     the outsize-date ring (units disc, tens cross), the tourbillon in its aperture under a
     straight bridge, blued screws, jewels. 720 × 1020. */
  function cabcal(el) {
    const k = el.dataset.keys;
    const C = [282, 400],
      T = [265, 852];
    const at = (c, r, deg) => polar(c[0], c[1], r, (deg * Math.PI) / 180).map(f1);
    const units = [5, 6, 7, 8, 9, 0, 1, 2]
      .map((d, i) => {
        const [x, y] = at(C, 170, 18 + i * 36);
        return `<text class="cb-dg" text-anchor="middle" dominant-baseline="central" x="${x}" y="${y}">${d}</text>`;
      })
      .join("");
    const tens = [[306, "1"], [342, "2"]]
      .map(([deg, d]) => {
        const [x, y] = at(C, 170, deg).map(Number);
        return `<rect class="s" x="${f1(x - 30)}" y="${f1(y - 36)}" width="60" height="72" rx="4" style="stroke-width:1"/><text class="cb-dg" text-anchor="middle" dominant-baseline="central" x="${f1(x)}" y="${f1(y)}">${d}</text>`;
      })
      .join("");
    const screwBig = (x, y, ms, a) => {
      const [x1, y1] = polar(x, y, 10, a),
        [x2, y2] = polar(x, y, 10, a + Math.PI);
      return `<circle class="s d" ${dd(ms)} cx="${x}" cy="${y}" r="13"/><path class="s late" style="--cd:${ms + 600};stroke-width:2" d="M${f1(x1)} ${f1(y1)} L${f1(x2)} ${f1(y2)}"/>`;
    };
    const holes = [[70, 120, 12], [92, 300, 16], [610, 290, 12], [630, 560, 16], [548, 660, 10], [530, 845, 12], [130, 625, 10], [470, 90, 9]]
      .map(([x, y, r], i) => `<circle class="s d" ${dd(700 + i * 40)} cx="${x}" cy="${y}" r="${r}" style="stroke-width:1"/>`)
      .join("");
    let spokes = "";
    for (let i = 0; i < 3; i++) {
      const a = (i * 2 * Math.PI) / 3 + 0.4;
      const [x1, y1] = polar(T[0], T[1], 18, a),
        [x2, y2] = polar(T[0], T[1], 76, a);
      spokes += `M${f1(x1)} ${f1(y1)} L${f1(x2)} ${f1(y2)} `;
    }
    return `<svg viewBox="0 0 720 1020">
      <rect class="s d" ${dd(0)} x="20" y="25" width="660" height="950" rx="26" style="stroke-width:1.8"/>
      <rect class="t" x="36" y="41" width="628" height="918" rx="18"/>
      <path class="s d" ${dd(150)} d="M680 386 H712 V424 H680" style="stroke-width:1.4"/>
      <circle class="s d" ${dd(300)} cx="${C[0]}" cy="${C[1]}" r="214" style="stroke-width:1.6"/>
      <circle class="s d" ${dd(380)} cx="${C[0]}" cy="${C[1]}" r="128"/>
      <circle class="s d" ${dd(440)} cx="${C[0]}" cy="${C[1]}" r="112" style="stroke-width:1"/>
      <path class="s d" ${dd(500)} d="M${C[0] - 60} ${C[1] - 70} Q${C[0]} ${C[1] - 120} ${C[0] + 60} ${C[1] - 70} L${C[0] + 60} ${C[1] + 10} Q${C[0]} ${C[1] + 40} ${C[0] - 60} ${C[1] + 10} Z" style="stroke-width:1"/>
      <g class="late" style="--cd:1300">${units}${tens}</g>
      ${jewel(C[0] + 20, C[1] + 70, 900)}${jewel(C[0] + 82, C[1] - 18, 950)}${jewel(455, 610, 1000)}${jewel(476, 652, 1050)}
      <path class="s d" ${dd(600)} d="M${T[0] - 132} 975 V${T[1]} A132 132 0 1 1 ${T[0] + 132} ${T[1]} V975" style="stroke-width:1.4"/>
      <circle class="s d" ${dd(700)} cx="${T[0]}" cy="${T[1]}" r="86"/>
      <circle class="s d" ${dd(760)} cx="${T[0]}" cy="${T[1]}" r="74" style="stroke-width:1"/>
      <path class="s d" ${dd(820)} d="${spokes}" style="stroke-width:1"/>
      <path class="s d" pathLength="1" style="--dd:900;stroke-width:0.8" d="${spiral(T[0], T[1], 8, 46, 6)}"/>
      <path class="s d" ${dd(1000)} d="M92 ${T[1] - 14} H438 Q450 ${T[1]} 438 ${T[1] + 14} H92 Q80 ${T[1]} 92 ${T[1] - 14} Z" style="stroke-width:1.4"/>
      <circle class="s hf d" ${dd(1100)} cx="${T[0]}" cy="${T[1]}" r="24"/>${jewel(T[0], T[1], 1150)}
      ${screwBig(112, T[1], 1200, 0.6)}${screwBig(418, T[1], 1220, 2.2)}
      ${screwBig(285, 64, 1240, 1.1)}${screwBig(560, 176, 1260, 0.4)}${screwBig(640, 742, 1280, 1.4)}${screwBig(615, 926, 1300, 0.9)}${screwBig(80, 890, 1320, 2.6)}${screwBig(62, 560, 1340, 0.2)}
      ${holes}
      <g class="cote" style="--cd:1700"><path class="s a" d="M${C[0] + 214} ${C[1] - 60} H700" style="stroke-width:1"/>${label(k, "date", 700, C[1] - 70, "end")}</g>
      <g class="cote" style="--cd:1900"><path class="s a" d="M${T[0] + 132} ${T[1] - 40} H700" style="stroke-width:1"/>${label(k, "tourbillon", 700, T[1] - 50, "end")}</g>
    </svg>`;
  }

  /* ---------------------------------------------------- 25, avenue du Mail, elevation (slide 07)
     Read from street-level views of the building (Google Street View, 2024): brick, about 15 m
     wide and 18 m to the cornice. Four bays, a close central pair and two side bays; a ground
     floor of darker brick with three arched windows and the arched door; three storeys of tall
     French windows in stone surrounds, the balconies alternating (centre, sides, centre); a low
     top storey under a cornice on brackets. Drawn to scale, 46 px to the metre, 760 × 890. */
  function facade(el) {
    const k = el.dataset.keys;
    const PX = 46,
      W = 15,
      X0 = 35,
      G = 845;
    const X = (m) => f1(X0 + m * PX),
      Y = (m) => f1(G - m * PX);
    const bays = [2.4, 6.15, 8.85, 12.6];
    const win = (cx, y0, w, h, ms, cross = 0.74) => {
      const l = cx - w / 2,
        r = cx + w / 2,
        t = y0 + h;
      return `<path class="s d" ${dd(ms)} d="M${X(l)} ${Y(y0)} H${X(r)} V${Y(t)} H${X(l)} Z" style="stroke-width:1.1"/>
        <path class="t late" style="--cd:${ms + 500}" d="M${X(l - 0.18)} ${Y(y0 - 0.12)} H${X(r + 0.18)} M${X(l - 0.14)} ${Y(y0)} V${Y(t + 0.22)} H${X(r + 0.14)} V${Y(y0)} M${X(cx)} ${Y(y0)} V${Y(y0 + h * cross)} M${X(l)} ${Y(y0 + h * cross)} H${X(r)}"/>`;
    };
    const rail = (l, r, y, ms) => {
      let bars = "";
      for (let x = l + 0.2; x < r - 0.1; x += 0.2) bars += `M${X(x)} ${Y(y + 0.95)} V${Y(y + 0.12)} `;
      return `<path class="s d" ${dd(ms)} d="M${X(l)} ${Y(y)} H${X(r)} V${Y(y - 0.18)} H${X(l)} Z" style="stroke-width:1"/>
        <path class="s d" ${dd(ms + 80)} d="M${X(l)} ${Y(y + 0.95)} H${X(r)}" style="stroke-width:1.1"/><path class="t late" style="--cd:${ms + 500}" d="${bars}"/>`;
    };
    const arch = (cx, w, sill, spring, ms, door = false) => {
      const l = cx - w / 2,
        r = cx + w / 2,
        R = f1((w / 2) * PX),
        R2 = f1((w / 2 + 0.3) * PX);
      return `<path class="hf" d="M${X(l)} ${Y(sill)} V${Y(spring)} A${R} ${R} 0 0 1 ${X(r)} ${Y(spring)} V${Y(sill)} Z"/>
        <path class="s d" ${dd(ms)} d="M${X(l)} ${Y(sill)} V${Y(spring)} A${R} ${R} 0 0 1 ${X(r)} ${Y(spring)} V${Y(sill)}${door ? "" : " Z"}" style="stroke-width:1.2"/>
        <path class="t late" style="--cd:${ms + 500}" d="M${X(l - 0.3)} ${Y(sill)} V${Y(spring)} A${R2} ${R2} 0 0 1 ${X(r + 0.3)} ${Y(spring)} V${Y(sill)} M${X(cx)} ${Y(spring + w / 2)} V${Y(spring + w / 2 + 0.38)}${door ? ` M${X(cx)} ${Y(0)} V${Y(spring)} M${X(l)} ${Y(spring)} H${X(r)}` : ` M${X(cx)} ${Y(sill)} V${Y(spring + w / 2)} M${X(l)} ${Y(spring)} H${X(r)}`}"/>`;
    };
    // storeys: [sill of the windows, window height]
    const floors = [
      [5.35, 2.4],
      [8.45, 2.35],
      [11.55, 2.25],
    ];
    let windows = "";
    floors.forEach(([y, h], fi) => bays.forEach((x, i) => (windows += win(x, y, 1.25, h, 500 + fi * 140 + i * 35))));
    bays.forEach((x, i) => (windows += win(x, 14.55, 1.1, 1.45, 950 + i * 35, 1)));
    let brick = "",
      rustic = "",
      brackets = "";
    for (let y = 0.95; y < 4.5; y += 0.36) rustic += `M${X(0)} ${Y(y)} H${X(W)} `;
    for (let x = 0.3; x < W; x += 0.75) brackets += `M${X(x)} ${Y(16.75)} V${Y(17.05)} H${X(x + 0.22)} V${Y(16.85)} `;
    [8.2, 11.3, 14.3].forEach((y) => (brick += `M${X(0)} ${Y(y)} H${X(W)} `));
    return `<svg viewBox="0 0 760 890">
      <path class="t late" style="--cd:1400" d="${rustic}"/>
      <path class="s d" ${dd(0)} d="M${X(0)} ${G} V${Y(16.7)} H${X(W)} V${G}" style="stroke-width:1.8"/>
      <path class="s d" ${dd(120)} d="M${X(-0.35)} ${Y(17.05)} H${X(W + 0.35)} V${Y(17.55)} H${X(-0.35)} Z" style="stroke-width:1.4"/>
      <path class="s d" ${dd(160)} d="M${X(-0.1)} ${Y(16.7)} H${X(W + 0.1)}" style="stroke-width:1"/>
      <path class="t late" style="--cd:700" d="${brackets}"/>
      <path class="s d" ${dd(220)} d="M${X(0)} ${Y(4.6)} H${X(W)} M${X(0)} ${Y(4.95)} H${X(W)} M${X(0)} ${Y(0.6)} H${X(W)}" style="stroke-width:1"/>
      <path class="t" d="${brick} M${X(0.35)} ${Y(4.95)} V${Y(16.7)} M${X(W - 0.35)} ${Y(4.95)} V${Y(16.7)}"/>
      ${windows}
      ${rail(4.95, 10.05, 5.25, 1150)}
      ${rail(1.35, 3.45, 8.35, 1250)}${rail(11.55, 13.65, 8.35, 1290)}
      ${rail(4.95, 10.05, 11.45, 1350)}
      ${arch(bays[0], 1.5, 1.0, 3.0, 1300)}${arch(bays[2] + 0.35, 1.5, 1.0, 3.0, 1340)}${arch(bays[3], 1.5, 1.0, 3.0, 1380)}
      ${arch(bays[1] - 0.15, 1.75, 0, 3.15, 1420, true)}
      <path class="s d" ${dd(1600)} d="M10 ${G} H750" style="stroke-width:1.6"/>
      <text class="note late" style="--cd:1900" x="${X(W)}" y="880" text-anchor="end" data-t="${k}.label"></text>
    </svg>`;
  }

  /* ---------------------------------------------------- Calibre L931.3 of the Cabaret, caseback
     side (slide 20), traced from a photograph of the movement squared up (deployant.com, 2014):
     three-quarter plate with Glashütte stripes and its engravings, three gold chatons held by
     blued screws, the engraved balance cock with its swan-neck regulator, the balance, the
     escape-wheel cock, part of the train seen past the plate. Drawn on the same register as the
     two watches of the slide (752 × 860, dial centre 376, 430), over a faint Cabaret (index.html). The movement is traced in the photograph's
     own units (1000 × 1450) and scaled to 280 × 406. */
  function l931() {
    const S = 0.28,
      OX = 236,
      OY = 227;
    const id = `mv${uid++}`;
    const plate = "M30 0 H970 Q1000 0 1000 30 V330 C870 340 700 470 600 650 C520 790 480 900 530 1040 C470 1120 360 1200 300 1450 H30 Q0 1450 0 1420 V30 Q0 0 30 0 Z";
    const frame = "M30 0 H970 Q1000 0 1000 30 V1420 Q1000 1450 970 1450 H30 Q0 1450 0 1420 V30 Q0 0 30 0 Z";
    const cock = "M1000 410 C930 400 860 440 840 520 C820 600 860 660 830 740 C810 800 790 840 800 880 C810 950 760 985 720 970 C670 955 670 880 705 850 C740 820 770 780 780 720 C795 620 760 520 820 450 C860 400 930 380 1000 380 Z";
    const cock2 = "M1000 1180 C930 1170 850 1200 780 1190 C700 1180 650 1140 590 1140 C520 1140 500 1220 540 1250 C600 1290 690 1240 760 1270 C820 1300 850 1380 840 1450 H1000 Z";
    const blued = (x, y, r, a, ms) => {
      const [x1, y1] = polar(x, y, r * 0.78, a),
        [x2, y2] = polar(x, y, r * 0.78, a + Math.PI);
      return `<circle class="s d mv-blue" ${dd(ms)} cx="${x}" cy="${y}" r="${r}"/><path class="s late" style="--cd:${ms + 500}" d="M${f1(x1)} ${f1(y1)} L${f1(x2)} ${f1(y2)}"/>`;
    };
    const chaton = (x, y, r, angles, ms) =>
      `<circle class="s d mv-gold" ${dd(ms)} cx="${x}" cy="${y}" r="${r}"/><circle class="s d" ${dd(ms + 80)} cx="${x}" cy="${y}" r="${r * 0.55}"/><circle class="f mv-ruby" cx="${x}" cy="${y}" r="${r * 0.2}"/>` +
      angles.map((a, i) => blued(...polar(x, y, r * 1.22, (a * Math.PI) / 180).map((v) => +f1(v)), r * 0.36, a, ms + 200 + i * 60)).join("");
    const silver = (x, y, r, ms) => `<circle class="s d" ${dd(ms)} cx="${x}" cy="${y}" r="${r}"/><circle class="s" cx="${x}" cy="${y}" r="${r * 0.45}"/>`;
    let stripes = "";
    for (let x = -1500; x < 1000; x += 46) stripes += `M${x} 1450 L${x + 1500} 0 `;
    const eng = (x, y, t, size, ms, ls = 0.16) =>
      `<text class="mv-eng late" style="--cd:${ms};font-size:${size}px;letter-spacing:${ls}em" transform="translate(${x} ${y}) rotate(-90)" text-anchor="middle">${t}</text>`;
    return `<svg viewBox="0 0 752 860">
      <defs>
        <clipPath id="${id}p"><path d="${plate}"/></clipPath>
        <clipPath id="${id}o"><path d="${frame}"/></clipPath>
        <path id="${id}m" d="M640 690 C700 560 800 420 930 360"/>
      </defs>
      <g transform="translate(${OX} ${OY}) scale(${S})" class="mv">
        <path class="s d" ${dd(0)} d="${frame}" style="stroke-width:1.6"/>
        <g clip-path="url(#${id}o)">
          <circle class="s d" ${dd(500)} cx="690" cy="760" r="120"/>
          <path class="t late" style="--cd:900" d="${gear(690, 760, 112, 64, 10)}"/>
          <path class="t late" style="--cd:950" d="${gear(610, 1010, 62, 15, 14)}"/>
          <path class="s d" ${dd(700)} d="${arc(750, 905, 226, -2.6, 2.6)}" style="stroke-width:1.4"/>
          <path class="t" d="${arc(750, 905, 210, -2.6, 2.6)}"/>
          <path class="t d" pathLength="1" style="--dd:900" d="${spiral(750, 905, 24, 110, 6)}"/>
        </g>
        <path class="mv-plate s d" ${dd(150)} d="${plate}" style="stroke-width:1.3"/>
        <path class="t late" style="--cd:1100" clip-path="url(#${id}p)" d="${stripes}"/>
        <path class="mv-cock s d" ${dd(400)} d="${cock}"/>
        <path class="t late" style="--cd:1200" d="M840 520 C870 470 930 450 990 440 M855 600 C880 540 930 510 990 500 M840 690 C860 620 920 580 990 570"/>
        <path class="s d" ${dd(800)} d="M820 860 C870 820 900 760 880 700 C870 670 900 650 930 660" style="stroke-width:1"/>
        <path class="s d" ${dd(850)} d="M752 905 L742 1110 L735 1110 L740 905" style="stroke-width:1"/>
        <path class="mv-cock s d" ${dd(450)} d="${cock2}"/>
        <path class="t late" style="--cd:1250" d="M800 1300 C850 1260 930 1240 1000 1240 M820 1380 C870 1330 940 1310 1000 1310"/>
        <circle class="s d" ${dd(600)} cx="750" cy="905" r="42"/><circle class="f mv-ruby" cx="750" cy="905" r="12"/>
        <circle class="s d" ${dd(620)} cx="580" cy="1190" r="34"/><circle class="f mv-ruby" cx="580" cy="1190" r="10"/>
        ${chaton(390, 410, 54, [-60, 60, 180], 1000)}${chaton(480, 700, 50, [-90, 30, 150], 1100)}${chaton(380, 910, 46, [0, 180], 1200)}
        <circle class="s d mv-gold" ${dd(1300)} cx="490" cy="1080" r="30"/><circle class="f mv-ruby" cx="490" cy="1080" r="7"/>
        ${blued(80, 120, 42, 0.5, 1400)}${blued(920, 90, 42, 2.3, 1420)}${blued(80, 1290, 40, 1.2, 1440)}${blued(900, 1305, 42, 1.6, 1460)}${blued(950, 550, 38, 0.3, 1480)}
        ${silver(260, 115, 30, 1500)}${silver(870, 245, 28, 1520)}${silver(940, 315, 28, 1540)}${silver(185, 720, 28, 1560)}${silver(30, 800, 20, 1580)}
        <circle class="s d" ${dd(1600)} cx="400" cy="130" r="76"/><circle class="t" cx="400" cy="130" r="58"/><path class="s late" style="--cd:2000" d="M380 100 L430 120 L410 160"/>
        ${eng(112, 760, "A. LANGE &amp; SÖHNE", 64, 1700)}
        ${eng(190, 1010, "Nº 67512", 40, 1750)}
        ${eng(190, 360, "GLASHÜTTE I/SA", 54, 1800)}
        ${eng(285, 860, "DREISSIG (30) RUBINE", 38, 1850)}
        ${eng(565, 255, "REGULIERT IN", 40, 1900)}
        ${eng(620, 255, "FÜNF (5) LAGEN", 40, 1950)}
        <text class="mv-eng late" style="--cd:2000;font-size:34px;letter-spacing:0.18em"><textPath href="#${id}m">MADE IN GERMANY</textPath></text>
        <text class="mv-eng late" style="--cd:2050;font-size:28px;letter-spacing:0.12em" transform="translate(905 470) rotate(-60)">L931.3</text>
      </g>
    </svg>`;
  }

  const DRAW = { dial: (el) => dial(+el.closest(".slide").dataset.act || 0), trace, niton, cabaret, tonneau10, peseux, plan, route, sales, terraluna, cabcal, facade, l931 };
  $$("[data-draw]").forEach((el) => (el.innerHTML = DRAW[el.dataset.draw](el)));

  // An act opens (clock transition, forward only): the minute hand turns once and the hour hand
  // moves on one hour, the power reserve drops a little, and the outsize date jumps to the act's
  // first chapter digit by digit. The final positions are already in the markup.
  document.addEventListener("deck:clock", (e) => {
    const s = e.detail.slide,
      n = +s.dataset.act,
      cur = ACT[n],
      prev = n > 1 ? ACT[n - 1] : ACT_BEFORE;
    if (!cur || reduced) return;
    const opts = (d) => ({ duration: d, delay: 1200, easing: E, fill: "backwards" });
    const turn = (sel, a, b, d) => {
      const el = $(sel, s);
      if (el) el.animate([{ transform: `rotate(${f1(a)}deg)` }, { transform: `rotate(${f1(b)}deg)` }], opts(d));
    };
    turn(".mh", angM(), angM() + 360, 1800);
    turn(".hh", angH(prev.h), angH(prev.h) + 30, 1800);
    turn(".pr-hand", 90 + prev.pr, 90 + cur.pr, 1400);
    const strip = $(".strip", s);
    if (strip && cur.date !== prev.date) {
      const k = cur.date - prev.date,
        h = DIAL.D.h,
        frames = [];
      for (let i = 0; i <= k; i++) frames.push({ transform: `translateY(${-(prev.date + i) * h}px)`, offset: i / k });
      strip.animate(frames, { duration: 360 * k, delay: 1500, easing: "cubic-bezier(.65,0,.35,1)", fill: "backwards" });
    }
  });

  // The small seconds beat once a second on the act slide on screen.
  setInterval(() => {
    const s = state.list[state.i];
    if (reduced || state.overview || !s || s.dataset.kind !== "act") return;
    const h = $(".sh", s);
    if (!h) return;
    const v = ((+h.dataset.sec || 0) + 1) % 60;
    h.dataset.sec = v;
    h.style.transform = `rotate(${v * 6}deg)`;
  }, 1000);

  /* ======================================================== History flight (exploration)
     After the Bixler's deck: every image sits in depth at the centre of the page. Step k flies the
     images of moment k past us while the year runs, then lands the key image (left) with its card
     (right); the last images of the moment stay around it as a frame. Stepping back, jumping in,
     printing or reduced motion show the moment at rest. */
  function initFlight(field) {
    const slide = field.closest(".slide");
    // "panel": the flight stays inside one column of a slide and follows that slide's steps,
    // with no year and no card, only a caption under each key image.
    // "page": the same, but the images fly across the whole slide and only the key image lands
    // in the right column (its centre given by data-stop="x,y", offsets from the slide centre).
    const page = field.dataset.flight === "page";
    const panel = page || field.dataset.flight === "panel";
    const [SX, SY] = (field.dataset.stop || "0,-10").split(",").map(Number);
    const P = panel ? "perspective(1100px) " : "perspective(1400px) ";
    const pose = (x, y, z) => `${P}translate3d(${x}px, ${y}px, ${z}px)`;
    const FAR = -3600,
      NEAR = panel ? 700 : 900,
      GAP = panel ? 200 : 240,
      STOP = panel ? { x: SX, y: SY, w: 540 } : { x: -460, y: -10, w: 600 },
      KEEP = -450,
      KS = 1400 / (1400 - KEEP),
      // two images of each moment stay around its key image
      SLOTS = page
        ? [] // across the page every image flies by; the key image lands alone
        : panel
        ? [
            [SX + 290, SY - 320, 120],
            [SX - 300, SY + 330, 120],
          ]
        : [
            [430, -390, 230],
            [-820, 300, 190],
          ],
      SIZES = page ? [280, 220, 330] : panel ? [200, 160, 240] : [320, 250, 380];
    const YEARS = panel
      ? [...new Set([...field.querySelectorAll("img")].map((i) => +i.dataset.seg))].sort((a, b) => a - b)
      : field.dataset.years.split(",").map(Number);
    const items = [...field.querySelectorAll("img")].map((img, i) => {
      const el = document.createElement("div"),
        frame = document.createElement("div");
      el.className = "fl-item" + (img.classList.contains("piece") ? " piece" : "");
      frame.className = "fl-frame";
      const it = { el, frame, seg: +img.dataset.seg, stop: img.hasAttribute("data-stop"), rest: 0 };
      if (it.stop) {
        Object.assign(it, STOP);
        frame.style.cssText = panel ? `width:${STOP.w}px` : `width:${STOP.w}px;height:${STOP.w}px`;
        if (panel) el.classList.add("stop");
        el.style.zIndex = 150;
      } else {
        const a = i * 2.39996; // golden angle: an even field
        const r = page ? 420 + (i % 3) * 110 : panel ? 220 + (i % 3) * 50 : 430 + (i % 3) * 90;
        it.x = Math.round(Math.cos(a) * r * (page ? 1.45 : panel ? 1 : 1.3));
        it.y = Math.round(Math.sin(a) * r * (page ? 0.8 : panel ? 1.05 : 0.72));
        it.w = img.classList.contains("piece") ? 280 : SIZES[i % 3];
        frame.style.width = it.w + "px";
        frame.style.setProperty("--w", it.w + "px");
        el.style.zIndex = 100 - i;
      }
      img.replaceWith(el);
      frame.appendChild(img);
      el.appendChild(frame);
      return it;
    });
    // The last images before each key moment stay in the frame around it.
    YEARS.forEach((_, k) => {
      items
        .filter((it) => it.seg === k && !it.stop)
        .slice(SLOTS.length ? -SLOTS.length : Infinity)
        .forEach((it, j) => {
          const [X, Y, W] = SLOTS[j];
          Object.assign(it, { keep: true, rest: KEEP, x: Math.round(X / KS), y: Math.round(Y / KS), w: Math.round(W / KS) });
          it.frame.style.cssText = `width:${it.w}px;height:${Math.round(it.w * 1.15)}px`;
          it.el.style.zIndex = 140;
        });
    });
    const cards = [...slide.querySelectorAll(panel ? ".fl-cap" : ".fl-card")],
      center = panel ? null : $(".fl-center", slide),
      yearEl = panel ? null : $(".fl-year", slide),
      marks = [...slide.querySelectorAll(".fl-years li")];
    let timers = [],
      raf = 0;
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const stopAll = () => {
      timers.forEach(clearTimeout);
      timers = [];
      cancelAnimationFrame(raf);
      items.forEach((it) => it.el.getAnimations().forEach((a) => a.cancel()));
    };
    const place = (it, z, o) => {
      it.el.style.transform = pose(it.x, it.y, z);
      it.el.style.opacity = o;
    };
    const keyOf = (k) => items.filter((it) => it.seg === k && (it.stop || it.keep));
    const showCard = (k, on) => cards.forEach((c) => c.classList.toggle("shown", on && +c.dataset.seg === k));
    const mark = (k) => marks.forEach((m, j) => m.classList.toggle("on", j === k));
    function still(k) {
      stopAll();
      items.forEach((it) => place(it, FAR, 0));
      keyOf(k).forEach((it) => place(it, it.rest, 1));
      showCard(k, true);
      if (yearEl) yearEl.textContent = YEARS[k];
      if (center) center.classList.add("off");
      mark(k);
    }
    function runYear(from, to, ms) {
      const t0 = performance.now();
      const tick = (now) => {
        const f = Math.min(1, Math.max(0, (now - t0) / ms));
        yearEl.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - f, 2)));
        if (f < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    function play(k) {
      if (k > 0) still(k - 1);
      else {
        stopAll();
        items.forEach((it) => place(it, FAR, 0));
        cards.forEach((c) => c.classList.remove("shown"));
      }
      showCard(k - 1, false);
      keyOf(k - 1).forEach((it, j) =>
        it.el.animate(
          [{ transform: pose(it.x, it.y, it.rest), opacity: 1 }, { opacity: 1, offset: 0.55 }, { transform: pose(it.x, it.y, NEAR), opacity: 0 }],
          { duration: 1000, delay: j * 40, easing: "cubic-bezier(.5,0,.9,.6)", fill: "both" },
        ),
      );
      const passing = items.filter((it) => it.seg === k && !it.stop && !it.keep);
      passing.forEach((it, j) =>
        it.el.animate(
          [{ transform: pose(it.x, it.y, FAR), opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 1, offset: 0.85 }, { transform: pose(it.x, it.y, 800), opacity: 0 }],
          { duration: 2600, delay: 250 + j * GAP, fill: "both" },
        ),
      );
      const land = 250 + passing.length * GAP + 400;
      const keys = keyOf(k);
      keys.forEach((it, j) =>
        it.el.animate(
          [{ transform: pose(it.x, it.y, FAR), opacity: 0 }, { opacity: 1, offset: 0.25 }, { transform: pose(it.x, it.y, it.rest), opacity: 1 }],
          { duration: it.stop ? 2200 : 2500, delay: land + j * GAP, easing: "cubic-bezier(.16,1,.3,1)", fill: "both" },
        ),
      );
      const settled = land + (keys.length - 1) * GAP + 1400;
      if (center) center.classList.remove("off");
      if (yearEl) {
        yearEl.textContent = YEARS[Math.max(0, k - 1)];
        runYear(YEARS[Math.max(0, k - 1)], YEARS[k], settled);
      }
      mark(k);
      const stopAt = land + (keys.length - 1) * GAP;
      if (center) later(() => center.classList.add("off"), stopAt + 700);
      later(() => showCard(k, true), stopAt + 1300);
    }
    still(0);
    let lastSlide = null,
      lastIndex = -1,
      lastStep = 0;
    document.addEventListener("deck:step", (e) => {
      const { slide: s, index, step } = e.detail;
      const entering = s !== lastSlide;
      const forward = entering ? index > lastIndex : step === lastStep + 1;
      if (s === slide) {
        if (reduced || !forward || (entering && step !== 0)) still(step);
        else play(step);
      } else if (lastSlide === slide) stopAll();
      lastSlide = s;
      lastIndex = index;
      lastStep = step;
    });
    addEventListener("beforeprint", () => still(YEARS.length - 1));
  }
  $$("[data-flight]").forEach(initFlight);

  /* ======================================================== The rewind (slide 05)
     After the Bixler's flight, run backwards in time. Step 0: the year 2027 and the boutique.
     Step 1: the boutique flies past, a cloud of archive images streams by while the year runs
     back, fast then slowing, to 1927, and the newspaper of 6 May 1927 lands. Step 2: the
     tagline (CSS, .s2). Stepping back, jumping in, printing or reduced motion show each step
     at rest.
       <div class="rw" data-rewind="2027,1927"> img[data-role="start"] · img[data-year] … ·
       img[data-role="end"] </div>  + .rw-yearbox > .rw-year in the slide */
  function initRewind(field) {
    const slide = field.closest(".slide");
    const [FROM, TO] = field.dataset.rewind.split(",").map(Number);
    const P = "perspective(1400px) ";
    const pose = (x, y, z) => `${P}translate3d(${x}px, ${y}px, ${z}px)`;
    const FAR = -3800,
      NEAR = 900,
      GAP = +field.dataset.gap || 190,
      SIZES = [300, 230, 340];
    let j = 0;
    const items = [...field.querySelectorAll("img")].map((img) => {
      const el = document.createElement("div"),
        frame = document.createElement("div");
      const role = img.dataset.role || "pass";
      el.className = "fl-item rw-" + role;
      frame.className = "fl-frame";
      const it = { el, role };
      if (role === "start") Object.assign(it, { x: 0, y: -40, w: 1180 });
      else if (role === "end") Object.assign(it, { x: 0, y: -10, w: 600 });
      else {
        const a = j * 2.39996,
          r = 420 + (j % 3) * 120;
        Object.assign(it, { x: Math.round(Math.cos(a) * r * 1.5), y: Math.round(Math.sin(a) * r * 0.78), w: SIZES[j % 3] });
        j++;
      }
      frame.style.width = it.w + "px";
      el.style.zIndex = role === "pass" ? 100 - j : 150;
      img.replaceWith(el);
      frame.appendChild(img);
      if (img.dataset.year) {
        const y = document.createElement("span");
        y.className = "rw-tag-year num";
        y.textContent = img.dataset.year;
        frame.appendChild(y);
      }
      el.appendChild(frame);
      return it;
    });
    const start = items.find((it) => it.role === "start"),
      end = items.find((it) => it.role === "end"),
      passing = items.filter((it) => it.role === "pass");
    const yearEl = $(".rw-year", slide);
    let timers = [],
      raf = 0;
    const stopAll = () => {
      timers.forEach(clearTimeout);
      timers = [];
      cancelAnimationFrame(raf);
      items.forEach((it) => it.el.getAnimations().forEach((a) => a.cancel()));
    };
    const place = (it, z, o) => {
      it.el.style.transform = pose(it.x, it.y, z);
      it.el.style.opacity = o;
    };
    const phase = (p) => ["rw-at-start", "rw-flying", "rw-at-end"].forEach((c, i) => slide.classList.toggle(c, i === p));
    function still(step) {
      stopAll();
      items.forEach((it) => place(it, FAR, 0));
      if (step === 0) {
        place(start, 0, 1);
        yearEl.textContent = FROM;
        phase(0);
      } else {
        place(end, 0, 1);
        yearEl.textContent = TO;
        phase(2);
      }
    }
    // fast at first, slowing into the arrival year
    const ease = (f) => 1 - Math.pow(1 - f, 3);
    function play() {
      still(0);
      phase(1);
      start.el.animate(
        [{ transform: pose(start.x, start.y, 0), opacity: 1 }, { opacity: 1, offset: 0.4 }, { transform: pose(start.x, start.y, NEAR), opacity: 0 }],
        { duration: 1100, easing: "cubic-bezier(.5,0,.9,.6)", fill: "both" },
      );
      passing.forEach((it, i) =>
        it.el.animate(
          [{ transform: pose(it.x, it.y, FAR), opacity: 0 }, { opacity: 1, offset: 0.14 }, { opacity: 1, offset: 0.82 }, { transform: pose(it.x, it.y, NEAR), opacity: 0 }],
          { duration: 2500, delay: 350 + i * GAP, fill: "both" },
        ),
      );
      const land = 350 + passing.length * GAP + 300;
      end.el.animate(
        [{ transform: pose(end.x, end.y, FAR), opacity: 0 }, { opacity: 1, offset: 0.25 }, { transform: pose(end.x, end.y, 0), opacity: 1 }],
        { duration: 2300, delay: land, easing: "cubic-bezier(.16,1,.3,1)", fill: "both" },
      );
      const total = land + 1500,
        t0 = performance.now();
      const tick = (now) => {
        const f = Math.min(1, Math.max(0, (now - t0 - 300) / total));
        yearEl.textContent = Math.round(FROM + (TO - FROM) * ease(f));
        if (f < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      timers.push(setTimeout(() => phase(2), land + 1600));
    }
    still(0);
    let lastSlide = null,
      lastIndex = -1,
      lastStep = 0;
    document.addEventListener("deck:step", (e) => {
      const { slide: s, index, step } = e.detail;
      const entering = s !== lastSlide;
      const forward = !entering && step === lastStep + 1;
      if (s === slide) {
        if (step === 1 && forward && !reduced) play();
        else if (!(step === 2 && forward)) still(step);
      } else if (lastSlide === slide) stopAll();
      lastSlide = s;
      lastIndex = index;
      lastStep = step;
    });
    addEventListener("beforeprint", () => still(2));
  }
  $$("[data-rewind]").forEach(initRewind);

  /* Slideshow: the images of [data-slideshow] cross-fade in turn while their slide is on
     screen (every data-slideshow ms, default 2600). */
  $$("[data-slideshow]").forEach((box) => {
    const imgs = $$("img", box),
      every = +box.dataset.slideshow || 2600;
    let i = 0;
    imgs.forEach((im, j) => im.classList.toggle("on", j === 0));
    setInterval(() => {
      const s = state.list[state.i];
      if (reduced || !s || !s.contains(box)) return;
      imgs[i].classList.remove("on");
      i = (i + 1) % imgs.length;
      imgs[i].classList.add("on");
    }, every);
  });

  /* Highlighted document: a page with one or more passages framed and the rest veiled.
       <div class="docmark" data-size="1721,2600" data-marks="x,y,w,h;x,y,w,h"><img></div>
     Marks are in the source image's pixels. */
  $$(".docmark").forEach((box) => {
    const [W, H] = box.dataset.size.split(",").map(Number);
    const marks = box.dataset.marks.split(";").map((m) => m.split(",").map(Number));
    const id = `dm${uid++}`;
    const holes = marks.map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#000"/>`).join("");
    const frames = marks.map(([x, y, w, h]) => `<rect class="dm-frame" x="${x}" y="${y}" width="${w}" height="${h}"/>`).join("");
    box.insertAdjacentHTML(
      "beforeend",
      `<svg class="dm-veil" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><mask id="${id}"><rect width="${W}" height="${H}" fill="#fff"/>${holes}</mask><rect class="dm-fog" width="${W}" height="${H}" mask="url(#${id})"/>${frames}</svg>`,
    );
  });

  /* 11 · 1936: the entry runs from the foot of one column to the head of the next. Its two
     halves first sit on the page, then come together in one large block (.s1, styles.css).
     --from puts each half back on the page. The page is drawn at PAGE (styles.css,
     .m5-doc .docmark); the halves at SC screen px per source px. */
  $$(".m5-merge").forEach((m) => {
    const box = $(".docmark", m.closest(".m5-doc"));
    const W = +box.dataset.size.split(",")[0];
    const PAGE = { x: 111, y: 0, w: 529 },
      k = PAGE.w / W,
      SC = 752 / 765;
    let y = 310;
    $$(".m5-part", m).forEach((im) => {
      const [x0, y0, x1, y1] = im.dataset.crop.split(",").map(Number);
      const w = (x1 - x0) * SC,
        h = (y1 - y0) * SC,
        left = (752 - w) / 2,
        top = y;
      y += h + 2;
      Object.assign(im.style, { left: `${f1(left)}px`, top: `${f1(top)}px`, width: `${f1(w)}px`, height: `${f1(h)}px` });
      im.style.setProperty("--from", `translate(${f1(PAGE.x + x0 * k - left)}px, ${f1(PAGE.y + y0 * k - top)}px) scale(${(k / SC).toFixed(4)})`);
    });
  });

  /* ======================================================== State and steps */

  const state = { list: ALL, i: 0, step: 0, overview: false, sel: 0, end: null };

  function stepsOf(v) {
    return String(v ?? "")
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((x) => +x || 0);
  }
  function countSteps() {
    ALL.forEach((s) => {
      const nums = $$("[data-step],[data-only]", s)
        .filter((e) => !e.closest("[data-arb-off]"))
        .flatMap((e) => stepsOf(e.dataset.step ?? e.dataset.only));
      s._steps = Math.max(+s.dataset.steps || 0, 0, ...nums);
    });
  }
  countSteps();

  function applyStep(s, step) {
    s.style.setProperty("--step", step);
    // .s1, .s2 … on the slide itself, for effects that span several elements
    for (let k = 1; k <= s._steps; k++) s.classList.toggle("s" + k, step >= k);
    $$("[data-step]", s).forEach((e) => {
      const k = +e.dataset.step;
      e.classList.toggle("on", step >= k);
      e.classList.toggle("at", step === k);
      e.classList.toggle("past", step > k);
    });
    $$("[data-only]", s).forEach((e) => e.classList.toggle("on", stepsOf(e.dataset.only).includes(step)));
  }

  /* ======================================================== Transitions */

  function finish() {
    if (state.end) state.end();
  }

  function transition(from, to, type, back) {
    finish();
    if (type === "film") type = "fade";
    if (reduced && type !== "none") type = "fade";
    if (back && !["pan", "none", "fade"].includes(type)) type = "fade";
    if (from) {
      from.classList.remove("is-active");
      from.classList.add("is-leaving");
    }
    to.classList.add("is-active");
    if (!from || type === "none") {
      if (from) from.classList.remove("is-leaving");
      return;
    }

    const anims = [];
    const A = (el, kf, d, e = IO, delay = 0) =>
      anims.push(el.animate(kf, { duration: d, easing: e, delay, fill: "both" }));

    if (type === "pan") {
      const dir = back ? -1 : 1,
        D = 1200;
      A(from, [{ transform: "translateX(0)" }, { transform: `translateX(${-100 * dir}%)` }], D);
      A(to, [{ transform: `translateX(${100 * dir}%)` }, { transform: "translateX(0)" }], D);
      // Depth: positive layers travel further (foreground), negative ones lag (background).
      $$("[data-depth]", from).forEach((el) =>
        A(el, [{ translate: "0 0" }, { translate: `${-dir * +el.dataset.depth * 22}% 0` }], D),
      );
      $$("[data-depth]", to).forEach((el) =>
        A(el, [{ translate: `${dir * +el.dataset.depth * 22}% 0` }, { translate: "0 0" }], D),
      );
      // Images open rather than appear.
      $$("[data-reveal]", to).forEach((el) =>
        A(
          el,
          [{ clipPath: dir > 0 ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }],
          D,
          E,
          200,
        ),
      );
    } else if (type === "fade") {
      A(to, [{ opacity: 0 }, { opacity: 1 }], 900, E);
    } else if (type === "dissolve") {
      // A register page laid over another page.
      A(to, [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], 1100, E);
      A(from, [{ opacity: 1 }, { opacity: 0.35 }], 1100, E);
    } else if (type === "iris") {
      // Pieces and objects: the new slide opens from its centre.
      A(to, [{ clipPath: "circle(0% at 50% 50%)" }, { clipPath: "circle(75% at 50% 50%)" }], 1200, E);
    } else if (type === "clock") {
      // Act openings: the slide fades in, the dial hand advances (driven by the act slide itself).
      A(to, [{ opacity: 0 }, { opacity: 1 }], 900, E);
      document.dispatchEvent(new CustomEvent("deck:clock", { detail: { slide: to, back } }));
    }

    let ended = false;
    state.end = () => {
      if (ended) return;
      ended = true;
      anims.forEach((a) => a.cancel());
      from.classList.remove("is-leaving");
      state.end = null;
    };
    Promise.all(anims.map((a) => a.finished)).then(() => state.end && state.end(), () => {});
  }

  /* ======================================================== Navigation */

  const current = () => $(".slide.is-active", stage);

  function go(index, step = 0, opts = {}) {
    index = Math.max(0, Math.min(state.list.length - 1, index));
    const to = state.list[index];
    finish();
    const from = current();
    if (to === from && !opts.force) {
      setStep(step);
      return;
    }
    loadImages(to);
    // Reset the arriving slide's steps at once, without their own fades.
    to.classList.add("snap");
    applyStep(to, step);
    void to.offsetWidth;
    to.classList.remove("snap");
    const type = opts.instant ? "none" : to.dataset.transition || "pan";
    transition(from === to ? null : from, to, type, !!opts.back);
    state.i = index;
    state.step = step;
    changed();
  }
  function setStep(step) {
    const s = state.list[state.i];
    state.step = Math.max(0, Math.min(s._steps, step));
    applyStep(s, state.step);
    changed();
  }
  function next() {
    const s = state.list[state.i];
    if (state.step < s._steps) setStep(state.step + 1);
    else if (state.i < state.list.length - 1) go(state.i + 1, 0);
  }
  function prev() {
    if (state.step > 0) setStep(state.step - 1);
    else if (state.i > 0) go(state.i - 1, state.list[state.i - 1]._steps, { back: true });
  }

  let lastSlide = null;
  function changed() {
    const s = state.list[state.i];
    loadImages(state.list[state.i + 1]);
    try {
      history.replaceState(null, "", location.search + "#" + s.id);
    } catch (e) {
      /* file:// */
    }
    $("#live").textContent = s.dataset.label;
    if (!state.overview) relist(false, s); // a hidden slide opened on purpose leaves the list again once left
    const H = (T.meta && T.meta.hud) || {};
    $("#hudCount").textContent = `${pad(state.i + 1)} / ${pad(state.list.length)}`;
    $("#hudTitle").textContent =
      s.dataset.label + (s._steps ? ` · ${tpl(H.step, { n: state.step, total: s._steps })}` : "");
    root.style.setProperty("--p", state.list.length > 1 ? state.i / (state.list.length - 1) : 0);
    renderNotes();
    const detail = { slide: s, index: state.i, step: state.step };
    if (s !== lastSlide) {
      lastSlide = s;
      document.dispatchEvent(new CustomEvent("deck:slide", { detail }));
    }
    document.dispatchEvent(new CustomEvent("deck:step", { detail }));
  }

  /* ======================================================== Contents (overview grid) */

  function tile(k) {
    const cols = 4,
      gap = 40,
      sc = (1920 - gap * (cols + 1)) / cols / 1920;
    const rows = Math.ceil(state.list.length / cols),
      w = 1920 * sc,
      h = 1080 * sc;
    const top = Math.max(gap, (1080 - (rows * h + (rows - 1) * gap)) / 2);
    return `translate(${f1(gap + (k % cols) * (w + gap))}px, ${f1(top + Math.floor(k / cols) * (h + gap))}px) scale(${sc.toFixed(4)})`;
  }
  function markSel() {
    state.list.forEach((el, k) => el.classList.toggle("sel", k === state.sel));
  }
  function overview(on = !state.overview, pick) {
    finish();
    if (on) {
      if (state.overview) return;
      relist(true); // every slide gets its place, the hidden ones veiled
      before = new Set(hidden);
      state.overview = true;
      state.sel = state.i;
      stage.classList.add("overview", "ov-move");
      state.list.forEach((el, k) => {
        loadImages(el);
        applyStep(el, el._steps);
        el.style.transform = tile(k);
      });
      markSel();
      follow();
      return;
    }
    if (!state.overview) return;
    const target = state.list[pick ?? state.i];
    const fromT = tile(state.list.indexOf(target));
    state.overview = false;
    stage.classList.remove("overview");
    scrollOv(0, true);
    state.list.forEach((el) => {
      el.style.transform = "";
      el.classList.remove("sel");
      if (el !== target) applyStep(el, 0);
    });
    const was = current();
    relist(false, target);
    if (target !== was) go(state.list.indexOf(target), 0, { instant: true });
    else {
      applyStep(target, state.step);
      changed();
    }
    if (!reduced) target.animate([{ transform: fromT }, { transform: "none" }], { duration: 650, easing: E });
    setTimeout(() => stage.classList.remove("ov-move"), 700);
  }

  /* The overview is taller than the screen (4 columns, 13 rows): the wheel moves it up and down,
     and it follows the selected slide. --ovy is in slide pixels. */
  let ovy = 0;
  function ovSpan() {
    const h = (1080 * (1920 - 40 * 5)) / 4 / 1920,
      rows = Math.ceil(state.list.length / 4),
      top = Math.max(40, (1080 - (rows * h + (rows - 1) * 40)) / 2);
    return { h, top, bottom: top + rows * h + (rows - 1) * 40 };
  }
  function ovView() {
    const k = parseFloat(getComputedStyle(root).getPropertyValue("--scale")) || 1;
    return { k, t: (innerHeight - 1080 * k) / 2, a: 64 + 20, b: innerHeight - 24 };
  }
  function scrollOv(v, reset) {
    if (reset) ovy = 0;
    else {
      const { top, bottom } = ovSpan(),
        { k, t, a, b } = ovView();
      const hi = (a - t) / k - top, // the first row just under the bar
        lo = (b - t) / k - bottom; // the last row at the foot of the window
      ovy = lo >= hi ? (lo + hi) / 2 : Math.min(Math.max(v, lo), hi);
    }
    stage.style.setProperty("--ovy", `${f1(ovy)}px`);
  }
  function follow() {
    const { h, top } = ovSpan(),
      { k, t, a, b } = ovView(),
      row = top + Math.floor(state.sel / 4) * (h + 40),
      at = t + (row + ovy) * k;
    if (at < a || at + h * k > b) scrollOv(((a + b) / 2 - t) / k - row - h / 2);
    else scrollOv(ovy);
  }
  addEventListener("wheel", (e) => state.overview && scrollOv(ovy - e.deltaY / ovView().k), { passive: true });

  /* ======================================================== Slides to present (in the overview)
     Each slide carries a tick: an unticked slide is left out of the presentation (the arrows skip
     it) and of the PDF. Click a slide or press H to tick or untick it; double-click or Enter opens
     it. The choice stays in this browser. */
  const HKEY = "als-hidden";
  let hidden = new Set();
  try {
    hidden = new Set(JSON.parse(localStorage.getItem(HKEY) || "[]").filter((id) => ALL.some((s) => s.id === id)));
  } catch (e) {
    /* storage unavailable: everything shows */
  }
  let before = null; // the ticks as they were when the overview opened, for Cancel
  const shown = (s) => !hidden.has(s.id);
  function relist(all, keep = state.list[state.i]) {
    state.list = all ? ALL.slice() : ALL.filter((s) => shown(s) || s === keep);
    state.i = Math.max(0, state.list.indexOf(keep));
  }
  const picks = $(".picks");
  ALL.forEach((s) => s.insertAdjacentHTML("beforeend", '<button type="button" class="pick" aria-pressed="true"></button>'));
  function marks() {
    const P = (T.meta && T.meta.picks) || {};
    ALL.forEach((s) => {
      s.classList.toggle("skip", !shown(s));
      const b = $(".pick", s);
      b.setAttribute("aria-pressed", String(shown(s)));
      b.setAttribute("aria-label", P.tick || "");
    });
    root.style.setProperty("--hidden-label", JSON.stringify(P.hidden || ""));
    // the bar's text comes from our own content files
    picks.innerHTML =
      `<span class="picks-t">${P.title || ""}</span>` +
      `<span class="picks-n">${tpl(P.count, { on: ALL.filter(shown).length, all: ALL.length })}</span>` +
      `<span class="picks-b">${hidden.size ? `<button type="button" data-all>${P.all}</button>` : ""}` +
      `<button type="button" data-cancel>${P.cancel}</button><button type="button" data-done>${P.done}</button></span>`;
  }
  function saveHidden() {
    try {
      localStorage.setItem(HKEY, JSON.stringify([...hidden]));
    } catch (e) {
      /* storage unavailable */
    }
    marks();
  }
  function toggleShown(s) {
    if (!s) return;
    if (shown(s)) {
      if (ALL.filter(shown).length > 1) hidden.add(s.id);
    } else hidden.delete(s.id);
    saveHidden();
  }
  function cancelPicks() {
    if (before) hidden = new Set(before);
    saveHidden();
  }
  picks.addEventListener("click", (e) => {
    if (e.target.closest("[data-done]")) overview(false);
    if (e.target.closest("[data-cancel]")) {
      cancelPicks();
      overview(false);
    }
    if (e.target.closest("[data-all]")) {
      hidden.clear();
      saveHidden();
    }
  });

  // Go to a slide by id, even one left out of the presentation (it joins the list while shown).
  function goId(id, step = 0, opts = {}) {
    const s = ALL.find((x) => x.id === id);
    if (!s) return;
    if (state.overview) overview(false);
    if (!state.list.includes(s)) {
      const cur = state.list[state.i];
      state.list = ALL.filter((x) => shown(x) || x === s || x === cur);
      state.i = state.list.indexOf(cur);
    }
    go(state.list.indexOf(s), step, opts);
  }
  const restart = () => {
    if (state.overview) overview(false);
    go(0, 0);
  };
  const toAnnexes = () => goId("annexes");

  /* ======================================================== Presenter notes (key n) */

  let notesWin = null,
    notesT0 = 0;
  const NOTES_HTML = `<!doctype html><html><head><meta charset="utf-8"><title></title>
<style>
  body { margin: 0; padding: 36px 44px 104px; background: #F5F2EB; color: #14120F; font: 400 22px/1.55 "Cormorant Garamond", Garamond, serif; }
  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; padding-bottom: 18px; border-bottom: 1px solid #6E5A3A; }
  #cur { font: 400 40px/1.1 "Cormorant Garamond", Garamond, serif; }
  #step, #time, footer, button { font-family: "Archivo", "Helvetica Neue", Arial, sans-serif; }
  #step { margin-top: 10px; font-size: 12px; letter-spacing: .18em; text-transform: uppercase; color: rgba(20,18,15,.55); }
  #time { font-size: 28px; font-variant-numeric: tabular-nums; color: #6E5A3A; }
  #notes { margin-top: 26px; max-width: 46em; font-size: 24px; } #notes p { margin: 0 0 16px; }
  footer { position: fixed; left: 44px; right: 44px; bottom: 28px; display: flex; justify-content: space-between; align-items: center; gap: 16px; font-size: 13px; letter-spacing: .06em; color: rgba(20,18,15,.55); }
  button { background: none; border: 1px solid rgba(20,18,15,.25); color: #14120F; font-size: 12px; letter-spacing: .16em; text-transform: uppercase; padding: 12px 18px; cursor: pointer; }
</style></head><body>
<header><div><div id="cur"></div><div id="step"></div></div><div id="time">00:00</div></header>
<div id="notes"></div>
<footer><span id="next"></span><span><button id="pv" type="button"></button> <button id="nx" type="button"></button></span></footer>
</body></html>`;

  const tpl = (s, o) => String(s || "").replace(/\{(\w+)\}/g, (_, k) => o[k] ?? "");

  function openNotes() {
    if (notesWin && !notesWin.closed) {
      notesWin.focus();
      return;
    }
    notesWin = window.open("", "als-notes", "width=1000,height=700");
    if (!notesWin) {
      // Pop-ups blocked: say so instead of failing silently.
      help.replaceChildren(document.createTextNode(T.meta.notesBlocked));
      toggleHelp(true);
      setTimeout(() => {
        toggleHelp(false);
        renderHelp(); // put the key list back
      }, 4000);
      return;
    }
    notesT0 = Date.now();
    const d = notesWin.document;
    d.open();
    d.write(NOTES_HTML);
    d.close();
    d.title = T.meta.notesTitle;
    d.documentElement.lang = root.lang;
    d.getElementById("pv").textContent = T.meta.notesPrev;
    d.getElementById("nx").textContent = T.meta.notesNextBtn;
    d.addEventListener("keydown", onKey);
    d.getElementById("nx").addEventListener("click", next);
    d.getElementById("pv").addEventListener("click", prev);
    renderNotes();
  }
  function renderNotes() {
    if (!notesWin || notesWin.closed) return;
    const d = notesWin.document,
      s = state.list[state.i],
      nx = state.list[state.i + 1];
    d.getElementById("cur").textContent = s.dataset.label;
    d.getElementById("step").textContent = s._steps
      ? tpl(T.meta.notesStep, { n: state.step, total: s._steps })
      : "";
    const notes = $(".notes", s);
    d.getElementById("notes").replaceChildren(
      ...(notes ? [...notes.children].map((p) => d.importNode(p, true)) : []),
    );
    d.getElementById("next").textContent = nx ? tpl(T.meta.notesNext, { label: nx.dataset.label }) : T.meta.notesEnd;
  }
  setInterval(() => {
    if (!notesWin || notesWin.closed) return;
    const t = Math.floor((Date.now() - notesT0) / 1000);
    notesWin.document.getElementById("time").textContent = `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
  }, 1000);

  /* ======================================================== Input */

  const help = $("#help");
  const toggleHelp = (force) => help.classList.toggle("open", force);
  function fullscreen() {
    const d = document;
    if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
  }

  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (help.classList.contains("open") && (k === "Escape" || k === "?")) {
      toggleHelp(false);
      e.preventDefault();
      return;
    }
    if (state.overview) {
      const move = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 4, ArrowUp: -4 };
      if (k in move) {
        state.sel = Math.max(0, Math.min(state.list.length - 1, state.sel + move[k]));
        markSel();
        follow();
      } else if (k === "Enter" || k === " ") overview(false, state.sel);
      else if (k === "h" || k === "H") toggleShown(state.list[state.sel]);
      else if (k === "Escape") {
        cancelPicks(); // Esc leaves the ticks as they were
        overview(false);
      } else if (k === "o" || k === "O") overview(false);
      else return;
      e.preventDefault();
      return;
    }
    switch (k) {
      case "ArrowRight":
      case "ArrowDown":
      case "PageDown":
      case " ":
      case "Enter":
        next();
        break;
      case "ArrowLeft":
      case "ArrowUp":
      case "PageUp":
      case "Backspace":
        prev();
        break;
      case "Home":
      case "r":
      case "R":
        restart();
        break;
      case "End":
        go(state.list.length - 1, 0);
        break;
      case "o":
      case "O":
      case "Escape":
        overview(true);
        break;
      case "a":
      case "A":
        toAnnexes();
        break;
      case "f":
      case "F":
        fullscreen();
        break;
      case "n":
      case "N":
        openNotes();
        break;
      case "b":
      case "B":
      case ".":
        document.body.classList.toggle("is-black");
        break;
      case "?":
        toggleHelp();
        break;
      default:
        return;
    }
    e.preventDefault();
  }
  addEventListener("keydown", onKey);

  stage.addEventListener("click", (e) => {
    if (state.overview) {
      // a click ticks or unticks the slide (and selects it); a double click opens it
      const s = e.target.closest(".slide");
      if (!s) return;
      state.sel = state.list.indexOf(s);
      markSel();
      toggleShown(s);
      return;
    }
    const to = e.target.closest("[data-go]");
    if (to) return goId(to.dataset.go);
    if (e.target.closest(".slide.annex .folio")) return toAnnexes(); // every annex leads back to its contents
    if (e.target.closest("a, button")) return;
    next();
  });
  stage.addEventListener("dblclick", (e) => {
    const s = state.overview && e.target.closest(".slide");
    if (s) overview(false, state.list.indexOf(s)); // its two clicks have ticked it and back
  });

  let touchX = null;
  stage.addEventListener("touchstart", (e) => (touchX = e.touches[0].clientX), { passive: true });
  stage.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 50) {
      e.preventDefault();
      dx < 0 ? next() : prev();
    }
  });

  addEventListener("hashchange", () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id && id !== state.list[state.i].id) goId(id, 0, { instant: true });
  });

  /* ======================================================== Toolbar (shows while the mouse moves) */

  function switchLang() {
    const other = CFG.LANGS.find((l) => l !== root.lang);
    if (!other) return;
    const u = new URL(location.href);
    u.searchParams.set("lang", other);
    location.href = u.href;
  }
  const ACTIONS = {
    restart,
    overview: () => overview(),
    annexes: toAnnexes,
    notes: () => openNotes(),
    help: () => toggleHelp(),
    lang: switchLang,
    fullscreen,
  };
  $$(".hud button[data-act]").forEach((b) =>
    b.addEventListener("click", () => {
      ACTIONS[b.dataset.act]();
      b.blur();
    }),
  );

  // PDF: the exported deck of the current language (tools/export-pdf.py), or, with slides
  // unticked, only their pages, taken from it in the browser (pdf-lib; export/pages.json says
  // which page is whose). No exported file (the working copy): the browser's print dialog.
  const pdfLink = $('.hud [data-act="pdf"]');
  let lib = null;
  const pdfLib = () =>
    (lib ||= new Promise((ok, no) => {
      const sc = document.createElement("script");
      sc.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js";
      sc.integrity = "sha512-z8IYLHO8bTgFqj+yrPyIJnzBDf7DDhWwiEsk4sY+Oe6J2M+WQequeGS7qioI5vT6rXgVRb4K1UVQC5ER7MKzKQ==";
      sc.crossOrigin = "anonymous";
      sc.onload = () => ok(window.PDFLib);
      sc.onerror = () => {
        lib = null;
        no(new Error("pdf-lib did not load"));
      };
      document.head.append(sc);
    }));
  const saveAs = (href, name) => Object.assign(document.createElement("a"), { href, download: name }).click();
  pdfLink.addEventListener("click", async (e) => {
    e.preventDefault();
    pdfLink.blur();
    if (pdfLink.classList.contains("busy")) return;
    pdfLink.classList.add("busy");
    const name = pdfLink.getAttribute("download");
    try {
      const head = await fetch(pdfLink.href, { method: "HEAD", cache: "no-cache" });
      if (!head.ok) {
        window.print();
        return;
      }
      if (!hidden.size) return saveAs(pdfLink.href, name);
      try {
        const [{ PDFDocument }, map, bytes] = await Promise.all([
          pdfLib(),
          fetch(new URL("pages.json", pdfLink.href), { cache: "no-cache" }).then((r) => r.json()),
          fetch(pdfLink.href).then((r) => r.arrayBuffer()),
        ]);
        const src = await PDFDocument.load(bytes);
        const out = await PDFDocument.create();
        out.setTitle(T.meta.title);
        const pages = ALL.filter(shown).flatMap((s) => map.pages[s.id] || []);
        (await out.copyPages(src, pages)).forEach((pg) => out.addPage(pg));
        const url = URL.createObjectURL(new Blob([await out.save()], { type: "application/pdf" }));
        saveAs(url, name);
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } catch (err) {
        console.warn("PDF of the ticked slides failed, the whole deck instead:", err);
        saveAs(pdfLink.href, name);
      }
    } finally {
      pdfLink.classList.remove("busy");
    }
  });

  let idleTimer,
    overHud = false;
  const hud = $(".hud");
  hud.addEventListener("mouseenter", () => (overHud = true));
  hud.addEventListener("mouseleave", () => (overHud = false));
  function wake() {
    document.body.classList.add("show-hud");
    document.body.classList.remove("idle");
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (overHud || help.classList.contains("open")) return wake();
      document.body.classList.remove("show-hud");
      document.body.classList.add("idle");
    }, 2600);
  }
  addEventListener("mousemove", wake);

  /* ======================================================== Start */

  const fit = () => root.style.setProperty("--scale", Math.min(innerWidth / 1920, innerHeight / 1080));
  addEventListener("resize", fit);
  fit();

  function start() {
    // #id, or #id@step to open a slide at a given step
    const [hid, hstep] = decodeURIComponent(location.hash.slice(1)).split("@");
    const want = ALL.find((s) => s.id === hid);
    relist(false, want); // a link to a hidden slide still opens it
    go(Math.max(0, state.list.indexOf(want)), +hstep || 0, { instant: true, force: true });
    if (PRINT_MODE) {
      preparePrint();
      const imgs = $$("img", stage);
      Promise.all(imgs.map((i) => (i.complete ? 0 : new Promise((r) => (i.onload = i.onerror = r))))).then(
        () => (root.dataset.ready = "print"),
      );
    }
  }
  const fontsReady = document.fonts
    ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))])
    : Promise.resolve();
  Promise.all([loadContent(), fontsReady]).then(start, (err) => {
    console.error("Deck content failed to load", err);
    start();
  });

  window.deck = {
    go: (id, step = 0) => goId(id, step, { instant: true }),
    next,
    prev,
    state,
    reduced,
  };
})();

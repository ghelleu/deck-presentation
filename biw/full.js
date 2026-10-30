/* Full preview · Maison — the bixlers.com header on every slide, page numbers, and the two
   drawn maps (Lehigh Valley, the block around Centre Square). Runs before ../shared/engine.js,
   so the steps inside the drawings are counted by the engine. */
(() => {
  "use strict";
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const f1 = (n) => (+n).toFixed(1);
  const pad = (n) => String(n).padStart(2, "0");
  // Every slide in page order: the deck's list can be narrowed to the slides ticked to present
  // (below), so the pages' own order, not their place in that list, tells forward from back.
  const SLIDES = $$(".slide");
  const order = (s) => SLIDES.indexOf(s);

  // Corner marks: a small logo top-left, the act and page number top-right. No menu.
  // data-nav: "" dark on paper, "photo" white on a photograph, "half" (the rooms) a dark logo on
  // the panel's paper with a white label over the picture on the right; the logo turns white
  // while the picture covers the page (full.css). Slides without data-nav (the cover) get none.
  const LOGO =
    "https://www.bixlers.com/cdn/shop/files/BX_REGIST_LOGO-1785_2025_1.png?v=1755892441&width=800";
  const LOGO_W =
    "https://www.bixlers.com/cdn/shop/files/bx_white_logo.png?v=1781034483&width=800";
  const ACTS = ["", "Heritage", "The Next Chapter", "Location"];
  const NUM = ["", "I", "II", "III"];
  let page = 0;
  $$(".slide").forEach((s) => {
    // Same labels as the engine's counter: acts by numeral, annexes by their short name. The
    // cold open before the cover takes no number, so the pages keep theirs.
    const kind = s.dataset.kind;
    if (kind === "film") return;
    const no =
      kind === "act"
        ? NUM[s.dataset.act]
        : kind === "annex"
          ? s.dataset.short
          : pad(page++);
    const nav = s.dataset.nav;
    if (nav == null) return;
    const act = +s.dataset.act || 0;
    // (a page may name its own section: the book, book.html)
    const where =
      s.dataset.where ||
      (kind === "annex" ? "Annex" : `${NUM[act]} · ${ACTS[act]}`);
    const half = nav.includes("half"),
      whiteLogo = nav.includes("photo");
    const cls = ["folio", whiteLogo && "on-photo", half && "half"]
      .filter(Boolean)
      .join(" ");
    // on an annex page the corner label leads back to the annex contents (also A, anywhere)
    const label = `${where}${kind === "act" ? "" : `<b>${no}</b>`}`;
    const corner =
      kind === "annex" && no
        ? `<button type="button" class="where to-index" title="Annex contents (A)" aria-label="Back to the annex contents"><svg viewBox="0 0 12 12" aria-hidden="true"><rect x="1" y="1" width="4" height="4"/><rect x="7" y="1" width="4" height="4"/><rect x="1" y="7" width="4" height="4"/><rect x="7" y="7" width="4" height="4"/></svg>${label}</button>`
        : `<span class="where">${label}</span>`;
    s.insertAdjacentHTML(
      "afterbegin",
      `<div class="${cls}"><span class="logo"><img src="${whiteLogo ? LOGO_W : LOGO}" alt="Bixler's">${half ? `<img class="w" src="${LOGO_W}" alt="">` : ""}</span>${corner}</div>`,
    );
  });

  // Smooth line through points (Catmull-Rom to cubic Bézier).
  function smooth(pts) {
    let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i],
        p1 = pts[i],
        p2 = pts[i + 1],
        p3 = pts[i + 2] || p2;
      d += ` C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
    }
    return d;
  }

  // Lehigh Valley: simple projection of real coordinates into a 1000 × 900 box.
  function map() {
    const P = (lon, lat) => [(lon + 75.8) * 480, (41.1 - lat) * 632];
    const E = P(-75.21, 40.69),
      B = P(-75.37, 40.63),
      A = P(-75.49, 40.61),
      N = P(-74.01, 40.71),
      F = P(-75.17, 39.95);
    const delaware = smooth(
      [
        [-75.0, 41.1],
        [-75.13, 40.95],
        [-75.19, 40.76],
        [-75.21, 40.69],
        [-75.07, 40.56],
        [-74.95, 40.4],
        [-74.77, 40.22],
        [-74.92, 40.07],
        [-75.13, 39.95],
        [-75.32, 39.84],
      ].map((p) => P(...p)),
    );
    const lehigh = smooth(
      [
        [-75.21, 40.69],
        [-75.36, 40.62],
        [-75.47, 40.6],
        [-75.6, 40.7],
        [-75.75, 40.84],
      ].map((p) => P(...p)),
    );
    let grat = "";
    for (let lon = -75.75; lon <= -73.8; lon += 0.25) {
      const x = f1(P(lon, 0)[0]);
      grat += `<line class="grat" x1="${x}" y1="0" x2="${x}" y2="900" vector-effect="non-scaling-stroke"/>`;
    }
    for (let lat = 41; lat >= 39.7; lat -= 0.25) {
      const y = f1(P(-75, lat)[1]);
      grat += `<line class="grat" x1="0" y1="${y}" x2="1000" y2="${y}" vector-effect="non-scaling-stroke"/>`;
    }
    const xy = (p) => `${f1(p[0])} ${f1(p[1])}`;
    return `<svg viewBox="0 0 1000 900">
      <g class="map-g">
        ${grat}
        <path class="river d" pathLength="1" d="${delaware}" vector-effect="non-scaling-stroke"/>
        <path class="river d" pathLength="1" d="${lehigh}" vector-effect="non-scaling-stroke" style="--dd:300"/>
        <path class="route" d="M${xy(E)} Q${f1((E[0] + N[0]) / 2)} ${f1(E[1] - 150)} ${xy(N)}" vector-effect="non-scaling-stroke"/>
        <path class="route" d="M${xy(E)} Q${f1(E[0] + 190)} ${f1((E[1] + F[1]) / 2)} ${xy(F)}" vector-effect="non-scaling-stroke"/>
        <circle class="city" cx="${f1(N[0])}" cy="${f1(N[1])}" r="6"/>
        <circle class="city" cx="${f1(F[0])}" cy="${f1(F[1])}" r="6"/>
        <circle class="city" cx="${f1(A[0])}" cy="${f1(A[1])}" r="4"/>
        <circle class="city" cx="${f1(B[0])}" cy="${f1(B[1])}" r="4"/>
        <circle class="home-ring" cx="${f1(E[0])}" cy="${f1(E[1])}" r="12" vector-effect="non-scaling-stroke"/>
        <circle class="home" cx="${f1(E[0])}" cy="${f1(E[1])}" r="7"/>
      </g>
      <g class="map-labels">
        <text class="lbl-serif" x="${f1(E[0] + 22)}" y="${f1(E[1] + 10)}">Easton</text>
        <text class="lbl" x="${f1(N[0] - 14)}" y="${f1(N[1] - 22)}" text-anchor="end">New York</text>
        <text class="lbl" x="${f1(F[0] + 20)}" y="${f1(F[1] + 6)}">Philadelphia</text>
        <text class="lbl-s" x="${f1(A[0] - 12)}" y="${f1(A[1] + 30)}" text-anchor="end">Allentown</text>
        <text class="lbl-s" x="${f1(B[0] + 2)}" y="${f1(B[1] + 34)}" text-anchor="middle">Bethlehem</text>
        <text class="lbl-serif" x="60" y="150" style="font-size:40px">Lehigh Valley</text>
        <text class="lbl-s" x="20" y="888">Within easy reach of New York and Philadelphia</text>
      </g>
      <g class="map-down">
        <text class="lbl-serif" x="530" y="436" style="font-size:44px">Downtown Easton</text>
        <text class="lbl-s" x="532" y="474">Where the Delaware</text>
        <text class="lbl-s" x="532" y="496">and Lehigh rivers meet</text>
      </g>
    </svg>`;
  }

  // Why here: the block around Centre Square as a flat map, drawn by assets/map/flatmap.py from the
  // OpenStreetMap data the film's Blender site is built on (streets, building outlines, the island,
  // trees). Everything highlighted is drawn here over it, in the same metres (x east, y north, origin
  // the centre of the square), on the real footprints. TOP mirrors the script's FRAME: change both.
  // On the valley page it follows the map's zoom, so its reasons come after data-base steps; each
  // reason lights up on its own while the map steps back (full.css).
  const TOP = { x0: -280, y0: 187, k: 1000 / 360 };
  const tx = (x) => f1((x - TOP.x0) * TOP.k);
  const ty = (y) => f1((TOP.y0 - y) * TOP.k);
  const at = (x, y, dy = 0) => `x="${tx(x)}" y="${f1(+ty(y) + dy)}"`;
  const path = (pts, z = "") =>
    "M" + pts.map(([x, y]) => `${tx(x)} ${ty(y)}`).join(" L") + z;
  const HOUSE = [
    [-217.2, 96.4],
    [-183.9, 98.5],
    [-182.5, 73.0],
    [-216.1, 71.3],
  ]; // the former Easton Express, 30 N 4th St (OSM)
  const POLICE = [
    [-251.3, 114.3],
    [-206.0, 116.9],
    [-185.2, 118.2],
    [-183.9, 98.5],
    [-217.2, 96.4],
    [-226.9, 95.8],
    [-250.2, 94.3],
  ]; // 48 N 4th St (OSM), sharing the house's north wall
  const GARAGE = [
    [-95.8, 79.1],
    [-165.3, 74.8],
    [-167.6, 114.6],
    [-98.3, 117.9],
  ]; // 4th Street Garage
  const CLOCK_OLD = [-19, -46.6]; // in front of the Alpha Building's arches (as site.py)
  const CLOCK_NEW = [-179.76, 72.34]; // on the pavement at the house's Church St corner (as site.py)
  const PLAQUE = [-159, -23]; // South 4th and Northampton: the corner is to confirm
  const MARKET = [-112.1, 40.9]; // Easton Public Market, 325 Northampton St (OSM way 223767946)
  const THEATRE = [-271.8, 20.6]; // State Theatre Center for the Arts, 453 Northampton St (OSM 352628294)
  function block(o = {}) {
    const st = (n) => n + (+o.base || 0);
    const [ox, oy] = [+tx(CLOCK_OLD[0]), +ty(CLOCK_OLD[1])];
    const [nx, ny] = [+tx(CLOCK_NEW[0]), +ty(CLOCK_NEW[1])];
    // the clock's move: a gentle arc bowed north-east, clear of the street names
    const [cx, cy] = [
      (ox + nx) / 2 + 0.16 * (ny - oy) * -1,
      (oy + ny) / 2 + 0.16 * (nx - ox),
    ];
    const move = `M${f1(ox)} ${f1(oy)} Q${f1(cx)} ${f1(cy)} ${f1(nx)} ${f1(ny)}`;
    return `<svg viewBox="0 0 1000 900" class="block">
      <defs>
        <filter id="top-soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="28"/></filter>
        <mask id="top-fade" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="900">
          <rect x="44" y="44" width="912" height="812" fill="#fff" filter="url(#top-soft)"/>
        </mask>
      </defs>
      <image class="base" href="img/why-here-map.svg" width="1000" height="900" mask="url(#top-fade)"/>
      <text class="lbl-st" ${at(-100, -8.5, 4)} text-anchor="middle" transform="rotate(-3.8 ${tx(-100)} ${ty(-8.5)})">Northampton Street</text>
      <text class="lbl-st" ${at(-165.5, 30, 4)} text-anchor="middle" transform="rotate(-94 ${tx(-165.5)} ${ty(30)})">North 4th Street</text>
      <text class="lbl-s" ${at(-28, 31.5)} text-anchor="end">Centre Square</text>
      <g class="why fade" data-only="${st(3)}">
        <path class="lot-f" d="${path(POLICE, "Z")}"/>
        <text class="lbl-s" ${at(-218, 118.2, -14)} text-anchor="middle">Police station</text>
        <path class="lot-f" d="${path(GARAGE, "Z")}"/>
        <text class="lbl-serif" ${at(-131.7, 96.4, 12)} text-anchor="middle" style="font-size:64px;font-style:normal">P</text>
        <text class="lbl-s" ${at(-131.7, 96.4, 42)} text-anchor="middle">Secure parking</text>
      </g>
      <g class="why fade" data-only="${st(2)}">
        <circle class="ring-sq" cx="${tx(0)}" cy="${ty(0)}" r="${f1(42 * TOP.k)}"/>
        <circle class="pin pin-a" cx="${tx(THEATRE[0])}" cy="${ty(THEATRE[1])}" r="8"/>
        <text class="lbl-s" ${at(THEATRE[0] + 9, THEATRE[1], 5)}>State Theatre</text>
        <circle class="pin pin-a" cx="${tx(MARKET[0])}" cy="${ty(MARKET[1])}" r="8"/>
        <text class="lbl-s" ${at(MARKET[0], MARKET[1], -20)} text-anchor="middle">Public Market</text>
      </g>
      <g class="why fade" data-only="${st(1)}">
        <circle class="pin pin-a" cx="${tx(PLAQUE[0])}" cy="${ty(PLAQUE[1])}" r="10"/>
        <text class="lbl-s" ${at(...PLAQUE, 38)} text-anchor="middle">The plaque</text>
        <text class="lbl-s" ${at(...PLAQUE, 60)} text-anchor="middle">1785 workshop</text>
        <mask id="move-draw" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="900">
          <path class="move-draw" pathLength="1" d="${move}"/>
        </mask>
        <path class="move" d="${move}" mask="url(#move-draw)"/>
        <circle class="pin pin-was" cx="${f1(ox)}" cy="${f1(oy)}" r="8"/>
        <text class="lbl-s" x="${f1(ox)}" y="${f1(oy + 36)}" text-anchor="middle">Town clock</text>
        <circle class="pin" cx="${f1(nx)}" cy="${f1(ny)}" r="7"/>
      </g>
      <path class="house" d="${path(HOUSE, "Z")}"/>
      <text class="lbl-in" ${at(-200, 84.8, 9)} text-anchor="middle">Bixler's</text>
      <path class="s" d="M960 92 V40 M950 54 L960 40 L970 54"/>
      <text class="lbl-s" x="960" y="120" text-anchor="middle">N</text>
      <text class="lbl-s" x="20" y="888">Map data © OpenStreetMap contributors</text>
    </svg>`;
  }

  // Act dial (the first deck's clock): the three acts are the hours 4, 8 and 12; at each act
  // the hand sweeps on from the previous hour and a green arc fills in behind it, so the
  // story reads as one turn of the clock.
  function actdial(o) {
    const hand = +o.hand || 0,
      from = +o.from || 0;
    let t = "";
    for (let i = 0; i < 60; i++) {
      const a = (i * Math.PI) / 30,
        mj = i % 5 === 0,
        r1 = mj ? 410 : 428,
        r2 = 440;
      t += `<line class="tick${mj ? " mj" : ""}" style="--i:${i}" x1="${f1(r1 * Math.sin(a))}" y1="${f1(-r1 * Math.cos(a))}" x2="${f1(r2 * Math.sin(a))}" y2="${f1(-r2 * Math.cos(a))}"/>`;
    }
    return `<svg viewBox="-640 -620 1280 1240">
      <circle class="ring" r="470"/><circle class="ring" r="440"/>${t}
      <circle class="arc" r="455" pathLength="360" style="--from:${from};--hand:${hand}"/>
      <g class="hand" style="--hand:${hand}deg;--from:${from}deg">
        <circle class="halo" cx="0" cy="-455" r="18"/>
        <circle class="pin" cx="0" cy="-455" r="9"/>
      </g>
    </svg>`;
  }

  // The house opened up, on img/house.svg (same 1920 × 1080 frame; house.py prints these): the
  // drawing steps back and the rooms in use come forward in it, each lit in a green frame (the
  // drawing itself, clipped). Two floors, from Christophe's zone elevation (assets/building/plans):
  // the Rolex Corner on the Church Street corner bay, Bixler's Boutique across the three bays round the
  // front door, the workshop in the last bay; above, the museum over the first three bays and the
  // administration over the last two. All in the main block (Christophe, 19 Oct: not in the side wing).
  // On the model's bays: walls 497 to 1149 (the wing to 1423, left out), bays 1 | 2-4 | 5 at 650 and
  // 996, the museum to the window over the door (to 903); floors at 746 and 602.
  // On the house page the zones show at one step only (data-only); elsewhere from step 1. The
  // annex's copy (A8) draws the house behind them itself (data-ghost) in a tighter frame (data-view).
  function cutaway(o = {}) {
    const at = o.cut ? `data-only="${o.cut}"` : 'data-step="1"',
      id = o.prefix || "cz",
      base = +o.delay || 0; // on the house page, once the house has come full screen
    const G = [750, 973],
      F = [606, 742]; // ground floor, floor above (inside the floor lines, a gap between rooms)
    const zones = [
      ["rolex", 501, 646, G, 200],
      ["boutique", 654, 992, G, 450],
      ["workshop", 1000, 1145, G, 700],
      ["museum", 501, 899, F, 1000],
      ["admin", 907, 1145, F, 1250],
    ];
    const room = ([zone, x0, x1, [y0, y1], d]) =>
      `<clipPath id="${id}-${zone}"><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}"/></clipPath>
      <g class="fade cut-zone" ${at} style="--d:${base + d}ms">
        <image href="img/house.svg?v=5" width="1920" height="1080" clip-path="url(#${id}-${zone})"/>
        <rect class="zone" pathLength="1" x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}"/>
      </g>`;
    // a name beside its room, an arrow pointing in (as on the zone elevation); the boutique, between
    // the two corner rooms, is named on the right below the workshop, its arrow running into it (past its right window, to the
    // wall by the door's arch), so it does not read as pointing at the workshop
    // (it was under the drawing, where a wide window or the controls hid it)
    const label = (x, y, side, name, d, to) => {
      const ax = side === "end" ? x + 12 : x - 12,
        tip = to || (side === "end" ? 494 : 1149),
        dir = side === "end" ? -1 : 1;
      return `<g class="fade cut-l" ${at} style="--d:${base + d}ms">
        <text class="lbl-serif" x="${x}" y="${y + 11}" text-anchor="${side}">${name}</text>
        <path class="lead" d="M${ax} ${y} H${tip} M${tip + dir * 7} ${y - 6} L${tip} ${y} L${tip + dir * 7} ${y + 6}"/>
      </g>`;
    };
    return `<svg class="cut" viewBox="${o.view || "0 0 1920 1080"}">
      ${o.ghost ? '<image class="ghost" href="img/house.svg?v=5" width="1920" height="1080"/>' : ""}
      ${zones.map(room).join("")}
      ${label(462, 784, "end", "Rolex Corner", 200)}
      ${label(1182, 784, "start", "Workshop", 700)}
      ${label(1182, 894, "start", "Bixler's Boutique", 450, 906)}
      ${label(462, 674, "end", "Museum", 1000)}
      ${label(1182, 674, "start", "Administration", 1250)}
    </svg>`;
  }

  // Annex bars: one row per place, the Lehigh Valley counties in the accent, the state and the
  // country in grey; the bar starts at zero and its value is written at its end.
  function bars(o) {
    const rows = JSON.parse(o.rows);
    const max = Math.max(...rows.map((r) => r[1]));
    return `<div class="bars">${rows
      .map(
        ([name, v, label, hi]) =>
          `<div class="bar-row${hi ? " hi" : ""}" title="${name} · ${label}"><span class="bar-name">${name}</span><span class="bar-track"><i style="width:${f1((v / max) * 68)}%"></i><b>${label}</b></span></div>`,
      )
      .join("")}</div>`;
  }

  // Annex columns: grouped vertical bars, one group per label and one colour per series (by
  // default the first in grey as context and the second in the accent; scheme "id" for two
  // identities), a fine grid, a legend above; data-values writes each value on its bar.
  function cols(o) {
    const rows = JSON.parse(o.rows),
      series = JSON.parse(o.series),
      ticks = JSON.parse(o.ticks || "[]"),
      max = +o.max,
      unit = o.unit || "";
    const W = 1000,
      L = 44, // the tick labels' gutter
      top = 30,
      base = +o.h || 330,
      k = series.length,
      band = (W - L) / rows.length,
      bw = Math.min(30, (band * 0.62) / k),
      gap = 3;
    const y = (v) => base - (v / max) * (base - top);
    const bar = (x, v) => {
      const t = y(v),
        r = Math.min(4, base - t);
      return `M${f1(x)} ${base}V${f1(t + r)}Q${f1(x)} ${f1(t)} ${f1(x + r)} ${f1(t)}H${f1(x + bw - r)}Q${f1(x + bw)} ${f1(t)} ${f1(x + bw)} ${f1(t + r)}V${base}Z`;
    };
    let g = ticks
      .map(
        (t) =>
          `<path class="col-grid" d="M${L} ${f1(y(t))}H${W}"/><text class="col-tick" x="0" y="${f1(y(t) + 5)}">${t}${unit}</text>`,
      )
      .join("");
    rows.forEach(([label, ...vs], i) => {
      const x0 = L + i * band + (band - (k * bw + (k - 1) * gap)) / 2;
      vs.forEach((v, j) => {
        const x = x0 + j * (bw + gap);
        g += `<path class="col s${j}" style="--c:${i}" d="${bar(x, v)}"><title>${label}, ${series[j]}: ${v}${unit}</title></path>`;
        if (o.values)
          g += `<text class="col-v" style="--c:${i}" x="${f1(x + bw / 2)}" y="${f1(y(v) - 9)}" text-anchor="middle">${v}${unit}</text>`;
      });
      g += `<text class="col-l" x="${f1(L + i * band + band / 2)}" y="${base + 32}" text-anchor="middle">${label}</text>`;
    });
    const legend = series
      .map((s, j) => `<span><i class="s${j}"></i>${s}</span>`)
      .join("");
    return `<div class="cols-wrap ${o.scheme || ""}"><div class="cols-legend">${legend}</div><svg class="cols" viewBox="0 0 ${W} ${base + 44}">${g}<path class="col-base" d="M${L} ${base}H${W}"/></svg></div>`;
  }

  const DRAW = { map, block, actdial, cutaway, bars, cols };
  $$("[data-fdraw]").forEach((el) => {
    el.innerHTML = DRAW[el.dataset.fdraw](el.dataset);
  });

  // The annex comes in: each tile rises after the one before (--i), its rows and lines after it
  // (--r), bars and columns grow from zero and the figures count up (full.css). A page that is not
  // on screen shows everything at rest (the overview, the PDF).
  const annex = $$('.slide[data-kind="annex"]');
  const index = document.querySelector(".ax-index");
  const fillIndex = () => {
    if (index)
      index.innerHTML = annex
        .filter((s) => s.dataset.short && !s.classList.contains("skip"))
        .map(
          (s) =>
            `<a href="#${s.id}" data-go="${s.id}"><b>${s.dataset.short}</b><span>${s.dataset.title}</span></a>`,
        )
        .join("");
  };
  fillIndex();
  index?.addEventListener("click", (e) => {
    const a = e.target.closest("[data-go]");
    if (!a || !window.deck) return;
    e.preventDefault();
    window.deck.go(a.dataset.go, 0);
  });
  annex.forEach((s) => {
    $$(".ax > *, .ax-stats > *, .ax-stack > *, .annex-grid > *", s)
      .filter((el) => !el.matches(".ax-stats, .ax-stack"))
      .forEach((el, i) => {
        el.classList.add("ax-in");
        el.style.setProperty("--i", i);
      });
    $$(".ax-table tbody tr, .ax-list li, .bar-row", s).forEach((el) =>
      el.style.setProperty("--r", [...el.parentNode.children].indexOf(el)),
    );
  });
  // the team's name cards carry their initials, engraved, until their portraits come
  $$(".ax-team > .ax-tile:not(.ax-lead):not(.ax-muted)").forEach((t) => {
    const name = t.querySelector(".ax-h")?.textContent.trim() || "";
    t.insertAdjacentHTML(
      "beforeend",
      `<span class="ax-mono" aria-hidden="true">${name
        .split(/\s+/)
        .map((w) => w[0])
        .join("")}</span>`,
    );
  });
  const figures = annex
    .flatMap((s) => $$(".ax-n, .mkt-hero", s))
    .map((el) => {
      const m = el.textContent.match(/^([^\d]*)(\d[\d,]*(?:\.\d+)?)(\D*)$/);
      return (
        m && {
          el,
          text: el.textContent,
          pre: m[1],
          post: m[3],
          v: +m[2].replace(/,/g, ""),
          dec: (m[2].split(".")[1] || "").length,
          comma: m[2].includes(","),
        }
      );
    })
    .filter(Boolean);
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.addEventListener("deck:slide", (e) => {
    const page = e.detail.slide;
    figures.forEach((f) => {
      f.el.textContent = f.text;
      if (still || !page.contains(f.el)) return;
      const i = +f.el.closest(".ax-in")?.style.getPropertyValue("--i") || 0;
      const t0 = performance.now() + 450 + i * 90,
        dur = 1300;
      const tick = (now) => {
        const t = Math.min(1, Math.max(0, (now - t0) / dur));
        const here =
          window.deck && window.deck.state.list[window.deck.state.i] === page;
        if (t >= 1 || !here) return (f.el.textContent = f.text);
        const v = f.v * (1 - Math.pow(1 - t, 3));
        f.el.textContent =
          f.pre +
          v.toLocaleString("en-US", {
            minimumFractionDigits: f.dec,
            maximumFractionDigits: f.dec,
            useGrouping: f.comma,
          }) +
          f.post;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  });

  // The history as one flight. Every image sits on a card at the centre of the page and moves
  // along its own line in depth (the perspective is taken from the centre, so the cards open out
  // from the year as they come). Step k flies the images of segment k past us, then lands its key
  // moment: the image settles large on the left and its card comes in beside it. A moment with no
  // key image (data-settle pieces only) would rest as a ring around the year. A click flies it on.
  const flight = document.querySelector("[data-flight]");
  if (flight) {
    const slide = flight.closest(".slide");
    const P = "perspective(1400px) ";
    const pose = (x, y, z) => `${P}translate3d(${x}px, ${y}px, ${z}px)`;
    const FAR = -3600,
      NEAR = 900,
      GAP = 260, // ms between two passing images
      STOP = { x: -440, y: -30, w: 640 }, // the key image at rest, left of the card
      KEEP = -450, // the images that stay rest a little behind the key image
      KS = 1400 / (1400 - KEEP),
      // where they rest, as seen on the page (offset from the centre, width): above and below the
      // card, under the key image, peeking out at the bottom left
      SLOTS = [
        [430, -390, 240],
        [620, 250, 220],
        [60, 300, 170],
        [-800, 240, 200],
      ];
    const YEARS = [1785, 1825, 1934, 1979, 2024, 2027];
    const SIZES = [340, 260, 400];
    const items = [...flight.querySelectorAll("img, video")].map((img, i) => {
      const el = document.createElement("div");
      const frame = document.createElement("div");
      el.className =
        "fl-item" + (img.classList.contains("piece") ? " piece" : "");
      frame.className = "fl-frame";
      const it = {
        el,
        frame,
        seg: +img.dataset.seg,
        stop: img.hasAttribute("data-stop"),
        settle: !!img.dataset.settle,
        rest: 0,
        video: img.tagName === "VIDEO" ? img : null, // a clip of the film, played only on screen
      };
      if (it.stop) {
        Object.assign(it, STOP);
        frame.style.cssText = `width:${STOP.w}px;height:${STOP.w}px`;
        if (img.dataset.pos) img.style.objectPosition = img.dataset.pos;
        el.style.zIndex = 150;
      } else if (it.settle) {
        [it.x, it.y, it.w] = img.dataset.settle.split(",").map(Number);
        frame.style.width = it.w + "px";
        el.style.zIndex = 120;
      } else {
        const a = i * 2.39996; // golden angle: an even field
        const r = 430 + (i % 3) * 90;
        it.x = Math.round(Math.cos(a) * r * 1.3);
        it.y = Math.round(Math.sin(a) * r * 0.72);
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
    // The last four images before each key moment stay in the frame around it.
    YEARS.forEach((_, k) => {
      if (!items.some((it) => it.seg === k && it.stop)) return;
      const free = items.filter((it) => it.seg === k && !it.stop && !it.settle);
      free.slice(-SLOTS.length).forEach((it, j) => {
        const [X, Y, W] = SLOTS[j];
        Object.assign(it, {
          keep: true,
          rest: KEEP,
          x: Math.round(X / KS),
          y: Math.round(Y / KS),
          w: Math.round(W / KS),
        });
        it.frame.style.cssText = `width:${it.w}px;height:${Math.round(it.w * 1.15)}px`;
        it.el.style.zIndex = 140;
      });
    });
    const cards = [...slide.querySelectorAll(".fl-card")];
    const center = slide.querySelector(".fl-center");
    const yearEl = slide.querySelector(".fl-year");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
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
    // The clips play only while they are on screen; a clip that starts to fly starts at its head.
    const roll = (on, fromStart = []) =>
      items.forEach((it) => {
        if (!it.video) return;
        if (!on.includes(it)) return it.video.pause();
        if (fromStart.includes(it)) it.video.currentTime = 0;
        it.video.play().catch(() => {});
      });
    const keyOf = (k) =>
      items.filter((it) => it.seg === k && (it.stop || it.settle || it.keep));
    const showCard = (k, on) =>
      cards.forEach((c) =>
        c.classList.toggle("shown", on && +c.dataset.seg === k),
      );
    const ringOf = (k) => !items.some((it) => it.seg === k && it.stop);
    const showYear = (y, on) => {
      yearEl.textContent = y;
      center.classList.toggle("off", !on);
    };
    // The moment k at rest (stepping back, jumping, overview, reduced motion).
    function still(k) {
      stopAll();
      items.forEach((it) => place(it, FAR, 0));
      keyOf(k).forEach((it) => place(it, it.rest, 1));
      showCard(k, true);
      showYear(YEARS[k], ringOf(k));
      center.classList.toggle("today", ringOf(k));
      roll(keyOf(k));
    }
    // The year runs from the last moment to this one while the images come.
    function runYear(from, to, ms) {
      const t0 = performance.now();
      const tick = (now) => {
        const f = Math.min(1, Math.max(0, (now - t0) / ms));
        const e = 1 - Math.pow(1 - f, 2);
        yearEl.textContent = Math.round(from + (to - from) * e);
        if (f < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    function play(k) {
      if (k > 0)
        still(k - 1); // whatever was still moving lands first
      else {
        stopAll(); // a fresh start: nothing left over from the end of the flight
        items.forEach((it) => place(it, FAR, 0));
        cards.forEach((c) => {
          c.style.transition = "none"; // the still frame's card goes at once, not in a fade
          c.classList.remove("shown");
          void c.offsetWidth;
          c.style.transition = "";
        });
      }
      // the last moment flies past us
      showCard(k - 1, false);
      keyOf(k - 1).forEach((it, j) =>
        it.el.animate(
          [
            { transform: pose(it.x, it.y, it.rest), opacity: 1 },
            { opacity: 1, offset: 0.55 },
            { transform: pose(it.x, it.y, NEAR), opacity: 0 },
          ],
          {
            duration: 1000,
            delay: j * 40,
            easing: "cubic-bezier(.5,0,.9,.6)",
            fill: "both",
          },
        ),
      );
      // the images of this segment pass, then the moment lands
      const passing = items.filter(
        (it) => it.seg === k && !it.stop && !it.settle && !it.keep,
      );
      passing.forEach((it, j) =>
        it.el.animate(
          [
            { transform: pose(it.x, it.y, FAR), opacity: 0 },
            { opacity: 1, offset: 0.12 },
            { opacity: 1, offset: 0.85 },
            { transform: pose(it.x, it.y, 800), opacity: 0 },
          ],
          { duration: 2800, delay: 250 + j * GAP, fill: "both" },
        ),
      );
      const land = 250 + passing.length * GAP + 400; // the last passing image is gone as it lands
      const keys = keyOf(k);
      keys.forEach((it, j) =>
        it.el.animate(
          [
            { transform: pose(it.x, it.y, FAR), opacity: 0 },
            { opacity: 1, offset: 0.25 },
            { transform: pose(it.x, it.y, it.rest), opacity: 1 },
          ],
          {
            duration: it.stop ? 2200 : 2500,
            delay: land + j * GAP,
            easing: "cubic-bezier(.16,1,.3,1)",
            fill: "both",
          },
        ),
      );
      roll([...keyOf(k - 1), ...passing, ...keys], [...passing, ...keys]);
      const settled = land + (keys.length - 1) * GAP + 1400;
      later(() => roll(keys), settled); // landed: only the clips at rest go on playing
      showYear(YEARS[Math.max(0, k - 1)], true);
      center.classList.remove("today");
      runYear(YEARS[Math.max(0, k - 1)], YEARS[k], settled);
      if (ringOf(k)) later(() => center.classList.add("today"), settled - 600);
      else {
        const stopAt = land + (keys.length - 1) * GAP; // the key image comes last
        later(() => center.classList.add("off"), stopAt + 700);
        later(() => showCard(k, true), stopAt + 1300);
      }
    }
    // Moving on: whatever is on screen keeps coming toward us and is gone as the next page arrives.
    function flyOut() {
      timers.forEach(clearTimeout);
      timers = [];
      cancelAnimationFrame(raf);
      items.forEach((it) => {
        it.el.getAnimations().forEach((a) => {
          try {
            a.commitStyles(); // carry on from where it is, mid-flight or at rest
          } catch (_) {}
          a.cancel();
        });
        if (+getComputedStyle(it.el).opacity < 0.02) return;
        it.el.animate(
          [
            { transform: it.el.style.transform, opacity: it.el.style.opacity },
            { opacity: it.el.style.opacity, offset: 0.35 },
            { transform: pose(it.x, it.y, NEAR), opacity: 0 },
          ],
          {
            duration: 1100,
            easing: "cubic-bezier(.45,0,.85,.55)",
            fill: "both",
          },
        );
      });
      later(() => roll([]), 1200);
    }
    still(0); // the overview shows 1785
    roll([]); // its clips wait until the page is on screen
    let lastSlide = null,
      lastIndex = -1,
      lastStep = 0;
    document.addEventListener("deck:step", (e) => {
      const { slide: s, step } = e.detail;
      const index = order(s);
      const entering = s !== lastSlide;
      const forward = entering ? index > lastIndex : step === lastStep + 1;
      if (s === slide) {
        if (reduced || !forward || (entering && step !== 0)) still(step);
        else play(step);
      } else if (lastSlide === slide) {
        if (index > lastIndex && !reduced) flyOut();
        else {
          timers.forEach(clearTimeout); // leaving backwards: keep the frame as it is under the page
          cancelAnimationFrame(raf);
          roll([]);
        }
      }
      lastSlide = s;
      lastIndex = index;
      lastStep = step;
    });
  }

  // The act clocks move on by themselves once the hand has landed, only when moving forward
  // (stepping back onto a clock leaves it still). The dial keeps flying toward us as the
  // next page fades in (full.css, dial-fly).
  const HOLD = 2200;
  let auto = 0,
    lastIndex = -1,
    prevSlide = null;
  document.addEventListener("deck:slide", (e) => {
    clearTimeout(auto);
    const { slide } = e.detail;
    const index = order(slide);
    const forward = index > lastIndex;
    const prev = prevSlide;
    const fromClock = prev && prev.classList.contains("act-dial-slide");
    lastIndex = index;
    prevSlide = slide;
    const hold = (el, cls, ms) => {
      el.classList.add(...cls);
      setTimeout(() => el.classList.remove(...cls), ms);
    };
    // Into a clock: the page we were on stays underneath and recedes as the clock draws itself.
    // Out of the history flight, its images stay in front and keep flying past us instead.
    // Out of a room, the rooms' own movement: it slides away to the left, its picture lagging,
    // as the clock comes in from the right and draws itself.
    if (forward && prev && slide.classList.contains("act-dial-slide")) {
      if (prev.querySelector("[data-flight]")) {
        hold(prev, ["held", "fly-out"], 1200);
        hold(slide, ["from-flight"], 1200);
      } else if (prev.classList.contains("room")) {
        hold(prev, ["held", "pan-out"], 1300);
        hold(slide, ["pan-in"], 1300);
      } else hold(prev, ["held", "recede"], 1100);
    }
    // Out of a clock: the clock keeps flying underneath while its face opens onto the next page.
    if (forward && fromClock) {
      hold(prev, ["held"], 1050);
      hold(slide, ["iris-in"], 1050);
    }
    if (!forward || !slide.classList.contains("act-dial-slide")) return;
    auto = setTimeout(() => {
      const d = window.deck;
      if (d && !d.state.overview && d.state.list[d.state.i] === slide) d.next();
    }, HOLD);
  });

  // The rooms' last step: Next first sends the panel away and the picture is full page again; it
  // waits there for the next click. Coming back into a room lands on it full page and the panel
  // comes back.
  let roomWas = null,
    roomStep = 0;
  document.addEventListener("deck:step", (e) => {
    const { slide, step } = e.detail;
    const was = roomWas === slide ? roomStep : -1;
    roomWas = slide;
    roomStep = step;
    if (!slide.classList.contains("room")) return;
    const last = step === slide._steps;
    slide.classList.toggle("full", last);
    if (last && was !== step - 1) setTimeout(() => window.deck && window.deck.prev(), 0); // came back into it
  });

  // The cold open: its first step holds the film's first frame in the dark (the cover); the next
  // plays it from the start, and it hands over to the cover when it ends. A click moves on at once
  // (the engine's click).
  const film = document.querySelector("#film video");
  if (film) {
    const opening = film.closest(".slide");
    document.addEventListener("deck:step", (e) => {
      const { slide, step } = e.detail;
      if (slide !== opening) return film.pause();
      film.currentTime = 0;
      if (step === 0) film.pause();
      else film.play().catch(() => {}); // blocked: the first frame stays, a click moves on
    });
    // Into the cover: the film's last frame stays on top and washes out while the house is drawn
    // under it (the cover's transition, "film", is left to full.css; the engine switches at once).
    let was = null;
    document.addEventListener("deck:slide", (e) => {
      const s = e.detail.slide;
      if (was === opening && s.dataset.transition === "film") {
        opening.classList.add("held", "film-out");
        setTimeout(() => opening.classList.remove("held", "film-out"), 2700);
      }
      was = s;
    });
    film.addEventListener("ended", () => {
      const d = window.deck;
      if (d && !d.state.overview && d.state.list[d.state.i] === opening)
        d.next();
    });
  }

  // The house page's last step plays the film's opening (assets/film/tools/opening.py, at the deck's
  // frame): the new front rises out of the drawing, we zoom to the door and walk in; it holds on the
  // hall and a click goes on to the Rolex Corner. Back from a later page, its last frame waits there
  // as a still ("done", full.css), not a seek, which a server without ranges cannot do.
  // It is fetched once the page is on screen (17 MB), well before its step.
  const walk = document.querySelector("#offer .nc-film video");
  if (walk) {
    const house = walk.closest(".slide");
    let at = -1;
    document.addEventListener("deck:step", (e) => {
      const { slide, step } = e.detail;
      const index = order(slide);
      const from = at;
      at = index;
      if (slide !== house) return walk.pause();
      if (walk.preload !== "auto") {
        walk.preload = "auto";
        walk.load();
      }
      const last = step === house._steps;
      walk.parentNode.classList.toggle("done", last && from > index);
      walk.pause();
      walk.currentTime = 0;
      if (last && from <= index) walk.play().catch(() => {}); // blocked: the drawing stays, a click moves on
    });
  }

  // The cover: the new house is traced from the pavement up while the logo is written above it.
  // img/house.svg is inlined (the same drawing as the house page's) so that its lines can be drawn.
  const houseBox = document.querySelector("[data-house-draw]");
  if (houseBox)
    fetch(houseBox.dataset.houseDraw)
      .then((r) => r.text())
      .then((svg) => {
        houseBox.innerHTML = svg;
        houseBox.classList.add("house-draw");
        const TOP = 317,
          GROUND = 975; // the house in the drawing's frame (house.py prints them)
        houseBox.querySelectorAll("path, rect, circle, text").forEach((el) => {
          if (el.closest("clipPath")) return;
          const b = el.getBBox();
          const up = Math.min(
            1,
            Math.max(0, (GROUND - b.y - b.height) / (GROUND - TOP)),
          );
          el.style.setProperty(
            "--d",
            `${Math.round(900 + up * 1600 + (b.x / 1920) * 300)}ms`,
          ); // after the film has settled
          if (el.tagName === "text" || el.getAttribute("fill") === "#0f1b18")
            el.classList.add("lf");
          else {
            el.classList.add("ln");
            el.style.setProperty("--len", el.getTotalLength().toFixed(1));
          }
        });
      });

  // Back to the beginning: the toolbar button or R (Home also works, from the engine).
  const restart = () => {
    const d = window.deck;
    if (!d || d.state.overview) return;
    clearTimeout(auto);
    d.go(d.state.list[0].id, 0);
  };
  const btn = document.querySelector(".hud [data-restart]");
  if (btn)
    btn.addEventListener("click", () => {
      restart();
      btn.blur();
    });
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || (e.key !== "r" && e.key !== "R"))
      return;
    if (document.querySelector(".help.open")) return;
    restart();
    e.preventDefault();
  });

  // To the annex contents: the corner label on an annex page, or A from anywhere
  const toIndex = () => {
    const d = window.deck;
    if (!d || d.state.overview || !d.state.list.some((x) => x.id === "a-index"))
      return;
    clearTimeout(auto);
    d.go("a-index", 0);
  };
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".folio .to-index")) return;
    e.preventDefault();
    toIndex();
  });
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || (e.key !== "a" && e.key !== "A"))
      return;
    if (document.querySelector(".help.open")) return;
    toIndex();
    e.preventDefault();
  });

  // Slides to present. In All slides (O) each slide carries a tick: an unticked slide is left out
  // of the presentation (the arrows skip it, the numbers run on without it) and of the PDF; H
  // ticks or unticks the selected one. The choice stays in this browser. The engine walks
  // deck.state.list: it is narrowed to the ticked slides, and widened to all of them while the
  // overview is open (before the engine lays it out, so every slide gets its place).
  const KEY = "bix-full-hidden";
  let hidden = new Set();
  try {
    hidden = new Set(JSON.parse(localStorage.getItem(KEY) || "[]"));
  } catch (e) {
    /* storage unavailable: everything shows */
  }
  const shown = (s) => !hidden.has(s.id);
  const picks = document.createElement("div");
  picks.className = "picks";
  document.body.append(picks);
  function relist(all) {
    const d = window.deck;
    if (!d) return;
    const st = d.state,
      cur = st.list[st.i];
    st.list = all
      ? SLIDES.slice()
      : SLIDES.filter((s) => shown(s) || s === cur);
    st.i = Math.max(0, st.list.indexOf(cur));
  }
  function renumber() {
    let n = 0,
      page = 0;
    SLIDES.forEach((s) => {
      s.classList.toggle("skip", !shown(s));
      s.querySelector(".pick")?.setAttribute("aria-pressed", String(shown(s)));
      if (!shown(s))
        s.dataset.label = s.dataset.title.replace(/^Act [IV]+ · /, ""); // no number while out
      if (!shown(s) || s.dataset.kind === "act") return;
      s._label = pad(n++); // the engine's counter, as it numbers them
      s.dataset.label = `${s._label} · ${s.dataset.title}`;
      if (s.dataset.kind === "film" || s.dataset.kind === "annex") return;
      const no = pad(page++), // as the corner marks count them (the cover too)
        b = s.querySelector(".folio .where b");
      if (b) b.textContent = no;
    });
    const on = SLIDES.filter(shown).length;
    picks.innerHTML =
      `<span class="picks-t">Slides to present</span>` +
      `<span class="picks-n"><b>${on}</b> of ${SLIDES.length} shown · click a slide to open it, its tick hides or shows it</span>` +
      `<span class="picks-b">${hidden.size ? '<button type="button" data-all>Show all</button>' : ""}</span>`;
    fillIndex();
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify([...hidden]));
    } catch (e) {
      /* storage unavailable */
    }
    renumber();
  }
  function toggle(s) {
    if (!s) return;
    if (shown(s)) {
      if (SLIDES.filter(shown).length > 1) hidden.add(s.id);
    } else hidden.delete(s.id);
    save();
  }
  SLIDES.forEach((s) => {
    s.insertAdjacentHTML(
      "beforeend",
      '<button type="button" class="pick" aria-pressed="true" aria-label="Show in the presentation"></button>',
    );
  });
  picks.addEventListener("click", (e) => {
    if (e.target.closest("[data-all]")) {
      hidden.clear();
      save();
    }
  });
  document.addEventListener("DOMContentLoaded", () => {
    const d = window.deck;
    if (!d) return;
    const stage = document.querySelector(".stage");
    const opening = () => !d.state.overview && relist(true);
    document.addEventListener(
      "click",
      (e) => e.target.closest('.hud [data-act="overview"]') && opening(),
      true,
    );
    addEventListener(
      "keydown",
      (e) => {
        if (
          e.metaKey ||
          e.ctrlKey ||
          e.altKey ||
          document.querySelector(".help.open")
        )
          return;
        if (!d.state.overview && ["o", "O", "Escape"].includes(e.key)) opening();
      },
      true,
    );
    // in the overview the tick (top right) shows or hides the slide; a click elsewhere on it
    // goes to the engine, which opens it
    const pick = (s) => {
      d.state.sel = d.state.list.indexOf(s);
      d.state.list.forEach((el, k) =>
        el.classList.toggle("sel", k === d.state.sel),
      );
    };
    document.addEventListener(
      "click",
      (e) => {
        const s = d.state.overview && e.target.closest(".stage .slide");
        if (!s || !e.target.closest(".pick")) return;
        e.stopPropagation(); // not the engine's click, which would open it
        e.preventDefault();
        pick(s);
        toggle(s);
      },
      true,
    );
    addEventListener("keydown", (e) => {
      if (
        d.state.overview &&
        (e.key === "h" || e.key === "H") &&
        !e.metaKey &&
        !e.ctrlKey
      ) {
        toggle(d.state.list[d.state.sel]);
        e.preventDefault();
      }
    });
    // the overview is taller than the screen once there are more than 16 slides: the wheel moves
    // it up and down, and it follows the selected slide (the engine lays it out in 4 columns)
    let y = 0;
    const span = () => {
      const h = (1080 * (1920 - 40 * 5)) / 4 / 1920,
        rows = Math.ceil(d.state.list.length / 4),
        top = (1080 - (rows * h + (rows - 1) * 40)) / 2;
      return { h, top, bottom: top + rows * h + (rows - 1) * 40 };
    };
    // in window pixels: the rows stay between the header bar (64 px) and the foot of the window
    const view = () => {
      const k =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            "--scale",
          ),
        ) || 1;
      return {
        k,
        t: (innerHeight - 1080 * k) / 2,
        a: 64 + 20,
        b: innerHeight - 24,
      };
    };
    const scrollTo = (v) => {
      const { top, bottom } = span(),
        { k, t, a, b } = view();
      const hi = (a - t) / k - top, // the first row down to the bar
        lo = (b - t) / k - bottom; // the last row up to the foot
      y = lo >= hi ? (lo + hi) / 2 : Math.min(Math.max(v, lo), hi);
      stage.style.setProperty("--ovy", `${y.toFixed(1)}px`);
    };
    const follow = () => {
      const { h, top } = span(),
        { k, t, a, b } = view(),
        row = top + Math.floor(d.state.sel / 4) * (h + 40),
        at = t + (row + y) * k;
      if (at < a || at + h * k > b)
        scrollTo(((a + b) / 2 - t) / k - row - h / 2);
      else scrollTo(y);
    };
    addEventListener(
      "wheel",
      (e) => d.state.overview && scrollTo(y - e.deltaY / view().k),
      { passive: true },
    );
    addEventListener("keydown", () => d.state.overview && follow());
    let open = false;
    new MutationObserver(() => {
      const on = stage.classList.contains("overview");
      if (on === open) return; // only its opening and closing (and not our own class below)
      open = on;
      if (on) {
        stage.classList.add("ov-move"); // so that leaving it eases back with the engine's zoom
        fitDeck(); // whole in the overview
        return follow();
      }
      relist(false);
      y = 0;
      stage.style.setProperty("--ovy", "0px");
      fitDeck();
      setTimeout(() => stage.classList.remove("ov-move"), 700);
    }).observe(stage, { attributes: true, attributeFilter: ["class"] });
    document.addEventListener(
      "deck:slide",
      () => !d.state.overview && relist(false),
    );
    relist(false);
    renumber();
    // after the engine's own fit (its resize handler comes first): fill the window
    addEventListener("resize", fitDeck);
    fitDeck();
  });

  // Fill the window: the slide is scaled to cover it, trimming at most 6 % off each side (past that,
  // black bands), and shown whole in the overview; the corner marks keep to the visible corners
  // (--cx, --cy: what is trimmed, in the slide's pixels).
  function fitDeck() {
    const d = window.deck,
      kw = innerWidth / 1920,
      kh = innerHeight / 1080,
      whole = Math.min(kw, kh),
      k =
        d && d.state.overview
          ? whole
          : Math.min(Math.max(kw, kh), whole / 0.88),
      root = document.documentElement;
    root.style.setProperty("--scale", k);
    root.style.setProperty(
      "--cx",
      `${Math.max(0, (1920 - innerWidth / k) / 2).toFixed(1)}px`,
    );
    root.style.setProperty(
      "--cy",
      `${Math.max(0, (1080 - innerHeight / k) / 2).toFixed(1)}px`,
    );
  }

  // The PDF: the whole deck as it is, or, with slides unticked, only the pages of the ticked ones,
  // taken from it in the browser (pdf-lib; export/pages.json says which pages are whose).
  const pdf = document.querySelector('.hud a[href$=".pdf"]');
  let lib = null;
  const pdfLib = () =>
    (lib ||= new Promise((ok, no) => {
      const sc = document.createElement("script");
      sc.src =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js";
      sc.integrity =
        "sha512-z8IYLHO8bTgFqj+yrPyIJnzBDf7DDhWwiEsk4sY+Oe6J2M+WQequeGS7qioI5vT6rXgVRb4K1UVQC5ER7MKzKQ==";
      sc.crossOrigin = "anonymous";
      sc.onload = () => ok(window.PDFLib);
      sc.onerror = () => {
        lib = null;
        no(new Error("pdf-lib did not load"));
      };
      document.head.append(sc);
    }));
  pdf?.addEventListener("click", async (e) => {
    if (!hidden.size) return; // the whole deck: the file itself
    e.preventDefault();
    if (pdf.classList.contains("busy")) return;
    pdf.classList.add("busy");
    try {
      const [{ PDFDocument }, map, bytes] = await Promise.all([
        pdfLib(),
        fetch(new URL("pages.json", pdf.href)).then((r) => r.json()),
        fetch(pdf.href).then((r) => r.arrayBuffer()),
      ]);
      const src = await PDFDocument.load(bytes);
      const out = await PDFDocument.create();
      out.setTitle("Bixler's x Rolex");
      const pages = SLIDES.filter(shown).flatMap((s) => map.pages[s.id] || []);
      (await out.copyPages(src, pages)).forEach((p) => out.addPage(p));
      const url = URL.createObjectURL(
        new Blob([await out.save()], { type: "application/pdf" }),
      );
      const a = Object.assign(document.createElement("a"), {
        href: url,
        download: pdf.getAttribute("download"),
      });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.warn(
        "PDF of the ticked slides failed, the whole deck instead:",
        err,
      );
      location.href = pdf.href;
    } finally {
      pdf.classList.remove("busy");
    }
  });
})();

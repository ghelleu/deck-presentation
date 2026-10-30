/* Bixler's · direction decks — slide engine (derived from deck/deck.js). No dependencies.
   Default motion: a horizontal pan (the whole deck is one strip, like normalisboring.es),
   with layers at different depths ([data-depth]) and images that widen as they enter ([data-reveal]). */
(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  const stage = $("#stage");
  const ALL = $$(".slide", stage);
  const DECK = document.body.dataset.deck || "direction";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NUMERALS = { 1: "I", 2: "II", 3: "III", 4: "IV" };
  const pad = (n) => String(n).padStart(2, "0");
  const f1 = (n) => (+n).toFixed(1);

  /* ======================================================== Line drawings */

  // Town clock on its column (200 × 700 box); hands turn around (100, 150).
  function clockG() {
    let ticks = "";
    for (let i = 0; i < 60; i++) {
      const a = (i * Math.PI) / 30,
        r1 = i % 5 ? 78 : 68,
        r2 = 84;
      ticks += `<line class="${i % 5 ? "t" : "s"}" x1="${f1(100 + r1 * Math.sin(a))}" y1="${f1(150 - r1 * Math.cos(a))}" x2="${f1(100 + r2 * Math.sin(a))}" y2="${f1(150 - r2 * Math.cos(a))}"/>`;
    }
    return `<g class="sclock">
      <circle class="s d" pathLength="1" cx="100" cy="150" r="96"/>
      <circle class="t" cx="100" cy="150" r="88"/>
      ${ticks}
      <line class="s hand-h" x1="100" y1="162" x2="100" y2="104" style="stroke-width:4"/>
      <line class="s hand-m" x1="100" y1="166" x2="100" y2="80" style="stroke-width:2.5"/>
      <line class="hand-s" x1="100" y1="172" x2="100" y2="72"/>
      <circle class="f" cx="100" cy="150" r="4"/>
      <path class="s d" pathLength="1" d="M100 54 V36 M86 54 H114"/>
      <circle class="s" cx="100" cy="27" r="8"/>
      <path class="s d" pathLength="1" d="M64 238 Q100 262 136 238"/>
      <path class="s d" pathLength="1" d="M90 256 V612 M110 256 V612"/>
      <path class="s d" pathLength="1" d="M80 256 H120 M84 296 H116 M84 572 H116 M78 612 H122"/>
      <path class="s d" pathLength="1" d="M76 612 L62 690 H138 L124 612"/>
    </g>`;
  }
  const streetclock = () =>
    `<svg viewBox="0 0 200 700" preserveAspectRatio="xMidYMax meet">${clockG()}</svg>`;

  // Historic three-storey facade. Options: clock ("show" or a step number), plaque (step number).
  function facade(o) {
    let n = 0;
    const d = () => `pathLength="1" style="--dd:${n++ * 28}"`;
    const win = (x, y) => `
      <path class="win" d="M${x} ${y + 150} V${y + 45} A45 45 0 0 1 ${x + 90} ${y + 45} V${y + 150} Z"/>
      <path class="s d" ${d()} d="M${x} ${y + 150} V${y + 45} A45 45 0 0 1 ${x + 90} ${y + 45} V${y + 150} Z"/>
      <path class="t" d="M${x + 45} ${y + 10} V${y + 150} M${x} ${y + 92} H${x + 90}"/>
      <path class="s d" ${d()} d="M${x - 10} ${y + 158} H${x + 100}"/>
      <path class="t" d="M${x - 8} ${y + 45} A53 53 0 0 1 ${x + 98} ${y + 45}"/>`;
    let wins = "";
    for (const y of [204, 414])
      for (const x of [260, 390, 520, 650]) wins += win(x, y);
    let brackets = "";
    for (let x = 236; x <= 760; x += 58)
      brackets += `<path class="t" d="M${x} 142 v24 h12 v-24"/>`;
    const clock = !o.clock
      ? ""
      : o.clock === "show"
        ? `<g transform="translate(36 318) scale(.8)">${clockG()}</g>`
        : `<g class="clock-move" data-step="${o.clock}"><g transform="translate(36 318) scale(.8)">${clockG()}</g></g>`;
    const plaque = !o.plaque
      ? ""
      : `<g class="fade" data-step="${o.plaque}">
      <circle class="s" cx="110" cy="190" r="74"/>
      <rect class="s" x="72" y="162" width="76" height="54" rx="3"/>
      <path class="t" d="M84 180 H136 M84 191 H136 M84 202 H118"/>
      <text class="lbl-s" x="110" y="296" text-anchor="middle">The plaque</text>
      <text class="lbl-s" x="110" y="318" text-anchor="middle">1785 workshop</text>
    </g>`;
    return `<svg viewBox="0 0 900 900">
      <path class="s d" ${d()} d="M200 120 H800 V142 H200 Z"/>
      ${brackets}
      <path class="s d" ${d()} d="M220 166 H780"/>
      <path class="s d" ${d()} d="M250 120 V92 H750 V120"/>
      <path class="s d" ${d()} d="M430 92 L500 64 L570 92"/>
      <path class="s d" ${d()} d="M220 142 V880 M780 142 V880"/>
      <path class="t" d="M220 394 H780 M220 604 H780"/>
      ${wins}
      <rect class="s d" ${d()} x="250" y="620" width="500" height="54"/>
      <text class="sign-t" x="500" y="657" text-anchor="middle">BIXLER'S · 1785</text>
      <path class="s d" ${d()} d="M220 690 H780"/>
      <rect class="s d" ${d()} x="220" y="690" width="34" height="190"/>
      <rect class="s d" ${d()} x="746" y="690" width="34" height="190"/>
      <rect class="shop" x="274" y="712" width="186" height="168"/>
      <rect class="s d" ${d()} x="274" y="712" width="186" height="168"/>
      <rect class="shop" x="540" y="712" width="186" height="168"/>
      <rect class="s d" ${d()} x="540" y="712" width="186" height="168"/>
      <path class="t" d="M274 746 H460 M540 746 H726"/>
      <path class="s d" ${d()} d="M470 880 V712 H530 V880"/>
      <path class="t" d="M470 746 H530 M500 746 V880"/>
      <path class="s d" ${d()} d="M20 880 H880"/>
      ${plaque}
      ${clock}
    </svg>`;
  }

  // Signature display cases (light from beneath).
  function cupcakeG() {
    return `<g class="case">
      <ellipse class="warm" cx="150" cy="424" rx="132" ry="14"/>
      <rect class="glass-f" x="40" y="44" width="220" height="150"/>
      <rect class="s d" pathLength="1" x="40" y="44" width="220" height="150" rx="3"/>
      <path class="t" d="M58 60 V178 M74 60 V118"/>
      <path class="s" d="M118 194 Q150 172 182 194"/>
      <circle class="s" cx="150" cy="166" r="11"/>
      <path class="s d" pathLength="1" d="M28 194 H272 V212 H28 Z" style="--dd:200"/>
      <ellipse class="warm" cx="150" cy="214" rx="118" ry="9"/>
      <path class="s d" pathLength="1" d="M40 212 L104 420 H196 L260 212" style="--dd:400"/>
      <path class="t" d="M58 270 H242"/>
    </g>`;
  }
  function ovalG() {
    return `<g class="case">
      <ellipse class="warm" cx="210" cy="424" rx="172" ry="16"/>
      <path class="glass-f" d="M30 70 V176 A180 34 0 0 0 390 176 V70 A180 34 0 0 1 30 70 Z"/>
      <ellipse class="s d" pathLength="1" cx="210" cy="70" rx="180" ry="34"/>
      <path class="s d" pathLength="1" d="M30 70 V176 A180 34 0 0 0 390 176 V70" style="--dd:150"/>
      <path class="t" d="M30 176 A180 34 0 0 1 390 176"/>
      <circle class="s" cx="160" cy="150" r="9"/>
      <circle class="s" cx="256" cy="146" r="9"/>
      <path class="s d" pathLength="1" d="M20 182 A190 36 0 0 0 400 182 V200 A190 36 0 0 1 20 200 Z" style="--dd:300"/>
      <ellipse class="warm" cx="210" cy="204" rx="170" ry="12"/>
      <path class="s d" pathLength="1" d="M36 210 C60 320 110 390 140 412 M384 210 C360 320 310 390 280 412" style="--dd:450"/>
      <ellipse class="s" cx="210" cy="412" rx="72" ry="12"/>
    </g>`;
  }
  const cupcake = () => `<svg viewBox="0 0 300 440">${cupcakeG()}</svg>`;
  const oval = () => `<svg viewBox="0 0 420 440">${ovalG()}</svg>`;

  // Tailor's tape measure: ticks every 20 px, small numbers every 100 px, big labels at "x:label" marks.
  function tape(o) {
    const W = +o.w || 1200, H = +o.h || 90;
    let t = '';
    for (let x = 0; x <= W; x += 20) {
      const mj = x % 100 === 0;
      t += `<line x1="${x}" x2="${x}" y1="0" y2="${mj ? 34 : 16}" class="tk${mj ? ' mj' : ''}"/>`;
      if (mj && x > 0) t += `<text x="${x - 6}" y="56" class="tn" text-anchor="end">${x / 100}</text>`;
    }
    (o.marks || '').split(',').filter(Boolean).forEach(m => {
      const [x, label] = m.split(':');
      t += `<line x1="${x}" x2="${x}" y1="0" y2="${H}" class="tk mark"/><text x="${+x + 10}" y="${H - 14}" class="tl">${label}</text>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><rect width="${W}" height="${H}" class="tape-bg"/>${t}</svg>`;
  }

  const DRAW = { streetclock, facade, cupcake, oval, tape };
  $$("[data-draw]").forEach((el) => {
    el.innerHTML = DRAW[el.dataset.draw](el.dataset);
    el.classList.add("art");
  });

  /* ======================================================== Text and paper helpers */

  // Wrap each word of [data-split] titles so they can rise from behind a mask.
  $$("[data-split]").forEach((el) => {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((ch) => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.append(document.createTextNode(part));
              return;
            }
            const w = document.createElement("span");
            w.className = "w";
            const inner = document.createElement("span");
            inner.textContent = part;
            inner.style.setProperty("--i", i++);
            w.append(inner);
            frag.append(w);
          });
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1 && ch.tagName !== "BR") walk(ch);
      });
    };
    walk(el);
    el.classList.add("split");
  });

  // Torn paper: a jagged clip-path on the sides listed in data-torn (t, r, b, l).
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  $$("[data-torn]").forEach((el) => {
    const sides = el.dataset.torn,
      w = el.offsetWidth || 400,
      h = el.offsetHeight || 300,
      amp = +(el.dataset.tornAmp || 7);
    const pts = [],
      step = 14;
    const jag = (len, on) => (on ? rnd() * amp : 0);
    for (let x = 0; x <= w; x += step)
      pts.push([x, jag(w, sides.includes("t"))]);
    for (let y = step; y <= h; y += step)
      pts.push([w - jag(h, sides.includes("r")), y]);
    for (let x = w - step; x >= 0; x -= step)
      pts.push([x, h - jag(w, sides.includes("b"))]);
    for (let y = h - step; y > 0; y -= step)
      pts.push([jag(h, sides.includes("l")), y]);
    el.style.clipPath = `polygon(${pts.map(([x, y]) => `${((x / w) * 100).toFixed(2)}% ${((y / h) * 100).toFixed(2)}%`).join(",")})`;
  });

  /* ======================================================== Live clock hands (Easton time) */

  const fmt = (() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: false,
      });
    } catch (e) {
      return null;
    }
  })();
  function eastonTime() {
    if (fmt) {
      const parts = fmt.formatToParts(new Date());
      const g = (t) => +(parts.find((p) => p.type === t) || { value: 0 }).value;
      return [g("hour") % 12, g("minute"), g("second")];
    }
    const d = new Date();
    return [d.getHours() % 12, d.getMinutes(), d.getSeconds()];
  }
  function tick() {
    const [h, m, s] = eastonTime();
    const set = (sel, a) =>
      $$(sel, stage).forEach((el) =>
        el.setAttribute(
          "transform",
          `rotate(${f1(a)} ${el.dataset.c || "100 150"})`,
        ),
      );
    set(".hand-h", (h + m / 60) * 30);
    set(".hand-m", (m + s / 60) * 6);
    set(".hand-s", s * 6);
  }
  tick();
  setInterval(tick, 1000);

  /* ======================================================== State */

  const store = {
    get(k) {
      try {
        return localStorage.getItem(`bix-${DECK}-${k}`);
      } catch (e) {
        return null;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(`bix-${DECK}-${k}`, v);
      } catch (e) {
        /* storage unavailable */
      }
    },
  };
  const state = {
    list: ALL,
    i: 0,
    step: 0,
    overview: false,
    sel: 0,
    end: null,
  };

  ALL.forEach((s) => {
    const nums = $$("[data-step],[data-only],[data-focus]", s).flatMap((e) =>
      onlySteps(e.dataset.step ?? e.dataset.only ?? e.dataset.focus),
    );
    s._steps = Math.max(+s.dataset.steps || 0, 0, ...nums);
  });

  let n = 0;
  ALL.forEach((s) => {
    s._label = s.dataset.kind === "act" ? NUMERALS[s.dataset.act] : pad(n++);
    s.dataset.label = `${s._label} · ${s.dataset.title.replace(/^Act [IV]+ · /, "")}`;
  });

  // Preload every photo so nothing pops in during a pan.
  $$("img", stage).forEach((img) => {
    const p = new Image();
    p.src = img.currentSrc || img.src;
  });

  /* ======================================================== Steps */

  // data-only takes one step ("2") or a list ("0 1"): the element shows at those steps only.
  function onlySteps(v) {
    return String(v ?? "")
      .split(/[\s,]+/)
      .map((x) => +x || 0);
  }

  function applyStep(s, step) {
    s.style.setProperty("--step", step);
    for (let k = 1; k <= s._steps; k++) s.classList.toggle("s" + k, step >= k);
    $$("[data-step]", s).forEach((e) =>
      e.classList.toggle("on", step >= +e.dataset.step),
    );
    $$("[data-only]", s).forEach((e) =>
      e.classList.toggle("on", onlySteps(e.dataset.only).includes(step)),
    );
    $$("[data-focus]", s).forEach((e) => {
      const k = +e.dataset.focus;
      e.classList.toggle("focus", step === k);
      e.classList.toggle("past", step > k);
    });
  }

  /* ======================================================== Transitions */

  function finish() {
    if (state.end) state.end();
  }

  function transition(from, to, type, back) {
    finish();
    if (reduced && type !== "none") type = "fade";
    if (back && type !== "pan" && type !== "none") type = "back";
    if (from) {
      from.classList.remove("is-active");
      from.classList.add("is-leaving");
    }
    to.classList.add("is-active");
    if (!from || type === "none") {
      if (from) from.classList.remove("is-leaving");
      return;
    }

    const IO = "cubic-bezier(.76,0,.24,1)",
      E = "cubic-bezier(.22,.61,.36,1)";
    const anims = [];
    const A = (el, kf, d, e = IO, delay = 0) =>
      anims.push(
        el.animate(kf, { duration: d, easing: e, delay, fill: "both" }),
      );

    if (type === "pan") {
      const dir = back ? -1 : 1,
        D = 1500;
      A(
        from,
        [
          { transform: "translateX(0)" },
          { transform: `translateX(${-100 * dir}%)` },
        ],
        D,
      );
      A(
        to,
        [
          { transform: `translateX(${100 * dir}%)` },
          { transform: "translateX(0)" },
        ],
        D,
      );
      // Depth: positive layers travel further (foreground), negative ones lag (background).
      $$("[data-depth]", from).forEach((el) =>
        A(
          el,
          [
            { translate: "0 0" },
            { translate: `${-dir * +el.dataset.depth * 22}% 0` },
          ],
          D,
        ),
      );
      $$("[data-depth]", to).forEach((el) =>
        A(
          el,
          [
            { translate: `${dir * +el.dataset.depth * 22}% 0` },
            { translate: "0 0" },
          ],
          D,
        ),
      );
      // Images widen into place as they arrive.
      $$("[data-reveal]", to).forEach((el) =>
        A(
          el,
          [
            { clipPath: dir > 0 ? "inset(0 0 0 72%)" : "inset(0 72% 0 0)" },
            { clipPath: "inset(0 0 0 0)" },
          ],
          D + 300,
          IO,
          150,
        ),
      );
    } else if (type === "fade") {
      A(to, [{ opacity: 0 }, { opacity: 1 }], 900, E);
    } else if (type === "back") {
      A(to, [{ opacity: 0 }, { opacity: 1 }], 550, E);
    } else if (type === "dissolve") {
      A(
        to,
        [
          { opacity: 0, transform: "scale(1.04)" },
          { opacity: 1, transform: "scale(1)" },
        ],
        1600,
        E,
      );
    }

    let ended = false;
    state.end = () => {
      if (ended) return;
      ended = true;
      anims.forEach((a) => a.cancel());
      from.classList.remove("is-leaving");
      state.end = null;
    };
    Promise.all(anims.map((a) => a.finished)).then(
      () => state.end && state.end(),
      () => {},
    );
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
    applyStep(to, step);
    const type = opts.instant
      ? "none"
      : to.dataset.transition || document.body.dataset.transition || "pan";
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
    else if (state.i > 0)
      go(state.i - 1, state.list[state.i - 1]._steps, { back: true });
  }

  // Other scripts (e.g. ../shared/film.js) follow the deck through these two events.
  let lastSlide = null;
  function emit(s) {
    const detail = { slide: s, index: state.i, step: state.step };
    if (s !== lastSlide) {
      lastSlide = s;
      document.dispatchEvent(new CustomEvent("deck:slide", { detail }));
    }
    document.dispatchEvent(new CustomEvent("deck:step", { detail }));
  }

  function changed() {
    const s = state.list[state.i];
    try {
      history.replaceState(null, "", "#" + s.id);
    } catch (e) {
      /* file:// */
    }
    $("#hudCount").textContent = s._label;
    $("#hudTitle").textContent =
      s.dataset.title.replace(/^Act [IV]+ · /, "") +
      (s._steps ? ` · ${state.step}/${s._steps}` : "");
    root.style.setProperty(
      "--p",
      state.list.length > 1 ? state.i / (state.list.length - 1) : 0,
    );
    $("#live").textContent = s.dataset.title;
    store.set("slide", s.id);
    renderNotes();
    emit(s);
  }

  /* ======================================================== Overview */

  function tile(k) {
    const cols = 4,
      gap = 40,
      sc = (1920 - gap * (cols + 1)) / cols / 1920;
    const rows = Math.ceil(state.list.length / cols),
      w = 1920 * sc,
      h = 1080 * sc;
    const top = (1080 - (rows * h + (rows - 1) * gap)) / 2;
    return `translate(${f1(gap + (k % cols) * (w + gap))}px, ${f1(top + Math.floor(k / cols) * (h + gap))}px) scale(${sc.toFixed(4)})`;
  }
  function markSel() {
    state.list.forEach((el, k) => el.classList.toggle("sel", k === state.sel));
  }

  function overview(on = !state.overview, pickIndex) {
    finish();
    if (on) {
      state.overview = true;
      state.sel = state.i;
      stage.classList.add("overview");
      state.list.forEach((el, k) => {
        applyStep(el, el._steps);
        el.style.transform = tile(k);
      });
      markSel();
      return;
    }
    if (!state.overview) return;
    const k = pickIndex ?? state.i;
    const fromT = tile(k);
    state.overview = false;
    stage.classList.remove("overview");
    state.list.forEach((el) => {
      el.style.transform = "";
      el.classList.remove("sel");
      if (el !== state.list[k]) applyStep(el, 0);
    });
    if (k !== state.i) go(k, 0, { instant: true });
    else applyStep(state.list[k], state.step);
    if (!reduced)
      state.list[k].animate([{ transform: fromT }, { transform: "none" }], {
        duration: 650,
        easing: "cubic-bezier(.22,.61,.36,1)",
      });
  }

  /* ======================================================== Presenter notes */

  let notesWin = null,
    notesT0 = 0;
  const NOTES_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>Presenter notes · Bixler's</title>
<style>
  body { margin: 0; padding: 32px 40px 96px; background: #0F1B18; color: #F9F8F0; font: 400 22px/1.55 "Avenir Next", Avenir, system-ui, sans-serif; }
  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; padding-bottom: 18px; border-bottom: 1px solid rgba(249,248,240,.16); }
  #cur { font: 400 36px/1.15 "EB Garamond", Garamond, serif; }
  #step { margin-top: 10px; font: 600 12px/1 "Avenir Next", Avenir, sans-serif; letter-spacing: .2em; text-transform: uppercase; color: rgba(249,248,240,.56); }
  #time { font: 600 30px/1 "Avenir Next", Avenir, sans-serif; font-variant-numeric: tabular-nums; color: #D0D3C7; }
  #notes { margin-top: 26px; max-width: 44em; } #notes p { margin: 0 0 16px; }
  footer { position: fixed; left: 40px; right: 40px; bottom: 26px; display: flex; justify-content: space-between; align-items: center; gap: 16px; font-size: 16px; color: rgba(249,248,240,.56); }
  button { background: none; border: 1px solid rgba(249,248,240,.3); color: #F9F8F0; font: 600 12px/1 "Avenir Next", Avenir, sans-serif; letter-spacing: .16em; text-transform: uppercase; padding: 13px 20px; cursor: pointer; }
</style></head><body>
<header><div><div id="cur"></div><div id="step"></div></div><div id="time">00:00</div></header>
<div id="notes"></div>
<footer><span id="next"></span><span><button id="pv" type="button">Back</button> <button id="nx" type="button">Next</button></span></footer>
</body></html>`;

  function openNotes() {
    if (notesWin && !notesWin.closed) {
      notesWin.focus();
      return;
    }
    notesWin = window.open("", `bixler-notes-${DECK}`, "width=980,height=680");
    if (!notesWin) return;
    notesT0 = Date.now();
    const d = notesWin.document;
    d.open();
    d.write(NOTES_HTML);
    d.close();
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
    d.getElementById("cur").textContent = `${s._label} · ${s.dataset.title}`;
    d.getElementById("step").textContent = s._steps
      ? `Step ${state.step} of ${s._steps}`
      : "";
    d.getElementById("notes").innerHTML =
      ($(".notes", s) || {}).innerHTML || "";
    d.getElementById("next").textContent = nx
      ? `Next · ${nx._label} · ${nx.dataset.title}`
      : "End of presentation";
  }
  setInterval(() => {
    if (!notesWin || notesWin.closed) return;
    const t = Math.floor((Date.now() - notesT0) / 1000);
    notesWin.document.getElementById("time").textContent =
      `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
  }, 1000);

  /* ======================================================== Input */

  const help = $("#help");
  const toggleHelp = (force) => help.classList.toggle("open", force);
  function fullscreen() {
    const d = document;
    if (d.fullscreenElement || d.webkitFullscreenElement)
      (d.exitFullscreen || d.webkitExitFullscreen).call(d);
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
        state.sel = Math.max(
          0,
          Math.min(state.list.length - 1, state.sel + move[k]),
        );
        markSel();
      } else if (k === "Enter" || k === " ") overview(false, state.sel);
      else if (k === "Escape" || k === "o" || k === "O") overview(false);
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
        go(0, 0);
        break;
      case "End":
        go(state.list.length - 1, 0);
        break;
      case "o":
      case "O":
      case "Escape":
        overview(true);
        break;
      case "f":
      case "F":
        fullscreen();
        break;
      default:
        return;
    }
    e.preventDefault();
  }
  addEventListener("keydown", onKey);

  stage.addEventListener("click", (e) => {
    if (state.overview) {
      const s = e.target.closest(".slide");
      if (s) overview(false, state.list.indexOf(s));
      return;
    }
    if (e.target.closest("a, button")) return;
    next();
  });

  let touchX = null;
  stage.addEventListener(
    "touchstart",
    (e) => {
      touchX = e.touches[0].clientX;
    },
    { passive: true },
  );
  stage.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 50) {
      e.preventDefault();
      dx < 0 ? next() : prev();
    }
  });

  // The toolbar comes from the platform (../../shared/controls.js); restart is wired in full.js
  // and the PDF is a plain link.
  const ACTIONS = {
    overview: () => overview(),
    fullscreen,
  };
  $$(".hud button[data-act]").forEach((b) =>
    b.addEventListener("click", () => {
      ACTIONS[b.dataset.act]?.();
      b.blur();
    }),
  );

  let idleTimer,
    overHud = false;
  $(".hud").addEventListener("mouseenter", () => {
    overHud = true;
  });
  $(".hud").addEventListener("mouseleave", () => {
    overHud = false;
  });
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

  const fit = () =>
    root.style.setProperty(
      "--scale",
      Math.min(innerWidth / 1920, innerHeight / 1080),
    );
  addEventListener("resize", fit);
  fit();

  function start() {
    const id = decodeURIComponent(location.hash.slice(1));
    const k = state.list.findIndex((s) => s.id === id);
    go(Math.max(0, k), 0, { instant: true, force: true });
  }
  const fontsReady = document.fonts
    ? Promise.race([
        document.fonts.ready,
        new Promise((r) => setTimeout(r, 1500)),
      ])
    : Promise.resolve();
  fontsReady.then(start);

  window.deck = {
    go: (id, step = 0) =>
      go(
        state.list.findIndex((s) => s.id === id),
        step,
        { instant: true },
      ),
    next,
    prev,
    state,
    reduced,
  };
})();

/* House of Wunder x W&W 2027 · slide engine. No dependencies.
   Same controls as the Bixler's and A. Lange & Söhne decks (keys, toolbar, overview with
   slides to tick, presenter notes, two languages, PDF), with its own motion grammar:
   every slide comes out of the dark like an image developing, chapters and concepts
   open through a halo, moodboards are chambers whose themes surface one click at a time.

   Slide attributes
     id                  URL anchor (#c1-moods)
     data-transition     bloom (default) · aura · drape · fade · none
     data-steps          clicks spent inside the slide before moving on
     data-tone           dark · plum · velvet · ivory (the cursor halo shows on the dark ones)
     data-concept        1–4: the slide belongs to that concept (compass, keys 1–4)
     data-print-each     on paper, one page per step
     data-default-hidden left out of the presentation until ticked in the overview
     data-t-label        content key for the label (HUD, overview, notes)
   Inside a slide
     [data-step="n"]     .on from step n, .at at step n, .past after n
     [data-only="n m"]   .on at those steps only
     [data-depth="x"]    follows the mouse a little (positive comes forward, negative recedes)
     [data-t="key"]      text from content/<lang>.json: **bold**, line breaks, lists of paragraphs
     [data-notes="key"]  presenter notes (array of paragraphs)
     [data-go="id"]      a click goes to that slide
     img[data-src]       loaded for the current and the next slide only                 */
(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  const stage = $("#stage");
  const ALL = $$(".slide", stage);
  const CFG = Object.assign({ LANG: "en", LANGS: ["en"] }, window.DECK_CONFIG);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pad = (n) => String(n).padStart(2, "0");
  const E = "cubic-bezier(.22,.61,.36,1)";
  const IO = "cubic-bezier(.65,0,.35,1)";
  const PRINT_MODE = new URLSearchParams(location.search).has("print"); // ?print, for headless PDF export

  let T = {}; // current content

  /* ======================================================== Content */

  function lookup(key) {
    return key.split(".").reduce((o, k) => (o == null ? o : o[k]), T);
  }
  // **bold** and line breaks, from our own content files (escaped first)
  const escHTML = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const rich = (s) => escHTML(s).replace(/\*\*(.+?)\*\*/gs, "<strong>$1</strong>").replace(/\n/g, "<br>");
  function render(el, v) {
    if (Array.isArray(v)) {
      el.innerHTML = v
        .map((p) => (p.startsWith("• ") ? `<p class="bullet">${rich(p.slice(2))}</p>` : `<p>${rich(p)}</p>`))
        .join("");
    } else el.innerHTML = rich(v);
  }
  function fill(lang) {
    root.lang = lang;
    if (T.meta && T.meta.title) document.title = T.meta.title;
    $$("[data-t]").forEach((el) => {
      const v = lookup(el.dataset.t);
      if (typeof v === "string" || Array.isArray(v)) render(el, v);
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
    ALL.forEach((s) => {
      const v = s.dataset.tLabel && lookup(s.dataset.tLabel);
      s.dataset.label = v || s.id;
    });
    renderHelp();
    renderControls(lang);
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
  // Toolbar tooltips, the PDF of the current language, the tick bar.
  function renderControls(lang) {
    $$(".hud [aria-label]").forEach((el) => (el.title = el.getAttribute("aria-label")));
    const pdf = $('.hud [data-act="pdf"]');
    pdf.setAttribute("href", `export/how-ww-2027-${lang}.pdf`);
    pdf.setAttribute("download", (T.meta.hud && T.meta.hud.pdfFile) || "deck.pdf");
    const lb = $('.hud [data-act="lang"]');
    if (lb && CFG.LANGS.length < 2) lb.hidden = true;
    marks();
  }

  async function loadContent() {
    const q = new URLSearchParams(location.search).get("lang");
    const lang = CFG.LANGS.includes(q) ? q : CFG.LANG;
    const res = await fetch(`content/${lang}.json`, { cache: "no-cache" });
    T = await res.json();
    fill(lang);
  }

  /* ======================================================== Images: current and next slide only */

  // For the PDF export (?print) the opaque pictures come as JPEG (assets/img/print/), which
  // Chrome embeds as they are: the PDF stays light. A picture without a JPEG keeps its WebP.
  const WITH_ALPHA = /\/(i2|i53)\.webp$/; // transparent pictures: no JPEG for them
  const printSrc = (src) =>
    WITH_ALPHA.test(src) ? src : src.replace(/assets\/img\/([^/]+)\.webp$/, "assets/img/print/$1.jpg");
  function setSrc(img, src) {
    img.src = PRINT_MODE ? printSrc(src) : src;
  }
  function loadImages(slide) {
    if (!slide) return;
    $$("img[data-src]", slide).forEach((img) => {
      setSrc(img, img.dataset.src);
      img.removeAttribute("data-src");
    });
  }
  if (PRINT_MODE) $$("img[src]", stage).forEach((img) => setSrc(img, img.getAttribute("src")));

  /* ======================================================== State and steps */

  const state = { list: ALL, i: 0, step: 0, overview: false, sel: 0, end: null };

  function stepsOf(v) {
    return String(v ?? "")
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((x) => +x || 0);
  }
  function countSteps(list = ALL) {
    list.forEach((s) => {
      const nums = $$("[data-step],[data-only]", s).flatMap((e) => stepsOf(e.dataset.step ?? e.dataset.only));
      s._steps = Math.max(+s.dataset.steps || 0, 0, ...nums);
    });
  }
  countSteps();

  function applyStep(s, step) {
    s.style.setProperty("--step", step);
    for (let k = 1; k <= s._steps; k++) s.classList.toggle("s" + k, step >= k);
    $$("[data-step]", s).forEach((e) => {
      const k = +e.dataset.step;
      e.classList.toggle("on", step >= k);
      e.classList.toggle("at", step === k);
      e.classList.toggle("past", step > k);
    });
    $$("[data-only]", s).forEach((e) => e.classList.toggle("on", stepsOf(e.dataset.only).includes(step)));
    const mc = $(".mc-cur", s);
    if (mc) mc.textContent = pad(step + 1);
  }

  /* ======================================================== Print: every slide at its last step,
     the slides marked data-print-each once per step (export/pages.json counts the same way). */

  let printClones = [],
    printing = false;
  function preparePrint() {
    if (printing) return; // ?print has already laid the pages out
    printing = true;
    ALL.forEach((s) => {
      loadImages(s);
      s.classList.add("snap");
      if (!("printEach" in s.dataset)) return applyStep(s, s._steps);
      let after = s;
      for (let k = 0; k < s._steps; k++) {
        const c = s.cloneNode(true);
        c.removeAttribute("id");
        c.classList.add("print-clone");
        c._steps = s._steps;
        applyStep(c, k);
        after.after(c);
        after = c;
        printClones.push(c);
      }
      applyStep(s, s._steps);
      // the clones come first: move the original to the end of its run
      after.after(s);
    });
    $$("video", stage).forEach((v) => v.pause());
  }
  function restoreScreen() {
    if (PRINT_MODE || !printing) return;
    printing = false;
    printClones.forEach((c) => c.remove());
    printClones = [];
    // the originals moved: put them back in order
    ALL.forEach((s) => stage.append(s));
    ALL.forEach((s) => {
      if (s !== state.list[state.i]) applyStep(s, 0);
      s.classList.remove("snap");
    });
    applyStep(state.list[state.i], state.step);
  }
  addEventListener("beforeprint", preparePrint);
  addEventListener("afterprint", restoreScreen);

  /* ======================================================== Transitions */

  function finish() {
    if (state.end) state.end();
  }

  function transition(from, to, type, back) {
    finish();
    if (reduced && type !== "none") type = "fade";
    if (back && type !== "none") type = "fade";
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

    if (type === "bloom") {
      // The page goes dark, the next one develops out of it: blurred, overexposed, then sharp.
      A(from, [{ opacity: 1, filter: "blur(0px) brightness(1)" }, { opacity: 0, filter: "blur(18px) brightness(.35)" }], 900, E);
      A(
        to,
        [
          { opacity: 0, filter: "blur(26px) brightness(1.7) saturate(.6)", transform: "scale(1.035)" },
          { opacity: 1, filter: "blur(0px) brightness(1) saturate(1)", transform: "scale(1)" },
        ],
        1300,
        E,
        220,
      );
    } else if (type === "aura") {
      // A halo opens from the centre and the new page glows into place.
      A(from, [{ opacity: 1, filter: "brightness(1)" }, { opacity: 0, filter: "brightness(.2)" }], 900, E);
      A(
        to,
        [
          { "--aura": "0%", opacity: 0.2, filter: "brightness(1.6)" },
          { "--aura": "140%", opacity: 1, filter: "brightness(1)" },
        ],
        1600,
        E,
        150,
      );
      to.classList.add("aura-in");
      anims[anims.length - 1].finished.then(() => to.classList.remove("aura-in"), () => to.classList.remove("aura-in"));
    } else if (type === "drape") {
      // A velvet drape draws across: the new page arrives behind a soft moving edge.
      A(from, [{ opacity: 1, filter: "brightness(1)" }, { opacity: 0.3, filter: "brightness(.4)" }], 1200, E);
      A(to, [{ "--drape": "-30%" }, { "--drape": "130%" }], 1400, IO);
      to.classList.add("drape-in");
      anims[anims.length - 1].finished.then(() => to.classList.remove("drape-in"), () => to.classList.remove("drape-in"));
    } else if (type === "fade") {
      A(to, [{ opacity: 0 }, { opacity: 1 }], 700, E);
    }

    let ended = false;
    state.end = () => {
      if (ended) return;
      ended = true;
      anims.forEach((a) => a.cancel());
      from.classList.remove("is-leaving");
      to.classList.remove("aura-in", "drape-in");
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
    to.classList.add("snap");
    applyStep(to, step);
    void to.offsetWidth;
    to.classList.remove("snap");
    const type = opts.instant ? "none" : to.dataset.transition || "bloom";
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
    if (!state.overview) relist(false, s);
    const H = (T.meta && T.meta.hud) || {};
    $("#hudCount").textContent = `${pad(state.i + 1)} / ${pad(state.list.length)}`;
    $("#hudTitle").textContent =
      s.dataset.label + (s._steps ? ` · ${tpl(H.step, { n: state.step, total: s._steps })}` : "");
    root.style.setProperty("--p", state.list.length > 1 ? state.i / (state.list.length - 1) : 0);
    root.dataset.tone = s.dataset.tone || "dark";
    renderNotes();
    if (s !== lastSlide) {
      lastSlide = s;
      onSlide(s);
    }
  }

  // Videos play only on their slide.
  function onSlide(s) {
    $$("video", stage).forEach((v) => {
      if (s.contains(v)) {
        if (v.dataset.vsrc && !v.src) v.src = v.dataset.vsrc;
        v.play().catch(() => {});
      } else v.pause();
    });
  }

  /* ======================================================== Contents (overview grid) */

  const tpl = (s, o) => String(s || "").replace(/\{(\w+)\}/g, (_, k) => o[k] ?? "");
  const f1 = (n) => (+n).toFixed(1);
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
      relist(true);
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
      const hi = (a - t) / k - top,
        lo = (b - t) / k - bottom;
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
     it) and of the PDF. Click its tick or press H to tick or untick it; a click elsewhere on it or Enter
     opens it. The choice stays in this browser. The slides hidden in the PowerPoint start unticked. */
  const HKEY = "how-hidden";
  let hidden = new Set(ALL.filter((s) => "defaultHidden" in s.dataset).map((s) => s.id));
  try {
    const saved = localStorage.getItem(HKEY);
    if (saved !== null) hidden = new Set(JSON.parse(saved).filter((id) => ALL.some((s) => s.id === id)));
  } catch (e) {
    /* storage unavailable: the PowerPoint's choice */
  }
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
    picks.innerHTML =
      `<span class="picks-t">${P.title || ""}</span>` +
      `<span class="picks-n">${tpl(P.count, { on: ALL.filter(shown).length, all: ALL.length })}</span>` +
      `<span class="picks-b">${hidden.size ? `<button type="button" data-all>${P.all}</button>` : ""}</span>`;
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
  picks.addEventListener("click", (e) => {
    if (e.target.closest("[data-all]")) {
      hidden.clear();
      saveHidden();
    }
  });

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
  const toConcepts = () => goId("wrap");

  /* ======================================================== Presenter notes (key n) */

  let notesWin = null,
    notesT0 = 0;
  const NOTES_HTML = `<!doctype html><html><head><meta charset="utf-8"><title></title>
<style>
  body { margin: 0; padding: 36px 44px 104px; background: #1C1726; color: #F6F4F1; font: 300 21px/1.6 "Archivo", "Helvetica Neue", Arial, sans-serif; }
  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; padding-bottom: 18px; border-bottom: 1px solid #B8936A; }
  #cur { font: 400 34px/1.15 "Aviano", Georgia, serif; letter-spacing: .04em; text-transform: uppercase; color: #E3C99D; }
  #step { margin-top: 10px; font-size: 12px; letter-spacing: .2em; text-transform: uppercase; color: #8E929A; }
  #time { font-size: 28px; font-variant-numeric: tabular-nums; color: #B8936A; }
  #notes { margin-top: 26px; max-width: 46em; } #notes p { margin: 0 0 16px; }
  footer { position: fixed; left: 44px; right: 44px; bottom: 28px; display: flex; justify-content: space-between; align-items: center; gap: 16px; font-size: 13px; letter-spacing: .06em; color: #8E929A; }
  button { background: none; border: 1px solid rgba(246,244,241,.3); color: #F6F4F1; font: inherit; font-size: 12px; letter-spacing: .16em; text-transform: uppercase; padding: 12px 18px; cursor: pointer; }
</style></head><body>
<header><div><div id="cur"></div><div id="step"></div></div><div id="time">00:00</div></header>
<div id="notes"></div>
<footer><span id="next"></span><span><button id="pv" type="button"></button> <button id="nx" type="button"></button></span></footer>
</body></html>`;

  function openNotes() {
    if (notesWin && !notesWin.closed) {
      notesWin.focus();
      return;
    }
    notesWin = window.open("", "how-notes", "width=1000,height=700");
    if (!notesWin) {
      help.replaceChildren(document.createTextNode(T.meta.notesBlocked));
      toggleHelp(true);
      setTimeout(() => {
        toggleHelp(false);
        renderHelp();
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
    d.getElementById("step").textContent = s._steps ? tpl(T.meta.notesStep, { n: state.step, total: s._steps }) : "";
    const notes = $(".notes", s);
    d.getElementById("notes").replaceChildren(...(notes ? [...notes.children].map((p) => d.importNode(p, true)) : []));
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
      // the tick (top right) shows or hides the slide; anywhere else on it opens it
      const s = e.target.closest(".slide");
      if (!s) return;
      if (e.target.closest(".pick")) {
        state.sel = state.list.indexOf(s);
        markSel();
        toggleShown(s);
      } else overview(false, state.list.indexOf(s));
      return;
    }
    const to = e.target.closest("[data-go]");
    if (to) return goId(to.dataset.go);
    if (e.target.closest("a, button, video")) return;
    next();
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

  /* ======================================================== The halo and the depth (mouse)
     On the dark pages a soft light follows the pointer; [data-depth] layers drift with it. */

  const halo = $(".aura-cursor");
  let mx = 0.5,
    my = 0.5,
    tx = 0.5,
    ty = 0.5,
    raf = 0;
  addEventListener("mousemove", (e) => {
    tx = e.clientX / innerWidth;
    ty = e.clientY / innerHeight;
    halo.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    if (!raf && !reduced) raf = requestAnimationFrame(drift);
  });
  function drift() {
    mx += (tx - mx) * 0.08;
    my += (ty - my) * 0.08;
    const s = state.list[state.i];
    if (s && !state.overview)
      $$("[data-depth]", s).forEach((el) => {
        const d = +el.dataset.depth;
        el.style.translate = `${f1((mx - 0.5) * d * -36)}px ${f1((my - 0.5) * d * -24)}px`;
      });
    raf = Math.abs(tx - mx) + Math.abs(ty - my) > 0.001 ? requestAnimationFrame(drift) : 0;
  }

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
    lang: switchLang,
    fullscreen,
  };
  $$(".hud button[data-act]").forEach((b) =>
    b.addEventListener("click", () => {
      ACTIONS[b.dataset.act]();
      b.blur();
    }),
  );

  // PDF: the exported deck of the current language, or, with slides unticked, only their pages,
  // taken from it in the browser (pdf-lib; export/pages.json says which page is whose).
  // No exported file (the working copy): the browser's print dialog.
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
    relist(false, want);
    go(Math.max(0, state.list.indexOf(want)), +hstep || 0, { instant: true, force: true });
    if (PRINT_MODE) {
      root.classList.add("print-mode");
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

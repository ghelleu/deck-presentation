/* The viewer, the same on every deck of deck-presentation.com: everything a deck does not draw itself.
   It owns the keys, the swipe, the toolbar's buttons and its showing while the mouse moves, the slide
   count and the progress line, the address of each slide (#id), the slides to present (the ticks,
   kept in this browser), the overview (all slides as a grid, key O) and the PDF of the ticked slides.
   The deck keeps its slides, their look, their animations and the steps inside a slide.

   In the deck's index.html, after controls.js and i18n.js, before the deck's engine:
     <link rel="stylesheet" href="../shared/viewer.css">   (with gate.css and controls.css, before styles.css)
     <script src="../shared/viewer.js"></script>
   The deck's engine then hands its slides over, once its texts are in place:
     const V = DeckViewer.mount({
       slides: [{ id, label }, …],         // in order; label: the title in the toolbar and the grid
       show(i, step, instant) { … },       // put slide i on screen at this step (0, or "end" for its last)
       step(d) { … return true; },         // optional: one step forward (d = 1) or back (-1) inside the
                                           //   current slide; return false at its first/last step
       thumb(i) { … return el; },          // a 1920 × 1080 element: slide i as a page, every step shown
       stage: element,                     // optional: a click on it moves on (not on links or buttons)
       lang() { … },                       // optional: when the deck switches languages itself
     });
     V.go(i) · V.goId(id) · V.next() · V.prev() · V.current() · V.hidden(id)
   Keys: → ↓ Space Enter PageDown next · ← ↑ Backspace PageUp back · Home R the beginning · End the last
   · F fullscreen · O and Esc the overview (in it: arrows choose, Enter opens). No other key.
   The PDF of the ticked slides: export/pages.json ({ "pages": { id: [page, …] } }) says which pages of the
   exported PDF are whose; without it, or with every slide ticked, the bar's link downloads the whole PDF. */
(function () {
  const root = document.documentElement;
  const cfg = window.DECK_CONFIG || {};
  const words = (lang) => lang === "fr"
    ? { title: "Slides à présenter", count: (on, all) => `<b>${on}</b> / ${all}`, all: "Tout réafficher", hidden: "Masquée", tick: "Masquer ou afficher cette slide", grid: "Toutes les slides" }
    : { title: "Slides to present", count: (on, all) => `<b>${on}</b> / ${all}`, all: "Show all", hidden: "Hidden", tick: "Hide or show this slide", grid: "All slides" };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const EASE = "cubic-bezier(0.22, 0.61, 0.36, 1)";
  const $ = (s, el = document) => el.querySelector(s);

  function mount(deck) {
    const W = words((root.lang || cfg.LANG || "fr").slice(0, 2)); // the language is set by i18n.js by now
    const S = deck.slides;
    const N = S.length;
    const KEY = "deck-hidden:" + location.pathname.replace(/[^/]*$/, "");
    let hidden = new Set();
    try {
      hidden = new Set(JSON.parse(localStorage.getItem(KEY) || "[]").filter((id) => S.some((s) => s.id === id)));
    } catch (e) { /* no storage: every slide shows */ }
    if (hidden.size >= N) hidden.clear();
    const shown = (k) => !hidden.has(S[k].id);
    let cur = Math.max(0, S.findIndex((s) => "#" + s.id === decodeURIComponent(location.hash)));
    if (!shown(cur)) cur = Math.max(0, S.findIndex((s, k) => shown(k)));

    // ---------------------------------------------------------------- moving through the deck
    function update() {
      const list = S.map((s, k) => k).filter(shown);
      const n = Math.max(0, list.indexOf(cur));
      const count = $("#hudCount"), title = $("#hudTitle"), bar = $(".progress");
      if (count) count.textContent = String(n + 1).padStart(2, "0") + " / " + String(list.length).padStart(2, "0");
      if (title) title.textContent = S[cur].label || "";
      const p = list.length > 1 ? n / (list.length - 1) : 1;
      root.style.setProperty("--p", p);
      if (bar) bar.style.setProperty("--p", p);
      if (location.hash !== "#" + S[cur].id) history.replaceState(null, "", location.search + "#" + S[cur].id);
    }
    function go(i, step = 0, instant) {
      cur = Math.max(0, Math.min(N - 1, i));
      deck.show(cur, step, instant);
      update();
    }
    const near = (from, d) => { for (let k = from + d; k >= 0 && k < N; k += d) if (shown(k)) return k; return -1; };
    function next() {
      if (deck.step && deck.step(1)) return;
      const k = near(cur, 1);
      if (k >= 0) go(k, 0);
    }
    function prev() {
      if (deck.step && deck.step(-1)) return;
      const k = near(cur, -1);
      if (k >= 0) go(k, "end");
    }
    const first = () => Math.max(0, near(-1, 1));
    const last = () => Math.max(0, near(N, -1));
    const restart = () => (open ? overview(false, first()) : go(first(), 0));
    const fullscreen = () =>
      document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen && root.requestFullscreen().catch(() => {});
    const switchLang = async () => {
      if (deck.lang) return deck.lang();
      const L = await window.DECK_I18N;
      if (L) L.switchLang();
    };

    // ---------------------------------------------------------------- the overview: all slides as a grid
    const grid = document.createElement("div");
    grid.className = "vw-grid";
    grid.setAttribute("role", "dialog");
    grid.setAttribute("aria-label", W.grid);
    const tiles = [];
    const picks = document.createElement("div");
    picks.className = "vw-picks";
    picks.setAttribute("role", "toolbar");
    document.body.append(grid, picks);
    let open = false, sel = cur, built = false;

    function build() {
      if (built) return;
      built = true;
      S.forEach((s, k) => {
        const t = document.createElement("div");
        t.className = "vw-tile";
        t.dataset.label = s.label || "";
        const page = document.createElement("div");
        page.className = "vw-page";
        const el = deck.thumb(k);
        if (el) {
          el.removeAttribute("id");
          el.querySelectorAll("[id]").forEach((x) => x.removeAttribute("id"));
          el.setAttribute("aria-hidden", "true");
          el.setAttribute("inert", "");
          page.append(el);
        }
        const tick = document.createElement("button");
        tick.type = "button";
        tick.className = "vw-tick";
        tick.setAttribute("aria-label", W.tick);
        t.append(page, tick);
        t.addEventListener("click", (e) => {
          if (e.target.closest(".vw-tick")) { sel = k; mark(); toggle(k); }
          else overview(false, k);
        });
        grid.append(t);
        tiles.push(t);
      });
      fit();
    }
    function fit() {
      if (!built) return;
      const w = tiles[0] && tiles[0].clientWidth;
      if (w) grid.style.setProperty("--vw-k", w / 1920);
    }
    function mark() {
      tiles.forEach((t, k) => {
        t.classList.toggle("sel", k === sel);
        t.classList.toggle("cur", k === cur);
        t.classList.toggle("skip", !shown(k));
        $(".vw-tick", t).setAttribute("aria-pressed", String(shown(k)));
      });
      grid.style.setProperty("--vw-hidden", JSON.stringify(W.hidden));
      const on = S.filter((s, k) => shown(k)).length;
      picks.innerHTML =
        `<span class="vw-picks-t">${W.title}</span><span class="vw-picks-n">${W.count(on, N)}</span>` +
        `<span class="vw-picks-b">${hidden.size ? `<button type="button" data-all>${W.all}</button>` : ""}</span>`;
    }
    function save() {
      try { localStorage.setItem(KEY, JSON.stringify([...hidden])); } catch (e) { /* no storage */ }
      mark();
      update();
    }
    function toggle(k) {
      const id = S[k].id;
      if (hidden.has(id)) hidden.delete(id);
      else if (S.filter((s, j) => shown(j)).length > 1) hidden.add(id); // at least one slide stays
      save();
    }
    picks.addEventListener("click", (e) => {
      if (!e.target.closest("[data-all]")) return;
      hidden.clear();
      save();
    });
    function follow() {
      const t = tiles[sel];
      if (!t) return;
      const top = picks.offsetHeight + 16, r = t.getBoundingClientRect();
      if (r.top < top || r.bottom > innerHeight - 16) grid.scrollTop += r.top - (innerHeight + top) / 2 + r.height / 2;
    }
    // the slide on screen shrinks into its place in the grid, and grows back out of it
    function zoom(t, out) {
      if (reduced || !t) return Promise.resolve();
      const r = t.getBoundingClientRect();
      const k = Math.min(innerWidth / 1920, innerHeight / 1080);
      const full = `translate(${(innerWidth - 1920 * k) / 2 - r.left}px, ${(innerHeight - 1080 * k) / 2 - r.top}px) scale(${(1920 * k) / r.width})`;
      t.classList.add("vw-flying");
      const a = t.animate(out ? [{ transform: full }, { transform: "none" }] : [{ transform: "none" }, { transform: full }],
        { duration: 650, easing: EASE });
      // a hidden tab may hold the animation: never wait longer than it lasts
      const done = Promise.race([a.finished.catch(() => {}), new Promise((ok) => setTimeout(ok, 700))]);
      return done.then(() => { a.cancel(); t.classList.remove("vw-flying"); });
    }
    function overview(on = !open, pick) {
      if (on) {
        if (open) return;
        build();
        open = true;
        sel = cur;
        mark();
        root.classList.add("vw-open");
        fit();
        grid.scrollTop = 0;
        follow();
        zoom(tiles[cur], true);
        return;
      }
      if (!open) return;
      const k = pick == null ? cur : pick;
      open = false;
      if (!shown(k) && pick != null) { hidden.delete(S[k].id); save(); }
      go(k, 0, true);
      zoom(tiles[k], false).then(() => root.classList.remove("vw-open"));
      if (reduced) root.classList.remove("vw-open");
    }
    addEventListener("resize", fit);

    // ---------------------------------------------------------------- the PDF of the ticked slides
    const pdfLink = $('.hud [data-act="pdf"]');
    let pdfLib = null;
    const loadLib = () =>
      (pdfLib = pdfLib || new Promise((ok, no) => {
        const sc = document.createElement("script");
        sc.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js";
        sc.onload = () => ok(window.PDFLib);
        sc.onerror = () => { pdfLib = null; no(new Error("pdf-lib did not load")); };
        document.head.append(sc);
      }));
    if (pdfLink) pdfLink.addEventListener("click", async (e) => {
      if (!hidden.size) return; // every slide ticked: the whole PDF, as exported
      e.preventDefault();
      if (pdfLink.classList.contains("busy")) return;
      pdfLink.classList.add("busy");
      try {
        const href = pdfLink.getAttribute("href");
        const map = await fetch(href.replace(/[^/]*$/, "pages.json"), { cache: "no-cache" }).then((r) => (r.ok ? r.json() : Promise.reject(new Error("no pages.json"))));
        const pages = S.filter((s, k) => shown(k)).flatMap((s) => (map.pages || {})[s.id] || []);
        if (!pages.length) throw new Error("no pages for the ticked slides");
        const [lib, bytes] = await Promise.all([loadLib(), fetch(href).then((r) => r.arrayBuffer())]);
        const src = await lib.PDFDocument.load(bytes);
        const out = await lib.PDFDocument.create();
        (await out.copyPages(src, pages)).forEach((p) => out.addPage(p));
        const url = URL.createObjectURL(new Blob([await out.save()], { type: "application/pdf" }));
        Object.assign(document.createElement("a"), { href: url, download: pdfLink.getAttribute("download") || "deck.pdf" }).click();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } catch (err) {
        console.warn("PDF of the ticked slides failed, the whole deck instead:", err);
        Object.assign(document.createElement("a"), { href: pdfLink.getAttribute("href"), download: pdfLink.getAttribute("download") || "" }).click();
      } finally {
        pdfLink.classList.remove("busy");
      }
    });

    // ---------------------------------------------------------------- the toolbar's buttons (../shared/controls.js)
    const ACTIONS = { fullscreen, restart, overview: () => overview(), lang: switchLang };
    document.querySelectorAll(".hud button[data-act]").forEach((b) =>
      b.addEventListener("click", () => { ACTIONS[b.dataset.act] && ACTIONS[b.dataset.act](); b.blur(); }));

    // ---------------------------------------------------------------- keys: these and no other
    addEventListener("keydown", (e) => {
      if (root.classList.contains("gated") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^(input|textarea|select)$/i.test((e.target && e.target.tagName) || "")) return;
      const k = e.key;
      if (open) {
        const cols = Math.max(1, Math.round(grid.clientWidth / ((tiles[0] && tiles[0].offsetWidth) || 1) - 0.2));
        const move = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[k];
        if (move) { sel = Math.max(0, Math.min(N - 1, sel + move)); mark(); follow(); }
        else if (k === "Enter" || k === " ") overview(false, sel);
        else if (k === "o" || k === "O" || k === "Escape") overview(false);
        else if (k === "f" || k === "F") fullscreen();
        else if (k === "r" || k === "R" || k === "Home") overview(false, first());
        else return;
      } else if (["ArrowRight", "ArrowDown", " ", "Enter", "PageDown"].includes(k)) next();
      else if (["ArrowLeft", "ArrowUp", "Backspace", "PageUp"].includes(k)) prev();
      else if (k === "Home" || k === "r" || k === "R") restart();
      else if (k === "End") go(last(), "end");
      else if (k === "f" || k === "F") fullscreen();
      else if (k === "o" || k === "O" || k === "Escape") overview(true);
      else return;
      e.preventDefault();
    });

    // ---------------------------------------------------------------- click, swipe, address
    if (deck.stage) deck.stage.addEventListener("click", (e) => {
      if (open || e.target.closest("a, button, [data-go], input, video[controls]")) return;
      next();
    });
    let touch = null;
    addEventListener("touchstart", (e) => (touch = [e.touches[0].clientX, e.touches[0].clientY]), { passive: true });
    addEventListener("touchend", (e) => {
      if (!touch || open) return;
      const dx = e.changedTouches[0].clientX - touch[0], dy = e.changedTouches[0].clientY - touch[1];
      touch = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? next : prev)();
    });
    addEventListener("hashchange", () => {
      const k = S.findIndex((s) => "#" + s.id === decodeURIComponent(location.hash));
      if (k >= 0 && k !== cur) go(k, 0, true);
    });

    // ---------------------------------------------------------------- the toolbar shows while the mouse moves
    let idle;
    addEventListener("mousemove", () => {
      document.body.classList.add("show-hud");
      document.body.classList.remove("idle");
      clearTimeout(idle);
      idle = setTimeout(() => {
        if (open) return;
        document.body.classList.remove("show-hud");
        document.body.classList.add("idle");
      }, 2200);
    });

    go(cur, 0, true);
    return {
      go: (i, step) => go(i, step),
      goId: (id, step) => { const k = S.findIndex((s) => s.id === id); if (k >= 0) go(k, step); },
      next, prev,
      current: () => cur,
      hidden: (id) => hidden.has(id),
      overview: (on) => overview(on),
    };
  }

  window.DeckViewer = { mount };
})();

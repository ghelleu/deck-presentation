/* The deck's engine: what is behind the platform's five controls, and nothing more.
   The platform (../shared/) draws the toolbar and the access screen and loads the languages;
   this file moves through the slides and answers the toolbar:
     data-act="fullscreen" · "restart" · "overview" · "lang" · the PDF link (set by i18n.js)
   Keys: → Space Enter PageDown next · ← Backspace PageUp back · Home End · F R O · Esc closes the thumbnails.
   No other key, no other button. Start a new deck from here: change the slides and styles.css, keep this file. */
(async function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  const stage = $("#stage");
  const slides = $$(".slide", stage);
  const L = await window.DECK_I18N; // the texts of the language are in place from here

  // ?print: every slide on its own page, for the PDF export (Chrome --print-to-pdf "…/?print")
  if (new URLSearchParams(location.search).has("print")) {
    root.classList.add("print");
    return;
  }

  // ---------------------------------------------------------- the page fits the window
  const fit = () => stage.style.setProperty("--k", Math.min(innerWidth / 1920, innerHeight / 1080));
  addEventListener("resize", fit);
  fit();

  // ---------------------------------------------------------- slides hidden from the presentation (the ticks)
  const KEY = "deck-hidden:" + location.pathname;
  let hidden = new Set();
  try { hidden = new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify([...hidden])); } catch (e) {} };
  const shown = () => slides.filter((s) => !hidden.has(s.id));

  // ---------------------------------------------------------- moving through the deck
  let cur = Math.max(0, slides.findIndex((s) => "#" + s.id === location.hash));
  function go(i) {
    cur = Math.max(0, Math.min(slides.length - 1, i));
    slides.forEach((s, k) => s.classList.toggle("on", k === cur));
    const s = slides[cur];
    const list = shown();
    const n = Math.max(0, list.indexOf(s));
    $("#hudCount").textContent = String(n + 1).padStart(2, "0") + " / " + String(list.length).padStart(2, "0");
    $("#hudTitle").textContent = s.dataset.label || "";
    $("#progress").style.setProperty("--p", list.length > 1 ? n / (list.length - 1) : 1);
    history.replaceState(null, "", location.search + "#" + s.id);
  }
  function step(d) {
    const list = shown();
    const n = list.indexOf(slides[cur]);
    const next = list[n < 0 ? 0 : Math.max(0, Math.min(list.length - 1, n + d))];
    if (next) go(slides.indexOf(next));
  }
  const restart = () => { const first = shown()[0]; if (first) go(slides.indexOf(first)); };
  const fullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen?.());

  // ---------------------------------------------------------- all slides (O): a click opens, the tick hides or shows
  const ov = document.createElement("div");
  ov.className = "overview";
  document.body.append(ov);
  function buildOverview() {
    ov.replaceChildren(
      ...slides.map((s, k) => {
        const f = document.createElement("figure");
        f.className = "thumb" + (k === cur ? " cur" : "") + (hidden.has(s.id) ? " off" : "");
        f.style.margin = "0";
        const page = document.createElement("div");
        page.className = "page";
        page.append(s.cloneNode(true));
        page.firstChild.removeAttribute("id");
        const cap = document.createElement("figcaption");
        cap.textContent = s.dataset.label || s.id;
        const tick = document.createElement("button");
        tick.className = "tick";
        tick.type = "button";
        tick.setAttribute("aria-label", L.lang === "fr" ? "Masquer ou afficher cette slide" : "Hide or show this slide");
        tick.addEventListener("click", (e) => {
          e.stopPropagation();
          hidden.has(s.id) ? hidden.delete(s.id) : hidden.add(s.id);
          save();
          f.classList.toggle("off", hidden.has(s.id));
        });
        f.addEventListener("click", () => { overview(false); go(k); });
        f.append(page, cap, tick);
        return f;
      }),
    );
    requestAnimationFrame(() => $$(".thumb", ov).forEach((t) => ($(".page", t).style.transform = `scale(${t.clientWidth / 1920})`)));
  }
  function overview(open = !document.body.classList.contains("ov")) {
    if (open) buildOverview();
    document.body.classList.toggle("ov", open);
    if (!open) go(cur);
  }

  // ---------------------------------------------------------- the toolbar's buttons (drawn by ../shared/controls.js)
  const ACTIONS = { fullscreen, restart, overview: () => overview(), lang: () => L.switchLang() };
  $$(".hud button[data-act]").forEach((b) =>
    b.addEventListener("click", () => { ACTIONS[b.dataset.act]?.(); b.blur(); }),
  );

  // ---------------------------------------------------------- keys: these and no other
  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const inOv = document.body.classList.contains("ov");
    switch (e.key) {
      case "ArrowRight": case " ": case "Enter": case "PageDown": if (!inOv) step(1); break;
      case "ArrowLeft": case "Backspace": case "PageUp": if (!inOv) step(-1); break;
      case "Home": if (!inOv) restart(); break;
      case "End": if (!inOv) { const l = shown(); go(slides.indexOf(l[l.length - 1])); } break;
      case "f": case "F": fullscreen(); break;
      case "r": case "R": restart(); break;
      case "o": case "O": case "Escape": overview(); break;
      default: return;
    }
    e.preventDefault();
  });
  stage.addEventListener("click", () => step(1));

  // ---------------------------------------------------------- the toolbar shows while the mouse moves
  let idle;
  addEventListener("mousemove", () => {
    document.body.classList.add("show-hud");
    document.body.classList.remove("idle");
    clearTimeout(idle);
    idle = setTimeout(() => { document.body.classList.remove("show-hud"); document.body.classList.add("idle"); }, 2200);
  });

  go(cur);
})();

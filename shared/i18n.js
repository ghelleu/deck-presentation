/* The languages of a deck, the same on every deck of deck-presentation.com.
   The language comes from ?lang= (one of DECK_CONFIG.LANGS), else DECK_CONFIG.LANG. The deck's texts live in
   content/<lang>.json:
     { "ui": { "title": "…", … words the engine draws itself … },
       "text":   { key: inner HTML },   for [data-t="key"]        (line breaks are composed by hand in each language)
       "alt":    { key: alt text },     for img[data-t-alt="key"]
       "labels": { key: label },        for [data-t-label="key"]  (sets data-label: hud title, overview caption)
       "views":  { id: [label, kicker] }  for decks whose views are a JSON plan }
   The page itself is written in the first language: it stays as written when the file cannot be read.
   The PDF link of the bar may hold {lang}: data-pdf="export/deck-{lang}.pdf".

   In the deck's index.html, after controls.js and before the engine:
     <script src="../shared/i18n.js"></script>
   The engine waits for it, then wires the language button to it:
     const L = await window.DECK_I18N;   // { lang, T, ui, other, switchLang() }
     … data-act="lang" → L.switchLang()  (reloads in the other language, at the same view) */
(function () {
  const cfg = window.DECK_CONFIG || {};
  const langs = cfg.LANGS || [cfg.LANG || document.documentElement.lang || "fr"];
  const asked = new URLSearchParams(location.search).get("lang");
  const lang = langs.includes(asked) ? asked : cfg.LANG || langs[0];
  const other = langs.find((l) => l !== lang) || null;
  const $$ = (s) => [...document.querySelectorAll(s)];

  function apply(T) {
    document.documentElement.lang = lang;
    if (!T) return;
    if (T.ui && T.ui.title) document.title = T.ui.title;
    const pick = (part, key) => (T[part] && typeof T[part][key] === "string" ? T[part][key] : null);
    $$("[data-t]").forEach((el) => { const v = pick("text", el.dataset.t); if (v !== null) el.innerHTML = v; });
    $$("[data-t-alt]").forEach((el) => { const v = pick("alt", el.dataset.tAlt); if (v !== null) el.alt = v; });
    $$("[data-t-label]").forEach((el) => { const v = pick("labels", el.dataset.tLabel); if (v !== null) el.dataset.label = v; });
  }
  function pdf(T) {
    const a = document.querySelector('.hud [data-act="pdf"]');
    if (!a) return;
    a.setAttribute("href", a.getAttribute("href").replace("{lang}", lang));
    if (T && T.ui && T.ui.pdfName) a.setAttribute("download", T.ui.pdfName);
  }
  function switchLang() {
    if (!other) return;
    const u = new URL(location.href);
    u.searchParams.set("lang", other);
    location.href = u.href;
  }

  window.DECK_I18N = fetch(`content/${lang}.json`, { cache: "no-cache" })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
    .then((T) => {
      apply(T); pdf(T);
      return { lang, other, T, ui: (T && T.ui) || {}, switchLang };
    });
})();

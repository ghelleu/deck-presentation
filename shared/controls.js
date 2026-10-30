/* The deck controls, the same on every deck of deck-presentation.com.
   The platform sets which controls exist, their order, icons and labels; each deck only does
   the work behind them. Five controls, nothing else:
     fullscreen (F) · restart (R) · overview (O) · language · download (the PDF)
   Keys: the arrows, Space, Enter, Backspace, PageUp/PageDown and Home/End move through the deck;
   F, R and O match the buttons; Esc opens and closes the overview. No other key.

   In the deck's index.html, after config.js and before the deck's engine:
     <div class="hud" role="toolbar">
       <div class="hud-l"><span class="hud-count" id="hudCount"></span><span class="hud-title" id="hudTitle"></span></div>
       <div class="hud-r" data-controls data-pdf="export/deck.pdf" data-pdf-name="Deck.pdf"></div>
     </div>
     <script src="../shared/controls.js"></script>
   The engine then wires the buttons by data-act: restart, overview, lang, fullscreen, and the
   link data-act="pdf" (it may change its address, e.g. per language). The language button only
   shows when DECK_CONFIG.LANGS has two languages or more. */
(function () {
  const box = document.querySelector(".hud [data-controls]");
  if (!box) return;
  const cfg = window.DECK_CONFIG || {};
  const langs = cfg.LANGS || [];
  const asked = new URLSearchParams(location.search).get("lang");
  const lang = langs.includes(asked) ? asked : cfg.LANG || document.documentElement.lang || "en";
  const fr = lang.slice(0, 2) === "fr";
  const other = langs.find((l) => l !== lang);

  const L = fr
    ? { bar: "Commandes de la présentation", fullscreen: "Plein écran (F)", restart: "Revenir au début (R)", overview: "Toutes les slides (O)", lang: "Version anglaise", pdf: "Télécharger le PDF" }
    : { bar: "Presentation controls", fullscreen: "Fullscreen (F)", restart: "Back to the beginning (R)", overview: "All slides (O)", lang: "French version", pdf: "Download the PDF" };
  if (other && other.slice(0, 2) !== (fr ? "en" : "fr")) L.lang = other.toUpperCase();

  const icon = {
    fullscreen: '<path d="M2 6.5V2h4.5M11.5 2H16v4.5M16 11.5V16h-4.5M6.5 16H2v-4.5"/>',
    restart: '<path d="M3.5 9a5.5 5.5 0 1 0 1.6-3.9"/><path d="M4.6 2.4v3.1h3.1"/>',
    overview: '<rect x="2" y="2" width="5.5" height="5.5"/><rect x="10.5" y="2" width="5.5" height="5.5"/><rect x="2" y="10.5" width="5.5" height="5.5"/><rect x="10.5" y="10.5" width="5.5" height="5.5"/>',
    pdf: '<path d="M9 2.5v9M5.5 8 9 11.5 12.5 8"/><path d="M3 12.5V15.5h12v-3"/>',
  };
  const svg = (k) => `<svg viewBox="0 0 18 18" aria-hidden="true">${icon[k]}</svg>`;
  const btn = (k) => `<button type="button" class="icon" data-act="${k}" aria-label="${L[k]}" title="${L[k]}">${svg(k)}</button>`;
  const pdf = box.dataset.pdf || "";
  const name = (box.dataset.pdfName || "").replace(/"/g, "&quot;");

  box.closest(".hud").setAttribute("aria-label", L.bar);
  box.innerHTML =
    btn("fullscreen") +
    btn("restart") +
    btn("overview") +
    (other ? `<button type="button" class="lang" data-act="lang" aria-label="${L.lang}" title="${L.lang}">${other.toUpperCase()}</button>` : "") +
    `<a class="icon" data-act="pdf" href="${pdf}" download="${name}" aria-label="${L.pdf}" title="${L.pdf}">${svg("pdf")}</a>`;
})();

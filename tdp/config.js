/* Deck settings. Edit here, nowhere else. */
window.DECK_CONFIG = {
  /* French and English: texts in content/<lang>.json, read by ../shared/i18n.js (?lang=en). */
  LANG: "fr",
  LANGS: ["fr", "en"],

  /* Access screen (shared/gate.js): SHA-256 of the 5-digit code, in hex. null: no screen.
     A courtesy screen, not a lock. Skipped for the PDF export (?print) and the local preview.
     To set one: printf 12345 | shasum -a 256 */
  GATE: null,

  /* Folio, bottom of every slide (the folio of each language is in content/<lang>.json, ui.folio). */
  FOLIO: ["la tour des possibles", "Magnetic × Geneva Lux", "novembre 2026"],
};

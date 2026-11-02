/* Deck settings, read by the platform (../shared/). Edit here, nowhere else. */
window.DECK_CONFIG = {
  /* Languages: the first one is the language the page is written in. Texts of the others in content/<lang>.json
     (../shared/i18n.js, ?lang=en). One language only: ["fr"], and the language button disappears. */
  LANG: "fr",
  LANGS: ["fr", "en"],

  /* Access screen (../shared/gate.js): SHA-256 of the 5-digit code, in hex. null: no screen.
     A courtesy screen, not a lock. Skipped for the PDF export (?print) and the local preview (?gate shows it).
     To set one: printf 12345 | shasum -a 256 */
  GATE: null,
};

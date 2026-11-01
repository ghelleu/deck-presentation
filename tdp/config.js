/* Deck settings. Edit here, nowhere else. */
window.DECK_CONFIG = {
  /* One language for now: the source deck is in French. */
  LANG: "fr",
  LANGS: ["fr"],

  /* Access screen (shared/gate.js): SHA-256 of the 5-digit code, in hex. null: no screen.
     A courtesy screen, not a lock. Skipped for the PDF export (?print) and the local preview.
     To set one: printf 12345 | shasum -a 256 */
  GATE: null,

  /* Folio, bottom of every slide. */
  FOLIO: ["la tour des possibles", "Magnetic × Geneva Lux", "novembre 2026"],
};

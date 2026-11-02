/* Deck settings read by the platform (deck-presentation.com/shared/).
   Access screen (/shared/gate.js): SHA-256 of the 5-digit code, in hex. null: no screen.
   A courtesy screen, not a lock. Skipped for the PDF export (?print) and the local preview.
   To change it: printf 12345 | shasum -a 256 */
window.DECK_CONFIG = {
  LANG: "en",
  LANGS: ["en"],
  GATE: "3720d12bf37c38dc8affdd800f700e5c2d13947f7f0d8e3ef4c6e74a3611025e",
};

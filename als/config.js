/* Deck settings. Edit here, nowhere else. */
window.DECK_CONFIG = {
  /* Three statements wait for a written decision from the Maison (see OPEN.md):
     the December 1928 internal note on the precision of the Geneva watches,
     naming a calibre supplier in a sentence that could read as a disavowal,
     and presenting watch 100009 as the house's first official wristwatch.
     false: elements marked data-arb are hidden, or replaced by their data-arb-alt text.
     true: they show as written. */
  ARBITRATION: false,

  /* Default language; ?lang=en in the URL overrides it. */
  LANG: "fr",
  LANGS: ["fr", "en"],

  /* Access screen (gate.js): SHA-256 of the 5-digit code, in hex. null: no screen.
     A courtesy screen, not a lock: the files stay readable by their address.
     Skipped for the PDF export (?print) and the local preview. */
  GATE: "f7d1e8632e310accbe1b06f5f8858ac614143fe117e0ffc4154742e9aab6ab3b",
};

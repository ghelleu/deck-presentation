/* The deck's engine. The platform (../shared/) does everything common to every deck: the access screen,
   the toolbar, the languages, and the viewer (viewer.js): keys, swipe, the overview of all slides with
   their ticks, the slide count and progress, the PDF of the ticked slides.
   This file only tells the viewer what the slides are, how to show one, and what its thumbnail looks like.
   Start a new deck from here: change the slides and styles.css; add animations or steps inside a slide
   in show() and step(), never a key or a button. */
(async function () {
  const root = document.documentElement;
  const stage = document.getElementById("stage");
  const slides = [...stage.querySelectorAll(".slide")];
  await window.DECK_I18N; // the texts of the language are in place from here (labels included)

  // ?print: every slide on its own page, for the PDF export (Chrome --print-to-pdf "…/?print")
  if (new URLSearchParams(location.search).has("print")) {
    root.classList.add("print");
    return;
  }

  // the 1920 × 1080 page fits the window
  const fit = () => stage.style.setProperty("--k", Math.min(innerWidth / 1920, innerHeight / 1080));
  addEventListener("resize", fit);
  fit();

  DeckViewer.mount({
    stage,
    slides: slides.map((s) => ({ id: s.id, label: s.dataset.label || s.id })),
    show(i) {
      slides.forEach((s, k) => s.classList.toggle("on", k === i));
    },
    // a slide with steps would answer here: show the next/previous step and return true,
    // or return false at its first/last step so that the viewer moves to the next/previous slide
    step() {
      return false;
    },
    thumb(i) {
      const c = slides[i].cloneNode(true);
      c.classList.add("on");
      return c;
    },
  });
})();

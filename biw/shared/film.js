/* Bixler's · direction decks — film scrub. No dependencies. Loads after engine.js.
   A slide with data-film="folder/" plays a folder of numbered frames (f0001.webp …) on a
   <canvas class="film">, driven by the deck's step counter: each step has a landing frame
   (data-film-landings="1,120,216,384,480"), and a click scrubs the film to the next landing
   forward at the film's own speed (24 fps, soft landing); going back scrubs in reverse with a
   critically damped spring. Set data-film-play="scrub" for the fast spring both ways. The film
   never plays beyond the next landing on its own.

   Memory: frames are kept as Image objects and decoded progressively with img.decode()
   (frame 1 first, then the landings, then the rest in order). The browser owns the decoded
   pixels and can drop them under pressure; 480 ImageBitmaps at 1920×1080 would pin ~4 GB.

   Cold-open specifics (only when the slide holds a [data-object="dial"]): the dial is hidden
   until the film lands on the dial landing (step 3), then fades in while its hour and minute
   hands spin up to the live Easton time; it fades out as soon as the next step begins. */
(() => {
  "use strict";

  const slide = document.querySelector(".slide[data-film]");
  const deck = window.deck;
  if (!slide || !deck) return;

  const DIR = slide.dataset.film;
  const COUNT = +slide.dataset.filmFrames || 1;
  const LANDINGS = (slide.dataset.filmLandings || "1")
    .split(",")
    .map((x) => Math.max(1, Math.min(COUNT, +x || 1)));
  const DIAL_STEP = 3; // the step whose landing hands over to the drawn dial
  const reduced = !!deck.reduced;
  const W = 1920,
    H = 1080;
  const name = (i) => `${DIR}f${String(i).padStart(4, "0")}.webp`;
  const landing = (step) => LANDINGS[Math.min(step, LANDINGS.length - 1)];

  /* ---------------------------------------------------------------- Canvases */

  const front = slide.querySelector("canvas.film");
  if (!front) return;
  const canvases = [front];
  if (reduced) {
    const back = front.cloneNode();
    front.after(back);
    canvases.push(back);
    canvases.forEach((c) => c.classList.add("xfade"));
    back.style.opacity = 0;
  }
  let shown = 0; // index into canvases of the visible one
  const ctx = (c) => c.getContext("2d", { alpha: false });

  /* ---------------------------------------------------------------- Frames */

  const frames = new Array(COUNT + 1); // 1-based: Image
  const ready = new Uint8Array(COUNT + 1); // 1 once decoded
  let decodedCount = 0;
  const t0 = performance.now();
  const stats = { decoded: 0, failed: 0, ms: 0, firstFrameMs: 0 };

  // Nearest decoded frame to i (searching outwards), or 0 if none yet.
  function nearest(i) {
    if (ready[i]) return i;
    for (let d = 1; d < COUNT; d++) {
      if (i - d >= 1 && ready[i - d]) return i - d;
      if (i + d <= COUNT && ready[i + d]) return i + d;
    }
    return 0;
  }

  const order = [1, ...LANDINGS];
  for (let i = 1; i <= COUNT; i++) order.push(i);
  const queue = [...new Set(order)];
  const CONCURRENCY = 6;

  function load(i) {
    const img = new Image();
    img.decoding = "async";
    img.src = name(i);
    frames[i] = img;
    return img
      .decode()
      .then(() => {
        ready[i] = 1;
        stats.decoded = ++decodedCount;
        if (i === 1) stats.firstFrameMs = Math.round(performance.now() - t0);
        onDecoded(i);
      })
      .catch(() => {
        stats.failed++;
      });
  }
  function done() {
    if (stats.decoded + stats.failed < COUNT) return;
    stats.ms = Math.round(performance.now() - t0);
    console.info(
      `film: ${stats.decoded}/${COUNT} frames decoded in ${stats.ms} ms` +
        (stats.failed ? ` (${stats.failed} missing)` : ""),
    );
  }
  function pump() {
    if (queue.length) return load(queue.shift()).then(done).then(pump);
  }
  for (let k = 0; k < CONCURRENCY; k++) pump();

  /* ---------------------------------------------------------------- Drawing */

  let drawn = 0; // frame number currently on the visible canvas

  function paint(c, i) {
    const k = nearest(i);
    if (!k) return 0;
    try {
      ctx(c).drawImage(frames[k], 0, 0, W, H);
    } catch (e) {
      return 0;
    }
    return k;
  }
  function draw(i) {
    const k = paint(canvases[shown], i);
    if (k) drawn = k;
  }

  // A frame arrived: if it is closer to what should be on screen, show it.
  function onDecoded(i) {
    if (moving) return;
    const want = Math.round(pos);
    if (!drawn || Math.abs(i - want) < Math.abs(drawn - want)) {
      draw(want);
    }
  }

  /* ---------------------------------------------------------------- Scrub (spring) */

  // Critically damped spring, integrated exactly so it does not depend on frame rate.
  // OMEGA 6 lands a 168-frame scrub within half a frame in about 1.4 s.
  const OMEGA = 6;
  // Forward clicks play the film at its own speed (data-film-play="real", the default):
  // 24 fps with a soft landing over the last LAND frames. Going back always uses the spring.
  const PLAY_REAL = (slide.dataset.filmPlay || "real") === "real";
  const FPS = +slide.dataset.filmFps || 24;
  const LAND = 12;
  let pos = landing(0),
    vel = 0,
    target = pos,
    moving = false,
    raf = 0,
    last = 0,
    curStep = 0,
    active = false;

  function frameLoop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (PLAY_REAL && target > pos) {
      const left = target - pos;
      const rate = left < LAND ? FPS * Math.max(0.25, left / LAND) : FPS;
      pos = Math.min(target, pos + rate * dt);
      vel = 0;
      if (pos >= target - 0.01) {
        pos = target;
        moving = false;
        draw(target);
        landed();
        return;
      }
      draw(Math.round(pos));
      raf = requestAnimationFrame(frameLoop);
      return;
    }
    const e = pos - target;
    const x = Math.exp(-OMEGA * dt);
    const c = vel + OMEGA * e;
    const e2 = (e + c * dt) * x;
    vel = (vel - OMEGA * c * dt) * x;
    pos = target + e2;
    if (Math.abs(e2) < 0.5 && Math.abs(vel) < 4) {
      pos = target;
      vel = 0;
      moving = false;
      draw(target);
      landed();
      return;
    }
    draw(Math.round(pos));
    raf = requestAnimationFrame(frameLoop);
  }

  function scrubTo(f) {
    target = f;
    if (moving) return;
    if (pos === target) return landed();
    moving = true;
    last = performance.now();
    raf = requestAnimationFrame(frameLoop);
  }

  // Reduced motion: no scrub; jump to the landing with a 0.6 s cross-fade.
  let xfadeTimer = 0;
  function jumpTo(f) {
    pos = target = f;
    if (!drawn) {
      draw(f);
      return landed();
    }
    const next = 1 - shown,
      a = canvases[shown],
      b = canvases[next];
    const k = paint(b, f);
    if (!k) return landed();
    a.after(b); // the incoming canvas on top
    b.style.transition = "none";
    b.style.opacity = 0;
    b.getBoundingClientRect();
    b.style.transition = "";
    b.style.opacity = 1;
    shown = next;
    drawn = k;
    clearTimeout(xfadeTimer);
    xfadeTimer = setTimeout(() => {
      a.style.transition = "none";
      a.style.opacity = 0;
      landed();
    }, 600);
  }

  function snap(f) {
    cancelAnimationFrame(raf);
    clearTimeout(xfadeTimer);
    moving = false;
    pos = target = f;
    vel = 0;
    if (reduced) {
      canvases.forEach((c, k) => {
        c.style.transition = "none";
        c.style.opacity = k === shown ? 1 : 0;
      });
    }
    draw(f);
  }

  /* ---------------------------------------------------------------- The dial hand-over */

  const dial = slide.querySelector('[data-object="dial"]');
  const hands = dial
    ? [
        [dial.querySelector(".hand-h"), "h"],
        [dial.querySelector(".hand-m"), "m"],
      ].filter(([el]) => el)
    : [];
  let spinRaf = 0;

  // Same reading and transform convention as engine.js's tick().
  const fmt = (() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: false,
      });
    } catch (e) {
      return null;
    }
  })();
  function liveAngles() {
    let h, m, s;
    if (fmt) {
      const p = fmt.formatToParts(new Date());
      const g = (t) => +(p.find((x) => x.type === t) || { value: 0 }).value;
      [h, m, s] = [g("hour") % 12, g("minute"), g("second")];
    } else {
      const d = new Date();
      [h, m, s] = [d.getHours() % 12, d.getMinutes(), d.getSeconds()];
    }
    return { h: (h + m / 60) * 30, m: (m + s / 60) * 6 };
  }
  const setHand = (el, a) =>
    el.setAttribute(
      "transform",
      `rotate(${a.toFixed(1)} ${el.dataset.c || "100 150"})`,
    );

  // From twelve o'clock, forward several full turns, settling on the live time. The engine's
  // one-second tick may write in between, but this rAF write lands before every paint, so
  // only the spin is seen; when it ends, the engine's tick simply carries on.
  const SPIN_MS = 2000,
    TURNS = { h: 2, m: 8 };
  const ease = (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function spinUp() {
    cancelAnimationFrame(spinRaf);
    if (!hands.length || reduced) return;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / SPIN_MS);
      const live = liveAngles();
      hands.forEach(([el, k]) =>
        setHand(el, (live[k] + TURNS[k] * 360) * ease(p)),
      );
      if (p < 1) spinRaf = requestAnimationFrame(step);
    };
    spinRaf = requestAnimationFrame(step);
  }
  function showDial(on) {
    if (!dial) return;
    if (on === dial.classList.contains("film-on")) return;
    dial.classList.toggle("film-on", on);
    if (on) spinUp();
    else cancelAnimationFrame(spinRaf); // hands go back to the engine's tick
  }

  function landed() {
    if (active && curStep === DIAL_STEP && target === landing(DIAL_STEP))
      showDial(true);
  }

  /* ---------------------------------------------------------------- Following the deck */

  function onStep(s, step, entering) {
    active = s === slide;
    if (!active) {
      showDial(false);
      return;
    }
    curStep = step;
    if (step !== DIAL_STEP) showDial(false);
    const f = landing(step);
    if (entering) {
      snap(f);
      return landed();
    }
    reduced ? jumpTo(f) : scrubTo(f);
  }

  let entering = false;
  document.addEventListener("deck:slide", (e) => {
    entering = e.detail.slide === slide;
  });
  document.addEventListener("deck:step", (e) => {
    onStep(e.detail.slide, e.detail.step, entering);
    entering = false;
  });

  // The deck may already have started before this script ran.
  const st = deck.state;
  if (st && st.list[st.i] && st.list[st.i].classList.contains("is-active"))
    onStep(st.list[st.i], st.step, true);
  else draw(pos);

  window.deckFilm = {
    stats,
    get frame() {
      return pos;
    },
    get drawn() {
      return drawn;
    },
    get moving() {
      return moving;
    },
  };
})();

/* Access screen: a black page, "Password", five digits. A courtesy screen for people who
   receive the link, not a lock (the deck's files stay readable by their address).
   No cookie, nothing stored: the code is asked at each visit. Set in each deck's config.js (GATE).
   Shared by every deck: load ../shared/gate.css before the deck's styles.css,
   and ../shared/gate.js after config.js. */
(function () {
  const want = (window.DECK_CONFIG || {}).GATE;
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const q = new URLSearchParams(location.search);
  if (!want || q.has("print") || (local && !q.has("gate"))) return; // ?gate shows it on the local preview too

  const gate = document.createElement("div");
  gate.className = "gate";
  gate.innerHTML = `<form class="gate-box" autocomplete="off">
      <label class="gate-label" for="gate-code">Password</label>
      <input class="gate-code" id="gate-code" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="5" autocomplete="off" spellcheck="false" aria-label="Password">
    </form>`;
  document.body.appendChild(gate);
  document.documentElement.classList.add("gated");
  const input = gate.querySelector("input");
  // keys and touches stay with the screen while it is up
  const hold = (e) => e.stopPropagation();
  ["keydown", "keyup", "touchstart", "touchend", "wheel"].forEach((t) => gate.addEventListener(t, hold));
  const guard = (e) => {
    if (!gate.contains(e.target)) {
      e.stopPropagation();
      e.preventDefault();
      input.focus();
    }
  };
  addEventListener("keydown", guard, true);
  setTimeout(() => input.focus(), 50);

  const hex = async (s) => {
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
  };
  input.addEventListener("input", async () => {
    input.value = input.value.replace(/\D/g, "").slice(0, 5);
    if (input.value.length < 5) return;
    if ((await hex(input.value)) === want) {
      removeEventListener("keydown", guard, true);
      gate.classList.add("open");
      document.documentElement.classList.remove("gated");
      input.blur();
      setTimeout(() => gate.remove(), 700);
    } else {
      gate.classList.remove("no");
      void gate.offsetWidth;
      gate.classList.add("no");
      setTimeout(() => (input.value = ""), 380);
    }
  });
  gate.querySelector("form").addEventListener("submit", (e) => e.preventDefault());
})();

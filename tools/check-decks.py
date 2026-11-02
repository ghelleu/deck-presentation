#!/usr/bin/env python3
"""Checks that every deck of deck-presentation.com sits under the platform's interface (shared/).

Usage, from ~/Projects/deck-presentation:
    python3 tools/check-decks.py            # every deck folder
    python3 tools/check-decks.py tdp mag    # only these

For each deck it checks that:
  - the page loads the platform: shared/gate.css and shared/controls.css before the deck's own styles,
    then config.js, shared/gate.js and shared/controls.js, in that order;
  - the toolbar is the platform's empty box (.hud-r[data-controls]), with no button of the deck's own;
  - the deck's styles only tint the toolbar (--hud-*), never redraw it (.hud, .progress);
  - the engine answers no other key than the platform's (arrows, Space, Enter, Backspace, PageUp/Down, Home/End, F, R, O, Esc);
  - config.js sets LANGS and GATE; the page has noindex; the PDF of each language exists;
  - the deck is listed on the home page (except the template, modele/).
ERREUR: the deck leaves the interface (fix before publishing). Note: worth a look, not blocking.
Exit code 1 when there is at least one ERREUR."""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NOT_DECKS = {"shared", "tools", ".git"}
UNLISTED = {"modele"}
BAR = re.compile(r"\.hud\b|\.hud-|\.progress\b")
OWN_KEYS = re.compile(r"""case\s+["']([A-Za-z0-9?.!/])["']\s*:""")
PLATFORM_KEYS = set("fFrRoO")


def css_bar_rules(css):
    """Top-level rules whose every selector draws the toolbar (html.* states and :root tints are allowed)."""
    found, i, n = [], 0, len(css)
    while i < n:
        if css.startswith("/*", i):
            i = css.find("*/", i) + 2 or n
            continue
        if css[i] in " \t\r\n}":
            i += 1
            continue
        k = css.find("{", i)
        if k < 0:
            break
        sel = css[i:k].strip()
        depth, j = 0, k
        while j < n:
            if css[j] == "{":
                depth += 1
            elif css[j] == "}":
                depth -= 1
                if depth == 0:
                    break
            j += 1
        sels = [s.strip() for s in sel.split(",")]
        if not sel.startswith("@") and all(BAR.search(s) and not s.startswith("html.") for s in sels):
            found.append(" ".join(sel.split())[:60])
        i = j + 1
    return found


def check(deck, home):
    d = os.path.join(ROOT, deck)
    page = open(os.path.join(d, "index.html"), encoding="utf-8").read()
    err, note = [], []

    # 1. the platform's files, in order
    css = [m.group(1) for m in re.finditer(r'<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"', page)]
    js = [m.group(1) for m in re.finditer(r'<script[^>]+src="([^"]+)"', page)]
    plat = lambda href, name: re.fullmatch(r"(\.\./|/)shared/" + re.escape(name), href.split("?")[0])
    pos = lambda lst, name: next((k for k, h in enumerate(lst) if plat(h, name)), -1)
    g_css, c_css = pos(css, "gate.css"), pos(css, "controls.css")
    for name, k in (("shared/gate.css", g_css), ("shared/controls.css", c_css)):
        if k < 0:
            err.append(f"ne charge pas {name}")
    own_css = [h for h in css if not re.match(r"(\.\./|/)shared/", h)]
    first_own = min((css.index(h) for h in own_css if not h.startswith("http") and "fonts" not in h), default=len(css))
    if c_css > first_own:
        late = css[first_own]
        if "/shared/" in "/" + late:
            note.append(f"{late} est chargé avant shared/controls.css (la barre commune l'emporte)")
        else:
            err.append("shared/controls.css doit être chargé avant les styles du deck")
    cfg = next((k for k, h in enumerate(js) if h.split("?")[0] == "config.js"), -1)
    g_js, c_js = pos(js, "gate.js"), pos(js, "controls.js")
    if cfg < 0:
        err.append("ne charge pas config.js")
    for name, k in (("shared/gate.js", g_js), ("shared/controls.js", c_js)):
        if k < 0:
            err.append(f"ne charge pas {name}")
    if min(cfg, g_js, c_js) >= 0 and not cfg < g_js < c_js:
        err.append("ordre des scripts : config.js, puis shared/gate.js, puis shared/controls.js")
    if c_js >= 0 and c_js == len(js) - 1:
        err.append("shared/controls.js doit venir avant le moteur du deck")

    # 2. the toolbar box
    boxes = re.findall(r'<div class="hud-r"[^>]*data-controls[^>]*>(.*?)</div>', page, re.S)
    if len(boxes) != 1:
        err.append("la barre doit être une seule boîte vide .hud-r[data-controls]")
    elif boxes[0].strip():
        err.append("la boîte de la barre doit rester vide (controls.js la remplit)")
    own_buttons = re.findall(r"<button[^>]*data-act=\"([^\"]+)\"", page)
    if own_buttons:
        err.append("boutons propres au deck : " + ", ".join(own_buttons))

    # 3. styles: tint, never redraw (files loaded after controls.css)
    for h in css[c_css + 1:] if c_css >= 0 else own_css:
        p = os.path.join(d, h.split("?")[0].lstrip("/")) if not h.startswith(("http", "/")) else None
        if p and os.path.exists(p):
            rules = css_bar_rules(open(p, encoding="utf-8").read())
            if rules:
                err.append(f"{h} redessine la barre ({len(rules)} règles : {', '.join(rules[:3])}…)")

    # 4. keys of its own
    for f in sorted(os.listdir(d)):
        if f.endswith(".js") and f != "config.js":
            keys = sorted({k for k in OWN_KEYS.findall(open(os.path.join(d, f), encoding="utf-8").read()) if k not in PLATFORM_KEYS})
            if keys:
                note.append(f"{f} répond à d'autres touches : {' '.join(keys)} (à vérifier)")

    # 5. settings, indexing, PDF, home
    langs, gate = None, None
    cfgp = os.path.join(d, "config.js")
    if os.path.exists(cfgp):
        c = open(cfgp, encoding="utf-8").read()
        m = re.search(r"LANGS\s*:\s*(\[[^\]]*\])", c)
        langs = json.loads(m.group(1).replace("'", '"')) if m else None
        g = re.search(r"GATE\s*:\s*(null|\"[0-9a-f]{64}\")", c)
        gate = g.group(1) if g else None
        if not langs:
            err.append("config.js : LANGS manquant")
        if not gate:
            err.append("config.js : GATE manquant (null ou empreinte)")
    if 'name="robots" content="noindex' not in page:
        err.append("pas de <meta name=\"robots\" content=\"noindex, nofollow\">")
    m = re.search(r'data-pdf="([^"]+)"', page)
    if m:
        for l in (langs or [None]):
            pdf = m.group(1).replace("{lang}", l or "")
            if not os.path.exists(os.path.join(d, pdf)):
                err.append(f"PDF absent : {deck}/{pdf}")
    else:
        err.append("pas de data-pdf sur la barre")
    if deck not in UNLISTED and f'href="/{deck}/"' not in home:
        note.append("pas de ligne cliquable sur l'accueil")

    return err, note, (langs, gate)


def main():
    home = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    decks = sys.argv[1:] or sorted(
        e for e in os.listdir(ROOT)
        if e not in NOT_DECKS and os.path.isfile(os.path.join(ROOT, e, "index.html"))
    )
    bad = 0
    for deck in decks:
        err, note, (langs, gate) = check(deck, home)
        bad += bool(err)
        info = f"langues {'/'.join(langs or ['?'])} · code {'oui' if gate and gate != 'null' else 'non'}"
        print(f"{'OK     ' if not err else 'ERREUR '} {deck:8} {info}")
        for e in err:
            print(f"          ✗ {e}")
        for n in note:
            print(f"          · {n}")
    print(f"\n{len(decks) - bad}/{len(decks)} decks sous l'interface commune.")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()

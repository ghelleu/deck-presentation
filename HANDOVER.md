# HANDOVER : deck-presentation.com

Passation complète pour un agent (ou une personne) qui reprend le projet. État au **02.11.2026**.
À lire en entier une fois, puis à garder comme référence. Les documents de détail sont [MANUEL.md](MANUEL.md) (vue d'ensemble, fiches, audit), [README.md](README.md) (référence technique courte), [AGENTS.md](AGENTS.md) (règles) et [modele/README.md](modele/README.md) (démarrer un deck).

> Ce dépôt est **public** : rien de confidentiel ici. Les codes d'accès des decks ne sont écrits nulle part dans le dépôt ; les demander au propriétaire.

---

## 0. En une minute

- **deck-presentation.com** est une plateforme de visionnage de présentations (des « decks »), hébergée sur GitHub Pages depuis le dépôt public `ghelleu/deck-presentation`.
- Il y a **deux projets** qui ne se mélangent pas :
  1. **L'interface** (la plateforme) : l'accueil, l'écran d'accès, la barre de commandes, les langues, le **lecteur** (touches, vignettes, coches, PDF des slides cochées), le modèle de nouveau deck, la vérification automatique. Tout vit dans `shared/`, `modele/`, `tools/` et l'accueil `index.html`.
  2. **Les decks** : le contenu de chaque présentation, fabriqué dans son propre dossier de travail, puis recopié dans un dossier publié (`als/`, `how/`…).
- **Règle d'or : l'interface définit tout ce qui est commun ; un deck ne fait que son contenu.** Une modification de l'interface s'applique d'elle-même à tous les decks, présents et futurs. Un deck n'ajoute ni bouton, ni touche, ni grille de vignettes à lui.
- **Un nouveau deck part de `modele/`** et doit passer `python3 tools/check-decks.py <code>` avant d'être publié.
- **On demande au propriétaire avant de pousser** quoi que ce soit en ligne.

---

## 1. Le propriétaire et la façon de travailler

- Le propriétaire est **designer**, pas développeur. Lui parler **en français, simplement**, sans jargon : ce qui a changé, ce qu'il verra, ce qui reste à faire. Pas de code dans les réponses sauf s'il le demande.
- Il valide les mises en ligne par un « Oui, publier ». **Ne jamais pousser sans son accord explicite** (sauf s'il a dit d'avance de publier directement un type de changement précis).
- Il travaille avec **plusieurs sessions Claude en parallèle**, une par sujet :
  - **« DECK HOME »** : l'interface uniquement (accueil, `shared/`, `modele/`, `tools/`, docs, domaine). C'est la seule session qui modifie l'interface.
  - **Une session par deck** (ALS, HOW, BIX, TDP, MAG, TOT, CBM…) : le contenu de ce deck, dans son dossier de travail.
  - Une demande qui concerne le contenu d'un deck se traite dans la session de ce deck. Une demande qui concerne une fonction commune se traite dans DECK HOME.
- Toutes ces sessions partagent **la même copie** `~/Projects/deck-presentation` : voir §8 (règles git), c'est la principale source d'incidents.

---

## 2. Carte des lieux

### 2.1 Dépôts et dossiers

| Élément | Emplacement | Visibilité | Remarque |
|---|---|---|---|
| Plateforme (site publié) | `github.com/ghelleu/deck-presentation` → `~/Projects/deck-presentation` | **Public** | Branche `main`, servie à la racine par GitHub Pages |
| Source ALS | `github.com/ghelleu/als-century-of-exchange` → `~/Projects/als-century-of-exchange` | Privé | Outils de publication (`tools/publish-site.py`) |
| Source BIX | `github.com/ghelleu/bixter` → `~/Projects/bixter` | Privé | Copie de `Hint3rland/bixter` sans les films (remote `hint3rland` en lecture seule, `blob:none`) |
| Source HOW | `~/HOW-sources` | **Pas de git** | PowerPoint d'origine + `tools/build.py` |
| Source TDP | `~/Projects/tour-des-possibles` | git **local seulement** | |
| Source MAG | `~/Projects/magnetic-deck` | git **local seulement** | |
| Source TOT | `~/Projects/totalenergies-deck` | git **local seulement** | |
| Source CBM | `~/Projects/cbm-chalet-disco` | git **local seulement** | |
| Domaine | Gandi, `deck-presentation.com` | | LiveDNS : `@` A + AAAA vers GitHub Pages, `www` CNAME `ghelleu.github.io` |
| Hébergement | GitHub Pages | Toujours public | HTTPS forcé, `www` redirige vers le domaine nu, cache navigateur ~10 min |

### 2.2 Les decks en ligne

| Code | Projet | Client | Type | Contexte | Date | Adresse | Langues | Code d'accès |
|---|---|---|---|---|---|---|---|---|
| ALS | The century of a Memory | A. Lange & Söhne | Inauguration | MCI | Nov. 2026 | `/als/` | fr, en | oui |
| HOW | Press & Retailers Event 2027 | House of Wunder | Événementiel | MCI | Nov. 2026 | `/how/` | en, fr | oui |
| BIX | Refonte de Deck | Bixler's | Retail | Downtown studio | Oct. 2026 | `/bix/` (+ livret `/bix/book.html`) | en | oui |
| TDP | La Tour des Possibles | Geneva Lux | Installation | Magnetic | Nov. 2026 | `/tdp/` | fr, en | non |
| MAG | Magnetic | — | Association | Downtown studio | Juin 2026 | `/mag/` | fr, en | non |
| TOT | Powerded by Superheros | TotalEnergies | Soirée | MCI | Nov. 2026 | `/tot/` | fr, en | oui |
| CBM | Swiss Disco | Caroline Barbier Muller | Soirée | MCI | Nov. 2026 | `/cbm/` | fr | oui |

`/modele/` est en ligne mais **non listé** sur l'accueil (c'est le gabarit de départ).
Le dossier et l'adresse de BIX sont **`bix/`** depuis le 02.11.2026. L'ancienne adresse `/biw/` (et `/biw/book.html`) n'est plus qu'une redirection vers `/bix/`, pour les liens déjà envoyés : ne jamais republier le deck dans `biw/`.

### 2.3 Arborescence du dépôt de la plateforme

```
deck-presentation/
├── index.html          l'accueil : tableau Code · Project · Client · Type · Context · Date   ← interface
├── shared/                                                                                   ← interface
│   ├── gate.js / gate.css        écran d'accès à 5 chiffres
│   ├── controls.js / controls.css la barre de commandes (5 boutons) et son allure
│   ├── i18n.js                    les langues (content/<lang>.json, ?lang=)
│   └── viewer.js / viewer.css     le lecteur : touches, vignettes, coches, compteur, progression, PDF des slides cochées
├── modele/             le point de départ de tout nouveau deck (non listé sur l'accueil)    ← interface
├── tools/check-decks.py la vérification automatique (stricte)                               ← interface
├── robots.txt          Disallow: / (aucune indexation)                                      ← interface
├── README.md · MANUEL.md · AGENTS.md · CLAUDE.md (→ AGENTS.md) · HANDOVER.md                ← interface
├── CNAME · .nojekyll                                                                        ← interface
└── als/ how/ bix/ tdp/ mag/ tot/ cbm/   copies publiées des decks                           ← decks
```

---

## 3. L'interface en détail

### 3.1 L'accueil (`index.html`)

Un tableau sobre, typo Helvetica Neue, clair/sombre selon le système, en cartes sur téléphone. Colonnes : **Code · Project · Client · Type · Context · Date**. Tout le style est dans la page.
- Deck en ligne : `<tr class="lien"><td class="code"><a href="/code/">CODE</a></td><td>Projet</td><td>Client</td><td>Type</td><td>Contexte</td><td>Mois année</td></tr>` (toute la ligne est cliquable).
- Deck à venir : `<tr class="attente">`, code sans lien, ligne grisée.
- Sur téléphone, les colonnes sont placées par leur rang (`td:nth-child(n)`) : si on ajoute une colonne, revoir la grille `@media (max-width: 640px)`.
- `noindex` sur l'accueil + `robots.txt` à la racine : le site n'est pas indexé. Ne pas les retirer.

### 3.2 L'écran d'accès (`shared/gate.js` + `gate.css`)

- Écran noir « Password », 5 chiffres. Le code est stocké dans le `config.js` du deck sous forme d'empreinte SHA-256 : `GATE: "<64 hex>"`, ou `GATE: null` pour aucun écran.
- Fixer un code : `printf 12345 | shasum -a 256` → coller l'empreinte. **Changer un code demande l'accord du propriétaire**, et il faut lui communiquer le code (il n'est stocké nulle part ailleurs).
- Sauté pour `?print` (export PDF) et pour l'aperçu local (`localhost`, `127.0.0.1`) ; `?gate` le force en local.
- Une fois le bon code saisi, **l'onglet le retient pour cette page** (`sessionStorage`, clé `deck-gate:<dossier>`) : changer de langue ou recharger ne le redemande pas. Nouvel onglet = nouveau code.
- Chaque deck teinte l'écran avec `--gate-*` sur `.gate` (`--gate-bg`, `--gate-caret`, `--gate-code-color`, `--gate-label-color`…), et masque ce qui doit l'être avec `html.gated …`.
- **C'est une politesse, pas une serrure** : 100 000 combinaisons, empreinte lisible dans `config.js`, fichiers lisibles en direct (dépôt public). Pour un vrai verrou, il faudrait une protection côté serveur (ex. Cloudflare Access).

### 3.3 La barre de commandes (`shared/controls.js` + `controls.css`)

- Cinq commandes, dans cet ordre, rien d'autre : **plein écran (F) · revenir au début (R) · toutes les slides (O, Échap) · langue · télécharger le PDF**. Le bouton langue n'apparaît que si `DECK_CONFIG.LANGS` a au moins deux langues.
- Dans la page du deck, la barre est une **boîte vide** que `controls.js` remplit :
  ```html
  <div class="hud" role="toolbar">
    <div class="hud-l"><span class="hud-count" id="hudCount"></span><span class="hud-title" id="hudTitle"></span></div>
    <div class="hud-r" data-controls data-pdf="export/deck-{lang}.pdf" data-pdf-name="Deck.pdf"></div>
  </div>
  <div class="progress" id="progress" aria-hidden="true"></div>
  ```
  `{lang}` dans `data-pdf` est remplacé par la langue courante. `data-pages="…"` (optionnel) nomme la table de pages du PDF, `data-pages=""` pour aucune.
- `controls.css` : la barre appartient au lecteur, au pied de la fenêtre, typo de l'accueil, visible quand la souris bouge (`body.show-hud`), trait de progression dessous (`--p` de 0 à 1), état `a.busy` pendant la fabrication d'un PDF. **Un deck ne peut que la teinter** : `--hud-ink`, `--hud-accent`, `--hud-shade` sur `:root`.

### 3.4 Les langues (`shared/i18n.js`)

- La langue vient de `?lang=` (parmi `DECK_CONFIG.LANGS`), sinon `DECK_CONFIG.LANG`. La page est écrite dans la première langue (repli).
- Il lit `content/<lang>.json` : `{ "ui": {...}, "text": { clé: HTML }, "alt": {...}, "labels": {...}, "views": {...} }` et remplace `[data-t]`, `img[data-t-alt]`, `[data-t-label]` (titre de slide → `data-label`). Il met le PDF de la langue dans la barre.
- Le moteur attend `await window.DECK_I18N` (qui rend `{ lang, other, T, ui, switchLang }`) avant de lire les titres.
- ALS et HOW ont **leur propre chargeur** de textes (antérieur) ; ils passent leur `switchLang` au lecteur (`lang:`). Les autres utilisent `i18n.js`.

### 3.5 Le lecteur (`shared/viewer.js` + `viewer.css`) : le cœur commun

Tout ce qui se passe quand on regarde un deck est ici, pour tous les decks :
- **Touches**, toutes et rien d'autre : → ↓ Espace Entrée Page suiv. (suivant) · ← ↑ Retour arrière Page préc. (précédent) · Début et R (début) · Fin · F (plein écran) · O et Échap (vignettes). Plus le balayage au doigt et le clic sur la scène (si le deck donne `stage`).
- **Vignettes (logique ALS)** : grille de 4 colonnes (2 sur petit écran), la slide recule dans sa case puis en revient ; flèches pour choisir, Entrée/Espace ou clic pour ouvrir, O/Échap pour fermer, molette pour défiler ; barre « Slides à présenter » en haut avec le compte et « Tout réafficher ».
- **Coches** : la coche en haut à droite masque ou réaffiche une slide ; masquée = voilée « Masquée », sautée par la navigation ; il en reste toujours une. Choix **gardé par le navigateur** (`localStorage`, clé `deck-hidden:<chemin de la page>`, une mémoire par page : le deck BIX et son livret sont séparés). Un deck peut décocher des slides par défaut (`hidden: true`).
- **PDF des slides cochées** : s'il y a des slides masquées, le lecteur prend le PDF exporté, garde les pages des slides cochées (d'après `export/pages.json`) et le télécharge (pdf-lib 1.17.1 chargé depuis cdnjs). Sinon, ou en cas d'échec, le PDF entier.
- **Barre** visible quand la souris bouge, **compteur** (`01 / 39`, slides cochées seulement), **progression**, **adresse** `#id` de chaque slide (et `hashchange`).
- Libellés FR/EN selon la langue de la page au moment du montage.

**API (ce qu'un moteur de deck appelle, une fois ses textes en place) :**
```js
const V = DeckViewer.mount({
  slides: [{ id, label, hidden }, …],  // dans l'ordre ; label = titre (barre, vignettes) ; hidden = décochée par défaut
  show(i, step, instant) { … },        // afficher la slide i à cette étape (0, ou "end" pour sa dernière)
  step(d) { … return true; },          // facultatif : une étape avant (d = 1) / arrière (-1) DANS la slide ;
                                       //   rendre false à sa première/dernière étape (le lecteur change de slide)
  thumb(i) { … return el; },           // un élément 1920 × 1080 : la slide i en page, toutes étapes montrées
  stage: element,                      // facultatif : un clic dessus avance (pas sur liens/boutons/[data-go])
  ready(pages) { … },                  // facultatif : une fois les vignettes dans la grille (dessiner des canvas)
  lang() { … },                        // facultatif : si le deck change de langue lui-même (ALS, HOW)
});
V.go(i, step) · V.goId(id, step) · V.next() · V.prev() · V.current() · V.hidden(id) · V.overview(true|false)
```
**Ce qu'il faut savoir sur les vignettes :**
- Le lecteur clone ce que rend `thumb(i)`, renomme les `id` des dessins SVG (et leurs `url(#…)`) pour garder dégradés/masques, supprime les autres `id`.
- Dans la grille, **aucune animation** (`animation: none` + `transition: none` sur tout le contenu) : chaque élément s'affiche avec son style au repos. Si un élément n'est visible que grâce à une animation, il faut une règle `.vw-page …` dans le deck pour le montrer.
- Les règles qu'un deck avait sous `.stage.overview …` pour révéler son contenu doivent viser `.vw-page …`.
- Teintes : `--vw-ground` (fond de la grille), `--vw-page` (fond de chaque vignette si les slides sont transparentes), plus `--hud-ink` / `--hud-accent`.

### 3.6 Le contrat HTML d'un deck (ce que vérifie `check-decks.py`)

```html
<meta name="robots" content="noindex, nofollow">
<link rel="stylesheet" href="../shared/gate.css">       <!-- 1. l'interface, toujours avant les styles du deck -->
<link rel="stylesheet" href="../shared/controls.css">
<link rel="stylesheet" href="../shared/viewer.css">
<link rel="stylesheet" href="styles.css">                <!-- 2. le deck (barre et grille seulement teintées) -->
…  <main class="stage" id="stage"> <section class="slide" id="…" data-label="…">…</section> … </main>
…  la boîte .hud vide (§3.3) et .progress
<script src="config.js"></script>                        <!-- 3. réglages : LANG, LANGS, GATE -->
<script src="../shared/gate.js"></script>
<script src="../shared/controls.js"></script>
<script src="../shared/i18n.js"></script>                <!-- sauf ALS/HOW (leur chargeur) ; facultatif à une langue -->
<script src="../shared/viewer.js"></script>
<script src="engine.js"></script>                        <!-- 4. le moteur du deck, qui appelle DeckViewer.mount -->
```
Exception BIX : son propre dossier s'appelle aussi `shared/` (`bix/shared/`), donc il charge les fichiers de la plateforme en **chemin absolu** (`/shared/gate.css`, `/shared/controls.js`…).

### 3.7 La vérification (`tools/check-decks.py`)

`python3 tools/check-decks.py` (tous) ou `python3 tools/check-decks.py <code>` (un seul). Elle contrôle **chaque page qui porte la barre** (le deck, et un livret comme `bix/book.html`) :
fichiers de `shared/` chargés et dans l'ordre (lecteur compris) · slides confiées au lecteur (`DeckViewer.mount`) · boîte de barre vide · aucun bouton, style de barre, écoute du clavier, grille de vignettes ou barre de sélection propre au deck · `config.js` (LANGS, GATE) · `noindex` · PDF présents pour chaque langue · table `pages.json` · ligne cliquable sur l'accueil.
`ERREUR` = le deck sort de l'interface (bloquant) ; `·` = à regarder. **État actuel : 9/9 pages conformes.** Notes attendues sur BIX : `base.css` chargé avant `controls.css` (la barre commune l'emporte) et vignettes héritées dans `bix/shared/engine.js` (inactives sur le site, voir §6.3).

### 3.8 Le modèle (`modele/`)

Un deck de 3 slides déjà branché sur toute l'interface : `index.html` (contrat complet, commenté), `config.js`, `styles.css` (teintes `--hud-*`, `--vw-*`, `--gate-*`), `engine.js` (≈ 60 lignes : `show`, `step`, `thumb`, mode `?print`), `content/fr.json` + `en.json`, `export/modele-fr.pdf` + `-en.pdf`, `export/pages.json`, `robots.txt`, `README.md` (mode d'emploi). Aperçu : https://deck-presentation.com/modele/.

---

## 4. Méthode : créer un nouveau deck, de A à Z

Le travail du deck se fait dans **sa session**, dans **son dossier de travail** ; seules les étapes marquées *interface* touchent le dépôt de la plateforme.

1. **Choisir un code** de 3 lettres avec le propriétaire (il fixe aussi Projet, Client, Type, Contexte, Date pour l'accueil). Dossier publié = code en minuscules.
2. **Créer le dossier de travail depuis le modèle** :
   ```bash
   cp -R ~/Projects/deck-presentation/modele ~/Projects/<nom-du-deck>
   cd ~/Projects/<nom-du-deck> && rm -f export/*.pdf && git init
   ln -s ~/Projects/deck-presentation/shared shared && echo "/shared" >> .gitignore
   ```
   Proposer au propriétaire un dépôt GitHub **privé** pour la sauvegarde (aujourd'hui TDP, MAG, TOT, CBM et HOW n'en ont pas).
3. **Aperçu local** : `python3 -m http.server <port> --bind 127.0.0.1` puis `http://127.0.0.1:<port>/` (`?lang=en`, `?gate`, `?print`). Vérifier d'abord que le port est libre (`lsof -i:<port>`) : d'autres sessions ont souvent un serveur ouvert.
4. **Construire les slides** dans `index.html` : une `<section class="slide" id="…" data-label="…">` par slide, dessinée sur une page **1920 × 1080** que le moteur met à l'échelle. Textes traduisibles marqués `data-t="clé"` (et `data-t-label`, `data-t-alt`).
5. **Le style** dans `styles.css` : polices (en local dans `assets/fonts/`, licence à côté), couleurs, mise en page. Teinter la barre (`--hud-ink`, `--hud-accent`, `--hud-shade`), la grille (`--vw-ground`, `--vw-page`), l'écran d'accès (`.gate { --gate-… }`). **Ne jamais restyler `.hud`, `.progress`, `.vw-*`.**
6. **Le moteur** (`engine.js`) : garder la structure du modèle. Ajouter ses transitions, animations, étapes (`step(d)`), dessins. Ne rien écouter au clavier, n'ajouter aucun bouton. Pour une scène continue (caméra sur un plan, comme MAG/TOT), `thumb(i)` rend une image figée de la vue i.
7. **Les langues** : `config.js` → `LANGS: ["fr", "en"]` (ou `["fr"]`) ; `content/en.json` avec les mêmes clés.
8. **Le mode `?print`** : chaque slide sur sa page (toutes étapes montrées, ou une page par étape si on le veut), pas de barre. Exporter un PDF par langue :
   ```bash
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-pdf-header-footer \
     --run-all-compositor-stages-before-draw --virtual-time-budget=4000 \
     --print-to-pdf=export/<deck>-fr.pdf "http://127.0.0.1:<port>/?print&lang=fr"
   ```
   Compresser si le PDF dépasse ~20 Mo (le dépôt grossit à chaque PDF, voir §11).
9. **La table des pages** `export/pages.json` : `{ "pages": { "id-slide": [0], "id-slide-2": [1, 2], … } }` (pages comptées depuis 0, dans l'ordre du PDF). **Vérifier que le total = nombre de pages du PDF.** À refaire à chaque export qui change le nombre de pages.
10. **Le code d'accès** (si le propriétaire en veut un) : générer 5 chiffres, mettre l'empreinte dans `GATE`, donner le code au propriétaire.
11. **Copie publiée** (avec l'accord du propriétaire) : copier le deck dans `~/Projects/deck-presentation/<code>/` sans `shared`, `.git`, `_src`, `tools`, `.claude`, `README.md` (ex. `rsync -a --delete --exclude …`).
12. *Interface* : **ajouter la ligne sur l'accueil** (`tr.lien`), avec les colonnes données par le propriétaire.
13. **Vérifier** : `python3 tools/check-decks.py <code>` doit afficher OK ; test en local (§9).
14. **Publier** : `git add <code> index.html` (par chemin), commit, push — **après accord**. Puis vérifier en ligne (§9.3).
15. Mettre à jour `MANUEL.md` (tableau des decks, fiche du deck, historique) — c'est DECK HOME qui tient ce document.

---

## 5. Méthode : mettre à jour un deck existant

Toujours : **modifier dans la source, refabriquer la copie, `git add <dossier>` seulement**, check, accord, push, vérification en ligne.

| Deck | Source | Aperçu | Fabriquer / publier |
|---|---|---|---|
| ALS | `~/Projects/als-century-of-exchange` | `python3 -m http.server 4173 --bind 127.0.0.1` | `.tools/bin/python tools/publish-site.py` (vide les notes du présentateur, retire les phrases sous arbitrage si `ARBITRATION: false`, régénère les 2 PDF) → `rsync -a --delete --exclude .git --exclude CNAME --exclude .nojekyll dist/site/ ~/Projects/deck-presentation/als/` → `git add als` |
| HOW | `~/HOW-sources` (gabarit `tools/index.tpl.html`, textes `tools/meta.json`, PowerPoint source) | depuis la plateforme | `tools/build.py <dossier de travail> ~/Projects/deck-presentation/how` écrit `how/index.html`, `content/*.json`, `export/pages.json`. **`how/engine.js` et `how/styles.css` se modifient directement dans la plateforme** (seule copie) → `git add how` |
| BIX | `~/Projects/bixter` : `directions/full/` (deck, livret) + `directions/shared/` (moteur et styles de base) | lien `shared` à la racine de `bixter` | copier `directions/full/` → `bix/`, `directions/shared/` → `bix/shared/` ; dans `index.html` et `book.html` remplacer `"../shared/` par `"shared/` **sans toucher** aux chemins absolus `/shared/…` → `git add bix`. Ne pas récupérer le remote `hint3rland` en entier (films, plusieurs Go) |
| TDP | `~/Projects/tour-des-possibles` | `tools/serve.py` (port 4190) | copier sans `shared`, `_src`, `tools`, `.claude` → `git add tdp` |
| MAG | `~/Projects/magnetic-deck` | `python3 tools/serve.py 4191` | copier sans `shared`, `_src`, `tools` → `git add mag` |
| TOT | `~/Projects/totalenergies-deck` | `python3 tools/serve.py 4193` | PDF : `python3.11 tools/export-pdf.py` ; rsync vers `tot/` sans `shared`, `_src`, `tools`, `.claude`, `README` → `git add tot` |
| CBM | `~/Projects/cbm-chalet-disco` | `python3 tools/serve.py 4192` | PDF : `tools/export-pdf.sh` (+ `shrink-pdf.py`) ; copier sans `shared`, `_src`, `tools`, `.claude`, `README.md` → `git add cbm` |

Particularités utiles :
- **ALS** : mode arbitrage (`ARBITRATION` dans `config.js`), annexes avec liens internes (`[data-go]`, folio d'annexe), fenêtre de notes du présentateur (en local seulement), export PowerPoint (`tools/export-pptx.py`).
- **HOW** : 5 slides **décochées par défaut** (`data-default-hidden`), halo qui suit la souris, vidéos par slide.
- **BIX** : moteur en deux fichiers (`bix/shared/engine.js` commun à ses pistes + `full.js` pour ce deck), numérotation des slides et des folios refaite par `full.js`, avance automatique sur les films, livret `book.html` (32 pages) avec sa propre barre commune et `data-pages=""` (pas de PDF partiel du livret).
- **TDP** : ciel animé en canvas, dessins « widgets » redessinés dans les vignettes via `ready(pages)`.
- **MAG / TOT** : pas de slides mais **des vues** d'une grande scène (une caméra) ; liste des vues en JSON dans `index.html` ; vignettes = images figées (`snapshot(i)`).
- **CBM** : étapes dans les slides, certaines slides donnent **plusieurs pages** de PDF (`data-pages="steps"` sur la slide) — d'où une table `pages.json` à 55 pages pour 39 slides.

---

## 6. Méthode : modifier l'interface (session DECK HOME seulement)

1. `git pull --ff-only` dans `~/Projects/deck-presentation`.
2. Modifier `shared/` (ou l'accueil, `modele/`, `tools/`). Garder les commentaires d'en-tête des fichiers à jour : ils documentent le contrat.
3. **Si le contrat HTML change** (un nouveau fichier à charger, un attribut à ajouter) : reporter le changement dans **`modele/`, chaque copie publiée et chaque source** (gabarit HOW `~/HOW-sources/tools/index.tpl.html`, `index.html` d'ALS, `directions/full/index.html` et `book.html` de BIX, et ceux de TDP, MAG, TOT, CBM). Sinon la prochaine publication d'un deck défait le changement.
   - Avant de copier dans une source, **vérifier qu'elle n'a pas bougé** (comparer avec la version publiée d'avant ; une autre session peut y travailler) ; ne jamais embarquer les modifications en cours d'une autre session (ajouter par chemin).
4. Mettre à jour `check-decks.py` si la règle change, puis `python3 tools/check-decks.py` : tout doit être OK.
5. Tester **tous les decks** en local (§9.2), visuellement aussi (grilles, barre).
6. Mettre à jour `README.md`, `MANUEL.md` (contrat, historique), `AGENTS.md`, `modele/README.md`, ce `HANDOVER.md`.
7. Commit local (par chemin), **demander l'accord**, push, vérifier en ligne. Prévenir que les sessions des decks devront faire `git pull` (et récupérer leurs sources mises à jour) avant de continuer.

### 6.1 Intégrer un deck existant au lecteur (ce qui a été fait pour les 7 decks)

Retirer du moteur : écoute du clavier, balayage, `mousemove`/barre, boutons de la barre, grille de vignettes, coches, barre de sélection `.picks`, code PDF, gestion du hash et du compteur/titre/progression. Garder : affichage d'une slide, transitions, étapes, dessins, liens internes (appeler `V.goId`, `V.next`). Ajouter `DeckViewer.mount({...})`. Dans les styles : supprimer les règles de grille et de coches, viser `.vw-page` pour les règles qui révélaient le contenu, ajouter les teintes. Ajouter `viewer.css`/`viewer.js` dans la page. Créer `export/pages.json`. Tester, reporter dans la source.

### 6.2 Si un deck a besoin d'une fonction nouvelle

Elle se décide dans l'interface, pour tous : la session du deck la demande à DECK HOME, qui l'ajoute au lecteur (option de `mount`, variable de teinte…), au modèle, à la doc et au check. Exemples déjà ajoutés ainsi : `hidden` (décochées par défaut, pour HOW), `ready()` (dessins de TDP), `data-pages` (livret BIX), `lang()` (chargeurs d'ALS et HOW).

### 6.3 Le cas BIX (moteur partagé avec d'autres pistes)

`bix/shared/engine.js` (= `bixter/directions/shared/engine.js`) sert aussi à d'autres pistes non publiées de `bixter`. Il a un drapeau `VIEWER = !!window.DeckViewer` : sur le site (lecteur chargé), il confie tout au lecteur ; ailleurs, il garde son ancien fonctionnement. Ne pas supprimer ce drapeau ni l'ancien code sans l'accord de la session BIX.

---

## 7. Sécurité, confidentialité, contenu

- Dépôt et site **publics** : tout fichier publié (textes `content/*.json`, images, PDF) est lisible par son adresse, code d'accès ou pas. Ne jamais publier de document confidentiel sans le dire au propriétaire.
- **Jamais de notes du présentateur ni de phrases sous arbitrage** en ligne : passer par les outils de publication (ALS : `publish-site.py`).
- **Les codes d'accès ne s'écrivent pas dans le dépôt** (ni dans ce document). Le propriétaire les garde dans son gestionnaire de mots de passe.
- Indexation bloquée : `robots.txt` (racine) + `noindex` sur l'accueil et chaque deck.

---

## 8. Git et copie partagée : règles et incidents vécus

**Règles :**
1. `git pull --ff-only` avant de commencer.
2. **Ajouter par chemin** (`git add shared index.html`, `git add als`), **jamais** `git add -A` ni `git add .` : d'autres sessions ont des modifications en cours dans la même copie.
3. **Ne jamais changer de branche** dans `~/Projects/deck-presentation`. Pour une branche : `git worktree add <dossier temporaire>`.
4. Avant de pousser : `git pull --rebase`, puis **vérifier qu'aucun marqueur de conflit** n'est resté (`grep -n '<<<<<<<' index.html MANUEL.md …`).
5. Commiter tôt (en local) les modifications de l'interface pour qu'une autre session ne les embarque pas, puis demander l'accord pour pousser.
6. Messages de commit en anglais, précis, avec la ligne `Co-Authored-By` demandée par l'environnement.

**Incidents à ne pas reproduire :**
- *30.10* : un changement de branche dans la copie partagée a fait atterrir un commit HOW sur la mauvaise branche, puis casser HOW en ligne. → Règle 3.
- *31.10* : la publication d'ALS faisait `git add -A` dans la copie partagée (risque d'embarquer le travail d'autres sessions) ; corrigé en `git add als`. La migration d'ALS vers la barre commune était restée non commitée dans sa source. → Règle 2, et toujours vérifier `git status` des sources.
- *02.11* : un `git pull --rebase --autostash` a créé un conflit sur l'accueil (une autre session venait d'ajouter TDP) ; le commit suivant a **publié les marqueurs de conflit** pendant ~2 minutes. → Règle 4.
- Des sessions de deck ont parfois modifié `shared/` elles-mêmes (barre commune, langues) : c'est désormais interdit (AGENTS.md, règle 3 ter).

---

## 9. Tester et vérifier

### 9.1 En local
- Servir la plateforme : `cd ~/Projects/deck-presentation && python3 -m http.server <port libre> --bind 127.0.0.1`, puis `/als/`, `/how/`… Les ports 4190-4193 sont souvent pris par les aperçus des autres sessions : vérifier avec `lsof -i:<port>`.
- Paramètres utiles : `?gate` (voir l'écran d'accès en local), `?lang=en`, `?print` (rendu d'export).
- Le navigateur garde les anciens `viewer.css`/`engine.js` en cache : forcer (`fetch(url, {cache: "reload"})`, ou recharger avec Cmd+Maj+R) avant de conclure qu'un correctif ne marche pas.
- Un onglet ou un panneau caché **gèle les animations** (Web Animations) : ne pas attendre la fin d'une animation sans délai de secours (le lecteur en a un, 700 ms).
- Pour tester l'écran d'accès sans le vrai code : copie temporaire du deck avec un `GATE` de test (ex. empreinte de `11111`). Ne pas retrouver/afficher les vrais codes sans que le propriétaire le demande.
- Test automatique rapide (dans la console d'une page de la plateforme) : ouvrir chaque deck dans une iframe hors écran, simuler `ArrowRight`, `o`, `Escape`, `r`, lire `#hudCount`, compter `.vw-tile`, lister les ressources en erreur (`performance.getEntriesByType("resource")` avec `responseStatus >= 400`). Découper par deck si c'est long.
- Vérifier une table de pages : charger le PDF avec pdf-lib dans la page et comparer `getPageCount()` au total de `pages.json`.

### 9.2 Avant toute publication
1. `python3 tools/check-decks.py` → tout OK.
2. Chaque deck touché : navigation, étapes, grille (O), une coche, ouverture d'une vignette, R, langue, console sans erreur, aucun fichier en 404.
3. Rendu visuel de la grille et de la barre (capture).

### 9.3 Après publication (en ligne)
```bash
for u in "" als/ how/ bix/ bix/book.html tdp/ mag/ tot/ cbm/ modele/ shared/viewer.js shared/controls.js shared/gate.js; do
  printf "%s /%s\n" "$(curl -s -o /dev/null -w '%{http_code}' https://deck-presentation.com/$u)" "$u"; done
```
Tout en `200`. GitHub Pages met ~1 minute à reconstruire : attendre qu'un marqueur du changement apparaisse (`until curl -s … | grep -q …; do sleep 5; done`) avant de vérifier. Puis ouvrir les decks touchés (écran d'accès présent, barre, grille, console). Dire au propriétaire de recharger avec Cmd+Maj+R.

---

## 10. Pièges techniques connus

| Piège | Ce qu'il faut savoir |
|---|---|
| Vignettes vides | Le lecteur coupe toutes les animations dans la grille. Un élément visible seulement par animation doit avoir une règle `.vw-page …` dans le deck. |
| Vignettes écrasées dans une longue grille | Une case de grille dimensionnée par `aspect-ratio` peut s'écraser : les vignettes ont une hauteur fixe 16:9 (`padding-top: 56.25%`). Ne pas revenir à `aspect-ratio`. |
| Dessins SVG sans dégradé dans les vignettes | Les `id` dupliqués cassent les `url(#…)` : le lecteur les renomme. Un deck qui clone lui-même doit faire pareil (CBM le fait). |
| Barre de sélection dans la mauvaise langue | Le lecteur lit la langue au montage : monter **après** `await window.DECK_I18N` (ou après le chargeur d'ALS/HOW). |
| Coches mélangées entre deux pages d'un même dossier | Clé par page (`deck-hidden:<chemin>`), déjà en place (deck BIX / livret). |
| Livret qui prend la table de pages du deck | Même dossier `export/` : `data-pages=""` sur la boîte de barre du livret. |
| Chemins BIX | `"../shared/` (source) ↔ `"shared/` (publié) ; les fichiers de la plateforme restent `/shared/…` (absolu). |
| Moteur qui écoute encore le clavier | Refusé par le check. Une fenêtre annexe (notes) peut transmettre ses touches : `dispatchEvent(new KeyboardEvent("keydown", { key }))`. |
| Titre de barre avec « · étape n/N » | Perdu à la migration (le lecteur écrit le titre de la slide seul). Si le propriétaire le veut, l'ajouter au lecteur pour tous. |
| Lien profond `#id@étape` (ALS/HOW) | Géré au démarrage par ALS/HOW (l'adresse est ramenée à `#id`). |
| Cache GitHub Pages | ~10 min ; `styles.css` des decks n'a pas de version dans l'URL. BIX utilise `?v=` sur `full.css`/`full.js` : l'incrémenter quand on les change. |

---

## 11. Risques ouverts et chantiers possibles

| # | Niveau | Sujet | Piste |
|---|---|---|---|
| 1 | Élevé | **Confidentialité** : site et dépôt publics, code d'accès = politesse. | Protection serveur (Cloudflare Access) si un deck est vraiment confidentiel. |
| 2 | Élevé | **Sources sans sauvegarde** : HOW (pas de git), TDP, MAG, TOT, CBM (git local, pas de GitHub). Une perte de disque perd les sources. | Dépôts GitHub privés, à décider avec le propriétaire (session de chaque deck). |
| 3 | Moyen | **Poids du dépôt** : `.git` ≈ 876 Mo en local et en hausse (chaque PDF refait ajoute 10 à 50 Mo ; films BIX). Limites GitHub : 100 Mo/fichier, dépôt conseillé < 1 Go, site Pages ≤ 1 Go. | Compresser les PDF, sortir les films, nettoyer l'historique à terme. |
| 4 | Moyen | **Tables `pages.json`** à tenir à jour à chaque export (sinon PDF partiel faux). | Les générer dans les outils d'export de chaque deck. |
| 5 | Faible | Pas de page 404. | Une `404.html` sobre à la racine. |
| 6 | Faible | `bix/shared/base.css` garde d'anciennes règles de barre/grille (écrasées). | Nettoyer avec la session BIX. |
| 7 | Info | TDP : des PDF régénérés non commités traînent dans sa source (travail de sa session). | Ne pas y toucher depuis DECK HOME. |

---

## 12. Historique condensé

| Date | Étape |
|---|---|
| 30.10.2026 | Domaine en ligne ; écran d'accès commun (`shared/gate.*`) ; BIX copié depuis `Hint3rland/bixter` (sans films) et publié sur `/biw/` ; vignettes : un clic ouvre, la coche masque, plus d'Annuler/Terminer. |
| 31.10.2026 | Barre de commandes commune (`shared/controls.js`, 5 commandes) ; audit, `MANUEL.md`, `AGENTS.md` ; indexation bloquée. |
| 01.11.2026 | Écran d'accès : code retenu par l'onglet (changer de langue ne le redemande plus). |
| 02.11.2026 | Code BIW → BIX ; colonne Project ; TDP, MAG, TOT, CBM publiés par leurs sessions ; codes d'accès BIX, CBM, TOT ; barre commune (`controls.css`) et langues (`i18n.js`) ; tous les decks sous la barre commune ; `modele/` et `tools/check-decks.py` ; **lecteur commun** (`viewer.js`) en 4 étapes : modèle, puis TDP/MAG/TOT/CBM, puis ALS/HOW/BIX (+ livret), puis vérification stricte (9/9) ; contexte TOT = MCI ; ce HANDOVER. |
| 02.11.2026 | BIX : dossier et adresse renommés `bix/` ; `/biw/` redirige. |

---

## 13. Pour l'agent qui reprend : check-list de démarrage

1. Lire `AGENTS.md`, ce `HANDOVER.md`, puis `MANUEL.md` ; parcourir `shared/viewer.js` (en-tête = API) et `modele/`.
2. `cd ~/Projects/deck-presentation && git pull --ff-only && git status` ; `python3 tools/check-decks.py`.
3. Ouvrir `https://deck-presentation.com/` et un deck sans code (`/tdp/`, `/mag/`) : barre, O, coches, R, langue.
4. Savoir dans quelle session on est (interface ou tel deck) et s'y tenir.
5. Avant toute action en ligne : tester, vérifier, **demander « Je publie ? »**, publier, vérifier en ligne, résumer simplement au propriétaire.

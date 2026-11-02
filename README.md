# deck-presentation.com

Site servi par GitHub Pages, relié au domaine `deck-presentation.com` acheté chez Gandi.

Vue d'ensemble, recettes et audit : [MANUEL.md](MANUEL.md). Consignes pour les agents : [AGENTS.md](AGENTS.md).

## Ce qui est en place

| Élément | Valeur |
|---|---|
| Dépôt | `ghelleu/deck-presentation` (public) |
| Branche publiée | `main`, à la racine |
| Domaine | `deck-presentation.com` (fichier `CNAME`) |
| DNS | Gandi LiveDNS : `@` A + AAAA vers GitHub Pages, `www` CNAME vers `ghelleu.github.io` |
| HTTPS | Certificat Let's Encrypt fourni par GitHub Pages, `https_enforced` actif |

## Publier une présentation

1. Créer un dossier à la racine, nommé en minuscules sans espaces : `mon-deck/`.
2. Y déposer un `index.html` (le deck), avec ses images et ses polices en chemins relatifs.
3. Ajouter une ligne au tableau de `index.html` à la racine (toute la ligne ouvre le deck) :
   ```html
   <tr class="lien"><td class="code"><a href="/mon-deck/">CODE</a></td><td>Titre du projet</td><td>Client</td><td>Type</td><td>MCI</td><td>Nov. 2026</td></tr>
   ```
   Une présentation pas encore en ligne : `<tr class="attente">` et le code sans lien.
4. Pousser sur `main`. GitHub Pages reconstruit en une minute environ.

Le fichier `.nojekyll` est présent : les dossiers dont le nom commence par un souligné sont servis tels quels, sans transformation Jekyll.

## Fonctions communes à tous les decks (`shared/`)

Ce qui sert à plusieurs decks vit dans `shared/`, à la racine, et n'est pas recopié dans les dossiers des decks.

| Fichier | Rôle |
|---|---|
| `shared/gate.js` | Écran d'accès à 5 chiffres. Lit `GATE` (empreinte SHA-256) dans le `config.js` du deck ; `null` : pas d'écran. Sauté pour `?print` et l'aperçu local (`?gate` le force). Le bon code est retenu par l'onglet jusqu'à sa fermeture (`sessionStorage`, par deck) : changer de langue ou recharger la page ne le redemande pas. |
| `shared/gate.css` | Structure de cet écran. Chaque deck règle son apparence dans son `styles.css` avec les variables `--gate-*` posées sur `.gate`, et masque ses propres commandes avec `html.gated …`. |
| `shared/controls.js` | La barre de commandes, identique sur tous les decks : **plein écran (F) · revenir au début (R) · toutes les slides (O) · langue · télécharger le PDF**, dans cet ordre, rien d'autre. Le bouton langue n'apparaît que si `DECK_CONFIG.LANGS` compte au moins deux langues. Clavier : flèches, espace, Entrée, retour arrière, Page préc./suiv., Début/Fin, plus F, R, O et Échap (ouvre et ferme les vignettes). Aucune autre touche, aucun bouton propre à un deck. |
| `shared/controls.css` | L’apparence de cette barre, qui appartient au lecteur et non au deck : une bande au pied de la fenêtre, dans la typo de l’accueil (Helvetica Neue), visible quand la souris bouge (`body.show-hud`, posé par le moteur du deck), avec le trait de progression dessous (`--p`, de 0 à 1) et l'état « PDF en préparation » (`a.busy`). Un deck la charge avant son `styles.css` et ne peut que la teinter : `--hud-ink`, `--hud-accent`, `--hud-shade`. En place sur tous les decks depuis le 02.11.2026. |
| `shared/i18n.js` | Les langues, communes à tous les decks : la langue vient de `?lang=` (parmi `DECK_CONFIG.LANGS`), sinon `LANG`. Il lit `content/<lang>.json` et remplace les textes marqués dans la page : `[data-t]` (HTML intérieur, coupures de ligne composées à la main), `img[data-t-alt]`, `[data-t-label]` (titre de slide) ; `ui` garde les mots que le moteur dessine, `views` les titres d’un plan JSON. Il met le PDF de la langue dans la barre (`data-pdf="export/deck-{lang}.pdf"`). Le moteur attend `await window.DECK_I18N` puis branche le bouton langue sur `switchLang()`. La page est écrite dans la première langue, qui sert de repli. En place sur TOT, TDP et MAG ; ALS et HOW ont leur propre chargeur. |
| `shared/viewer.js` + `viewer.css` | **Le lecteur**, commun à tous les decks : les touches (flèches, espace, Entrée, retour arrière, Page préc./suiv., Début/Fin, F, R, O, Échap ; rien d'autre), le balayage au doigt, les boutons de la barre, la barre qui apparaît quand la souris bouge, le compteur et le trait de progression, l'adresse de chaque slide (`#id`), **les vignettes** (logique ALS : grille de 4 colonnes où la slide recule puis revient en plein écran, flèches pour choisir, Entrée ou clic pour ouvrir, barre « Slides à présenter » en haut avec le compte et « Tout réafficher »), **les coches** (masquer ou réafficher une slide, gardées par le navigateur, jamais toutes décochées) et **le PDF des slides cochées** (d'après `export/pages.json`). Le moteur du deck lui confie ses slides par `DeckViewer.mount({ slides, show, step, thumb, stage })` et ne garde que l'affichage, les animations et les étapes dans une slide. Teinte : `--hud-*`, `--vw-ground`, `--vw-page`. En place sur `modele/`, CBM, TDP, MAG et TOT ; ALS, HOW et BIX y passent ensuite. |

La plateforme est un lecteur de decks : chaque deck fait le travail derrière ces cinq commandes (son PDF, ses langues, ses vignettes), mais n'en ajoute pas. Dans le `index.html` du deck, la barre est une boîte vide que `controls.js` remplit :

```html
<div class="hud" role="toolbar">
  <div class="hud-l"><span class="hud-count" id="hudCount"></span><span class="hud-title" id="hudTitle"></span></div>
  <div class="hud-r" data-controls data-pdf="export/deck.pdf" data-pdf-name="Deck.pdf"></div>
</div>
…
<script src="config.js"></script>
<script src="../shared/gate.js"></script>
<script src="../shared/controls.js"></script>        <!-- avant le moteur du deck -->
<script src="engine.js"></script>
```

Le moteur du deck branche les boutons par leur `data-act` : `fullscreen`, `restart`, `overview`, `lang`, et le lien `pdf` (il peut en changer l'adresse, par exemple selon la langue).

Exception : BIW a son propre dossier `biw/shared/` ; il charge la barre par `/shared/controls.js` (chemin absolu).

Aperçu local d'un deck depuis son dossier de travail : un lien `shared` (ignoré par git) à la racine de ce dossier pointe vers `~/Projects/deck-presentation/shared`, pour que `../shared/` et `/shared/` y trouvent les fichiers de la plateforme (`ln -s ~/Projects/deck-presentation/shared shared`). En place pour ALS (`~/Projects/als-century-of-exchange`) et BIW (`~/Projects/bixter`) ; HOW se construit directement dans `how/` (gabarit `~/HOW-sources/tools/index.tpl.html`).

Dans le `index.html` du deck :

```html
<link rel="stylesheet" href="../shared/gate.css">   <!-- avant styles.css -->
<link rel="stylesheet" href="../shared/controls.css">   <!-- avant styles.css -->
<link rel="stylesheet" href="styles.css">
…
<script src="config.js"></script>
<script src="../shared/gate.js"></script>             <!-- après config.js -->
<script src="../shared/controls.js"></script>         <!-- avant le moteur du deck -->
<script src="../shared/i18n.js"></script>             <!-- après controls.js, avant le moteur -->
```

## Nouveau deck et vérification

- **`modele/`** : le point de départ de tout nouveau deck, déjà branché sur `shared/` (écran d'accès, barre, langues, PDF), avec un moteur minimal qui fait le travail derrière les 5 commandes. Mode d'emploi : [modele/README.md](modele/README.md). Aperçu : https://deck-presentation.com/modele/ (non listé sur l'accueil).
- **`tools/check-decks.py`** : vérifie que chaque deck est bien sous l'interface (fichiers de `shared/` chargés et dans l'ordre, barre vide, aucun bouton ni style de barre propre au deck, pas d'autres touches, `config.js`, `noindex`, PDF présents, ligne sur l'accueil). `python3 tools/check-decks.py` pour tous, `python3 tools/check-decks.py <code>` pour un seul. À lancer avant chaque publication.

Répartition du travail : la plateforme (page d'accueil, `shared/`, `modele/`, `tools/`, README, domaine) se modifie depuis ce dépôt, par la seule session « DECK HOME » ; chaque deck se construit dans son propre dossier de travail et ne touche que son dossier ici (`als/`, `how/`…). Les sources d'un deck doivent donc pointer vers `../shared/` et ne plus contenir leur propre `gate.js`, sinon la prochaine copie du deck le remet.

## Vérifier après un changement

```bash
curl -sI https://deck-presentation.com/ | head -3
curl -s https://deck-presentation.com/mon-deck/ | head -5
```

Le domaine répond aussi en `www.deck-presentation.com`.

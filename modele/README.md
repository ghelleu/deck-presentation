# Modèle de deck

Point de départ de tout nouveau deck de deck-presentation.com. Il est déjà branché sur l'interface de la plateforme (`../shared/`) : écran d'accès, barre de commandes, langues, PDF. Un nouveau deck ne refait rien de tout ça : il ne fait que son contenu.

Aperçu : https://deck-presentation.com/modele/ (non listé sur l'accueil).

## Démarrer un deck

1. Copier ce dossier dans un nouveau dossier de travail (un dépôt git privé par deck) :
   ```bash
   cp -R ~/Projects/deck-presentation/modele ~/Projects/<nom-du-deck>
   cd ~/Projects/<nom-du-deck> && rm -rf export/*.pdf && git init
   ln -s ~/Projects/deck-presentation/shared shared     # pour l'aperçu local (à ignorer dans git)
   echo "/shared" >> .gitignore
   ```
2. Aperçu : `python3 -m http.server 4190 --bind 127.0.0.1`, puis http://127.0.0.1:4190/ (`?lang=en` pour l'anglais, `?gate` pour voir l'écran d'accès).
3. Faire le deck :
   - les slides dans `index.html`, une `<section class="slide">` par slide, avec un `id` (son adresse) et un `data-label` (son titre dans la barre et les vignettes) ;
   - le style dans `styles.css` : polices, couleurs, mise en page ;
   - les autres langues dans `content/<langue>.json`, avec les clés `data-t` des textes et `data-t-label` des titres.
4. Régler `config.js` : `LANGS` (une seule langue : le bouton langue disparaît) et `GATE` (le code d'accès).
5. Exporter les PDF, un par langue, vers les noms annoncés dans `data-pdf` :
   ```bash
   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-pdf-header-footer \
     --virtual-time-budget=4000 --print-to-pdf=export/<deck>-fr.pdf "http://127.0.0.1:4190/?print&lang=fr"
   ```
6. Publier, avec l'accord de la personne : copier le deck dans `~/Projects/deck-presentation/<code>/` (sans `shared`, sans `.git`), ajouter la ligne sur l'accueil, puis `git add <code> index.html`, commit, push. Avant de pousser, lancer `python3 tools/check-decks.py` depuis `~/Projects/deck-presentation` : il doit afficher OK pour le nouveau deck.

## Ce qui appartient à l'interface (ne pas toucher dans un deck)

| Fichier de la plateforme | Ce qu'il fait | Ce que le deck peut faire |
|---|---|---|
| `../shared/gate.css`, `gate.js` | Écran d'accès à 5 chiffres | Le teinter (`--gate-*` sur `.gate`), régler `GATE` |
| `../shared/controls.css` | Allure et place de la barre (pied de la fenêtre, typo de l'accueil) | La teinter : `--hud-ink`, `--hud-accent`, `--hud-shade` |
| `../shared/controls.js` | Les 5 boutons, dans cet ordre | Rien : la boîte `.hud-r[data-controls]` reste vide dans la page |
| `../shared/i18n.js` | Langue, textes traduits, PDF de la langue | Fournir `content/<langue>.json` |
| `../shared/viewer.js`, `viewer.css` | Le lecteur : touches, vignettes (grille), coches, compteur, progression, PDF des slides cochées | Lui confier ses slides (`DeckViewer.mount`), fournir `export/pages.json`, teinter la grille (`--vw-ground`, `--vw-page`) |

Le moteur (`engine.js`) ne fait que trois choses, qu'il confie au lecteur par `DeckViewer.mount(...)` : la liste des slides (`slides`), comment en afficher une (`show`), et à quoi ressemble sa vignette (`thumb`). S'il a des étapes à l'intérieur d'une slide, il les gère dans `step` (rendre `true` tant qu'il reste une étape). Il n'écoute **aucune touche** et n'ajoute **aucun bouton** : le lecteur s'en charge pour tous les decks. Un deck peut l'enrichir (animations, étapes), sans changer ces règles.

Le PDF des slides cochées : `export/pages.json` dit quelles pages du PDF exporté appartiennent à chaque slide (`{ "pages": { "id-de-la-slide": [0], … } }`, pages comptées à partir de 0). À refaire à chaque export si le nombre de pages change.

Besoin d'une nouvelle fonction commune (une commande, un réglage de la barre) ? Elle se décide dans l'interface, pour tous les decks : la demander à la session « DECK HOME », pas l'ajouter dans le deck.

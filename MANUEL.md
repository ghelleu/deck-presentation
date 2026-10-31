# deck-presentation.com : audit, rapport et manuel de prise en main

État au 31.10.2026. Ce document s'adresse à une personne ou à un agent qui reprend le projet sans contexte. Il complète le [README](README.md), qui reste la référence technique courte de la plateforme.

---

## 1. En bref

deck-presentation.com est une **plateforme de visionnage de présentations** (des « decks »). Elle est faite de deux projets distincts, qui ne se modifient pas au même endroit ni par les mêmes personnes :

| | **Projet 1 : la plateforme** | **Projet 2 : les decks** |
|---|---|---|
| Ce que c'est | Le lecteur : la page d'accueil, l'écran d'accès, la barre de commandes commune, le domaine, l'hébergement | Le contenu : chaque présentation (textes, images, mise en page, PDF), une par client |
| Où on travaille | Le dépôt `ghelleu/deck-presentation`, dans `~/Projects/deck-presentation` | Le dossier source de chaque deck (voir §5), **pas** dans le dépôt de la plateforme |
| Ce qu'on y touche | `index.html` (accueil), `shared/`, `README.md`, `MANUEL.md`, `CNAME` | Tout le contenu du deck, puis on recopie le résultat dans son dossier publié (`als/`, `how/`, `biw/`) |
| Session Claude | « DECK HOME » | Une session par deck (ALS, HOW, BIW…) |

Règle d'or : **la plateforme définit les commandes, les decks les respectent.** Un deck ne rajoute ni bouton ni raccourci clavier à lui.

En ligne aujourd'hui :

| Code | Client | Type | Contexte | Date | Adresse |
|---|---|---|---|---|---|
| ALS | A. Lange & Söhne | Inauguration | MCI | Nov. 2026 | https://deck-presentation.com/als/ |
| HOW | House of Wunder | Événementiel | MCI | Nov. 2026 | https://deck-presentation.com/how/ |
| BIW | Bixler's | Retail | Downtown studio | Oct. 2026 | https://deck-presentation.com/biw/ |
| CBM | Caroline Barbier Muller | Soirée | MCI | Nov. 2026 | *pas encore en ligne* |

---

## 2. Carte des lieux

| Élément | Emplacement | Visibilité | Rôle |
|---|---|---|---|
| Dépôt de la plateforme | `github.com/ghelleu/deck-presentation` → `~/Projects/deck-presentation` | **Public** | Tout ce qui est servi sur le site, branche `main`, racine |
| Source ALS | `github.com/ghelleu/als-century-of-exchange` → `~/Projects/als-century-of-exchange` | Privé | Deck ALS complet (notes, outils, références) |
| Source BIW | `github.com/ghelleu/bixter` → `~/Projects/bixter` | Privé | Copie de `Hint3rland/bixter` sans les médias du film (remote `hint3rland`, en lecture seule) |
| Source HOW | `~/HOW-sources` | **Pas de git** | PowerPoint d'origine, outils de fabrication (`tools/build.py`) |
| Domaine | Gandi, `deck-presentation.com` | | DNS LiveDNS vers GitHub Pages (`@` A + AAAA, `www` CNAME `ghelleu.github.io`) |
| Hébergement | GitHub Pages | Toujours public | HTTPS Let's Encrypt, HTTPS forcé, `www` redirige vers le domaine nu |

Arborescence du dépôt de la plateforme :

```
deck-presentation/
├── index.html        page d'accueil (le tableau des decks)          ← plateforme
├── shared/           fonctions communes à tous les decks             ← plateforme
│   ├── gate.js       écran d'accès à 5 chiffres
│   ├── gate.css      structure de cet écran
│   └── controls.js   barre de commandes commune
├── README.md         référence technique courte                     ← plateforme
├── MANUEL.md         ce document                                    ← plateforme
├── AGENTS.md         consignes pour les agents (CLAUDE.md y renvoie) ← plateforme
├── CNAME, .nojekyll  domaine ; fichiers servis tels quels            ← plateforme
├── als/              copie publiée du deck ALS                       ← deck (recopié depuis sa source)
├── how/              copie publiée du deck HOW                       ← deck (fabriqué par build.py)
└── biw/              copie publiée du deck BIW                       ← deck (recopié depuis bixter)
```

---

## 3. Projet 1 : la plateforme

### 3.1 La page d'accueil (`index.html`)

Un tableau sobre (Code, Client, Type, Context, Date), en clair et en sombre selon le système, qui devient une liste de cartes sur téléphone. Tout le style est dans la page, sans dépendance externe.

- Un deck en ligne : la ligne entière est cliquable.
  ```html
  <tr class="lien"><td class="code"><a href="/code/">CODE</a></td><td>Client</td><td>Type</td><td>Contexte</td><td>Nov. 2026</td></tr>
  ```
- Un deck à venir : `<tr class="attente">`, le code sans lien, la ligne en gris.

### 3.2 L'écran d'accès (`shared/gate.js` + `shared/gate.css`)

- Un écran noir, « Password », 5 chiffres. Le deck reste caché tant que le code n'est pas bon.
- Le code est stocké dans le `config.js` du deck sous forme d'empreinte SHA-256 (clé `GATE`). Avec `GATE: null`, il n'y a pas d'écran.
- L'écran est sauté pour `?print` (export PDF) et pour l'aperçu local. Ajouter `?gate` le force en local.
- Rien n'est mémorisé : le code est redemandé à chaque visite.
- Chaque deck règle l'apparence de l'écran avec les variables `--gate-*` dans son `styles.css`, et masque ses propres éléments avec `html.gated …`.
- Changer le code : `printf 12345 | shasum -a 256`, puis coller l'empreinte dans `GATE`.

**C'est un écran de courtoisie, pas une serrure** (voir l'audit, §7).

### 3.3 La barre de commandes (`shared/controls.js`)

Elle est identique sur tous les decks. Cinq commandes, dans cet ordre, rien d'autre :

| Commande | Bouton | Touche |
|---|---|---|
| Plein écran | ⛶ | F |
| Revenir au début | ↺ | R |
| Toutes les slides (vignettes) | ▦ | O ; Échap ouvre et ferme |
| Langue | `EN` / `FR` | *(aucune)* ; le bouton n'apparaît que si le deck a au moins deux langues |
| Télécharger le PDF | ↓ | *(aucune)* |

Navigation : flèches, espace, Entrée, retour arrière, Page préc./suiv., Début/Fin. Aucune autre touche.

Les vignettes fonctionnent ainsi : un clic sur une vignette ouvre la slide, et la coche en haut à droite masque ou réaffiche la slide. Il n'y a pas de bouton Annuler ni Terminer.

Fonctionnement : `controls.js` remplit une boîte vide de la page avec les boutons. Les libellés sont en français ou en anglais selon la langue du deck. Le moteur du deck branche ensuite chaque bouton par son attribut `data-act` (`fullscreen`, `restart`, `overview`, `lang`, et le lien `pdf`).

### 3.4 Le contrat qu'un deck doit respecter

```html
<link rel="stylesheet" href="../shared/gate.css">   <!-- avant styles.css -->
<link rel="stylesheet" href="styles.css">
…
<div class="hud" role="toolbar">
  <div class="hud-l"><span class="hud-count" id="hudCount"></span><span class="hud-title" id="hudTitle"></span></div>
  <div class="hud-r" data-controls data-pdf="export/deck.pdf" data-pdf-name="Deck.pdf"></div>
</div>
…
<script src="config.js"></script>            <!-- window.DECK_CONFIG : LANG, LANGS, GATE -->
<script src="../shared/gate.js"></script>
<script src="../shared/controls.js"></script> <!-- avant le moteur -->
<script src="engine.js"></script>
```

Il faut aussi `<meta name="robots" content="noindex, nofollow">` dans la page du deck.

Exception BIW : le deck a son propre dossier `biw/shared/`, donc il charge la barre par un chemin absolu, `/shared/controls.js`.

Aperçu local d'un deck depuis sa source : un lien `shared`, ignoré par git, pointe vers `~/Projects/deck-presentation/shared` (`ln -s ~/Projects/deck-presentation/shared shared`). Il est en place pour ALS et BIW.

### 3.5 Publier un changement de la plateforme

```bash
cd ~/Projects/deck-presentation
git pull --ff-only
# modifier index.html / shared/ / README.md
git add index.html shared README.md MANUEL.md     # par chemin, jamais -A
git commit -m "…" && git push
```

GitHub Pages reconstruit le site en une minute environ. Les navigateurs gardent l'ancienne version jusqu'à 10 minutes : recharger avec Cmd+Maj+R.

**Changer `shared/` touche tous les decks d'un coup.** Il faut vérifier les trois après chaque changement (§6.5).

---

## 4. Projet 2 : les decks, ce qu'ils ont en commun

- Chaque deck est une page web plein écran, fabriquée et testée dans son propre dossier source. Le résultat est ensuite recopié dans `deck-presentation/<code>/` et poussé.
- Un deck fournit lui-même ce qu'il y a derrière les cinq commandes : son PDF (`export/`), ses langues (`content/fr.json`, `content/en.json`), ses vignettes.
- Il ne touche à rien en dehors de son dossier publié : ni à l'accueil, ni à `shared/`.
- Les notes du présentateur ne sont pas publiées. On présente avec les notes depuis la copie locale.
- Ajouter le deck à l'accueil (une ligne du tableau) est une tâche de la plateforme.

---

## 5. Fiches des decks

### ALS : A. Lange & Söhne, Grand Opening Genève

- **Source** : `~/Projects/als-century-of-exchange` (privé). Lire son `README.md` et son `HANDOFF.md`.
- **Langues** : français et anglais. Code d'accès : oui.
- **Aperçu** : `python3 -m http.server 4173 --bind 127.0.0.1`, puis http://127.0.0.1:4173/ (ajouter `?lang=en` pour l'anglais).
- **Publier** :
  ```bash
  cd ~/Projects/als-century-of-exchange
  .tools/bin/python tools/publish-site.py          # fabrique dist/site/ et les 2 PDF ; vide les notes
  rsync -a --delete --exclude .git --exclude CNAME --exclude .nojekyll dist/site/ ~/Projects/deck-presentation/als/
  cd ~/Projects/deck-presentation && git add als && git commit -m "Update the ALS deck" && git push
  ```
- Particularités : un mode « arbitrage » (`ARBITRATION` dans `config.js`) retire certaines phrases de la copie publique. Il existe aussi un export PowerPoint (`tools/export-pptx.py`).

### HOW : House of Wunder × W&W 2027

- **Source** : `~/HOW-sources`, qui contient le PowerPoint d'origine et les outils `tools/`. **Pas sous git.**
- **Langues** : anglais (langue de base, tirée du PowerPoint) et français. Code d'accès : oui.
- **Fabrication** : `tools/build.py <dossier de travail> ~/Projects/deck-presentation/how` écrit directement `how/index.html`, `content/*.json` et `export/pages.json`. Le gabarit de la page est `tools/index.tpl.html` et les textes de l'interface sont dans `tools/meta.json`.
- `how/engine.js` et `how/styles.css` se modifient **directement dans le dépôt de la plateforme**, qui en est la seule copie.
- **Publier** : `git add how && git commit && git push` depuis `~/Projects/deck-presentation`.

### BIW : Bixler's × Rolex

- **Source** : `~/Projects/bixter` (privé, `ghelleu/bixter`). Elle copie `Hint3rland/bixter` sans les médias du film. Lire son `CLAUDE.md`, et `assets/film/RULES.md` pour tout ce qui touche au film.
- **Langue** : anglais seulement, donc pas de bouton langue. **Pas de code d'accès.**
- **Structure différente** des deux autres decks : moteur `full.js`, avec `directions/shared/engine.js` et `base.css`, sans `config.js`. Il y a aussi un livret (`book.html`, avec son PDF) et des films (`film/`).
- **Publier** : copier `directions/full/` dans `biw/` et `directions/shared/` dans `biw/shared/`. Dans `index.html` et `book.html`, remplacer `"../shared/` par `"shared/`, mais laisser `/shared/controls.js` tel quel. Ensuite : `git add biw && git commit && git push`.
- Le remote `hint3rland` est configuré pour ne pas télécharger les gros fichiers (`blob:none`). Ne pas le récupérer en entier : il pèse plusieurs gigaoctets de films.

### CBM : Caroline Barbier Muller

Pas encore de deck. Il y a seulement une ligne grisée sur l'accueil.

---

## 6. Recettes

### 6.1 Ajouter un nouveau deck
1. **Deck** : créer sa source dans un dépôt privé et respecter le contrat du §3.4 (avec le lien `shared` pour l'aperçu local).
2. **Deck** : fabriquer la copie publique dans `deck-presentation/<code>/`, avec un code en minuscules, sans espace.
3. **Plateforme** : ajouter la ligne `tr.lien` sur l'accueil, ou passer la ligne `attente` en `lien`.
4. Pousser, puis vérifier (§6.5).

### 6.2 Mettre à jour un deck
On travaille dans la source du deck, on refabrique sa copie, puis on fait `git add <code>` seulement.

### 6.3 Modifier une fonction commune
1. Modifier `shared/`, puis mettre à jour le README et ce manuel si le contrat change.
2. Si le contrat HTML change, adapter **aussi les sources des decks** (le gabarit HOW, `index.html` d'ALS, `directions/full/index.html` de BIW). Sinon, la prochaine publication d'un deck remet l'ancienne version.
3. Vérifier les trois decks.

### 6.4 Changer ou retirer un code d'accès
`printf 54321 | shasum -a 256` → `GATE: "<empreinte>"` dans le `config.js` de la **source** du deck, puis republier. `GATE: null` retire l'écran.

### 6.5 Vérifier après un changement
```bash
for u in "" als/ how/ biw/ shared/controls.js shared/gate.js shared/gate.css; do
  printf "%s /%s\n" "$(curl -s -o /dev/null -w '%{http_code}' https://deck-presentation.com/$u)" "$u"; done
```
Tout doit renvoyer `200`. Ensuite, ouvrir chaque deck et contrôler :
- l'écran d'accès s'affiche sur ALS et HOW ;
- la barre a 5 boutons (4 sur BIW) ;
- le PDF se télécharge ;
- O, R, F et Échap répondent ;
- la console du navigateur n'affiche aucune erreur.

---

## 7. Audit (31.10.2026)

### 7.1 Ce qui fonctionne
- Le site, les trois decks, les fichiers `shared/` et les PDF répondent tous en `200`. HTTPS est forcé et `www` redirige.
- La barre commune est en place sur les trois decks publiés **et** dans leurs sources (gabarit HOW, ALS, BIW). Les anciens boutons (annexes, notes, aide) et les anciennes touches ont disparu partout.
- L'écran d'accès commun est actif sur ALS et HOW. Plus aucun deck n'embarque sa propre copie.
- Les dépôts sources ALS et BIW sont propres et synchronisés avec GitHub.

### 7.2 Corrigé pendant cet audit
| Constat | Correction |
|---|---|
| La source ALS avait la migration vers la barre commune **non enregistrée** (7 fichiers). Une publication depuis une autre copie aurait remis l'ancienne barre. | Validé et poussé (`als-century-of-exchange` bbf0eb6) |
| La commande de publication d'ALS faisait `git add -A` dans le dépôt de la plateforme, alors que ce dépôt est partagé par plusieurs sessions. Elle pouvait embarquer le travail d'une autre session. | Remplacé par `git add als` (5924cf0) |
| Le README d'ALS citait encore les anciennes touches (n, b, ?) | Corrigé |

### 7.3 Risques et recommandations

| # | Niveau | Constat | Recommandation |
|---|---|---|---|
| 1 | **Élevé** | **Confidentialité.** Le dépôt de la plateforme est public : textes (`content/*.json`), images et PDF sont lisibles sans code, sur GitHub comme par leur adresse directe. Le code à 5 chiffres ne fait que 100 000 combinaisons et son empreinte est dans `config.js` : on le retrouve en moins d'une seconde. | Le considérer comme une politesse. Pour un deck vraiment confidentiel, il faut une protection côté serveur, par exemple Cloudflare Access devant le domaine, ou un hébergeur avec mot de passe. Un site GitHub Pages reste public même depuis un dépôt privé. |
| 2 | **Élevé** | **HOW n'est pas versionné.** `~/HOW-sources`, avec le PowerPoint d'origine et les outils, n'a ni git ni sauvegarde. Une perte du disque perd la source. | En faire un dépôt privé (`ghelleu/how-sources`). C'est à décider dans le canal HOW. |
| 3 | Moyen | **Indexation.** L'accueil n'a pas de `noindex` et il n'y a pas de `robots.txt` à la racine. Le tableau, avec les noms des clients, peut donc être indexé. Les `robots.txt` placés dans `als/`, `how/` et `biw/` sont ignorés par les moteurs, qui ne lisent que celui de la racine. Les PDF ne sont pas couverts par le `noindex` des pages. | Ajouter un `robots.txt` à la racine (`Disallow: /`) et `noindex` sur l'accueil. |
| 4 | Moyen | **Poids.** Le site publié fait environ 265 Mo, l'historique local 582 Mo et le dépôt GitHub 294 Mo. Chaque PDF refait ajoute 20 à 50 Mo d'historique (HOW : 2 × 26 Mo ; BIW : films de 18-19 Mo). Limites GitHub : 100 Mo par fichier, dépôt conseillé sous 1 Go, site Pages limité à 1 Go. | Compresser les PDF, sortir les films vers un hébergement vidéo, et prévoir à terme un nettoyage de l'historique. |
| 5 | Moyen | **Une seule copie de travail partagée** par plusieurs sessions (`~/Projects/deck-presentation`). Le 30.10, un changement de branche a fait atterrir un commit HOW au mauvais endroit. | Ne jamais changer de branche dans cette copie, ajouter les fichiers par chemin, et travailler dans un `git worktree` pour une branche. |
| 6 | À décider | **BIW n'a pas d'écran d'accès.** | Donner un code à 5 chiffres si on en veut un. Il faut alors ajouter un `config.js` avec `GATE` et charger `gate.js`/`gate.css` dans la source BIW. |
| 7 | Faible | BIW charge la barre par un chemin absolu (`/shared/controls.js`). C'est correct sur le domaine, mais ça casserait si le site était servi sous un sous-dossier. | Rien à faire tant que le domaine ne change pas. |
| 8 | Faible | Seules la barre et l'écran d'accès sont communs. La navigation et les vignettes sont réécrites dans chacun des trois moteurs. | Si un 4ᵉ deck arrive, envisager un moteur de vignettes commun dans `shared/`. |
| 9 | Faible | Il n'y a ni vérification automatique ni page 404. | Script de vérification du §6.5 ; une `404.html` sobre à la racine. |

---

## 8. Règles de travail (personnes et agents)

1. **Savoir dans quel projet on est.** Plateforme : accueil, `shared/`, docs, domaine. Deck : tout le reste. Une demande sur le contenu d'un deck se traite dans la session de ce deck.
2. **Ne modifier un dossier de deck (`als/`, `how/`, `biw/`) depuis la plateforme** que si une fonction commune l'exige, et reporter le même changement dans la source du deck.
3. **Git dans `~/Projects/deck-presentation`** : `git pull --ff-only` avant de commencer ; ajouter les fichiers par chemin (`git add als`), jamais `git add -A` ; ne pas changer de branche ; pour une branche, utiliser `git worktree add`.
4. **Ne jamais publier de notes du présentateur** ni de contenu sous arbitrage. Passer par les outils de publication des decks.
5. **Aucun bouton ni raccourci propre à un deck.** Une nouvelle commande se décide au niveau de la plateforme, pour tous les decks.
6. **Demander avant** de pousser, de publier un nouveau deck, de changer un code d'accès ou de rendre un dépôt public ou privé.
7. Ne pas télécharger le remote `hint3rland` en entier (plusieurs Go de films).
8. Vérifier en ligne après chaque publication (§6.5).

---

## 9. Historique récent

| Date | Événement |
|---|---|
| 30.10.2026 | Domaine en ligne. Écran d'accès mis en commun (`shared/gate.*`). |
| 30.10.2026 | BIW copié depuis `Hint3rland/bixter` vers `ghelleu/bixter`, sans les films, puis publié sur `/biw`. |
| 30.10.2026 | Vignettes : un clic ouvre la slide, la coche masque ou réaffiche ; Annuler et Terminer sont supprimés (tous les decks). |
| 31.10.2026 | Barre de commandes commune (`shared/controls.js`) : 5 commandes, plus de touches propres aux decks. |
| 31.10.2026 | Audit : source ALS régularisée, commande de publication sécurisée, ce manuel et `AGENTS.md`. |

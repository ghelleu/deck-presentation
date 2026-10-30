# deck-presentation.com

Site servi par GitHub Pages, relié au domaine `deck-presentation.com` acheté chez Gandi.

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
   <tr class="lien"><td class="code"><a href="/mon-deck/">CODE</a></td><td>Client</td><td>Type</td><td>MCI</td><td>Nov. 2026</td></tr>
   ```
   Une présentation pas encore en ligne : `<tr class="attente">` et le code sans lien.
4. Pousser sur `main`. GitHub Pages reconstruit en une minute environ.

Le fichier `.nojekyll` est présent : les dossiers dont le nom commence par un souligné sont servis tels quels, sans transformation Jekyll.

## Fonctions communes à tous les decks (`shared/`)

Ce qui sert à plusieurs decks vit dans `shared/`, à la racine, et n'est pas recopié dans les dossiers des decks.

| Fichier | Rôle |
|---|---|
| `shared/gate.js` | Écran d'accès à 5 chiffres. Lit `GATE` (empreinte SHA-256) dans le `config.js` du deck ; `null` : pas d'écran. Sauté pour `?print` et l'aperçu local (`?gate` le force). |
| `shared/gate.css` | Structure de cet écran. Chaque deck règle son apparence dans son `styles.css` avec les variables `--gate-*` posées sur `.gate`, et masque ses propres commandes avec `html.gated …`. |
| `shared/controls.js` | La barre de commandes, identique sur tous les decks : **plein écran (F) · revenir au début (R) · toutes les slides (O) · langue · télécharger le PDF**, dans cet ordre, rien d'autre. Le bouton langue n'apparaît que si `DECK_CONFIG.LANGS` compte au moins deux langues. Clavier : flèches, espace, Entrée, retour arrière, Page préc./suiv., Début/Fin, plus F, R, O et Échap (ouvre et ferme les vignettes). Aucune autre touche, aucun bouton propre à un deck. |

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

Dans le `index.html` du deck :

```html
<link rel="stylesheet" href="../shared/gate.css">   <!-- avant styles.css -->
<link rel="stylesheet" href="styles.css">
…
<script src="config.js"></script>
<script src="../shared/gate.js"></script>             <!-- après config.js -->
<script src="../shared/controls.js"></script>         <!-- avant le moteur du deck -->
```

Répartition du travail : la plateforme (page d'accueil, `shared/`, README, domaine) se modifie depuis ce dépôt ; chaque deck se construit dans son propre dossier de travail et ne touche que son dossier ici (`als/`, `how/`…). Les sources d'un deck doivent donc pointer vers `../shared/` et ne plus contenir leur propre `gate.js`, sinon la prochaine copie du deck le remet.

## Vérifier après un changement

```bash
curl -sI https://deck-presentation.com/ | head -3
curl -s https://deck-presentation.com/mon-deck/ | head -5
```

Le domaine répond aussi en `www.deck-presentation.com`.

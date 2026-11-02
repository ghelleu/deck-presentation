# Consignes pour les agents : deck-presentation.com

Lire d'abord [MANUEL.md](MANUEL.md) (vue d'ensemble, recettes, audit), puis [README.md](README.md) (référence technique de la plateforme).

## Deux projets, deux endroits
- **L'interface** (la plateforme, ce dépôt) : `index.html` (accueil), `shared/` (écran d'accès, barre de commandes et son apparence, langues), `modele/` (le point de départ de tout nouveau deck), `tools/check-decks.py`, `README.md`, `MANUEL.md`, `CNAME`. Elle définit les commandes et l'allure de la barre de tous les decks. **Seule la session « DECK HOME » la modifie.**
- **Les decks** (`als/`, `how/`, `biw/`, `tdp/`, `mag/`, `tot/`, `cbm/`) : ils viennent se glisser sous l'interface. Ce sont des copies publiées. Leur source est ailleurs : ALS dans `~/Projects/als-century-of-exchange`, BIX (dossier `biw/`) dans `~/Projects/bixter`, TDP dans `~/Projects/tour-des-possibles`, MAG dans `~/Projects/magnetic-deck`, TOT dans `~/Projects/totalenergies-deck`, CBM dans `~/Projects/cbm-chalet-disco`, HOW dans `~/HOW-sources` (gabarit et outils ; `how/engine.js` et `how/styles.css` se modifient ici). Une demande sur le contenu d'un deck se traite dans la source de ce deck, pas ici.

## Règles
1. `git pull --ff-only` avant de commencer. Ajouter les fichiers par chemin (`git add shared index.html`, `git add als`), jamais `git add -A` : plusieurs sessions travaillent dans cette même copie.
2. Ne pas changer de branche dans `~/Projects/deck-presentation`. Pour une branche, utiliser `git worktree add <dossier temporaire>`.
3. Barre de commandes : exactement 5 commandes (plein écran F, début R, vignettes O/Échap, langue si 2 langues ou plus, PDF). Aucun bouton ni raccourci propre à un deck. Un deck ne redessine pas la barre : il la teinte seulement (`--hud-ink`, `--hud-accent`, `--hud-shade`).
3 bis. **Un nouveau deck part de `modele/`** (lire `modele/README.md`). Avant de publier un deck, `python3 tools/check-decks.py <code>` doit afficher OK.
3 ter. **Une session de deck ne modifie pas `shared/`.** Si un deck a besoin d'une fonction commune nouvelle, la demander à la session « DECK HOME », qui l'ajoute pour tous les decks.
4. Si un changement de `shared/` modifie le contrat HTML, reporter le même changement dans la source de chaque deck. Sinon, la prochaine publication du deck défait le changement.
5. Ne jamais publier les notes du présentateur ni les phrases sous arbitrage. Passer par les outils de publication des decks.
6. Demander à la personne avant de pousser, publier un deck, changer un code d'accès (`GATE`) ou modifier la visibilité d'un dépôt.
7. Après publication, vérifier en ligne (MANUEL.md §6.5) : tout en `200`, pas d'erreur dans la console.
8. Parler simplement : le propriétaire est designer.

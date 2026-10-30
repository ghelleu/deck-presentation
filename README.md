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
3. Ajouter une ligne dans la liste de `index.html` à la racine :
   ```html
   <li><a href="/mon-deck/"><span class="titre">Mon deck</span><span class="meta">2026</span></a></li>
   ```
4. Pousser sur `main`. GitHub Pages reconstruit en une minute environ.

Le fichier `.nojekyll` est présent : les dossiers dont le nom commence par un souligné sont servis tels quels, sans transformation Jekyll.

## Vérifier après un changement

```bash
curl -sI https://deck-presentation.com/ | head -3
curl -s https://deck-presentation.com/mon-deck/ | head -5
```

Le domaine répond aussi en `www.deck-presentation.com`.

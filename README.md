# annickbouvattier — site web

Site statique (HTML/CSS/JS, sans framework ni étape de build) : `index`, `portfolio`, `galeries`,
`expositions`, `apropos`, `presse`, `contact`, `404`. Style commun dans `styles.css`, police Inter
hébergée dans `fonts/`.

## D'où viennent les données

| Contenu | Source |
|---|---|
| **Portfolio** | Google Sheet publié en CSV (URL dans `portfolio.html`, constante `SHEET_CSV_URL`). Colonnes lues : `Nom`, `Catégorie`, `Technique`, `Format`, `Disponible`, `Jpg`, `Disponible où ?`. |
| **Mur de l'accueil** | `images/manifest.json` : liste des noms de fichiers à afficher. |
| **Galeries** | tableau `galleries` dans `script.js` |
| **Expositions** | tableau `expos` dans `expositions.html` |

## Ajouter une œuvre

1. Déposer le JPG dans `images/` (le nom de fichier doit être **identique, casse comprise**, à la colonne `Jpg` du Sheet — GitHub Pages distingue majuscules et minuscules).
2. Générer les miniatures : `python3 scripts/make-thumbs.py` (macOS). Elles vont dans `images/thumbs/`.
3. Ajouter la ligne dans le Google Sheet.
4. (Optionnel) l'ajouter à `images/manifest.json` pour l'afficher sur l'accueil.
5. Commit + push.

Sans miniature, le site retombe sur l'image d'origine (plus lourde, mais elle s'affiche).

## Notes

- `mentions-legales.html` : éditeur, hébergeur (GitHub Pages), données personnelles. À mettre à jour si l'hébergement, l'adresse ou les services tiers (Google Sheets, Formspree, Leaflet/OSM) changent.
- Le workflow `.github/workflows/notion.yml` est désactivé (voir le commentaire en tête du fichier).
- Le curseur personnalisé est désactivé dans `styles.css` (voir le commentaire).

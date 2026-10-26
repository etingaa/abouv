# annickbouvattier — site web

Site statique (HTML/CSS/JS, sans framework ni étape de build) : `index` (accueil : galerie 3D), `classique`
(classique : accueil sans 3D, repli automatique), `portfolio`, `galeries`, `expositions`, `apropos` (avec la presse ; `presse.html` redirige), `contact`, `404`. Style commun dans `styles.css`, police Archivo
hébergée dans `fonts/`.

## D'où viennent les données

| Contenu | Source |
|---|---|
| **Portfolio** | Google Sheet publié en CSV (URL et lecture dans `sheet.js`, constante `SHEET_CSV_URL`). Colonnes lues : `Nom`, `Catégorie`, `Technique`, `Format`, `Disponible`, `Jpg`, `Disponible où ?`. |
| **Galerie 3D** (`index.html`, `galerie.js`, `galerie.css`) | Même Sheet : seulement les œuvres **disponibles** (pas les sculptures), accrochées à leur taille réelle d'après la colonne `Format` (largeur × hauteur en cm). Une ligne sans format lisible est ignorée (message dans la console). |
| **Livre de l'accueil classique** (`classique.html`) | Même Sheet : toutes les œuvres, sauf celles avec « non » dans la colonne `Accueil`. Secours : `images/manifest.json`, utilisé seulement si le Sheet est injoignable. |
| **Galeries** | tableau `galleries` dans `script.js` |
| **Expositions** | tableau `expos` dans `expositions.html` |

## Ajouter une œuvre

1. Déposer le JPG dans `images/` (le nom de fichier doit être **identique, casse comprise**, à la colonne `Jpg` du Sheet — GitHub Pages distingue majuscules et minuscules).
2. Générer les miniatures : `python3 scripts/make-thumbs.py` (macOS). Elles vont dans `images/thumbs/`.
3. Ajouter la ligne dans le Google Sheet.
4. Elle apparaît aussi sur le mur de l'accueil, sauf si la colonne `Accueil` vaut « non ».
5. Commit + push.

Sans miniature, le site retombe sur l'image d'origine (plus lourde, mais elle s'affiche).

## Galerie 3D

- Three.js est chargé depuis jsDelivr (version épinglée 0.170.0, voir l'`importmap` d'`index.html`).
- Repli automatique vers `classique.html` : pas de WebGL, « mouvement réduit » activé dans le système,
  ou galerie pas prête en 10 secondes. Ajouter `?debug` à l'adresse désactive le repli (pour tester).
- Le décor (murs, sol, plafond, rails) est construit dans `buildRoom()` (`galerie.js`), séparé de l'accrochage :
  c'est la seule fonction à remplacer pour passer à un modèle `.glb` ou à un monde Gaussian splat.
- **Images HD (facultatif)** : déposer une version haute définition dans `images/hd/` avec **le même nom** que dans
  `images/`, puis l'ajouter à la liste `images/hd/list.json` (ex. `["ALaPointe.jpg", "DressCode.jpg"]`).
  La galerie ne charge la HD que pour l'œuvre regardée et ses deux voisines ; sans HD, elle garde la vignette.

## Version anglaise (FR / EN)

Une seule copie de chaque page : les pages sont écrites en français et `i18n.js` les traduit en anglais
à l'affichage. Toute modification de mise en page ou de style vaut donc pour les deux langues.

- **Choix de la langue** : menu « FR ▾ » ajouté automatiquement à droite du header (et « fra / eng » en bas du menu téléphone) ; choix mémorisé.
  Sans choix, un navigateur en français voit le site en français, les autres en anglais.
  Lien direct vers une langue : `portfolio.html?lang=en`.
- **Ajouter ou modifier un texte** : l'écrire en français dans la page, puis ajouter la ligne
  `"texte français exact": "English text",` dans le dictionnaire `EN` d'`i18n.js`.
  Un texte sans traduction reste en français ; la console du navigateur liste ceux qui manquent.
- **Textes longs** (biographie, mentions légales) : deux blocs côte à côte dans la page,
  `<div data-lang="fr">…</div>` et `<div data-lang="en">…</div>`.
- **Dans les scripts** : `t("texte français")` renvoie la traduction de la langue active.
- **Google Sheet** : les valeurs des colonnes Catégorie, Technique et « Disponible où ? » sont traduites
  via le même dictionnaire. Une nouvelle catégorie dans le Sheet = une ligne à ajouter dans `i18n.js`.

## Notes

- `mentions-legales.html` : éditeur, hébergeur (GitHub Pages), données personnelles. À mettre à jour si l'hébergement, l'adresse ou les services tiers (Google Sheets, Formspree, Leaflet/OSM) changent.
- Le workflow `.github/workflows/notion.yml` est désactivé (voir le commentaire en tête du fichier).
- Le curseur personnalisé est désactivé dans `styles.css` (voir le commentaire).

## Référencement (SEO) : pages des œuvres, sitemap

Après avoir ajouté ou modifié une œuvre dans le Google Sheet (ou une galerie dans `script.js`, une exposition dans `expos-data.js`) :

```sh
python3 scripts/make-thumbs.py   # miniatures (si de nouvelles images ont été ajoutées dans images/)
node scripts/build-seo.mjs       # pages oeuvres/<slug>.html, sitemap.xml, robots.txt, balises de partage
```

Un clic sur une œuvre du portfolio ouvre sa page `oeuvres/<slug>` ; le retour (bouton du navigateur ou « ← Portfolio »)
retrouve les filtres, la recherche et la position (sessionStorage, `portfolio.html` et `oeuvre.js`).

Le script relit le Sheet (copie dans `data/sheet.csv`) et réécrit tout ce qui se trouve entre les commentaires
`<!-- seo:… -->` des pages. L'adresse publique du site (`SITE_URL`) et l'image de partage par défaut
(`DEFAULT_OG_IMAGE`) se règlent en haut de `scripts/build-seo.mjs`. Les liens du site restent relatifs :
il fonctionne aussi bien sous `/abouv/` qu'à la racine du domaine.

## Adresses propres (sans « .html »)

Les liens du site n'ont pas d'extension : `portfolio`, `oeuvres/enigma`, `./` pour l'accueil. GitHub Pages sert
`portfolio.html` à l'adresse `/portfolio` ; sur un hébergement Apache (Hostinger), c'est le fichier `.htaccess` qui le fait
(et qui redirige `/index`, `/accueil`, `/x.html` vers les adresses propres). Si on arrive quand même sur une adresse en
`.html` ou `/index`, `site.js` la réécrit dans la barre d'adresse. `accueil.html` renvoie vers l'accueil.

Aperçu local (comme GitHub Pages) :  `node scripts/serve.mjs`  puis http://localhost:8000/

## Langues

Français (langue des pages), anglais, espagnol et italien. Les textes courts sont traduits par dictionnaire :
anglais dans `i18n.js` (EN), espagnol et italien dans `i18n-langs.js` (ES, IT) — même clé : le texte français exact.
Les textes longs (biographie, questions fréquentes, mentions légales, présentation de l'accueil) sont écrits dans
les pages en blocs `data-lang="fr|en|es|it"`. Les descriptions des pages d'œuvres sont générées dans les 4 langues
par `scripts/build-seo.mjs`. La langue suit le navigateur du visiteur, puis son choix (menu FR ▾).

// i18n.js — version anglaise du site, sans dupliquer les pages.
//
// Principe : les pages restent écrites en français. En anglais, ce script remplace chaque texte
// français par sa traduction trouvée dans le dictionnaire EN ci-dessous (texte, alt, placeholder,
// aria-label, title, description…). Toute modification de mise en page vaut donc pour les 2 langues.
//
// Ajouter / modifier un texte :
//   1. l'écrire en français dans la page, comme d'habitude ;
//   2. ajouter ici la ligne  "texte français exact": "English text",
//   Un texte sans traduction reste en français (et est signalé dans la console du navigateur).
//
// Textes longs (biographie, mentions légales) : écrits dans la page en 2 blocs côte à côte,
//   <div data-lang="fr">…</div>  et  <div data-lang="en">…</div>  — seul le bon bloc est affiché.
//
// Dans les scripts des pages : t("texte français") renvoie la traduction de la langue active.
// Un même mot français qui se traduit de 2 façons prend un contexte : t("statut|Disponible").
//
// Chargé dans le <head> de chaque page (avant les autres scripts).

(() => {
  "use strict";

  const EN = {
    /* ---------- Commun : titre, menu, pied de page ---------- */
    "Navigation principale": "Main navigation",
    "Accueil": "Home",
    "Galeries": "Galleries",
    "Expositions": "Exhibitions",
    "À propos": "About",
    "Presse": "Press",
    "mentions légales": "legal notice",
    "Mentions légales": "Legal notice",
    "retour à l'accueil": "back to home",
    "Fermer": "Close",
    "Rechercher": "Search",
    "Filtres": "Filters",
    "Pays": "Country",
    "Langue": "Language",
    "Menu": "Menu",
    // identiques en anglais
    "Portfolio": "Portfolio", "Contact": "Contact", "Email": "Email", "Message": "Message",
    "Reset": "Reset", "Type": "Type", "Technique": "Technique", "Portrait": "Portrait",
    "Nature": "Nature", "Sculpture": "Sculpture", "Portfolio — Annick Bouvattier": "Portfolio — Annick Bouvattier",
    "Contact — Annick Bouvattier": "Contact — Annick Bouvattier",

    /* ---------- Titres d'onglet et descriptions (moteurs de recherche) ---------- */
    "Annick Bouvattier — Artiste peintre": "Annick Bouvattier — Painter",
    "Annick Bouvattier — artiste peintre": "Annick Bouvattier — painter",
    "Annick Bouvattier, artiste peintre : peintures à l'huile et portraits de femmes, en jeux d'ombre et de lumière.":
      "Annick Bouvattier, painter: oil paintings and portraits of women, in plays of light and shadow.",
    "À propos — Annick Bouvattier": "About — Annick Bouvattier",
    "Biographie d'Annick Bouvattier, artiste peintre : de la mode et du cinéma à la peinture à l'huile au couteau.":
      "Biography of Annick Bouvattier, painter: from fashion and film to palette-knife oil painting.",
    "Galeries — Annick Bouvattier": "Galleries — Annick Bouvattier",
    "Les galeries qui présentent le travail d'Annick Bouvattier, en France et aux États-Unis.":
      "The galleries showing Annick Bouvattier's work, in France and the United States.",
    "Portfolio d'Annick Bouvattier : peintures à l'huile et sculptures, à filtrer par catégorie, technique, format et disponibilité.":
      "Annick Bouvattier's portfolio: oil paintings and sculptures, filterable by category, technique, size and availability.",
    "Expositions — Annick Bouvattier": "Exhibitions — Annick Bouvattier",
    "Expositions personnelles, collectives et salons d'Annick Bouvattier depuis 1992.":
      "Solo shows, group shows and art fairs by Annick Bouvattier since 1992.",
    "Presse — Annick Bouvattier": "Press — Annick Bouvattier",
    "Parutions presse : Annick Bouvattier dans le magazine « Artistes », mai/juin 2019.":
      "Press: Annick Bouvattier in “Artistes” magazine, May/June 2019.",
    "Contacter Annick Bouvattier : renseignement sur une œuvre, une exposition ou une commande.":
      "Contact Annick Bouvattier: enquiries about an artwork, an exhibition or a commission.",
    "Mentions légales — Annick Bouvattier": "Legal notice — Annick Bouvattier",
    "Mentions légales du site d'Annick Bouvattier : éditeur, hébergeur, propriété intellectuelle, données personnelles.":
      "Legal notice for Annick Bouvattier's website: publisher, host, intellectual property, personal data.",
    "Page introuvable — Annick Bouvattier": "Page not found — Annick Bouvattier",

    /* ---------- À propos ---------- */
    "Biographie": "Biography",
    "Photo atelier": "Studio photo",
    "Annick Bouvattier en atelier": "Annick Bouvattier in her studio",

    /* ---------- Galeries ---------- */
    "Carte des galeries": "Map of the galleries",
    "Liste des galeries": "List of the galleries",
    "Nom, ville, pays…": "Name, city, country…",
    "galerie": "gallery",
    "galeries": "galleries",
    "site": "website",
    "itinéraire": "directions",
    "La carte n'a pas pu être chargée. La liste des galeries reste disponible.":
      "The map could not be loaded. The list of galleries is still available.",

    /* ---------- Portfolio ---------- */
    "Rechercher une œuvre…": "Search artworks…",
    "Rechercher une œuvre": "Search artworks",
    "Catégorie": "Category",
    "Collection": "Collection",
    "Format": "Size",
    "Disponibilité": "Availability",       // onglet de filtre (portfolio)
    "statut|Disponible": "Available",
    "statut|Vendue": "Sold",
    "DISPONIBLE": "AVAILABLE",
    "VENDUE": "SOLD",
    "Tout effacer": "Clear all",
    "Chargement…": "Loading…",
    "Œuvres": "Artworks",
    "œuvre": "artwork",
    "œuvres": "artworks",
    "Œuvre précédente": "Previous artwork",
    "Œuvre suivante": "Next artwork",
    "Ouvrir l'œuvre": "Open artwork",
    "Retirer": "Remove",
    "Demander des informations": "Request information",
    "Carré": "Square",
    "Paysage": "Landscape",
    "Autre": "Other",
    "Aucune œuvre ne correspond à ces filtres.": "No artwork matches these filters.",
    "Impossible de charger les œuvres pour le moment. Vérifiez votre connexion, puis":
      "The artworks can't be loaded right now. Check your connection, then",
    "actualisez la page": "reload the page",
    // valeurs du Google Sheet (colonnes Catégorie, Technique, Disponible où ?)
    "Féminitude": "Femininity",
    "Close up": "Close-up",
    "Intérieur": "Interiors",
    "Danseuses": "Dancers",
    "Commandes": "Commissions",
    "Dans les villes": "In the city",
    "Tryptique": "Triptych",
    "Huile sur Toile": "Oil on canvas",
    "Scultpure": "Sculpture",
    "Atelier": "Artist's studio",

    /* ---------- Expositions ---------- */
    "En ce moment": "Now showing",
    "Voir les infos": "More info",
    "Galerie, ville, pays…": "Gallery, city, country…",
    "Tous": "All",
    "Toutes": "All",
    "Personnelle": "Solo",
    "Collective": "Group",
    "Salon / Art fair": "Art fair",
    "Année": "Year",
    "Réinitialiser": "Reset",
    "Aucune exposition ne correspond aux filtres.": "No exhibition matches these filters.",
    "exposition": "exhibition",
    "expositions": "exhibitions",
    "États-Unis": "United States",
    "Belgique": "Belgium",
    "Suisse": "Switzerland",
    "Angleterre": "England",
    "Bruxelles": "Brussels",
    "Londres": "London",
    "Anvers": "Antwerp",

    /* ---------- Presse ---------- */
    "Ouvrir le PDF en visualiseur": "Open the PDF viewer",
    "Dossier de presse — Annick Bouvattier": "Press feature — Annick Bouvattier",
    "Parution dans le magazine \"Artistes\"": "Featured in “Artistes” magazine",
    "Magazine \"Artistes\" — Mai/Juin 2019": "“Artistes” magazine — May/June 2019",
    "Mai/Juin 2019": "May/June 2019",
    "Lire le PDF": "Read the PDF",
    "Télécharger": "Download",
    "Ouvrir": "Open",
    "Ouvrir le PDF": "Open the PDF",
    "Aperçu du PDF": "PDF preview",
    "L'aperçu n'est pas disponible sur cet appareil.": "Preview isn't available on this device.",

    /* ---------- Contact ---------- */
    "Écrivez-moi ici, je vous réponds dès que possible.": "Write to me here, I'll get back to you as soon as possible.",
    "Formulaire de contact": "Contact form",
    "Prénom": "First name",
    "Nom": "Last name",
    "Organisation": "Organization",
    "Envoyer": "Send",
    "Les informations saisies servent uniquement à répondre à votre demande.":
      "The information you enter is only used to reply to your request.",
    "En savoir plus": "Learn more",
    "Merci, votre message a bien été envoyé. Je vous réponds dès que possible.":
      "Thank you, your message has been sent. I'll get back to you as soon as possible.",
    "Bonjour,\n\nJe souhaiterais avoir des informations sur l'œuvre « {oeuvre} ».\n\nMerci,":
      "Hello,\n\nI would like some information about the artwork “{oeuvre}”.\n\nThank you,",

    /* ---------- Page 404 ---------- */
    "Page introuvable": "Page not found",
    "Cette page n'existe pas ou a été déplacée.": "This page doesn't exist or has been moved.",
    "Retour à l'accueil": "Back to home",
    "Voir le portfolio": "View the portfolio",
  };

  /* =========================
     Langue active
     ========================= */

  const STORE_KEY = "abouv:lang";
  const LANGS = ["fr", "en"];

  function readStored(){
    try { return localStorage.getItem(STORE_KEY); } catch (_) { return null; }
  }
  function store(lang){
    try { localStorage.setItem(STORE_KEY, lang); } catch (_) {}
  }

  function detect(){
    // 1. lien explicite : page.html?lang=en
    const param = new URLSearchParams(location.search).get("lang");
    if (LANGS.includes(param)) { store(param); return param; }
    // 2. choix mémorisé
    const saved = readStored();
    if (LANGS.includes(saved)) return saved;
    // 3. moteurs de recherche : toujours la version française (celle qui est référencée)
    if (/bot|crawl|spider|slurp|facebookexternalhit/i.test(navigator.userAgent)) return "fr";
    // 4. langue du navigateur : français si le visiteur lit le français, sinon anglais
    const prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "fr"];
    return prefs.some(l => /^fr\b/i.test(l)) ? "fr" : "en";
  }

  const lang = detect();
  const root = document.documentElement;
  root.lang = lang;

  // Blocs bilingues + page masquée le temps de la traduction (anglais uniquement, quelques ms)
  const css = document.createElement("style");
  css.textContent =
    'html:not([lang="en"]) [data-lang="en"], html[lang="en"] [data-lang="fr"]{display:none !important}' +
    "html.i18n-wait body{visibility:hidden}";
  document.head.appendChild(css);
  if (lang === "en") {
    root.classList.add("i18n-wait");
    setTimeout(() => root.classList.remove("i18n-wait"), 1500); // filet de sécurité
  }

  /* =========================
     Traduction
     ========================= */

  const missing = new Set();

  // t("texte français", { n: 3 }) -> texte dans la langue active
  function t(fr, vars){
    let out;
    if (lang === "en" && Object.prototype.hasOwnProperty.call(EN, fr)) {
      out = EN[fr];
    } else {
      if (lang === "en" && /[a-zà-ÿ]/i.test(fr)) missing.add(fr);
      out = fr.includes("|") ? fr.slice(fr.indexOf("|") + 1) : fr; // "statut|Disponible" -> "Disponible"
    }
    if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    return out;
  }

  // Remplace un texte s'il est dans le dictionnaire (en gardant les espaces autour)
  function swap(str){
    const key = str.replace(/\s+/g, " ").trim();
    if (!key) return str;
    if (Object.prototype.hasOwnProperty.call(EN, key)) {
      const lead = str.match(/^\s*/)[0], tail = str.match(/\s*$/)[0];
      return lead + EN[key] + tail;
    }
    if (/[a-zà-ÿ]{2}/i.test(key)) missing.add(key);
    return str;
  }

  const ATTRS = ["alt", "placeholder", "aria-label", "title", "data-title"];
  const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA"]);

  function translateTree(el){
    if (SKIP.has(el.tagName) || el.dataset.lang) return;
    ATTRS.forEach(a => { if (el.hasAttribute(a)) el.setAttribute(a, swap(el.getAttribute(a))); });
    // translate="no" : contenu généré par un script (déjà traduit avec t()) ou noms propres
    if (el.getAttribute("translate") === "no") return;
    el.childNodes.forEach(n => {
      if (n.nodeType === 3) n.nodeValue = swap(n.nodeValue);
      else if (n.nodeType === 1) translateTree(n);
    });
  }

  function translatePage(){
    document.title = swap(document.title);
    document.querySelectorAll('meta[name="description"], meta[property="og:title"], meta[property="og:description"]')
      .forEach(m => m.setAttribute("content", swap(m.getAttribute("content") || "")));
    const og = document.querySelector('meta[property="og:locale"]');
    if (og) og.setAttribute("content", "en_US");
    translateTree(document.body);
  }

  /* =========================
     Sélecteur de langue : menu déroulant « FR ▾ » dans le pied de page,
     juste à droite du lien « mentions légales », à la même taille
     ========================= */

  const NAMES = { fr: "Français", en: "English" };
  const SHORT = { fr: "fra", en: "eng" };

  function switchTo(l){
    if (l === lang) return;
    store(l);
    const url = new URL(location.href);
    url.searchParams.delete("lang");
    location.replace(url.href);
  }

  function addSwitch(){
    const footer = document.querySelector("footer.bottom");
    if (!footer) return;
    const legal = footer.lastElementChild; // « mentions légales » (ou « retour à l'accueil »)
    if (!legal) return;

    const box = document.createElement("span");
    box.className = "langMenu";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "langMenu__btn";
    btn.setAttribute("aria-haspopup", "true");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-label", t("Langue") + " : " + NAMES[lang]);
    btn.innerHTML = SHORT[lang] +
      '<svg class="langMenu__caret" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4"/></svg>';

    const list = document.createElement("div");
    list.className = "langMenu__list";
    list.hidden = true;
    LANGS.forEach(l => {
      const o = document.createElement("button");
      o.type = "button";
      o.className = "langMenu__opt";
      o.lang = l;
      o.textContent = SHORT[l];
      o.setAttribute("aria-label", NAMES[l]);
      if (l === lang) o.setAttribute("aria-current", "true");
      o.addEventListener("click", () => switchTo(l));
      list.appendChild(o);
    });

    const setOpen = (open) => {
      list.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
    };
    btn.addEventListener("click", (e) => { e.stopPropagation(); setOpen(list.hidden); });
    document.addEventListener("click", () => setOpen(false));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !list.hidden) { setOpen(false); btn.focus(); }
    });

    box.append(btn, list);

    // lien + menu regroupés, pour que le menu reste collé au lien
    const pair = document.createElement("span");
    pair.className = "langPair";
    legal.replaceWith(pair);
    pair.append(legal, box);
    // même taille et même couleur que le lien : styles.css (.langMenu__btn)
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (lang === "en") translatePage();
    addSwitch();
    root.classList.remove("i18n-wait");
    if (missing.size) console.info("[i18n] textes sans traduction anglaise :", [...missing]);
  });

  window.I18N = { lang, t };
  window.t = t;
})();

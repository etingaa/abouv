// i18n.js — versions anglaise, espagnole et italienne du site, sans dupliquer les pages.
//
// Principe : les pages restent écrites en français. En anglais, ce script remplace chaque texte
// français par sa traduction trouvée dans le dictionnaire EN ci-dessous (texte, alt, placeholder,
// aria-label, title, description…). Toute modification de mise en page vaut donc pour les 2 langues.
//
// Ajouter / modifier un texte :
//   1. l'écrire en français dans la page, comme d'habitude ;
//   2. ajouter la ligne  "texte français exact": "traduction",  dans EN (anglais), puis dans ES (espagnol)
//      et IT (italien) — fichier i18n-langs.js. Un texte absent de ES ou IT s'affiche en anglais.
//   Un texte sans traduction reste en français (et est signalé dans la console du navigateur).
//
// Textes longs (biographie, mentions légales) : écrits dans la page en 2 blocs côte à côte,
//   <div data-lang="fr">…</div>, <div data-lang="en">…</div>, <div data-lang="es">…</div>, <div data-lang="it">…</div>
//   — seul le bloc de la langue active est affiché (à défaut, le bloc anglais).
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
    "Rechercher parmi": "Search",          // « Rechercher parmi 117 œuvres »
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
    "Repères": "At a glance",
    "Ville natale": "Birthplace",
    "Huile au couteau": "Palette-knife oil",
    "Lissée, en transparence": "Smooth, in transparent layers",
    "Depuis": "Since",
    "5 galeries": "5 galleries",
    "France et États-Unis": "France and United States",
    "Voir les œuvres": "See the works",
    "Écrire à l'artiste": "Write to the artist",
    "Questions fréquentes": "Frequently asked questions",
    "Où voir les œuvres": "Where to see the work",
    "Toutes les expositions": "All exhibitions",
    "Période": "Period",
    "Ligne du temps": "Timeline",
    "Carte": "Map",
    "Affichage": "View",
    "Carte des expositions": "Exhibitions map",
    "Voir sur la ligne du temps": "See on the timeline",
    "La carte n'a pas pu être chargée.": "The map could not be loaded.",
    "Années": "",                          // « Années 1990 » -> « 1990s » (voir expositions.html)
    "— au-dessus de la ligne": "— above the line",
    "Plus ancien": "Earlier",
    "Plus récent": "Later",
    "Parcourir la ligne du temps": "Browse the timeline",
    "Ligne du temps des expositions": "Exhibition timeline",
    "Rechercher une exposition": "Search exhibitions",
    "Faites glisser la ligne du temps, ou utilisez le curseur.": "Drag the timeline, or use the slider.",
    "Parutions": "Publications",
    "Écrire un message": "Send a message",
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
    "Site": "Website",
    "Itinéraire": "Directions",
    "Appeler": "Call",
    "Ville": "City",
    "ici depuis": "here since",
    "ici en": "here in",
    "Rechercher une galerie": "Search galleries",
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
    "Passer": "Skip",
    "Toiles disponibles": "Available paintings",
    "Artiste peintre": "Painter",
    "Avancer ou reculer dans la visite": "Move forward or back in the tour",
    "Le message n'a pas pu être envoyé. Réessayez dans un instant, ou écrivez directement à abouvattier@free.fr.": "Your message could not be sent. Please try again in a moment, or write directly to abouvattier@free.fr.",
    "Ou directement par e-mail": "Or directly by email",
    "ou via mes réseaux": "or through my social media",
    "Merci": "Thank you",
    "Merci — Annick Bouvattier": "Thank you — Annick Bouvattier",
    "{prenom}, votre message a bien été envoyé. Annick Bouvattier vous répondra dès que possible.": "{prenom}, your message has been sent. Annick Bouvattier will reply as soon as possible.",
    "Votre message a bien été envoyé. Annick Bouvattier vous répondra dès que possible.": "Your message has been sent. Annick Bouvattier will reply as soon as possible.",
    "Voir l'œuvre": "View the work",
    "Écrire à l’artiste": "Write to the artist",
    "Je vous écris au sujet de": "I am writing about",
    "À l’attention d’Annick Bouvattier": "For the attention of Annick Bouvattier",
    "Bonjour,": "Hello,",
    "Je m’appelle": "My name is",
    "et vous pouvez me répondre à l’adresse": "and you can reply to me at",
    "E-mail": "Email",
    "Je vous écris au sujet": "I am writing about",
    "d’une acquisition": "buying a work",
    "d’une commande": "a commission",
    "de la presse": "the press",
    "d’autre chose": "something else",
    "ou": "or",
    "P.-S. — j’écris de la part de": "P.S. — I am writing on behalf of",
    ", depuis": ", from",
    "Bien à vous,": "Kind regards,",
    "Envoyer la lettre": "Send the letter",
    "Bonjour, je m’appelle": "Hello, my name is",
    "prénom": "first name",
    "nom": "last name",
    "vous pouvez me répondre à": "you can reply to me at",
    "votre e-mail": "your email",
    "Je vous écris pour": "I am writing about",
    "une acquisition": "buying a work",
    "une commande": "a commission",
    "la presse": "the press",
    "autre chose": "something else",
    "Votre message…": "Your message…",
    "Ajouter une organisation ou un pays": "Add an organization or a country",
    "votre organisation": "your organization",
    "votre pays": "your country",
    "Ou directement": "Or directly",
    "Page": "Page",
    "Page précédente": "Previous page",
    "Page suivante": "Next page",
    "exposition personnelle": "solo exhibition",
    "Vue d'ensemble": "Overview",
    "Unité": "Unit",
    "Voir tout le portfolio": "See the whole portfolio",
    "Informations": "Details",              // flèche sous la toile (page d'une œuvre, téléphone)
    "Disponible": "Available",
    "Vendue": "Sold",
    "Où la voir": "Where to see it",
    "Autres œuvres": "Other works",
    "Mettre en pause": "Pause",
    "Reprendre la visite": "Resume the tour",
    "Ralentir": "Slower",
    "Accélérer": "Faster",
    "Visite": "Tour",
    "Version claire": "Light version",
    "Version sombre": "Dark version",
    "Filtrer par": "Filter by",
    "Annick Bouvattier dans son atelier": "Annick Bouvattier in her studio",
    "L’artiste": "The artist",
    "Écrire →": "Write →",
    "Annick Bouvattier · Atelier": "Annick Bouvattier · Studio",
    "Écrire directement": "Write directly",
    "Mai / Juin 2019": "May / June 2019",
    "Dossier « Savoir-faire » consacré à la peinture d’Annick Bouvattier.": "“Savoir-faire” feature on Annick Bouvattier’s painting.",
    "Lire ↗": "Read ↗",
    "Télécharger ↓": "Download ↓",
    "Contact presse — entretien, visuels en haute définition, exposition": "Press contact — interview, high-resolution images, exhibition",
    "Le couteau": "The knife",
    "La lumière": "The light",
    "Retirer ce filtre": "Remove this filter",
    "depuis": "since",
    "en": "in",
    "et": "and",
    "personnelles": "solo",
    "personnelle": "solo",
    "collectives": "group",
    "collective": "group",
    "salons": "art fairs",
    "salon": "art fair",
    "pays": "countries",
    "Expositions par année": "Exhibitions per year",
    "Personnelles": "Solo",
    "Collectives": "Group",
    "Salons": "Art fairs",
    "Écrivez-moi pour parler d’une œuvre, d’une commande ou d’un projet.": "Write to me about a painting, a commission or a project.",
    "(choisissez ce qui vous amène)": "(pick what brings you here)",
    "Pas encore sûr ?": "Not sure yet?",
    "Écrire un e-mail": "Send an email",
    "Une œuvre, une commande, une date…": "A painting, a commission, a date…",
    "vous@exemple.fr": "you@example.com",
    "Écrire ici": "Write here",
    "Voir": "View",
    "Adresses": "Addresses",
    "Annick Bouvattier peint des femmes, dans des jeux d’ombres et de lumière.": "Annick Bouvattier paints women, in plays of light and shadow.",
    "Parcours": "Background",
    "Questions": "Questions",
    "Annick Bouvattier dans la presse.": "Annick Bouvattier in the press.",
    "Parutions": "Publications",
    "Mai 2019": "May 2019",
    "Dossier « Savoir-faire » : réussir à sublimer la féminité.": "“Savoir-faire” feature: succeeding in sublimating femininity.",
    "Lire": "Read",
    "Contact presse": "Press contact",
    "Interview": "Interview",
    "Entretien, visuels en haute définition, exposition": "Interviews, high-resolution images, exhibitions",
    "Écrire": "Write",
    "« Elles vivent leur féminité sans fausse pudeur, indifférentes aux regards extérieurs. »": "“They live their femininity without false modesty, indifferent to the gaze of others.”",
    "« Réussir à sublimer la féminité »": "“Succeeding in sublimating femininity”",
    "Écrire à l'artiste": "Write to the artist",
    "Une œuvre, une commande, un article : je vous réponds dès que possible.": "A painting, a commission, an article: I will reply as soon as possible.",
    "Artiste-peintre": "Painter",
    "Voir dans le portfolio": "View in the portfolio",
    "Faites glisser pour regarder autour de vous · cliquez sur le parquet pour vous déplacer · survolez une toile": "Drag to look around · click the floor to move · hover a painting",
    "Visite automatique · faites glisser pour regarder autour de vous, touchez une toile ou le parquet pour y aller": "Automatic tour · drag to look around, tap a painting or the floor to go there",
    "Mettre la visite en pause": "Pause the tour",
    "Reprendre la visite": "Resume the tour",
    "Dix toiles disponibles, choisies au hasard, accrochées à leur taille réelle.": "Ten available paintings, chosen at random, hung at their actual size.",
    "Faites glisser pour regarder autour de vous · touchez une toile pour vous en approcher": "Drag to look around · tap a painting to step closer",
    "Une promenade parmi les toiles disponibles, accrochées à leur taille réelle.": "A walk among the available paintings, hung at their actual size.",
    "Chargement des œuvres": "Loading the works",
    "Entrer dans la galerie": "Enter the gallery",
    "Prix sur demande": "Price on request",
    "Acquérir cette œuvre": "Acquire this work",
    "Œuvres de la galerie": "Works in the gallery",
    "Annick Bouvattier — galerie virtuelle": "Annick Bouvattier — virtual gallery",
    "Annick Bouvattier, artiste peintre : promenez-vous dans une galerie virtuelle parmi ses toiles disponibles, accrochées à leur taille réelle.":
      "Annick Bouvattier, painter: stroll through a virtual gallery among her available paintings, hung at their actual size.",
    "Bonjour, je suis intéressé(e) par l'œuvre « {oeuvre} »{details}. Pourriez-vous m'indiquer son prix et les modalités d'acquisition ?":
      "Hello, I am interested in the work “{oeuvre}”{details}. Could you tell me its price and the terms of purchase?",
    "Œuvre précédente": "Previous artwork",
    "Œuvre suivante": "Next artwork",
    "Ouvrir l'œuvre": "Open artwork",
    "Retirer": "Remove",
    "Peintures": "Paintings",
    "Peintures à l'huile": "Oil paintings",
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
    "atelier": "artist's studio",

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
    "Magazine · Mai/Juin 2019": "Magazine · May/June 2019",
    "Parution dans le magazine « Artistes »": "Featured in “Artistes” magazine",
    "Un dossier « Savoir-faire » consacré à la peinture d'Annick Bouvattier : réussir à sublimer la féminité.": "A “Savoir-faire” feature on Annick Bouvattier's painting: capturing femininity at its most sublime.",
    "Couverture du magazine « Artistes », mai/juin 2019": "Cover of “Artistes” magazine, May/June 2019",
    "Ressources": "Resources",
    "Interview, visuels": "Interviews, images",
    "Parcours et technique": "Career and technique",
    "parution": "publication",
    "parutions": "publications",
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
    "Sujet": "Subject",
    "Acquisition": "Purchase",
    "Commande": "Commission",
    "Autre": "Other",
    "(facultatif)": "(optional)",
    "Ailleurs": "Elsewhere",
    "Œuvres en ligne": "Works online",
    "Voir les tableaux en vrai": "See the paintings in person",
    "Acquisition, commandes, presse": "Buying, commissions, press",
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
  const LANGS = ["fr", "en", "es", "it"];
  // dictionnaires : EN ci-dessus ; ES et IT dans i18n-langs.js (chargé juste avant ce fichier)
  const DICTS = { en: EN, es: (window.I18N_LANGS || {}).es || {}, it: (window.I18N_LANGS || {}).it || {} };
  const LOCALES = { fr: "fr_FR", en: "en_US", es: "es_ES", it: "it_IT" };

  function readStored(){
    try { return localStorage.getItem(STORE_KEY); } catch (_) { return null; }
  }
  function store(lang){
    try { localStorage.setItem(STORE_KEY, lang); } catch (_) {}
  }

  // langue donnée par l'adresse : /fr/…, /en/…, /es/…, /it/… (pages générées par scripts/build-seo.mjs)
  // (aussi sous /abouv/ sur GitHub Pages)
  const PATH_RE = /^(\/(?:abouv\/)?)(fr|en|es|it)(?=\/|$)/;
  const pathLang = (location.pathname.match(PATH_RE) || [])[2] || null;

  // cookie lu par le serveur (.htaccess) : l'adresse de base « / » renvoie vers la langue choisie
  function rememberForServer(l){
    try { document.cookie = "abouv_lang=" + l + "; path=/; max-age=31536000; SameSite=Lax"; } catch (_) {}
  }

  function detect(){
    // 0. l'adresse fait foi
    if (pathLang) { store(pathLang); rememberForServer(pathLang); return pathLang; }
    // 1. lien explicite : page.html?lang=en
    const param = new URLSearchParams(location.search).get("lang");
    if (LANGS.includes(param)) {
      store(param);
      // adresse nettoyée (le choix est mémorisé) : un « Précédent » ne remet pas l'ancienne langue
      try { const u = new URL(location.href); u.searchParams.delete("lang"); history.replaceState(history.state, "", u.href); } catch (_) {}
      return param;
    }
    // 2. choix mémorisé
    const saved = readStored();
    if (LANGS.includes(saved)) return saved;
    // 3. moteurs de recherche : toujours la version française (celle qui est référencée)
    if (/bot|crawl|spider|slurp|facebookexternalhit/i.test(navigator.userAgent)) return "fr";
    // 4. langue du navigateur : la première des langues du visiteur que le site propose, sinon l'anglais
    const prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "fr"];
    for (const p of prefs){ const l = String(p).slice(0, 2).toLowerCase(); if (LANGS.includes(l)) return l; }
    return "en";
  }

  const lang = detect();
  const root = document.documentElement;
  root.lang = lang;

  // Blocs par langue (seul celui de la langue active est affiché) + page masquée le temps de la traduction
  const css = document.createElement("style");
  css.textContent =
    `[data-lang]:not([data-lang="${lang}"]){display:none !important}` +
    "html.i18n-wait body{visibility:hidden}";
  document.head.appendChild(css);
  if (lang !== "fr") {
    root.classList.add("i18n-wait");
    setTimeout(() => root.classList.remove("i18n-wait"), 1500); // filet de sécurité
  }

  /* =========================
     Traduction
     ========================= */

  const missing = new Set();

  // t("texte français", { n: 3 }) -> texte dans la langue active
  const has = (d, k) => Object.prototype.hasOwnProperty.call(d, k);
  const DICT = DICTS[lang] || {};
  // texte de la langue active ; à défaut l'anglais ; à défaut le français
  function lookup(key){
    if (lang === "fr") return undefined;
    if (has(DICT, key)) return DICT[key];
    if (lang !== "en" && has(EN, key)) { missing.add(key); return EN[key]; }
    return undefined;
  }

  function t(fr, vars){
    let out = lookup(fr);
    if (out === undefined) {
      if (lang !== "fr" && /[a-zà-ÿ]/i.test(fr)) missing.add(fr);
      out = fr.includes("|") ? fr.slice(fr.indexOf("|") + 1) : fr; // "statut|Disponible" -> "Disponible"
    }
    if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    return out;
  }

  // Remplace un texte s'il est dans le dictionnaire (en gardant les espaces autour)
  function swap(str){
    const key = str.replace(/\s+/g, " ").trim();
    if (!key) return str;
    const tr = lookup(key);
    if (tr !== undefined) {
      const lead = str.match(/^\s*/)[0], tail = str.match(/\s*$/)[0];
      return lead + tr + tail;
    }
    if (/[a-zà-ÿ]{2}/i.test(key)) missing.add(key);
    return str;
  }

  const ATTRS = ["alt", "placeholder", "aria-label", "title", "data-title"];
  const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA"]);

  function translateTree(el){
    if (el.tagName === "TEXTAREA") { ATTRS.forEach(a => { if (el.hasAttribute(a)) el.setAttribute(a, swap(el.getAttribute(a))); }); return; }
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
    if (og) og.setAttribute("content", LOCALES[lang] || "en_US");
    translateTree(document.body);
  }

  /* =========================
     Sélecteur de langue : menu déroulant « FR ▾ » dans le pied de page,
     juste à droite du lien « mentions légales », à la même taille
     ========================= */

  const NAMES = { fr: "Français", en: "English", es: "Español", it: "Italiano" };
  const SHORT = { fr: "fra", en: "eng", es: "esp", it: "ita" };

  // Changer de langue : on reste sur la même page, au même endroit (position gardée, sans flash).
  // Pages /fr/…, /en/… : on passe à la même adresse dans l'autre langue. Sinon ?lang= dans l'adresse : sinon le navigateur peut ressortir une version de la page déjà préchargée
  // dans l'ancienne langue. Une page peut indiquer l'adresse à recharger (window.I18N_URL : ex. le portfolio
  // avec une fiche ouverte, dont l'adresse affichée est celle de l'œuvre).
  const SCROLL_KEY = "abouv:lang-scroll";
  function switchTo(l){
    if (l === lang) return;
    store(l);
    rememberForServer(l);
    const url = new URL(typeof window.I18N_URL === "function" ? window.I18N_URL() : location.href, location.href);
    // adresse avec la langue (/fr/portfolio -> /en/portfolio) ; sinon ?lang=
    if (PATH_RE.test(url.pathname)) url.pathname = url.pathname.replace(PATH_RE, "$1" + l);
    else url.searchParams.set("lang", l);
    try { sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ path: url.pathname, y: scrollY })); } catch (_) {}
    location.href = url.href;
  }
  // retour à la position d'avant le changement de langue (aussi après le chargement des œuvres)
  function restoreScroll(){
    let st = null;
    try { st = JSON.parse(sessionStorage.getItem(SCROLL_KEY) || "null"); } catch (_) {}
    if (!st || st.path !== location.pathname) return;
    const go = () => scrollTo({ top: st.y, behavior: "instant" });
    go(); addEventListener("load", go, { once: true }); setTimeout(go, 400); setTimeout(() => { go(); try { sessionStorage.removeItem(SCROLL_KEY); } catch (_) {} }, 1200);
  }

  // Page préchargée ou revenue par « Précédent » dans une langue qui n'est plus la bonne : on la recharge
  function stale(){
    if (pathLang) return false;   // l'adresse donne la langue : jamais périmée
    const saved = readStored();
    return LANGS.includes(saved) && saved !== lang && !new URLSearchParams(location.search).get("lang");
  }
  if (document.prerendering) document.addEventListener("prerenderingchange", () => { if (stale()) location.reload(); }, { once: true });
  window.addEventListener("pageshow", (e) => { if (e.persisted && stale()) location.reload(); });

  // Menu de langue, à droite du header (« FR ▾ »)
  function makeLangMenu(label, extraClass){
    const box = document.createElement("span");
    box.className = "langMenu" + (extraClass ? " " + extraClass : "");

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "langMenu__btn";
    btn.setAttribute("aria-haspopup", "true");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-label", t("Langue") + " : " + NAMES[lang]);
    btn.innerHTML = label(lang) +
      '<svg class="langMenu__caret" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4"/></svg>';

    const list = document.createElement("div");
    list.className = "langMenu__list";
    list.hidden = true;
    LANGS.forEach(l => {
      const o = document.createElement("button");
      o.type = "button";
      o.className = "langMenu__opt";
      o.lang = l;
      o.textContent = label(l);
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
    return box;
  }

  function addSwitch(){
    const top = document.querySelector("header.top");
    if (top) top.appendChild(makeLangMenu(l => l.toUpperCase(), "langMenu--top"));

    // (plus de choix de langue dans le pied de page : il est en haut à droite, et dans le menu du téléphone)
  }

  // Traduction de la page : appelée par le petit script en fin de <body> (avant le premier affichage : pas de
  // flash du français), sinon au DOMContentLoaded
  let applied = false;
  function apply(){
    if (applied || !document.body) return;
    applied = true;
    if (lang !== "fr") translatePage();
    addSwitch();
    root.classList.remove("i18n-wait");
    restoreScroll();
    if (missing.size) console.info(`[i18n] textes sans traduction (${lang}) :`, [...missing]);
  }
  document.addEventListener("DOMContentLoaded", apply);

  window.I18N = { lang, t, missing, apply };
  window.t = t;
})();

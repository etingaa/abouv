#!/usr/bin/env node
// build-seo.mjs — référencement (SEO) du site, sans dépendance : node scripts/build-seo.mjs
//
// Pas de meta keywords (ignorées par les moteurs).
// À relancer après avoir ajouté ou modifié une œuvre dans le Google Sheet (ou une galerie / exposition).
// Ce que le script fait :
//   1. relit le Google Sheet des œuvres (copie à jour dans data/sheet.csv ; si Google ne répond pas, la copie existante sert)
//   2. génère une page par œuvre : oeuvres/<slug>.html (adresse publique : oeuvres/<slug>) (titre, image, technique, dimensions, disponibilité,
//      « Demander des informations », précédente / suivante, balises de partage, JSON-LD VisualArtwork ; comportement : oeuvre.js)
//   3. copie chaque page dans chaque langue : fr/<page>.html, en/…, es/…, it/… (adresses /fr/portfolio, /en/oeuvres/enigma…)
//      avec la langue, l'adresse canonique, les liens vers les autres langues (hreflang), titre et description traduits
//   4. écrit dans .htaccess les redirections des adresses de l'ancien site (liste : data/old-urls.txt)
//   5. écrit sitemap.xml (toutes les langues) et robots.txt
//   4. réécrit, entre des commentaires marqueurs, dans les pages existantes :
//        <!-- seo:head --> … <!-- /seo:head -->       canonical, og:url, og:image, twitter:card (+ JSON-LD Person sur l'accueil)
//        <!-- seo:works --> … <!-- /seo:works -->     portfolio.html : la liste des œuvres en HTML (remplacée par le script de la page)
//        <!-- seo:galleries --> …                       galeries.html : les galeries en HTML
//        <!-- seo:expos --> …                           expositions.html : les expositions en HTML
// Tous les liens du site restent relatifs (le site marche sous /abouv/ comme à la racine) ; seules les adresses
// complètes demandées par les moteurs et les réseaux (canonical, og:*, sitemap, JSON-LD) utilisent SITE_URL.

import { readFile, writeFile, mkdir, readdir, unlink, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* ====== réglages ====== */
const SITE_URL = "https://annickbouvattier.art";          // adresse du site, sans « / » final
const DEFAULT_OG_IMAGE = "images/Enigma.jpg";             // image de partage des pages principales (une toile disponible)
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSmK-RAKlpq_VMnhd78eWdWeMTnCkU3_-411IzeTyzO9j0zbJdkkhzfxlRDZpqzKixpoUgTtAAI_Auw/pub?output=csv";
const ARTIST = "Annick Bouvattier";
const LANGS = ["fr", "en", "es", "it"];                    // une copie de chaque page par langue : fr/…, en/…, es/…, it/…
const OG_LOCALE = { fr: "fr_FR", en: "en_US", es: "es_ES", it: "it_IT" };
const OEUVRE_JS_V = "20261030a";                           // version de oeuvre.js (à changer quand on le modifie)

// pages principales : fichier -> adresse publique (l'accueil est la racine)
// (adresses sans « .html » : GitHub Pages sert portfolio.html à l'adresse /portfolio)
const PAGES = [
  { file: "index.html", url: "" },
  { file: "portfolio.html", url: "portfolio" },
  { file: "galeries.html", url: "galeries" },
  { file: "expositions.html", url: "expositions" },
  { file: "apropos.html", url: "apropos" },
  { file: "contact.html", url: "contact" },
  { file: "mentions-legales.html", url: "mentions-legales" },
  { file: "classique.html", url: "", noSitemap: true },
  { file: "merci.html", url: "merci", noSitemap: true },   // remerciement après le formulaire   // accueil sans 3D (repli) : même page pour Google
];

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "oeuvres");
const abs = (rel) => SITE_URL + "/" + encodeURI(rel).replace(/#/g, "%23");
const rd = (f) => readFile(path.join(ROOT, f), "utf8");
const exists = (f) => access(path.join(ROOT, f)).then(() => true, () => false);
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const jsonld = (o) => JSON.stringify(o, null, 2).replace(/</g, "\\u003c");

/* ====== données des œuvres (mêmes règles que sheet.js) ====== */

function parseCSV(text){
  const rows = []; let row = [], value = "", q = false;
  for (let i = 0; i < text.length; i++){
    const c = text[i], n = text[i + 1];
    if (c === '"' && n === '"'){ value += '"'; i++; continue; }
    if (c === '"'){ q = !q; continue; }
    if (c === "," && !q){ row.push(value.trim()); value = ""; continue; }
    if ((c === "\n" || c === "\r") && !q){ if (value.length || row.length){ row.push(value.trim()); rows.push(row); row = []; value = ""; } continue; }
    value += c;
  }
  if (value.length || row.length){ row.push(value.trim()); rows.push(row); }
  return rows;
}
const normalizeHeader = (h) => String(h ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const cleanNA = (v) => { const s = String(v ?? "").trim(); return s.toUpperCase() === "N/A" ? "" : s; };
const cleanFile = (f) => String(f || "").trim().replace(/^images\//i, "").replace(/^\/+/, "");
function slugify(title){
  return String(title || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/œ/gi, "oe").replace(/æ/gi, "ae").replace(/&/g, " et ")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "oeuvre";
}
function parseCm(format){
  const m = String(format || "").replace(",", ".").match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
  return m ? { w: parseFloat(m[1]), h: parseFloat(m[2]) } : null;
}

async function loadSheet(){
  try {
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(SHEET_CSV_URL, { signal: ctrl.signal }); clearTimeout(timer);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const csv = await res.text();
    if (!csv.trim()) throw new Error("Sheet vide");
    await writeFile(path.join(ROOT, "data/sheet.csv"), csv);
    console.log("Sheet relu depuis Google (data/sheet.csv mis à jour).");
    return csv;
  } catch (err){
    console.warn("Google Sheet injoignable (" + err.message + ") : utilisation de data/sheet.csv.");
    return rd("data/sheet.csv");
  }
}

async function loadArtworks(){
  const rows = parseCSV(await loadSheet());
  const header = rows.shift().map(normalizeHeader);
  // titre de colonne abîmé dans le Sheet : la colonne à sa place habituelle (comme sheet.js)
  const COLS = ["nom", "annee", "categorie", "technique", "format", "disponible", "jpg", "disponible ou ?", "accueil"];
  const col = (n) => {
    const i = header.indexOf(normalizeHeader(n)), k = COLS.indexOf(normalizeHeader(n));
    return i >= 0 || k < 0 || COLS.includes(header[k]) ? i : k;
  };
  const seen = new Map();
  const list = rows.map(r => {
    const file = cleanFile(cleanNA(r[col("jpg")]));
    const format = cleanNA(r[col("format")]);
    return {
      title: cleanNA(r[col("nom")]),
      year: cleanNA(r[col("annee")]),
      category: cleanNA(r[col("categorie")]),
      technique: cleanNA(r[col("technique")]),
      format, cm: parseCm(format),
      size: format ? `${format} cm` : "",
      status: cleanNA(r[col("disponible")]).toUpperCase() === "VENDUE" ? "vendue" : "disponible",
      where: cleanNA(r[col("disponible ou ?")]),
      file,
    };
  }).filter(a => a.title && a.file)
    .map(a => { const b = slugify(a.title), n = (seen.get(b) || 0) + 1; seen.set(b, n); return { ...a, slug: n > 1 ? `${b}-${n}` : b }; });
  // images absentes : pas de page (le portfolio les masque aussi)
  const ok = [];
  for (const a of list){ if (await exists("images/" + a.file)) ok.push(a); else console.warn("Image introuvable, œuvre ignorée :", a.title, a.file); }
  // même ordre que le portfolio : disponibles d'abord, puis les plus récentes, puis par titre
  return ok.sort((a, b) => (a.status === "vendue") - (b.status === "vendue") || (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0) || a.title.localeCompare(b.title, "fr"));
}

/* ====== dictionnaires (i18n.js : anglais ; i18n-langs.js : espagnol, italien) ====== */
async function loadDicts(){
  const win = {};
  try { new Function("window", await rd("i18n-langs.js"))(win); } catch (_) {}
  const src = await rd("i18n.js");
  const start = src.indexOf("const EN = {"), end = src.indexOf("\n  };", start);
  let EN = {};
  try { EN = new Function("return " + src.slice(start + "const EN = ".length, end + 4))(); } catch (_) {}
  const L = win.I18N_LANGS || {};
  return { en: EN, es: L.es || {}, it: L.it || {}, EN };
}
// texte traduit (comme i18n.js : la langue, à défaut l'anglais, à défaut le français)
const tr = (D, lang, s) => !s || lang === "fr" ? s : (D[lang][s] ?? D.EN[s] ?? s);

/* ====== gabarit commun (repris de portfolio.html) ====== */
async function loadTemplate(){
  const pf = await rd("portfolio.html");
  const v = (name) => (pf.match(new RegExp(name.replace(".", "\\.") + "\\?v=([0-9a-z]+)")) || [])[1] || "1";
  const block = (re) => (pf.match(re) || [""])[0];
  // liens relatifs du header et du footer, vus depuis le dossier oeuvres/
  const up = (html) => html.replace(/href="\.\/"/g, 'href="../"').replace(/href="(?!https?:|mailto:|tel:|#|\.\.\/)([^"]+)"/g, 'href="../$1"');
  return {
    v: { styles: v("styles.css"), i18n: v("i18n.js"), langs: v("i18n-langs.js"), site: v("site.js"), oeuvre: OEUVRE_JS_V },
    header: up(block(/<header class="top">[\s\S]*?<\/header>/)),
    footer: up(block(/<footer class="bottom">[\s\S]*?<\/footer>/)),
    social: [...block(/<div class="bottom__left">[\s\S]*?<\/div>/).matchAll(/href="(https?:[^"]+)"/g)].map(m => m[1]),
  };
}

/* ====== textes d'une œuvre (uniquement à partir des données) ====== */
const dims = (a) => a.cm ? `${a.cm.w} × ${a.cm.h} cm` : (a.size || "").replace(/\s*x\s*/i, " × ");

// texte des balises description / partage (la page elle-même ne le montre pas : ce serait un doublon des infos ;
// pas d'année non plus)
const DESC = {
  fr: { of: (t) => `« ${t} », œuvre d’${ARTIST}`, coll: (c) => `Collection « ${c} ».`, av: "Disponible.", sold: "Vendue." },
  en: { of: (t) => `“${t}”, a work by ${ARTIST}`, coll: (c) => `“${c}” collection.`, av: "Available.", sold: "Sold." },
  es: { of: (t) => `«${t}», obra de ${ARTIST}`, coll: (c) => `Colección «${c}».`, av: "Disponible.", sold: "Vendida." },
  it: { of: (t) => `«${t}», opera di ${ARTIST}`, coll: (c) => `Collezione «${c}».`, av: "Disponibile.", sold: "Venduta." },
};
function describe(a, D, lang = "fr"){
  const d = dims(a), X = DESC[lang], tech = tr(D, lang, a.technique);
  return [
    X.of(a.title) + (tech || d ? ` (${[tech && tech.toLowerCase(), d].filter(Boolean).join(", ")})` : "") + ".",
    a.category ? X.coll(tr(D, lang, a.category)) : "",
    a.status === "disponible" ? X.av : X.sold,
  ].filter(Boolean).join(" ");
}
// meta description : les phrases entières qui tiennent en ~160 caractères (sinon la première, coupée proprement)
function clip(s, n = 160){
  if (s.length <= n) return s;
  let out = "";
  for (const ph of s.match(/[^.!?]+[.!?]+(\s|$)/g) || [s]){ if ((out + ph).trim().length > n) break; out += ph; }
  return out.trim() || s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…";
}

function workPage(a, i, list, tpl, sizes, D){
  const prev = list[(i - 1 + list.length) % list.length], next = list[(i + 1) % list.length];
  const d = dims(a), url = abs(`fr/oeuvres/${a.slug}`), img = abs(`images/${a.file}`);
  const title = `${a.title} — ${[a.technique, d].filter(Boolean).join(" ")} | ${ARTIST}`;
  const fr = describe(a, D);
  const alt = `${a.title}${a.technique ? `, ${a.technique.toLowerCase()}` : ""}, par ${ARTIST}`;
  const wh = sizes[a.file] ? ` width="${sizes[a.file][0]}" height="${sizes[a.file][1]}"` : "";
  const thumb = `../images/thumbs/${a.file}`;
  const ld = {
    "@context": "https://schema.org", "@type": "VisualArtwork",
    name: a.title, url, image: img,
    artform: a.technique === "Sculpture" ? "Sculpture" : "Peinture",
    ...(a.technique ? { artMedium: a.technique } : {}),
    ...(a.cm ? { width: { "@type": "Distance", name: `${a.cm.w} cm` }, height: { "@type": "Distance", name: `${a.cm.h} cm` } } : {}),
    ...(a.year ? { dateCreated: a.year } : {}),
    creator: { "@type": "Person", name: ARTIST, url: SITE_URL + "/" },
    description: fr,
  };
  const fact = (k, v) => v ? `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>` : "";
  const cta = a.status === "disponible"
    ? `<a class="ov__cta" href="../contact?oeuvre=${encodeURIComponent(a.title)}">Demander des informations</a>` : "";
  const navLink = (w, rel, label, arrow) =>
    `<a class="ov__step ov__step--${rel}" rel="${rel}" href="${w.slug}"><span class="ov__stepK">${arrow === "←" ? "← " : ""}<span>${label}</span>${arrow === "→" ? " →" : ""}</span><span class="ov__stepT" translate="no">${esc(w.title)}</span></a>`;

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <script>/* thème clair mémorisé : appliqué avant tout affichage (pas de flash) */(function(){try{if(localStorage.getItem("abouv:theme")==="light"){var r=document.documentElement;r.setAttribute("data-theme","light");r.style.background="#efebe3";}}catch(e){}})();</script>
  <link rel="expect" href="#i18n-end" blocking="render" />
  <style>html{background:#060b18}</style>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(clip(fr))}" />
  <meta name="theme-color" content="#0B1120" />
  <link rel="canonical" href="${url}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${ARTIST}" />
  <meta property="og:locale" content="fr_FR" />
  <meta property="og:title" content="${esc(`${a.title} — ${ARTIST}`)}" />
  <meta property="og:description" content="${esc(clip(fr))}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${img}" />
  <meta property="og:image:alt" content="${esc(alt)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(`${a.title} — ${ARTIST}`)}" />
  <meta name="twitter:description" content="${esc(clip(fr))}" />
  <meta name="twitter:image" content="${img}" />
  <link rel="icon" href="../favicon.ico" sizes="48x48" />
  <link rel="icon" href="../favicon.svg" type="image/svg+xml" />
  <link rel="icon" href="../icon-192.png" type="image/png" sizes="192x192" />
  <link rel="apple-touch-icon" href="../apple-touch-icon.png" />
  <script src="../i18n-langs.js?v=${tpl.v.langs}"></script>
  <script src="../i18n.js?v=${tpl.v.i18n}"></script>
  <script src="../site.js?v=${tpl.v.site}"></script>
  <script src="../oeuvre.js?v=${tpl.v.oeuvre}" defer></script>
  <link rel="preload" href="../fonts/archivo-latin.woff2" as="font" type="font/woff2" crossorigin />
  <!-- œuvres voisines et portfolio récupérés au survol : on passe de l'une à l'autre sans attente -->
  <script type="speculationrules">{"prefetch":[{"where":{"selector_matches":".ov__step, .ov__back, .nav__link"},"eagerness":"moderate"}]}</script>
  <link rel="stylesheet" href="../styles.css?v=${tpl.v.styles}" />
  <script type="application/ld+json">
${jsonld(ld)}
  </script>
</head>
<!-- page générée par scripts/build-seo.mjs : ne pas modifier à la main -->
<body class="oeuvre salle salle--portfolio">
  <div class="page">
    <div class="container">
      ${tpl.header}

      <main class="ov">
        <a class="ov__back" href="../portfolio"><span aria-hidden="true">← </span><span>Portfolio</span></a>
        <article class="ov__grid">
          <figure class="ov__media">
            <img src="../images/${encodeURI(a.file)}" srcset="${encodeURI(thumb)} ${sizes[a.file] ? sizes[a.file][0] : 1100}w, ../images/${encodeURI(a.file)} 2000w" sizes="(max-width:900px) 100vw, 75vw" alt="${esc(alt)}"${wh} fetchpriority="high" decoding="async" />
            <a class="ov__more" href="#infos"><span>Informations</span><svg viewBox="0 0 14 8" aria-hidden="true"><path d="M1 1l6 6 6-6"/></svg></a>
          </figure>
          <div class="ov__info" id="infos">
            ${a.category ? `<p class="ov__kicker">${esc(a.category)}</p>` : ""}
            <h1 class="ov__title" translate="no">${esc(a.title)}</h1>
            <dl class="ov__facts">
              ${fact("Technique", a.technique)}
              ${d ? `<div><dt>Dimensions</dt><dd class="ov__size" translate="no">${esc(d)}</dd></div>` : ""}
              <div><dt>Disponibilité</dt><dd class="ov__status ov__status--${a.status}">${a.status === "disponible" ? "Disponible" : "Vendue"}</dd></div>
              ${a.status === "disponible" ? fact("Où la voir", a.where) : ""}
            </dl>
            ${cta}
            <nav class="ov__nav" aria-label="Autres œuvres">
              ${navLink(prev, "prev", "Œuvre précédente", "←")}
              ${navLink(next, "next", "Œuvre suivante", "→")}
            </nav>
          </div>
        </article>
      </main>

      ${tpl.footer}
    </div>
  </div>
<script>window.I18N && I18N.apply();</script><i id="i18n-end" hidden></i>
</body>
</html>
`;
}

/* ====== versions par langue ====== */
const unesc = (s) => String(s).replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
// adresse publique d'une page dans une langue (rel : "", "portfolio", "oeuvres/enigma")
const langUrl = (lang, rel) => `${SITE_URL}/${lang}/${rel}`;
function alternates(rel){
  return [...LANGS.map(l => `<link rel="alternate" hreflang="${l}" href="${langUrl(l, rel)}" />`),
    `<link rel="alternate" hreflang="x-default" href="${rel ? langUrl("fr", rel) : SITE_URL + "/"}" />`].join("\n  ");
}
// page source (française) -> page de la langue : lang, adresses, balises de partage, titre et description traduits
// (le texte de la page est traduit à l'affichage par i18n.js, qui lit la langue dans l'adresse)
// texts(fr) -> traduction d'un titre / d'une description ; desc : description déjà écrite dans la langue (œuvres)
// fichiers (images, styles, scripts, polices, données) : un dossier plus haut, puisque la page est dans fr/, en/…
// (GitHub Pages ne lit pas le .htaccess : /fr/images/… n'y existe pas) ; les liens vers les pages ne bougent pas
const ASSET = /\.(?:css|m?js|json|csv|ico|svg|png|jpe?g|webp|gif|woff2?|pdf|mp4|txt)(?:[?#][^"]*)?$/i;
const isRel = (u) => !/^(?:[a-z]+:|\/|#|\$)/i.test(u);   // ${…} : valeur écrite par un script
function rebase(html){
  return html
    .replace(/(\s(?:src|href|data-pdf|poster)=")([^"]+)"/g, (m, a, u) => isRel(u) && ASSET.test(u) ? `${a}../${u}"` : m)
    .replace(/(\ssrcset=")([^"]+)"/g, (m, a, v) => a + v.split(",").map(c => c.replace(/^(\s*)(\S+)/, (x, sp, u) => isRel(u) ? `${sp}../${u}` : x)).join(",") + '"')
    // chemins écrits dans les scripts et les styles de la page : "images/…", 'data/…', url(fonts/…)
    .replace(/(["'`(])(images|data|fonts)\//g, "$1../$2/");
}
function localize(html, lang, rel, texts){
  html = rebase(html).replace('<html lang="fr"', `<html lang="${lang}"`)
    .split(`"${langUrl("fr", rel)}"`).join(`"${langUrl(lang, rel)}"`)
    .replace(/(<meta property="og:locale" content=")[^"]*"/, `$1${OG_LOCALE[lang]}"`)
    .replace(/(<link rel="canonical" href="[^"]*" \/>)/, `$1\n  ${alternates(rel)}`);
  if (lang === "fr") return html;
  const sub = (re) => { html = html.replace(re, (m, a, v, b) => a + esc(texts(unesc(v))) + b); };
  sub(/(<title>)([^<]*)(<\/title>)/);
  for (const k of ['name="description"', 'property="og:title"', 'property="og:description"', 'name="twitter:title"', 'name="twitter:description"'])
    sub(new RegExp(`(<meta ${k} content=")([^"]*)(")`));
  return html;
}

/* ====== anciennes adresses (ancien site) -> redirections 301 dans .htaccess ====== */
const OLD_PAGES = {
  // ancien site : français à la racine, anglais sous /en/
  "": "", "index.htm": "", "galerie_3_eng.htm": "",
  "a-propos": "apropos", "parcours": "apropos", "about": "apropos", "artistic-journey": "apropos",
  "presse": "apropos#presse", "press": "apropos#presse",
  "contact": "contact", "commandes": "contact", "commissions": "contact",
  "expositions": "expositions", "exhibitions": "expositions",
  "galeries": "galeries", "galleries": "galeries", "galeries-and-expositions": "galeries", "galleries-and-exhibitions": "galeries",
  "portfolio": "portfolio", "septieme-art": "portfolio", "cinema": "portfolio", "sleepy": "portfolio", "les-belles-endormies": "portfolio",
  "drapes": "portfolio", "drapery": "portfolio", "30-ans-30-jours-30-toiles": "portfolio", "30-years-30-canvases-30-days": "portfolio",
  "a-la-vente": "portfolio?dispo=1", "disponibilites": "portfolio?dispo=1", "toiles-disponibles": "portfolio?dispo=1",
  "for-sale": "portfolio?dispo=1", "availability": "portfolio?dispo=1", "available-canvases": "portfolio?dispo=1",
  "close-up": "portfolio?collection=Close%20up", "close-ups": "portfolio?collection=Close%20up",
  "dans-la-ville": "portfolio?collection=Dans%20les%20villes", "in-the-city": "portfolio?collection=Dans%20les%20villes",
  "danseuses": "portfolio?collection=Danseuses", "dancers": "portfolio?collection=Danseuses",
  "feminitude": "portfolio?collection=F%C3%A9minitude", "femininity": "portfolio?collection=F%C3%A9minitude",
  "interieurs": "portfolio?collection=Int%C3%A9rieur", "interiors": "portfolio?collection=Int%C3%A9rieur",
  "nature": "portfolio?collection=Nature", "the-nature": "portfolio?collection=Nature",
};
async function redirectsBlock(list){
  const slugs = new Set(list.map(a => a.slug));
  let src = ""; try { src = await rd("data/old-urls.txt"); } catch (_) {}
  const lines = [];
  for (const raw of src.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#"))){
    const m = raw.replace(/^\/+|\/+$/g, "").match(/^(?:(en)(?:\/|$))?(.*)$/);
    const lang = m[1] || "fr", old = m[2];
    if (!old && !m[1]) continue;                                   // l'accueil : règle générale
    let to = OLD_PAGES[old];
    if (to === undefined){
      // une œuvre : même nom sans les suffixes de l'ancien site (-i, -in, -v, -2, -copy…)
      const base = old.replace(/(-copy\d*)+$/, "").replace(/-(i|in|v|2)$/, "");
      to = slugs.has(base) ? `oeuvres/${base}` : slugs.has(base.replace(/^en-/, "")) ? `oeuvres/${base.replace(/^en-/, "")}`
        : /^blog-post/.test(old) ? "" : "portfolio";
    }
    if (to === old) continue;                                      // même adresse dans le nouveau site
    const re = "^" + raw.replace(/^\/+|\/+$/g, "").replace(/[.]/g, "\\.") + "/?$";
    lines.push(`RewriteRule ${re} /${lang}/${to.replace(/%/g, "\\%").replace(/#/g, "\\#")} [R=301,L,NE]`);
  }
  return "\n" + lines.join("\n") + "\n";
}

/* ====== blocs insérés entre marqueurs ====== */
function between(html, tag, inner, fallbackInsert){
  const open = `<!-- seo:${tag} -->`, close = `<!-- /seo:${tag} -->`;
  const i = html.indexOf(open), j = html.indexOf(close);
  if (i >= 0 && j > i) return html.slice(0, i + open.length) + inner + html.slice(j);
  if (fallbackInsert) return fallbackInsert(html, open + inner + close);
  throw new Error(`marqueur ${open} introuvable`);
}
const meta = (html, re) => ((html.match(re) || [])[1] || "").trim();

function headBlock(html, page, tpl, list){
  const url = SITE_URL + "/fr/" + page.url;
  const title = meta(html, /<title>([^<]*)<\/title>/);
  const desc = meta(html, /<meta name="description" content="([^"]*)"/);
  const hasOgTitle = /property="og:title"/.test(html.replace(/<!-- seo:head -->[\s\S]*?<!-- \/seo:head -->/, ""));
  const lines = [
    `<link rel="canonical" href="${url}" />`,
    ...(hasOgTitle ? [] : [`<meta property="og:title" content="${title}" />`, `<meta property="og:description" content="${desc}" />`]),
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${abs(DEFAULT_OG_IMAGE)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${desc}" />`,
    `<meta name="twitter:image" content="${abs(DEFAULT_OG_IMAGE)}" />`,
  ];
  if (page.file === "index.html"){
    const person = {
      "@context": "https://schema.org", "@type": "Person",
      name: ARTIST, jobTitle: "Artiste peintre", url: SITE_URL + "/",
      image: abs("images/annickbouvattier.jpg"),
      sameAs: tpl.social,
    };
    lines.push(`<script type="application/ld+json">\n${jsonld(person)}\n  </script>`);
  }
  return "\n  " + lines.join("\n  ") + "\n  ";
}

function worksBlock(list, sizes){
  const tech = (a) => a.technique ? `<span class="capTech">${esc(a.technique)}</span>` : "";
  const size = (a) => a.size ? `<span class="capSize">${esc(a.size.replace(/\s*x\s*/i, " × "))}</span>` : "";
  return list.map(a => {
    const wh = sizes[a.file] ? ` width="${sizes[a.file][0]}" height="${sizes[a.file][1]}"` : "";
    const m = tech(a) && size(a) ? `${tech(a)}<span class="capTech"> · </span>${size(a)}` : tech(a) || size(a);
    const f = encodeURI(a.file);
    return `
        <a class="piece" href="oeuvres/${a.slug}"><div class="imgWrap"><img src="images/thumbs/s/${f}" srcset="images/thumbs/s/${f} 640w, images/thumbs/${f} 1100w" sizes="(max-width:600px) 50vw, (max-width:900px) 46vw, (max-width:1200px) 31vw, 320px" alt="${esc(a.title)}"${wh} loading="lazy" decoding="async"></div><div class="cap"><p class="capTitle">${esc(a.title)}</p>${m ? `<p class="capMeta">${m}</p>` : ""}<span class="badge ${a.status}">${a.status === "vendue" ? "Vendue" : "Disponible"}</span></div></a>`;
  }).join("") + "\n      ";
}

async function galleriesBlock(){
  const src = await rd("script.js");
  const arr = src.match(/const GALLERIES = (\[[\s\S]*?\n  \]);/);
  if (!arr) return null;
  const G = new Function("return " + arr[1])();
  return `
      <h2 class="gx__title">Galeries<sup>${G.length}</sup></h2>
      <ul class="gx__static">${G.map(g => `
        <li><h3>${esc(g.city)}</h3><p>${esc(g.name)}</p><p>${esc(g.address)} · ${esc(g.country)}</p>${g.website ? `<a href="${esc(g.website)}" target="_blank" rel="noopener noreferrer">${esc(g.website.replace(/^https?:\/\/(www\.)?/, ""))}</a>` : ""}</li>`).join("")}
      </ul>
      `;
}

async function exposBlock(){
  const src = await rd("expos-data.js");
  const win = {}; new Function("window", src)(win);
  const E = (win.EXPOS || []).slice().sort((a, b) => b.year - a.year);
  const TYPE = { solo: "Personnelle", group: "Collective", salon: "Salon" };
  return `
          <ol class="xstatic">${E.map(e => `
            <li><span class="xstatic__y">${e.year}</span> <span class="xstatic__t">${esc(e.title)}</span> — ${esc(e.city)}, ${esc(e.country)} <span class="xstatic__k">(${TYPE[e.type] || ""})</span></li>`).join("")}
          </ol>
        `;
}

/* ====== programme ====== */
async function main(){
  const [list, tpl, D] = await Promise.all([loadArtworks(), loadTemplate(), loadDicts()]);
  let sizes = {}; try { sizes = JSON.parse(await rd("images/thumbs/sizes.json")); } catch (_) {}

  // 1. pages des œuvres (les anciennes pages d'œuvres disparues sont supprimées)
  await mkdir(OUT_DIR, { recursive: true });
  const keep = new Set(list.map(a => a.slug + ".html"));
  for (const f of await readdir(OUT_DIR)) if (f.endsWith(".html") && !keep.has(f)) await unlink(path.join(OUT_DIR, f));
  await Promise.all(list.map((a, i) => writeFile(path.join(OUT_DIR, a.slug + ".html"), workPage(a, i, list, tpl, sizes, D))));

  // 2. pages principales : balises SEO, listes en HTML
  for (const page of PAGES){
    if (!(await exists(page.file))) continue;
    let html = await rd(page.file);
    html = between(html, "head", headBlock(html, page, tpl, list), (h, blk) => h.replace("</head>", `  ${blk}\n</head>`));
    if (page.file === "portfolio.html") html = between(html, "works", worksBlock(list, sizes));
    if (page.file === "galeries.html"){ const b = await galleriesBlock(); if (b) html = between(html, "galleries", b); }
    if (page.file === "expositions.html") html = between(html, "expos", await exposBlock());
    await writeFile(path.join(ROOT, page.file), html);
  }

  // 3. une copie de chaque page par langue (fr/, en/, es/, it/) : liens entre pages inchangés,
  //    fichiers (images, styles, scripts) pris un dossier plus haut (voir rebase)
  for (const lang of LANGS){
    const dir = path.join(ROOT, lang), odir = path.join(dir, "oeuvres");
    await mkdir(odir, { recursive: true });
    for (const page of PAGES){
      if (!(await exists(page.file))) continue;
      await writeFile(path.join(dir, page.file), localize(await rd(page.file), lang, page.url, (t) => tr(D, lang, t)));
    }
    for (const f of await readdir(odir)) if (f.endsWith(".html") && !keep.has(f)) await unlink(path.join(odir, f));
    await Promise.all(list.map((a, i) => {
      const texts = (t) => t.startsWith(`${a.title} — `) && t.endsWith(` | ${ARTIST}`)
        ? `${a.title} — ${[tr(D, lang, a.technique), dims(a)].filter(Boolean).join(" ")} | ${ARTIST}`
        : t.startsWith(`« ${a.title} »`) ? clip(describe(a, D, lang)) : t;
      return writeFile(path.join(odir, a.slug + ".html"), localize(workPage(a, i, list, tpl, sizes, D), lang, `oeuvres/${a.slug}`, texts));
    }));
  }

  // 4. anciennes adresses -> redirections (.htaccess, entre « # seo:redirects » et « # /seo:redirects »)
  {
    const ht = await rd(".htaccess"), o = "# seo:redirects", c = "# /seo:redirects";
    const i = ht.indexOf(o), j = ht.indexOf(c);
    if (i >= 0 && j > i) await writeFile(path.join(ROOT, ".htaccess"), ht.slice(0, i + o.length) + await redirectsBlock(list) + ht.slice(j));
  }

  // 5. sitemap.xml (chaque page dans les 4 langues, avec les liens entre versions) + robots.txt
  const today = new Date().toISOString().slice(0, 10);
  const rels = [
    ...PAGES.filter(p => !p.noSitemap).map(p => ({ rel: p.url, pri: p.url === "" ? "1.0" : "0.8" })),
    ...list.map(a => ({ rel: `oeuvres/${a.slug}`, pri: a.status === "disponible" ? "0.7" : "0.5" })),
  ];
  const alt = (rel) => [...LANGS.map(l => `<xhtml:link rel="alternate" hreflang="${l}" href="${esc(langUrl(l, rel))}"/>`),
    `<xhtml:link rel="alternate" hreflang="x-default" href="${esc(rel ? langUrl("fr", rel) : SITE_URL + "/")}"/>`].join("");
  const urls = rels.flatMap(r => LANGS.map(l =>
    `  <url><loc>${esc(langUrl(l, r.rel))}</loc>${alt(r.rel)}<lastmod>${today}</lastmod><priority>${l === "fr" ? r.pri : (r.pri - .1).toFixed(1)}</priority></url>`));
  await writeFile(path.join(ROOT, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    urls.join("\n") + `\n</urlset>\n`);
  await writeFile(path.join(ROOT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

  console.log(`${list.length} œuvres × ${LANGS.length} langues, ${urls.length} adresses dans sitemap.xml.`);
}

main().catch(err => { console.error(err); process.exit(1); });

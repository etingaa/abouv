#!/usr/bin/env node
// build-seo.mjs — référencement (SEO) du site, sans dépendance : node scripts/build-seo.mjs
//
// Pas de meta keywords (ignorées par les moteurs).
// À relancer après avoir ajouté ou modifié une œuvre dans le Google Sheet (ou une galerie / exposition).
// Ce que le script fait :
//   1. relit le Google Sheet des œuvres (copie à jour dans data/sheet.csv ; si Google ne répond pas, la copie existante sert)
//   2. génère une page par œuvre : oeuvres/<slug>.html (adresse publique : oeuvres/<slug>) (titre, image, technique, dimensions, disponibilité,
//      description, « Demander des informations », précédente / suivante, balises de partage, JSON-LD VisualArtwork)
//   3. écrit sitemap.xml et robots.txt
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
  { file: "classique.html", url: "", noSitemap: true },   // accueil sans 3D (repli) : même page pour Google
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
  const col = (n) => header.indexOf(normalizeHeader(n));
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
  // même ordre que le portfolio : disponibles d'abord, puis vendues
  return ok.sort((a, b) => (a.status === "vendue") - (b.status === "vendue"));
}

/* ====== traductions anglaises (dictionnaire de i18n.js) ====== */
async function loadEN(){
  const src = await rd("i18n.js");
  const start = src.indexOf("const EN = {"), end = src.indexOf("\n  };", start);
  try { return new Function("return " + src.slice(start + "const EN = ".length, end + 4))(); }
  catch (_) { return {}; }
}

/* ====== gabarit commun (repris de portfolio.html) ====== */
async function loadTemplate(){
  const pf = await rd("portfolio.html");
  const v = (name) => (pf.match(new RegExp(name.replace(".", "\\.") + "\\?v=([0-9a-z]+)")) || [])[1] || "1";
  const block = (re) => (pf.match(re) || [""])[0];
  // liens relatifs du header et du footer, vus depuis le dossier oeuvres/
  const up = (html) => html.replace(/href="\.\/"/g, 'href="../"').replace(/href="(?!https?:|mailto:|tel:|#|\.\.\/)([^"]+)"/g, 'href="../$1"');
  return {
    v: { styles: v("styles.css"), i18n: v("i18n.js"), site: v("site.js") },
    header: up(block(/<header class="top">[\s\S]*?<\/header>/)),
    footer: up(block(/<footer class="bottom">[\s\S]*?<\/footer>/)),
    social: [...block(/<div class="bottom__left">[\s\S]*?<\/div>/).matchAll(/href="(https?:[^"]+)"/g)].map(m => m[1]),
  };
}

/* ====== textes d'une œuvre (uniquement à partir des données) ====== */
const dims = (a) => a.cm ? `${a.cm.w} × ${a.cm.h} cm` : (a.size || "").replace(/\s*x\s*/i, " × ");
const tr = (EN, s) => (EN[s] ?? s);

function describe(a, EN){
  const d = dims(a);
  const fr = [
    `« ${a.title} » est une œuvre d’${ARTIST}${a.year ? `, réalisée en ${a.year}` : ""}` +
      (a.technique || d ? ` (${[a.technique && a.technique.toLowerCase(), d].filter(Boolean).join(", ")})` : "") + ".",
    a.category ? `Elle fait partie de la collection « ${a.category} ».` : "",
    a.status === "disponible" ? "Cette œuvre est disponible." : "Cette œuvre a été vendue.",
  ].filter(Boolean).join(" ");
  const tech = a.technique ? tr(EN, a.technique) : "";
  const en = [
    `“${a.title}” is a work by ${ARTIST}${a.year ? `, created in ${a.year}` : ""}` +
      (tech || d ? ` (${[tech && tech.toLowerCase(), d].filter(Boolean).join(", ")})` : "") + ".",
    a.category ? `It belongs to the “${tr(EN, a.category)}” collection.` : "",
    a.status === "disponible" ? "This work is available." : "This work has been sold.",
  ].filter(Boolean).join(" ");
  return { fr, en };
}
// meta description : les phrases entières qui tiennent en ~160 caractères (sinon la première, coupée proprement)
function clip(s, n = 160){
  if (s.length <= n) return s;
  let out = "";
  for (const ph of s.match(/[^.!?]+[.!?]+(\s|$)/g) || [s]){ if ((out + ph).trim().length > n) break; out += ph; }
  return out.trim() || s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…";
}

function workPage(a, i, list, tpl, EN, sizes){
  const prev = list[(i - 1 + list.length) % list.length], next = list[(i + 1) % list.length];
  const d = dims(a), url = abs(`oeuvres/${a.slug}`), img = abs(`images/${a.file}`);
  const title = `${a.title} — ${[a.technique, d].filter(Boolean).join(" ")} | ${ARTIST}`;
  const { fr, en } = describe(a, EN);
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
  const fact = (k, v, raw) => v ? `<div><dt>${k}</dt><dd${raw ? "" : ""}>${esc(v)}</dd></div>` : "";
  const cta = a.status === "disponible"
    ? `<a class="ov__cta" href="../contact?oeuvre=${encodeURIComponent(a.title)}">Demander des informations</a>` : "";
  const navLink = (w, rel, label, arrow) =>
    `<a class="ov__step ov__step--${rel}" rel="${rel}" href="${w.slug}"><span class="ov__stepK">${arrow === "←" ? "← " : ""}<span>${label}</span>${arrow === "→" ? " →" : ""}</span><span class="ov__stepT" translate="no">${esc(w.title)}</span></a>`;

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
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
  <link rel="icon" href="../favicon.svg" type="image/svg+xml" />
  <script src="../i18n.js?v=${tpl.v.i18n}"></script>
  <script src="../site.js?v=${tpl.v.site}"></script>
  <link rel="preload" href="../fonts/archivo-latin.woff2" as="font" type="font/woff2" crossorigin />
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
        <a class="ov__back" href="../portfolio"><span aria-hidden="true">← </span><span>Voir tout le portfolio</span></a>
        <article class="ov__grid">
          <figure class="ov__media">
            <img src="../images/${encodeURI(a.file)}" srcset="${encodeURI(thumb)} 1100w, ../images/${encodeURI(a.file)} 2000w" sizes="(max-width:900px) 100vw, 58vw" alt="${esc(alt)}"${wh} decoding="async" />
          </figure>
          <div class="ov__info">
            ${a.category ? `<p class="ov__kicker">${esc(a.category)}</p>` : ""}
            <h1 class="ov__title" translate="no">${esc(a.title)}</h1>
            <dl class="ov__facts">
              ${fact("Technique", a.technique)}
              ${fact("Dimensions", d)}
              ${fact("Année", a.year)}
              <div><dt>Disponibilité</dt><dd class="ov__status ov__status--${a.status}">${a.status === "disponible" ? "Disponible" : "Vendue"}</dd></div>
              ${a.status === "disponible" ? fact("Où la voir", a.where) : ""}
            </dl>
            <p class="ov__desc" data-lang="fr">${esc(fr)}</p>
            <p class="ov__desc" data-lang="en">${esc(en)}</p>
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
</body>
</html>
`;
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
  const url = SITE_URL + "/" + page.url;
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

function worksBlock(list, EN, sizes){
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
  const [list, EN, tpl] = await Promise.all([loadArtworks(), loadEN(), loadTemplate()]);
  let sizes = {}; try { sizes = JSON.parse(await rd("images/thumbs/sizes.json")); } catch (_) {}

  // 1. pages des œuvres (les anciennes pages d'œuvres disparues sont supprimées)
  await mkdir(OUT_DIR, { recursive: true });
  const keep = new Set(list.map(a => a.slug + ".html"));
  for (const f of await readdir(OUT_DIR)) if (f.endsWith(".html") && !keep.has(f)) await unlink(path.join(OUT_DIR, f));
  await Promise.all(list.map((a, i) => writeFile(path.join(OUT_DIR, a.slug + ".html"), workPage(a, i, list, tpl, EN, sizes))));

  // 2. pages principales : balises SEO, listes en HTML
  for (const page of PAGES){
    if (!(await exists(page.file))) continue;
    let html = await rd(page.file);
    html = between(html, "head", headBlock(html, page, tpl, list), (h, blk) => h.replace("</head>", `  ${blk}\n</head>`));
    if (page.file === "portfolio.html") html = between(html, "works", worksBlock(list, EN, sizes));
    if (page.file === "galeries.html"){ const b = await galleriesBlock(); if (b) html = between(html, "galleries", b); }
    if (page.file === "expositions.html") html = between(html, "expos", await exposBlock());
    await writeFile(path.join(ROOT, page.file), html);
  }

  // 3. sitemap.xml + robots.txt
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    ...PAGES.filter(p => !p.noSitemap).map(p => ({ loc: SITE_URL + "/" + p.url, pri: p.url === "" ? "1.0" : "0.8" })),
    ...list.map(a => ({ loc: abs(`oeuvres/${a.slug}`), pri: a.status === "disponible" ? "0.7" : "0.5" })),
  ];
  await writeFile(path.join(ROOT, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(u => `  <url><loc>${esc(u.loc)}</loc><lastmod>${today}</lastmod><priority>${u.pri}</priority></url>`).join("\n") +
    `\n</urlset>\n`);
  await writeFile(path.join(ROOT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

  console.log(`${list.length} pages d'œuvres dans oeuvres/, ${urls.length} adresses dans sitemap.xml.`);
}

main().catch(err => { console.error(err); process.exit(1); });

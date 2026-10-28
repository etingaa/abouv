// sheet.js — lecture du Google Sheet des œuvres (publié en CSV), partagée par l'accueil et le portfolio.
// Colonnes : Nom | Année | Catégorie | Technique | Format | Disponible | Jpg | Disponible où ? | Accueil
// Rapide : on affiche tout de suite la dernière version connue (localStorage), ou au tout premier passage
// la copie livrée avec le site (data/sheet.csv) ; le Sheet est relu en arrière-plan et, s'il a changé,
// la copie est mise à jour et l'événement « abouv:sheet-updated » est envoyé (le portfolio se redessine).
// Pour rafraîchir la copie livrée :  curl -sL "<SHEET_CSV_URL>" -o data/sheet.csv

(() => {
  "use strict";

  const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSmK-RAKlpq_VMnhd78eWdWeMTnCkU3_-411IzeTyzO9j0zbJdkkhzfxlRDZpqzKixpoUgTtAAI_Auw/pub?output=csv";
  const CACHE_KEY = "abouv:sheet-csv";
  // racine du site (dossier de sheet.js) : les chemins restent justes depuis /fr/, /en/oeuvres/…
  const ROOT = document.currentScript ? new URL(".", document.currentScript.src).href : "";
  const SNAPSHOT_URL = ROOT + "data/sheet.csv";

  // minuscules, sans accents : "Disponible où ?" -> "disponible ou ?"
  function normalizeHeader(h){
    return String(h ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .trim();
  }

  // CSV robuste (gère guillemets + virgules)
  function parseCSV(text){
    const rows = [];
    let row = [];
    let value = "";
    let inQuotes = false;

    for(let i=0;i<text.length;i++){
      const c = text[i];
      const next = text[i+1];

      if(c === '"' && next === '"'){
        value += '"';
        i++;
        continue;
      }
      if(c === '"'){
        inQuotes = !inQuotes;
        continue;
      }
      if(c === "," && !inQuotes){
        row.push(value.trim());
        value = "";
        continue;
      }
      if((c === "\n" || c === "\r") && !inQuotes){
        if(value.length || row.length){
          row.push(value.trim());
          rows.push(row);
          row = [];
          value = "";
        }
        continue;
      }
      value += c;
    }

    if(value.length || row.length){
      row.push(value.trim());
      rows.push(row);
    }

    return rows;
  }

  // relecture du Sheet (une seule fois par page)
  let refreshing = null;
  function refresh(shown){
    if(!refreshing){
      refreshing = fetch(SHEET_CSV_URL, { cache: "no-store" })
        .then(res => { if(!res.ok) throw new Error("Impossible de charger la Google Sheet"); return res.text(); })
        .then(csv => {
          if(!csv.trim()) throw new Error("Sheet vide");
          try{ localStorage.setItem(CACHE_KEY, csv); }catch(_){}
          if(shown != null && csv !== shown) document.dispatchEvent(new CustomEvent("abouv:sheet-updated"));
          return csv;
        });
    }
    return refreshing;
  }

  async function fetchCSV(){
    // 1. dernière version connue : immédiate
    let cached = null;
    try{ cached = localStorage.getItem(CACHE_KEY); }catch(_){}
    if(cached){ refresh(cached).catch(err => console.warn("Sheet injoignable, copie locale conservée.", err)); return cached; }
    // 2. premier passage : la copie livrée avec le site
    try{
      const res = await fetch(SNAPSHOT_URL);
      const snap = res.ok ? await res.text() : "";
      if(snap.trim()){ refresh(snap).catch(err => console.warn("Sheet injoignable, copie du site conservée.", err)); return snap; }
    }catch(_){}
    // 3. sinon on attend le Sheet
    return refresh(null);
  }

  // ordre habituel des colonnes : si un titre de colonne est effacé ou modifié par erreur dans le Sheet
  // (ex. « Nom » remplacé par des lettres tapées au hasard), on retrouve la colonne à sa place habituelle
  const COLS = ["nom", "annee", "categorie", "technique", "format", "disponible", "jpg", "disponible ou ?", "accueil"];

  // -> { rows: [[…], …] sans l'en-tête, col("Nom") -> index de la colonne }
  async function load(){
    const rows = parseCSV(await fetchCSV());
    if(!rows.length) throw new Error("Sheet vide");
    const header = rows.shift().map(normalizeHeader);
    const col = (name) => {
      const n = normalizeHeader(name), i = header.indexOf(n), k = COLS.indexOf(n);
      return i >= 0 || k < 0 || COLS.includes(header[k]) ? i : k;
    };
    return { rows, col };
  }

  function cleanNA(v){
    const s = String(v ?? "").trim();
    return s.toUpperCase() === "N/A" ? "" : s;
  }

  function cleanFile(jpg){
    return String(jpg || "").trim().replace(/^images\//i, "").replace(/^\/+/, "");
  }

  // "120 x 81" -> { w: 120, h: 81 } en cm (largeur × hauteur), null si illisible
  function parseCm(format){
    const m = String(format || "").replace(",", ".").match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
    if (!m) return null;
    const w = parseFloat(m[1]), h = parseFloat(m[2]);
    return w > 0 && h > 0 ? { w, h } : null;
  }

  // adresse d'une œuvre : oeuvres/<slug>.html (même règle que scripts/build-seo.mjs)
  function slugify(title){
    return String(title || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/œ/gi, "oe").replace(/æ/gi, "ae").replace(/&/g, " et ")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "oeuvre";
  }
  // titres en double : -2, -3… dans l'ordre du Sheet
  function withSlugs(list){
    const seen = new Map();
    return list.map(a => {
      const base = slugify(a.title), n = (seen.get(base) || 0) + 1;
      seen.set(base, n);
      return { ...a, slug: n > 1 ? `${base}-${n}` : base };
    });
  }

  const imagePath = (file) => ROOT + encodeURI(`images/${file}`);
  const thumbPath = (file) => ROOT + encodeURI(`images/thumbs/${file}`); // voir scripts/make-thumbs.py
  const thumbSmallPath = (file) => ROOT + encodeURI(`images/thumbs/s/${file}`); // 640 px de large, pour la grille

  // Une œuvre par ligne ayant un Nom et un Jpg.
  // status : « VENDUE » -> "vendue", toute autre valeur -> "disponible"
  // home   : false seulement si la colonne Accueil vaut « non »
  // cm     : dimensions réelles { w, h } en centimètres (null si la colonne Format est illisible)
  async function artworks(){
    const { rows, col } = await load();
    return withSlugs(rows
      .map(r => {
        const file = cleanFile(cleanNA(r[col("jpg")]));
        const format = cleanNA(r[col("format")]);
        return {
          title: cleanNA(r[col("nom")]),
          year: parseInt(cleanNA(r[col("annee")]), 10) || 0,
          category: cleanNA(r[col("categorie")]),
          technique: cleanNA(r[col("technique")]),
          size: format ? `${format} cm` : "",
          cm: parseCm(format),
          status: cleanNA(r[col("disponible")]).toUpperCase() === "VENDUE" ? "vendue" : "disponible",
          where: cleanNA(r[col("disponible ou ?")]),
          home: normalizeHeader(r[col("accueil")]) !== "non",
          file,
          image: file ? imagePath(file) : "",
          thumb: file ? thumbPath(file) : "",
          thumbSmall: file ? thumbSmallPath(file) : "",
        };
      })
      .filter(a => a.title && a.file));
  }

  window.abouvSheet = { load, artworks, imagePath, thumbPath, parseCm, slugify };
})();

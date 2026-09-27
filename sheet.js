// sheet.js — lecture du Google Sheet des œuvres (publié en CSV), partagée par l'accueil et le portfolio.
// Colonnes : Nom | Année | Catégorie | Technique | Format | Disponible | Jpg | Disponible où ? | Accueil
// Si Google est injoignable, on reprend la dernière version reçue (localStorage).

(() => {
  "use strict";

  const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSmK-RAKlpq_VMnhd78eWdWeMTnCkU3_-411IzeTyzO9j0zbJdkkhzfxlRDZpqzKixpoUgTtAAI_Auw/pub?output=csv";
  const CACHE_KEY = "abouv:sheet-csv";

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

  async function fetchCSV(){
    try{
      const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
      if(!res.ok) throw new Error("Impossible de charger la Google Sheet");
      const csv = await res.text();
      try{ localStorage.setItem(CACHE_KEY, csv); }catch(_){}
      return csv;
    }catch(err){
      // Google injoignable / Sheet dépubliée : on affiche la dernière version connue
      let cached = null;
      try{ cached = localStorage.getItem(CACHE_KEY); }catch(_){}
      if(cached){ console.warn("Sheet injoignable, utilisation de la copie locale.", err); return cached; }
      throw err;
    }
  }

  // -> { rows: [[…], …] sans l'en-tête, col("Nom") -> index de la colonne }
  async function load(){
    const rows = parseCSV(await fetchCSV());
    if(!rows.length) throw new Error("Sheet vide");
    const header = rows.shift().map(normalizeHeader);
    return { rows, col: (name) => header.indexOf(normalizeHeader(name)) };
  }

  function cleanNA(v){
    const s = String(v ?? "").trim();
    return s.toUpperCase() === "N/A" ? "" : s;
  }

  function cleanFile(jpg){
    return String(jpg || "").trim().replace(/^images\//i, "").replace(/^\/+/, "");
  }

  const imagePath = (file) => encodeURI(`images/${file}`);
  const thumbPath = (file) => encodeURI(`images/thumbs/${file}`); // voir scripts/make-thumbs.py

  // Une œuvre par ligne ayant un Nom et un Jpg.
  // status : « VENDUE » -> "vendue", toute autre valeur -> "disponible"
  // home   : false seulement si la colonne Accueil vaut « non »
  async function artworks(){
    const { rows, col } = await load();
    return rows
      .map(r => {
        const file = cleanFile(cleanNA(r[col("jpg")]));
        const format = cleanNA(r[col("format")]);
        return {
          title: cleanNA(r[col("nom")]),
          category: cleanNA(r[col("categorie")]),
          technique: cleanNA(r[col("technique")]),
          size: format ? `${format} cm` : "",
          status: cleanNA(r[col("disponible")]).toUpperCase() === "VENDUE" ? "vendue" : "disponible",
          where: cleanNA(r[col("disponible ou ?")]),
          home: normalizeHeader(r[col("accueil")]) !== "non",
          file,
          image: file ? imagePath(file) : "",
          thumb: file ? thumbPath(file) : "",
        };
      })
      .filter(a => a.title && a.file);
  }

  window.abouvSheet = { load, artworks, imagePath, thumbPath };
})();

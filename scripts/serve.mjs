#!/usr/bin/env node
// serve.mjs — aperçu local du site, comme GitHub Pages : node scripts/serve.mjs  (http://localhost:8000)
// /portfolio sert portfolio.html, /oeuvres/enigma sert oeuvres/enigma.html, un dossier sert son index.html,
// une adresse introuvable sert 404.html (avec le code 404). Sans dépendance.
// Comme le .htaccess du site : « / » renvoie vers /fr/ (ou la langue choisie / du navigateur), et les fichiers
// demandés sous /en/… qui n'y sont pas (images, styles, scripts) sont servis depuis la racine.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT) || 8000;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json", ".csv": "text/csv; charset=utf-8",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
  ".woff2": "font/woff2", ".pdf": "application/pdf", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8",
};
const isFile = (f) => stat(f).then(s => s.isFile(), () => false);

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const base = path.join(ROOT, rel);
  if (!base.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  if (rel === ""){
    const c = (req.headers.cookie || "").match(/(?:^|;\s*)abouv_lang=(fr|en|es|it)/);
    const a = (req.headers["accept-language"] || "").slice(0, 2).toLowerCase();
    const l = c ? c[1] : ["en", "es", "it"].includes(a) ? a : "fr";
    res.writeHead(302, { Location: `/${l}/`, "Cache-Control": "no-store" }).end(); return;
  }
  if (/^(fr|en|es|it)$/.test(rel)){ res.writeHead(301, { Location: `/${rel}/` }).end(); return; }
  const tries = [base, base + ".html", path.join(base, "index.html")];
  const m = rel.match(/^(?:fr|en|es|it)\/(.+)$/);
  if (m) tries.push(path.join(ROOT, m[1]));
  let file = null;
  for (const f of tries) if (await isFile(f)) { file = f; break; }
  const status = file ? 200 : 404;
  file = file || path.join(ROOT, "404.html");
  try {
    const body = await readFile(file);
    res.writeHead(status, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(body);
  } catch (_) { res.writeHead(500).end(); }
}).listen(PORT, () => console.log(`Aperçu : http://localhost:${PORT}/`));

// script.js — page Galeries uniquement : une carte en points (sans Leaflet) avec les galeries,
// reliée à des fiches (survol de l'une = l'autre s'allume). Chargé par galeries.html après expos-data.js.
// Chaque galerie indique ses expositions (expos-data.js) avec un lien vers la page Expositions filtrée.

(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", initGaleriesPage);

  // Données, dans l'ordre de la carte (d'ouest en est). expos : comment retrouver les expositions de la galerie dans expos-data.js
  // (le titre contient `title` et la ville contient `city`).
  const GALLERIES = [
    { name:"French Art Network — Carmel-by-the-Sea", city:"Carmel-by-the-Sea", country:"États-Unis", phone:"(931) 625-3456", address:"San Carlos St, Carmel-by-the-Sea, CA 93921", website:"https://www.frenchart.net", lat:36.5552, lng:-121.9233, expos:{ title:"French Art Network", city:"Carmel" } },
    { name:"Galerie Rue Toulouse (French Art Network)", city:"Laguna Beach", country:"États-Unis", phone:"(949) 549-4546", address:"390 S. Coast Hwy, Laguna Beach, CA 92651", website:"https://www.frenchart.net", lat:33.5427, lng:-117.7831, expos:{ title:"French Art Network", city:"Laguna" } },
    { name:"French Art Network — New Orleans", city:"New Orleans", country:"États-Unis", phone:"(504) 581-5881", address:"509 Rue Royale, New Orleans, LA 70130", website:"https://www.frenchart.net", lat:29.9574, lng:-90.0620, expos:{ title:"French Art Network", city:"New Orleans" } },
    { name:"Artclub Gallery", city:"Paris", country:"France", phone:"+33 (0)1 47 03 42 20", address:"172 Rue de Rivoli, 75001 Paris", website:"https://www.artclub.fr", lat:48.8619, lng:2.3341, expos:{ title:"Artclub", city:"Paris" } },
    { name:"Artclub Gallery", city:"Lyon", country:"France", phone:"+33 (0)4 78 37 47 37", address:"22 Place Bellecour, 69002 Lyon", website:"https://www.artclub.fr", lat:45.7579, lng:4.8320, expos:{ title:"Artclub", city:"Lyon" } },
  ];


  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function exposOf(g) {
    const all = window.EXPOS || [];
    if (!g.expos) return [];
    return all.filter((e) => e.title.includes(g.expos.title) && e.city.includes(g.expos.city)).sort((a, b) => a.year - b.year);
  }
  // « 36,56° N · 121,92° O » (en anglais : W)
  function coords(g) {
    const en = document.documentElement.lang === "en", f = (v) => Math.abs(v).toFixed(2).replace(".", en ? "." : ",");
    return `${f(g.lat)}° ${g.lat >= 0 ? "N" : "S"} · ${f(g.lng)}° ${g.lng >= 0 ? "E" : (en ? "W" : "O")}`;
  }
  function exposLine(g) {
    const list = exposOf(g), n = list.length;
    if (!n) return "";
    const text = n > 1
      ? `${n} ${t("expositions")} ${t("ici depuis")} ${list[0].year}`
      : `1 ${t("exposition")} ${t("ici en")} ${list[0].year}`;
    return `<a class="gx__expos" href="expositions?q=${encodeURIComponent(g.expos.title)}">${escapeHtml(text)} →</a>`;
  }

  // carte en points (images/world-dots.svg : projection simple, x = lon + 180, y = 72 - lat),
  // recadrée sur l'Amérique du Nord et l'Europe
  const VIEW = { x: 44, y: 12, w: 176, h: 42 };
  // téléphone : deux cartes zoomées, une par pays (la carte du monde y serait illisible)
  const ZOOMS = [
    { name: "États-Unis", view: { x: 47, y: 26, w: 50, h: 20 } },
    { name: "France", view: { x: 168, y: 16, w: 30, h: 15 } },
  ];
  const px = (lng) => lng + 180, py = (lat) => 72 - lat;
  // côté de l'étiquette pour éviter les chevauchements (villes proches)
  const LABEL = { "Paris": "above", "Lyon": "below", "Laguna Beach": "below", "Carmel-by-the-Sea": "above", "New Orleans": "below" };

  function mapSVG(V = VIEW, only) {
    const home = GALLERIES.find((g) => g.city === "Paris") || GALLERIES[0];
    const arcs = only ? "" : GALLERIES.filter((g) => g !== home).map((g) => {
      const x1 = px(home.lng), y1 = py(home.lat), x2 = px(g.lng), y2 = py(g.lat);
      const mx = (x1 + x2) / 2, my = Math.min(y1, y2) - Math.abs(x2 - x1) * .18;
      return `<path class="gx__arc" d="M${x1},${y1} Q${mx},${my} ${x2},${y2}"/>`;
    }).join("");
    const k = V.w / VIEW.w;              // taille des repères proportionnelle au cadrage
    const pins = GALLERIES.map((g, i) => {
      if (only && g.country !== only) return "";
      const x = px(g.lng), y = py(g.lat), up = LABEL[g.city] !== "below";
      return `<g class="gx__pin" data-i="${i}" tabindex="0" role="button" aria-label="${escapeHtml(g.name)}, ${escapeHtml(g.city)}">
        <circle class="ring" cx="${x}" cy="${y}" r="${.9 * (only ? k * 2.6 : 1)}"/><circle class="dot" cx="${x}" cy="${y}" r="${.75 * (only ? k * 2.6 : 1)}"/>
        <text x="${x}" y="${up ? y - (only ? k * 5.4 : 1.8) : y + (only ? k * 9 : 3.4)}" text-anchor="middle"${only ? ` style="font-size:${(k * 5.6).toFixed(2)}px"` : ""}>${escapeHtml(g.city)}</text></g>`;
    }).join("");
    return `<svg viewBox="${V.x} ${V.y} ${V.w} ${V.h}" role="img" aria-label="${t("Carte des galeries")}">
      <image href="images/world-dots.svg" x="0" y="0" width="360" height="128"/>${arcs}${pins}</svg>`;
  }

  function initGaleriesPage() {
    const box = document.getElementById("gx");
    if (!box) return;

    box.innerHTML = `
      <h2 class="gx__title">${t("Galeries")}<sup>${GALLERIES.length}</sup></h2>
      <div class="gx__map">${mapSVG()}</div>
      <div class="gx__maps">${ZOOMS.map((z) => `
        <figure class="gx__zoom"><figcaption>${escapeHtml(t(z.name))}<span>${GALLERIES.filter(g => g.country === z.name).length}</span></figcaption>${mapSVG(z.view, z.name)}</figure>`).join("")}
      </div>
      <div class="gx__acc" role="list">${GALLERIES.map((g, i) => `
        <article class="gx__panel${i === 0 ? " is-open" : ""}" id="galerie-${i}" data-i="${i}" role="listitem" tabindex="0">
          <span class="gx__num">${String(i + 1).padStart(2, "0")}</span>
          <p class="gx__vcity" aria-hidden="true" style="--n:${g.city.length}">${escapeHtml(g.city)}</p>
          <div class="gx__body">
            <p class="gx__country">${escapeHtml(t(g.country))}</p>
            <p class="gx__city">${escapeHtml(g.city)}</p>
            <p class="gx__name">${escapeHtml(g.name)}</p>
            <p class="gx__addr">${escapeHtml(g.address)}</p>
            ${exposLine(g)}
            <div class="gx__acts">
              ${g.website ? `<a href="${escapeHtml(g.website)}" target="_blank" rel="noopener noreferrer">${t("Site")} ↗</a>` : ""}
              <a href="https://www.google.com/maps/dir/?api=1&destination=${g.lat},${g.lng}" target="_blank" rel="noopener noreferrer">${t("Itinéraire")} ↗</a>
              ${g.phone ? `<a href="tel:${g.phone.replace(/[^\d+]/g, "")}">${t("Appeler")}</a>` : ""}
            </div>
          </div>
          <div class="gx__foot" aria-hidden="true"><span class="gx__coords">${coords(g)}</span><span class="gx__big">${String(i + 1).padStart(2, "0")}</span></div>
        </article>`).join("")}
      </div>`;

    // carte et fiches reliées : survoler l'une allume l'autre ; un clic sur un point mène à la fiche
    // accordéon : une galerie ouverte à la fois (au survol, au clic, au clavier) ; son point s'allume sur la carte
    const pins = [...box.querySelectorAll(".gx__pin")], cards = [...box.querySelectorAll(".gx__panel")];
    const open = (i) => cards.forEach((c, k) => c.classList.toggle("is-open", k === i));
    // une galerie peut avoir plusieurs points (carte du monde + carte zoomée du téléphone)
    const hot = (i, on) => { pins.forEach((p) => { if (+p.dataset.i === i) p.classList.toggle("is-hot", on); }); if (on) open(i); };
    cards.forEach((c, i) => {
      c.addEventListener("mouseenter", () => hot(i, true)); c.addEventListener("mouseleave", () => hot(i, false));
      c.addEventListener("focus", () => hot(i, true)); c.addEventListener("click", () => open(i));
    });
    pins.forEach((p) => {
      const i = +p.dataset.i;
      p.addEventListener("mouseenter", () => hot(i, true)); p.addEventListener("mouseleave", () => hot(i, false));
      p.addEventListener("focus", () => hot(i, true)); p.addEventListener("blur", () => hot(i, false));
      const go = () => { open(i); cards[i].scrollIntoView({ behavior: "smooth", block: "center" }); };
      p.addEventListener("click", go);
      p.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });

  }
})();

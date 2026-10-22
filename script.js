// script.js — page Galeries uniquement : une carte en points (sans Leaflet) avec les galeries,
// reliée à des fiches (survol de l'une = l'autre s'allume). Chargé par galeries.html après expos-data.js.
// Chaque galerie indique ses expositions (expos-data.js) avec un lien vers la page Expositions filtrée.

(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", initGaleriesPage);

  // Données. expos : comment retrouver les expositions de la galerie dans expos-data.js
  // (le titre contient `title` et la ville contient `city`).
  const GALLERIES = [
    { name:"Galerie Rue Toulouse (French Art Network)", city:"Laguna Beach", country:"États-Unis", phone:"(949) 549-4546", address:"390 S. Coast Hwy, Laguna Beach, CA 92651", website:"https://www.frenchart.net", lat:33.5427, lng:-117.7831, expos:{ title:"French Art Network", city:"Laguna" } },
    { name:"Artclub Gallery", city:"Lyon", country:"France", phone:"+33 (0)4 78 37 47 37", address:"22 Place Bellecour, 69002 Lyon", website:"https://www.artclub.fr", lat:45.7579, lng:4.8320, expos:{ title:"Artclub", city:"Lyon" } },
    { name:"Artclub Gallery", city:"Paris", country:"France", phone:"+33 (0)1 47 03 42 20", address:"172 Rue de Rivoli, 75001 Paris", website:"https://www.artclub.fr", lat:48.8619, lng:2.3341, expos:{ title:"Artclub", city:"Paris" } },
    { name:"French Art Network — New Orleans", city:"New Orleans", country:"États-Unis", phone:"(504) 581-5881", address:"509 Rue Royale, New Orleans, LA 70130", website:"https://www.frenchart.net", lat:29.9574, lng:-90.0620, expos:{ title:"French Art Network", city:"New Orleans" } },
    { name:"French Art Network — Carmel-by-the-Sea", city:"Carmel-by-the-Sea", country:"États-Unis", phone:"(931) 625-3456", address:"San Carlos St, Carmel-by-the-Sea, CA 93921", website:"https://www.frenchart.net", lat:36.5552, lng:-121.9233, expos:{ title:"French Art Network", city:"Carmel" } },
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
  function exposLine(g) {
    const list = exposOf(g), n = list.length;
    if (!n) return "";
    const text = n > 1
      ? `${n} ${t("expositions")} ${t("ici depuis")} ${list[0].year}`
      : `1 ${t("exposition")} ${t("ici en")} ${list[0].year}`;
    return `<a class="gx__expos" href="expositions.html?q=${encodeURIComponent(g.expos.title)}">${escapeHtml(text)} →</a>`;
  }

  // carte en points (images/world-dots.svg : projection simple, x = lon + 180, y = 72 - lat),
  // recadrée sur l'Amérique du Nord et l'Europe
  const VIEW = { x: 44, y: 12, w: 176, h: 42 };
  const px = (lng) => lng + 180, py = (lat) => 72 - lat;
  // côté de l'étiquette pour éviter les chevauchements (villes proches)
  const LABEL = { "Paris": "above", "Lyon": "below", "Laguna Beach": "below", "Carmel-by-the-Sea": "above", "New Orleans": "below" };

  function mapSVG() {
    const home = GALLERIES.find((g) => g.city === "Paris") || GALLERIES[0];
    const arcs = GALLERIES.filter((g) => g !== home).map((g) => {
      const x1 = px(home.lng), y1 = py(home.lat), x2 = px(g.lng), y2 = py(g.lat);
      const mx = (x1 + x2) / 2, my = Math.min(y1, y2) - Math.abs(x2 - x1) * .18;
      return `<path class="gx__arc" d="M${x1},${y1} Q${mx},${my} ${x2},${y2}"/>`;
    }).join("");
    const pins = GALLERIES.map((g, i) => {
      const x = px(g.lng), y = py(g.lat), up = LABEL[g.city] !== "below";
      return `<g class="gx__pin" data-i="${i}" tabindex="0" role="button" aria-label="${escapeHtml(g.name)}, ${escapeHtml(g.city)}">
        <circle class="ring" cx="${x}" cy="${y}" r=".9"/><circle class="dot" cx="${x}" cy="${y}" r=".75"/>
        <text x="${x}" y="${up ? y - 1.8 : y + 3.4}" text-anchor="middle">${escapeHtml(g.city)}</text></g>`;
    }).join("");
    return `<svg viewBox="${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}" role="img" aria-label="${t("Carte des galeries")}">
      <image href="images/world-dots.svg" x="0" y="0" width="360" height="128"/>${arcs}${pins}</svg>`;
  }

  function initGaleriesPage() {
    const box = document.getElementById("gx");
    if (!box) return;
    const countries = [...new Set(GALLERIES.map((g) => g.country))];

    box.innerHTML = `
      <h2 class="gx__title">${t("Galeries")}<sup>${GALLERIES.length}</sup></h2>
      <p class="gx__lead">${t("Où voir les toiles en vrai")} — ${countries.map((c) => escapeHtml(t(c))).join(", ")}.</p>
      <div class="gx__map">${mapSVG()}</div>
      <div class="gx__grid">${GALLERIES.map((g, i) => `
        <article class="gx__card" id="galerie-${i}" data-i="${i}">
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
        </article>`).join("")}
      </div>`;

    // carte et fiches reliées : survoler l'une allume l'autre ; un clic sur un point mène à la fiche
    const pins = [...box.querySelectorAll(".gx__pin")], cards = [...box.querySelectorAll(".gx__card")];
    const hot = (i, on) => { pins[i].classList.toggle("is-hot", on); cards[i].classList.toggle("is-hot", on); };
    cards.forEach((c, i) => { c.addEventListener("mouseenter", () => hot(i, true)); c.addEventListener("mouseleave", () => hot(i, false)); });
    pins.forEach((p, i) => {
      p.addEventListener("mouseenter", () => hot(i, true)); p.addEventListener("mouseleave", () => hot(i, false));
      p.addEventListener("focus", () => hot(i, true)); p.addEventListener("blur", () => hot(i, false));
      const go = () => { cards[i].scrollIntoView({ behavior: "smooth", block: "center" }); hot(i, true); setTimeout(() => hot(i, false), 1600); };
      p.addEventListener("click", go);
      p.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });
  }
})();

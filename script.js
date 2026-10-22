// script.js — page Galeries uniquement : titre, villes qui défilent (un clic mène à la galerie),
// puis une rangée par galerie, groupées par pays. Chargé par galeries.html après expos-data.js.
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

  function initGaleriesPage() {
    const box = document.getElementById("gx");
    if (!box) return;
    const id = (g, i) => "galerie-" + i;

    // pays : ordre d'apparition dans la liste
    const countries = [...new Set(GALLERIES.map((g) => g.country))];
    const seq = (hidden) => `<div class="gx__seq"${hidden ? ' aria-hidden="true"' : ""}>${
      GALLERIES.map((g, i) => `<button type="button" class="gx__c" data-target="${id(g, i)}"${hidden ? ' tabindex="-1"' : ""}>${escapeHtml(g.city)}</button>`).join("")}</div>`;

    box.innerHTML = `
      <h2 class="gx__title">${t("Galeries")}<sup>${GALLERIES.length}</sup></h2>
      <div class="gx__run"><div class="gx__track">${seq(false)}${seq(true)}${seq(true)}${seq(true)}</div></div>
      ${countries.map((c) => `
        <h3 class="gx__country">${escapeHtml(t(c))}</h3>
        <div class="gx__list">${GALLERIES.map((g, i) => g.country !== c ? "" : `
          <article class="gx__row" id="${id(g, i)}">
            <p class="gx__city">${escapeHtml(g.city)}</p>
            <div>
              <p class="gx__name">${escapeHtml(g.name)}</p>
              <p class="gx__addr">${escapeHtml(g.address)}</p>
              ${exposLine(g)}
            </div>
            <div class="gx__acts">
              ${g.website ? `<a href="${escapeHtml(g.website)}" target="_blank" rel="noopener noreferrer">${t("Site")} ↗</a>` : ""}
              <a href="https://www.google.com/maps/dir/?api=1&destination=${g.lat},${g.lng}" target="_blank" rel="noopener noreferrer">${t("Itinéraire")} ↗</a>
              ${g.phone ? `<a href="tel:${g.phone.replace(/[^\d+]/g, "")}">${t("Appeler")}</a>` : ""}
            </div>
          </article>`).join("")}
        </div>`).join("")}`;

    // un clic sur une ville : on descend jusqu'à sa galerie, qui s'éclaire un instant
    box.querySelectorAll(".gx__c").forEach((b) => b.addEventListener("click", () => {
      const row = document.getElementById(b.dataset.target);
      if (!row) return;
      row.scrollIntoView({ behavior: "smooth", block: "start" });
      row.classList.add("is-flash");
      setTimeout(() => row.classList.remove("is-flash"), 1400);
    }));
  }
})();

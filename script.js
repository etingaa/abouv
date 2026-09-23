// script.js — page Galeries uniquement (carte Leaflet + liste + recherche).
// Chargé par galeries.html après Leaflet. Ne fait rien si #map / #list sont absents.

(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", initGaleriesPage);

  /* =========================
     GALERIES (Leaflet)
     ========================= */
  function initGaleriesPage() {
    const mapDiv = document.getElementById("map");
    const listDiv = document.getElementById("list");

    // pas la page galeries => on sort sans rien faire
    if (!mapDiv || !listDiv) return;

    // Leaflet pas chargé (CDN injoignable) => message à la place de la carte
    if (!window.L) {
      console.error("Leaflet n'a pas pu être chargé.");
      mapDiv.innerHTML = `<p style="padding:20px;color:rgba(255,255,255,.75)">${t("La carte n'a pas pu être chargée. La liste des galeries reste disponible.")}</p>`;
    }

    const qInput = document.getElementById("q");
    const resetBtn = document.getElementById("reset");
    const metaEl = document.getElementById("meta");

    // Données (tu peux remplacer par window.GALLERIES_DATA depuis le HTML si tu veux)
    const galleries = Array.isArray(window.GALLERIES_DATA) && window.GALLERIES_DATA.length
      ? window.GALLERIES_DATA
      : [
          { name:"Galerie Rue Toulouse (French Art Network)", city:"Laguna Beach", country:"USA", phone:"(949) 549-4546", address:"390 S. Coast Hwy, Laguna Beach, CA 92651", website:"https://www.frenchart.net", lat:33.5427, lng:-117.7831 },
          { name:"Artclub Gallery", city:"Lyon", country:"France", phone:"+33 (0)4 78 37 47 37", address:"22 Place Bellecour, 69002 Lyon", website:"https://www.artclub.fr", lat:45.7579, lng:4.8320 },
          { name:"Artclub Gallery", city:"Paris", country:"France", phone:"+33 (0)1 47 03 42 20", address:"172 Rue de Rivoli, 75001 Paris", website:"https://www.artclub.fr", lat:48.8619, lng:2.3341 },
          { name:"French Art Network — New Orleans", city:"New Orleans", country:"USA", phone:"(504) 581-5881", address:"509 Rue Royale, New Orleans, LA 70130", website:"https://www.frenchart.net", lat:29.9574, lng:-90.0620 },
          { name:"French Art Network — Carmel-by-the-Sea", city:"Carmel-by-the-Sea", country:"USA", phone:"(931) 625-3456", address:"San Carlos St, Carmel-by-the-Sea, CA 93921", website:"https://www.frenchart.net", lat:36.5552, lng:-121.9233 },
        ];

    function escapeHtml(s) {
      return String(s ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    const hasMap = !!window.L;
    let map = null;
    let group = null;
    let markers = [];

    if (hasMap) {
      map = L.map(mapDiv, {
        scrollWheelZoom: true,
        // pas de zone vide au-delà des pôles (bande sombre en haut de la carte)
        maxBounds: [[-85, -180], [85, 180]],
        maxBoundsViscosity: 1,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);
      group = L.featureGroup().addTo(map);
    }

    function popupHtml(g) {
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${g.lat},${g.lng}`;
      const site = g.website
        ? `<a class="link" href="${escapeHtml(g.website)}" target="_blank" rel="noopener noreferrer">${t("site")}</a>`
        : "";
      return `
        <div style="min-width:220px">
          <div style="font-weight:800;margin:0 0 6px">${escapeHtml(g.name)}</div>
          <div style="font-size:13px;line-height:1.35;opacity:.9">
            ${escapeHtml(g.address)}<br>${escapeHtml(g.city)} · ${escapeHtml(t(g.country))}
          </div>
          <div style="margin-top:10px;font-size:13px">
            <a class="link" href="${mapsUrl}" target="_blank" rel="noopener noreferrer">${t("itinéraire")}</a>
            ${site ? " · " + site : ""}
          </div>
        </div>
      `;
    }

    function safeInvalidate() {
      if (!map) return;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => map.invalidateSize());
      });
    }

    function renderMarkers(list) {
      if (!map) return;
      group.clearLayers();
      markers = [];

      list.forEach((g) => {
        const m = L.circleMarker([g.lat, g.lng], {
          radius: 7, color: "#02253A", weight: 2, fillColor: "#fff", fillOpacity: 1,
        }).addTo(group);
        m.bindPopup(popupHtml(g));
        markers.push(m);
      });

      if (list.length) map.fitBounds(group.getBounds().pad(0.18));
      else map.setView([20, 0], 2);

      safeInvalidate();
    }

    function renderList(list) {
      listDiv.innerHTML = "";

      list.forEach((g, idx) => {
        const div = document.createElement("div");
        div.className = "item";
        div.innerHTML = `
          <p class="name">${escapeHtml(g.name)}</p>
          <p class="sub">
            ${escapeHtml(g.city)} · ${escapeHtml(t(g.country))}<br>
            ${escapeHtml(g.address)}<br>
            ${g.phone ? escapeHtml(g.phone) + "<br>" : ""}
            ${g.website ? `<a class="link" href="${escapeHtml(g.website)}" target="_blank" rel="noopener noreferrer">${t("site")}</a> <span> · </span>` : ""}
            <a class="link" href="https://www.google.com/maps/dir/?api=1&destination=${g.lat},${g.lng}" target="_blank" rel="noopener noreferrer">${t("itinéraire")}</a>
          </p>
        `;

        div.addEventListener("click", () => {
          [...listDiv.querySelectorAll(".item")].forEach((x) => x.classList.remove("is-active"));
          div.classList.add("is-active");

          const m = markers[idx];
          if (m) {
            map.setView(m.getLatLng(), Math.max(map.getZoom(), 6), { animate: true });
            m.openPopup();
          }
        });

        listDiv.appendChild(div);
      });
    }

    function apply() {
      const q = (qInput?.value || "").trim().toLowerCase();

      const filtered = galleries.filter((g) => {
        const hay = `${g.name} ${g.city} ${g.country} ${g.address}`.toLowerCase();
        return !q || hay.includes(q);
      });

      if (metaEl) metaEl.textContent = `${filtered.length} ${t(filtered.length > 1 ? "galeries" : "galerie")}`;

      renderList(filtered);
      renderMarkers(filtered);
    }

    // Observateur taille (super important quand la map est dans une grid)
    if (hasMap) {
      new ResizeObserver(() => safeInvalidate()).observe(mapDiv);
      window.addEventListener("resize", safeInvalidate);
    }

    // Events
    if (qInput) qInput.addEventListener("input", apply);
    if (resetBtn) resetBtn.addEventListener("click", () => {
      if (qInput) qInput.value = "";
      apply();
    });

    // init
    apply();
    safeInvalidate();
  }
})();

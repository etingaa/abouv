// script.js — page Galeries uniquement (carte Leaflet + liste + filtres).
// Chargé par galeries.html après Leaflet et expos-data.js. Ne fait rien si #map / #list sont absents.
//
// - Filtres Pays / Ville + recherche : même barre que le portfolio et les expositions.
//   Ce qui ne correspond pas s'estompe (liste et carte), la carte se recadre sur le reste.
// - Carte et liste reliées : survoler une galerie fait pulser son point (et inversement),
//   cliquer vole jusqu'à elle.
// - Chaque galerie indique ses expositions (expos-data.js) avec un lien vers la ligne du temps filtrée.

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

  const ICON = {
    site: '<path d="M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14z"/><path d="M3 10h14M10 3c2 2 2.8 4.4 2.8 7s-.8 5-2.8 7c-2-2-2.8-4.4-2.8-7S8 5 10 3z"/>',
    route: '<path d="M4 16 16 4"/><path d="M8 4h8v8"/>',
    call: '<path d="M5 3h3l1.5 4-2 1.3a9 9 0 0 0 4.2 4.2L13 10.5l4 1.5v3a2 2 0 0 1-2 2A13 13 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  };

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
  const uniq = (arr) => [...new Set(arr)].sort((a, b) => ("" + a).localeCompare("" + b, "fr"));
  const svg = (d) => `<svg viewBox="0 0 20 20" aria-hidden="true">${d}</svg>`;

  function initGaleriesPage() {
    const mapDiv = document.getElementById("map");
    const listDiv = document.getElementById("list");
    if (!mapDiv || !listDiv) return;

    const els = {
      q: document.getElementById("q"),
      count: document.getElementById("count"),
      groups: document.getElementById("groups"),
      subtabs: document.getElementById("subtabs"),
    };
    const galleries = GALLERIES.map((g) => ({ ...g, expoList: exposOf(g) }));

    /* =========================
       EXPOSITIONS DE CHAQUE GALERIE
       ========================= */
    function exposOf(g) {
      const all = window.EXPOS || [];
      if (!g.expos) return [];
      return all.filter((e) => e.title.includes(g.expos.title) && e.city.includes(g.expos.city))
                .sort((a, b) => a.year - b.year);
    }
    function exposLine(g) {
      const n = g.expoList.length;
      if (!n) return "";
      const first = g.expoList[0].year, last = g.expoList[n - 1].year;
      const text = n > 1
        ? `${n} ${t("expositions")} ${t("ici depuis")} ${first}`
        : `1 ${t("exposition")} ${t("ici en")} ${last}`;
      return `<a class="galExpos" href="expositions.html?q=${encodeURIComponent(g.expos.title)}">${escapeHtml(text)}<span aria-hidden="true">→</span></a>`;
    }

    /* =========================
       FILTRES (même fonctionnement que le portfolio)
       ========================= */
    const filters = { q: "", country: new Set(), city: new Set() };
    const GROUPS = {
      country: { all: "Tous",   of: (g) => g.country, label: (v) => t(v) },
      city:    { all: "Toutes", of: (g) => g.city,    label: (v) => v },
    };
    Object.values(GROUPS).forEach((grp) => { grp.values = uniq(galleries.map(grp.of)); });
    let activeGroup = null;

    function matches(g, ignore) {
      const q = filters.q.trim().toLowerCase();
      const hay = `${g.name} ${g.city} ${g.country} ${t(g.country)} ${g.address}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      for (const key of Object.keys(GROUPS)) {
        if (key !== ignore && filters[key].size && !filters[key].has(GROUPS[key].of(g))) return false;
      }
      return true;
    }
    const hasFilters = () => Boolean(filters.q.trim() || filters.country.size || filters.city.size);

    function groupValue(name) {
      const grp = GROUPS[name];
      const vals = [...filters[name]].map(grp.label);
      if (!vals.length) return t(grp.all);
      return vals[0] + (vals.length > 1 ? ` +${vals.length - 1}` : "");
    }

    function renderTabs() {
      els.groups.querySelectorAll(".tab").forEach((btn) => {
        const name = btn.dataset.group, on = filters[name].size > 0;
        btn.setAttribute("aria-expanded", String(name === activeGroup));
        btn.parentElement.classList.toggle("has-filter", on);
        btn.nextElementSibling.hidden = !on;
        btn.querySelector(".tab__value").textContent = groupValue(name);
      });

      els.subtabs.hidden = !activeGroup;
      if (!activeGroup) return;
      const grp = GROUPS[activeGroup], set = filters[activeGroup];
      const pool = galleries.filter((g) => matches(g, activeGroup));
      els.subtabs.innerHTML = "";
      [{ value: null, n: pool.length }]
        .concat(grp.values.map((v) => ({ value: v, n: pool.filter((g) => grp.of(g) === v).length })))
        .forEach((it) => {
          if (it.value !== null && !it.n && !set.has(it.value)) return;
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "tab tab--sub";
          btn.setAttribute("aria-pressed", String(it.value === null ? set.size === 0 : set.has(it.value)));
          btn.innerHTML = `<span>${escapeHtml(it.value === null ? t(grp.all) : grp.label(it.value))}</span><span class="tab__count">${it.n}</span>`;
          btn.addEventListener("click", () => {
            if (it.value === null) set.clear();
            else if (set.has(it.value)) set.delete(it.value);
            else set.add(it.value);
            apply(true);
          });
          els.subtabs.appendChild(btn);
        });
    }

    /* =========================
       CARTE
       ========================= */
    let map = null;
    if (window.L) {
      map = L.map(mapDiv, {
        scrollWheelZoom: false, // la molette fait défiler la page ; zoom avec les boutons ou Ctrl + molette
        maxBounds: [[-85, -180], [85, 180]],
        maxBoundsViscosity: 1,
        zoomSnap: 0.25,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);
      mapDiv.addEventListener("wheel", (e) => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        map.setZoom(map.getZoom() + (e.deltaY < 0 ? 0.5 : -0.5));
      }, { passive: false });
    } else {
      console.error("Leaflet n'a pas pu être chargé.");
      mapDiv.innerHTML = `<p style="padding:20px;color:rgba(255,255,255,.75)">${t("La carte n'a pas pu être chargée. La liste des galeries reste disponible.")}</p>`;
    }

    const pinIcon = () => L.divIcon({ className: "galPin", html: "<i></i>", iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -10] });

    function popupHtml(g) {
      return `<div class="galPop"><strong>${escapeHtml(g.name)}</strong>
        <span>${escapeHtml(g.city)} · ${escapeHtml(t(g.country))}</span></div>`;
    }

    /* =========================
       LISTE
       ========================= */
    const rows = galleries.map((g, idx) => {
      const el = document.createElement("article");
      el.className = "galItem";
      el.tabIndex = 0;
      const route = `https://www.google.com/maps/dir/?api=1&destination=${g.lat},${g.lng}`;
      const tel = g.phone ? `tel:${g.phone.replace(/[^\d+]/g, "")}` : "";
      el.innerHTML = `
        <p class="galItem__name">${escapeHtml(g.name)}</p>
        <p class="galItem__place">${escapeHtml(g.city)} · ${escapeHtml(t(g.country))}</p>
        <p class="galItem__addr">${escapeHtml(g.address)}</p>
        <div class="galActions">
          ${g.website ? `<a class="galBtn" href="${escapeHtml(g.website)}" target="_blank" rel="noopener noreferrer">${svg(ICON.site)}${t("Site")}</a>` : ""}
          <a class="galBtn" href="${route}" target="_blank" rel="noopener noreferrer">${svg(ICON.route)}${t("Itinéraire")}</a>
          ${tel ? `<a class="galBtn" href="${tel}">${svg(ICON.call)}${t("Appeler")}</a>` : ""}
        </div>
        ${exposLine(g)}`;
      listDiv.appendChild(el);

      let marker = null;
      if (map) {
        marker = L.marker([g.lat, g.lng], { icon: pinIcon(), keyboard: false, riseOnHover: true }).addTo(map);
        marker.bindPopup(popupHtml(g), { closeButton: false, offset: [0, -2] });
        marker.on("mouseover", () => setHot(idx, true, true));
        marker.on("mouseout", () => setHot(idx, false));
        marker.on("click", () => select(idx, { fromMap: true }));
      }

      el.addEventListener("mouseenter", () => setHot(idx, true));
      el.addEventListener("mouseleave", () => setHot(idx, false));
      el.addEventListener("focus", () => setHot(idx, true));
      el.addEventListener("blur", () => setHot(idx, false));
      el.addEventListener("click", (e) => { if (!e.target.closest("a")) select(idx); });
      el.addEventListener("keydown", (e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target === el) { e.preventDefault(); select(idx); }
      });
      return { g, el, marker };
    });

    // survol : le point pulse sur la carte / la ligne s'allume dans la liste
    function setHot(idx, on, fromMap) {
      const r = rows[idx];
      r.el.classList.toggle("is-hot", on);
      if (r.marker) r.marker.getElement()?.classList.toggle("is-hot", on);
      if (on && fromMap) {
        // la liste défile jusqu'à la galerie survolée sur la carte (grand écran)
        const box = listDiv.getBoundingClientRect(), it = r.el.getBoundingClientRect();
        if (it.top < box.top || it.bottom > box.bottom) listDiv.scrollBy({ top: it.top - box.top - 8, behavior: "smooth" });
      }
    }

    // sélection : la carte vole jusqu'à la galerie
    const phone = matchMedia("(max-width:1050px)");
    function select(idx, { fromMap = false } = {}) {
      rows.forEach((r, i) => {
        r.el.classList.toggle("is-active", i === idx);
        r.marker?.getElement()?.classList.toggle("is-active", i === idx);
      });
      const r = rows[idx];
      if (map) {
        map.flyTo([r.g.lat, r.g.lng], Math.max(map.getZoom(), 11), { duration: 1.1 });
        map.once("moveend", () => r.marker.openPopup());
      }
      // carte au-dessus de la liste (téléphone) : on remonte jusqu'à la carte
      if (phone.matches && !fromMap) {
        const bar = document.querySelector(".toolbar").getBoundingClientRect().bottom;
        window.scrollTo({ top: window.scrollY + mapDiv.getBoundingClientRect().top - bar - 12, behavior: "smooth" });
      }
      if (fromMap && phone.matches) r.el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    /* =========================
       RENDU
       ========================= */
    function apply(fromFilter) {
      const on = hasFilters();
      const hits = [];
      rows.forEach((r) => {
        const ok = matches(r.g);
        r.el.classList.toggle("is-dim", on && !ok);
        r.marker?.getElement()?.classList.toggle("is-dim", on && !ok);
        if (ok) hits.push(r);
      });
      const label = `${hits.length} ${t(hits.length > 1 ? "galeries" : "galerie")}`;
      els.count.textContent = label;
      els.q.placeholder = `${t("Rechercher parmi")} ${label}`;
      renderTabs();

      // la carte se recadre sur les galeries qui correspondent
      if (map) {
        const pts = (hits.length ? hits : rows).map((r) => [r.g.lat, r.g.lng]);
        const opts = { padding: [48, 48], maxZoom: 11, duration: fromFilter ? 0.9 : 0 };
        if (pts.length === 1) map[fromFilter ? "flyTo" : "setView"](pts[0], 11, fromFilter ? { duration: 0.9 } : {});
        else map[fromFilter ? "flyToBounds" : "fitBounds"](pts, opts);
      }
    }

    // Leaflet doit connaître la taille réelle de la carte (grille, changement de largeur)
    const invalidate = () => requestAnimationFrame(() => requestAnimationFrame(() => map && map.invalidateSize()));
    if (map) {
      new ResizeObserver(invalidate).observe(mapDiv);
      window.addEventListener("resize", invalidate);
    }

    /* =========================
       ÉVÉNEMENTS
       ========================= */
    els.q.addEventListener("input", () => { filters.q = els.q.value || ""; apply(true); });
    els.groups.addEventListener("click", (e) => {
      const clear = e.target.closest(".group__clear");
      if (clear) { filters[clear.parentElement.dataset.group].clear(); apply(true); return; }
      const btn = e.target.closest(".tab");
      if (!btn) return;
      activeGroup = activeGroup === btn.dataset.group ? null : btn.dataset.group;
      renderTabs();
    });
    document.addEventListener("click", (e) => {
      const inside = e.composedPath().some((n) => n.classList && n.classList.contains("toolbar"));
      if (activeGroup && !inside) { activeGroup = null; renderTabs(); }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && activeGroup) {
        const btn = els.groups.querySelector(`.tab[data-group="${activeGroup}"]`);
        activeGroup = null; renderTabs(); btn.focus();
      }
    });

    apply(false);
    invalidate();
  }
})();

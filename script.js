// script.js — SAFE GLOBAL (toutes pages)
// - Nav active robuste
// - Scroll doux ancres
// - Galeries (Leaflet) uniquement si la page a #map + #list + Leaflet chargé
// IMPORTANT: rien ici ne doit casser Portfolio si la page n'a pas les éléments.

(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    initActiveNav();
    initSmoothAnchors();
    initGaleriesPage(); // ne fait rien si pas sur galeries.html
  });

  /* =========================
     DEBUG (optionnel)
     ========================= */
  function dbg(msg) {
    const d = document.getElementById("debug");
    if (d) {
      d.style.display = "block";
      d.textContent = msg;
    } else {
      console.log("[DEBUG]", msg);
    }
  }

  /* =========================
     1) NAV ACTIVE (robuste)
     ========================= */
  function initActiveNav() {
    const navLinks = Array.from(document.querySelectorAll(".top__nav .nav__link"));
    if (!navLinks.length) return;

    const origin = window.location.origin;

    function fileFromPath(pathname) {
      const clean = (pathname || "").replace(/\/+$/, "");
      const last = clean.split("/").pop();
      return last ? last : "index.html";
    }

    function fileFromHref(href) {
      if (!href) return null;
      if (href.startsWith("#")) return null;
      if (/^(mailto:|tel:|javascript:)/i.test(href)) return null;

      const u = new URL(href, origin);
      if (u.origin !== origin) return null;
      return fileFromPath(u.pathname);
    }

    const current = new URL(window.location.href);
    const currentFile = fileFromPath(current.pathname);

    navLinks.forEach((link) => {
      link.classList.remove("is-active");

      const href = link.getAttribute("href") || "";
      const linkFile = fileFromHref(href);
      if (!linkFile) return;

      const isIndex =
        (currentFile === "index.html" || currentFile === "") &&
        (linkFile === "index.html" || linkFile === "");

      if (linkFile === currentFile || isIndex) link.classList.add("is-active");
    });
  }

  /* =========================
     2) SCROLL DOUX ANCRES
     ========================= */
  function initSmoothAnchors() {
    const prefersReducedMotion =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const HEADER_OFFSET = 0;

    function scrollToId(hash, push = true) {
      if (!hash || hash === "#") return;
      const target = document.querySelector(hash);
      if (!target) return;

      const y = target.getBoundingClientRect().top + window.pageYOffset - HEADER_OFFSET;

      window.scrollTo({
        top: y,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });

      if (push) history.pushState(null, "", hash);

      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }

    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const hash = a.getAttribute("href");
        if (!hash || hash === "#") return;
        if (!document.querySelector(hash)) return;
        e.preventDefault();
        scrollToId(hash, true);
      });
    });

    window.addEventListener("popstate", () => {
      if (window.location.hash) scrollToId(window.location.hash, false);
    });

    if (window.location.hash) {
      setTimeout(() => scrollToId(window.location.hash, false), 0);
    }
  }

  /* =========================
     3) GALERIES (Leaflet) — SAFE
     ========================= */
  function initGaleriesPage() {
    const mapDiv = document.getElementById("map");
    const listDiv = document.getElementById("list");

    // pas la page galeries => on sort sans rien faire
    if (!mapDiv || !listDiv) return;

    // Leaflet pas chargé => on ne casse rien
    if (!window.L) {
      dbg("❌ Leaflet pas chargé (window.L absent).");
      return;
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

    // ✅ init map
    const map = L.map(mapDiv, { scrollWheelZoom: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    const group = L.featureGroup().addTo(map);
    let markers = [];

    function popupHtml(g) {
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${g.lat},${g.lng}`;
      const site = g.website
        ? `<a class="link" href="${g.website}" target="_blank" rel="noopener noreferrer">site</a>`
        : "";
      return `
        <div style="min-width:220px">
          <div style="font-weight:800;margin:0 0 6px">${escapeHtml(g.name)}</div>
          <div style="font-size:13px;line-height:1.35;opacity:.9">
            ${escapeHtml(g.address)}<br>${escapeHtml(g.city)} · ${escapeHtml(g.country)}
          </div>
          <div style="margin-top:10px;font-size:13px">
            <a class="link" href="${mapsUrl}" target="_blank" rel="noopener noreferrer">itinéraire</a>
            ${site ? " · " + site : ""}
          </div>
        </div>
      `;
    }

    function safeInvalidate() {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => map.invalidateSize());
      });
    }

    function renderMarkers(list) {
      group.clearLayers();
      markers = [];

      list.forEach((g) => {
        const m = L.marker([g.lat, g.lng]).addTo(group);
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
            ${escapeHtml(g.city)} · ${escapeHtml(g.country)}<br>
            ${escapeHtml(g.address)}<br>
            ${g.phone ? escapeHtml(g.phone) + "<br>" : ""}
            ${g.website ? `<a class="link" href="${g.website}" target="_blank" rel="noopener noreferrer">site</a>` : ""}
            <span> · </span>
            <a class="link" href="https://www.google.com/maps/dir/?api=1&destination=${g.lat},${g.lng}" target="_blank" rel="noopener noreferrer">itinéraire</a>
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

      if (metaEl) metaEl.textContent = `${filtered.length} galerie${filtered.length > 1 ? "s" : ""}`;

      renderList(filtered);
      renderMarkers(filtered);
    }

    // Observateur taille (super important quand la map est dans une grid)
    const ro = new ResizeObserver(() => safeInvalidate());
    ro.observe(mapDiv);
    window.addEventListener("resize", safeInvalidate);

    // Events
    if (qInput) qInput.addEventListener("input", apply);
    if (resetBtn) resetBtn.addEventListener("click", () => {
      if (qInput) qInput.value = "";
      apply();
    });

    // init
    dbg("✅ Galeries init OK (si tu vois des items à droite, c'est bon).");
    apply();
    safeInvalidate();
  }
})();

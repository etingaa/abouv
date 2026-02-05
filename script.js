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

    function setActiveNav() {
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

    setActiveNav();
  }

  /* =========================
     2) SCROLL DOUX ANCRES
     ========================= */
  function initSmoothAnchors() {
    const prefersReducedMotion =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // si tu rends le header sticky plus tard, mets un offset ici
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
    // Détection simple : si pas de #map ou #list, on ne fait rien
    const mapDiv = document.getElementById("map");
    const listDiv = document.getElementById("list");
    if (!mapDiv || !listDiv) return;

    // Leaflet pas chargé => on ne casse rien
    if (!window.L) {
      console.warn("[Galeries] Leaflet non chargé (window.L absent).");
      return;
    }

    const qInput = document.getElementById("q");
    const resetBtn = document.getElementById("reset");
    const metaEl = document.getElementById("meta");

    // ✅ Tu peux mettre tes galeries dans window.GALLERIES_DATA depuis le HTML si tu veux
    const galleries = Array.isArray(window.GALLERIES_DATA) && window.GALLERIES_DATA.length
      ? window.GALLERIES_DATA
      : [
          { name:"Galerie Rue Toulouse (French Art Network)", city:"Laguna Beach", country:"USA", phone:"(949) 549-4546", address:"390 S. Coast Hwy, Laguna Beach, CA 92651", website:"https://www.frenchart.net", lat:33.5427, lng:-117.7831 },
          { name:"Galerie Page", city:"Biarritz", country:"France", phone:"05 59 24 97 52", address:"37 Rue Mazagran, 64200 Biarritz", website:"https://www.galeriepage-biarritz.com", lat:43.4832, lng:-1.5586 },
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

    // --- MAP INIT ---
    const map = L.map(mapDiv, { scrollWheelZoom: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap"
    }).addTo(map);

    const group = L.featureGroup().addTo(map);
    let markers = [];

    function makePopup(g) {
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${g.lat},${g.lng}`;
      const site = g.website
        ? `<a class="link" href="${g.website}" target="_blank" rel="noopener noreferrer">site</a>`
        : "";

      return `
        <div>
          <p style="margin:0 0 6px;font-weight:800">${escapeHtml(g.name)}</p>
          <p style="margin:0;color:rgba(255,255,255,.82);font-size:13px;line-height:1.4">
            ${escapeHtml(g.address)}<br>${escapeHtml(g.city)} · ${escapeHtml(g.country)}
          </p>
          <p style="margin:10px 0 0;font-size:13px">
            <a class="link" href="${mapsUrl}" target="_blank" rel="noopener noreferrer">itinéraire</a>
            ${site ? " · " + site : ""}
          </p>
        </div>
      `;
    }

    function renderMarkers(list) {
      group.clearLayers();
      markers = [];

      list.forEach((g) => {
        const m = L.marker([g.lat, g.lng]).addTo(group);
        m.bindPopup(makePopup(g));
        markers.push(m);
      });

      if (list.length) {
        map.fitBounds(group.getBounds().pad(0.18));
      } else {
        map.setView([20, 0], 2);
      }

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
          [...listDiv.querySelectorAll(".item")].forEach(x => x.classList.remove("is-active"));
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

    function applyFilter() {
      const q = (qInput?.value || "").trim().toLowerCase();

      const filtered = galleries.filter(g => {
        const hay = `${g.name} ${g.city} ${g.country} ${g.address}`.toLowerCase();
        return !q || hay.includes(q);
      });

      if (metaEl) metaEl.textContent = `${filtered.length} galerie${filtered.length > 1 ? "s" : ""}`;

      renderList(filtered);
      renderMarkers(filtered);
    }

    // ✅ Leaflet “taille mauvaise” — correction solide
    function safeInvalidate() {
      // 2 frames + timeout : marche même après layout CSS
      requestAnimationFrame(() => {
        requestAnimationFrame(() => map.invalidateSize());
      });
    }

    // ResizeObserver = quand ta carte change de taille, Leaflet recalcule
    const ro = new ResizeObserver(() => safeInvalidate());
    ro.observe(mapDiv);

    window.addEventListener("resize", safeInvalidate);

    // Events UI
    if (qInput) qInput.addEventListener("input", applyFilter);
    if (resetBtn) resetBtn.addEventListener("click", () => {
      if (qInput) qInput.value = "";
      applyFilter();
    });

    // init
    applyFilter();
    safeInvalidate();
  }
})();

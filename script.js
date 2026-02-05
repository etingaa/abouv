// script.js — global safe (toutes pages)

document.addEventListener("DOMContentLoaded", () => {
  setActiveNav();
  setupSmoothAnchors();
  setupDropdownsGlobal();
  setupImageFallback();
  initGalleriesPage(); // version sans Leaflet (MyMaps embed)
});

/* =========================
   1) NAV: lien actif (robuste)
   ========================= */

function setActiveNav() {
  const navLinks = Array.from(document.querySelectorAll(".top__nav .nav__link"));
  if (!navLinks.length) return;

  const origin = window.location.origin;

  const fileFromPath = (pathname) => {
    const clean = (pathname || "").replace(/\/+$/, "");
    const last = clean.split("/").pop();
    return last ? last : "index.html";
  };

  const fileFromHref = (href) => {
    if (!href) return null;
    if (href.startsWith("#")) return null;
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return null;

    const u = new URL(href, origin);
    if (u.origin !== origin) return null;
    return fileFromPath(u.pathname);
  };

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

    if (linkFile === currentFile || isIndex) {
      link.classList.add("is-active");
    }
  });
}

/* =========================
   2) ANCRES: scroll doux + accessibilité
   ========================= */

function setupSmoothAnchors() {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Si ton header devient sticky, mets sa hauteur ici
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
   3) DROPDOWNS: ferme au clic extérieur + Escape
   (utile Portfolio: .dd)
   ========================= */

function setupDropdownsGlobal() {
  const dropdowns = Array.from(document.querySelectorAll(".dd"));
  if (!dropdowns.length) return;

  const closeAll = () => {
    dropdowns.forEach((dd) => {
      dd.classList.remove("is-open");
      const btn = dd.querySelector("button[aria-expanded]");
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  };

  dropdowns.forEach((dd) => {
    const btn = dd.querySelector(".pillBtn");
    const panel = dd.querySelector(".ddPanel");
    if (!btn || !panel) return;

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = dd.classList.contains("is-open");
      closeAll();
      if (!isOpen) {
        dd.classList.add("is-open");
        btn.setAttribute("aria-expanded", "true");
      }
    });

    panel.addEventListener("click", (e) => e.stopPropagation());
  });

  document.addEventListener("click", closeAll);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAll();
  });
}

/* =========================
   4) IMAGES: si une image casse → masque l'item
   (évite les carrés vides)
   ========================= */

function setupImageFallback() {
  const grid = document.getElementById("masonry");
  if (!grid) return;

  grid.addEventListener(
    "error",
    (e) => {
      const img = e.target;
      if (!(img instanceof HTMLImageElement)) return;

      console.warn("Image introuvable:", img.src);

      const piece = img.closest(".piece");
      if (piece) piece.style.display = "none";
    },
    true
  );
}

/* =========================
   5) GALERIES (sans Leaflet)
   - Carte = iframe Google My Maps (ou Google Maps embed)
   - Liste/search à droite
   - Clic sur une carte -> ouvre itinéraire
   ========================= */

function initGalleriesPage() {
  // On détecte la page via la présence de #list et #mapFrame (ou au moins #list)
  const listEl = document.getElementById("list");
  const qEl = document.getElementById("q");
  const resetEl = document.getElementById("reset");
  const metaEl = document.getElementById("meta");

  if (!listEl || !qEl || !resetEl) return; // pas la page galeries

  // 👉 Mets ici tes galeries (comme avant)
  const galleries = [
    {
      name: "Galerie Rue Toulouse (French Art Network)",
      city: "Laguna Beach",
      country: "USA",
      phone: "(949) 549-4546",
      address: "390 S. Coast Hwy, Laguna Beach, CA 92651",
      website: "https://www.frenchart.net",
      lat: 33.5427,
      lng: -117.7831,
    },
    {
      name: "Galerie Page",
      city: "Biarritz",
      country: "France",
      phone: "05 59 24 97 52",
      address: "37 Rue Mazagran, 64200 Biarritz",
      website: "https://www.galeriepage-biarritz.com",
      lat: 43.4832,
      lng: -1.5586,
    },
    {
      name: "Artclub Gallery",
      city: "Lyon",
      country: "France",
      phone: "+33 (0)4 78 37 47 37",
      address: "22 Place Bellecour, 69002 Lyon",
      website: "https://www.artclub.fr",
      lat: 45.7579,
      lng: 4.832,
    },
    {
      name: "Artclub Gallery",
      city: "Paris",
      country: "France",
      phone: "+33 (0)1 47 03 42 20",
      address: "172 Rue de Rivoli, 75001 Paris",
      website: "https://www.artclub.fr",
      lat: 48.8619,
      lng: 2.3341,
    },
    {
      name: "French Art Network — New Orleans",
      city: "New Orleans",
      country: "USA",
      phone: "(504) 581-5881",
      address: "509 Rue Royale, New Orleans, LA 70130",
      website: "https://www.frenchart.net",
      lat: 29.9574,
      lng: -90.062,
    },
    {
      name: "French Art Network — Carmel-by-the-Sea",
      city: "Carmel-by-the-Sea",
      country: "USA",
      phone: "(931) 625-3456",
      address: "San Carlos St, Carmel-by-the-Sea, CA 93921",
      website: "https://www.frenchart.net",
      lat: 36.5552,
      lng: -121.9233,
    },
  ];

  const escapeHtml = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const dirUrl = (g) =>
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${g.lat},${g.lng}`)}`;

  function renderList(list) {
    listEl.innerHTML = "";

    list.forEach((g) => {
      const div = document.createElement("div");
      div.className = "galItem"; // ⚠️ doit exister dans ton CSS (ou remplace par "item")

      div.innerHTML = `
        <p class="galName">${escapeHtml(g.name)}</p>
        <p class="galSub">
          ${escapeHtml(g.city)} · ${escapeHtml(g.country)}<br>
          ${escapeHtml(g.address)}<br>
          ${g.phone ? escapeHtml(g.phone) + "<br>" : ""}
          ${g.website ? `<a class="galLink" href="${g.website}" target="_blank" rel="noopener noreferrer">site</a>` : ""}
          <span> · </span>
          <a class="galLink" href="${dirUrl(g)}" target="_blank" rel="noopener noreferrer">itinéraire</a>
        </p>
      `;

      // Clic sur carte = ouvre itinéraire (simple et fiable)
      div.addEventListener("click", () => {
        window.open(dirUrl(g), "_blank", "noopener,noreferrer");
      });

      listEl.appendChild(div);
    });
  }

  function apply() {
    const q = (qEl.value || "").trim().toLowerCase();
    const filtered = galleries.filter((g) => {
      const hay = `${g.name} ${g.city} ${g.country} ${g.address}`.toLowerCase();
      return !q || hay.includes(q);
    });

    if (metaEl) metaEl.textContent = `${filtered.length} galerie${filtered.length > 1 ? "s" : ""}`;
    renderList(filtered);
  }

  qEl.addEventListener("input", apply);
  resetEl.addEventListener("click", () => {
    qEl.value = "";
    apply();
  });

  apply();
}

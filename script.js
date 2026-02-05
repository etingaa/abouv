// script.js (global)
// - Nav actif
// - Scroll doux sur ancres
// - Galeries Leaflet SEULEMENT si #map existe

document.addEventListener("DOMContentLoaded", () => {
  initActiveNav();
  initSmoothAnchors();
  initGalleriesMap(); // ne fait rien si #map absent
});

/* =========================
   NAV ACTIF
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
   SCROLL ANCRES
   ========================= */
function initSmoothAnchors() {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const header = document.querySelector(".top");
  const HEADER_OFFSET = header ? header.offsetHeight : 0;

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
   GALERIES (Leaflet) - page only
   ========================= */
function initGalleriesMap() {
  const mapDiv = document.getElementById("map");
  const listDiv = document.getElementById("list");
  const qInput = document.getElementById("q");
  const resetBtn = document.getElementById("reset");
  const meta = document.getElementById("meta");

  // ✅ Si on n’est pas sur galeries.html => on sort
  if (!mapDiv || !listDiv) return;

  // ✅ Leaflet doit être chargé sur cette page
  if (!window.L) {
    console.error("Leaflet non chargé (window.L absent). Vérifie les <script> Leaflet dans galeries.html");
    return;
  }

  const galleries = [
    { name:"Galerie Rue Toulouse (French Art Network)", city:"Laguna Beach", country:"USA", phone:"(949) 549-4546", address:"390 S. Coast Hwy, Laguna Beach, CA 92651", website:"https://www.frenchart.net", lat:33.5427, lng:-117.7831 },
    { name:"Galerie Page", city:"Biarritz", country:"France", phone:"05 59 24 97 52", address:"37 Rue Mazagran, 64200 Biarritz", website:"https://www.galeriepage-biarritz.com", lat:43.4832, lng:-1.5586 },
    { name:"Artclub Gallery", city:"Lyon", country:"France", phone:"+33 (0)4 78 37 47 37", address:"22 Place Bellecour, 69002 Lyon", website:"https://www.artclub.fr", lat:45.7579, lng:4.8320 },
    { name:"Artclub Gallery", city:"Paris", country:"France", phone:"+33 (0)1 47 03 42 20", address:"172 Rue de Rivoli, 75001 Paris", website:"https://www.artclub.fr", lat:48.8619, lng:2.3341 },
    { name:"French Art Network — New Orleans", city:"New Orleans", country:"USA", phone:"(504) 581-5881", address:"509 Rue Royale, New Orleans, LA 70130", website:"https://www.frenchart.net", lat:29.9574, lng:-90.0620 },
    { name:"French Art Network — Carmel-by-the-Sea", city:"Carmel-by-the-Sea", country:"USA", phone:"(931) 625-3456", address:"San Carlos St, Carmel-by-the-Sea, CA 93921", website:"https://www.frenchart.net", lat:36.5552, lng:-121.9233 },
  ];

  function escapeHtml(s){
    return String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function makeDirUrl(g){
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(g.lat + "," + g.lng)}`;
  }

  function haystack(g){
    return `${g.name} ${g.city} ${g.country} ${g.address}`.toLowerCase();
  }

  const map = L.map("map", { scrollWheelZoom: true });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  const group = L.featureGroup().addTo(map);
  let markers = [];
  let filtered = galleries.slice();

  function fit(){
    if (!filtered.length) {
      map.setView([20,0], 2);
      return;
    }
    map.fitBounds(group.getBounds().pad(0.22));
  }

  function safeRefresh(){
    requestAnimationFrame(() => {
      map.invalidateSize();
      if (group.getLayers().length) fit();
    });
    setTimeout(() => {
      map.invalidateSize();
      if (group.getLayers().length) fit();
    }, 120);
  }

  function renderMarkers(){
    group.clearLayers();
    markers = [];

    filtered.forEach((g, idx) => {
      const m = L.marker([g.lat, g.lng]).addTo(group);
      m.on("click", () => setActive(idx));
      markers.push(m);
    });

    fit();
  }

  function renderList(){
    listDiv.innerHTML = "";
    filtered.forEach((g, idx) => {
      const div = document.createElement("div");
      div.className = "item";
      div.dataset.idx = String(idx);
      div.innerHTML = `
        <p class="name">${escapeHtml(g.name)}</p>
        <p class="sub">
          ${escapeHtml(g.city)} · ${escapeHtml(g.country)}<br>
          ${escapeHtml(g.address)}<br>
          ${g.phone ? escapeHtml(g.phone) + "<br>" : ""}
          ${g.website ? `<a class="link" href="${g.website}" target="_blank" rel="noopener noreferrer">site</a> · ` : ""}
          <a class="link" href="${makeDirUrl(g)}" target="_blank" rel="noopener noreferrer">itinéraire</a>
        </p>
      `;
      div.addEventListener("click", () => setActive(idx));
      listDiv.appendChild(div);
    });
  }

  function clearActive(){
    listDiv.querySelectorAll(".item.is-active").forEach(el => el.classList.remove("is-active"));
  }

  function setActive(idx){
    clearActive();
    const row = listDiv.querySelector(`[data-idx="${idx}"]`);
    row?.classList.add("is-active");

    const m = markers[idx];
    if (m){
      map.setView(m.getLatLng(), Math.max(map.getZoom(), 5), { animate: true });
      m.openPopup?.();
      row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  function apply(){
    const q = (qInput?.value || "").trim().toLowerCase();
    filtered = galleries.filter(g => !q || haystack(g).includes(q));

    if (meta) meta.textContent = `${filtered.length} galerie${filtered.length>1?"s":""}`;

    renderList();
    renderMarkers();
    safeRefresh();
  }

  qInput?.addEventListener("input", apply);
  resetBtn?.addEventListener("click", () => {
    if (qInput) qInput.value = "";
    apply();
  });

  window.addEventListener("resize", safeRefresh);

  apply();
  setTimeout(safeRefresh, 300);
}


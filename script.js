// script.js — site complet (nav active + galeries)

document.addEventListener("DOMContentLoaded", () => {
  setActiveNav();
  initGaleries(); // ne fait rien si on n'est pas sur galeries.html
});

/* =========================
   NAV ACTIVE (robuste)
   ========================= */
function setActiveNav(){
  const navLinks = Array.from(document.querySelectorAll(".top__nav .nav__link"));
  if(!navLinks.length) return;

  const origin = window.location.origin;

  function fileFromPath(pathname){
    const clean = (pathname || "").replace(/\/+$/, "");
    const last = clean.split("/").pop();
    return last ? last : "index.html";
  }

  function fileFromHref(href){
    if(!href) return null;
    if(href.startsWith("#")) return null;
    if(/^(mailto:|tel:|javascript:)/i.test(href)) return null;

    const u = new URL(href, origin);
    if(u.origin !== origin) return null;

    return fileFromPath(u.pathname);
  }

  const current = new URL(window.location.href);
  const currentFile = fileFromPath(current.pathname);

  navLinks.forEach((link) => {
    link.classList.remove("is-active");
    const linkFile = fileFromHref(link.getAttribute("href") || "");
    if(!linkFile) return;

    const isIndex =
      (currentFile === "index.html" || currentFile === "") &&
      (linkFile === "index.html" || linkFile === "");

    if(linkFile === currentFile || isIndex){
      link.classList.add("is-active");
    }
  });
}

/* =========================
   GALERIES (Leaflet)
   ========================= */
function initGaleries(){
  const mapDiv = document.getElementById("map");
  const listDiv = document.getElementById("galList");
  const qInput = document.getElementById("galQ");
  const resetBtn = document.getElementById("galReset");
  const meta = document.getElementById("galMeta");

  // pas la page galeries
  if(!mapDiv || !listDiv || !qInput || !resetBtn || !meta) return;

  if(!window.L){
    meta.textContent = "Erreur: Leaflet ne charge pas.";
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

  const map = L.map("map", { scrollWheelZoom: true });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  const group = L.featureGroup().addTo(map);
  let markers = [];

  function escapeHtml(s){
    return String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function popupHtml(g){
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${g.lat},${g.lng}`;
    const site = g.website ? `<a class="link" href="${g.website}" target="_blank" rel="noopener noreferrer">site</a>` : "";
    return `
      <div style="color:#fff">
        <p style="margin:0 0 6px;font-weight:800">${escapeHtml(g.name)}</p>
        <p style="margin:0;font-size:13px;line-height:1.4;opacity:.9">
          ${escapeHtml(g.address)}<br>${escapeHtml(g.city)} · ${escapeHtml(g.country)}
        </p>
        <p style="margin:10px 0 0;font-size:13px">
          <a class="link" href="${mapsUrl}" target="_blank" rel="noopener noreferrer">itinéraire</a>
          ${site ? " · " + site : ""}
        </p>
      </div>
    `;
  }

  function drawMarkers(list){
    group.clearLayers();
    markers = [];

    list.forEach((g) => {
      const m = L.marker([g.lat, g.lng]).addTo(group);
      m.bindPopup(popupHtml(g));
      markers.push(m);
    });

    if(list.length){
      map.fitBounds(group.getBounds().pad(0.18));
    }else{
      map.setView([20,0], 2);
    }
  }

  function renderList(list){
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
        listDiv.querySelectorAll(".item").forEach(x => x.classList.remove("is-active"));
        div.classList.add("is-active");

        const m = markers[idx];
        if(m){
          map.setView(m.getLatLng(), Math.max(map.getZoom(), 6), { animate:true });
          m.openPopup();
        }
      });

      listDiv.appendChild(div);
    });
  }

  function apply(){
    const q = (qInput.value || "").trim().toLowerCase();
    const filtered = galleries.filter(g => {
      const hay = `${g.name} ${g.city} ${g.country} ${g.address}`.toLowerCase();
      return !q || hay.includes(q);
    });

    meta.textContent = `${filtered.length} galerie${filtered.length > 1 ? "s" : ""}`;
    renderList(filtered);
    drawMarkers(filtered);

    // ✅ fix taille Leaflet (grid, fonts, etc.)
    requestAnimationFrame(() => map.invalidateSize());
    setTimeout(() => map.invalidateSize(), 80);
  }

  qInput.addEventListener("input", apply);
  resetBtn.addEventListener("click", () => { qInput.value = ""; apply(); });

  apply();

  // ✅ si l'utilisateur redimensionne
  window.addEventListener("resize", () => {
    map.invalidateSize();
    if(group.getLayers().length) map.fitBounds(group.getBounds().pad(0.18));
  });
}

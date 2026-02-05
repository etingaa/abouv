function initGaleriesPage() {
  // ====== mini debug visible (ne casse rien ailleurs)
  function getDebugEl() {
    let el = document.getElementById("debug-galeries");
    if (!el) {
      el = document.createElement("div");
      el.id = "debug-galeries";
      el.style.cssText =
        "position:fixed;left:12px;bottom:12px;z-index:99999;max-width:520px;" +
        "padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.18);" +
        "background:rgba(0,0,0,.55);color:#fff;font:13px/1.35 Inter,system-ui,sans-serif;" +
        "display:none";
      document.body.appendChild(el);
    }
    return el;
  }
  function debug(msg) {
    const el = getDebugEl();
    el.style.display = "block";
    el.innerHTML = msg;
  }

  // ====== détecte la page Galeries sans dépendre d’IDs
  const mapDiv = document.getElementById("map");
  if (!mapDiv) return; // pas sur galeries

  // ====== accepte TES ids OU les ids “standards”
  const listDiv  = document.getElementById("list")  || document.getElementById("galList");
  const qInput   = document.getElementById("q")     || document.getElementById("galQ");
  const resetBtn = document.getElementById("reset") || document.getElementById("galReset");
  const metaEl   = document.getElementById("meta")  || document.getElementById("galMeta");

  if (!listDiv) {
    debug("❌ Galeries: je ne trouve pas la liste. Il faut <div id='list'> ou <div id='galList'>.");
    return;
  }

  if (!window.L) {
    debug("❌ Leaflet n’est pas chargé (window.L absent). Vérifie l’ordre: leaflet.js AVANT script.js");
    return;
  }

  // ====== force une hauteur minimum si CSS foire
  // (ça évite le #map à 0px => carte invisible)
  const mapHeight = mapDiv.getBoundingClientRect().height;
  if (mapHeight < 120) {
    mapDiv.style.minHeight = "420px";
    mapDiv.style.height = "100%";
    debug("⚠️ #map était trop petit (hauteur ~0). Je force min-height:420px. Vérifie ton CSS .galCard/.galMap.");
  }

  // ====== data
  const galleries = (Array.isArray(window.GALLERIES_DATA) && window.GALLERIES_DATA.length)
    ? window.GALLERIES_DATA
    : [
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
  function isValidCoord(n){
    const x = Number(n);
    return Number.isFinite(x);
  }

  // ====== init map (try/catch pour ne jamais casser le site)
  let map, group, markers = [];
  try {
    map = L.map(mapDiv, { scrollWheelZoom: true });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap"
    }).addTo(map);

    group = L.featureGroup().addTo(map);
  } catch (e) {
    console.error(e);
    debug("❌ Leaflet init a planté. Regarde la console (F12).");
    return;
  }

  function makePopup(g){
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

  function safeInvalidate(){
    try {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => map.invalidateSize());
      });
      setTimeout(() => { try { map.invalidateSize(); } catch(_){} }, 200);
    } catch(_) {}
  }

  function renderMarkers(list){
    try {
      group.clearLayers();
      markers = [];

      const valid = list.filter(g => isValidCoord(g.lat) && isValidCoord(g.lng));

      valid.forEach(g => {
        const m = L.marker([Number(g.lat), Number(g.lng)]).addTo(group);
        m.bindPopup(makePopup(g));
        markers.push({ key: g, marker: m });
      });

      if (valid.length) map.fitBounds(group.getBounds().pad(0.18));
      else map.setView([20,0], 2);

      safeInvalidate();
    } catch(e) {
      console.error(e);
      debug("❌ Erreur markers. Regarde la console (F12).");
    }
  }

  function renderList(list){
    listDiv.innerHTML = "";
    list.forEach(g => {
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

        const hit = markers.find(m => m.key === g);
        if (hit) {
          map.setView(hit.marker.getLatLng(), Math.max(map.getZoom(), 6), { animate:true });
          hit.marker.openPopup();
        }
      });

      listDiv.appendChild(div);
    });
  }

  function applyFilter(){
    const q = (qInput?.value || "").trim().toLowerCase();
    const filtered = galleries.filter(g => {
      const hay = `${g.name} ${g.city} ${g.country} ${g.address}`.toLowerCase();
      return !q || hay.includes(q);
    });

    if (metaEl) metaEl.textContent = `${filtered.length} galerie${filtered.length>1?"s":""}`;

    renderList(filtered);
    renderMarkers(filtered);
  }

  // events
  if (qInput) qInput.addEventListener("input", applyFilter);
  if (resetBtn) resetBtn.addEventListener("click", () => {
    if (qInput) qInput.value = "";
    applyFilter();
  });

  // ResizeObserver optionnel
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => safeInvalidate());
    ro.observe(mapDiv);
  }
  window.addEventListener("resize", safeInvalidate);

  // init
  applyFilter();
  safeInvalidate();
}

}

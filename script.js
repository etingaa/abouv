// script.js — page Galeries uniquement : une carte en points (sans Leaflet) avec les galeries,
// reliée à des fiches (survol de l'une = l'autre s'allume). Chargé par galeries.html après expos-data.js.
// Chaque galerie indique ses expositions (expos-data.js) avec un lien vers la page Expositions filtrée.

(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", initGaleriesPage);

  // Données, dans l'ordre de la carte (d'ouest en est). expos : comment retrouver les expositions de la galerie dans expos-data.js
  // (le titre contient `title` et la ville contient `city`).
  const GALLERIES = [
    { name:"French Art Network — Carmel-by-the-Sea", city:"Carmel-by-the-Sea", country:"États-Unis", phone:"(931) 625-3456", address:"San Carlos St, Carmel-by-the-Sea, CA 93921", website:"https://www.frenchart.net", lat:36.5552, lng:-121.9233, expos:{ title:"French Art Network", city:"Carmel" } },
    { name:"Galerie Rue Toulouse (French Art Network)", city:"Laguna Beach", country:"États-Unis", phone:"(949) 549-4546", address:"390 S. Coast Hwy, Laguna Beach, CA 92651", website:"https://www.frenchart.net", lat:33.5427, lng:-117.7831, expos:{ title:"French Art Network", city:"Laguna" } },
    { name:"French Art Network — New Orleans", city:"New Orleans", country:"États-Unis", phone:"(504) 581-5881", address:"509 Rue Royale, New Orleans, LA 70130", website:"https://www.frenchart.net", lat:29.9574, lng:-90.0620, expos:{ title:"French Art Network", city:"New Orleans" } },
    { name:"Artclub Gallery", city:"Paris", country:"France", phone:"+33 (0)1 47 03 42 20", address:"172 Rue de Rivoli, 75001 Paris", website:"https://www.artclub.fr", lat:48.8619, lng:2.3341, expos:{ title:"Artclub", city:"Paris" } },
    { name:"Artclub Gallery", city:"Lyon", country:"France", phone:"+33 (0)4 78 37 47 37", address:"22 Place Bellecour, 69002 Lyon", website:"https://www.artclub.fr", lat:45.7579, lng:4.8320, expos:{ title:"Artclub", city:"Lyon" } },
  ];


  // une couleur par pays (petites touches : carte, fiches) + drapeaux dessinés (comme sur la page Expositions)
  const KEY = { "États-Unis": "us", "France": "fr" };
  const FLAGS = {
    "France": '<rect width="3" height="2" fill="#ED2939"/><rect width="2" height="2" fill="#fff"/><rect width="1" height="2" fill="#002395"/>',
    "États-Unis": '<rect width="3" height="2" fill="#B22234"/>' + [1, 3, 5].map(i => `<rect y="${i * 2 / 7}" width="3" height="${2 / 7}" fill="#fff"/>`).join("") + '<rect width="1.3" height="1.08" fill="#3C3B6E"/>',
  };
  const flag = (c) => FLAGS[c] ? `<svg class="xflag" viewBox="0 0 3 2" aria-hidden="true">${FLAGS[c]}</svg>` : "";

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
  // « 36,56° N · 121,92° O » (en anglais : 36.56° N · 121.92° W)
  function coords(g) {
    const en = document.documentElement.lang === "en", f = (v) => Math.abs(v).toFixed(2).replace(".", en ? "." : ",");
    return `${f(g.lat)}° ${g.lat >= 0 ? "N" : "S"} · ${f(g.lng)}° ${g.lng >= 0 ? "E" : (en ? "W" : "O")}`;   // O : ouest / oeste / ovest
  }
  function exposLine(g) {
    const list = exposOf(g), n = list.length;
    if (!n) return "";
    const text = n > 1
      ? `${n} ${t("expositions")} ${t("ici depuis")} ${list[0].year}`
      : `1 ${t("exposition")} ${t("ici en")} ${list[0].year}`;
    return `<a class="gx__expos" href="expositions?q=${encodeURIComponent(g.expos.title)}">${escapeHtml(text)}</a>`;
  }

  // carte en points (images/world-dots.svg : projection simple, x = lon + 180, y = 72 - lat),
  // recadrée sur l'Amérique du Nord et l'Europe
  const VIEW = { x: 44, y: 12, w: 176, h: 42 };
  // téléphone : deux cartes zoomées, une par pays (la carte du monde y serait illisible)
  const ZOOMS = [
    { name: "États-Unis", view: { x: 41, y: 21, w: 58, h: 29 } },
    { name: "France", view: { x: 163, y: 14, w: 40, h: 20 } },
  ];
  const px = (lng) => lng + 180, py = (lat) => 72 - lat;
  // côté de l'étiquette pour éviter les chevauchements (villes proches)
  const LABEL = { "Paris": "above", "Lyon": "below", "Laguna Beach": "below", "Carmel-by-the-Sea": "above", "New Orleans": "below" };

  function mapSVG(V = VIEW, only) {
    const home = GALLERIES.find((g) => g.city === "Paris") || GALLERIES[0];
    // arcs depuis Paris, avec une petite lueur qui circule le long de chacun (départs décalés)
    const arcs = only ? "" : GALLERIES.map((g, i) => ({ g, i })).filter(({ g }) => g !== home).map(({ g, i }, n) => {
      const x1 = px(home.lng), y1 = py(home.lat), x2 = px(g.lng), y2 = py(g.lat);
      const mx = (x1 + x2) / 2, my = Math.min(y1, y2) - Math.abs(x2 - x1) * .18;
      const d = `M${x1},${y1} Q${mx},${my} ${x2},${y2}`, dur = (2.2 + Math.abs(x2 - x1) / 60).toFixed(2);
      return `<path class="gx__arc gx__arc--${KEY[g.country] || "x"}" data-i="${i}" d="${d}"/>
        <circle class="gx__comet gx__comet--${KEY[g.country] || "x"}" data-i="${i}" r=".5"><animateMotion dur="${dur}s" begin="${(n * .7).toFixed(1)}s" repeatCount="indefinite" path="${d}" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines=".45 0 .25 1"/></circle>`;
    }).join("");
    const k = V.w / VIEW.w;              // taille des repères proportionnelle au cadrage
    const pins = GALLERIES.map((g, i) => {
      if (only && g.country !== only) return "";
      const x = px(g.lng), y = py(g.lat), up = LABEL[g.city] !== "below";
      return `<g class="gx__pin gx__pin--${KEY[g.country] || "x"}" data-i="${i}" tabindex="0" role="button" aria-label="${escapeHtml(g.name)}, ${escapeHtml(g.city)}">
        <circle class="ring" cx="${x}" cy="${y}" r="${.9 * (only ? k * 2.6 : 1)}"/><circle class="dot" cx="${x}" cy="${y}" r="${.75 * (only ? k * 2.6 : 1)}"/>
        <text x="${x}" y="${up ? y - (only ? k * 5.4 : 1.8) : y + (only ? k * 9 : 3.4)}" text-anchor="middle"${only ? ` style="font-size:${(k * 5.6).toFixed(2)}px"` : ""}>${escapeHtml(g.city)}</text></g>`;
    }).join("");
    return `<svg viewBox="${V.x} ${V.y} ${V.w} ${V.h}" role="img" aria-label="${t("Carte des galeries")}">
      <g class="gx__dots"><image class="dots dots--d" href="images/world-dots.svg" x="0" y="0" width="360" height="128"/><image class="dots dots--l" href="images/world-dots-light.svg" x="0" y="0" width="360" height="128"/></g>${arcs}${pins}</svg>`;
  }

  // téléphone : une seule carte, qui zoome sur le pays de la galerie affichée (cadrage animé) ;
  // les repères gardent la même taille à l'écran quel que soit le zoom (échelle mise à jour avec le cadrage)
  const ZOOM = Object.fromEntries(ZOOMS.map(z => [z.name, z.view]));
  function mobileMapSVG() {
    const V = ZOOM[GALLERIES[0].country];
    const pins = GALLERIES.map((g, i) => {
      const up = LABEL[g.city] !== "below";
      return `<g class="gx__pin gm__pin gx__pin--${KEY[g.country] || "x"}" data-i="${i}" transform="translate(${px(g.lng)} ${py(g.lat)})"><g class="gm__s">
        <circle class="ring" r=".9"/><circle class="dot" r=".75"/>
        <text y="${up ? -1.9 : 3.5}" text-anchor="middle">${escapeHtml(g.city)}</text></g></g>`;
    }).join("");
    return `<svg viewBox="${V.x} ${V.y} ${V.w} ${V.h}" preserveAspectRatio="xMidYMin meet">
      <image class="dots dots--d" href="images/world-dots.svg" x="0" y="0" width="360" height="128"/><image class="dots dots--l" href="images/world-dots-light.svg" x="0" y="0" width="360" height="128"/>${pins}</svg>`;
  }

  function initGaleriesPage() {
    const box = document.getElementById("gx");
    if (!box) return;

    box.innerHTML = `
      <h2 class="gx__title">${t("Galeries")}<sup>${GALLERIES.length}</sup></h2>
      <div class="gx__map">${mapSVG()}</div>
      <figure class="gm" aria-hidden="true"><figcaption class="gm__cap"></figcaption>${mobileMapSVG()}
        <div class="gm__nav">
          <button class="gm__arrow" type="button" data-d="-1" tabindex="-1"><svg viewBox="0 0 16 16"><path d="M10 3 5 8l5 5"/></svg></button>
          <span class="gm__count"><b>01</b> / ${String(GALLERIES.length).padStart(2, "0")}</span>
          <button class="gm__arrow" type="button" data-d="1" tabindex="-1"><svg viewBox="0 0 16 16"><path d="m6 3 5 5-5 5"/></svg></button>
        </div>
      </figure>
      <div class="gx__acc" role="list">${GALLERIES.map((g, i) => `
        <article class="gx__panel gx--${KEY[g.country] || "x"}${i === 0 ? " is-open" : ""}" id="galerie-${i}" data-i="${i}" role="listitem" tabindex="0">
          <span class="gx__num">${String(i + 1).padStart(2, "0")}</span>
          <p class="gx__vcity" aria-hidden="true" style="--n:${g.city.length}">${escapeHtml(g.city)}</p>
          <div class="gx__body">
            <p class="gx__country">${flag(g.country)}${escapeHtml(t(g.country))}</p>
            <p class="gx__city">${escapeHtml(g.city)}</p>
            <p class="gx__name">${escapeHtml(g.name)}</p>
            <p class="gx__addr">${escapeHtml(g.address)}</p>
            ${exposLine(g)}
            <div class="gx__acts">
              ${g.website ? `<a href="${escapeHtml(g.website)}" target="_blank" rel="noopener noreferrer">${t("Site")}</a>` : ""}
              <a href="https://www.google.com/maps/dir/?api=1&destination=${g.lat},${g.lng}" target="_blank" rel="noopener noreferrer">${t("Itinéraire")}</a>
              ${g.phone ? `<a href="tel:${g.phone.replace(/[^\d+]/g, "")}">${t("Appeler")}</a>` : ""}
            </div>
          </div>
          <div class="gx__foot" aria-hidden="true"><span class="gx__coords">${coords(g)}</span><span class="gx__big">${String(i + 1).padStart(2, "0")}</span></div>
        </article>`).join("")}
      </div>`;

    // carte et fiches reliées : survoler l'une allume l'autre ; un clic sur un point mène à la fiche
    // accordéon : une galerie ouverte à la fois (au survol, au clic, au clavier) ; son point s'allume sur la carte
    const pins = [...box.querySelectorAll(".gx__pin")], cards = [...box.querySelectorAll(".gx__panel")];
    const open = (i) => cards.forEach((c, k) => c.classList.toggle("is-open", k === i));
    // une galerie peut avoir plusieurs points (carte du monde + carte zoomée du téléphone)
    const hot = (i, on) => { pins.forEach((p) => { if (+p.dataset.i === i) p.classList.toggle("is-hot", on); }); if (on){ open(i); focusMap(i); } };

    // carte de l'ordinateur, plus vivante : elle s'approche en douceur de la galerie survolée (et revient à la vue
    // d'ensemble quand on quitte la section), l'arc de la galerie s'allume, le fond de points suit un peu la souris
    const big = box.querySelector(".gx__map svg"), dots = big && big.querySelector(".gx__dots");
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let vb = { ...VIEW }, vbAnim = 0, active = -1;
    const setVB = (v) => big.setAttribute("viewBox", `${v.x} ${v.y} ${v.w} ${v.h}`);
    function zoomVB(to){
      if (!big) return;
      cancelAnimationFrame(vbAnim);
      if (calm){ vb = { ...to }; return setVB(vb); }
      const from = { ...vb }, t0 = performance.now(), D = 900;
      const step = (now) => {
        const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3);
        for (const key of ["x", "y", "w", "h"]) vb[key] = from[key] + (to[key] - from[key]) * e;
        setVB(vb);
        if (k < 1) vbAnim = requestAnimationFrame(step);
      };
      vbAnim = requestAnimationFrame(step);
    }
    function focusMap(i){
      if (!big || innerWidth <= 760 || i === active) return;
      active = i;
      big.querySelectorAll(".gx__arc, .gx__comet").forEach((a) => a.classList.toggle("is-on", +a.dataset.i === i));
      big.classList.toggle("has-on", GALLERIES[i].city !== "Paris");
      // on reste dans le cadrage de départ (pas de vide autour des continents)
      const g = GALLERIES[i], z = 1.45, w = VIEW.w / z, h = VIEW.h / z;
      const x = Math.max(VIEW.x, Math.min(VIEW.x + VIEW.w - w, px(g.lng) - w / 2)), y = Math.max(VIEW.y, Math.min(VIEW.y + VIEW.h - h, py(g.lat) - h * .5));
      zoomVB({ x, y, w, h });
    }
    function overview(){
      if (!big || active === -1) return;
      active = -1;
      big.querySelectorAll(".is-on").forEach((a) => a.classList.remove("is-on"));
      big.classList.remove("has-on");
      zoomVB({ ...VIEW });
    }
    box.addEventListener("mouseleave", overview);
    if (big && dots && !calm) big.addEventListener("mousemove", (e) => {
      const r = big.getBoundingClientRect(), mx = (e.clientX - r.left) / r.width - .5, my = (e.clientY - r.top) / r.height - .5;
      dots.setAttribute("transform", `translate(${(-mx * 1.6).toFixed(2)} ${(-my * .8).toFixed(2)})`);
    });
    cards.forEach((c, i) => {
      c.addEventListener("mouseenter", () => hot(i, true)); c.addEventListener("mouseleave", () => hot(i, false));
      c.addEventListener("focus", () => hot(i, true)); c.addEventListener("click", () => open(i));
    });
    pins.forEach((p) => {
      const i = +p.dataset.i;
      p.addEventListener("mouseenter", () => hot(i, true)); p.addEventListener("mouseleave", () => hot(i, false));
      p.addEventListener("focus", () => hot(i, true)); p.addEventListener("blur", () => hot(i, false));
      const go = () => { open(i); cards[i].scrollIntoView({ behavior: "smooth", block: "center" }); };
      p.addEventListener("click", go);
      p.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });

    // téléphone : les galeries défilent au doigt (cartes) ; celle du milieu s'allume sur la carte,
    // qui se recadre sur son pays ; toucher un point amène sa carte ; flèches et compteur en dessous
    const phone = matchMedia("(max-width: 760px)"), strip = box.querySelector(".gx__acc");
    const gm = box.querySelector(".gm svg"), cap = box.querySelector(".gm__cap"), count = box.querySelector(".gm__count b");
    const sGroups = [...box.querySelectorAll(".gm__s")];
    let cur = -1, view = { ...ZOOM[GALLERIES[0].country] }, anim = 0;
    const setView = (v) => {
      gm.setAttribute("viewBox", `${v.x} ${v.y} ${v.w} ${v.h}`);
      const k = v.w / VIEW.w * 2.6;
      sGroups.forEach(g => g.setAttribute("transform", `scale(${k})`));
    };
    const zoomTo = (to) => {
      cancelAnimationFrame(anim);
      const from = { ...view }, t0 = performance.now(), D = matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 750;
      const step = (now) => {
        const k = Math.min(1, (now - t0) / D), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        for (const key of ["x", "y", "w", "h"]) view[key] = from[key] + (to[key] - from[key]) * e;
        setView(view);
        if (k < 1) anim = requestAnimationFrame(step);
      };
      anim = requestAnimationFrame(step);
    };
    const activate = (i) => {
      if (i === cur) return;
      cur = i;
      const g = GALLERIES[i];
      open(i);
      pins.forEach((p) => p.classList.toggle("is-hot", +p.dataset.i === i && p.classList.contains("gm__pin")));
      cap.innerHTML = `${flag(g.country)}${escapeHtml(t(g.country))}<span>${GALLERIES.filter(x => x.country === g.country).length}</span>`;
      count.textContent = String(i + 1).padStart(2, "0");
      zoomTo(ZOOM[g.country]);
    };
    const center = (i, smooth = true) => {
      const c = cards[i];
      strip.scrollTo({ left: c.offsetLeft - (strip.clientWidth - c.offsetWidth) / 2, behavior: smooth ? "smooth" : "auto" });
    };
    let ticking = false;
    strip.addEventListener("scroll", () => {
      if (!phone.matches || ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const mid = strip.scrollLeft + strip.clientWidth / 2;
        let best = 0, bd = Infinity;
        cards.forEach((c, k) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd){ bd = d; best = k; } });
        activate(best);
      });
    }, { passive: true });
    box.querySelectorAll(".gm__pin").forEach((p) => p.addEventListener("click", () => center(+p.dataset.i)));
    box.querySelectorAll(".gm__arrow").forEach((b) => b.addEventListener("click", () => center(Math.max(0, Math.min(cards.length - 1, cur + +b.dataset.d)))));
    // la carte remplit l'écran sous le titre ; la rangée de cartes vient se poser sur son bas
    const layout = () => {
      const fig = box.querySelector(".gm");
      if (!phone.matches){ fig.style.height = ""; strip.style.marginTop = ""; return; }
      const top = fig.getBoundingClientRect().top + scrollY;
      fig.style.height = Math.max(360, innerHeight - top - 12) + "px";
      strip.style.marginTop = -(strip.offsetHeight + 16) + "px";
    };
    addEventListener("resize", layout);
    if (phone.matches){ setView(view); activate(0); layout(); }
    phone.addEventListener("change", () => { layout(); if (phone.matches){ cur = -1; setView(view); activate(0); center(0, false); } });

    // les volets tiennent en entier dans le premier écran : la carte prend la hauteur qui reste (titre au-dessus)
    const map = box.querySelector(".gx__map svg"), acc = box.querySelector(".gx__acc");
    const fit = () => {
      if (innerWidth <= 760) { map.style.maxHeight = ""; return; }
      const gap = parseFloat(getComputedStyle(map.parentNode).marginBottom) || 0;
      const room = innerHeight - (map.getBoundingClientRect().top + scrollY) - gap - acc.offsetHeight - 28;
      map.style.maxHeight = Math.max(100, room) + "px";
    };
    addEventListener("resize", fit); fit();

  }
})();

// site.js — éléments communs à toutes les pages.
// Menu téléphone : sur petit écran, le menu est remplacé par un bouton « Menu »
// qui ouvre la navigation en plein écran. (Styles : styles.css, « MENU TÉLÉPHONE ».)
// Header compact : dès qu'on descend, le header reste en haut de l'écran, s'affine et ses mots
// se transforment sur place en icônes ; il reprend ses mots en haut de page.
// Un seul fond blanc (.shade) couvre le header et ce qui reste accroché dessous (barres de filtres).
// (Styles : styles.css, « HEADER COMPACT ».)
// Chargé dans le <head> de chaque page, après i18n.js.

(() => {
  "use strict";

  // Version claire / sombre : choix mémorisé, appliqué tout de suite (avant l'affichage) pour éviter un flash.
  // Sombre par défaut ; le bouton du header (entre le menu et FR/EN) bascule et prévient la galerie 3D (« themechange »).
  const THEME_KEY = "abouv:theme";
  const root = document.documentElement;
  const readTheme = () => { try { return localStorage.getItem(THEME_KEY); } catch (_) { return null; } };
  function setTheme(theme, save){
    root.dataset.theme = theme;
    root.style.background = theme === "light" ? "#efebe3" : "";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#EFEBE3" : "#0B1120");
    if (save) { try { localStorage.setItem(THEME_KEY, theme); } catch (_) {} }
    document.dispatchEvent(new CustomEvent("themechange", { detail: { light: theme === "light" } }));
  }
  setTheme(readTheme() === "light" ? "light" : "dark", false);
  // autre onglet ou page revenue du cache : on suit le choix mémorisé
  window.addEventListener("storage", (e) => { if (e.key === THEME_KEY) setTheme(e.newValue === "light" ? "light" : "dark", false); });
  window.addEventListener("pageshow", () => { const t = readTheme() === "light" ? "light" : "dark"; if (t !== root.dataset.theme) setTheme(t, false); });

  function themeButton(){
    const b = document.createElement("button");
    b.type = "button";
    b.className = "themeBtn";
    const label = () => {
      const light = root.dataset.theme === "light";
      b.setAttribute("aria-pressed", String(light));
      b.setAttribute("aria-label", tr(light ? "Version sombre" : "Version claire"));
      b.title = b.getAttribute("aria-label");
    };
    // soleil (en sombre : passer en clair) / lune (en clair : passer en sombre) ; l'un tourne et s'efface, l'autre arrive
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<g class="themeBtn__sun"><circle cx="12" cy="12" r="4.6"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.55 1.55M17.15 17.15l1.55 1.55M5.3 18.7l1.55-1.55M17.15 6.85l1.55-1.55"/></g>' +
      '<path class="themeBtn__moon" d="M20 14.6A8.2 8.2 0 0 1 9.4 4a8.2 8.2 0 1 0 10.6 10.6z"/></svg>';
    b.addEventListener("click", () => {
      root.classList.add("theme-anim");
      setTheme(root.dataset.theme === "light" ? "dark" : "light", true); label();
      setTimeout(() => root.classList.remove("theme-anim"), 650);
    });
    label();
    return b;
  }

  const tr = (s) => (window.t ? window.t(s) : s);

  // Icônes du header compact (trait 1,6 px, dessinées sur 24 × 24), par page
  const ICONS = {
    "index.html":        '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9v11h13V9"/>',
    "portfolio.html":    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m3 16 5-5 4 4 3-3 6 6"/><circle cx="15.5" cy="8.5" r="1.5"/>',
    "galeries.html":     '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    "expositions.html":  '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    "apropos.html":      '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    "presse.html":       '<path d="M4 5h13v14a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2z"/><path d="M17 9h3v10a2 2 0 0 1-2 2"/><path d="M8 9h5M8 13h5M8 17h3"/>',
    "contact.html":      '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  };

  function setupCompactHeader(top, nav){
    // chaque lien : icône + mot (le mot reste lu par les lecteurs d'écran en mode icône)
    nav.querySelectorAll(".nav__link").forEach(a => {
      const icon = ICONS[(a.getAttribute("href") || "").split(/[?#]/)[0]];
      if (!icon) return;
      const label = a.textContent.trim();
      a.innerHTML = '<svg class="nav__icon" viewBox="0 0 24 24" aria-hidden="true">' + icon + '</svg>' +
                    '<span class="nav__text">' + a.innerHTML + '</span>';
      a.dataset.tip = label; // infobulle en mode icône
    });

    // Bascule avec hystérésis (compact au-delà de 120 px, mots en dessous de 40 px).
    // Le header change de hauteur : on compense avec sa marge basse pour que la page ne saute pas.
    let compact = false;
    function setCompact(on){
      if (on === compact) return;
      compact = on;
      const before = top.offsetHeight;
      top.style.marginBottom = "";
      const baseMargin = parseFloat(getComputedStyle(top).marginBottom) || 0;
      top.classList.toggle("is-compact", on);
      if (on) top.style.marginBottom = (baseMargin + before - top.offsetHeight) + "px";
      setHeaderVar();
    }
    // hauteur du header, pour accrocher dessous ce qui doit rester visible (barres de filtres)
    function setHeaderVar(){
      document.documentElement.style.setProperty("--header-h", top.offsetHeight + "px");
    }
    setHeaderVar();
    window.addEventListener("resize", setHeaderVar);
    window.addEventListener("load", setHeaderVar); // polices chargées

    // fond commun : du haut de l'écran jusqu'au bas de ce qui est accroché (header ou filtres)
    const shade = document.createElement("div");
    shade.className = "shade";
    shade.setAttribute("aria-hidden", "true");
    document.body.prepend(shade);
    const tb = document.querySelector(".toolbar");
    const stuck = tb && tb.offsetParent ? tb : top;   // barre de filtres masquée -> le header seul
    function setShade(){
      document.documentElement.style.setProperty("--shade-h", Math.max(0, stuck.getBoundingClientRect().bottom) + "px");
    }
    if (window.ResizeObserver) new ResizeObserver(setShade).observe(stuck); // sous-filtres dépliés

    let queued = false;
    function onScroll(){
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        const y = window.scrollY;
        document.documentElement.classList.toggle("is-scrolled", y > 4);
        if (!compact && y > 120) setCompact(true);
        else if (compact && y < 40) setCompact(false);
        setShade();
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  document.addEventListener("DOMContentLoaded", () => {
    const top = document.querySelector(".top");
    const nav = top && top.querySelector(".top__nav");
    if (!nav) return;

    nav.id = nav.id || "mainNav";

    // À propos se décline en trois parties : sous-menu au survol (L'artiste, Presse, Q&A)
    const about = nav.querySelector('.nav__link[href="apropos.html"]');
    if (about){
      const item = document.createElement("span");
      item.className = "nav__item";
      about.replaceWith(item);
      item.appendChild(about);
      const sub = document.createElement("span");
      sub.className = "nav__sub";
      [["artiste", "L’artiste"], ["presse", "Presse"], ["questions", "Q&A"]].forEach(([id, label]) => {
        const a = document.createElement("a");
        a.href = "apropos.html#" + id;
        a.textContent = tr(label);
        sub.appendChild(a);
      });
      item.appendChild(sub);
    }

    // menu téléphone : ordre d'apparition des liens, puis réseaux + langue en bas
    nav.querySelectorAll(".nav__link").forEach((a, i) => a.style.setProperty("--i", i));
    const foot = document.createElement("div");
    foot.className = "menuFoot";
    document.querySelectorAll(".bottom__left a").forEach(a => foot.appendChild(a.cloneNode(true)));
    const langs = document.createElement("div");
    langs.className = "menuFoot__lang";
    const cur = document.documentElement.lang === "en" ? "en" : "fr";
    [["fr", "fra"], ["en", "eng"]].forEach(([l, label]) => {
      const a = document.createElement("a");
      a.href = "?lang=" + l;
      a.textContent = label;
      a.lang = l;
      if (l === cur) a.setAttribute("aria-current", "true");
      langs.appendChild(a);
    });
    foot.appendChild(langs);
    nav.appendChild(foot);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "menuBtn";
    btn.setAttribute("aria-controls", nav.id);
    btn.setAttribute("aria-expanded", "false");
    btn.innerHTML =
      '<span class="menuBtn__label"></span>' +
      '<span class="menuBtn__icon" aria-hidden="true"><i></i><i></i></span>';
    const label = btn.querySelector(".menuBtn__label");
    nav.before(btn);
    top.appendChild(themeButton());

    function setOpen(open){
      top.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
      label.textContent = tr(open ? "Fermer" : "Menu");
      document.documentElement.classList.toggle("menu-open", open);
    }
    setOpen(false);

    // après l'ajout du bouton Menu : la hauteur mesurée du header est la bonne
    setupCompactHeader(top, nav);

    btn.addEventListener("click", () => setOpen(!top.classList.contains("is-open")));
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && top.classList.contains("is-open")) { setOpen(false); btn.focus(); }
    });
    // retour sur grand écran : on referme
    matchMedia("(min-width: 761px)").addEventListener("change", (m) => { if (m.matches) setOpen(false); });
  });
})();

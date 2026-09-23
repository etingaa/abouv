// site.js — éléments communs à toutes les pages.
// Menu téléphone : sur petit écran, le menu est remplacé par un bouton « Menu »
// qui ouvre la navigation en plein écran. (Styles : styles.css, « MENU TÉLÉPHONE ».)
// Header compact : dès qu'on descend, le header reste en haut de l'écran et devient
// une barre d'icônes ; il reprend ses mots en haut de page. Un seul fond flouté (.shade)
// couvre le header et ce qui reste accroché dessous (filtres du portfolio).
// (Styles : styles.css, « HEADER COMPACT ».)
// Chargé dans le <head> de chaque page, après i18n.js.

(() => {
  "use strict";

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
    // hauteur du header, pour accrocher dessous ce qui doit rester visible (filtres du portfolio)
    function setHeaderVar(){
      document.documentElement.style.setProperty("--header-h", top.offsetHeight + "px");
    }
    setHeaderVar();
    window.addEventListener("resize", setHeaderVar);

    // fond commun : du haut de l'écran jusqu'au bas de ce qui est accroché (header ou filtres)
    const shade = document.createElement("div");
    shade.className = "shade";
    shade.setAttribute("aria-hidden", "true");
    document.body.prepend(shade);
    const stuck = document.querySelector("body.portfolio .toolbar") || top;
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

    setupCompactHeader(top, nav);

    nav.id = nav.id || "mainNav";
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

    function setOpen(open){
      top.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
      label.textContent = tr(open ? "Fermer" : "Menu");
      document.documentElement.classList.toggle("menu-open", open);
    }
    setOpen(false);

    btn.addEventListener("click", () => setOpen(!top.classList.contains("is-open")));
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && top.classList.contains("is-open")) { setOpen(false); btn.focus(); }
    });
    // retour sur grand écran : on referme
    matchMedia("(min-width: 761px)").addEventListener("change", (m) => { if (m.matches) setOpen(false); });
  });
})();

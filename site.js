// site.js — éléments communs à toutes les pages.
// Menu téléphone : sur petit écran, le menu est remplacé par un bouton « Menu »
// qui ouvre la navigation en plein écran. (Styles : styles.css, « MENU TÉLÉPHONE ».)
// Header compact : dès qu'on descend, le header reste en haut de l'écran et s'affine.
// Un seul fond blanc (.shade) couvre le header et ce qui reste accroché dessous (barres de filtres).
// (Styles : styles.css, « HEADER COMPACT ».)
// Chargé dans le <head> de chaque page, après i18n.js.

(() => {
  "use strict";

  const tr = (s) => (window.t ? window.t(s) : s);

  function setupCompactHeader(top){
    // Bascule avec hystérésis (compact au-delà de 120 px, normal en dessous de 40 px).
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
    const stuck = document.querySelector(".toolbar") || top;
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

    function setOpen(open){
      top.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
      label.textContent = tr(open ? "Fermer" : "Menu");
      document.documentElement.classList.toggle("menu-open", open);
    }
    setOpen(false);

    // après l'ajout du bouton Menu : la hauteur mesurée du header est la bonne
    setupCompactHeader(top);

    btn.addEventListener("click", () => setOpen(!top.classList.contains("is-open")));
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && top.classList.contains("is-open")) { setOpen(false); btn.focus(); }
    });
    // retour sur grand écran : on referme
    matchMedia("(min-width: 761px)").addEventListener("change", (m) => { if (m.matches) setOpen(false); });
  });
})();

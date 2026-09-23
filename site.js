// site.js — éléments communs à toutes les pages.
// Menu téléphone : sur petit écran, le menu est remplacé par un bouton « Menu »
// qui ouvre la navigation en plein écran. (Styles : styles.css, « MENU TÉLÉPHONE ».)
// Chargé dans le <head> de chaque page, après i18n.js.

(() => {
  "use strict";

  const tr = (s) => (window.t ? window.t(s) : s);

  document.addEventListener("DOMContentLoaded", () => {
    const top = document.querySelector(".top");
    const nav = top && top.querySelector(".top__nav");
    if (!nav) return;

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

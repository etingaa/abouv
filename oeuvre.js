// oeuvre.js — page d'une œuvre (oeuvres/<slug>.html, générée par scripts/build-seo.mjs).
// Arrivée depuis le portfolio (portfolio.html enregistre la liste filtrée dans sessionStorage « abouv:pf ») :
//   - « ← Portfolio » revient en arrière dans l'historique : le portfolio retrouve ses filtres et sa position ;
//   - précédente / suivante parcourent les œuvres filtrées et remplacent la page dans l'historique
//     (un seul « retour » ramène toujours au portfolio).
// Partout : flèches ← → du clavier, glisser gauche / droite sur la toile (téléphone), dimensions en pouces si choisi
// dans le portfolio, flèche « Informations » sous la toile (téléphone) qui descend aux infos.

(() => {
  "use strict";

  const PF_KEY = "abouv:pf", OPEN_KEY = "abouv:pf-open";
  const ss = {
    get(k){ try { return sessionStorage.getItem(k); } catch (_) { return null; } },
    set(k, v){ try { sessionStorage.setItem(k, v); } catch (_) {} },
    del(k){ try { sessionStorage.removeItem(k); } catch (_) {} },
  };
  const slug = decodeURIComponent(location.pathname.split("/").pop().replace(/\.html$/, ""));

  // ouverte depuis le portfolio (ou depuis précédente / suivante dans la foulée) : on le note dans l'historique
  // de cette entrée, qui survit aux rechargements et aux allers-retours
  if (ss.get(OPEN_KEY) === slug){
    ss.del(OPEN_KEY);
    history.replaceState({ ...(history.state || {}), pf: 1 }, "");
  }
  const fromPf = !!(history.state && history.state.pf);

  let pf = null;
  try { pf = JSON.parse(ss.get(PF_KEY) || "null"); } catch (_) {}

  document.addEventListener("DOMContentLoaded", () => {
    const back = document.querySelector(".ov__back");
    const prev = document.querySelector(".ov__step--prev");
    const next = document.querySelector(".ov__step--next");

    // précédente / suivante dans la liste filtrée du portfolio
    const list = fromPf && pf && Array.isArray(pf.list) ? pf.list : null;
    const at = list ? list.findIndex(w => w[0] === slug) : -1;
    if (at >= 0){
      const nav = document.querySelector(".ov__nav");
      if (list.length < 2 && nav) nav.hidden = true;
      const set = (a, w) => { if (!a || !w) return; a.href = w[0]; a.querySelector(".ov__stepT").textContent = w[1]; };
      set(prev, list[(at - 1 + list.length) % list.length]);
      set(next, list[(at + 1) % list.length]);
    }

    const plain = (e) => !(e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey);
    if (fromPf){
      back && back.addEventListener("click", (e) => { if (plain(e)){ e.preventDefault(); history.back(); } });
      [prev, next].forEach(a => a && a.addEventListener("click", (e) => {
        if (!plain(e)) return;
        e.preventDefault();
        ss.set(OPEN_KEY, a.getAttribute("href"));
        location.replace(a.href);
      }));
    }

    // clavier : ← →
    document.addEventListener("keydown", (e) => {
      if (e.altKey || e.metaKey || e.ctrlKey || e.target.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowLeft" && prev && !prev.closest("[hidden]")) prev.click();
      if (e.key === "ArrowRight" && next && !next.closest("[hidden]")) next.click();
    });

    // glisser horizontalement sur la toile : œuvre suivante / précédente
    const media = document.querySelector(".ov__media");
    let x0 = null, y0 = 0;
    media && media.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1){ x0 = null; return; }
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    }, { passive: true });
    media && media.addEventListener("touchend", (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      const a = dx < 0 ? next : prev;
      if (a && !a.closest("[hidden]")) a.click();
    }, { passive: true });

    // flèche « Informations » : descente douce ; elle s'efface dès qu'on a commencé à descendre
    const more = document.querySelector(".ov__more");
    if (more){
      more.addEventListener("click", (e) => {
        e.preventDefault();
        const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
        document.getElementById("infos").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      });
      const onScroll = () => more.classList.toggle("is-gone", scrollY > 40);
      addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    // dimensions en pouces si c'est l'unité choisie dans le portfolio
    let unit = "cm";
    try { unit = localStorage.getItem("abouv:unit") === "in" ? "in" : "cm"; } catch (_) {}
    const size = document.querySelector(".ov__size");
    const m = size && unit === "in" && size.textContent.match(/(\d+(?:[.,]\d+)?)\s*×\s*(\d+(?:[.,]\d+)?)/);
    if (m){
      const dec = document.documentElement.lang === "en" ? "." : ",";
      const f = (v) => String(Math.round(parseFloat(v.replace(",", ".")) / 2.54 * 10) / 10).replace(".", dec);
      size.textContent = `${f(m[1])} × ${f(m[2])} in`;
    }
  });
})();

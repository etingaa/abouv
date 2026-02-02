// app.js
// - Lien actif automatique (robuste: GitHub Pages, index, /, trailing slash, hash/query)
// - Scroll doux sur ancres + accessibilité + back/forward
// - Option: offset pour header sticky

document.addEventListener("DOMContentLoaded", () => {
  /* =========================
     1) Lien actif automatique
     ========================= */

  const navLinks = Array.from(document.querySelectorAll(".top__nav .nav__link"));
  if (!navLinks.length) return;

  const origin = window.location.origin;

  // Normalise un chemin en "fichier" (ex: "/folder/" -> "index.html")
  function fileFromPath(pathname) {
    const clean = (pathname || "").replace(/\/+$/, ""); // enlève trailing slashes
    const last = clean.split("/").pop();
    return last ? last : "index.html";
  }

  // Transforme un href en "fichier" comparable, ou null si externe/anchor-only
  function fileFromHref(href) {
    if (!href) return null;

    // ignore ancres pures
    if (href.startsWith("#")) return null;

    // ignore mailto/tel/javascript
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return null;

    // Si c'est une URL absolue vers un autre site => ignore (ne pas activer)
    // (new URL gère aussi les relatifs)
    const u = new URL(href, origin);
    if (u.origin !== origin) return null;

    return fileFromPath(u.pathname);
  }

  function setActiveNav() {
    const current = new URL(window.location.href);
    const currentFile = fileFromPath(current.pathname);

    navLinks.forEach((link) => {
      link.classList.remove("is-active");

      const href = link.getAttribute("href") || "";
      const linkFile = fileFromHref(href);

      // Si href pointe vers une ancre ou externe => pas de lien actif ici
      if (!linkFile) return;

      const isIndex =
        (currentFile === "index.html" || currentFile === "") &&
        (linkFile === "index.html" || linkFile === "");

      if (linkFile === currentFile || isIndex) {
        link.classList.add("is-active");
      }
    });
  }

  setActiveNav();

  /* =========================
     2) Scroll doux sur ancres
     ========================= */

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Si un header devient sticky, mets sa hauteur ici
  // (ex: const HEADER_OFFSET = document.querySelector(".top")?.offsetHeight || 0)
  const HEADER_OFFSET = 0;

  function scrollToId(hash, push = true) {
    if (!hash || hash === "#") return;
    const target = document.querySelector(hash);
    if (!target) return;

    // Scroll avec offset (pour header sticky)
    const y = target.getBoundingClientRect().top + window.pageYOffset - HEADER_OFFSET;

    window.scrollTo({
      top: y,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });

    if (push) history.pushState(null, "", hash);

    // accessibilité: focus
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  }

  // Clique sur ancres
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const hash = a.getAttribute("href");
      // Laisse # vide tranquille
      if (!hash || hash === "#") return;

      // Si l'ancre n'existe pas, on ne bloque pas
      if (!document.querySelector(hash)) return;

      e.preventDefault();
      scrollToId(hash, true);
    });
  });

  // Back/forward sur les ancres
  window.addEventListener("popstate", () => {
    if (window.location.hash) scrollToId(window.location.hash, false);
  });

  // Si on arrive sur une URL déjà avec #hash
  if (window.location.hash) {
    // petit délai: laisse le DOM se stabiliser
    setTimeout(() => scrollToId(window.location.hash, false), 0);
  }
});

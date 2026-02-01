document.addEventListener("DOMContentLoaded", () => {
  // -----------------------------
  // 1) Lien actif automatique (robuste)
  // -----------------------------
  const navLinks = document.querySelectorAll(".top__nav .nav__link");

  // URL actuelle, normalisée
  const currentUrl = new URL(window.location.href);
  const currentPath = currentUrl.pathname.replace(/\/$/, ""); // enlève trailing slash
  const currentFile = currentPath.split("/").pop() || "index.html";

  navLinks.forEach((link) => {
    link.classList.remove("is-active");

    const href = link.getAttribute("href");
    if (!href) return;

    // Ignore les ancres pures du menu (#section)
    if (href.startsWith("#")) return;

    // Résout le href en URL absolue (gère relatifs + absolus)
    const linkUrl = new URL(href, window.location.origin);
    const linkPath = linkUrl.pathname.replace(/\/$/, "");
    const linkFile = linkPath.split("/").pop() || "index.html";

    // Cas spécial : "/" doit activer "index.html" si tu as un lien vers index.html
    const isIndex =
      (currentFile === "" || currentFile === "index.html") &&
      (linkFile === "" || linkFile === "index.html");

    if (linkFile === currentFile || isIndex) {
      link.classList.add("is-active");
    }
  });

  // -----------------------------
  // 2) Scroll doux sur ancres (#...)
  // -----------------------------
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const anchorLinks = document.querySelectorAll('a[href^="#"]');

  anchorLinks.forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (!id || id === "#") return;

      const target = document.querySelector(id);
      if (!target) return;

      e.preventDefault();

      target.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });

      // Met à jour l'URL (pratique pour partager + back)
      history.pushState(null, "", id);

      // Accessibilité : focus
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    });
  });
});

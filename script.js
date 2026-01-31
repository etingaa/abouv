// app.js
// Objectif : rendre la navigation plus "automatique" et agréable
// - Met le lien actif (is-active) selon la page actuelle
// - Ajoute un scroll doux sur les liens d’ancre (#section)

document.addEventListener("DOMContentLoaded", () => {
  // -----------------------------
  // 1) Lien actif automatique
  // -----------------------------
  // Exemple : si l’URL est /galeries.html => le lien href="galeries.html" reçoit .is-active
  const navLinks = document.querySelectorAll(".top__nav .nav__link");

  // Chemin de la page actuelle (ex: "/galeries.html")
  const currentPath = window.location.pathname;

  // On garde seulement le nom du fichier (ex: "galeries.html")
  const currentFile = currentPath.split("/").pop() || "index.html";

  navLinks.forEach((link) => {
    // Nettoie l’état avant d’appliquer le bon
    link.classList.remove("is-active");

    const href = link.getAttribute("href") || "";
    const hrefFile = href.split("/").pop();

    // Si le lien correspond à la page actuelle => active
    if (hrefFile === currentFile) {
      link.classList.add("is-active");
    }
  });

  // -----------------------------
  // 2) Scroll doux sur ancres (#...)
  // -----------------------------
  const anchorLinks = document.querySelectorAll('a[href^="#"]');

  anchorLinks.forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      const target = document.querySelector(id);

      if (!target) return; // si la section n’existe pas, on ne bloque pas

      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });

      // Option accessibilité : met le focus sur la section si elle peut le recevoir
      if (!target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "-1");
      }
      target.focus({ preventScroll: true });
    });
  });
});

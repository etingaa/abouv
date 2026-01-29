// =========================
// FILE: script.js
// =========================

(function () {
  const navLinks = Array.from(document.querySelectorAll("[data-route]"));
  const pages = Array.from(document.querySelectorAll("[data-page]"));

  function setActive(route) {
    // Toggle pages
    pages.forEach((p) => {
      p.classList.toggle("is-visible", p.dataset.page === route);
    });

    // Toggle nav styles
    navLinks.forEach((a) => {
      a.classList.toggle("is-active", a.dataset.route === route);
    });

    // Scroll top for page change (comme un site simple)
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function getRouteFromHash() {
    const raw = (location.hash || "#accueil").replace("#", "").trim();
    const allowed = new Set(["accueil", "apropos", "contact"]);
    return allowed.has(raw) ? raw : "accueil";
  }

  // Intercept clicks (optional — garde le hash propre)
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const route = link.dataset.route;
      // Laisse le hash se mettre à jour, le handler 'hashchange' fera le reste
      // (pas besoin de preventDefault)
      setTimeout(() => setActive(route), 0);
    });
  });

  window.addEventListener("hashchange", () => {
    setActive(getRouteFromHash());
  });

  // Init
  setActive(getRouteFromHash());

  // Formulaire (démo)
  const form = document.getElementById("contactForm");
  const status = document.getElementById("contactStatus");

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const data = new FormData(form);
      const name = String(data.get("name") || "").trim();
      const email = String(data.get("email") || "").trim();
      const message = String(data.get("message") || "").trim();

      if (!name || !email || !message) {
        status.textContent = "Merci de remplir au minimum : Nom, E-mail et message.";
        return;
      }

      // Ici tu brancheras un backend (Formspree, Netlify Forms, API perso, etc.)
      status.textContent = "Message envoyé (démo). Branche ton backend pour l’envoi réel.";
      form.reset();
    });
  }
})();

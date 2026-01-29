(function () {
  const ROUTES = new Set([
    "accueil",
    "galeries",
    "expositions",
    "articles",
    "interviews",
    "apropos",
    "contact",
  ]);

  const pages = Array.from(document.querySelectorAll("[data-page]"));
  const routeLinks = Array.from(document.querySelectorAll("a[data-route]"));
  const dropdownLinks = Array.from(document.querySelectorAll(".dropdown__link[data-route]"));
  const dropdownItems = Array.from(document.querySelectorAll(".nav__item--dropdown"));
  const dropdownToggles = Array.from(document.querySelectorAll(".nav__toggle"));

  function getRouteFromHash() {
    const raw = (location.hash || "#accueil").replace("#", "").trim();
    return ROUTES.has(raw) ? raw : "accueil";
  }

  function closeAllDropdowns() {
    dropdownItems.forEach((item) => {
      item.classList.remove("is-open");
      const btn = item.querySelector(".nav__toggle");
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  }

  function setActive(route) {
    // pages
    pages.forEach((p) => {
      p.classList.toggle("is-visible", p.dataset.page === route);
    });

    // reset active styles
    routeLinks.forEach((a) => a.classList.remove("is-active"));
    dropdownLinks.forEach((a) => a.classList.remove("is-active"));
    dropdownToggles.forEach((b) => b.classList.remove("is-active"));

    // mark active link
    const activeLink = document.querySelector(`a[data-route="${route}"]`);
    if (activeLink) activeLink.classList.add("is-active");

    // if active route is inside a dropdown, mark parent toggle too
    const parentDropdown = activeLink ? activeLink.closest(".nav__item--dropdown") : null;
    if (parentDropdown) {
      const parentToggle = parentDropdown.querySelector(".nav__toggle");
      if (parentToggle) parentToggle.classList.add("is-active");
    }

    closeAllDropdowns();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  // Dropdown toggle behavior
  dropdownToggles.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();

      const item = btn.closest(".nav__item--dropdown");
      const isOpen = item.classList.contains("is-open");

      closeAllDropdowns();
      if (!isOpen) {
        item.classList.add("is-open");
        btn.setAttribute("aria-expanded", "true");
      }
    });
  });

  // Clicking a dropdown link -> navigate + close dropdown
  dropdownLinks.forEach((a) => {
    a.addEventListener("click", () => {
      // hashchange will call setActive
      closeAllDropdowns();
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    const insideNav = e.target.closest(".nav");
    if (!insideNav) closeAllDropdowns();
  });

  // Close on ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllDropdowns();
  });

  window.addEventListener("hashchange", () => {
    setActive(getRouteFromHash());
  });

  // Init
  setActive(getRouteFromHash());

  // Formulaire contact (démo)
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

      status.textContent = "Message envoyé (démo). Branche un backend pour l’envoi réel.";
      form.reset();
    });
  }
})();

/* app.js
   Interactions simples : lightbox + scroll doux + accessibilité
*/

document.addEventListener("DOMContentLoaded", () => {
  // ---------
  // 1) Lightbox (pour la grille .mosaic)
  // ---------
  // On ouvre la lightbox quand on clique une image de la mosaïque
  const mosaicLinks = document.querySelectorAll(".mosaic a");

  // On crée la lightbox une fois (si elle n’existe pas déjà)
  let lightbox = document.querySelector(".lightbox");
  if (!lightbox) {
    lightbox = document.createElement("div");
    lightbox.className = "lightbox";
    lightbox.setAttribute("aria-hidden", "true");
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-label", "Aperçu de l’image");
    lightbox.innerHTML = `
      <button class="lightbox__close" type="button" aria-label="Fermer">×</button>
      <img class="lightbox__img" alt="" />
    `;
    document.body.appendChild(lightbox);
  }

  const lbImg = lightbox.querySelector(".lightbox__img");
  const lbClose = lightbox.querySelector(".lightbox__close");

  function openLightbox(src, alt = "") {
    lbImg.src = src;
    lbImg.alt = alt;
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden"; // évite le scroll derrière
  }

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    lbImg.src = "";
    document.body.style.overflow = "";
  }

  // Clic sur une image (dans la mosaïque)
  mosaicLinks.forEach((a) => {
    a.addEventListener("click", (e) => {
      const img = a.querySelector("img");
      if (!img) return;

      // Si ton lien va vers une autre page (ex: galeries.html),
      // on ne bloque pas la navigation.
      // MAIS si tu veux une lightbox sur la page d’accueil,
      // alors on empêche la navigation uniquement si l'image existe.
      // -> Ici je choisis d’ouvrir la lightbox ET d’empêcher le lien.
      e.preventDefault();

      // Utilise une meilleure version si tu veux (w=2000)
      const bigSrc = img.src.replace("w=1200", "w=2000");
      openLightbox(bigSrc, img.alt || "");
    });
  });

  // Fermeture : bouton X
  lbClose.addEventListener("click", closeLightbox);

  // Fermeture : clic hors image
  lightbox.addEventListener("click", (e) => {
    const clickedOnBackdrop = e.target === lightbox;
    if (clickedOnBackdrop) closeLightbox();
  });

  // Fermeture : touche Échap
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightbox.classList.contains("is-open")) {
      closeLightbox();
    }
  });

  // ---------
  // 2) Scroll doux (si tu as des liens vers #sections)
  // ---------
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  anchorLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href");
      const target = document.querySelector(id);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
});

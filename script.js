/* Navigation one-page (sans changement de page) */
const menuBtns = [...document.querySelectorAll(".nav__link[data-target]")];

function scrollToTarget(selector) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

menuBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    scrollToTarget(btn.dataset.target);
  });
});

// Onglet actif selon la section visible
const sections = menuBtns
  .map(b => document.querySelector(b.dataset.target))
  .filter(Boolean);

const observer = new IntersectionObserver((entries) => {
  const visible = entries
    .filter(e => e.isIntersecting)
    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

  if (!visible) return;

  const id = "#" + visible.target.id;
  menuBtns.forEach(b => {
    b.classList.toggle("is-active", b.dataset.target === id);
  });
}, {
  threshold: [0.3, 0.6]
});

sections.forEach(section => observer.observe(section));


document.querySelectorAll("[data-scroll]").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-scroll");
    if (!target) return;
    history.pushState(null, "", target);
    setActiveByHash();
    smoothScrollTo(target);
  });
});

window.addEventListener("popstate", setActiveByHash);
setActiveByHash();

/* Lightbox galerie */
const lightbox = document.getElementById("lightbox");
const lightboxImg = lightbox.querySelector(".lightbox__img");
const closeBtn = lightbox.querySelector(".lightbox__close");

function openLightbox(src) {
  lightboxImg.src = src;
  lightbox.classList.add("is-open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  lightbox.classList.remove("is-open");
  lightbox.setAttribute("aria-hidden", "true");
  lightboxImg.src = "";
  document.body.style.overflow = "";
}

document.getElementById("galleryGrid").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-full]");
  if (!btn) return;
  openLightbox(btn.getAttribute("data-full"));
});

closeBtn.addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (e) => {
  // clic en dehors de l'image => fermer
  if (e.target === lightbox) closeLightbox();
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && lightbox.classList.contains("is-open")) closeLightbox();
});

/* Formulaires (UX simple comme sur la capture) */
const contactForm = document.getElementById("contactForm");
const formHint = document.getElementById("formHint");

contactForm.addEventListener("submit", (e) => {
  e.preventDefault();
  formHint.textContent = "Merci — message envoyé (demo).";
  contactForm.reset();
  setTimeout(() => (formHint.textContent = ""), 2500);
});

const newsletterForm = document.getElementById("newsletterForm");
newsletterForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const btn = newsletterForm.querySelector("button");
  const old = btn.textContent;
  btn.textContent = "Inscrit ✓";
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = old;
    btn.disabled = false;
    newsletterForm.reset();
  }, 1800);
});

// artwork-modal.js — fiche d'une œuvre en plein écran (image, titre, technique, format, statut,
// « Demander des informations »), avec précédent / suivant. Utilisée par le portfolio et l'accueil.
// abouvModal.open(liste, index, { onShow(œuvre), onClose() }) : liste d'œuvres au format de abouvSheet.artworks() ;
// onShow est appelé à chaque œuvre affichée (ouverture, précédent / suivant), onClose à la fermeture
// (le portfolio s'en sert pour l'adresse oeuvres/<slug>.html et le bouton retour).
// (Styles : styles.css, « Modal ».)

(() => {
  "use strict";

  const t = (s) => (window.t ? window.t(s) : s);

  function escapeHtml(s){
    return String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  // "Huile sur Toile · 60 x 120 cm" (sans les champs vides) — technique traduite en anglais
  // la technique est masquée sur téléphone dans les vignettes du portfolio (styles.css) ; la taille reste
  function metaLine(a){
    const tech = a.technique ? `<span class="capTech">${escapeHtml(t(a.technique))}</span>` : "";
    const size = a.size ? `<span class="capSize">${escapeHtml(a.size.replace(/\s*x\s*/i, " × "))}</span>` : "";
    return tech && size ? `${tech}<span class="capTech"> · </span>${size}` : tech || size;
  }

  let els = null;
  let list = [];
  let index = -1;
  let hooks = {};

  function build(){
    const dialog = document.createElement("dialog");
    dialog.className = "artDialog";
    dialog.setAttribute("aria-labelledby", "modalTitle");
    dialog.innerHTML = `
      <div class="modal">
        <div class="modal__media">
          <img class="modal__img" alt="">
          <button class="modal__closeBtn" type="button" aria-label="${t("Fermer")}">×</button>
          <button class="modal__navBtn modal__navBtn--prev" type="button" aria-label="${t("Œuvre précédente")}">‹</button>
          <button class="modal__navBtn modal__navBtn--next" type="button" aria-label="${t("Œuvre suivante")}">›</button>
        </div>
        <div class="modal__info">
          <h2 class="modal__h" id="modalTitle"></h2>
          <p class="modal__meta"></p>
          <a class="modal__cta" href="contact" hidden>${t("Demander des informations")}</a>
        </div>
      </div>`;
    document.body.appendChild(dialog);

    const q = (sel) => dialog.querySelector(sel);
    els = {
      dialog,
      img: q(".modal__img"), title: q(".modal__h"), meta: q(".modal__meta"), cta: q(".modal__cta"),
      close: q(".modal__closeBtn"), prev: q(".modal__navBtn--prev"), next: q(".modal__navBtn--next"),
    };

    els.close.addEventListener("click", close);
    els.prev.addEventListener("click", () => show(index - 1));
    els.next.addEventListener("click", () => show(index + 1));
    // clic sur le fond ou sur la zone vide autour de l'image -> fermer
    dialog.addEventListener("click", (e) => {
      const el = e.target;
      if(el === dialog || el.classList.contains("modal") || el.classList.contains("modal__media")) close();
    });
    // "close" couvre aussi la touche Échap gérée nativement par <dialog>
    dialog.addEventListener("close", () => { document.body.style.overflow = ""; const h = hooks; hooks = {}; if(h.onClose) h.onClose(); });
    document.addEventListener("keydown", (e) => {
      if(!dialog.open) return;
      if(e.key === "ArrowLeft") show(index - 1);
      if(e.key === "ArrowRight") show(index + 1);
    });
  }

  function show(i){
    const n = list.length;
    if(!n) return;
    index = (i + n) % n;
    const a = list[index];

    // miniature tout de suite, puis image d'origine dès qu'elle est chargée
    els.img.src = a.thumb || a.image;
    els.img.alt = a.title || "";
    const full = new Image();
    full.onload = () => { if(list[index] === a) els.img.src = a.image; };
    full.src = a.image;

    els.title.textContent = (a.title || "").toUpperCase();

    const parts = [];
    const meta = metaLine(a);
    if(meta) parts.push(meta);
    if(a.status){
      const label = t(a.status === "vendue" ? "statut|Vendue" : "statut|Disponible");
      parts.push(`<span class="statusText ${a.status}">${label}</span>` +
                 (a.status === "disponible" && a.where ? ` · ${escapeHtml(t(a.where))}` : ""));
    }
    els.meta.innerHTML = parts.join(" · ");

    // œuvre disponible -> lien vers le formulaire, message pré-rempli
    els.cta.hidden = a.status !== "disponible";
    els.cta.href = "contact?oeuvre=" + encodeURIComponent(a.title || "");

    const multi = n > 1;
    els.prev.hidden = !multi;
    els.next.hidden = !multi;
    if(hooks.onShow) hooks.onShow(a);
  }

  // opts.pointer : ouverte à la souris / au doigt -> pas de contour de focus sur le bouton ×
  function open(items, i, opts = {}){
    if(!els) build();
    list = items;
    hooks = { onShow: opts.onShow, onClose: opts.onClose };
    show(i);
    document.body.style.overflow = "hidden"; // pas de scroll de la page derrière
    els.dialog.showModal();
    if(opts.pointer){ els.close.blur(); els.close.focus({ focusVisible: false }); }
  }

  function close(){ if(els && els.dialog.open) els.dialog.close(); }

  const isOpen = () => !!(els && els.dialog.open);

  window.abouvModal = { open, close, isOpen, escapeHtml, metaLine };
})();

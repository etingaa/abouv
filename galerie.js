// galerie.js — page d'accueil : galerie d'art virtuelle en 3D (Three.js).
// On se promène parmi les toiles DISPONIBLES du Google Sheet, accrochées à leur taille réelle.
//
// Organisation :
//   - données     : abouvSheet.artworks() (sheet.js) -> œuvres disponibles avec leurs dimensions en cm
//   - accrochage  : planWalls() répartit les toiles sur les 4 murs ; hangArtworks() crée les toiles
//   - décor       : buildRoom() construit la salle (murs, sol, plafond, rails). Tout le décor est là :
//                   on pourra le remplacer par un modèle .glb ou un monde Gaussian splat sans toucher au reste,
//                   tant que la fonction rend les mêmes repères de murs (voir WALLS).
//   - lumière     : lumière d'ambiance + 3 spots qui suivent l'œuvre regardée ; les autres toiles ont
//                   un halo peint sur le mur (plan transparent en dégradé), sans coût de calcul.
//   - navigation  : clic sur une toile, flèches du clavier, boutons ‹ ›, glisser sur mobile.
//   - textures    : vignettes (images/thumbs) d'abord ; version HD (images/hd/<même nom>) seulement pour
//                   l'œuvre regardée et ses voisines, si elle figure dans images/hd/list.json.

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const CFG = {
  eye: 1.6,             // hauteur des yeux (m)
  center: 1.55,         // centre des toiles (m)
  ceiling: 4.0,         // hauteur sous plafond (m)
  gap: 1.4,             // espace entre deux toiles (m)
  margin: 1.8,          // espace libre au bout de chaque mur (m)
  minDepth: 9,          // largeur minimale de la salle (m)
  thickness: 0.03,      // châssis (m)
  travel: 1.2,          // durée d'un déplacement (s)
  readyCount: 8,        // textures chargées avant de pouvoir entrer
  hdList: "images/hd/list.json",
};

const isMobile = matchMedia("(max-width: 760px), (pointer: coarse)").matches;
const tr = (s) => (window.t ? window.t(s) : s);
const fallback = (reason) => window.__g3dFallback ? window.__g3dFallback(reason) : location.replace("accueil.html");

const $ = (id) => document.getElementById(id);
const els = {
  stage: $("stage"), entry: $("entry"), bar: $("progressBar"), enter: $("enterBtn"),
  cartel: $("cartel"), count: $("cartelCount"), title: $("cartelTitle"), meta: $("cartelMeta"), cta: $("cartelCta"),
  controls: $("controls"), prev: $("prevBtn"), next: $("nextBtn"), srList: $("srList"),
};

/* =========================
   DONNÉES
   ========================= */

async function loadJSON(url){
  try{ const r = await fetch(url); return r.ok ? await r.json() : null; }catch(_){ return null; }
}

// Œuvres disponibles avec dimensions lisibles, en mètres.
// Si l'image et le format ne vont pas dans le même sens (portrait / paysage), on se fie à l'image.
async function loadWorks(){
  const [all, sizes] = await Promise.all([abouvSheet.artworks(), loadJSON("images/thumbs/sizes.json")]);
  const works = [];
  for (const a of all){
    if (a.status !== "disponible") continue;
    if (/sculpt/i.test(a.technique || a.category || "")) { console.info("Galerie 3D : sculpture non accrochée :", a.title); continue; }
    if (!a.cm) { console.warn("Galerie 3D : dimensions illisibles, œuvre ignorée :", a.title, a.size); continue; }
    let w = a.cm.w / 100, h = a.cm.h / 100;
    const px = sizes && sizes[a.file];
    if (px){
      const imgRatio = px[0] / px[1];
      if (w !== h && (imgRatio > 1) !== (w > h)) [w, h] = [h, w];
      // proportions de l'image très différentes du format annoncé : on garde la largeur, on suit l'image
      if (Math.abs(imgRatio - w / h) / (w / h) > 0.15) h = w / imgRatio;
    }
    works.push({ ...a, w, h });
  }
  return works;
}

/* =========================
   ACCROCHAGE : répartition sur les 4 murs
   ========================= */

// Murs vus de l'intérieur, dans l'ordre de la visite (on avance toujours vers la droite) :
// nord, est, sud, ouest. Chaque mur : point de départ (bord gauche vu de face), direction « droite », normale.
function wallFrames(L, S){
  const v = (x, z) => new THREE.Vector3(x, 0, z);
  return [
    { len: L, start: v(-L / 2, -S / 2), right: v(1, 0),  normal: v(0, 1)  },
    { len: S, start: v( L / 2, -S / 2), right: v(0, 1),  normal: v(-1, 0) },
    { len: L, start: v( L / 2,  S / 2), right: v(-1, 0), normal: v(0, -1) },
    { len: S, start: v(-L / 2,  S / 2), right: v(0, -1), normal: v(1, 0)  },
  ];
}

// Taille de la salle : on agrandit jusqu'à ce que toutes les toiles tiennent (espacement ≥ CFG.gap).
function planWalls(works){
  let L = 14;
  for (let tries = 0; tries < 60; tries++, L *= 1.06){
    const S = Math.max(CFG.minDepth, L * 0.5);
    const walls = wallFrames(L, S).map(w => ({ ...w, items: [] }));
    let k = 0, used = 0, ok = true;
    for (const a of works){
      while (k < 4 && CFG.margin * 2 + used + a.w > walls[k].len){ k++; used = 0; }
      if (k >= 4){ ok = false; break; }
      walls[k].items.push(a);
      used += a.w + CFG.gap;
    }
    if (!ok) continue;
    // toiles centrées sur chaque mur
    const placed = [];
    for (const wall of walls){
      const run = wall.items.reduce((s, a) => s + a.w, 0) + CFG.gap * Math.max(0, wall.items.length - 1);
      let x = (wall.len - run) / 2;
      for (const a of wall.items){
        const c = wall.start.clone().addScaledVector(wall.right, x + a.w / 2);
        c.y = CFG.center;
        placed.push({ work: a, wall, center: c });
        x += a.w + CFG.gap;
      }
    }
    return { L, S, walls, placed };
  }
  throw new Error("Trop d'œuvres pour la salle");
}

/* =========================
   TEXTURES PROCÉDURALES (aucune image à télécharger)
   ========================= */

function canvasTexture(size, draw, { repeat = 1, srgb = true } = {}){
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  return t;
}

// béton ciré clair : taches douces + grain fin
function concreteTexture(){
  return canvasTexture(1024, (g, s) => {
    g.fillStyle = "#cfcac2"; g.fillRect(0, 0, s, s);
    const rnd = mulberry(7);
    for (let i = 0; i < 260; i++){
      const x = rnd() * s, y = rnd() * s, r = 40 + rnd() * 220, l = rnd() > .5 ? 255 : 120;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, `rgba(${l},${l - 6},${l - 14},${0.035 + rnd() * 0.04})`);
      grd.addColorStop(1, `rgba(${l},${l},${l},0)`);
      g.fillStyle = grd;
      for (const dx of [-s, 0, s]) for (const dy of [-s, 0, s]) { g.save(); g.translate(dx, dy); g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }
    }
    const img = g.getImageData(0, 0, s, s), d = img.data;
    for (let i = 0; i < d.length; i += 4){ const n = (rnd() - .5) * 10; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    g.putImageData(img, 0, 0);
  });
}

// halo d'un spot sur le mur : ovale chaud, un peu plus haut que la toile
function haloTexture(){
  return canvasTexture(256, (g, s) => {
    const grd = g.createRadialGradient(s / 2, s * .44, 0, s / 2, s * .5, s / 2);
    grd.addColorStop(0, "rgba(255,244,228,.35)");
    grd.addColorStop(.5, "rgba(255,244,228,.1)");
    grd.addColorStop(1, "rgba(255,244,228,0)");
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
  }, { repeat: 1 });
}

function mulberry(a){ return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* =========================
   DÉCOR : la salle
   ========================= */

function buildRoom(scene, plan, renderer){
  const { L, S } = plan;
  const H = CFG.ceiling;
  const room = new THREE.Group();
  room.name = "room";

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf2eee7, roughness: .95, metalness: 0 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xe8e3db, roughness: .9 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xf6f4f0, roughness: 1 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: .5, metalness: .6 });

  // sol : béton ciré, léger reflet de la salle
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  const floorTex = concreteTexture();
  floorTex.repeat.set(L / 4, S / 4);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(L, S),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: .55, metalness: 0, envMap: env, envMapIntensity: .35 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  room.add(floor);

  // plafond
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(L, S), ceilMat);
  ceil.rotation.x = Math.PI / 2; ceil.position.y = H;
  room.add(ceil);

  // murs + plinthes
  for (const w of plan.walls){
    const mid = w.start.clone().addScaledVector(w.right, w.len / 2);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(w.len, H), wallMat);
    wall.position.set(mid.x, H / 2, mid.z);
    wall.rotation.y = Math.atan2(w.normal.x, w.normal.z);
    wall.receiveShadow = true;
    room.add(wall);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(w.len, .08, .012), trimMat);
    trim.position.set(mid.x + w.normal.x * .006, .04, mid.z + w.normal.z * .006);
    trim.rotation.y = wall.rotation.y;
    room.add(trim);
  }

  // rails d'éclairage au plafond, à 1,3 m des murs, et un projecteur au-dessus de chaque toile
  const railY = H - .02, off = 1.3;
  const rail = (len, x, z, alongX) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(alongX ? len : .035, .03, alongX ? .035 : len), metalMat);
    m.position.set(x, railY, z); room.add(m);
  };
  rail(L - 2 * off, 0, -S / 2 + off, true);
  rail(L - 2 * off, 0, S / 2 - off, true);
  rail(S - 2 * off, L / 2 - off, 0, false);
  rail(S - 2 * off, -L / 2 + off, 0, false);
  const can = new THREE.CylinderGeometry(.045, .055, .16, 16);
  for (const p of plan.placed){
    const pos = p.center.clone().addScaledVector(p.wall.normal, off);
    const fixture = new THREE.Mesh(can, metalMat);
    fixture.position.set(pos.x, railY - .12, pos.z);
    fixture.lookAt(p.center.x, p.center.y, p.center.z);
    fixture.rotateX(Math.PI / 2);
    room.add(fixture);
  }

  scene.add(room);
  return room;
}

/* =========================
   TOILES
   ========================= */

function hangArtworks(scene, plan, halo){
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: .85 });
  const pieces = [];
  plan.placed.forEach((p, i) => {
    const a = p.work;
    // face avant : l'image telle quelle, sans éclairage ni tone mapping -> couleurs fidèles
    const face = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    const mats = [edgeMat, edgeMat, edgeMat, edgeMat, face, edgeMat];
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(a.w, a.h, CFG.thickness), mats);
    const pos = p.center.clone().addScaledVector(p.wall.normal, CFG.thickness / 2 + .012);
    mesh.position.copy(pos);
    mesh.rotation.y = Math.atan2(p.wall.normal.x, p.wall.normal.z);
    mesh.castShadow = !isMobile;
    mesh.userData.index = i;
    scene.add(mesh);

    // halo peint sur le mur (remplacé par un vrai spot quand on regarde la toile)
    const hw = a.w + .9, hh = Math.min(CFG.ceiling - .3, a.h + 1.1);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(hw, hh),
      new THREE.MeshBasicMaterial({ map: halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .9 }));
    glow.position.copy(p.center).addScaledVector(p.wall.normal, .004);
    glow.position.y = CFG.center + .25;
    glow.rotation.y = mesh.rotation.y;
    scene.add(glow);

    pieces.push({ ...p, mesh, face, glow, hd: false });
  });
  return pieces;
}

/* =========================
   PROGRAMME
   ========================= */

async function main(){
  if (!window.abouvSheet) return fallback("sheet.js absent");

  const works = await loadWorks();
  if (!works.length) return fallback("aucune œuvre disponible");
  const plan = planWalls(works);

  // --- moteur
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.shadowMap.enabled = !isMobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  els.stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xefece6);
  const camera = new THREE.PerspectiveCamera(isMobile ? 58 : 50, innerWidth / innerHeight, .05, 200);

  // --- décor et lumière d'ambiance
  buildRoom(scene, plan, renderer);
  scene.add(new THREE.HemisphereLight(0xfffaf3, 0xd9d2c7, 2.4));
  const fill = new THREE.DirectionalLight(0xfff6ec, .5);
  fill.position.set(0, CFG.ceiling, 0);
  scene.add(fill);

  // --- toiles
  const pieces = hangArtworks(scene, plan, haloTexture());
  const n = pieces.length;

  // --- 3 vrais spots qui suivent l'œuvre regardée et ses voisines
  const spots = [];
  for (let k = 0; k < (isMobile ? 2 : 3); k++){
    const s = new THREE.SpotLight(0xfff1e2, 0, 0, .5, .7, 1.6);
    s.castShadow = !isMobile && k === 0;
    s.shadow.mapSize.set(1024, 1024);
    s.shadow.bias = -.0004;
    s.shadow.radius = 6;
    scene.add(s, s.target);
    spots.push({ light: s, piece: -1, level: 0 });
  }
  function aimSpots(i){
    const want = [i, (i + 1) % n, (i - 1 + n) % n].slice(0, spots.length);
    spots.forEach((sp, k) => {
      const p = pieces[want[k]];
      sp.piece = want[k];
      const from = p.center.clone().addScaledVector(p.wall.normal, 1.3);
      sp.light.position.set(from.x, CFG.ceiling - .2, from.z);
      sp.light.target.position.copy(p.center);
      const reach = sp.light.position.distanceTo(p.center);
      sp.light.angle = Math.min(.7, Math.atan((Math.max(p.work.w, p.work.h) / 2 + .45) / reach));
      sp.level = 0;
    });
  }

  // --- textures : vignettes d'abord (dans l'ordre de la visite)
  const loader = new THREE.TextureLoader();
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const prepare = (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; return t; };
  let loaded = 0;
  const setProgress = () => {
    const pct = Math.round(loaded / n * 100);
    els.bar.style.width = pct + "%";
    els.bar.parentElement.setAttribute("aria-valuenow", pct);
  };
  const ready = new Promise((resolve) => {
    pieces.forEach((p) => {
      loader.load(p.work.thumb, (t) => {
        p.face.map = prepare(t); p.face.needsUpdate = true;
        loaded++; setProgress();
        if (loaded >= Math.min(CFG.readyCount, n)) resolve();
      }, undefined, () => {
        loader.load(p.work.image, (t) => { p.face.map = prepare(t); p.face.needsUpdate = true; loaded++; setProgress(); if (loaded >= Math.min(CFG.readyCount, n)) resolve(); },
          undefined, () => { console.warn("Galerie 3D : image introuvable :", p.work.title); loaded++; setProgress(); if (loaded >= Math.min(CFG.readyCount, n)) resolve(); });
      });
    });
  });

  // --- HD : seulement pour l'œuvre regardée et ses deux voisines, si listée dans images/hd/list.json
  const hdFiles = new Set(((await loadJSON(CFG.hdList)) || []).map(String));
  function loadHD(i){
    for (const k of [i, (i + 1) % n, (i - 1 + n) % n]){
      const p = pieces[k];
      if (p.hd || !hdFiles.has(p.work.file)) continue;
      p.hd = true;
      loader.load(encodeURI("images/hd/" + p.work.file), (t) => {
        const old = p.face.map;
        p.face.map = prepare(t); p.face.needsUpdate = true;
        if (old) old.dispose();
      }, undefined, () => { p.hd = false; });
    }
  }

  // --- liste cachée pour lecteurs d'écran / SEO
  els.srList.innerHTML = pieces.map(p =>
    `<li><a href="portfolio.html?q=${encodeURIComponent(p.work.title)}">${escapeHtml(p.work.title)}</a> — ${escapeHtml(metaText(p.work))}</li>`).join("");

  /* ---------- caméra ---------- */
  const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  function viewFor(i){
    const p = pieces[i];
    // la toile occupe environ 40 % de la hauteur de l'écran : on voit le mur, les voisines, le sol
    const fit = Math.max(p.work.h / (2 * tan * .4), p.work.w / (2 * tan * camera.aspect * .5));
    const d = THREE.MathUtils.clamp(fit, 4.6, Math.min(7, plan.S - 1.2));
    const pos = p.center.clone().addScaledVector(p.wall.normal, d);
    pos.y = CFG.eye;
    const m = new THREE.Matrix4().lookAt(pos, new THREE.Vector3(p.center.x, CFG.center + .02, p.center.z), new THREE.Vector3(0, 1, 0));
    return { pos, quat: new THREE.Quaternion().setFromRotationMatrix(m) };
  }

  // vue d'ensemble de départ (derrière l'écran d'entrée) : depuis l'angle sud-ouest de la salle
  {
    camera.position.set(-plan.L / 2 + 2.5, CFG.eye, plan.S / 2 - 2.5);
    camera.lookAt(0, CFG.center, -plan.S / 2);
  }
  const base = { pos: camera.position.clone(), quat: camera.quaternion.clone() };
  let move = null, current = -1, entered = false;
  const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  function goTo(i, instant = false){
    i = (i + n) % n;
    current = i;
    const to = viewFor(i);
    const dist = camera.position.distanceTo(to.pos);
    move = instant ? null : { from: { pos: base.pos.clone(), quat: base.quat.clone() }, to, t0: performance.now(), dur: (CFG.travel + Math.min(.6, dist * .03)) * 1000 };
    if (instant){ base.pos.copy(to.pos); base.quat.copy(to.quat); }
    els.cartel.classList.remove("is-on");
    aimSpots(i);
    loadHD(i);
  }

  function showCartel(i){
    const a = pieces[i].work;
    els.count.textContent = `${i + 1} / ${n}`;
    els.title.textContent = a.title;
    els.meta.textContent = metaText(a);
    const q = new URLSearchParams({ sujet: "acquisition", oeuvre: a.title });
    if (a.technique) q.set("technique", a.technique);
    if (a.size) q.set("dimensions", a.size.replace(/\s*x\s*/i, " × "));
    els.cta.href = "contact.html?" + q.toString();
    els.cartel.hidden = false;
    requestAnimationFrame(() => els.cartel.classList.add("is-on"));
  }

  /* ---------- regard à la souris (quelques degrés) ---------- */
  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!isMobile){
    addEventListener("pointermove", (e) => {
      look.tx = (e.clientX / innerWidth - .5) * -THREE.MathUtils.degToRad(5);
      look.ty = (e.clientY / innerHeight - .5) * -THREE.MathUtils.degToRad(3);
    }, { passive: true });
  }

  /* ---------- clic / glisser ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const meshes = pieces.map(p => p.mesh);
  const pick = (x, y) => {
    ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(meshes, false)[0];
    return hit ? hit.object.userData.index : -1;
  };
  let down = null;
  els.stage.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  els.stage.addEventListener("pointerup", (e) => {
    if (!down || !entered) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y, dt = performance.now() - down.t;
    down = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3 && dt < 800){ goTo(current + (dx < 0 ? 1 : -1)); return; }
    if (Math.hypot(dx, dy) < 8){ const i = pick(e.clientX, e.clientY); if (i >= 0 && i !== current) goTo(i); }
  });
  if (!isMobile){
    els.stage.addEventListener("pointermove", (e) => {
      if (!entered) return;
      els.stage.classList.toggle("is-hover", pick(e.clientX, e.clientY) >= 0);
    });
  }
  addEventListener("keydown", (e) => {
    if (!entered || e.target.closest("input, textarea")) return;
    if (e.key === "ArrowRight") { e.preventDefault(); goTo(current + 1); }
    if (e.key === "ArrowLeft")  { e.preventDefault(); goTo(current - 1); }
  });
  els.prev.addEventListener("click", () => goTo(current - 1));
  els.next.addEventListener("click", () => goTo(current + 1));

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    if (current >= 0 && !move){ const v = viewFor(current); base.pos.copy(v.pos); base.quat.copy(v.quat); }
  });

  /* ---------- boucle de rendu ---------- */
  const tmpQ = new THREE.Quaternion(), lookQ = new THREE.Quaternion(), euler = new THREE.Euler(0, 0, 0, "YXZ");
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(.05, clock.getDelta());
    if (move){
      const k = Math.min(1, (performance.now() - move.t0) / move.dur), e = ease(k);
      base.pos.lerpVectors(move.from.pos, move.to.pos, e);
      base.quat.slerpQuaternions(move.from.quat, move.to.quat, e);
      if (k >= 1){ move = null; showCartel(current); }
    }
    look.x += (look.tx - look.x) * Math.min(1, dt * 3);
    look.y += (look.ty - look.y) * Math.min(1, dt * 3);
    euler.set(look.y, look.x, 0);
    lookQ.setFromEuler(euler);
    camera.position.copy(base.pos);
    camera.quaternion.copy(tmpQ.copy(base.quat).multiply(lookQ));

    // spots : montée douce ; halo peint estompé sur les toiles éclairées par un vrai spot
    for (const sp of spots){
      sp.level = Math.min(1, sp.level + dt * 1.5);
      sp.light.intensity = 18 * sp.level;
    }
    for (let i = 0; i < n; i++){
      const lit = spots.some(sp => sp.piece === i);
      const m = pieces[i].glow.material;
      m.opacity += ((lit ? .08 : .3) - m.opacity) * Math.min(1, dt * 2);
    }
    renderer.render(scene, camera);
  });

  /* ---------- entrée ---------- */
  await ready;
  window.__g3dReady = true;
  clearTimeout(window.__g3dTimer);
  els.enter.disabled = false;
  els.enter.focus({ preventScroll: true });
  els.enter.addEventListener("click", () => {
    entered = true;
    els.entry.classList.add("is-gone");
    els.controls.hidden = false;
    goTo(0);
  }, { once: true });
}

function metaText(a){
  return [a.technique && tr(a.technique), a.size && a.size.replace(/\s*x\s*/i, " × ")].filter(Boolean).join(" · ");
}
function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);
}

const start = () => main().catch((err) => { console.error(err); fallback("erreur : " + err.message); });
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();

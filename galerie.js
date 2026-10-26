// galerie.js — page d'accueil : galerie d'art virtuelle en 3D (Three.js).
// Une petite salle aux murs bleu nuit, parquet de chêne, projecteurs sur rail.
// Dix toiles DISPONIBLES du Google Sheet, tirées au hasard, accrochées à leur taille réelle.
//
// Organisation :
//   - données     : abouvSheet.artworks() (sheet.js) -> œuvres disponibles avec leurs dimensions en cm
//   - accrochage  : planWalls() répartit les toiles sur 3 murs (le 4e a la porte) ; hangArtworks() crée les toiles
//   - décor       : buildRoom() construit la salle (murs, porte, vestibule, parquet, plafond, rails, banc).
//                   Seule fonction à remplacer pour passer à un modèle .glb ou à un monde Gaussian splat,
//                   tant que les repères de murs de planWalls() restent valables.
//   - lumière     : un projecteur (SpotLight) par toile éclaire le mur ; la toile elle-même est affichée
//                   sans éclairage (couleurs de l'image, jamais surexposées)
//   - navigation  : promenade automatique lente autour de la salle ; glisser = regarder à 360°,
//                   clic sur le parquet = y aller, survol d'une toile = étiquette, clic = sa fiche dans le portfolio ;
//                   la promenade reprend après quelques secondes sans action
//   - textures    : vignettes (images/thumbs) ; HD (images/hd/<même nom>, si listée dans images/hd/list.json)
//                   pour les toiles proches de soi

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const CFG = {
  count: 12,            // toiles tirées au hasard (dont 2 de part et d'autre de la porte)
  eye: 1.6,             // hauteur des yeux (m)
  center: 1.62,         // centre des toiles (m)
  scale: 1.6,           // les toiles sont agrandies (taille réelle × 1,6) pour bien les voir à l'écran
  ceiling: 3.6,         // hauteur sous plafond (m)
  gap: 1.1,             // espace entre deux toiles (m)
  margin: 0.8,          // espace libre au bout de chaque mur (m)
  thickness: 0.03,      // châssis (m)
  door: { w: 1.4, h: 2.6 },
  vestibule: 3.2,       // profondeur du vestibule (m)
  travel: 1.3,          // durée d'un déplacement (s)
  hdList: "images/hd/list.json",
  wall: 0x2c406a,       // bleu nuit
  trim: 0x1a2742,
  // version claire (bouton du header) : murs ivoire, plinthes grège, fond papier, lumière plus généreuse
  light: { wall: 0xf4f1eb, trim: 0x1c2647, bg: 0xefebe3, sign: "rgba(22,30,56,.9)", exposure: 1.3, hemi: 1.8, bounce: 14, ground: 0xd9cfbf, ceil: .62 },
  dark:  { wall: 0x2c406a, trim: 0x1a2742, bg: 0x0c1220, sign: "rgba(236,232,225,.92)", exposure: 1.0, hemi: .5, bounce: 6, ground: 0x3a2a1c, ceil: 0 },
};
const isLight = () => document.documentElement.dataset.theme === "light";

// champ de vision humain : ~ 70° de large, la zone que l'œil regarde vraiment (pas le grand-angle d'un appareil
// photo qui déforme les bords) ; la même largeur quel que soit le format de l'écran
function humanFov(){
  const hfov = 70 * Math.PI / 180, aspect = innerWidth / innerHeight;
  return Math.min(68, Math.max(38, 2 * Math.atan(Math.tan(hfov / 2) / aspect) * 180 / Math.PI));
}
const isMobile = matchMedia("(max-width: 760px), (pointer: coarse)").matches;
const tr = (s) => (window.t ? window.t(s) : s);
const fallback = (reason) => window.__g3dFallback ? window.__g3dFallback(reason) : location.replace("classique" + location.search);

const $ = (id) => document.getElementById(id);
const els = {
  stage: $("stage"), ctrl: $("ctrl"), ctrlPlay: $("ctrlPlay"), ctrlSlow: $("ctrlSlow"), ctrlFast: $("ctrlFast"), ctrlSpeed: $("ctrlSpeed"), ctrlPath: $("ctrlPath"), loading: $("loading"), bar: $("progressBar"), hint: $("hint"),
  tip: $("tip"), tipTitle: $("tipTitle"), tipMeta: $("tipMeta"), tipLink: $("tipLink"), srList: $("srList"),
};

/* =========================
   DONNÉES
   ========================= */

async function loadJSON(url){
  try{ const r = await fetch(url); return r.ok ? await r.json() : null; }catch(_){ return null; }
}

function shuffle(arr){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Œuvres disponibles avec dimensions lisibles, en mètres ; CFG.count tirées au hasard.
// Si l'image et le format ne vont pas dans le même sens (portrait / paysage), on se fie à l'image.
async function loadWorks(){
  const [all, sizes] = await Promise.all([abouvSheet.artworks(), loadJSON("images/thumbs/sizes.json")]);
  const works = [];
  for (const a of all){
    if (a.status !== "disponible") continue;
    if (/sculpt/i.test(`${a.technique} ${a.category}`)) continue;
    if (!a.cm) { console.warn("Galerie 3D : dimensions illisibles, œuvre ignorée :", a.title, a.size); continue; }
    if (sizes && !sizes[a.file]) { console.warn("Galerie 3D : image absente de images/thumbs, œuvre ignorée :", a.title, a.file); continue; }
    let w = a.cm.w / 100, h = a.cm.h / 100;
    const px = sizes && sizes[a.file];
    if (px){
      const imgRatio = px[0] / px[1];
      if (w !== h && (imgRatio > 1) !== (w > h)) [w, h] = [h, w];
      if (Math.abs(imgRatio - w / h) / (w / h) > 0.15) h = w / imgRatio;
    }
    w *= CFG.scale; h *= CFG.scale;
    if (h > 2.3){ w *= 2.3 / h; h = 2.3; }    // jamais plus haut que 2,3 m
    works.push({ ...a, w, h });
  }
  return shuffle(works).slice(0, CFG.count);
}

/* =========================
   ACCROCHAGE : 3 murs (nord, est, sud) ; la porte est au milieu du mur ouest
   ========================= */

function wallFrames(L, S){
  const v = (x, z) => new THREE.Vector3(x, 0, z);
  return [
    { len: L, start: v(-L / 2, -S / 2), right: v(1, 0),  normal: v(0, 1)  },  // nord
    { len: S, start: v( L / 2, -S / 2), right: v(0, 1),  normal: v(-1, 0) },  // est
    { len: L, start: v( L / 2,  S / 2), right: v(-1, 0), normal: v(0, -1) },  // sud
  ];
}

// La salle grandit juste assez pour que tout tienne : petite et chaleureuse.
function planWalls(all){
  // les deux toiles les plus étroites vont de part et d'autre de la porte (mur ouest), les autres sur les 3 murs
  const byWidth = all.slice().sort((a, b) => a.w - b.w);
  const doorPair = byWidth.slice(0, 2);
  const works = all.filter(a => !doorPair.includes(a));
  for (let L = 5.6; L < 30; L += 0.2){
    const S = Math.max(4.6, Math.round(L * 0.78 * 10) / 10);
    const side = (S - CFG.door.w) / 2;                       // largeur de mur de chaque côté de la porte
    if (doorPair.some(a => a.w > side - .6)) continue;
    const walls = wallFrames(L, S).map(w => ({ ...w, items: [] }));
    let k = 0, used = 0, ok = true;
    for (const a of works){
      while (k < walls.length && CFG.margin * 2 + used + a.w > walls[k].len){ k++; used = 0; }
      if (k >= walls.length){ ok = false; break; }
      walls[k].items.push(a);
      used += a.w + CFG.gap;
    }
    if (!ok) continue;
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
    // mur de la porte (ouest), vu de l'intérieur : d'abord le côté sud, puis le côté nord
    const west = { len: S, start: new THREE.Vector3(-L / 2, 0, S / 2), right: new THREE.Vector3(0, 0, -1), normal: new THREE.Vector3(1, 0, 0) };
    doorPair.forEach((a, i) => {
      const z = (i === 0 ? 1 : -1) * (CFG.door.w / 2 + side / 2);
      placed.push({ work: a, wall: west, center: new THREE.Vector3(-L / 2, CFG.center, z) });
    });
    return { L, S, walls, placed };
  }
  throw new Error("Trop d'œuvres pour la salle");
}

/* =========================
   TEXTURES PROCÉDURALES
   ========================= */

function mulberry(a){ return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function canvasTexture(size, draw, srgb = true){
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// Parquet de chêne à lames droites : 1 tuile = 2 m × 2 m, 11 lames de 18 cm, longueurs variées,
// teinte propre à chaque lame, veinage, nœuds, joints. Couleur + carte de rugosité assortie.
function parquetTextures(){
  const size = isMobile ? 1024 : 2048, rows = 11, rowH = size / rows;
  const rnd = mulberry(11);
  const planks = [];
  for (let r = 0; r < rows; r++){
    let x = -rnd() * size * .5;
    while (x < size){
      const len = size * (.42 + rnd() * .5);
      planks.push({ x, y: r * rowH, w: len, h: rowH, tone: rnd(), seed: Math.floor(rnd() * 1e6) });
      x += len;
    }
  }
  const color = canvasTexture(size, (g) => {
    for (const p of planks){
      const l = 41 + p.tone * 9, s = 40 + p.tone * 8;
      const draw = (ox) => {
        g.save(); g.beginPath(); g.rect(p.x + ox, p.y, p.w, p.h); g.clip();
        g.fillStyle = `hsl(${27 + p.tone * 5}, ${s}%, ${l}%)`;
        g.fillRect(p.x + ox, p.y, p.w, p.h);
        const pr = mulberry(p.seed);
        for (let i = 0; i < 26; i++){
          const yy = p.y + pr() * p.h, amp = 1 + pr() * 3, freq = .004 + pr() * .01, ph = pr() * 6;
          g.strokeStyle = `rgba(${pr() > .5 ? "70,40,15" : "255,235,200"},${.05 + pr() * .1})`;
          g.lineWidth = .6 + pr() * 1.6;
          g.beginPath();
          for (let xx = p.x + ox; xx <= p.x + ox + p.w; xx += 12) g.lineTo(xx, yy + Math.sin(xx * freq + ph) * amp);
          g.stroke();
        }
        if (pr() > .6){
          const kx = p.x + ox + pr() * p.w, ky = p.y + p.h * (.3 + pr() * .4);
          const grd = g.createRadialGradient(kx, ky, 0, kx, ky, 9 + pr() * 10);
          grd.addColorStop(0, "rgba(60,32,12,.45)"); grd.addColorStop(1, "rgba(60,32,12,0)");
          g.fillStyle = grd; g.fillRect(kx - 22, ky - 22, 44, 44);
        }
        g.restore();
        g.fillStyle = "rgba(40,22,8,.55)";
        g.fillRect(p.x + ox, p.y, p.w, 1.5);
        g.fillRect(p.x + ox, p.y, 1.5, p.h);
      };
      draw(0); if (p.x < 0) draw(size); if (p.x + p.w > size) draw(-size);
    }
  });
  const rough = canvasTexture(size / 2, (g, s) => {
    const k = s / size;
    g.fillStyle = "rgb(120,120,120)"; g.fillRect(0, 0, s, s);
    for (const p of planks){
      const v = 100 + Math.floor(p.tone * 50);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(p.x * k, p.y * k, p.w * k, p.h * k);
      g.fillStyle = "rgb(230,230,230)";
      g.fillRect(p.x * k, p.y * k, p.w * k, 1);
    }
  }, false);
  return { color, rough };
}

// ombre ambiante au pied des murs et au plafond (dégradé vertical)
function aoTexture(){
  return canvasTexture(64, (g, s) => {
    const grd = g.createLinearGradient(0, 0, 0, s);
    grd.addColorStop(0, "rgba(0,0,0,.5)"); grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
  });
}

// cartel mural : petite plaque blanche avec le titre, la technique et le format
function labelTexture(a){
  return canvasTexture(512, (g, s) => {
    g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, s, s);
    g.fillStyle = "#1a1a1a"; g.textBaseline = "top";
    g.font = `500 ${Math.round(s * .085)}px "Cormorant Garamond", Garamond, serif`;
    wrapText(g, a.title, s * .1, s * .14, s * .8, s * .1, 3);
    g.fillStyle = "#555";
    g.font = `400 ${Math.round(s * .05)}px Archivo, Helvetica, Arial, sans-serif`;
    g.fillText(tr(a.technique || ""), s * .1, s * .62);
    g.fillText((a.size || "").replace(/\s*x\s*/i, " × "), s * .1, s * .7);
    g.fillText("Annick Bouvattier", s * .1, s * .82);
  });
}
function wrapText(g, text, x, y, maxW, lineH, maxLines){
  const words = String(text || "").split(/\s+/);
  let line = "", n = 0;
  for (const w of words){
    const test = line ? line + " " + w : w;
    if (g.measureText(test).width > maxW && line){ g.fillText(line, x, y + n * lineH); line = w; if (++n >= maxLines) return; }
    else line = test;
  }
  if (line) g.fillText(line, x, y + n * lineH);
}

// ombre douce derrière une toile (contact avec le mur)
function contactShadowTexture(){
  return canvasTexture(128, (g, s) => {
    const grd = g.createRadialGradient(s / 2, s / 2, s * .3, s / 2, s / 2, s / 2);
    grd.addColorStop(0, "rgba(0,0,0,.55)"); grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
  });
}

/* =========================
   DÉCOR : la salle, la porte, le vestibule
   ========================= */

function buildRoom(scene, plan, renderer){
  const { L, S } = plan;
  const H = CFG.ceiling;
  const room = new THREE.Group();
  room.name = "room";

  const pal = isLight() ? CFG.light : CFG.dark;
  const wallMat = new THREE.MeshStandardMaterial({ color: pal.wall, roughness: .92 });
  const trimMat = new THREE.MeshStandardMaterial({ color: pal.trim, roughness: .6 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xece8e1, roughness: 1 });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: .45, metalness: .5 });

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), .04).texture;

  // parquet (salle + vestibule)
  const V = CFG.vestibule;
  const { color, rough } = parquetTextures();
  const floorLen = L + V;
  color.repeat.set(floorLen / 2, S / 2);
  rough.repeat.copy(color.repeat);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(floorLen, S),
    new THREE.MeshStandardMaterial({ map: color, roughnessMap: rough, roughness: .42, metalness: 0, envMap: env, envMapIntensity: .3 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.x = -V / 2;
  room.add(floor);

  // plafond
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(floorLen, S), ceilMat);
  ceil.rotation.x = Math.PI / 2; ceil.position.set(-V / 2, H, 0);
  room.add(ceil);

  // un pan de mur (largeur w, hauteur h) centré en (x, z), tourné vers `normal`, posé à la hauteur y0, avec plinthe
  const panel = (w, h, x, z, normal, y0 = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
    m.position.set(x, y0 + h / 2, z);
    m.rotation.y = Math.atan2(normal.x, normal.z);
    room.add(m);
    if (y0 === 0){
      const t = new THREE.Mesh(new THREE.BoxGeometry(w, .1, .015), trimMat);
      t.position.set(x + normal.x * .0075, .05, z + normal.z * .0075);
      t.rotation.y = m.rotation.y;
      room.add(t);
    }
    return m;
  };

  // murs accrochés
  const ao = aoTexture();
  const aoMat = new THREE.MeshBasicMaterial({ map: ao, transparent: true, depthWrite: false, opacity: .55 });
  for (const w of plan.walls){
    const mid = w.start.clone().addScaledVector(w.right, w.len / 2);
    panel(w.len, H, mid.x, mid.z, w.normal);
    // ombre au pied du mur, sur le parquet
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w.len, .45), aoMat);
    f.rotation.x = -Math.PI / 2;
    f.rotation.z = Math.atan2(w.normal.x, w.normal.z);   // côté sombre contre le mur
    f.position.set(mid.x + w.normal.x * .225, .002, mid.z + w.normal.z * .225);
    room.add(f);
    // ombre sous le plafond, sur le mur
    const c = new THREE.Mesh(new THREE.PlaneGeometry(w.len, .5), aoMat);
    c.position.set(mid.x + w.normal.x * .004, H - .25, mid.z + w.normal.z * .004);
    c.rotation.y = Math.atan2(w.normal.x, w.normal.z);
    room.add(c);
  }
  // mur ouest : porte au milieu (deux pans + linteau), visible des deux côtés
  const D = CFG.door, side = (S - D.w) / 2, xW = -L / 2;
  for (const nx of [1, -1]){
    const nrm = new THREE.Vector3(nx, 0, 0), x = xW + nx * .001;
    panel(side, H, x, -S / 2 + side / 2, nrm);
    panel(side, H, x, S / 2 - side / 2, nrm);
    panel(D.w, H - D.h, x, 0, nrm, D.h);
  }
  const jamb = new THREE.BoxGeometry(.16, D.h, .02);
  for (const z of [-D.w / 2, D.w / 2]){ const j = new THREE.Mesh(jamb, trimMat); j.position.set(xW, D.h / 2, z); room.add(j); }
  // traverse du haut de l'encadrement (même bleu que les montants)
  const head = new THREE.Mesh(new THREE.BoxGeometry(.16, .02, D.w + .02), trimMat);
  head.position.set(xW, D.h + .01, 0); room.add(head);

  // vestibule : deux murs latéraux + mur du fond, même bleu, le nom de l'artiste face à l'entrée
  const xV = xW - V;
  panel(V, H, xW - V / 2, -S / 2, new THREE.Vector3(0, 0, 1));
  panel(V, H, xW - V / 2, S / 2, new THREE.Vector3(0, 0, -1));
  panel(S, H, xV, 0, new THREE.Vector3(1, 0, 0));
  const signTex = (color) => canvasTexture(1024, (g, s) => {
    g.fillStyle = color;
    g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `700 ${Math.round(s * .085)}px Archivo, Helvetica, Arial, sans-serif`;
    g.fillText("ANNICK BOUVATTIER", s / 2, s * .46);
    g.font = `500 ${Math.round(s * .03)}px Archivo, Helvetica, Arial, sans-serif`;
    g.fillText(tr("Artiste-peintre").toUpperCase().split("").join(" "), s / 2, s * .56);   // lettres espacées
  });
  const signs = { dark: signTex(CFG.dark.sign), light: signTex(CFG.light.sign) };
  const signMat = new THREE.MeshStandardMaterial({ map: signs[isLight() ? "light" : "dark"], transparent: true, roughness: .9 });
  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), signMat);
  signMesh.position.set(xV + .01, 2.0, 0);
  signMesh.rotation.y = Math.PI / 2;
  room.add(signMesh);

  // rails noirs au plafond, à 1 m des murs accrochés
  const railY = H - .03, off = 1.0;
  const railX = new THREE.BoxGeometry(L - 2 * off + .2, .03, .03), railZ = new THREE.BoxGeometry(.03, .03, S - 2 * off + .2);
  [[railX, 0, -S / 2 + off], [railX, 0, S / 2 - off], [railZ, L / 2 - off, 0], [railZ, -L / 2 + off, 0]].forEach(([geo, x, z]) => {
    const m = new THREE.Mesh(geo, blackMat); m.position.set(x, railY, z); room.add(m);
  });

  // banc de galerie au centre : plateau de chêne, pieds noirs
  const bench = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, .06, .42),
    new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: .45 }));
  top.position.y = .44; bench.add(top);
  for (const x of [-.65, .65]){
    const leg = new THREE.Mesh(new THREE.BoxGeometry(.05, .41, .38), blackMat);
    leg.position.set(x, .205, 0); bench.add(leg);
  }
  bench.position.set(0, 0, 0);   // au centre : la promenade tourne autour
  room.add(bench);

  scene.add(room);
  return { room, floor, bench, railY, off, wallMat, trimMat, ceilMat, signMat, signs };
}

/* =========================
   TOILES ET PROJECTEURS
   ========================= */

function hangArtworks(scene, plan, deco){
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x1a1714, roughness: .85 });
  const shadowTex = contactShadowTexture();
  const lampBody = new THREE.CylinderGeometry(.05, .06, .2, 20);
  const lampLens = new THREE.CircleGeometry(.045, 20);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: .4, metalness: .6 });
  const lensMat = new THREE.MeshBasicMaterial({ color: 0xfff1d6 });
  const stemGeo = new THREE.CylinderGeometry(.008, .008, .14, 8);
  const pieces = [];

  plan.placed.forEach((p, i) => {
    const a = p.work;
    // la face affiche l'image telle quelle (sans éclairage ni tone mapping) : couleurs fidèles, jamais brûlées.
    // Les projecteurs éclairent le mur autour ; une très légère ombre de bord donne le relief.
    const face = new THREE.MeshBasicMaterial({ color: 0xf2f0ec, toneMapped: false });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(a.w, a.h, CFG.thickness), [edgeMat, edgeMat, edgeMat, edgeMat, face, edgeMat]);
    const rotY = Math.atan2(p.wall.normal.x, p.wall.normal.z);
    mesh.position.copy(p.center).addScaledVector(p.wall.normal, CFG.thickness / 2 + .01);
    mesh.rotation.y = rotY;
    mesh.userData.index = i;
    scene.add(mesh);

    // ombre de contact sur le mur, un peu décalée vers le bas
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(a.w + .12, a.h + .12),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: .8 }));
    sh.position.copy(p.center).addScaledVector(p.wall.normal, .003); sh.position.y -= .025;
    sh.rotation.y = rotY;
    scene.add(sh);

    // cartel mural à droite de la toile, à hauteur de lecture
    const lab = new THREE.Mesh(new THREE.BoxGeometry(.14, .14, .004),
      new THREE.MeshStandardMaterial({ map: labelTexture(a), roughness: .7 }));
    lab.position.copy(p.center)
      .addScaledVector(p.wall.right, a.w / 2 + .2)
      .addScaledVector(p.wall.normal, .003);
    lab.position.y = 1.32;
    lab.rotation.y = rotY;
    scene.add(lab);

    // projecteur sur le rail, orienté vers la toile ; lentille lumineuse
    const lampPos = p.center.clone().addScaledVector(p.wall.normal, deco.off);
    lampPos.y = deco.railY - .16;
    const lamp = new THREE.Group();
    lamp.position.copy(lampPos);
    const body = new THREE.Mesh(lampBody, bodyMat);
    body.rotation.x = Math.PI / 2;
    lamp.add(body);
    const lens = new THREE.Mesh(lampLens, lensMat);
    lens.position.z = .101;
    lamp.add(lens);
    scene.add(lamp);
    lamp.lookAt(p.center);
    const stem = new THREE.Mesh(stemGeo, bodyMat);
    stem.position.copy(lampPos).add(new THREE.Vector3(0, .09, 0));
    scene.add(stem);

    const spot = new THREE.SpotLight(0xffeedd, 0, 0, .5, .75, 2);
    spot.position.copy(lampPos);
    spot.target.position.copy(p.center);
    const reach = lampPos.distanceTo(p.center);
    spot.angle = Math.min(.75, Math.atan((Math.max(a.w, a.h) * .62 + .3) / reach));
    spot.userData.power = 9 * reach * reach;   // même éclairement sur la toile quelle que soit la distance
    scene.add(spot, spot.target);

    pieces.push({ ...p, mesh, face, spot, hd: false });
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
  // résolution : plafonnée (1,5 sur ordinateur, 1,25 sur téléphone), puis ajustée selon la fluidité mesurée
  const DPR_MAX = Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.5);
  let dpr = DPR_MAX;
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  els.stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color((isLight() ? CFG.light : CFG.dark).bg);
  const camera = new THREE.PerspectiveCamera(humanFov(), innerWidth / innerHeight, .05, 100);
  camera.rotation.order = "YXZ";

  // --- décor, ambiance chaude très douce (la vraie lumière vient des projecteurs)
  const deco = buildRoom(scene, plan, renderer);
  const hemi = new THREE.HemisphereLight(0xffe6c7, 0x3a2a1c, .5);
  scene.add(hemi);
  const bounce = new THREE.PointLight(0xffdcb0, 6, 0, 2);
  bounce.position.set(0, 1.9, 0);
  scene.add(bounce);

  // version claire / sombre : suit le bouton du header, sans recharger la salle
  const applyTheme = () => {
    const p = isLight() ? CFG.light : CFG.dark;
    deco.wallMat.color.setHex(p.wall);
    deco.trimMat.color.setHex(p.trim);
    deco.signMat.map = deco.signs[isLight() ? "light" : "dark"]; deco.signMat.needsUpdate = true;
    scene.background.setHex(p.bg);
    renderer.toneMappingExposure = p.exposure;
    hemi.intensity = p.hemi; bounce.intensity = p.bounce; hemi.groundColor.setHex(p.ground);
    // plafond : en version claire il reste clair (sinon il tombe dans l'ombre et le menu se lit mal)
    deco.ceilMat.emissive.setHex(0xefebe3); deco.ceilMat.emissiveIntensity = p.ceil;
  };
  applyTheme();
  document.addEventListener("themechange", applyTheme);
  const vestLight = new THREE.SpotLight(0xffe2bd, 12, 0, .6, .8, 2);
  vestLight.position.set(-plan.L / 2 - CFG.vestibule + 1.4, CFG.ceiling - .1, 0);
  vestLight.target.position.set(-plan.L / 2 - CFG.vestibule, 2, 0);
  scene.add(vestLight, vestLight.target);

  const pieces = hangArtworks(scene, plan, deco);
  const n = pieces.length;

  // --- textures des toiles
  const loader = new THREE.TextureLoader();
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const prepare = (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; return t; };
  let loaded = 0;
  const tick = () => {
    loaded++;
    const pct = Math.round(loaded / n * 100);
    els.bar.style.width = pct + "%";
    els.bar.parentElement.setAttribute("aria-valuenow", pct);
  };
  let firstDone;
  const firstLoaded = new Promise(r => { firstDone = r; });
  // HD pour les toiles proches (vérifié une fois par seconde)
  const hdFiles = new Set(((await loadJSON(CFG.hdList)) || []).map(String));
  function loadNearHD(pos){
    for (const p of pieces){
      if (p.hd || !hdFiles.has(p.work.file) || p.center.distanceTo(pos) > 3.5) continue;
      p.hd = true;
      loader.load(encodeURI("images/hd/" + p.work.file), (t) => {
        const old = p.face.map; p.face.map = prepare(t); p.face.needsUpdate = true; if (old) old.dispose();
      }, undefined, () => {});
    }
  }

  const ready = Promise.all(pieces.map((p, i) => new Promise((resolve) => {
    const done = (t) => { if (t){ p.face.map = prepare(t); p.face.needsUpdate = true; } tick(); if (loaded >= Math.min(3, n)) firstDone(); resolve(); };
    loader.load(p.work.thumb, done, undefined, () =>
      loader.load(p.work.image, done, undefined, () => { console.warn("Galerie 3D : image introuvable :", p.work.title); done(null); }));
  })));


  els.srList.innerHTML = pieces.map(p =>
    `<li><a href="portfolio?oeuvre=${encodeURIComponent(p.work.file)}">${escapeHtml(p.work.title)}</a> — ${escapeHtml(metaText(p.work))}</li>`).join("");

  /* ---------- caméra : position + regard (lacet / tangage) ---------- */
  const view = { pos: new THREE.Vector3(), yaw: 0, pitch: 0 };
  const yawTo = (from, to) => Math.atan2(-(to.x - from.x), -(to.z - from.z));
  const bounds = { x0: -plan.L / 2 + .7, x1: plan.L / 2 - .7, z0: -plan.S / 2 + .7, z1: plan.S / 2 - .7 };
  const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const angleDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

  if (/[?&]debug\b/.test(location.search)) window.__g3dView = view;   // tests : placer la caméra à la main

  // départ : dans le vestibule, face à la porte
  view.pos.set(-plan.L / 2 - CFG.vestibule + 1.3, CFG.eye, 0);
  view.yaw = -Math.PI / 2; view.pitch = 0;

  /* ---------- promenade : un tour complet du banc en 15 s, le regard tourné vers les murs ----------
     Pas de saut d'une toile à l'autre : le regard tourne en continu avec la marche (vers le mur,
     un peu en avant), les toiles défilent naturellement. */
  const WANDER = { lap: 28, idle: isMobile ? 20 : 9 };          // secondes par tour ; secondes sans action avant de repartir
  const ellipse = { rx: 1.45, rz: 1.0 };          // tout près du banc (1,50 × 0,42 m), on en fait vraiment le tour
  const wander = { on: false, theta: Math.PI };
  const LOOP_SPEED = Math.PI * (3 * (ellipse.rx + ellipse.rz) - Math.sqrt((3 * ellipse.rx + ellipse.rz) * (ellipse.rx + 3 * ellipse.rz))) / WANDER.lap;   // m/s
  const onEllipse = (th) => new THREE.Vector3(ellipse.rx * Math.cos(th), CFG.eye, ellipse.rz * Math.sin(th));
  function wanderGaze(th){
    const p = onEllipse(th);
    const out = new THREE.Vector2(p.x / (ellipse.rx * ellipse.rx), p.z / (ellipse.rz * ellipse.rz)).normalize();  // normale : vers le mur
    const walk = new THREE.Vector2(-ellipse.rx * Math.sin(th), ellipse.rz * Math.cos(th)).normalize();             // sens de la marche (θ croît : on tourne vers la droite)
    const dx = out.x * .8 + walk.x * .35, dz = out.y * .8 + walk.y * .35;
    return { yaw: Math.atan2(-dx, -dz), pitch: -.02 };
  }
  function nearestTheta(pos){
    let best = 0, bd = Infinity;
    for (let k = 0; k < 72; k++){ const th = k / 72 * Math.PI * 2, d = onEllipse(th).distanceTo(pos); if (d < bd){ bd = d; best = th; } }
    return best;
  }
  let lastInput = 0, move = null;

  /* ---------- pause / vitesse (boutons en bas à gauche ; la vitesse est mémorisée) ---------- */
  const SPEEDS = [.25, .5, .75, 1, 1.5, 2, 3, 4];
  // « réduire les animations » (réglage du système) : la visite reste à l'arrêt ; on avance avec le curseur
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ctrl = { paused: calm, i: 3, get tempo(){ return SPEEDS[this.i]; } };

  /* ---------- avancer / reculer le long du chemin (curseur ; au doigt, glisser à gauche / à droite) ----------
     on reste sur le chemin autour du banc : seule la position sur le tour change, le regard suit */
  const TAU = Math.PI * 2;
  const scrub = { active: false, target: null };
  const pathFrac = () => (((wander.theta - Math.PI) % TAU) + TAU) % TAU / TAU;
  function joinPath(){      // pendant l'arrivée (ou après un regard à la main) : on se pose sur le chemin
    if (wander.on) return;
    move = null; hideTip();
    wander.theta = nearestTheta(view.pos); wander.on = true; lastInput = 0;
  }
  function scrubTo(theta){ joinPath(); scrub.target = theta; }
  function scrubBy(dTheta){ joinPath(); scrub.target = (scrub.target ?? wander.theta) + dTheta; }
  try { const k = SPEEDS.indexOf(parseFloat(localStorage.getItem("abouv:g3d-speed"))); if (k >= 0) ctrl.i = k; } catch (_) {}
  function ctrlUI(){
    if (!els.ctrl) return;
    els.ctrlPlay.setAttribute("aria-pressed", String(ctrl.paused));
    els.ctrlPlay.setAttribute("aria-label", tr(ctrl.paused ? "Reprendre la visite" : "Mettre en pause"));
    els.ctrlSpeed.textContent = (document.documentElement.lang !== "en" ? String(ctrl.tempo).replace(".", ",") : String(ctrl.tempo)) + "×";
    els.ctrlSlow.disabled = ctrl.i === 0; els.ctrlFast.disabled = ctrl.i === SPEEDS.length - 1;
  }
  if (els.ctrl){
    const speed = (d) => { ctrl.i = Math.max(0, Math.min(SPEEDS.length - 1, ctrl.i + d)); try { localStorage.setItem("abouv:g3d-speed", ctrl.tempo); } catch (_) {} ctrlUI(); };
    els.ctrlPlay.addEventListener("click", () => {
      ctrl.paused = !ctrl.paused; ctrlUI();
      if (!ctrl.paused && !wander.on && !move){ lastInput = 0; startWander(); }   // reprise après un regard à la main
    });
    if (els.ctrlPath){
      const fromSlider = () => {
        joinPath();
        const want = Math.PI + els.ctrlPath.value / 1000 * TAU, cur = scrub.target ?? wander.theta;
        scrubTo(cur + angleDiff(cur % TAU, want % TAU));        // le plus court, sans faire un tour de trop
      };
      els.ctrlPath.addEventListener("pointerdown", () => { scrub.active = true; });
      els.ctrlPath.addEventListener("input", () => { scrub.active = true; fromSlider(); });
      const end = () => { scrub.active = false; };
      els.ctrlPath.addEventListener("pointerup", end); els.ctrlPath.addEventListener("change", end); els.ctrlPath.addEventListener("blur", end);
    }
    els.ctrlSlow.addEventListener("click", () => speed(-1));
    els.ctrlFast.addEventListener("click", () => speed(1));
    ctrlUI();
    els.ctrl.hidden = false;
  }
  function startWander(){
    hideTip();
    const th = nearestTheta(view.pos);
    const start = onEllipse(th);
    const gz = wanderGaze(th);
    travel({ pos: start, yaw: gz.yaw, pitch: gz.pitch }, () => { wander.on = true; wander.theta = th; },
      Math.max(1.6, view.pos.distanceTo(start) / .45), LOOP_SPEED * ctrl.tempo);
  }

  /* ---------- déplacements choisis ---------- */
  // endSpeed (m/s) : on arrive en marchant à cette vitesse au lieu de s'arrêter (enchaînement avec la promenade)
  // turn : -1 = tourner la tête vers la droite (même sens que la promenade), même si c'est le plus long
  function travel(to, onDone, dur, endSpeed, turn){
    const dist = view.pos.distanceTo(to.pos);
    const d = (dur ?? (1.2 + Math.min(1.6, dist * .35)));
    move = { m: endSpeed && dist > .05 ? Math.min(2.5, endSpeed * d / dist) : null,
      from: { pos: view.pos.clone(), yaw: view.yaw, pitch: view.pitch },
      to, dyaw: (() => { let d = angleDiff(view.yaw, to.yaw ?? view.yaw); if (turn < 0 && d > .2) d -= Math.PI * 2; if (turn > 0 && d < -.2) d += Math.PI * 2; return d; })(),
      t0: performance.now(), dur: (dur ?? (1.2 + Math.min(1.6, dist * .35))) * 1000, onDone,
    };
  }
  function userInput(){ lastInput = performance.now(); wander.on = false; hideHint(); }
  function walkTo(point){
    userInput();
    const pos = new THREE.Vector3(
      THREE.MathUtils.clamp(point.x, bounds.x0, bounds.x1), CFG.eye, THREE.MathUtils.clamp(point.z, bounds.z0, bounds.z1));
    travel({ pos, yaw: view.yaw, pitch: view.pitch }, null);
  }
  // toile -> sa fiche dans le portfolio
  const portfolioUrl = (a) => "portfolio?oeuvre=" + encodeURIComponent(a.file);

  /* ---------- étiquette au survol d'une toile ---------- */
  let tipFor = -1;
  function showTip(i, x, y){
    if (i !== tipFor){
      const a = pieces[i].work;
      els.tipTitle.textContent = a.title;
      els.tipMeta.textContent = metaText(a);
      els.tipLink.href = portfolioUrl(a);
      tipFor = i;
    }
    const w = els.tip.offsetWidth || 240, h = els.tip.offsetHeight || 90;
    const left = Math.min(innerWidth - w - 12, Math.max(12, x + 18));
    const top = Math.min(innerHeight - h - 12, Math.max(12, y + 18));
    els.tip.style.transform = `translate(${left}px, ${top}px)`;
    els.tip.hidden = false;
    els.tip.classList.add("is-on");
  }
  function hideTip(){ els.tip.classList.remove("is-on"); tipFor = -1; }

  let hintTimer = 0;
  const passive = matchMedia("(pointer: coarse)").matches;     // téléphone / tablette : visite non interactive
  function showHint(){ els.hint.hidden = false; requestAnimationFrame(() => els.hint.classList.add("is-on")); hintTimer = setTimeout(hideHint, 7000); }
  function hideHint(){ clearTimeout(hintTimer); els.hint.classList.remove("is-on"); }

  /* ---------- souris / doigt ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const meshes = pieces.map(p => p.mesh);
  const hit = (x, y) => {
    ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects([...meshes, deco.floor, deco.bench], true)[0];
    if (!h) return null;
    if (h.object.userData.index !== undefined) return { art: h.object.userData.index };
    if (h.object === deco.floor) return { floor: h.point };
    return null;
  };
  let drag = null;
  // écran tactile : la promenade défile comme une vidéo ; toucher une toile la met en pause
  // et affiche sa petite fiche, toucher ailleurs la relance
  if (passive){
    let tap = null;
    els.stage.addEventListener("pointerdown", (e) => { tap = { x: e.clientX, y: e.clientY, lx: e.clientX, swipe: false }; });
    // glisser à gauche = avancer sur le chemin, à droite = reculer
    els.stage.addEventListener("pointermove", (e) => {
      if (!tap) return;
      const dx = e.clientX - tap.x, dy = e.clientY - tap.y;
      if (!tap.swipe && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) { tap.swipe = true; scrub.active = true; hideTip(); }
      if (tap.swipe) { scrubBy(-(e.clientX - tap.lx) / innerWidth * TAU * .35); tap.lx = e.clientX; }
    });
    els.stage.addEventListener("pointercancel", () => { tap = null; scrub.active = false; });
    els.stage.addEventListener("pointerup", (e) => {
      if (tap && tap.swipe){ tap = null; scrub.active = false; return; }
      if (!tap || Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 14){ tap = null; return; }
      tap = null;
      const h = hit(e.clientX, e.clientY);
      if (h && h.art !== undefined){
        userInput(); move = null;
        showTip(h.art, e.clientX, e.clientY);
      } else if (tipFor >= 0 || !wander.on){
        hideTip(); lastInput = 0; startWander();
      }
    });
  }
  if (!passive){
    els.stage.addEventListener("pointerdown", (e) => {
      // au doigt, un « tap » bouge toujours un peu : seuil plus large qu'à la souris
      drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, moved: 0, looking: false,
               slop: e.pointerType === "touch" ? 14 : 6 };
      els.stage.setPointerCapture(e.pointerId);
    });
    els.stage.addEventListener("pointermove", (e) => {
      if (drag){
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        drag.x = e.clientX; drag.y = e.clientY;
        drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0));
        if (drag.looking || drag.moved > drag.slop){
          drag.looking = true;
          userInput();
          hideTip();
          els.stage.classList.add("is-dragging");
          move = null;
          const k = e.pointerType === "touch" ? .006 : .0042;
          view.yaw += dx * k;
          view.pitch = THREE.MathUtils.clamp(view.pitch + dy * k, -.6, .5);
        }
        return;
      }
      if (e.pointerType === "touch") return;
      const h = hit(e.clientX, e.clientY);
      const art = h && h.art !== undefined;
      els.stage.classList.toggle("is-art", art);
      els.stage.classList.toggle("is-floor", !!(h && h.floor));
      if (art) showTip(h.art, e.clientX, e.clientY); else hideTip();
    });
    els.stage.addEventListener("pointerleave", () => { if (!drag) hideTip(); });
    els.stage.addEventListener("pointerup", (e) => {
      if (!drag) return;
      const click = !drag.looking;
      drag = null;
      els.stage.classList.remove("is-dragging");
      if (!click) return;
      const h = hit(e.clientX, e.clientY);
      if (!h){ hideTip(); return; }
      if (h.art !== undefined){
        // souris : clic = fiche dans le portfolio ; doigt : 1er toucher = étiquette, 2e = fiche
        if (e.pointerType === "touch" && tipFor !== h.art){ userInput(); showTip(h.art, e.clientX, e.clientY); return; }
        location.href = portfolioUrl(pieces[h.art].work);
      } else if (h.floor){
        hideTip();
        if (e.pointerType !== "touch") walkTo(h.floor);   // au doigt, toucher sert seulement aux toiles
      }
    });
    els.stage.addEventListener("pointercancel", () => { drag = null; els.stage.classList.remove("is-dragging"); });
  }

  addEventListener("resize", () => {
    camera.fov = humanFov();
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  /* ---------- rendu ---------- */
  const clock = new THREE.Clock();
  let lights = 0;      // les projecteurs s'allument doucement
  const STEP = .72;    // longueur d'un pas (m)
  let stride = 0;      // nombre de pas faits (la phase de la marche)
  let gait = 0;        // amplitude de la marche (0 à l'arrêt, 1 en marche)
  let hdCheck = 0;
  let perfT = 0, perfN = 0, slow = 0;
  renderer.setAnimationLoop(() => {
    const raw = clock.getDelta(), dt = Math.min(.05, raw);
    // toutes les 2 s : si l'image met plus de 22 ms (< 45 i/s), on baisse la résolution ; si c'est très fluide, on remonte
    perfT += raw; perfN++;
    if (perfT > 2){
      const ms = perfT / perfN * 1000; perfT = 0; perfN = 0;
      // ordinateur trop lent : même à la plus basse résolution, moins de 20 images par seconde -> accueil sans 3D
      if (ms > 50 && dpr <= .75 && !/[?&]debug\b/.test(location.search)) { slow = (slow || 0) + 1; if (slow >= 2) { window.__g3dReady = false; location.replace("classique" + location.search); } }
      const next = ms > 22 ? Math.max(.75, dpr - .25) : (ms < 12 ? Math.min(DPR_MAX, dpr + .25) : dpr);
      if (next !== dpr){ dpr = next; renderer.setPixelRatio(dpr); renderer.setSize(innerWidth, innerHeight); }
    }
    const now = performance.now();
    let walking = 0;

    if (view.frozen){
      // (tests) caméra placée à la main
    } else if (move){
      const k = Math.min(1, (now - move.t0) / move.dur);
      // départ en douceur ; arrivée soit arrêtée (ease), soit lancée à la vitesse de la promenade (Hermite)
      const e = move.m == null ? ease(k) : (move.m - 2) * k * k * k + (3 - move.m) * k * k;
      view.pos.lerpVectors(move.from.pos, move.to.pos, e);
      view.yaw = move.from.yaw + move.dyaw * e;
      view.pitch = THREE.MathUtils.lerp(move.from.pitch, move.to.pitch ?? move.from.pitch, e);
      walking = Math.sin(Math.PI * k) * .8;
      stride += dt * walking * 1.6;
      if (k >= 1){ const cb = move.onDone; move = null; if (cb) cb(); }
    } else if (wander.on){
      // allure de marche : légère poussée à chaque pas
      const surge = 1;
      const before = onEllipse(wander.theta);
      if (scrub.target != null){
        // déplacement demandé au curseur / au doigt : on y glisse en douceur, puis la promenade reprend
        wander.theta += (scrub.target - wander.theta) * Math.min(1, dt * 7);
        if (!scrub.active && Math.abs(scrub.target - wander.theta) < .002) scrub.target = null;
      } else if (!ctrl.paused && !scrub.active) wander.theta += dt * Math.PI * 2 / WANDER.lap * surge * ctrl.tempo;
      if (els.ctrlPath && !scrub.active) els.ctrlPath.value = Math.round(pathFrac() * 1000);
      view.pos.copy(onEllipse(wander.theta));
      stride += before.distanceTo(view.pos) / STEP;
      // le regard suit la marche, avec les petits mouvements de tête de quelqu'un qui regarde autour de lui
      const gz = wanderGaze(wander.theta), t = now / 1000;
      // regard stable, qui tourne avec la marche (pas de va-et-vient de la tête)
      view.yaw += angleDiff(view.yaw, gz.yaw) * Math.min(1, dt * 3);
      view.pitch += (gz.pitch - view.pitch) * Math.min(1, dt * 2);
      walking = Math.min(1, before.distanceTo(view.pos) / (dt * .5 + 1e-6));
    } else if (!drag && lastInput && now - lastInput > WANDER.idle * 1000){
      lastInput = 0;
      startWander();          // plus personne ne touche à rien : on reprend la promenade
    }

    // marche : la tête descend à chaque appui (2 fois par foulée), balance de gauche à droite
    // (1 fois par foulée) et roule très légèrement ; amplitude lissée pour démarrer et s'arrêter en douceur
    gait += (walking - gait) * Math.min(1, dt * 2.5);
    const ph = stride * Math.PI * 2;
    camera.position.copy(view.pos);
    // le regard d'un humain est stabilisé : pas de caméra qui tangue, à peine un souffle de pas
    camera.position.y += (Math.cos(ph) * .004 - .002) * gait;
    camera.rotation.set(view.pitch, view.yaw, 0);

    if ((hdCheck += dt) > 1){ hdCheck = 0; if (hdFiles.size) loadNearHD(view.pos); }
    lights = Math.min(1, lights + dt * .8);
    for (const p of pieces) p.spot.intensity = p.spot.userData.power * lights;
    renderer.render(scene, camera);
  });

  requestAnimationFrame(() => requestAnimationFrame(() => els.stage.classList.add("is-ready")));
  // la salle est prête : plus de repli possible
  window.__g3dReady = true;
  clearTimeout(window.__g3dTimer);
  document.dispatchEvent(new Event("g3d:ready"));   // l'écran d'accueil (index.html) peut se lever

  /* ---------- arrivée : on franchit la porte et on commence la promenade ---------- */
  await Promise.race([firstLoaded, new Promise(r => setTimeout(r, 2500))]);
  // écran d'accueil (index.html) : on reste immobile à l'entrée tant qu'il n'a pas commencé à se dissiper
  if (window.__introRevealed) await window.__introRevealed;
  const th0 = Math.PI;                                   // côté porte de la boucle
  const gz0 = wanderGaze(th0);
  // on entre, on se retourne vers la droite pour voir le nom de l'artiste, et on continue dans le même sens
  if (calm){ view.pos.copy(onEllipse(th0)); view.yaw = gz0.yaw; view.pitch = gz0.pitch; wander.on = true; wander.theta = th0; }
  else travel({ pos: onEllipse(th0), yaw: gz0.yaw, pitch: gz0.pitch }, () => { wander.on = true; wander.theta = th0; }, 6, LOOP_SPEED * ctrl.tempo, -1);
  // (plus de bulle d'aide : le curseur suffit)
  ready.then(() => els.loading.classList.add("is-done"));
}

function metaText(a){
  return [a.technique && tr(a.technique), a.size && a.size.replace(/\s*x\s*/i, " × ")].filter(Boolean).join(" · ");
}
function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);
}

const start = () => main().catch((err) => { console.error(err); fallback("erreur : " + err.message); });
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();

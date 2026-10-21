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
//   - lumière     : un vrai projecteur (SpotLight) par toile, ambiance chaude très douce
//   - navigation  : glisser = regarder à 360° ; clic sur une toile = s'en approcher ; clic sur le sol = y aller ;
//                   flèches du clavier / boutons ‹ › = toile suivante / précédente
//   - textures    : vignettes (images/thumbs) ; HD (images/hd/<même nom>) pour l'œuvre regardée et ses voisines,
//                   si elle figure dans images/hd/list.json

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const CFG = {
  count: 10,            // toiles tirées au hasard
  eye: 1.6,             // hauteur des yeux (m)
  center: 1.55,         // centre des toiles (m)
  ceiling: 3.3,         // hauteur sous plafond (m)
  gap: 1.0,             // espace entre deux toiles (m)
  margin: 0.8,          // espace libre au bout de chaque mur (m)
  thickness: 0.03,      // châssis (m)
  door: { w: 1.4, h: 2.6 },
  vestibule: 3.2,       // profondeur du vestibule (m)
  travel: 1.3,          // durée d'un déplacement (s)
  hdList: "images/hd/list.json",
  wall: 0x2c406a,       // bleu nuit
  trim: 0x1a2742,
};

const isMobile = matchMedia("(max-width: 760px), (pointer: coarse)").matches;
const tr = (s) => (window.t ? window.t(s) : s);
const fallback = (reason) => window.__g3dFallback ? window.__g3dFallback(reason) : location.replace("accueil.html");

const $ = (id) => document.getElementById(id);
const els = {
  stage: $("stage"), loading: $("loading"), bar: $("progressBar"), hint: $("hint"), play: $("playBtn"),
  cartel: $("cartel"), count: $("cartelCount"), title: $("cartelTitle"), meta: $("cartelMeta"), cta: $("cartelCta"),
  controls: $("controls"), prev: $("prevBtn"), next: $("nextBtn"), srList: $("srList"),
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
    let w = a.cm.w / 100, h = a.cm.h / 100;
    const px = sizes && sizes[a.file];
    if (px){
      const imgRatio = px[0] / px[1];
      if (w !== h && (imgRatio > 1) !== (w > h)) [w, h] = [h, w];
      if (Math.abs(imgRatio - w / h) / (w / h) > 0.15) h = w / imgRatio;
    }
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
function planWalls(works){
  for (let L = 5.6; L < 30; L += 0.2){
    const S = Math.max(4.6, Math.round(L * 0.78 * 10) / 10);
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

// grain de la toile (tissage) : carte de relief qui accroche la lumière rasante des projecteurs
function canvasWeaveTexture(){
  const t = canvasTexture(64, (g, s) => {
    g.fillStyle = "rgb(128,128,128)"; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 8; i++){
      const y = i * 8;
      g.fillStyle = i % 2 ? "rgb(150,150,150)" : "rgb(105,105,105)";
      g.fillRect(0, y + 1, s, 5);
      g.fillStyle = i % 2 ? "rgb(100,100,100)" : "rgb(155,155,155)";
      g.fillRect(y + 1, 0, 5, s);
    }
  }, false);
  return t;
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

  const wallMat = new THREE.MeshStandardMaterial({ color: CFG.wall, roughness: .92 });
  const trimMat = new THREE.MeshStandardMaterial({ color: CFG.trim, roughness: .6 });
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

  // vestibule : deux murs latéraux + mur du fond, même bleu, le nom de l'artiste face à l'entrée
  const xV = xW - V;
  panel(V, H, xW - V / 2, -S / 2, new THREE.Vector3(0, 0, 1));
  panel(V, H, xW - V / 2, S / 2, new THREE.Vector3(0, 0, -1));
  panel(S, H, xV, 0, new THREE.Vector3(1, 0, 0));
  const sign = canvasTexture(1024, (g, s) => {
    g.fillStyle = "rgba(236,232,225,.92)";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `700 ${Math.round(s * .085)}px Archivo, Helvetica, Arial, sans-serif`;
    g.fillText("ANNICK BOUVATTIER", s / 2, s * .46);
    g.font = `500 ${Math.round(s * .03)}px Archivo, Helvetica, Arial, sans-serif`;
    g.fillText("P E I N T U R E S", s / 2, s * .56);
  });
  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshStandardMaterial({ map: sign, transparent: true, roughness: .9 }));
  signMesh.position.set(xV + .01, 2.0, 0);
  signMesh.rotation.y = Math.PI / 2;
  room.add(signMesh);

  // rails noirs au plafond, à 1 m des murs accrochés
  const railY = H - .03, off = 1.0;
  const railX = new THREE.BoxGeometry(L - 2 * off + .2, .03, .03), railZ = new THREE.BoxGeometry(.03, .03, S - 2 * off + .2);
  [[railX, 0, -S / 2 + off], [railX, 0, S / 2 - off], [railZ, L / 2 - off, 0]].forEach(([geo, x, z]) => {
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
  bench.position.set(.3, 0, 0);
  room.add(bench);

  scene.add(room);
  return { room, floor, bench, railY, off };
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
  const weave = canvasWeaveTexture();
  const pieces = [];

  plan.placed.forEach((p, i) => {
    const a = p.work;
    const bump = weave.clone();
    bump.needsUpdate = true;
    bump.repeat.set(a.w * 45, a.h * 45);    // ~ 3,5 fils par cm
    const face = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .78, metalness: 0, bumpMap: bump, bumpScale: .35 });
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
    spot.userData.power = 23 * reach * reach;   // même éclairement sur la toile quelle que soit la distance
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.75 : 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  els.stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c1220);
  const camera = new THREE.PerspectiveCamera(isMobile ? 62 : 55, innerWidth / innerHeight, .05, 100);
  camera.rotation.order = "YXZ";

  // --- décor, ambiance chaude très douce (la vraie lumière vient des projecteurs)
  const deco = buildRoom(scene, plan, renderer);
  scene.add(new THREE.HemisphereLight(0xffe6c7, 0x3a2a1c, .5));
  const bounce = new THREE.PointLight(0xffdcb0, 6, 0, 2);
  bounce.position.set(0, 1.9, 0);
  scene.add(bounce);
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
  const ready = Promise.all(pieces.map((p, i) => new Promise((resolve) => {
    const done = (t) => { if (t){ p.face.map = prepare(t); p.face.needsUpdate = true; } tick(); if (loaded >= Math.min(3, n)) firstDone(); resolve(); };
    loader.load(p.work.thumb, done, undefined, () =>
      loader.load(p.work.image, done, undefined, () => { console.warn("Galerie 3D : image introuvable :", p.work.title); done(null); }));
  })));

  const hdFiles = new Set(((await loadJSON(CFG.hdList)) || []).map(String));
  function loadHD(i){
    for (const k of [i, (i + 1) % n, (i - 1 + n) % n]){
      const p = pieces[k];
      if (p.hd || !hdFiles.has(p.work.file)) continue;
      p.hd = true;
      loader.load(encodeURI("images/hd/" + p.work.file), (t) => {
        const old = p.face.map; p.face.map = prepare(t); p.face.needsUpdate = true; if (old) old.dispose();
      }, undefined, () => { p.hd = false; });
    }
  }

  els.srList.innerHTML = pieces.map(p =>
    `<li><a href="portfolio.html?q=${encodeURIComponent(p.work.title)}">${escapeHtml(p.work.title)}</a> — ${escapeHtml(metaText(p.work))}</li>`).join("");

  /* ---------- caméra : position + regard (lacet / tangage) ---------- */
  const view = { pos: new THREE.Vector3(), yaw: 0, pitch: 0 };
  const yawTo = (from, to) => Math.atan2(-(to.x - from.x), -(to.z - from.z));
  const bounds = { x0: -plan.L / 2 + .6, x1: plan.L / 2 - .6, z0: -plan.S / 2 + .6, z1: plan.S / 2 - .6 };
  const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeWalk = (t) => -(Math.cos(Math.PI * t) - 1) / 2;          // départ et arrêt en douceur
  const angleDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

  // point de vue devant une toile : elle occupe environ la moitié de la hauteur de l'écran
  function viewFor(i, near = false){
    const p = pieces[i];
    const fit = Math.max(p.work.h / (2 * tan * (near ? .55 : .42)), p.work.w / (2 * tan * camera.aspect * .6));
    const d = THREE.MathUtils.clamp(fit, near ? 1.4 : 1.9, plan.S - 1.4);
    const pos = p.center.clone().addScaledVector(p.wall.normal, d);
    pos.y = CFG.eye;
    return { pos, yaw: yawTo(pos, p.center), pitch: Math.atan2(CFG.center - CFG.eye, d) };
  }

  // départ : dans le vestibule, face à la porte
  view.pos.set(-plan.L / 2 - CFG.vestibule + 1.3, CFG.eye, 0);
  view.yaw = -Math.PI / 2; view.pitch = 0;

  /* ---------- visite automatique : on marche de toile en toile, on s'arrête devant chacune ---------- */
  const TOUR = { speed: .55, dwell: 4.2, idle: 18 };   // m/s, s devant chaque toile, s avant de reprendre
  const tour = { on: false, phase: "walk", seg: null, index: -1, until: 0, walked: 0 };
  let move = null, current = -1, facing = -1, lastInput = 0;

  // trajet courbe de la position actuelle vers le point de vue d'une toile (on passe par l'intérieur de la salle)
  function segmentTo(i){
    const to = viewFor(i);
    const from = { pos: view.pos.clone(), yaw: view.yaw, pitch: view.pitch };
    const mid = from.pos.clone().lerp(to.pos, .5);
    const inward = new THREE.Vector3(-mid.x, 0, -mid.z);
    const ctrl = mid.clone().addScaledVector(inward.normalize(), Math.min(1.2, from.pos.distanceTo(to.pos) * .25));
    const curve = new THREE.QuadraticBezierCurve3(from.pos, ctrl, to.pos);
    const len = curve.getLength();
    return { i, from, to, curve, len, t0: performance.now(), dur: Math.max(2.4, len / TOUR.speed) * 1000 };
  }
  function startTour(i){
    tour.on = true;
    tour.index = i;
    tour.phase = "walk";
    tour.seg = segmentTo(i);
    current = i; facing = -1;
    hideCartel();
    loadHD(i);
    els.play.setAttribute("aria-pressed", "true");
    els.play.setAttribute("aria-label", tr("Mettre la visite en pause"));
  }
  function stopTour(){
    if (!tour.on) return;
    tour.on = false;
    els.play.setAttribute("aria-pressed", "false");
    els.play.setAttribute("aria-label", tr("Reprendre la visite"));
  }
  function nearestInView(){
    let best = 0, bestScore = Infinity;
    pieces.forEach((p, i) => {
      const s = Math.abs(angleDiff(view.yaw, yawTo(view.pos, p.center))) + view.pos.distanceTo(p.center) * .08;
      if (s < bestScore){ bestScore = s; best = i; }
    });
    return best;
  }
  function resumeTour(){ startTour(facing >= 0 ? facing : nearestInView()); }

  /* ---------- déplacements choisis (souris, doigt, clavier) ---------- */
  function travel(to, onDone){
    const dist = view.pos.distanceTo(to.pos);
    move = {
      from: { pos: view.pos.clone(), yaw: view.yaw, pitch: view.pitch },
      to, dyaw: angleDiff(view.yaw, to.yaw ?? view.yaw),
      t0: performance.now(), dur: (CFG.travel + Math.min(1, dist * .15)) * 1000, onDone,
    };
    hideCartel();
  }
  function userInput(){ lastInput = performance.now(); stopTour(); hideHint(); }
  function goTo(i){
    userInput();
    i = (i + n) % n;
    current = i;
    travel(viewFor(i, true), () => { facing = i; showCartel(i); });
    loadHD(i);
  }
  function walkTo(point){
    userInput();
    const pos = new THREE.Vector3(
      THREE.MathUtils.clamp(point.x, bounds.x0, bounds.x1), CFG.eye, THREE.MathUtils.clamp(point.z, bounds.z0, bounds.z1));
    travel({ pos, yaw: view.yaw, pitch: Math.min(view.pitch, 0) }, null);
    facing = -1;
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
  function hideCartel(){ els.cartel.classList.remove("is-on"); }
  let hintTimer = 0;
  function showHint(){ els.hint.hidden = false; requestAnimationFrame(() => els.hint.classList.add("is-on")); hintTimer = setTimeout(hideHint, 8000); }
  function hideHint(){ clearTimeout(hintTimer); els.hint.classList.remove("is-on"); }

  /* ---------- souris / doigt : glisser = regarder à 360°, clic = aller ---------- */
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
  els.stage.addEventListener("pointerdown", (e) => {
    drag = { x: e.clientX, y: e.clientY, moved: 0 };
    els.stage.setPointerCapture(e.pointerId);
  });
  els.stage.addEventListener("pointermove", (e) => {
    if (drag){
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      if (drag.moved > 6){
        userInput();
        els.stage.classList.add("is-dragging");
        move = null;
        const k = isMobile ? .006 : .0042;
        view.yaw += dx * k;
        view.pitch = THREE.MathUtils.clamp(view.pitch + dy * k, -.6, .5);
        if (facing >= 0 && Math.abs(angleDiff(view.yaw, yawTo(view.pos, pieces[facing].center))) > .5){ facing = -1; hideCartel(); }
      }
    } else if (!isMobile){
      const h = hit(e.clientX, e.clientY);
      els.stage.classList.toggle("is-art", !!(h && h.art !== undefined));
      els.stage.classList.toggle("is-floor", !!(h && h.floor));
    }
  });
  els.stage.addEventListener("pointerup", (e) => {
    if (!drag) return;
    const click = drag.moved <= 6;
    drag = null;
    els.stage.classList.remove("is-dragging");
    if (!click) return;
    const h = hit(e.clientX, e.clientY);
    if (!h) return;
    if (h.art !== undefined) goTo(h.art);
    else if (h.floor) walkTo(h.floor);
  });
  els.stage.addEventListener("pointercancel", () => { drag = null; els.stage.classList.remove("is-dragging"); });

  const step = (d) => goTo(facing >= 0 ? facing + d : (current >= 0 && tour.on ? current + (d > 0 ? 0 : -1) : nearestInView()));
  addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea, select")) return;
    if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
    if (e.key === "ArrowLeft")  { e.preventDefault(); step(-1); }
    if (e.key === " ") { e.preventDefault(); tour.on ? (userInput()) : resumeTour(); }
  });
  els.prev.addEventListener("click", () => step(-1));
  els.next.addEventListener("click", () => step(1));
  els.play.addEventListener("click", () => { if (tour.on) userInput(); else resumeTour(); });

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  /* ---------- rendu ---------- */
  const clock = new THREE.Clock();
  let lights = 0;      // les projecteurs s'allument doucement
  let bob = 0;         // balancement des pas
  renderer.setAnimationLoop(() => {
    const dt = Math.min(.05, clock.getDelta());
    const now = performance.now();
    let walking = 0;

    if (move){
      const k = Math.min(1, (now - move.t0) / move.dur), e = ease(k);
      view.pos.lerpVectors(move.from.pos, move.to.pos, e);
      view.yaw = move.from.yaw + move.dyaw * e;
      view.pitch = THREE.MathUtils.lerp(move.from.pitch, move.to.pitch ?? move.from.pitch, e);
      walking = Math.sin(Math.PI * k) * .7;
      if (k >= 1){ const cb = move.onDone; move = null; if (cb) cb(); }
    } else if (tour.on && tour.phase === "walk" && tour.seg){
      const sg = tour.seg;
      const k = Math.min(1, (now - sg.t0) / sg.dur), e = easeWalk(k);
      view.pos.copy(sg.curve.getPoint(e));
      // le regard suit la marche, puis se pose sur la toile qui arrive
      const ahead = sg.curve.getTangent(Math.min(.999, e + .02));
      const walkYaw = Math.atan2(-ahead.x, -ahead.z);
      const toYaw = yawTo(view.pos, pieces[sg.i].center);
      const look = THREE.MathUtils.smoothstep(k, .35, .9);
      view.yaw = sg.from.yaw + angleDiff(sg.from.yaw, walkYaw) * Math.sin(Math.PI * Math.min(1, k * 1.6)) * (1 - look);
      view.yaw += angleDiff(view.yaw, toYaw) * look;
      view.pitch = THREE.MathUtils.lerp(sg.from.pitch * (1 - look), sg.to.pitch, look);
      walking = Math.sin(Math.PI * k);
      if (k >= 1){ tour.phase = "dwell"; tour.until = now + TOUR.dwell * 1000; facing = sg.i; showCartel(sg.i); }
    } else if (tour.on && tour.phase === "dwell"){
      // on reste devant la toile, le regard bouge à peine
      view.yaw += Math.sin(now * .0006) * .00025;
      if (now >= tour.until){ hideCartel(); startTour((tour.index + 1) % n); }
    } else if (!tour.on && !drag && !move && lastInput && now - lastInput > TOUR.idle * 1000){
      resumeTour();          // on reprend la visite après un moment sans toucher à rien
    }

    // pas : léger balancement vertical pendant la marche
    bob += dt * walking * 2 * Math.PI * 1.7;
    camera.position.copy(view.pos);
    camera.position.y += Math.sin(bob) * .012 * walking;
    camera.rotation.set(view.pitch + Math.sin(bob * .5) * .0025 * walking, view.yaw, Math.sin(bob * .5) * .002 * walking);

    lights = Math.min(1, lights + dt * .8);
    for (const p of pieces) p.spot.intensity = p.spot.userData.power * lights;
    renderer.render(scene, camera);
  });

  // la salle est prête : plus de repli possible
  window.__g3dReady = true;
  clearTimeout(window.__g3dTimer);

  /* ---------- arrivée : on franchit la porte dès que les premières toiles sont chargées ---------- */
  await Promise.race([firstLoaded, new Promise(r => setTimeout(r, 2500))]);
  els.controls.hidden = false;
  startTour(0);
  showHint();
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

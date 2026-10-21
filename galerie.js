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
  count: 10,            // toiles tirées au hasard
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
};

const isMobile = matchMedia("(max-width: 760px), (pointer: coarse)").matches;
const tr = (s) => (window.t ? window.t(s) : s);
const fallback = (reason) => window.__g3dFallback ? window.__g3dFallback(reason) : location.replace("accueil.html");

const $ = (id) => document.getElementById(id);
const els = {
  stage: $("stage"), loading: $("loading"), bar: $("progressBar"), hint: $("hint"),
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
  const pool = shuffle(works);
  return { hung: pool.slice(0, CFG.count), easel: pool[CFG.count] || pool[0] };
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
// Mur du fond (est, face à la porte) : le nom de l'artiste au milieu, au moins une toile de chaque côté.
const SIGN_W = 3.0;
function planWalls(works){
  // on essaie les tailles de salle de la plus petite à la plus grande (surface), largeur et longueur libres
  const sizes = [];
  for (let L = 5.6; L < 22; L += .2) for (let S = 4.6; S <= L; S += .2) sizes.push([L, S]);
  sizes.sort((a, b) => a[0] * a[1] - b[0] * b[1] || Math.abs(a[0] - a[1] * 1.25) - Math.abs(b[0] - b[1] * 1.25));
  for (const [L, S] of sizes){
    const walls = wallFrames(L, S).map(w => ({ ...w, items: [] }));
    const avail = (k) => walls[k].len - (k === 1 ? SIGN_W + CFG.gap : 0);
    let k = 0, used = 0, ok = true;
    for (const a of works){
      while (k < walls.length && CFG.margin * 2 + used + a.w > avail(k)){ k++; used = 0; }
      if (k >= walls.length){ ok = false; break; }
      walls[k].items.push(a);
      used += a.w + CFG.gap;
    }
    if (!ok || walls[1].items.length < 2) continue;
    const back = walls[1].items;
    back.splice(Math.floor(back.length / 2), 0, { sign: true, w: SIGN_W });
    const placed = [];
    let sign = null;
    for (const wall of walls){
      const run = wall.items.reduce((s, a) => s + a.w, 0) + CFG.gap * Math.max(0, wall.items.length - 1);
      let x = (wall.len - run) / 2;
      for (const a of wall.items){
        const c = wall.start.clone().addScaledVector(wall.right, x + a.w / 2);
        c.y = CFG.center;
        if (a.sign) sign = { wall, center: c };
        else placed.push({ work: a, wall, center: c });
        x += a.w + CFG.gap;
      }
    }
    return { L, S, walls, placed, sign };
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

  const wallMat = new THREE.MeshStandardMaterial({ color: CFG.wall, roughness: .92 });
  const trimMat = new THREE.MeshStandardMaterial({ color: CFG.trim, roughness: .6 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0x55575e, roughness: 1 });
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

  // vestibule : deux murs latéraux + mur du fond, même bleu
  const xV = xW - V;
  panel(V, H, xW - V / 2, -S / 2, new THREE.Vector3(0, 0, 1));
  panel(V, H, xW - V / 2, S / 2, new THREE.Vector3(0, 0, -1));
  panel(S, H, xV, 0, new THREE.Vector3(1, 0, 0));

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
  for (const x of [-.66, .66]) for (const z of [-.16, .16]){
    const leg = new THREE.Mesh(new THREE.BoxGeometry(.03, .41, .03), blackMat);
    leg.position.set(x, .205, z); bench.add(leg);
  }
  for (const x of [-.66, .66]){
    const bar = new THREE.Mesh(new THREE.BoxGeometry(.03, .03, .32), blackMat);
    bar.position.set(x, .06, 0); bench.add(bar);
  }
  bench.position.set(0, 0, 0);
  room.add(bench);

  scene.add(room);
  return { room, floor, bench, railY, off };
}

/* =========================
   LE NOM DE L'ARTISTE, au milieu du mur du fond, éclairé par un projecteur
   ========================= */

function buildSign(scene, plan, deco){
  const { wall, center } = plan.sign;
  const tex = canvasTexture(2048, (g, s) => {
    g.clearRect(0, 0, s, s);
    g.fillStyle = "#ece6db";
    g.textAlign = "center"; g.textBaseline = "alphabetic";
    g.font = `700 ${Math.round(s * .092)}px Archivo, Helvetica, Arial, sans-serif`;
    g.fillText("ANNICK BOUVATTIER", s / 2, s * .5);
    g.font = `italic 400 ${Math.round(s * .06)}px "Cormorant Garamond", Garamond, serif`;
    g.fillText(tr("Artiste peintre"), s / 2, s * .6);
  });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(SIGN_W, SIGN_W),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, color: 0xd9d3c8 }));
  m.position.copy(center).addScaledVector(wall.normal, .004);
  m.position.y = 1.75 - SIGN_W * .05;
  m.rotation.y = Math.atan2(wall.normal.x, wall.normal.z);
  scene.add(m);
  // projecteur : halo sur le mur derrière le nom
  const lampPos = center.clone().addScaledVector(wall.normal, deco.off); lampPos.y = deco.railY - .16;
  const spot = new THREE.SpotLight(0xffeedd, 0, 0, .62, .8, 2);
  spot.position.copy(lampPos);
  spot.target.position.set(center.x, 1.7, center.z);
  spot.userData.power = 9 * lampPos.distanceToSquared(spot.target.position);
  scene.add(spot, spot.target);
  return { mesh: m, spot, center: new THREE.Vector3(center.x, 1.75, center.z) };
}

/* =========================
   LE COIN DE L'ATELIER : chevalet avec une toile en cours, petite table, palette, pinceaux.
   Dans le coin à droite en entrant (on ne le voit pas en arrivant, on le découvre en se retournant).
   ========================= */

// toile en cours : esquisse grise sur la toile apprêtée, la couleur seulement là où la peintre a déjà travaillé
function inProgressTexture(img){
  const S = 768, h = Math.round(S * img.height / img.width);
  const c = document.createElement("canvas"); c.width = S; c.height = h;
  const g = c.getContext("2d");
  g.fillStyle = "#efe9de"; g.fillRect(0, 0, S, h);                          // toile apprêtée
  g.globalAlpha = .55; g.filter = "grayscale(1) contrast(.7) brightness(1.25)";
  g.drawImage(img, 0, 0, S, h);                                              // esquisse
  g.globalAlpha = 1; g.filter = "none";
  // zones déjà peintes : taches irrégulières, plus denses en haut à gauche
  const col = document.createElement("canvas"); col.width = S; col.height = h;
  const cg = col.getContext("2d");
  cg.drawImage(img, 0, 0, S, h);
  cg.globalCompositeOperation = "destination-in";
  const rnd = mulberry(5);
  for (let i = 0; i < 90; i++){
    const x = rnd() * S * .75, y = rnd() * h * .8, r = 30 + rnd() * 90;
    if (x / S + y / h > 1.05 + rnd() * .2) continue;
    const grd = cg.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, "rgba(0,0,0,1)"); grd.addColorStop(.7, "rgba(0,0,0,.9)"); grd.addColorStop(1, "rgba(0,0,0,0)");
    cg.fillStyle = grd; cg.fillRect(x - r, y - r, r * 2, r * 2);
  }
  g.drawImage(col, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildEasel(scene, plan, work, loader){
  const pos = new THREE.Vector3(-plan.L / 2 + 1.15, 0, plan.S / 2 - 1.1);
  const face = new THREE.Vector3(-pos.x * .6, 0, -pos.z).normalize();       // la toile regarde la salle
  const g = new THREE.Group();
  g.position.copy(pos);
  g.rotation.y = Math.atan2(face.x, face.z);

  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5232, roughness: .7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: .5, metalness: .3 });
  const box = (w, h, d, mat, x, y, z, rx = 0, rz = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.rotation.set(rx, 0, rz); g.add(m); return m;
  };
  // chevalet : deux pieds avant, un pied arrière, montant central, tablette
  box(.035, 1.95, .035, wood, -.32, .97, .05, -.1, -.1);
  box(.035, 1.95, .035, wood, .32, .97, .05, -.1, .1);
  box(.035, 1.9, .035, wood, 0, .92, -.42, .32, 0);
  box(.045, 2.0, .045, wood, 0, 1.0, .02, -.1, 0);
  box(.78, .035, .07, wood, 0, .78, .13, -.1, 0);
  // toile sur le chevalet (rapport de l'image), penchée en arrière comme le montant
  const W = .62, H = Math.min(.95, W * (work ? work.h / work.w : 1.3));
  const canvasMat = new THREE.MeshBasicMaterial({ color: 0xebe7e0, toneMapped: false });
  const canvas = box(W, H, .025, wood, 0, .8 + H / 2, .16 - Math.sin(.1) * H / 2, -.1, 0);
  canvas.material = [wood, wood, wood, wood, canvasMat, wood];   // face avant : la toile en cours
  box(.08, .04, .06, wood, 0, .8 + H + .03, .16 - Math.sin(.1) * H, -.1, 0);
  if (work){
    loader.load(work.thumb, (t) => {
      canvasMat.map = inProgressTexture(t.image); canvasMat.needsUpdate = true;
    });
  }

  // petite table noire à côté, palette et pot de pinceaux
  const table = new THREE.Group();
  table.position.set(.75, 0, .2);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(.24, .24, .025, 32), dark);
  top.position.y = .7; table.add(top);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .7, 12), dark);
  leg.position.y = .35; table.add(leg);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .015, 24), dark);
  foot.position.y = .008; table.add(foot);
  const palette = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .008, 40),
    new THREE.MeshStandardMaterial({ color: 0x9a7048, roughness: .55 }));
  palette.scale.set(1.25, 1, .85); palette.position.set(-.03, .717, 0); table.add(palette);
  const dabs = [0xa3271f, 0x2346a8, 0xf2ead8, 0xc8902e, 0x2c2420, 0x6d3b2a, 0xd9a07a];
  dabs.forEach((c, i) => {
    const a = i / dabs.length * Math.PI * 1.6 + .3;
    const d = new THREE.Mesh(new THREE.SphereGeometry(.022, 12, 8), new THREE.MeshStandardMaterial({ color: c, roughness: .35 }));
    d.scale.set(1, .35, 1); d.position.set(-.03 + Math.cos(a) * .15, .724, Math.sin(a) * .1); table.add(d);
  });
  const jar = new THREE.Mesh(new THREE.CylinderGeometry(.045, .04, .13, 20),
    new THREE.MeshStandardMaterial({ color: 0xdfe6ea, roughness: .1, metalness: 0, transparent: true, opacity: .55 }));
  jar.position.set(.13, .78, -.1); table.add(jar);
  for (let i = 0; i < 6; i++){
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.005, .007, .3, 6), i % 2 ? wood : dark);
    b.position.set(.13 + (i - 2.5) * .01, .9, -.1 + ((i * 7) % 5 - 2) * .008);
    b.rotation.set(((i * 3) % 5 - 2) * .06, 0, (i - 2.5) * .07);
    table.add(b);
  }
  g.add(table);

  // tabouret de la peintre, devant la toile
  const stool = new THREE.Group();
  stool.position.set(-.1, 0, .85);
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .04, 28), wood);
  seat.position.y = .62; stool.add(seat);
  for (let i = 0; i < 3; i++){
    const a = i / 3 * Math.PI * 2;
    const l = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, .64, 8), dark);
    l.position.set(Math.cos(a) * .11, .31, Math.sin(a) * .11);
    l.rotation.set(Math.sin(a) * .12, 0, -Math.cos(a) * .12);
    stool.add(l);
  }
  g.add(stool);

  scene.add(g);

  // lampe d'atelier : lumière chaude qui tombe sur la toile en cours
  const spot = new THREE.SpotLight(0xffe2b8, 0, 0, .55, .7, 2);
  spot.position.set(pos.x + face.x * 1.4, CFG.ceiling - .3, pos.z + face.z * 1.4);
  spot.target.position.set(pos.x, 1.1, pos.z);
  spot.userData.power = 7 * spot.position.distanceToSquared(spot.target.position);
  scene.add(spot, spot.target);
  return { spot, center: new THREE.Vector3(pos.x, 1.2, pos.z) };
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

  const { hung: works, easel: easelWork } = await loadWorks();
  if (!works.length) return fallback("aucune œuvre disponible");
  // polices des textes dessinés dans la salle (nom de l'artiste, cartels)
  try{ await Promise.race([Promise.all([document.fonts.load("700 80px Archivo"), document.fonts.load('italic 400 60px "Cormorant Garamond"')]), new Promise(r => setTimeout(r, 1500))]); }catch(_){}
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
  const bounce = new THREE.PointLight(0xffdcb0, 3, 0, 2);      // lumière renvoyée par le parquet et les murs
  bounce.position.set(0, 1.4, 0);
  scene.add(bounce);

  const vestLight = new THREE.SpotLight(0xffe2bd, 12, 0, .6, .8, 2);
  vestLight.position.set(-plan.L / 2 - CFG.vestibule + 1.4, CFG.ceiling - .1, 0);
  vestLight.target.position.set(-plan.L / 2 - CFG.vestibule, 2, 0);
  scene.add(vestLight, vestLight.target);

  const pieces = hangArtworks(scene, plan, deco);
  const n = pieces.length;
  const sign = buildSign(scene, plan, deco);

  // --- textures des toiles
  const loader = new THREE.TextureLoader();
  const easel = buildEasel(scene, plan, easelWork, loader);
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
    `<li><a href="portfolio.html?oeuvre=${encodeURIComponent(p.work.file)}">${escapeHtml(p.work.title)}</a> — ${escapeHtml(metaText(p.work))}</li>`).join("");

  /* ---------- caméra : position + regard (lacet / tangage) ---------- */
  const view = { pos: new THREE.Vector3(), yaw: 0, pitch: 0 };
  const yawTo = (from, to) => Math.atan2(-(to.x - from.x), -(to.z - from.z));
  const bounds = { x0: -plan.L / 2 + .7, x1: plan.L / 2 - .7, z0: -plan.S / 2 + .7, z1: plan.S / 2 - .7 };
  const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const angleDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

  if (/[?&]debug\b/.test(location.search)) window.__g3dView = view;   // tests : placer la caméra à la main

  // départ : dans le vestibule, face à la porte
  view.pos.set(-plan.L / 2 - CFG.vestibule + .9, CFG.eye, 0);
  view.yaw = -Math.PI / 2; view.pitch = 0;

  /* ---------- promenade : on tourne lentement autour du banc, le regard posé sur les toiles ----------
     Boucle en ellipse autour du banc ; à chaque instant on regarde l'œuvre la plus en face du côté des murs
     (toile, nom de l'artiste ou chevalet), et le regard glisse doucement de l'une à la suivante. */
  const WANDER = { speed: .2, idle: 9 };         // m/s ; secondes sans action avant de repartir
  const ellipse = { rx: Math.max(.9, plan.L / 2 - 2.0), rz: Math.max(.8, plan.S / 2 - 1.9) };
  const wander = { on: false, theta: Math.PI };
  const onEllipse = (th) => new THREE.Vector3(ellipse.rx * Math.cos(th), CFG.eye, ellipse.rz * Math.sin(th));
  const targets = [...pieces.map(p => p.center), sign.center, easel.center];
  function wanderGaze(th, now){
    const p = onEllipse(th);
    const outYaw = Math.atan2(-p.x / ellipse.rx, -p.z / ellipse.rz);     // vers le mur le plus proche
    const tangent = new THREE.Vector3(ellipse.rx * Math.sin(th), 0, -ellipse.rz * Math.cos(th));
    const aheadYaw = Math.atan2(-tangent.x, -tangent.z);
    const pref = outYaw + angleDiff(outYaw, aheadYaw) * .3;               // un peu vers l'avant
    let best = null, bestScore = Infinity;
    for (const t of targets){
      const y = yawTo(p, t), d = Math.abs(angleDiff(pref, y));
      if (d > 1.3) continue;
      const score = d + p.distanceTo(t) * .06;
      if (score < bestScore){ bestScore = score; best = { yaw: y, pitch: Math.atan2(t.y - CFG.eye, Math.hypot(t.x - p.x, t.z - p.z)) }; }
    }
    return best || { yaw: aheadYaw, pitch: -.03 };
  }
  function nearestTheta(pos){
    let best = 0, bd = Infinity;
    for (let k = 0; k < 72; k++){ const th = k / 72 * Math.PI * 2, d = onEllipse(th).distanceTo(pos); if (d < bd){ bd = d; best = th; } }
    return best;
  }
  let lastInput = 0, move = null;
  function startWander(){
    const th = nearestTheta(view.pos);
    const start = onEllipse(th);
    const gz = wanderGaze(th, performance.now());
    travel({ pos: start, yaw: gz.yaw, pitch: gz.pitch }, () => { wander.on = true; wander.theta = th; },
      Math.max(2, view.pos.distanceTo(start) / .35));
  }

  /* ---------- déplacements choisis ---------- */
  function travel(to, onDone, dur){
    const dist = view.pos.distanceTo(to.pos);
    move = {
      from: { pos: view.pos.clone(), yaw: view.yaw, pitch: view.pitch },
      to, dyaw: angleDiff(view.yaw, to.yaw ?? view.yaw),
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
  const portfolioUrl = (a) => "portfolio.html?oeuvre=" + encodeURIComponent(a.file);

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
    const click = drag.moved <= 6;
    drag = null;
    els.stage.classList.remove("is-dragging");
    if (!click) return;
    const h = hit(e.clientX, e.clientY);
    if (!h){ hideTip(); return; }
    if (h.art !== undefined){
      // souris : clic = fiche dans le portfolio ; doigt : 1er toucher = étiquette, 2e = fiche
      if (e.pointerType === "touch" && tipFor !== h.art){ userInput(); showTip(h.art, e.clientX, e.clientY); return; }
      location.href = portfolioUrl(pieces[h.art].work);
    } else if (h.floor){ hideTip(); walkTo(h.floor); }
  });
  els.stage.addEventListener("pointercancel", () => { drag = null; els.stage.classList.remove("is-dragging"); });

  addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  /* ---------- rendu ---------- */
  const clock = new THREE.Clock();
  let lights = 0;      // les projecteurs s'allument doucement
  let bob = 0;         // balancement des pas
  let hdCheck = 0;
  const allSpots = [...pieces.map(p => p.spot), sign.spot, easel.spot];
  renderer.setAnimationLoop(() => {
    const dt = Math.min(.05, clock.getDelta());
    const now = performance.now();
    let walking = 0;

    if (view.frozen){
      // (tests) caméra placée à la main
    } else if (move){
      const k = Math.min(1, (now - move.t0) / move.dur), e = ease(k);
      view.pos.lerpVectors(move.from.pos, move.to.pos, e);
      view.yaw = move.from.yaw + move.dyaw * e;
      view.pitch = THREE.MathUtils.lerp(move.from.pitch, move.to.pitch ?? move.from.pitch, e);
      walking = Math.sin(Math.PI * k) * .8;
      if (k >= 1){ const cb = move.onDone; move = null; if (cb) cb(); }
    } else if (wander.on){
      const r = Math.hypot(ellipse.rx * Math.sin(wander.theta), ellipse.rz * Math.cos(wander.theta)) || 1;
      wander.theta -= dt * WANDER.speed / r;
      view.pos.copy(onEllipse(wander.theta));
      // le regard glisse en douceur vers l'œuvre en face (jamais de rotation brusque)
      const gz = wanderGaze(wander.theta, now);
      view.yaw += angleDiff(view.yaw, gz.yaw) * Math.min(1, dt * .55);
      view.pitch += (gz.pitch - view.pitch) * Math.min(1, dt * .5);
      walking = .45;
    } else if (!drag && lastInput && now - lastInput > WANDER.idle * 1000){
      lastInput = 0;
      startWander();          // plus personne ne touche à rien : on reprend la promenade
    }

    bob += dt * walking * 2 * Math.PI * 1.6;
    camera.position.copy(view.pos);
    camera.position.y += Math.sin(bob) * .01 * walking;
    camera.rotation.set(view.pitch + Math.sin(bob * .5) * .002 * walking, view.yaw, Math.sin(bob * .5) * .0018 * walking);

    if ((hdCheck += dt) > 1){ hdCheck = 0; if (hdFiles.size) loadNearHD(view.pos); }
    lights = Math.min(1, lights + dt * .8);
    for (const sp of allSpots) sp.intensity = sp.userData.power * lights;
    renderer.render(scene, camera);
  });

  // la salle est prête : plus de repli possible
  window.__g3dReady = true;
  clearTimeout(window.__g3dTimer);

  /* ---------- arrivée : on franchit la porte et on commence la promenade ---------- */
  await Promise.race([firstLoaded, new Promise(r => setTimeout(r, 2500))]);
  // on avance lentement jusqu'au milieu de la salle, face au nom de l'artiste, puis on commence le tour
  const th0 = Math.PI;                                   // côté porte de la boucle
  const entry = onEllipse(th0);
  travel({ pos: entry, yaw: yawTo(entry, sign.center), pitch: Math.atan2(sign.center.y - CFG.eye, entry.distanceTo(sign.center)) }, () => {
    wander.on = true; wander.theta = th0;
  }, 7.5);
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

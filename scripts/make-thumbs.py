#!/usr/bin/env python3
"""Génère images/thumbs/<nom>.jpg (côté long 1100 px) + images/thumbs/sizes.json,
images/thumbs/s/<nom>.jpg (640 px de large, pour la grille du portfolio : ~3 fois plus léger),
images/2000/<nom>.jpg (côté long 2000 px, pour la page d'une œuvre : l'original peut dépasser 100 mégapixels)
+ images/2000/sizes.json, et images/og/<nom>.jpg (1200 × 630, toile centrée sur fond bleu nuit : image de partage).
Plus une copie WebP (2 à 4 fois plus légère) de chaque miniature et de la version 2000 px : <nom>.webp à côté du .jpg
(servie aux navigateurs qui la lisent, via <picture>). Le WebP demande Pillow (pip3 install pillow) ; sans lui,
le script fait seulement les JPEG et le site les utilise.

Utilisé par l'accueil et le portfolio (la modale du portfolio charge l'original).
À relancer après avoir ajouté des images dans images/ :   python3 scripts/make-thumbs.py
Nécessite macOS (outil `sips`). Les miniatures déjà à jour sont ignorées.
"""
import json, os, subprocess, sys
try:
    from PIL import Image   # facultatif : copies WebP
except ImportError:
    Image = None

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "images")
DST = os.path.join(SRC, "thumbs")
LONG_EDGE = 1100
QUALITY = 72
DST_S = os.path.join(DST, "s")   # petites miniatures de la grille
SMALL_W = 640
QUALITY_S = 50
BIG = os.path.join(SRC, "2000")  # grande image de la page d'une œuvre
BIG_EDGE = 2000
QUALITY_BIG = 75
OG = os.path.join(SRC, "og")     # image de partage (réseaux, messageries : légère, au format 1200 × 630)
OG_W, OG_H = 1200, 630
OG_BG = "0B1120"
QUALITY_OG = 78
QUALITY_WEBP = 72
SKIP = {"couverture.jpg", "og-default.jpg"}  # fichiers jamais affichés via les miniatures

def dims(path):
    out = subprocess.check_output(
        ["sips", "-g", "pixelWidth", "-g", "pixelHeight", path], text=True)
    vals = {l.split(":")[0].strip(): int(l.split(":")[1]) for l in out.splitlines() if ":" in l}
    return [vals["pixelWidth"], vals["pixelHeight"]]

def stale(out, src):
    return not os.path.exists(out) or os.path.getmtime(out) < os.path.getmtime(src)

def make_webp(jpg, src):
    """jpg -> même nom en .webp, aux mêmes dimensions, refait depuis src (image plus fine : pas de double compression)"""
    out = jpg[:-4] + ".webp"
    if Image is None or not stale(out, jpg):
        return
    with Image.open(src) as im:
        im = im.convert("RGB")
        size = tuple(dims(jpg))
        if im.size != size:
            im = im.resize(size, Image.LANCZOS)
        im.save(out, "WEBP", quality=QUALITY_WEBP, method=6)

def make_og(src, out):
    """toile entière (jamais recadrée), centrée dans un cadre 1200 × 630 sur fond uni"""
    w, h = dims(src)
    k = min(OG_W / w, OG_H / h)
    tmp = out + ".tmp.jpg"
    subprocess.check_call(["sips", "-z", str(round(h * k)), str(round(w * k)), src, "--out", tmp],
                          stdout=subprocess.DEVNULL)
    subprocess.check_call(["sips", "-p", str(OG_H), str(OG_W), "--padColor", OG_BG, "-s", "format", "jpeg",
                           "-s", "formatOptions", str(QUALITY_OG), tmp, "--out", out], stdout=subprocess.DEVNULL,
                          stderr=subprocess.DEVNULL)   # sips affiche la couleur de fond à chaque fois
    os.remove(tmp)

def main():
    for d in (DST, DST_S, BIG, OG):
        os.makedirs(d, exist_ok=True)
    sizes, big_sizes, made = {}, {}, 0
    for name in sorted(os.listdir(SRC)):
        if not name.lower().endswith(".jpg") or name in SKIP:
            continue
        src, dst = os.path.join(SRC, name), os.path.join(DST, name)
        if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
            subprocess.check_call(
                ["sips", "-Z", str(LONG_EDGE), "-s", "format", "jpeg",
                 "-s", "formatOptions", str(QUALITY), src, "--out", dst],
                stdout=subprocess.DEVNULL)
            made += 1
        small = os.path.join(DST_S, name)
        if not os.path.exists(small) or os.path.getmtime(small) < os.path.getmtime(dst):
            w = dims(dst)[0]
            subprocess.check_call(
                ["sips"] + (["--resampleWidth", str(SMALL_W)] if w > SMALL_W else []) +
                ["-s", "format", "jpeg", "-s", "formatOptions", str(QUALITY_S), dst, "--out", small],
                stdout=subprocess.DEVNULL)
        big = os.path.join(BIG, name)
        if stale(big, src):
            w, h = dims(src)
            subprocess.check_call(
                ["sips"] + (["-Z", str(BIG_EDGE)] if max(w, h) > BIG_EDGE else []) +
                ["-s", "format", "jpeg", "-s", "formatOptions", str(QUALITY_BIG), src, "--out", big],
                stdout=subprocess.DEVNULL)
        big_sizes[name] = dims(big)
        for jpg in (big, dst, small):
            make_webp(jpg, big)
        # [largeur, hauteur] de la miniature ; + 1 quand les copies WebP existent (les pages ne les proposent qu'alors)
        has_webp = all(os.path.exists(j[:-4] + ".webp") for j in (big, dst, small))
        sizes[name] = dims(dst) + ([1] if has_webp else [])
        og = os.path.join(OG, name)
        if stale(og, big):
            make_og(big, og)
    with open(os.path.join(DST, "sizes.json"), "w", encoding="utf-8") as f:
        json.dump(sizes, f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(BIG, "sizes.json"), "w", encoding="utf-8") as f:
        json.dump(big_sizes, f, ensure_ascii=False, separators=(",", ":"))
    if Image is None:
        print("Pillow absent : pas de copies WebP (pip3 install pillow)")
    print(f"{made} miniature(s) créée(s), {len(sizes)} au total → images/thumbs/, images/2000/, images/og/")

if __name__ == "__main__":
    sys.exit(main())

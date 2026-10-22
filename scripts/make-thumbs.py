#!/usr/bin/env python3
"""Génère images/thumbs/<nom>.jpg (côté long 1100 px) + images/thumbs/sizes.json,
et images/thumbs/s/<nom>.jpg (640 px de large, pour la grille du portfolio : ~3 fois plus léger).

Utilisé par l'accueil et le portfolio (la modale du portfolio charge l'original).
À relancer après avoir ajouté des images dans images/ :   python3 scripts/make-thumbs.py
Nécessite macOS (outil `sips`). Les miniatures déjà à jour sont ignorées.
"""
import json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "images")
DST = os.path.join(SRC, "thumbs")
LONG_EDGE = 1100
QUALITY = 72
DST_S = os.path.join(DST, "s")   # petites miniatures de la grille
SMALL_W = 640
QUALITY_S = 50
SKIP = {"couverture.jpg"}  # fichiers jamais affichés via les miniatures

def dims(path):
    out = subprocess.check_output(
        ["sips", "-g", "pixelWidth", "-g", "pixelHeight", path], text=True)
    vals = {l.split(":")[0].strip(): int(l.split(":")[1]) for l in out.splitlines() if ":" in l}
    return [vals["pixelWidth"], vals["pixelHeight"]]

def main():
    os.makedirs(DST, exist_ok=True)
    os.makedirs(DST_S, exist_ok=True)
    sizes, made = {}, 0
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
        sizes[name] = dims(dst)
    with open(os.path.join(DST, "sizes.json"), "w", encoding="utf-8") as f:
        json.dump(sizes, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{made} miniature(s) créée(s), {len(sizes)} au total → images/thumbs/")

if __name__ == "__main__":
    sys.exit(main())

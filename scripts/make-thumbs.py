#!/usr/bin/env python3
"""Génère images/thumbs/<nom>.jpg (côté long 1100 px) + images/thumbs/sizes.json.

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
SKIP = {"couverture.jpg"}  # fichiers jamais affichés via les miniatures

def dims(path):
    out = subprocess.check_output(
        ["sips", "-g", "pixelWidth", "-g", "pixelHeight", path], text=True)
    vals = {l.split(":")[0].strip(): int(l.split(":")[1]) for l in out.splitlines() if ":" in l}
    return [vals["pixelWidth"], vals["pixelHeight"]]

def main():
    os.makedirs(DST, exist_ok=True)
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
        sizes[name] = dims(dst)
    with open(os.path.join(DST, "sizes.json"), "w", encoding="utf-8") as f:
        json.dump(sizes, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{made} miniature(s) créée(s), {len(sizes)} au total → images/thumbs/")

if __name__ == "__main__":
    sys.exit(main())

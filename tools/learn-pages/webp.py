"""Writes a .webp next to every DSA Master card png (the pages serve webp, social previews keep the png).
usage: python tools/learn-pages/webp.py   (needs Pillow)"""
import pathlib
from PIL import Image

OUT = pathlib.Path(__file__).resolve().parents[2] / "assets/images/learn/dsa-master"
done = 0
for png in sorted(OUT.glob("*.png")):
    Image.open(png).convert("RGB").save(png.with_suffix(".webp"), "WEBP", quality=84, method=6)
    done += 1
print(f"wrote {done} webp files")

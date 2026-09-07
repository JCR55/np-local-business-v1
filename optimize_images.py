#!/usr/bin/env python3
"""
Resizes and recompresses oversized images under assets/ in place.

Many business photos are being served at raw camera resolution (up to
4080x3060, several MB each) for what's a few-hundred-pixel-wide card or
gallery image in the browser - a major page-weight and Core Web Vitals
(LCP) problem. This caps the longest edge at MAX_DIMENSION (still far more
than any layout on this site needs, including retina) and re-encodes:
JPEGs at JPEG_QUALITY with progressive + optimize, PNGs with optimize.

Filenames and formats are left untouched, so no HTML/JSON reference needs
to change. Only files over SIZE_THRESHOLD_BYTES are touched, so already
reasonably-sized assets (icons, logos, already-compressed graphics) are
left alone. Safe to re-run: already-small images are skipped.
"""
import os
import sys
from PIL import Image, ImageOps

MAX_DIMENSION = 2000
JPEG_QUALITY = 82
SIZE_THRESHOLD_BYTES = 300 * 1024

def optimize(path):
    original_size = os.path.getsize(path)
    if original_size <= SIZE_THRESHOLD_BYTES:
        return None

    im = Image.open(path)
    fmt = im.format  # must read before exif_transpose(), which drops it
    im = ImageOps.exif_transpose(im)  # bake in EXIF rotation before resizing

    changed = False
    if max(im.size) > MAX_DIMENSION:
        im.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)
        changed = True

    if fmt == "JPEG":
        if im.mode not in ("RGB", "L"):
            im = im.convert("RGB")
        im.save(path, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
    elif fmt == "PNG":
        im.save(path, "PNG", optimize=True)
    else:
        return None

    new_size = os.path.getsize(path)
    return original_size, new_size, changed


def main():
    total_before = 0
    total_after = 0
    touched = 0
    for root, _dirs, files in os.walk("assets"):
        for name in files:
            if not name.lower().endswith((".jpg", ".jpeg", ".png")):
                continue
            path = os.path.join(root, name)
            result = optimize(path)
            if result is None:
                continue
            before, after, _ = result
            total_before += before
            total_after += after
            touched += 1
            print(f"{path}: {before/1024:.0f}KB -> {after/1024:.0f}KB")

    print(f"\nOptimized {touched} files.")
    print(f"Total: {total_before/1024/1024:.1f}MB -> {total_after/1024/1024:.1f}MB "
          f"({(1 - total_after/total_before)*100:.0f}% reduction)" if total_before else "No files touched.")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
One-off follow-up to optimize_images.py: converts large photographic PNGs
(no real transparency) to JPEG, and deletes large PNGs that turned out to
have zero references anywhere in the site (dead leftovers from earlier
design iterations). PNGs that actually use transparency are left alone.

Rewrites every literal reference to a converted file's old path (across
HTML, businesses.json, JS, CSS, admin config) to its new .jpg path, so
nothing links to a file that no longer exists.
"""
import glob
import os
import re
from PIL import Image

JPEG_QUALITY = 82

TO_CONVERT = [
    "assets/images/hero/join-cwmcarn-guardian.png",
    "assets/images/hero/categories-tintern-abbey.png",
    "assets/images/hero/locations-big-pit-blaenavon.png",
    "assets/images/hero/sugar-loaf-abergavenny-panoramic.png",
    "assets/images/businesses/south-wales-barbeques/south-wales-barbeques-hero.png",
    "assets/images/businesses/caerleon-carpets/caerleon-carpets-hero.png",
    "assets/images/businesses/cwmbran-tuning-service-centre/cwmbran-tuning-service-centre-hero.png",
    "assets/images/businesses/andrews-jewellers/andrews-jewellers-hero.png",
    "assets/images/businesses/bryan-watkins-and-son-handyman-ltd/bryan-watkins-and-son-handyman-ltd-hero.png",
    "assets/images/hero/join-local-business-owner.png",
    "assets/images/businesses/beds-direct/beds-direct-hero.png",
    "assets/images/businesses/b-active-sports-massage-and-therapy/b-active-sports-massage-and-therapy-hero.png",
    "assets/images/businesses/additions-accountancy/additions-accountancy-hero.png",
    "assets/images/businesses/panteg-vehicle-repairs-hero.png",
    "assets/images/businesses/man-cave-and-boyzone/man-cave-and-boyzone-gallery-03.png",
    "assets/images/businesses/panteg-vehicle-repairs-logo.png",
    "assets/images/businesses/andrews-jewellers/andrews-jewellers-logo-premium.png",
    "assets/images/businesses/cwmbran-door-centre/cwmbran-door-centre-logo.png",
    "assets/images/businesses/ivanhoe-haulage/ivanhoe-haulage-logo.png",
    "assets/images/businesses/e-r-simms-garage-doors/e-r-simms-garage-doors-logo.png",
]

TO_DELETE = [
    "assets/images/hero/categories-local-business-directory.png",
    "assets/images/hero/locations-newport-transporter-bridge.png",
    "assets/sugar-loaf-abergavenny-hero.png",
    "assets/images/hero/locations-np-sugar-loaf-abergavenny.png",
    "assets/np-local-business-hero.png",
    "assets/images/hero/np-local-business-legacy-hero.png",
    "assets/images/businesses/south-wales-barbecues.png",
    "assets/businesses/south-wales-barbecues.png",
    "assets/images/businesses/happier-feet/happier-feet-hero-risca-clinic.png",
    "assets/images/businesses/happier-feet/happier-feet-gallery-risca-clinic-opening.png",
    "assets/images/businesses/iris-blue-celebrancy/iris-blue-celebrancy-gallery-03.png",
]

TEXT_FILES = (
    glob.glob("*.html")
    + ["data/businesses.json", "data/site.js", "data/responsive-banners.js"]
    + glob.glob("css/*.css")
    + glob.glob("js/*.js")
    + glob.glob("admin/*")
)


def convert_to_jpeg(png_path):
    jpg_path = re.sub(r"\.png$", ".jpg", png_path)
    im = Image.open(png_path)
    if im.mode != "RGB":
        im = im.convert("RGB")
    im.save(jpg_path, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
    before = os.path.getsize(png_path)
    after = os.path.getsize(jpg_path)
    os.remove(png_path)
    return jpg_path, before, after


def rewrite_references(old_path, new_path):
    changed_files = []
    for path in TEXT_FILES:
        try:
            with open(path, encoding="utf-8") as f:
                text = f.read()
        except FileNotFoundError:
            continue
        if old_path not in text:
            continue
        with open(path, "w", encoding="utf-8") as f:
            f.write(text.replace(old_path, new_path))
        changed_files.append(path)
    return changed_files


def main():
    total_before = total_after = 0
    for png_path in TO_CONVERT:
        jpg_path, before, after = convert_to_jpeg(png_path)
        total_before += before
        total_after += after
        changed = rewrite_references(png_path, jpg_path)
        print(f"{png_path} -> {jpg_path}: {before/1024:.0f}KB -> {after/1024:.0f}KB, "
              f"rewritten in {len(changed)} files")

    deleted_bytes = 0
    for path in TO_DELETE:
        deleted_bytes += os.path.getsize(path)
        os.remove(path)
        print(f"deleted (unreferenced): {path}")

    print(f"\nConverted {len(TO_CONVERT)} PNGs: "
          f"{total_before/1024/1024:.1f}MB -> {total_after/1024/1024:.1f}MB")
    print(f"Deleted {len(TO_DELETE)} unreferenced PNGs: {deleted_bytes/1024/1024:.1f}MB freed")


if __name__ == "__main__":
    main()

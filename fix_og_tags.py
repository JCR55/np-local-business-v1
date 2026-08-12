#!/usr/bin/env python3
"""
Bakes correct per-business Open Graph / Twitter / SEO meta tags into each
static business profile HTML file, replacing the generic placeholder
(mountain hero image, generic title/description) that crawlers currently see
because they don't execute js/seo.js.

Idempotent: safe to re-run after adding/updating businesses in businesses.json.
"""
import json
import re
import sys

SITE = "https://www.newportlocalbusiness.co.uk"

with open("data/businesses.json", encoding="utf-8") as f:
    businesses = json.load(f)["businesses"]

updated = []
skipped = []

for b in businesses:
    code = b.get("referralCode")
    name = b.get("name")
    if not code or not name:
        skipped.append(b)
        continue

    path = f"{code}.html"
    try:
        with open(path, encoding="utf-8") as f:
            html = f.read()
    except FileNotFoundError:
        skipped.append(code)
        continue

    title = f"{name} | NP Local Business"
    desc = (b.get("shortDescription") or "").strip()
    if not desc:
        desc = "View trusted local business details, services, images and contact routes on NP Local Business."
    image_path = b.get("heroImage") or b.get("cardImage") or b.get("logo") or ""
    image_url = f"{SITE}/{image_path}" if image_path else f"{SITE}/assets/np-local-business-hero.png"
    page_url = f"{SITE}/{code}"

    def esc(s):
        return s.replace('"', "&quot;")

    title_e, desc_e, image_e, url_e = esc(title), esc(desc), esc(image_url), esc(page_url)

    replacements = [
        (r'(<title>)[^<]*(</title>)', rf'\g<1>{title_e}\g<2>'),
        (r'(<link rel="canonical" href=")[^"]*(")', rf'\g<1>{url_e}\g<2>'),
        (r'(<meta name="description" content=")[^"]*(")', rf'\g<1>{desc_e}\g<2>'),
        (r'(<meta property="og:title" content=")[^"]*(")', rf'\g<1>{title_e}\g<2>'),
        (r'(<meta property="og:description" content=")[^"]*(")', rf'\g<1>{desc_e}\g<2>'),
        (r'(<meta property="og:url" content=")[^"]*(")', rf'\g<1>{url_e}\g<2>'),
        (r'(<meta property="og:image" content=")[^"]*(")', rf'\g<1>{image_e}\g<2>'),
        (r'(<meta name="twitter:title" content=")[^"]*(")', rf'\g<1>{title_e}\g<2>'),
        (r'(<meta name="twitter:description" content=")[^"]*(")', rf'\g<1>{desc_e}\g<2>'),
        (r'(<meta name="twitter:image" content=")[^"]*(")', rf'\g<1>{image_e}\g<2>'),
    ]

    new_html = html
    for pattern, repl in replacements:
        new_html, n = re.subn(pattern, repl, new_html, count=1)
        if n == 0:
            print(f"WARNING: pattern not found in {path}: {pattern}", file=sys.stderr)

    if new_html != html:
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_html)
        updated.append(path)

print(f"Updated {len(updated)} files.")
if skipped:
    print(f"Skipped: {skipped}")

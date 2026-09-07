#!/usr/bin/env python3
"""
Adds BreadcrumbList JSON-LD (Home > Category > Business) to every business
profile page, driven by data/businesses.json. Only one page
(cwmbran-tuning-service-centre) had this before, bundled inside its
hand-written @graph; this adds a separate <script> block for everyone else
so it doesn't have to touch the existing business-schema block at all.

Idempotent: skips any page that already has a "BreadcrumbList" anywhere in
its markup. Safe to re-run after adding/updating businesses.
"""
import json
import re
import sys
from urllib.parse import quote

SITE = "https://www.newportlocalbusiness.co.uk"


def build_breadcrumb(business):
    code = business["referralCode"]
    category = business.get("category")
    items = [
        {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{SITE}/"},
    ]
    position = 2
    if category:
        items.append(
            {
                "@type": "ListItem",
                "position": position,
                "name": category,
                "item": f"{SITE}/categories?category={quote(category)}",
            }
        )
        position += 1
    items.append(
        {
            "@type": "ListItem",
            "position": position,
            "name": business["name"],
            "item": f"{SITE}/{code}",
        }
    )
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": items,
    }


def render_script_tag(schema):
    body = json.dumps(schema, indent=2)
    indented = "\n".join(
        "      " + line if line.strip() else line for line in body.splitlines()
    )
    return f'    <script type="application/ld+json" id="breadcrumb-schema">\n{indented}\n    </script>\n'


def main():
    with open("data/businesses.json", encoding="utf-8") as f:
        businesses = json.load(f)["businesses"]

    updated, skipped_existing, skipped_missing = [], [], []

    for business in businesses:
        code = business.get("referralCode")
        if not code:
            continue
        path = f"{code}.html"
        try:
            with open(path, encoding="utf-8") as f:
                html = f.read()
        except FileNotFoundError:
            skipped_missing.append(code)
            continue

        if "BreadcrumbList" in html:
            skipped_existing.append(code)
            continue

        marker = re.search(r'id="business-schema">.*?</script>\s*\n', html, re.S)
        if not marker:
            print(f"WARNING: could not find business-schema block in {path}", file=sys.stderr)
            skipped_missing.append(code)
            continue

        script_tag = render_script_tag(build_breadcrumb(business))
        insert_at = marker.end()
        new_html = html[:insert_at] + script_tag + html[insert_at:]

        with open(path, "w", encoding="utf-8") as f:
            f.write(new_html)
        updated.append(path)

    print(f"Added breadcrumb schema to {len(updated)} files.")
    if skipped_existing:
        print(f"Skipped (already has breadcrumbs): {skipped_existing}")
    if skipped_missing:
        print(f"Skipped (no file or no business-schema block): {skipped_missing}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Generates llms.txt, the emerging convention (llmstxt.org) that AI
assistants and crawlers use to quickly understand what a site is and find
its key pages, without having to crawl and parse full HTML.

Driven entirely by data/businesses.json, grouped by category, so it's
reusable: re-run after adding/updating businesses. Safe to re-run.
"""
import json

SITE = "https://www.newportlocalbusiness.co.uk"

with open("data/businesses.json", encoding="utf-8") as f:
    businesses = json.load(f)["businesses"]

by_category = {}
for b in businesses:
    by_category.setdefault(b["category"], []).append(b)

lines = [
    "# NP Local Business",
    "",
    "> A trusted directory of independent, verified local businesses across "
    "the NP postcode area of South Wales, UK - Newport, Cwmbran, Pontypool, "
    "Usk, Abergavenny, Monmouth, Chepstow and surrounding communities. Each "
    "listing includes verified contact details, opening hours, services and "
    "location.",
    "",
    "## Key pages",
    "",
    f"- [Home]({SITE}/): overview and featured businesses",
    f"- [Categories]({SITE}/categories): browse all businesses by category",
    f"- [Locations]({SITE}/locations): browse all businesses by town/area",
    f"- [Join]({SITE}/join): list a business on the directory",
    "",
]

for category in sorted(by_category):
    lines.append(f"## {category}")
    lines.append("")
    for b in sorted(by_category[category], key=lambda x: x["name"]):
        desc = (b.get("shortDescription") or "").strip()
        town = b.get("town") or b.get("location") or ""
        suffix = f" ({town})" if town else ""
        lines.append(f"- [{b['name']}]({SITE}/{b['referralCode']}){suffix}: {desc}")
    lines.append("")

with open("llms.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(lines).rstrip() + "\n")

print(f"Wrote llms.txt with {len(businesses)} businesses across {len(by_category)} categories.")

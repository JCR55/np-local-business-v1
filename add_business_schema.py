#!/usr/bin/env python3
"""
Bakes LocalBusiness (or a more specific schema.org subtype) JSON-LD structured
data into each static business profile HTML file, driven by data/businesses.json.

Google can't reliably read the JSON-LD that js/seo.js would otherwise inject at
runtime, because it mostly renders crawled pages without executing JavaScript
for structured data extraction. Baking it into the static HTML (like
fix_og_tags.py already does for Open Graph/Twitter tags) means every crawler
sees it immediately.

Idempotent and non-destructive:
- Skips any page that already has a <script id="business-schema"> block, so it
  never clobbers the two hand-crafted, richer schemas (additions-accountancy,
  cwmbran-tuning-service-centre) that already include breadcrumbs/offer
  catalogs beyond what this script generates.
- Never invents data. Opening hours, address components, etc. that can't be
  parsed with confidence from businesses.json are simply omitted rather than
  guessed.
- Safe to re-run after adding/updating businesses in businesses.json.
"""
import json
import re
import sys

SITE = "https://www.newportlocalbusiness.co.uk"

# subcategory -> schema.org @type. Falls back to "LocalBusiness" when a
# subcategory isn't listed (or isn't a recognised, more specific schema.org
# type), which is always a valid, safe choice.
SCHEMA_TYPE_BY_SUBCATEGORY = {
    "Garages": "AutoRepair",
    "Garage & MOT Centre": "AutoRepair",
    "Accident Repair / Vehicle Body Repair": "AutoBodyShop",
    "Car Sales": "AutoDealer",
    "Salvage / Car Sales": "AutomotiveBusiness",
    "Salvage / Building Supplies": "Store",
    "Vehicle Leasing": "AutomotiveBusiness",
    "Wedding Car Hire": "AutomotiveBusiness",
    "Minibus Hire": "AutomotiveBusiness",
    "Valeting": "AutomotiveBusiness",
    "Haulage": "LocalBusiness",
    "Aerial Services": "HomeAndConstructionBusiness",
    "Roofing": "RoofingContractor",
    "Carpentry & Joinery": "HomeAndConstructionBusiness",
    "Garage Doors": "HomeAndConstructionBusiness",
    "Doors": "HomeAndConstructionBusiness",
    "DIY / Building Supplies": "HardwareStore",
    "Industrial Supplies": "Store",
    "Curtains & Blinds": "HomeGoodsStore",
    "Furniture": "FurnitureStore",
    "Carpets & Rugs": "HomeGoodsStore",
    "Barbecues & Outdoor Living": "HomeGoodsStore",
    "Locksmiths": "Locksmith",
    "Gas Engineers": "HVACBusiness",
    "Mobility Services": "Store",
    "Barbers": "HairSalon",
    "Chiropodists": "MedicalBusiness",
    "Sports Massage": "HealthAndBeautyBusiness",
    "Florists": "Florist",
    "Jewellers": "JewelryStore",
    "Gift Shops": "Store",
    "Celebrants": "LocalBusiness",
    "Printing": "ProfessionalService",
    "Estate Agents": "RealEstateAgent",
    "Accountants": "AccountingService",
    "Computers & Repair": "ElectronicsStore",
    "Music Shops": "MusicStore",
    "Takeaways": "FastFoodRestaurant",
    "Pet Cremation & Bereavement": "LocalBusiness",
}

WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
DAY_ABBR = {d.lower()[:3]: d for d in WEEK}

UK_POSTCODE_RE = re.compile(
    r"\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b", re.IGNORECASE
)
TIME_RANGE_RE = re.compile(
    r"(\d{1,2}(?::\d{2})?)\s*([ap]\.?m\.?)?\s*[-–]\s*(\d{1,2}(?::\d{2})?)\s*([ap]\.?m\.?)?",
    re.IGNORECASE,
)


def esc(s):
    return s.replace('"', "&quot;")


def abs_url(path):
    if not path:
        return None
    if path.startswith("http://") or path.startswith("https://"):
        return path
    return f"{SITE}/{path}"


def normalize_day(token):
    token = token.strip().lower().rstrip(".")
    if not token:
        return None
    key = token[:3]
    return DAY_ABBR.get(key)


def expand_days(day_str):
    day_str = day_str.replace(" to ", "-")
    parts = re.split(r"-|–", day_str)
    parts = [p for p in (p.strip() for p in parts) if p]
    if len(parts) == 1:
        d = normalize_day(parts[0])
        return [d] if d else []
    if len(parts) == 2:
        start, end = normalize_day(parts[0]), normalize_day(parts[1])
        if not start or not end:
            return []
        si, ei = WEEK.index(start), WEEK.index(end)
        return WEEK[si : ei + 1] if si <= ei else WEEK[si:] + WEEK[: ei + 1]
    return []


def to_24h(value, meridiem):
    value = value.strip()
    if ":" in value:
        h, m = value.split(":", 1)
    else:
        h, m = value, "00"
    try:
        h, m = int(h), int(m)
    except ValueError:
        return None
    if meridiem:
        meridiem = meridiem.lower().replace(".", "")
        if meridiem == "pm" and h != 12:
            h += 12
        if meridiem == "am" and h == 12:
            h = 0
    if not (0 <= h <= 24 and 0 <= m < 60):
        return None
    return f"{h:02d}:{m:02d}"


def parse_hours_fragment(days, hours_fragment):
    specs = []
    for sub_range in hours_fragment.split(","):
        sub_range = sub_range.strip()
        if not sub_range:
            continue
        m = TIME_RANGE_RE.search(sub_range)
        if not m:
            continue
        open_raw, open_mer, close_raw, close_mer = m.groups()
        # Colloquial shorthand like "5:00-10:00pm" or "12:00-1:30pm" only
        # states the meridiem once and means it for both ends; borrow it from
        # whichever side has it. Ranges with no meridiem at all (e.g.
        # "9:00 - 17:00") are already unambiguous 24-hour times.
        if not open_mer and close_mer:
            open_mer = close_mer
        elif not close_mer and open_mer:
            close_mer = open_mer
        opens = to_24h(open_raw, open_mer)
        closes = to_24h(close_raw, close_mer)
        if not opens or not closes:
            continue
        specs.append(
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": days,
                "opens": opens,
                "closes": closes,
            }
        )
    return specs


def build_opening_hours_specification(opening_hours):
    if not opening_hours:
        return None

    # Normalise every supported shape into a flat list of (day_str, hours_str).
    entries = []
    if isinstance(opening_hours, dict):
        entries = list(opening_hours.items())
    elif isinstance(opening_hours, list):
        for item in opening_hours:
            if isinstance(item, dict) and "days" in item and "hours" in item:
                entries.append((item["days"], item["hours"]))
            elif isinstance(item, str):
                if "24 hour" in item.lower():
                    entries.append(("Monday-Sunday", "00:00-23:59"))
                    continue
                if ":" not in item:
                    continue  # e.g. "Available 24 hours" already handled above
                day_str, hours_str = item.split(":", 1)
                entries.append((day_str, hours_str))

    specs = []
    for day_str, hours_str in entries:
        if "closed" in hours_str.lower():
            continue
        days = expand_days(day_str)
        if not days:
            continue
        specs.extend(parse_hours_fragment(days, hours_str))

    return specs or None


def build_address(business):
    contact = business.get("contact", {})
    raw = (contact.get("address") or "").strip()
    if not raw:
        return None

    address = {"@type": "PostalAddress", "addressCountry": "GB"}

    postcode_match = UK_POSTCODE_RE.search(raw)
    postcode = postcode_match.group(1).upper() if postcode_match else None

    parts = [p.strip() for p in raw.split(",")]
    locality = business.get("town") or business.get("location")

    if postcode_match and len(parts) >= 2 and postcode in parts[-1].upper():
        # "Street, ..., Locality, POSTCODE" - the common case.
        remaining = parts[:-1]
        if not locality and remaining:
            locality = remaining[-1]
            remaining = remaining[:-1]
        elif (
            locality
            and remaining
            and remaining[-1].strip().lower() == locality.strip().lower()
        ):
            # Don't duplicate the locality into both streetAddress and
            # addressLocality when it's already the trailing segment.
            remaining = remaining[:-1]
        street = ", ".join(remaining)
    elif len(parts) > 1:
        # Multi-segment address without a trailing postcode we recognise -
        # keep the whole thing as the street address rather than guessing at
        # structure, unless it's literally identical to the known locality.
        street = raw if raw.strip().lower() != (locality or "").strip().lower() else None
    else:
        # A single bare value like "Cwmbran" or "South Wales" is an area
        # name, not a street address.
        street = None
        if not locality:
            locality = raw

    if street:
        address["streetAddress"] = street
    if locality:
        address["addressLocality"] = locality
    if postcode:
        address["postalCode"] = postcode

    return address


def build_schema(business):
    code = business["referralCode"]
    name = business["name"]
    schema_type = business.get("schemaType") or SCHEMA_TYPE_BY_SUBCATEGORY.get(
        business.get("subcategory"), "LocalBusiness"
    )
    page_url = f"{SITE}/{code}"
    contact = business.get("contact", {})

    schema = {
        "@context": "https://schema.org",
        "@type": schema_type,
        "@id": f"{page_url}#business",
        "name": name,
        "url": page_url,
        "mainEntityOfPage": page_url,
    }

    if business.get("alternateName"):
        schema["alternateName"] = business["alternateName"]

    description = (business.get("shortDescription") or "").strip()
    if description:
        schema["description"] = description

    if contact.get("phone"):
        schema["telephone"] = contact["phone"]
    if contact.get("email"):
        schema["email"] = contact["email"]

    address = build_address(business)
    if address:
        schema["address"] = address

    if contact.get("googleMapsUrl"):
        schema["hasMap"] = contact["googleMapsUrl"]

    logo = abs_url(business.get("logo"))
    if logo:
        schema["logo"] = logo
    image = abs_url(business.get("heroImage") or business.get("cardImage"))
    if image:
        schema["image"] = image

    same_as = [url for url in (business.get("social") or {}).values() if url]
    if same_as:
        schema["sameAs"] = same_as

    areas = business.get("areasCovered")
    if areas:
        schema["areaServed"] = [{"@type": "Place", "name": area} for area in areas]
    elif business.get("town") or business.get("location"):
        schema["areaServed"] = {
            "@type": "Place",
            "name": business.get("town") or business.get("location"),
        }

    opening_hours_spec = build_opening_hours_specification(business.get("openingHours"))
    if opening_hours_spec:
        schema["openingHoursSpecification"] = opening_hours_spec

    services = business.get("services")
    if services:
        schema["hasOfferCatalog"] = {
            "@type": "OfferCatalog",
            "name": f"{name} services",
            "itemListElement": [
                {
                    "@type": "Offer",
                    "itemOffered": {"@type": "Service", "name": service},
                }
                for service in services
            ],
        }

    return schema


def render_script_tag(schema):
    body = json.dumps(schema, indent=2)
    indented = "\n".join(
        "      " + line if line.strip() else line for line in body.splitlines()
    )
    return f'    <script type="application/ld+json" id="business-schema">\n{indented}\n    </script>\n'


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

        if 'id="business-schema"' in html:
            skipped_existing.append(code)
            continue

        insertion_marker = re.search(
            r'<meta name="twitter:image"[^>]*/?>\s*\n', html
        )
        if not insertion_marker:
            print(f"WARNING: could not find insertion point in {path}", file=sys.stderr)
            skipped_missing.append(code)
            continue

        schema = build_schema(business)
        script_tag = render_script_tag(schema)
        insert_at = insertion_marker.end()
        new_html = html[:insert_at] + script_tag + html[insert_at:]

        with open(path, "w", encoding="utf-8") as f:
            f.write(new_html)
        updated.append(path)

    print(f"Added schema to {len(updated)} files.")
    if skipped_existing:
        print(f"Skipped (already has schema): {skipped_existing}")
    if skipped_missing:
        print(f"Skipped (no matching file): {skipped_missing}")


if __name__ == "__main__":
    main()

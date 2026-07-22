# NP Local Business v1.0

Production-ready static directory rebuild for NP Local Business.

## Pages

- `index.html` - homepage with Sugar Loaf / Abergavenny hero, primary search, dynamic category counts and featured businesses.
- `business.html` - reusable business profile template driven by URL parameter, for example `business.html?id=south-wales-barbeques`.
- `categories.html` - category directory and search results.
- `locations.html` - NP area location overview.
- `join.html` - business registration interest page.

## Data

- `data/businesses.json` is the single source of truth for business listings.
- `data/businesses.js` is generated from the same business data so the preview can run by opening `index.html` directly in a browser.
- `data/site.js` stores shared navigation, category metadata, locations and homepage brand copy.

Editing a business in `businesses.json` automatically updates:

- homepage counts
- category totals
- search results
- featured business cards
- category pages
- location pages
- business profiles

## Code

- `js/app.js` contains shared utilities, layout rendering, business cards, category counts and data loading.
- `js/homepage.js`, `js/categories.js`, `js/profile.js`, `js/locations.js` and `js/search.js` contain page-specific behaviour.
- `css/main.css`, `css/homepage.css`, `css/profile.css` and `css/responsive.css` separate the core design system from page and breakpoint rules.

## Brand Direction

The build uses deep navy, NP red, community green, premium flat icons, bold headings and clean panels to make the site feel like a premium digital version of the approved NP Local Business leaflet while preserving a familiar directory structure.

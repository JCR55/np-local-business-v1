# NP Local Business SEO Launch Audit

Date: 2026-07-22

## Audit Summary

The site has a strong commercial foundation: clear brand positioning, local category and location journeys, a current sitemap, robots.txt, canonical tags, Open Graph tags, responsive pages and a maintained business data file.

The main SEO risk is architectural: business profile content is rendered from JavaScript on one shared `business.html` template. Google can usually render this, but static per-business HTML pages would be stronger for local SEO, Bing and AI search extraction.

## Implemented Changes

- Added a reusable SEO/schema layer in `js/seo.js`.
- Added Organization and WebSite schema to the homepage.
- Added SearchAction schema using the real search route: `/categories.html?q=...`.
- Added richer dynamic LocalBusiness schema for client profile pages.
- Added BreadcrumbList schema for business, category, location and join journeys.
- Added CollectionPage and ItemList schema for category and location listing pages.
- Added Service and Offer schema for the annual GBP 95 join listing.
- Added `noindex,follow` to `success.html`.
- Added `404.html` for Netlify with `noindex,follow`.
- Removed broad fallback service areas from the business profile contact/schema logic so profiles only use supplied business data.
- Added lazy loading to gallery images and eager decoding to profile hero images.

## Schema Implementation

Homepage:

- Organization
- WebSite
- SearchAction

Business profiles:

- LocalBusiness subtype where confidently mapped, such as RoofingContractor, Locksmith, HairSalon, JewelryStore, Florist, AccountingService, RealEstateAgent, FoodEstablishment, AutoRepair, AutoDealer, Store, HealthAndBeautyBusiness or ProfessionalService.
- PostalAddress only where an address exists.
- Phone, email, logo, image, map link, opening hours, sameAs social links and services only where present in the business data.
- No fake reviews, ratings, coordinates or invented ownership relationships.

Categories and locations:

- BreadcrumbList
- CollectionPage
- ItemList of visible businesses

Join page:

- Service
- Offer for annual directory membership at GBP 95

## Page Template Strategy

Current approach:

- One reusable profile template pulls all content from `businesses.json` / `businesses.js`.
- This is good for maintenance and client updates.

Recommended launch-candidate improvement:

- Generate static profile pages or static pre-rendered HTML for each business slug.
- Keep `businesses.json` as the source of truth, but output crawlable HTML for Google, Bing and AI search systems.

## AI Search Improvements

The new schema makes the site easier for AI search tools to understand:

- NP Local Business is clearly defined as the directory brand.
- Each business has its own entity block.
- Services, phone numbers, websites, social links, areas covered and map links are structured where available.
- Category and location pages now describe a list of businesses instead of only relying on visual cards.

## Remaining Content Gaps

- Some businesses still need stronger unique About sections, gallery captions and service descriptions.
- Several businesses have limited or missing opening hours.
- Some Google Maps links are search links rather than exact Place/Profile links.
- Reviews and ratings should only be added if they can be sourced legitimately from a supported reviews feed or first-party testimonial system.
- Static generated profile pages would be the biggest next SEO improvement.

## Owner Actions

- Connect Netlify to GitHub once the repository has the site files.
- Add `nplocalbusiness.co.uk` as the primary Netlify domain.
- Enable HTTPS in Netlify.
- Enable Netlify form detection and notification emails.
- Submit `https://www.newportlocalbusiness.co.uk/sitemap.xml` in Google Search Console.
- Submit the same sitemap in Bing Webmaster Tools.
- Set up Google Analytics or a privacy-friendly analytics option.
- Create or claim business/social profiles for NP Local Business and keep NAP details consistent.

## Testing Results

- JavaScript syntax check passed for `js/seo.js`.
- JavaScript syntax check passed for `js/profile.js`.
- SEO script was inserted into homepage, profile, categories, locations, join and success pages.
- Final shell-based mirror/validation checks became unreliable because PowerShell started timing out after the folder copy operation. Re-run a final deploy folder check before upload if the upload folder is used directly.

(function () {
  const np = window.NP;
  const site = np?.site || window.NP_SITE || {};
  const productionUrl = String(site.productionUrl || "https://www.nplocalbusiness.co.uk").replace(/\/$/, "");
  const page = document.body?.dataset.page || "";

  function absoluteUrl(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(String(path))) return String(path);
    return `${productionUrl}/${String(path).replace(/^\//, "")}`;
  }

  function clean(value) {
    if (Array.isArray(value)) {
      const items = value.map(clean).filter((item) => {
        if (item === undefined || item === null || item === "") return false;
        if (Array.isArray(item)) return item.length > 0;
        if (typeof item === "object") return Object.keys(item).length > 0;
        return true;
      });
      return items.length ? items : undefined;
    }
    if (value && typeof value === "object") {
      const object = Object.entries(value).reduce((result, [key, item]) => {
        const cleaned = clean(item);
        if (cleaned !== undefined) result[key] = cleaned;
        return result;
      }, {});
      return Object.keys(object).length ? object : undefined;
    }
    if (value === undefined || value === null || value === "") return undefined;
    return value;
  }

  function upsertMeta(selector, attr, value) {
    if (!value) return;
    let meta = document.head.querySelector(selector);
    if (!meta) {
      meta = document.createElement("meta");
      const match = selector.match(/\[(name|property)="([^"]+)"\]/);
      if (match) meta.setAttribute(match[1], match[2]);
      document.head.appendChild(meta);
    }
    meta.setAttribute(attr, value);
  }

  function upsertCanonical(url) {
    if (!url) return;
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", url);
  }

  function upsertRobots(content) {
    if (!content) return;
    upsertMeta('meta[name="robots"]', "content", content);
  }

  function setShare({ title, description, url, image, type = "website" }) {
    if (title) document.title = title;
    upsertCanonical(url);
    upsertMeta('meta[name="description"]', "content", description);
    upsertMeta('meta[property="og:type"]', "content", type);
    upsertMeta('meta[property="og:title"]', "content", title);
    upsertMeta('meta[property="og:description"]', "content", description);
    upsertMeta('meta[property="og:url"]', "content", url);
    upsertMeta('meta[property="og:image"]', "content", image);
    upsertMeta('meta[name="twitter:title"]', "content", title);
    upsertMeta('meta[name="twitter:description"]', "content", description);
    upsertMeta('meta[name="twitter:image"]', "content", image);
  }

  function writeJsonLd(id, graph) {
    const existing = document.head.querySelector(`#${id}`);
    if (existing) existing.remove();
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = id;
    script.textContent = JSON.stringify(clean(graph), null, 2);
    document.head.appendChild(script);
  }

  function orgSchema() {
    return {
      "@type": "Organization",
      "@id": `${productionUrl}/#organization`,
      name: site.brand?.name || "NP Local Business",
      url: `${productionUrl}/`,
      logo: absoluteUrl(site.brand?.logo),
      sameAs: (site.social || []).map((item) => item.href).filter(Boolean),
      areaServed: ["Newport", "Torfaen", "Monmouthshire", "Caerphilly", "NP postcode area"].map((name) => ({
        "@type": "AdministrativeArea",
        name
      }))
    };
  }

  function breadcrumb(items) {
    return {
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.url
      }))
    };
  }

  function schemaTypeForBusiness(business) {
    const text = [business.name, business.category, business.specificCategory, business.subcategory, ...(business.services || [])]
      .join(" ")
      .toLowerCase();
    const rules = [
      [/roof/, "RoofingContractor"],
      [/locksmith|key/, "Locksmith"],
      [/barber|hair/, "HairSalon"],
      [/jewel|watch|clock/, "JewelryStore"],
      [/flower|florist/, "Florist"],
      [/account|bookkeep/, "AccountingService"],
      [/estate agent|property sales/, "RealEstateAgent"],
      [/restaurant|takeaway|chinese|food/, "FoodEstablishment"],
      [/mot|garage|mechanic|vehicle repair|car body|body work/, "AutoRepair"],
      [/car sales|van specialist|used car|pure vans/, "AutoDealer"],
      [/carpet|curtain|blind|beds|guitars|timber|diy|supplies|mobility/, "Store"],
      [/massage|therapy|chiropody|chiropractic|podiatry/, "HealthAndBeautyBusiness"],
      [/printing|celebrancy|minibus|haulage|handyman|carpentry|joinery|gas|plumbing|wedding car/, "ProfessionalService"]
    ];
    return rules.find(([pattern]) => pattern.test(text))?.[1] || "LocalBusiness";
  }

  function postcodeFrom(address) {
    return String(address || "").match(/\b[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}\b/i)?.[0]?.toUpperCase();
  }

  function postalAddress(business) {
    const raw = String(business.contact?.address || "").trim();
    if (!raw || /^https?:\/\//i.test(raw)) return undefined;
    const town = np.displayTown ? np.displayTown(business) : business.location;
    return {
      "@type": "PostalAddress",
      streetAddress: raw,
      addressLocality: town,
      postalCode: postcodeFrom(raw) || business.postcodeArea,
      addressCountry: "GB"
    };
  }

  function businessAreas(business) {
    const candidates = [
      business.location,
      business.postcodeArea,
      ...(business.areasCovered || []),
      ...(business.highlights || [])
    ]
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .filter((item) => !/^https?:\/\//i.test(item))
      .filter((item) => item.length < 60);
    return Array.from(new Set(candidates)).slice(0, 8).map((name) => ({ "@type": "Place", name }));
  }

  function timeTo24(value) {
    const match = String(value || "").match(/(\d{1,2})(?::|\.)?(\d{2})?\s*(am|pm)?/i);
    if (!match) return "";
    let hour = Number(match[1]);
    const minute = match[2] || "00";
    const meridiem = (match[3] || "").toLowerCase();
    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
    return `${String(hour).padStart(2, "0")}:${minute}`;
  }

  function openingHoursSpecification(business) {
    const rows = business.openingHours || business.hours || [];
    const entries = Array.isArray(rows) ? rows : Object.entries(rows).map(([label, value]) => ({ label, value }));
    const dayMap = {
      mon: "Monday",
      tue: "Tuesday",
      wed: "Wednesday",
      thu: "Thursday",
      fri: "Friday",
      sat: "Saturday",
      sun: "Sunday"
    };
    return entries.map((row) => {
      const text = typeof row === "string" ? row : `${row.days || row.label || ""}: ${row.hours || row.value || ""}`;
      if (/closed/i.test(text)) return undefined;
      const dayNames = Object.entries(dayMap)
        .filter(([needle]) => new RegExp(`\\b${needle}`, "i").test(text))
        .map(([, day]) => day);
      const times = text.match(/\d{1,2}(?::|\.)?\d{0,2}\s*(?:am|pm)?/gi) || [];
      if (!dayNames.length || times.length < 2) return undefined;
      return {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: dayNames,
        opens: timeTo24(times[0]),
        closes: timeTo24(times[1])
      };
    }).filter(Boolean);
  }

  function serviceCatalog(business) {
    const services = (business.services || []).filter(Boolean);
    if (!services.length) return undefined;
    return {
      "@type": "OfferCatalog",
      name: `${business.name} services`,
      itemListElement: services.map((service) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: service
        }
      }))
    };
  }

  function businessDescription(business) {
    const town = np.displayTown ? np.displayTown(business) : business.location;
    const category = np.normalizeCategory ? np.normalizeCategory(business) : business.category;
    return business.shortDescription || `${business.name} is listed with NP Local Business for ${category || "local services"} in ${town || "the NP area"}.`;
  }

  function businessTitle(business) {
    const town = np.displayTown ? np.displayTown(business) : business.location;
    const category = business.specificCategory || (np.normalizeCategory ? np.normalizeCategory(business) : business.category);
    return [business.name, town, category].filter(Boolean).join(" | ") + " | NP Local Business";
  }

  function renderBusinessSeo(business) {
    const url = absoluteUrl(`business.html?id=${encodeURIComponent(business.id)}`);
    const image = absoluteUrl(business.heroImage || business.logo || site.defaultShareImage);
    const description = businessDescription(business);
    setShare({
      title: businessTitle(business),
      description,
      url,
      image,
      type: "business.business"
    });

    writeJsonLd("business-schema", {
      "@context": "https://schema.org",
      "@graph": [
        orgSchema(),
        breadcrumb([
          { name: "Home", url: `${productionUrl}/` },
          { name: "Businesses", url: absoluteUrl("categories.html") },
          { name: business.name, url }
        ]),
        {
          "@type": schemaTypeForBusiness(business),
          "@id": `${url}#business`,
          name: business.name,
          description,
          url,
          mainEntityOfPage: url,
          image: [business.heroImage, business.logo, ...(business.gallery || [])].filter(Boolean).slice(0, 6).map(absoluteUrl),
          logo: absoluteUrl(business.logo),
          telephone: business.contact?.phone,
          email: business.contact?.email,
          address: postalAddress(business),
          hasMap: business.contact?.googleMapsUrl,
          sameAs: Object.values(business.social || {}).filter(Boolean),
          areaServed: businessAreas(business),
          openingHoursSpecification: openingHoursSpecification(business),
          hasOfferCatalog: serviceCatalog(business)
        }
      ]
    });
  }

  function renderHomeSeo() {
    writeJsonLd("site-schema", {
      "@context": "https://schema.org",
      "@graph": [
        orgSchema(),
        {
          "@type": "WebSite",
          "@id": `${productionUrl}/#website`,
          name: site.brand?.name || "NP Local Business",
          url: `${productionUrl}/`,
          publisher: { "@id": `${productionUrl}/#organization` },
          potentialAction: {
            "@type": "SearchAction",
            target: `${productionUrl}/categories.html?q={search_term_string}`,
            "query-input": "required name=search_term_string"
          }
        }
      ]
    });
  }

  async function renderCollectionSeo(kind) {
    const params = new URLSearchParams(location.search);
    if (params.get("q")) upsertRobots("noindex,follow");
    const businesses = np.loadBusinesses ? await np.loadBusinesses() : [];
    const query = params.get("q") || params.get("location") || "";
    const category = params.get("category") || "";
    const filtered = np.filterBusinesses ? np.filterBusinesses(businesses, query, category) : businesses;
    const url = absoluteUrl(kind === "locations" ? "locations.html" : "categories.html");
    const pageName = kind === "locations" ? "Locations" : "Categories";
    writeJsonLd(`${kind}-schema`, {
      "@context": "https://schema.org",
      "@graph": [
        orgSchema(),
        breadcrumb([
          { name: "Home", url: `${productionUrl}/` },
          { name: pageName, url }
        ]),
        {
          "@type": "CollectionPage",
          "@id": `${url}#collection`,
          name: document.title.replace(" | NP Local Business", ""),
          url,
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: filtered.length,
            itemListElement: filtered.slice(0, 100).map((business, index) => ({
              "@type": "ListItem",
              position: index + 1,
              url: absoluteUrl(`business.html?id=${encodeURIComponent(business.id)}`),
              name: business.name
            }))
          }
        }
      ]
    });
  }

  function renderJoinSeo() {
    writeJsonLd("join-schema", {
      "@context": "https://schema.org",
      "@graph": [
        orgSchema(),
        breadcrumb([
          { name: "Home", url: `${productionUrl}/` },
          { name: "Join", url: absoluteUrl("join.html") }
        ]),
        {
          "@type": "Service",
          "@id": `${absoluteUrl("join.html")}#listing-service`,
          name: "NP Local Business annual directory listing",
          serviceType: "Local business directory listing",
          provider: { "@id": `${productionUrl}/#organization` },
          areaServed: orgSchema().areaServed,
          offers: {
            "@type": "Offer",
            price: "95",
            priceCurrency: "GBP",
            availability: "https://schema.org/InStock",
            url: absoluteUrl("join.html"),
            description: "Annual NP Local Business membership including an SEO-friendly profile built and maintained by NP Local Business."
          }
        }
      ]
    });
  }

  if (page === "home") renderHomeSeo();
  if (page === "categories") renderCollectionSeo("categories");
  if (page === "locations") renderCollectionSeo("locations");
  if (page === "join") renderJoinSeo();
  if (page === "success") upsertRobots("noindex,follow");

  window.NP_SEO = {
    absoluteUrl,
    renderBusinessSeo,
    renderHomeSeo,
    renderCollectionSeo,
    renderJoinSeo
  };
})();

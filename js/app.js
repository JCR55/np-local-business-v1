(function () {
  const site = window.NP_SITE;
  const iconPaths = {
    utensils: '<path d="M6 3v8"/><path d="M10 3v8"/><path d="M8 3v18"/><path d="M17 3v18"/><path d="M14 3c3 2 4 6 3 10"/>',
    tool: '<path d="M14 7 7 14"/><path d="m5 16 3 3"/><path d="m19 5-3 3"/><path d="M14 5h5v5"/><path d="M4 20l4-1 10-10-3-3L5 16Z"/>',
    car: '<path d="M6 17h12"/><path d="M5 17l1-6 2-4h8l2 4 1 6"/><path d="M7 17v2"/><path d="M17 17v2"/><circle cx="8" cy="14" r="1"/><circle cx="16" cy="14" r="1"/>',
    home: '<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-6h4v6"/>',
    heart: '<path d="M20 8c0 6-8 11-8 11S4 14 4 8a4 4 0 0 1 7-2 4 4 0 0 1 9 2Z"/>',
    briefcase: '<path d="M9 6V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1"/><path d="M4 7h16v12H4Z"/><path d="M4 12h16"/><path d="M10 12v2h4v-2"/>',
    shop: '<path d="M4 10h16l-2-6H6Z"/><path d="M6 10v10h12V10"/><path d="M9 20v-5h6v5"/><path d="M4 10c0 2 4 2 4 0 0 2 4 2 4 0 0 2 4 2 4 0 0 2 4 2 4 0"/>',
    search: '<path d="m21 21-5-5"/><circle cx="11" cy="11" r="7"/>',
    pin: '<path d="M12 21s7-5 7-11a7 7 0 0 0-14 0c0 6 7 11 7 11Z"/><circle cx="12" cy="10" r="2"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.78 19.78 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.78 19.78 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.32 1.77.59 2.61a2 2 0 0 1-.45 2.11L8 9.69a16 16 0 0 0 6.31 6.31l1.25-1.25a2 2 0 0 1 2.11-.45c.84.27 1.71.47 2.61.59A2 2 0 0 1 22 16.92Z"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 0 20"/><path d="M12 2a15.3 15.3 0 0 0 0 20"/>',
    mail: '<path d="M4 4h16v16H4Z"/><path d="m22 6-10 7L2 6"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>',
    user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>',
    check: '<path d="m5 12 4 4L19 6"/>'
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function icon(name) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || iconPaths.check}</svg>`;
  }

  async function loadBusinesses() {
    if (window.NP_BUSINESSES) {
      window.NP_BUSINESSES = Array.isArray(window.NP_BUSINESSES) ? window.NP_BUSINESSES : window.NP_BUSINESSES.businesses || [];
      return window.NP_BUSINESSES;
    }
    if (window.NP_BUSINESS_DATA) {
      window.NP_BUSINESSES = Array.isArray(window.NP_BUSINESS_DATA) ? window.NP_BUSINESS_DATA : window.NP_BUSINESS_DATA.businesses || [];
      return window.NP_BUSINESSES;
    }
    const response = await fetch("/data/businesses.json");
    const data = await response.json();
    window.NP_BUSINESSES = data.businesses || [];
    return window.NP_BUSINESSES;
  }

  function categoryCounts(businesses) {
    return businesses.reduce((counts, business) => {
      const category = normalizeCategory(business);
      if (category) counts[category] = (counts[category] || 0) + 1;
      return counts;
    }, {});
  }

  function normalizeCategory(business) {
    const candidate = String(business.category || business.specificCategory || business.subcategory || "").trim();
    if (!candidate) return "";
    const exact = site.categories.find((category) => category.name.toLowerCase() === candidate.toLowerCase());
    if (exact) return exact.name;
    const specific = String(business.specificCategory || "").trim();
    const exactSpecific = site.categories.find((category) => category.name.toLowerCase() === specific.toLowerCase());
    return exactSpecific ? exactSpecific.name : candidate;
  }

  function displayTown(business) {
    const location = String(business.location || "").trim();
    const address = String(business.contact?.address || "");
    const source = `${address} ${location}`;
    const townRules = [
      { town: "Risca", patterns: [/\bRisca\b/i] },
      { town: "Caerleon", patterns: [/\bCaerleon\b/i] },
      { town: "Usk", patterns: [/\bUsk\b/i, /\bLlanbadoc\b/i] },
      { town: "Pontypool", patterns: [/\bPontypool\b/i, /\bNew Inn\b/i, /\bPontnewynydd\b/i, /\bGriffithstown\b/i, /\bGoytre\b/i] },
      { town: "Cwmbran", patterns: [/\bCwmbran\b/i, /\bCroesyceiliog\b/i] },
      { town: "Abergavenny", patterns: [/\bAbergavenny\b/i] },
      { town: "Ponthir", patterns: [/\bPonthir\b/i] },
      { town: "Newport", patterns: [/\bNewport\b/i, /\bMalpas\b/i] }
    ];
    return townRules.find((rule) => rule.patterns.some((pattern) => pattern.test(source)))?.town || location || "NP area";
  }

  function knownTownSearch(query) {
    const needle = String(query || "").trim().toLowerCase();
    const towns = ["abergavenny", "caerleon", "cwmbran", "newport", "np area", "ponthir", "pontypool", "risca", "usk"];
    return towns.includes(needle) ? needle : "";
  }

  function renderHeader() {
    const header = document.querySelector("[data-site-header]");
    if (!header) return;
    const current = location.pathname || "/";
    const logoMarkup = site.brand.logo
      ? `<img class="brand-logo" src="${escapeHtml(site.brand.logo)}" alt="${escapeHtml(site.brand.name)} logo" />`
      : '<span class="brand-mark">NP</span>';
    header.innerHTML = `
      <a class="brand" href="/" aria-label="${site.brand.name} home">
        ${logoMarkup}
      </a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">
        <span></span><span></span><span></span><span class="visually-hidden">Menu</span>
      </button>
      <nav class="site-nav" id="site-nav" aria-label="Primary navigation">
        ${site.nav
          .map((item) => `<a href="${item.href}" ${item.href === current ? "aria-current=\"page\"" : ""}>${item.label}</a>`)
          .join("")}
      </nav>
    `;

    const toggle = header.querySelector(".nav-toggle");
    const nav = header.querySelector(".site-nav");
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.toggleAttribute("data-open", !open);
    });
  }

  function socialLinksMarkup() {
    return (site.social || [])
      .map(
        (item) => {
          const label = escapeHtml(item.label);
          const platform = label.toLowerCase();
          return `
            <a class="site-socials__button site-socials__button--${platform}" href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer" aria-label="Open NP Local Business ${label}">
              <span class="site-socials__icon" aria-hidden="true">${label.charAt(0)}</span>
              <span>${label}</span>
            </a>
          `;
        }
      )
      .join("");
  }

  function renderSiteSocials() {
    const socials = socialLinksMarkup();
    document.querySelectorAll("[data-site-socials]").forEach((container) => {
      container.innerHTML = socials;
    });
  }

  function renderFooter() {
    const footer = document.querySelector("[data-site-footer]");
    if (!footer) return;
    const socials = socialLinksMarkup();
    const logoMarkup = site.brand.logo
      ? `<img class="brand-logo brand-logo--footer" src="${escapeHtml(site.brand.logo)}" alt="${escapeHtml(site.brand.name)} logo" />`
      : '<span class="brand-mark">NP</span>';
    footer.innerHTML = `
      <div>
        <a class="brand brand--footer" href="/">
          ${logoMarkup}
          <span class="brand-text"><strong>${site.brand.name}</strong><small>${site.brand.strapline}</small></span>
        </a>
        <p>Promoting trusted local businesses across the entire NP postcode area.</p>
        ${socials ? `<div class="site-socials" aria-label="NP Local Business social links">${socials}</div>` : ""}
      </div>
      <nav class="footer-nav" aria-label="Footer navigation">
        ${site.nav.map((item) => `<a href="${item.href}">${item.label}</a>`).join("")}
      </nav>
    `;
  }

  function returnPathForCurrentPage() {
    const currentPage = location.pathname || "/";
    if (currentPage === "/categories" && location.search) {
      return `${currentPage}${location.search}`;
    }
    if (currentPage === "/locations") {
      return currentPage;
    }
    return "";
  }

  function businessProfileUrl(id) {
    const params = new URLSearchParams();
    const returnPath = returnPathForCurrentPage();
    if (returnPath) {
      params.set("return", returnPath);
    }
    const query = params.toString();
    return `/${encodeURIComponent(id)}${query ? `?${query}` : ""}`;
  }

  function businessCard(business) {
    const cardImage = business.logo || business.cardImage;
    const hasCardImage = Boolean(cardImage);
    const profileHref = businessProfileUrl(business.id);
    const cardImageAlt =
      cardImage === business.logo
        ? business.imageAlt?.logo || `${business.name} logo.`
        : business.imageAlt?.cardImage || `${business.name} business image.`;
    const mediaClass = hasCardImage ? "business-card__media business-card__media--contain" : "business-card__media business-card__media--placeholder";
    return `
      <article class="business-card">
        <a href="${escapeHtml(profileHref)}" class="${mediaClass}">
          ${
            hasCardImage
              ? `<img src="${escapeHtml(cardImage)}" alt="${escapeHtml(cardImageAlt)}" loading="lazy" />`
              : `<span class="business-card__placeholder-icon">${icon("shop")}</span><strong>${escapeHtml(business.name)}</strong>`
          }
          ${business.verified ? '<span class="verified">Verified</span>' : ""}
        </a>
        <div class="business-card__body">
          <p class="business-card__meta">${escapeHtml(normalizeCategory(business))} · ${escapeHtml(business.postcodeArea)}</p>
          <h3><a href="${escapeHtml(profileHref)}">${escapeHtml(business.name)}</a></h3>
          <p>${escapeHtml(business.shortDescription)}</p>
          <div class="business-card__foot">
            <span>${icon("pin")}${escapeHtml(displayTown(business))}</span>
            <a href="${escapeHtml(profileHref)}">View profile</a>
          </div>
        </div>
      </article>
    `;
  }

  function renderCategoryCards(container, businesses) {
    if (!container) return;
    const counts = categoryCounts(businesses);
    container.innerHTML = site.categories
      .slice()
      .sort((a, b) => {
        const countDifference = (counts[b.name] || 0) - (counts[a.name] || 0);
        return countDifference || a.name.localeCompare(b.name);
      })
      .map(
        (category) => `
          <a class="category-card" href="/categories?category=${encodeURIComponent(category.name)}">
            <span class="category-card__icon">${icon(category.icon)}</span>
            <span class="category-card__count">Explore local options</span>
            <strong>${escapeHtml(category.name)}</strong>
            <span>${escapeHtml(category.description)}</span>
          </a>
        `
      )
      .join("");
  }

  function filterBusinesses(businesses, query, category) {
    const needle = String(query || "").trim().toLowerCase();
    const townNeedle = knownTownSearch(query);
    return businesses.filter((business) => {
      const matchesCategory = !category || normalizeCategory(business) === category;
      if (townNeedle) {
        return matchesCategory && displayTown(business).toLowerCase() === townNeedle;
      }
      const haystack = [
        business.name,
        normalizeCategory(business),
        business.subcategory,
        business.location,
        displayTown(business),
        business.postcodeArea,
        business.contact?.address,
        business.shortDescription,
        business.description,
        ...(business.services || []),
        ...(business.highlights || [])
      ]
        .join(" ")
        .toLowerCase();
      return matchesCategory && (!needle || haystack.includes(needle));
    });
  }

  renderHeader();
  renderFooter();
  renderSiteSocials();

  window.NP = {
    site,
    escapeHtml,
    icon,
    loadBusinesses,
    categoryCounts,
    normalizeCategory,
    displayTown,
    knownTownSearch,
    businessProfileUrl,
    businessCard,
    renderCategoryCards,
    filterBusinesses
  };
})();

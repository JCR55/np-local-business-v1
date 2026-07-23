(async function () {
  const businesses = await window.NP.loadBusinesses();
  const pathSlug = decodeURIComponent(location.pathname.replace(/^\/+|\/+$/g, ""));
  const id = new URLSearchParams(location.search).get("id") || pathSlug || "south-wales-barbeques";
  const business = businesses.find((item) => item.id === id || (item.aliases || []).includes(id)) || businesses[0];
  const root = document.querySelector("[data-profile-root]");
  const phone = business.contact.phone || "";
  const cleanPhone = phone.replace(/\s/g, "");
  const fallbackHero = "assets/images/hero/sugar-loaf-abergavenny-panoramic.png";

  document.title = `${business.name} | NP Local Business`;

  function absoluteUrl(path) {
    if (/^https?:\/\//i.test(String(path || ""))) return path;
    const base = window.NP.site.productionUrl || location.origin || "";
    return `${base.replace(/\/$/, "")}/${String(path || "").replace(/^\//, "")}`;
  }

  function upsertMeta(selector, attribute, value) {
    let meta = document.head.querySelector(selector);
    if (!meta) {
      meta = document.createElement("meta");
      const match = selector.match(/\[(name|property)="([^"]+)"\]/);
      if (match) meta.setAttribute(match[1], match[2]);
      document.head.appendChild(meta);
    }
    meta.setAttribute(attribute, value);
  }

  function upsertCanonical(url) {
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", url);
  }

  function renderSeo() {
    if (window.NP_SEO?.renderBusinessSeo) {
      window.NP_SEO.renderBusinessSeo(business);
      return;
    }
    const description = business.shortDescription || `View ${business.name} on NP Local Business.`;
    const url = absoluteUrl(business.id);
    const image = absoluteUrl(profileImage(business.heroImage || business.logo || fallbackHero));
    document.title = `${business.name} | ${window.NP.normalizeCategory(business)} | NP Local Business`;
    upsertCanonical(url);
    upsertMeta('meta[name="description"]', "content", description);
    upsertMeta('meta[property="og:type"]', "content", "business.business");
    upsertMeta('meta[property="og:title"]', "content", `${business.name} | NP Local Business`);
    upsertMeta('meta[property="og:description"]', "content", description);
    upsertMeta('meta[property="og:url"]', "content", url);
    upsertMeta('meta[property="og:image"]', "content", image);
    upsertMeta('meta[name="twitter:title"]', "content", `${business.name} | NP Local Business`);
    upsertMeta('meta[name="twitter:description"]', "content", description);
    upsertMeta('meta[name="twitter:image"]', "content", image);

    const existingSchema = document.head.querySelector("#business-schema");
    if (existingSchema) existingSchema.remove();
    const schema = document.createElement("script");
    schema.type = "application/ld+json";
    schema.id = "business-schema";
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: business.name,
      description,
      url,
      image,
      telephone: business.contact?.phone || undefined,
      address: business.contact?.address || business.location || undefined,
      areaServed: areaList(),
      sameAs: Object.values(business.social || {}).filter(Boolean)
    });
    document.head.appendChild(schema);
  }

  function isLocalImage(value) {
    return /^assets\//.test(String(value || ""));
  }

  function profileImage(value) {
    if (isLocalImage(value)) return value;
    return fallbackHero;
  }

  function externalAttrs(href) {
    return /^https?:\/\//i.test(String(href || "")) ? ' target="_blank" rel="noopener noreferrer"' : "";
  }

  function hasClientWebsite() {
    return /^https?:\/\//i.test(String(business.contact.website || ""));
  }

  function areaList() {
    const base = [business.location, business.postcodeArea, ...(business.areasCovered || [])]
      .filter(Boolean)
      .map((item) => String(item).trim())
      .filter(Boolean);
    const fromHighlights = (business.highlights || [])
      .filter((item) => /newport|torfaen|monmouthshire|caerphilly|cwmbran|pontypool|risca|usk|caerleon|abergavenny/i.test(item));
    return Array.from(new Set([...base, ...fromHighlights])).slice(0, 6);
  }

  function serviceIcon(service) {
    const text = String(service || "").toLowerCase();
    if (/repair|service|maintenance|install|fitting/.test(text)) return "tool";
    if (/delivery|collection|car|vehicle|mot|van/.test(text)) return "car";
    if (/home|garden|roof|door|carpet|curtain|blind|building/.test(text)) return "home";
    if (/health|beauty|mobility|massage|celebr/.test(text)) return "heart";
    if (/shop|retail|supply|takeaway|food/.test(text)) return "shop";
    return "check";
  }

  function trustBadges() {
    const town = window.NP.displayTown ? window.NP.displayTown(business) : business.location;
    return [
      { icon: "shield", label: "Trusted local business" },
      { icon: "user", label: "Experienced & reliable" },
      { icon: "pin", label: `Serving ${town || "the NP area"}` }
    ];
  }

  function actionButtons(context = "hero") {
    const callText = phone ? `Call ${phone}` : "Call business";
    return `
      ${phone ? `<a class="button button--primary" href="tel:${window.NP.escapeHtml(cleanPhone)}">${window.NP.icon("phone")}<span>${window.NP.escapeHtml(callText)}</span></a>` : ""}
      ${hasClientWebsite() ? `<a class="button ${context === "hero" ? "button--light" : "button--secondary"}" href="${window.NP.escapeHtml(business.contact.website)}"${externalAttrs(business.contact.website)}>${window.NP.icon("globe")}<span>Visit website</span></a>` : ""}
    `;
  }

  function profileReturnLink() {
    const rawReturn = new URLSearchParams(location.search).get("return");
    if (!rawReturn) return "";
    const href = rawReturn.trim();
    const page = href.split("?")[0];
    if (!["/categories", "/locations"].includes(page)) return "";

    const query = href.includes("?") ? href.slice(href.indexOf("?") + 1) : "";
    const returnParams = new URLSearchParams(query);
    const locationName = returnParams.get("location");
    const categoryName = returnParams.get("category");
    const searchQuery = returnParams.get("q");
    let label = "Back to results";
    if (locationName) {
      label = `Back to ${locationName} results`;
    } else if (categoryName) {
      label = `Back to ${categoryName}`;
    } else if (searchQuery) {
      label = "Back to search results";
    } else if (page === "/locations") {
      label = "Back to locations";
    }

    return `<a class="profile-return-link" href="${window.NP.escapeHtml(href)}"><span aria-hidden="true">&larr;</span>${window.NP.escapeHtml(label)}</a>`;
  }

  function imageAlt(kind, image, fallback = "") {
    if (kind === "gallery") {
      return business.imageAlt?.gallery?.[image] || fallback;
    }
    return business.imageAlt?.[kind] || fallback;
  }

  function galleryCaption(image) {
    return business.galleryCaptions?.[image] || "";
  }

  function galleryThumb(image, classes = "") {
    const alt = imageAlt("gallery", image, `${business.name} gallery image.`);
    const caption = galleryCaption(image);
    const link = business.galleryLinks?.[image];
    const inner = `
      <img src="${window.NP.escapeHtml(image)}" alt="${window.NP.escapeHtml(alt)}" loading="lazy" decoding="async" />
      ${caption ? `<span class="gallery-thumb__caption">${window.NP.escapeHtml(caption)}</span>` : ""}
    `;
    if (link?.href) {
      return `
        <a class="gallery-thumb ${classes}" href="${window.NP.escapeHtml(link.href)}"${externalAttrs(link.href)} aria-label="${window.NP.escapeHtml(link.label || caption || "Visit website")}">
          ${inner}
        </a>
      `;
    }
    return `
      <button class="gallery-thumb ${classes}" type="button" data-gallery-image="${window.NP.escapeHtml(image)}" data-gallery-alt="${window.NP.escapeHtml(alt)}">
        ${inner}
      </button>
    `;
  }

  function renderGallery(items) {
    const uniqueGalleryItems = Array.from(new Set((items || []).filter(isLocalImage)));
    if (!uniqueGalleryItems.length) return "";
    const [featureImage, ...supportingImages] = uniqueGalleryItems;
    const isSingleImage = uniqueGalleryItems.length === 1;
    const useEvenGrid = business.galleryLayout === "grid" && uniqueGalleryItems.length > 1;
    return `
      <section class="profile-gallery-section" aria-labelledby="profile-gallery-title">
        <div class="profile-gallery-section__inner">
          <div>
            <p class="brand-kicker">A closer look</p>
            <h2 id="profile-gallery-title">An overview of what we do</h2>
            <p class="profile-gallery-section__copy">A snapshot of ${window.NP.escapeHtml(business.name)}, our work and the details customers can expect.</p>
          </div>
          ${useEvenGrid ? `
          <div class="gallery gallery--even" aria-label="${window.NP.escapeHtml(business.name)} gallery images">
            ${uniqueGalleryItems.map((image) => galleryThumb(image)).join("")}
          </div>` : `
          <div class="gallery gallery--feature${isSingleImage ? " gallery--single-thumb" : ""}" aria-label="${window.NP.escapeHtml(business.name)} gallery images">
            ${galleryThumb(featureImage, isSingleImage ? "" : "gallery-thumb--feature")}
            ${supportingImages.length ? `<div class="gallery__supporting">
              ${supportingImages
              .map((image) => galleryThumb(image))
              .join("")}
            </div>` : ""}
          </div>`}
        </div>
      </section>
    `;
  }

  function renderParagraphs(text) {
    return String(text || "")
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .map((paragraph) => `<p>${window.NP.escapeHtml(paragraph).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</p>`)
      .join("");
  }

  function renderServices(items) {
    return `
      <div class="service-list">
        ${items
          .map(
            (service) => `
              <a class="service-item" href="#contact-details">
                <span class="service-item__icon">${window.NP.icon(serviceIcon(service))}</span>
                <span class="service-item__text">
                  <strong>${window.NP.escapeHtml(service)}</strong>
                </span>
              </a>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderContact() {
    const socialLabel = (label) => {
      const labels = {
        facebook: "Facebook",
        instagram: "Instagram",
        tiktok: "TikTok",
        linkedin: "LinkedIn",
        youtube: "YouTube",
        x: "X"
      };
      return labels[label] || label;
    };
    const emailLink = business.contact.email
      ? `<a href="mailto:${window.NP.escapeHtml(business.contact.email)}">${window.NP.icon("mail")}<span>Email</span>${window.NP.escapeHtml(business.contact.email)}</a>`
      : "";
    const secondaryPhone = business.contact.secondaryPhone || business.contact.mobile || "";
    const secondaryPhoneLink = secondaryPhone
      ? `<a href="tel:${window.NP.escapeHtml(String(secondaryPhone).replace(/\s/g, ""))}">${window.NP.icon("phone")}<span>Mobile</span>${window.NP.escapeHtml(secondaryPhone)}</a>`
      : "";
    const socialLinks = Object.entries(business.social || {})
      .filter(([, href]) => href)
      .map(
        ([label, href]) =>
          `<a class="social-button" href="${window.NP.escapeHtml(href)}"${externalAttrs(href)}>${window.NP.escapeHtml(socialLabel(label))}</a>`
      )
      .join("");
    const mapLink = business.contact.googleMapsUrl
      ? `<a href="${window.NP.escapeHtml(business.contact.googleMapsUrl)}"${externalAttrs(business.contact.googleMapsUrl)}>${window.NP.icon("pin")}<span>Map</span>Open in Google Maps</a>`
      : "";
    const address = String(business.contact.address || "").startsWith("http")
      ? `${business.location || "NP area"}${business.postcodeArea ? `, ${business.postcodeArea}` : ""}`
      : business.contact.address;
    const areas = areaList();
    const openingHours = business.openingHours || business.hours || [];
    const openingHourItems = Array.isArray(openingHours)
      ? openingHours
      : Object.entries(openingHours).map(([label, value]) => ({ label, value }));
    const openingHourRows = openingHourItems
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.days && item?.hours) return `${item.days}: ${item.hours}`;
        if (item?.label && item?.value) return `${item.label}: ${item.value}`;
        return "";
      })
      .filter(Boolean);
    const onCallHourRows = (business.onCallHours || [])
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.days && item?.hours) return `${item.days}: ${item.hours}`;
        if (item?.label && item?.value) return `${item.label}: ${item.value}`;
        return "";
      })
      .filter(Boolean);

    return `
      <aside class="contact-card" id="contact-details">
        <p class="brand-kicker">Contact</p>
        <h2>Business details</h2>
        <p class="contact-card__intro">Get in touch with ${window.NP.escapeHtml(business.name)} today using the details below.</p>
        <div class="contact-card__actions">
          ${actionButtons("contact")}
        </div>
        <div class="contact-list">
          ${emailLink}
          ${secondaryPhoneLink}
          <p>
            ${window.NP.icon("pin")}
            <span>Location</span>
            ${window.NP.escapeHtml(address)}
          </p>
          ${mapLink}
        </div>
        ${openingHourRows.length ? `<div class="contact-block"><span>Opening hours</span>${openingHourRows.map((item) => `<p>${window.NP.escapeHtml(item)}</p>`).join("")}</div>` : ""}
        ${onCallHourRows.length ? `<div class="contact-block"><span>Engineer on call</span>${onCallHourRows.map((item) => `<p>${window.NP.escapeHtml(item)}</p>`).join("")}</div>` : ""}
        ${business.paymentNote ? `<div class="contact-block contact-block--notice"><span>Payment</span><p>${window.NP.escapeHtml(business.paymentNote)}</p></div>` : ""}
        ${areas.length ? `<div class="contact-block"><span>Areas covered</span><div class="area-tags">${areas.map((item) => `<em>${window.NP.escapeHtml(item)}</em>`).join("")}</div></div>` : ""}
        ${socialLinks ? `<div class="social-links">${socialLinks}</div>` : ""}
      </aside>
    `;
  }

  function renderFooterCta() {
    return `
      <section class="profile-footer-cta" aria-label="Contact ${window.NP.escapeHtml(business.name)}">
        <div class="profile-footer-cta__icon">${window.NP.icon("shield")}</div>
        <div>
          <h2>Local experts you can rely on</h2>
          <p>Speak to ${window.NP.escapeHtml(business.name)} directly for helpful local advice, clear information and a service backed by their NP Local Business profile.</p>
        </div>
        <div class="profile-footer-cta__actions">
          ${actionButtons("contact")}
        </div>
      </section>
    `;
  }

  renderSeo();

  root.innerHTML = `
    <section class="profile-hero" data-business-id="${window.NP.escapeHtml(business.id)}">
      <div class="profile-hero__media">
        <img src="${window.NP.escapeHtml(profileImage(business.heroImage))}" alt="${window.NP.escapeHtml(imageAlt("heroImage", business.heroImage, ""))}" style="--hero-position: ${window.NP.escapeHtml(business.heroPosition || "center")}" />
        <div class="profile-hero__overlay"></div>
      </div>
      <div class="profile-hero__content">
        ${profileReturnLink()}
        ${business.logo && isLocalImage(business.logo) ? `<img class="profile-logo" src="${window.NP.escapeHtml(business.logo)}" alt="${window.NP.escapeHtml(imageAlt("logo", business.logo, `${business.name} logo.`))}" />` : ""}
        <p class="brand-kicker">${window.NP.escapeHtml(window.NP.normalizeCategory(business))} / ${window.NP.escapeHtml(business.postcodeArea)}</p>
        <h1>${window.NP.escapeHtml(business.name)}</h1>
        <p>${window.NP.escapeHtml(business.shortDescription)}</p>
        <div class="profile-actions">
          ${actionButtons("hero")}
        </div>
        <div class="profile-trust-badges">
          ${trustBadges().map((badge) => `<span>${window.NP.icon(badge.icon)}${window.NP.escapeHtml(badge.label)}</span>`).join("")}
        </div>
      </div>
    </section>
    <section class="profile-shell">
      <div class="profile-main">
        <article class="profile-section">
          <p class="brand-kicker">About</p>
          <h2>About ${window.NP.escapeHtml(business.name)}</h2>
          <div class="profile-copy">${renderParagraphs(business.description)}</div>
        </article>
        <article class="profile-section profile-section--services">
          <p class="brand-kicker">Services</p>
          <h2>Services</h2>
          ${renderServices(business.services)}
        </article>
      </div>
      ${renderContact()}
    </section>
    ${renderGallery(business.gallery)}
    ${renderFooterCta()}
    <div class="gallery-lightbox" data-gallery-lightbox hidden>
      <button class="gallery-lightbox__close" type="button" data-gallery-close aria-label="Close gallery image">Close</button>
      <img src="" alt="" data-gallery-lightbox-image />
    </div>
  `;

  document.querySelectorAll("[data-gallery-image]").forEach((button) => {
    const thumbImage = button.querySelector("img");
    const tuneGalleryFit = () => {
      if (!thumbImage?.naturalWidth || !thumbImage?.naturalHeight) return;
      const ratio = thumbImage.naturalWidth / thumbImage.naturalHeight;
      if (ratio > 2.1 || ratio < 0.62) {
        button.classList.add("gallery-thumb--contain");
      }
    };
    if (thumbImage?.complete) {
      tuneGalleryFit();
    } else {
      thumbImage?.addEventListener("load", tuneGalleryFit, { once: true });
    }

    button.addEventListener("click", () => {
      const lightbox = document.querySelector("[data-gallery-lightbox]");
      const image = document.querySelector("[data-gallery-lightbox-image]");
      const ratio = thumbImage?.naturalWidth && thumbImage?.naturalHeight
        ? thumbImage.naturalWidth / thumbImage.naturalHeight
        : 1;
      const isBadgeLike = ratio > 2.1 || ratio < 0.62 || Math.max(thumbImage?.naturalWidth || 0, thumbImage?.naturalHeight || 0) < 700;
      image.src = button.dataset.galleryImage;
      image.alt = button.dataset.galleryAlt || `${business.name} gallery image.`;
      image.classList.toggle("gallery-lightbox__image--badge", isBadgeLike);
      image.classList.toggle("gallery-lightbox__image--photo", !isBadgeLike);
      lightbox.hidden = false;
      document.body.setAttribute("data-lightbox-open", "true");
    });
  });

  document.querySelector("[data-gallery-close]")?.addEventListener("click", () => {
    const lightbox = document.querySelector("[data-gallery-lightbox]");
    lightbox.hidden = true;
    document.body.removeAttribute("data-lightbox-open");
  });
})();

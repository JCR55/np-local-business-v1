(async function () {
  const businesses = await window.NP.loadBusinesses();
  document.querySelector("[data-hero-copy]").textContent = window.NP.site.hero.copy;
  window.NP.renderCategoryCards(document.querySelector("[data-category-grid]"), businesses);

  const stats = document.querySelector("[data-hero-stats]");
  stats.innerHTML = `
    <span><strong>Trusted</strong> local businesses</span>
    <span><strong>Curated</strong> local categories</span>
    <span><strong>NP</strong> postcode area</span>
  `;

  document.querySelector("[data-featured-businesses]").innerHTML = businesses
    .filter((business) => business.featured)
    .map(window.NP.businessCard)
    .join("");
})();

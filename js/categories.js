(async function () {
  const businesses = await window.NP.loadBusinesses();
  const params = new URLSearchParams(location.search);
  const query = params.get("q") || "";
  const category = params.get("category") || "";
  const locationFilter = params.get("location") || "";
  const searchInput = document.querySelector("[data-search-form] input");
  const results = document.querySelector("[data-search-results]");

  if (searchInput) searchInput.value = query || locationFilter;
  const categoryGrid = document.querySelector("[data-category-grid]");
  const hasActiveSearch = Boolean(query || category || locationFilter);
  if (categoryGrid) {
    if (hasActiveSearch) {
      categoryGrid.hidden = true;
    } else {
      window.NP.renderCategoryCards(categoryGrid, businesses);
    }
  }

  const filtered = window.NP.filterBusinesses(businesses, locationFilter || query, category);
  const title = category || query || locationFilter ? "Matching businesses" : "All listed businesses";
  results.innerHTML = `
    <div class="results-heading">
      <h2>${window.NP.escapeHtml(title)}</h2>
      <span>${filtered.length} result${filtered.length === 1 ? "" : "s"}</span>
    </div>
    <div class="business-grid">${filtered.map(window.NP.businessCard).join("")}</div>
  `;
  if (hasActiveSearch) {
    requestAnimationFrame(() => {
      results.scrollIntoView({ block: "start" });
    });
  }
})();

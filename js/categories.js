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

  if (!hasActiveSearch) {
    results.innerHTML = `
      <section class="directory-prompt" aria-label="Browse NP Local Business">
        <p class="brand-kicker">Built to grow</p>
        <h2>Choose a category to view matching businesses.</h2>
        <p>As NP Local Business grows, this page stays simple: start with a sector, search by service, or browse by town to see the most relevant local profiles.</p>
      </section>
    `;
    return;
  }

  const filtered = window.NP.filterBusinesses(businesses, locationFilter || query, category);
  const title = category || query || locationFilter ? "Matching businesses" : "All listed businesses";
  results.innerHTML = `
    <div class="results-heading">
      <h2>${window.NP.escapeHtml(title)}</h2>
      <span>${filtered.length} result${filtered.length === 1 ? "" : "s"}</span>
    </div>
    ${
      filtered.length
        ? `<div class="business-grid">${filtered.map(window.NP.businessCard).join("")}</div>`
        : `<div class="directory-prompt directory-prompt--empty"><h2>No exact matches yet.</h2><p>Try a wider search term, town name or category.</p></div>`
    }
  `;
  if (hasActiveSearch) {
    requestAnimationFrame(() => {
      results.scrollIntoView({ block: "start" });
    });
  }
})();

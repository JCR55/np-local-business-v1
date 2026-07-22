(async function () {
  const businesses = await window.NP.loadBusinesses();

  const byLocation = businesses.reduce((map, business) => {
    const location = window.NP.displayTown(business);
    map[location] = map[location] || [];
    map[location].push(business);
    return map;
  }, {});

  const locations = Object.keys(byLocation).sort((a, b) => {
    if (a === "NP area") return 1;
    if (b === "NP area") return -1;
    return byLocation[b].length - byLocation[a].length || a.localeCompare(b);
  });

  document.querySelector("[data-location-grid]").innerHTML = locations
    .map((location) => {
      const items = byLocation[location].sort((a, b) => a.name.localeCompare(b.name));
      return `
        <article class="location-card">
          <p class="brand-kicker">NP local area</p>
          <h2>${window.NP.escapeHtml(location)}</h2>
          <p>Trusted local businesses in and around ${window.NP.escapeHtml(location)}.</p>
          <ul class="location-card__businesses">
            ${items
              .slice(0, 4)
              .map((business) => `<li><a href="${window.NP.escapeHtml(window.NP.businessProfileUrl(business.id))}">${window.NP.escapeHtml(business.name)}</a></li>`)
              .join("")}
          </ul>
          <a class="button button--secondary" href="categories.html?location=${encodeURIComponent(location)}">View businesses</a>
        </article>
      `;
    })
    .join("");
})();

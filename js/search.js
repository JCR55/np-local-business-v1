(function () {
  document.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-search-form]");
    if (!form) return;
    event.preventDefault();
    const value = new FormData(form).get("q") || "";
    window.location.href = `categories.html?q=${encodeURIComponent(value)}`;
  });
})();

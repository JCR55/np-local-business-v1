(function () {
  // Google Analytics 4, gated behind the site's cookie-consent banner
  // (js/cookie-consent.js). gtag.js is only requested, and only ever sends a
  // hit, once the visitor has accepted — never on page load, never on decline.
  var GA_MEASUREMENT_ID = "G-N2S5RPP5KZ";
  var loaded = false;

  function loadGtag() {
    if (loaded) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_MEASUREMENT_ID;
    document.head.appendChild(script);
    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID);
  }

  // Covers the case where cookie-consent.js already resolved consent (and
  // fired "npcookieconsent") before this script loaded.
  if (window.npCookieConsent === "accepted") {
    loadGtag();
  }

  // Covers the case where consent is decided (banner click, or a stored
  // choice read on a later page) after this script has already loaded.
  document.addEventListener("npcookieconsent", function (event) {
    if (event.detail === "accepted") loadGtag();
  });
})();

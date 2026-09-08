(function () {
  var STORAGE_KEY = "np_cookie_consent";
  var CONSENT_DURATION_MS = 365 * 24 * 60 * 60 * 1000;

  function readConsent() {
    var raw;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      return null;
    }
    if (!raw) return null;
    try {
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.choice || !parsed.expires) return null;
      if (Date.now() > parsed.expires) return null;
      return parsed.choice;
    } catch (err) {
      return null;
    }
  }

  function storeConsent(choice) {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ choice: choice, expires: Date.now() + CONSENT_DURATION_MS })
      );
    } catch (err) {
      // localStorage unavailable (e.g. private browsing) - consent still applies to this page view.
    }
    window.npCookieConsent = choice;
  }

  function removeBanner(banner) {
    if (banner && banner.parentNode) {
      banner.parentNode.removeChild(banner);
    }
  }

  function showBanner() {
    var banner = document.createElement("div");
    banner.className = "cookie-consent-banner";
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-label", "Cookie consent");
    banner.innerHTML =
      '<p>We use only essential storage to run this site — no analytics or marketing cookies are set. See our <a href="/cookie-policy">Cookie Policy</a>.</p>' +
      '<div class="cookie-consent-banner__actions">' +
      '<button type="button" class="button button--light" data-cookie-consent="decline">Decline</button>' +
      '<button type="button" class="button button--primary" data-cookie-consent="accept">Accept</button>' +
      "</div>";

    banner.addEventListener("click", function (event) {
      var target = event.target.closest("[data-cookie-consent]");
      if (!target) return;
      var choice = target.getAttribute("data-cookie-consent") === "accept" ? "accepted" : "declined";
      storeConsent(choice);
      removeBanner(banner);
    });

    document.body.appendChild(banner);
  }

  var existing = readConsent();
  if (existing) {
    window.npCookieConsent = existing;
    return;
  }

  if (document.body) {
    showBanner();
  } else {
    document.addEventListener("DOMContentLoaded", showBanner);
  }
})();

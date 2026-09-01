// Pre-renders business profile pages so search engines see real content
// instead of an empty <main data-profile-root>. Boots a throwaway static
// file server, loads each business page in jsdom with scripts enabled
// (mirroring the real /_redirects clean-URL rewrite so the site's own
// js/app.js + js/seo.js + js/profile.js run exactly as they would in a
// browser), then splices the rendered header/main/footer back into the
// static HTML file on disk. Everything else in the file — meta tags,
// canonical, the static JSON-LD schema, CSS/JS links — is left untouched.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function loadBusinesses() {
  const data = JSON.parse(fs.readFileSync(path.join(root, "data", "businesses.json"), "utf8"));
  return data.businesses || [];
}

function startServer(businessIds) {
  const idSet = new Set(businessIds);
  const server = http.createServer((request, response) => {
    const parsed = new URL(request.url || "/", "http://localhost");
    let relative = decodeURIComponent(parsed.pathname).replace(/^\/+/, "");
    if (relative === "") relative = "index.html";
    // Mirror the production _redirects clean-URL rewrite: /<id> -> /<id>.html,
    // keeping the URL (and therefore location.pathname) as the bare slug.
    if (!path.extname(relative) && !relative.includes("/") && idSet.has(relative)) {
      relative = `${relative}.html`;
    }
    const filePath = path.resolve(root, relative);
    if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    });
    fs.createReadStream(filePath).pipe(response);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function waitForRender(window, { timeoutMs = 10000, intervalMs = 25 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const root = window.document.querySelector("[data-profile-root]");
    if (root && root.querySelector("h1")) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error("Timed out waiting for [data-profile-root] to render an <h1>");
}

function spliceContainer(html, tagName, dataAttr, innerHtml) {
  const openRe = new RegExp(`<${tagName}\\b[^>]*\\b${dataAttr}\\b[^>]*>`);
  const openMatch = openRe.exec(html);
  if (!openMatch) {
    throw new Error(`Could not find <${tagName} ${dataAttr}> container to splice into`);
  }
  const contentStart = openMatch.index + openMatch[0].length;

  // Find the matching closing tag by tracking nesting depth, rather than a
  // simple non-greedy regex up to the next "</tagName>": several containers
  // (e.g. the featured-businesses grid) hold same-tag descendants (nested
  // <div>s inside each card), and a naive regex would stop at the first
  // nested closing tag instead of the container's own, truncating the
  // splice and leaving stale content behind it.
  const tagRe = new RegExp(`<${tagName}\\b[^>]*>|</${tagName}>`, "g");
  tagRe.lastIndex = contentStart;
  let depth = 1;
  let match;
  while ((match = tagRe.exec(html))) {
    if (match[0].startsWith("</")) {
      depth -= 1;
      if (depth === 0) {
        return html.slice(0, contentStart) + innerHtml + match[0] + html.slice(match.index + match[0].length);
      }
    } else {
      depth += 1;
    }
  }
  throw new Error(`Could not find closing </${tagName}> for [${dataAttr}] container`);
}

function emptyContainers(html, containers) {
  let result = html;
  for (const [tagName, dataAttr] of containers) {
    result = spliceContainer(result, tagName, dataAttr, "");
  }
  return result;
}

function withFetchPolyfill(window) {
  // jsdom doesn't implement fetch; the site's own js/app.js relies on it to
  // load data/businesses.json, so polyfill it against Node's built-in
  // fetch, resolving relative URLs against the page location.
  window.fetch = (input, init) => fetch(new URL(input, window.location.href).href, init);
}

async function waitForSelectorContent(window, selectors, { timeoutMs = 10000, intervalMs = 25 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const allReady = selectors.every((selector) => {
      const el = window.document.querySelector(selector);
      return el && el.innerHTML.trim().length > 0;
    });
    if (allReady) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out waiting for content in: ${selectors.join(", ")}`);
}

const BUSINESS_CONTAINERS = [
  ["header", "data-site-header"],
  ["main", "data-profile-root"],
  ["footer", "data-site-footer"],
];

async function prerenderBusiness(id, baseUrl) {
  const filePath = path.join(root, `${id}.html`);
  const original = fs.readFileSync(filePath, "utf8");
  const usesCrlf = original.includes("\r\n");

  // Reset the containers to empty on disk before rendering. The local
  // server reads fresh from disk on every request, so without this an
  // already-prerendered page already has content in [data-profile-root]
  // before the script even starts: waitForRender's "does it have an <h1>
  // yet" check would pass instantly against that stale content instead of
  // waiting for the real fetch-and-render to finish, so re-running the
  // script wouldn't pick up data changes.
  const empty = emptyContainers(original, BUSINESS_CONTAINERS);
  fs.writeFileSync(filePath, empty);

  try {
    const pageUrl = `${baseUrl}/${encodeURIComponent(id)}`;
    const dom = await JSDOM.fromURL(pageUrl, {
      runScripts: "dangerously",
      resources: "usable",
      beforeParse: withFetchPolyfill,
    });

    try {
      await waitForRender(dom.window);

      const header = dom.window.document.querySelector("[data-site-header]");
      const footer = dom.window.document.querySelector("[data-site-footer]");
      const profileRoot = dom.window.document.querySelector("[data-profile-root]");
      if (!header || !footer || !profileRoot) {
        throw new Error("Missing one of [data-site-header] / [data-site-footer] / [data-profile-root]");
      }

      let html = spliceContainer(empty, "header", "data-site-header", header.innerHTML);
      html = spliceContainer(html, "main", "data-profile-root", profileRoot.innerHTML);
      html = spliceContainer(html, "footer", "data-site-footer", footer.innerHTML);
      // jsdom serializes innerHTML with bare "\n"; normalize the whole file back
      // to the original file's line endings so the diff doesn't mix CRLF/LF.
      if (usesCrlf) html = html.replace(/\r?\n/g, "\r\n");
      fs.writeFileSync(filePath, html);
    } finally {
      dom.window.close();
    }
  } catch (error) {
    // Don't leave the file emptied out on disk if rendering failed partway.
    fs.writeFileSync(filePath, original);
    throw error;
  }
}

// Listing-style pages (homepage, categories, locations) don't have one
// single root container — they have several independent data-* slots
// (header, footer, and page-specific grids) that app.js fills in after
// fetching businesses.json. Each entry names the file, the selectors to
// wait on before reading the DOM back out, and the [tag, data-attr] pairs
// to splice into the static HTML.
const LISTING_PAGES = [
  {
    file: "index.html",
    waitFor: ["[data-category-grid]", "[data-featured-businesses]"],
    containers: [
      ["header", "data-site-header"],
      ["p", "data-hero-copy"],
      ["div", "data-hero-stats"],
      ["div", "data-category-grid"],
      ["div", "data-featured-businesses"],
      ["footer", "data-site-footer"],
    ],
  },
  {
    file: "categories.html",
    waitFor: ["[data-category-grid]"],
    containers: [
      ["header", "data-site-header"],
      ["div", "data-category-grid"],
      ["footer", "data-site-footer"],
    ],
  },
  {
    file: "locations.html",
    waitFor: ["[data-location-grid]"],
    containers: [
      ["header", "data-site-header"],
      ["div", "data-location-grid"],
      ["footer", "data-site-footer"],
    ],
  },
  {
    file: "join.html",
    // join.html's form body is already static; only header/footer are
    // JS-rendered on this page.
    waitFor: ["[data-site-header]"],
    containers: [
      ["header", "data-site-header"],
      ["footer", "data-site-footer"],
    ],
  },
];

async function prerenderListingPage({ file, waitFor, containers }, baseUrl) {
  const filePath = path.join(root, file);
  const original = fs.readFileSync(filePath, "utf8");
  const usesCrlf = original.includes("\r\n");

  // See prerenderBusiness: reset containers to empty on disk first so an
  // already-prerendered page still gives waitForSelectorContent a genuine
  // empty -> populated transition to wait on.
  const empty = emptyContainers(original, containers);
  fs.writeFileSync(filePath, empty);

  try {
    const pageUrl = `${baseUrl}/${file}`;
    const dom = await JSDOM.fromURL(pageUrl, {
      runScripts: "dangerously",
      resources: "usable",
      beforeParse: withFetchPolyfill,
    });

    try {
      await waitForSelectorContent(dom.window, waitFor);

      let html = empty;
      for (const [tag, dataAttr] of containers) {
        const el = dom.window.document.querySelector(`[${dataAttr}]`);
        if (!el) throw new Error(`Missing [${dataAttr}] in rendered DOM`);
        html = spliceContainer(html, tag, dataAttr, el.innerHTML);
      }
      if (usesCrlf) html = html.replace(/\r?\n/g, "\r\n");
      fs.writeFileSync(filePath, html);
    } finally {
      dom.window.close();
    }
  } catch (error) {
    fs.writeFileSync(filePath, original);
    throw error;
  }
}

async function main() {
  const businesses = loadBusinesses();
  const ids = businesses.map((business) => business.id);
  const server = await startServer(ids);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  let failures = 0;
  for (const id of ids) {
    try {
      await prerenderBusiness(id, baseUrl);
      console.log(`ok   ${id}`);
    } catch (error) {
      failures += 1;
      console.error(`FAIL ${id}: ${error.message}`);
    }
  }

  for (const page of LISTING_PAGES) {
    try {
      await prerenderListingPage(page, baseUrl);
      console.log(`ok   ${page.file}`);
    } catch (error) {
      failures += 1;
      console.error(`FAIL ${page.file}: ${error.message}`);
    }
  }

  await new Promise((resolve) => server.close(resolve));

  const total = ids.length + LISTING_PAGES.length;
  console.log(`\nPre-rendered ${total - failures}/${total} pages.`);
  if (failures > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

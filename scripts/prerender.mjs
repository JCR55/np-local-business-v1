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
  const re = new RegExp(`(<${tagName}\\b[^>]*\\b${dataAttr}\\b[^>]*>)([\\s\\S]*?)(</${tagName}>)`);
  if (!re.test(html)) {
    throw new Error(`Could not find <${tagName} ${dataAttr}> container to splice into`);
  }
  return html.replace(re, (_match, open, _inner, close) => `${open}${innerHtml}${close}`);
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

async function prerenderBusiness(id, baseUrl) {
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

    const filePath = path.join(root, `${id}.html`);
    const original = fs.readFileSync(filePath, "utf8");
    const usesCrlf = original.includes("\r\n");
    let html = spliceContainer(original, "header", "data-site-header", header.innerHTML);
    html = spliceContainer(html, "main", "data-profile-root", profileRoot.innerHTML);
    html = spliceContainer(html, "footer", "data-site-footer", footer.innerHTML);
    // jsdom serializes innerHTML with bare "\n"; normalize the whole file back
    // to the original file's line endings so the diff doesn't mix CRLF/LF.
    if (usesCrlf) html = html.replace(/\r?\n/g, "\r\n");
    fs.writeFileSync(filePath, html);
  } finally {
    dom.window.close();
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
  const pageUrl = `${baseUrl}/${file}`;
  const dom = await JSDOM.fromURL(pageUrl, {
    runScripts: "dangerously",
    resources: "usable",
    beforeParse: withFetchPolyfill,
  });

  try {
    await waitForSelectorContent(dom.window, waitFor);

    const filePath = path.join(root, file);
    const original = fs.readFileSync(filePath, "utf8");
    const usesCrlf = original.includes("\r\n");
    let html = original;
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

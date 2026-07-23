import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const businessData = JSON.parse(fs.readFileSync(path.join(root, "data", "businesses.json"), "utf8"));
const businessSlugs = new Set(
  (businessData.businesses || []).flatMap((business) => [business.id, ...(business.aliases || [])])
);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function resolveRequest(url = "/") {
  const parsed = new URL(url, "http://localhost");
  const pathname = decodeURIComponent(parsed.pathname || "/");
  const cleanPages = new Map([
    ["/categories", "categories.html"],
    ["/locations", "locations.html"],
    ["/join", "join.html"],
    ["/success", "success.html"],
    ["/404", "404.html"],
  ]);
  let relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  if (cleanPages.has(pathname)) relative = cleanPages.get(pathname);
  if (!path.extname(relative) && !relative.includes("/") && businessSlugs.has(relative)) {
    relative = "business.html";
  }
  const filePath = path.resolve(root, relative);
  if (!filePath.startsWith(root)) return null;
  return filePath;
}

http
  .createServer((request, response) => {
    const parsed = new URL(request.url || "/", "http://localhost");
    const legacyPages = new Map([
      ["/index.html", "/"],
      ["/categories.html", "/categories"],
      ["/locations.html", "/locations"],
      ["/join.html", "/join"],
      ["/success.html", "/success"],
      ["/404.html", "/404"],
    ]);
    if (parsed.pathname === "/business.html" && parsed.searchParams.get("id")) {
      const id = parsed.searchParams.get("id");
      const returnPath = parsed.searchParams.get("return");
      response.writeHead(301, { Location: `/${encodeURIComponent(id)}${returnPath ? `?return=${encodeURIComponent(returnPath)}` : ""}` });
      response.end();
      return;
    }
    if (legacyPages.has(parsed.pathname)) {
      response.writeHead(301, { Location: legacyPages.get(parsed.pathname) });
      response.end();
      return;
    }
    const filePath = resolveRequest(request.url);
    if (!filePath) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const finalPath = fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()
      ? path.join(filePath, "index.html")
      : filePath;

    if (!fs.existsSync(finalPath)) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": types[path.extname(finalPath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    fs.createReadStream(finalPath).pipe(response);
  })
  .listen(port, () => {
    console.log(`NP Local Business preview running at http://localhost:${port}/`);
  });

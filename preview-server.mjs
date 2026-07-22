import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
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
  const pathname = decodeURIComponent(url.split("?")[0] || "/");
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = path.resolve(root, relative);
  if (!filePath.startsWith(root)) return null;
  return filePath;
}

http
  .createServer((request, response) => {
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

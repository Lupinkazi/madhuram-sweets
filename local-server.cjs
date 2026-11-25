/* Local server: static files + POST /api/send-email.  Run: node server.js */
const http = require("http");
const fs = require("fs");
const path = require("path");
const sendEmail = require("./api/send-email");
const serveMap = require("./api/map");
const mapsKey = require("./api/maps-key");

// Minimal .env loader (KEY=value lines)
try {
  for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".woff2": "font/woff2", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".xml": "application/xml", ".txt": "text/plain" };
const BLOCKED = /^\/(\.|api\/|server\.js|tests\/|\.kiro|\.agents|skills-lock|vercel\.json)/;
const MAX_BODY = 20000; // bytes; a full order summary is well under this

// Keep in sync with vercel.json, which applies the same headers in production.
const SECURITY_HEADERS = {
  "Content-Security-Policy": "object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), focus-without-user-activation=()",
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
  "Cross-Origin-Resource-Policy": "same-origin"
};

http.createServer((req, res) => {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value);
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/api/send-email") {
    if (Number(req.headers["content-length"]) > MAX_BODY) { res.statusCode = 413; return res.end(); }
    let raw = "";
    let tooLarge = false;
    req.on("data", (c) => {
      if (tooLarge) return;
      raw += c;
      if (raw.length > MAX_BODY) { tooLarge = true; res.statusCode = 413; res.end(); req.destroy(); }
    });
    req.on("end", () => { if (tooLarge) return; try { req.body = JSON.parse(raw || "{}"); } catch { req.body = null; } sendEmail(req, res); });
    return;
  }
  if (url.pathname === "/api/map") return serveMap(req, res);
  if (url.pathname === "/api/maps-key") return mapsKey(req, res);
  let p;
  try { p = decodeURIComponent(url.pathname); } catch { res.statusCode = 400; return res.end("Bad request"); } // malformed %-escape would otherwise crash the server
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(__dirname, p);
  if (BLOCKED.test(p) || p.includes("\0") || !file.startsWith(__dirname + path.sep)) { res.statusCode = 404; return res.end("Not found"); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.statusCode = 404; return fs.readFile(path.join(__dirname, "404.html"), (_, b) => res.end(b || "Not found")); }
    res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
    res.end(buf);
  });
}).listen(process.env.PORT || 3000, () => console.log(`http://localhost:${process.env.PORT || 3000}`));

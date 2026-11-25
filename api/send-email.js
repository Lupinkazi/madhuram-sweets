/*
 * POST /api/send-email  ->  sends the visitor's order/enquiry to the shop via Resend.
 * The Resend key is read from the environment and never reaches the browser.
 * Works as a Vercel function (req, res) and is reused by server.js for local use.
 *
 * Env: RESEND_API_KEY (required), MAIL_TO (default msweetssnacks@gmail.com),
 *      MAIL_FROM (default "Madhuram Website <onboarding@resend.dev>")
 *
 * Browser checks are only for the visitor's convenience; everything below is
 * re-validated here because anyone can call this endpoint directly.
 */
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// No whitespace (blocks CR/LF header injection), no characters that are special in address headers.
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
// Control characters (except tab/newline), soft hyphen, zero-width space, LRM/RLM, bidi overrides/isolates, BOM.
const INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u00AD\u200B\u200E\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;
const clean = (v, max) =>
  typeof v === "string" ? v.normalize("NFC").replace(/\r\n?|[\u2028\u2029]/g, "\n").replace(INVISIBLE, "").trim().slice(0, max) : "";

/* Best-effort per-IP rate limit. On serverless hosts each instance keeps its own
   memory, so this slows abuse rather than guaranteeing a hard limit. */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) for (const [key, list] of hits) if (now - list[list.length - 1] >= WINDOW_MS) hits.delete(key);
  return recent.length > MAX_PER_WINDOW;
}
function clientIp(req) {
  // Trust X-Forwarded-For only behind Vercel's proxy, which sets it; locally it is client-controlled.
  const forwarded = process.env.VERCEL && String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket?.remoteAddress || "unknown";
}

function sameOrigin(req) {
  // Fetch Metadata: browsers send Sec-Fetch-Site; reject anything not from this site's own pages.
  const site = req.headers["sec-fetch-site"];
  if (site && site !== "same-origin") return false;
  const origin = req.headers.origin;
  if (origin) {
    try { if (new URL(origin).host !== req.headers.host) return false; } catch { return false; }
  }
  return true;
}

module.exports = async function handler(req, res) {
  const send = (status, body) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Vary", "Origin, Sec-Fetch-Site");
    res.end(JSON.stringify(body));
  };
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return send(405, { error: "method_not_allowed" }); }
  // Reject cross-site requests before doing any other work (CSRF / abuse from other sites).
  if (!sameOrigin(req)) return send(403, { error: "forbidden" });
  // Requiring JSON blocks "simple" cross-site form posts (text/plain, form-urlencoded).
  if (!/^application\/json\b/i.test(String(req.headers["content-type"] || ""))) return send(415, { error: "unsupported_media_type" });
  if (rateLimited(clientIp(req))) { res.setHeader("Retry-After", String(WINDOW_MS / 1000)); return send(429, { error: "too_many_requests" }); }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return send(500, { error: "email_not_configured" });

  let data = req.body;
  if (typeof data === "string") { try { data = JSON.parse(data); } catch { data = null; } }
  if (!data || typeof data !== "object" || Array.isArray(data)) return send(400, { error: "invalid_body" });
  if (data.website) return send(200, { ok: true }); // honeypot: pretend success

  if (data.type !== "order" && data.type !== "contact") return send(400, { error: "invalid_type" });
  const summary = clean(data.summary, 5000);
  if (summary.length < 10) return send(400, { error: "empty_message" });
  const type = data.type === "order" ? "Order request" : "Website enquiry";
  const email = clean(data.email, 254);
  const replyTo = EMAIL_RE.test(email) ? email : undefined;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || "Madhuram Website <onboarding@resend.dev>",
        to: [process.env.MAIL_TO || "msweetssnacks@gmail.com"],
        subject: `${type} from the website`, // fixed text: visitor input never reaches the subject
        text: summary,
        html: `<pre style="font:15px/1.5 system-ui,sans-serif;white-space:pre-wrap">${escapeHtml(summary)}</pre>`,
        ...(replyTo && { reply_to: replyTo })
      })
    });
    // Log only the status: the response body can echo the visitor's personal details.
    if (!r.ok) { console.error("Resend error", r.status); return send(502, { error: "send_failed" }); }
    return send(200, { ok: true });
  } catch (err) {
    console.error("Resend request failed", err?.name || "error");
    return send(502, { error: "send_failed" });
  }
};

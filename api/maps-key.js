/*
 * GET /api/maps-key  ->  { key } for the Google Maps JavaScript API.
 * Keeps the key out of the repository and page source. The Maps JavaScript API
 * runs in the browser, so the key is still sent to Google from the visitor's
 * browser: restrict it in Google Cloud Console (HTTP referrers = your domain,
 * APIs = Maps JavaScript API only).
 * Env: GOOGLE_MAPS_API_KEY (required)
 */
module.exports = function handler(req, res) {
  const send = (status, body) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify(body));
  };
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return send(405, { error: "method_not_allowed" }); }
  // Only hand the key to this site's own pages.
  const site = req.headers["sec-fetch-site"];
  if (site && site !== "same-origin") return send(403, { error: "forbidden" });
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return send(503, { error: "map_not_configured" });
  send(200, { key });
};

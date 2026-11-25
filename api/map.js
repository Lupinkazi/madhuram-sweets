/*
 * GET /api/map  ->  proxies a Google Static Maps image so the API key stays on the server.
 * The location is fixed server-side (MAP_CENTER) so the key cannot be used for arbitrary lookups.
 * Env: GOOGLE_MAPS_API_KEY (required), MAP_CENTER lat,lng (default the shop "27.7236644,85.2934397")
 * Requires the "Maps Static API" to be enabled for the key's project.
 */
module.exports = async function handler(req, res) {
  const fail = (status, msg) => { res.statusCode = status; res.setHeader("Content-Type", "text/plain"); res.end(msg); };
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return fail(405, "method_not_allowed"); }
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return fail(500, "map_not_configured");
  const q = process.env.MAP_CENTER || "27.7236644,85.2934397"; // shop front, Dhungedhara (lat,lng)
  const params = new URLSearchParams({
    center: q, zoom: "18", size: "640x360", scale: "2", maptype: "roadmap", region: "np", language: "en",
    key // no Google marker: the page draws its own clickable pin at the centre
  });
  try {
    const r = await fetch(`https://maps.googleapis.com/maps/api/staticmap?${params}`);
    if (!r.ok || !(r.headers.get("content-type") || "").startsWith("image/")) return fail(502, "map_unavailable");
    res.statusCode = 200;
    res.setHeader("Content-Type", r.headers.get("content-type"));
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.end(Buffer.from(await r.arrayBuffer()));
  } catch {
    fail(502, "map_unavailable");
  }
};

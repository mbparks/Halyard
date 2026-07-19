/**
 * Halyard solar proxy
 *
 * HamQSL publishes the solar report as XML but sends no CORS headers, so a
 * browser will not let a page read it. That is not something the page can work
 * around: it is the browser enforcing the same origin policy, and it bites
 * hardest from a file:// page, whose origin is the string "null".
 *
 * This worker fetches the report server side, where the same origin policy does
 * not apply, and hands it back with Access-Control-Allow-Origin set. Because
 * that header is a wildcard, a Halyard opened straight off the disk can read it.
 *
 * It also caches at the edge, so a hundred Halyards behind this worker still
 * only pull from HamQSL a few times an hour. Be a good neighbour: the report
 * is published as a courtesy and the numbers barely move between updates.
 *
 * Deploy:
 *   npx wrangler deploy
 * Then paste the resulting URL into the Chart station's feed address box.
 *
 * GPL-3.0, same as the rest of Halyard.
 */

const UPSTREAM = "https://www.hamqsl.com/solarxml.php";
const EDGE_TTL = 900;      // seconds. Fifteen minutes is plenty for solar data.

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, HEAD, OPTIONS",
  "access-control-max-age": "86400"
};

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Only GET is served here", { status: 405, headers: CORS });
    }

    try {
      const upstream = await fetch(UPSTREAM, {
        cf: { cacheTtl: EDGE_TTL, cacheEverything: true },
        headers: { "user-agent": "halyard-solar-proxy (amateur radio field instrument)" }
      });

      if (!upstream.ok) {
        return json({ error: "HamQSL answered " + upstream.status }, 502);
      }

      const body = await upstream.text();

      // Refuse to pass through something that is plainly not the report, so a
      // captive portal or an error page cannot masquerade as solar data.
      if (body.indexOf("<solardata") < 0) {
        return json({ error: "Upstream did not return a solar report" }, 502);
      }

      return new Response(body, {
        status: 200,
        headers: Object.assign({
          "content-type": "application/xml; charset=utf-8",
          "cache-control": "public, max-age=" + EDGE_TTL
        }, CORS)
      });
    } catch (err) {
      return json({ error: "Could not reach HamQSL: " + (err && err.message ? err.message : err) }, 502);
    }
  }
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: Object.assign({ "content-type": "application/json; charset=utf-8" }, CORS)
  });
}

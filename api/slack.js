/**
 * Same-origin proxy: /api/slack → https://ec-force.com/api/slack
 * Mirrored ec-force client posts to current host; avoid copying upstream
 * headers that break Node's res.setHeader (caused 500 in production).
 */

const UPSTREAM = "https://ec-force.com/api/slack";

function buildUpstreamBody(req) {
  if (req.method === "GET" || req.method === "HEAD") return undefined;
  const b = req.body;
  if (b == null || b === "") return undefined;
  if (Buffer.isBuffer(b)) return b;
  if (typeof b === "string") return b;
  return JSON.stringify(b);
}

function forwardRequestHeaders(req) {
  const out = {};
  const allow = [
    "content-type",
    "authorization",
    "user-agent",
    "accept",
    "accept-language",
    "x-requested-with",
  ];
  for (const k of allow) {
    const v = req.headers[k];
    if (v) out[k] = v;
  }
  return out;
}

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    const origin = req.headers.origin || "*";
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      req.headers["access-control-request-headers"] ||
        "Content-Type, Authorization"
    );
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.status(204).end();
  }

  try {
    const body = buildUpstreamBody(req);
    const upstream = await fetch(UPSTREAM, {
      method: req.method,
      headers: forwardRequestHeaders(req),
      body,
    });

    const buf = Buffer.from(await upstream.arrayBuffer());
    const ct = upstream.headers.get("content-type");
    if (ct) res.setHeader("Content-Type", ct);
    return res.status(upstream.status).send(buf);
  } catch (e) {
    console.error("api/slack proxy:", e);
    return res.status(502).json({ error: "Bad gateway" });
  }
};

/**
 * POST /api/seminar-notify
 * Body: { pageUrl?, pageTitle?, fields: [{ label, value }] }
 *
 * Vercel Project → Settings → Environment Variables:
 *   SMTP_HOST, SMTP_PORT (default 587), SMTP_SECURE (true|false),
 *   SMTP_USER, SMTP_PASS, SMTP_FROM (optional, defaults to SMTP_USER),
 *   SEMINAR_NOTIFY_TO (default HBY@unomi-jp.com),
 *   SEMINAR_ALLOWED_ORIGINS (comma-separated, e.g. https://www.unomi-jp.com)
 */

const nodemailer = require("nodemailer");

function parseAllowedOrigins() {
  const raw = process.env.SEMINAR_ALLOWED_ORIGINS || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isAllowedOrigin(origin) {
  if (!origin) return false;
  const list = parseAllowedOrigins();
  if (list.length === 0) {
    return (
      /^https:\/\/(www\.)?unomi-jp\.com$/i.test(origin) ||
      (process.env.VERCEL === "1" && /\.vercel\.app$/i.test(origin))
    );
  }
  return list.some((o) => origin === o);
}

function setCors(res, origin) {
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "86400");
  }
  res.setHeader("Vary", "Origin");
}

function labelForInput(root, el) {
  if (el.labels && el.labels.length) return el.labels[0].textContent.trim();
  const id = el.id;
  if (id) {
    const esc = String(id).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const lbl = root.querySelector(`label[for="${esc}"]`);
    if (lbl) return lbl.textContent.replace(/\s+/g, " ").trim();
  }
  let node = el.parentElement;
  for (let i = 0; i < 6 && node; i++) {
    const prev = node.previousElementSibling;
    if (prev && prev.tagName === "LABEL") {
      return prev.textContent.replace(/\s+/g, " ").trim();
    }
    const pl = node.closest("div");
    if (pl) {
      const l = pl.querySelector(":scope > label");
      if (l) return l.textContent.replace(/\s+/g, " ").trim();
    }
    node = node.parentElement;
  }
  return el.name || el.placeholder || el.id || "(項目)";
}

module.exports = async (req, res) => {
  const origin = req.headers.origin || "";

  if (req.method === "OPTIONS") {
    setCors(res, origin);
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isAllowedOrigin(origin)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  setCors(res, origin);

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body || "{}");
    } catch {
      return res.status(400).json({ error: "Invalid JSON" });
    }
  }

  const fields = body && body.fields;
  if (!Array.isArray(fields) || fields.length === 0) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    console.error("seminar-notify: missing SMTP_HOST / SMTP_USER / SMTP_PASS");
    return res.status(503).json({ error: "Mail not configured" });
  }

  const port = Number(process.env.SMTP_PORT || "587");
  const secure =
    process.env.SMTP_SECURE === "true" ||
    process.env.SMTP_SECURE === "1" ||
    port === 465;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  const to = process.env.SEMINAR_NOTIFY_TO || "HBY@unomi-jp.com";
  const from = process.env.SMTP_FROM || user;

  const lines = fields.map(({ label, value }) => {
    const l = String(label || "").replace(/\s+/g, " ").trim();
    const v = value == null ? "" : String(value);
    return `${l}: ${v}`;
  });

  const footer = [
    "",
    "---",
    `page: ${body.pageUrl || ""}`,
    `title: ${body.pageTitle || ""}`,
    `sentAt: ${new Date().toISOString()}`,
  ].join("\n");

  const text = lines.join("\n") + "\n" + footer;

  try {
    await transporter.sendMail({
      from,
      to,
      subject: `[セミナーお申し込み] ${body.pageTitle || "UNOMI"}`,
      text,
    });
  } catch (e) {
    console.error("seminar-notify sendMail:", e);
    return res.status(502).json({ error: "Send failed" });
  }

  return res.status(200).json({ ok: true });
};

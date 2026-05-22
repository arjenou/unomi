/**
 * POST /api/seminar-notify
 * Body: { pageUrl?, pageTitle?, fields: [{ label, value }] }
 *
 * Vercel Project → Settings → Environment Variables:
 *   SMTP_HOST, SMTP_PORT (default 587), SMTP_SECURE (true|false),
 *   SMTP_USER, SMTP_PASS, SMTP_FROM (optional, defaults to SMTP_USER),
 *   SEMINAR_NOTIFY_CC (optional comma-separated extra recipients),
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
    if (/^https:\/\/(www\.)?unomi-jp\.com$/i.test(origin)) return true;
    if (process.env.VERCEL === "1" && /\.vercel\.app$/i.test(origin))
      return true;
    // 本地 vercel dev / Live Server 等（仅开发；生产仍建议设 SEMINAR_ALLOWED_ORIGINS）
    if (/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(origin)) return true;
    return false;
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

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

  /** 申込内容の受信先（固定） */
  const to = "hby@unomi-jp.com";
  const from = process.env.SMTP_FROM || user;
  const ccRaw = process.env.SEMINAR_NOTIFY_CC || "";
  const cc = ccRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((e) => e.toLowerCase() !== to.toLowerCase());

  const rows = fields.map(({ label, value }) => {
    const l = String(label || "").replace(/\s+/g, " ").trim();
    const v = value == null ? "" : String(value);
    return { label: l, value: v };
  });

  const lines = rows.map(({ label, value }) => `${label}: ${value}`);

  const footer = [
    "",
    "---",
    `page: ${body.pageUrl || ""}`,
    `title: ${body.pageTitle || ""}`,
    `sentAt: ${new Date().toISOString()}`,
  ].join("\n");

  const text = lines.join("\n") + "\n" + footer;

  const htmlRows = rows
    .map(
      ({ label, value }) =>
        `<tr><th align="left" style="padding:8px;border:1px solid #ccc;">${escapeHtml(
          label
        )}</th><td style="padding:8px;border:1px solid #ccc;">${escapeHtml(
          value
        )}</td></tr>`
    )
    .join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body>
<p>セミナーお申し込みフォームの送信内容です。</p>
<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;">${htmlRows}</table>
<pre style="margin-top:16px;font-size:12px;color:#444;">${escapeHtml(
    footer
  )}</pre>
</body></html>`;

  try {
    await transporter.sendMail({
      from,
      to,
      cc: cc.length ? cc.join(", ") : undefined,
      subject: `[セミナーお申し込み] ${body.pageTitle || "UNOMI"}`,
      text,
      html,
    });
  } catch (e) {
    console.error("seminar-notify sendMail:", e);
    const out = { error: "Send failed" };
    if (e && typeof e.code === "string") out.code = e.code;
    if (e && typeof e.responseCode === "number") out.responseCode = e.responseCode;
    if (e && typeof e.command === "string") out.command = e.command;
    return res.status(502).json(out);
  }

  return res.status(200).json({ ok: true });
};

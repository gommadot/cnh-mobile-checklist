// Invia una notifica push (sollecito) alle subscription del reparto interessato.
const webpush = require("web-push");

const SB_URL = process.env.SB_URL;
const SB_KEY = process.env.SB_SERVICE_KEY;
const PUSH_SECRET = process.env.PUSH_SECRET;

let vapidReady = false;
try {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      "https://mobile-static.vercel.app",
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    vapidReady = true;
  }
} catch (e) { vapidReady = false; }

function readJson(req) {
  return new Promise((resolve, reject) => {
    let d = "";
    req.on("data", (c) => { d += c; if (d.length > 1e6) req.destroy(); });
    req.on("end", () => { try { resolve(d ? JSON.parse(d) : {}); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  if (req.method !== "POST") { res.statusCode = 405; res.end("Method Not Allowed"); return; }
  if (!vapidReady || !SB_URL || !SB_KEY) { res.statusCode = 500; res.end("server not configured"); return; }
  try {
    const body = (req.body && typeof req.body === "object") ? req.body : await readJson(req);
    const secret = req.headers["x-push-secret"] || body.secret;
    if (!PUSH_SECRET || secret !== PUSH_SECRET) { res.statusCode = 401; res.end("unauthorized"); return; }
    const role = ["paint", "pre"].includes(body.role) ? body.role : null;
    if (!role) { res.statusCode = 400; res.end("bad role"); return; }

    const q = SB_URL + "/rest/v1/push_subscriptions?select=endpoint,p256dh,auth&or=(role.eq." + role + ",role.eq.all)";
    const r = await fetch(q, { headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY } });
    const subs = r.ok ? await r.json() : [];

    const work = role === "pre" ? "Pre-shipment" : "Verniciatura";
    const ident = String(body.ident || "").slice(0, 40);
    const pline = String(body.pline || "").slice(0, 20);
    const payload = JSON.stringify({
      title: "Sollecito: " + work,
      body: ident + (pline ? " (" + pline + ")" : "") + " — da " + work.toLowerCase(),
      tag: "sollecito-" + (body.unitId || ident),
      ident
    });

    let sent = 0, removed = 0;
    const errors = [];
    await Promise.all((subs || []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600 });
        sent++;
      } catch (err) {
        errors.push({ status: err && err.statusCode, msg: String((err && (err.body || err.message)) || "").slice(0, 220) });
        if (err && (err.statusCode === 404 || err.statusCode === 410)) {
          removed++;
          try {
            await fetch(SB_URL + "/rest/v1/push_subscriptions?endpoint=eq." + encodeURIComponent(s.endpoint), {
              method: "DELETE", headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY }
            });
          } catch (e2) {}
        }
      }
    }));

    res.statusCode = 200; res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: true, role, total: (subs || []).length, sent, removed, errors }));
  } catch (e) {
    res.statusCode = 500; res.end("error: " + (e.message || ""));
  }
};

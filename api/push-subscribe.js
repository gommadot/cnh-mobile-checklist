// Registra/aggiorna la subscription Web Push di un operatore (per reparto).
const SB_URL = process.env.SB_URL;
const SB_KEY = process.env.SB_SERVICE_KEY;

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
  if (!SB_URL || !SB_KEY) { res.statusCode = 500; res.end("server not configured"); return; }
  try {
    const body = (req.body && typeof req.body === "object") ? req.body : await readJson(req);
    const sub = body.subscription;
    if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
      res.statusCode = 400; res.end("bad subscription"); return;
    }
    const role = ["paint", "pre", "all"].includes(body.role) ? body.role : "all";
    const row = {
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      role,
      op_name: String(body.name || "").slice(0, 80),
      updated_at: new Date().toISOString()
    };
    const r = await fetch(SB_URL + "/rest/v1/push_subscriptions?on_conflict=endpoint", {
      method: "POST",
      headers: {
        apikey: SB_KEY,
        Authorization: "Bearer " + SB_KEY,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify(row)
    });
    if (!r.ok) { const t = await r.text(); res.statusCode = 502; res.end("db error: " + t.slice(0, 300)); return; }
    res.statusCode = 200; res.setHeader("content-type", "application/json"); res.end(JSON.stringify({ ok: true, role }));
  } catch (e) {
    res.statusCode = 500; res.end("error: " + (e.message || ""));
  }
};

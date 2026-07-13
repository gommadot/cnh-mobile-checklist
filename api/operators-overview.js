// Panoramica operatori per l'admin: registrati (accesso), dispositivi (attivi),
// notifiche attive (push). Protetta da PUSH_SECRET.
const SB_URL = process.env.SB_URL;
const SB_KEY = process.env.SB_SERVICE_KEY;
const PUSH_SECRET = process.env.PUSH_SECRET;

function opKey(v) {
  return String(v || "").trim().toLocaleLowerCase("it-IT").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ");
}

module.exports = async function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  res.setHeader("content-type", "application/json; charset=utf-8");
  const secret = req.headers["x-push-secret"] || "";
  if (!PUSH_SECRET || secret !== PUSH_SECRET) { res.statusCode = 401; res.end('{"error":"unauthorized"}'); return; }
  if (!SB_URL || !SB_KEY) { res.statusCode = 500; res.end('{"error":"not configured"}'); return; }
  try {
    const q = (p) => fetch(SB_URL + "/rest/v1/" + p, { headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY } })
      .then(r => r.ok ? r.json() : []).catch(() => []);
    const [access, devices, subs] = await Promise.all([
      q("operator_mobile_access?select=operator_key,operator_name,can_view_all"),
      q("operator_devices?select=op_key,op_name,op_role,last_seen"),
      q("push_subscriptions?select=op_name,role"),
    ]);
    const map = new Map();
    const ensure = (key, name) => {
      if (!map.has(key)) map.set(key, { operator_key: key, operator_name: name || key, can_view_all: false, devices: 0, last_seen: null, has_push: false, role: "" });
      const o = map.get(key); if (name && (!o.operator_name || o.operator_name === o.operator_key)) o.operator_name = name; return o;
    };
    for (const a of access || []) { const o = ensure(a.operator_key, a.operator_name); o.can_view_all = a.can_view_all === true; }
    for (const d of devices || []) { const o = ensure(opKey(d.op_name), d.op_name); o.devices++; if (d.op_role) o.role = d.op_role; if (!o.last_seen || String(d.last_seen) > String(o.last_seen)) o.last_seen = d.last_seen; }
    for (const s of subs || []) { const o = ensure(opKey(s.op_name), s.op_name); o.has_push = true; if (!o.role && s.role) o.role = s.role; }
    const rows = Array.from(map.values()).sort((a, b) => String(a.operator_name).localeCompare(String(b.operator_name), "it"));
    res.statusCode = 200; res.end(JSON.stringify({ rows }));
  } catch (e) {
    res.statusCode = 500; res.end('{"error":"overview failed"}');
  }
};

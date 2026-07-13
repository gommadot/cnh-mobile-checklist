// Registra/aggiorna il dispositivo di un operatore (nome + id telefono).
const SB_URL = process.env.SB_URL;
const SB_KEY = process.env.SB_SERVICE_KEY;

function opKey(v) {
  return String(v || "").trim().toLocaleLowerCase("it-IT").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ");
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    let d = "";
    req.on("data", c => { d += c; if (d.length > 1e5) req.destroy(); });
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
    const deviceId = String(body.deviceId || "").slice(0, 100);
    const name = String(body.name || "").trim().slice(0, 80);
    if (!deviceId || !name) { res.statusCode = 400; res.end("bad request"); return; }
    const row = {
      device_id: deviceId,
      op_key: opKey(name),
      op_name: name,
      op_role: ["paint", "pre", "all"].includes(body.role) ? body.role : "all",
      user_agent: String(body.ua || "").slice(0, 300),
      last_seen: new Date().toISOString()
    };
    const r = await fetch(SB_URL + "/rest/v1/operator_devices?on_conflict=device_id", {
      method: "POST",
      headers: {
        apikey: SB_KEY, Authorization: "Bearer " + SB_KEY,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify(row)
    });
    if (!r.ok) { const t = await r.text(); res.statusCode = 502; res.end("db error: " + t.slice(0, 250)); return; }
    res.statusCode = 200; res.setHeader("content-type", "application/json"); res.end(JSON.stringify({ ok: true }));
  } catch (e) {
    res.statusCode = 500; res.end("error: " + (e.message || ""));
  }
};

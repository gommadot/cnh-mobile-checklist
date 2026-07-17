// Configurazione veicolo per plant order (da pals_vehicle_configurations).
// Letta col service_role: quella tabella ha RLS attiva e la anon key non vede nulla.
// Output non sensibile: solo variante funzionale + descrizione.
const SB_URL = process.env.SB_URL;
const SB_KEY = process.env.SB_SERVICE_KEY;

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=600, stale-while-revalidate=86400");

  let raw = "";
  try {
    raw = (req.query && req.query.order) || new URL(req.url, "http://x").searchParams.get("order") || "";
  } catch (e) { raw = ""; }
  const order = String(raw).trim().replace(/[^A-Za-z0-9_\-\/]/g, "").slice(0, 40);
  if (!order) { res.statusCode = 400; res.end(JSON.stringify({ error: "parametro 'order' mancante" })); return; }
  if (!SB_URL || !SB_KEY) { res.statusCode = 500; res.end(JSON.stringify({ error: "configurazione server mancante" })); return; }

  try {
    const q = SB_URL + "/rest/v1/pals_vehicle_configurations" +
      "?select=functional_variant,description" +
      "&plant_order=eq." + encodeURIComponent(order) +
      "&limit=3000";
    const r = await fetch(q, { headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY } });
    if (!r.ok) {
      const t = await r.text();
      res.statusCode = 502;
      res.end(JSON.stringify({ error: "lettura configurazione fallita", detail: String(t).slice(0, 200) }));
      return;
    }
    const data = await r.json();
    const rows = (Array.isArray(data) ? data : []).map((x) => ({
      v: String(x && x.functional_variant != null ? x.functional_variant : ""),
      d: String(x && x.description != null ? x.description : ""),
    }));
    // variante "0" = descrizione macchina base -> sempre in cima; poi ordine numerico.
    rows.sort((a, b) => {
      if (a.v === "0" && b.v !== "0") return -1;
      if (b.v === "0" && a.v !== "0") return 1;
      const na = Number(a.v), nb = Number(b.v);
      if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
      return a.v.localeCompare(b.v);
    });
    res.statusCode = 200;
    res.end(JSON.stringify({ order, rows }));
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "richiesta fallita" }));
  }
};

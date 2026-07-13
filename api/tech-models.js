// Restituisce la mappa tipo_tecnico -> modello (da technical_type_plines).
// Letta col service_role (bypassa RLS); l'output non e' sensibile.
const SB_URL = process.env.SB_URL;
const SB_KEY = process.env.SB_SERVICE_KEY;

module.exports = async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=1800, stale-while-revalidate=86400");
  if (!SB_URL || !SB_KEY) { res.statusCode = 200; res.end("{}"); return; }
  try {
    const r = await fetch(
      SB_URL + "/rest/v1/technical_type_plines?select=technical_type,model&model=not.is.null&limit=5000",
      { headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY } }
    );
    const rows = r.ok ? await r.json() : [];
    const map = {};
    for (const row of rows) {
      const k = row && row.technical_type != null ? String(row.technical_type) : "";
      if (k && row.model) map[k] = String(row.model);
    }
    res.statusCode = 200; res.end(JSON.stringify(map));
  } catch (e) { res.statusCode = 200; res.end("{}"); }
};

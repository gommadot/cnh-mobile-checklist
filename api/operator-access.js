function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function operatorKey(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("it-IT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

async function supabase(path, options = {}) {
  const base = String(process.env.SB_URL || process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SB_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!base || !key) throw new Error("Configurazione Supabase mancante");
  const response = await fetch(base + "/rest/v1/" + path, {
    ...options,
    headers: {
      apikey: key,
      authorization: "Bearer " + key,
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || "Supabase " + response.status);
  return text ? JSON.parse(text) : null;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => {
      data += chunk;
      if (data.length > 100000) req.destroy();
    });
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch (error) { reject(error); }
    });
    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET" && !req.headers["x-push-secret"]) {
      const key = operatorKey(req.query.name);
      if (!key) return json(res, 200, { canViewAll: false });
      try {
        const rows = await supabase(
          "operator_mobile_access?select=can_view_all&operator_key=eq." + encodeURIComponent(key) + "&limit=1"
        );
        return json(res, 200, { canViewAll: rows?.[0]?.can_view_all === true });
      } catch (error) {
        if (error.message.includes("PGRST205")) {
          return json(res, 200, { canViewAll: false, configured: false });
        }
        throw error;
      }
    }

    const secret = req.headers["x-push-secret"] || "";
    if (!process.env.PUSH_SECRET || secret !== process.env.PUSH_SECRET) {
      return json(res, 401, { error: "unauthorized" });
    }

    if (req.method === "GET") {
      const rows = await supabase(
        "operator_mobile_access?select=operator_key,operator_name,can_view_all,updated_at&order=operator_name.asc"
      );
      const subscriptions = await supabase("push_subscriptions?select=op_name&op_name=not.is.null");
      const byKey = new Map((rows || []).map(row => [row.operator_key, row]));
      for (const subscription of subscriptions || []) {
        const name = String(subscription.op_name || "").trim();
        const key = operatorKey(name);
        if (key && !byKey.has(key)) {
          byKey.set(key, { operator_key: key, operator_name: name, can_view_all: false, updated_at: null });
        }
      }
      return json(res, 200, {
        rows: Array.from(byKey.values()).sort((a, b) => a.operator_name.localeCompare(b.operator_name, "it")),
      });
    }

    if (req.method === "PUT") {
      const body = req.body && typeof req.body === "object" ? req.body : await readJson(req);
      const name = String(body?.name || "").trim();
      const key = operatorKey(name);
      if (!key) return json(res, 400, { error: "Nome operatore obbligatorio" });
      const row = {
        operator_key: key,
        operator_name: name,
        can_view_all: body?.canViewAll === true,
        updated_at: new Date().toISOString(),
      };
      const rows = await supabase("operator_mobile_access?on_conflict=operator_key", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify(row),
      });
      return json(res, 200, { row: rows?.[0] || row });
    }

    return json(res, 405, { error: "method_not_allowed" });
  } catch (error) {
    console.error("operator-access:", error);
    return json(res, 500, { error: "Permessi operatori non disponibili", detail: error.message });
  }
};

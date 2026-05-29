const fs = require("fs");
const path = require("path");

const INSTALL_PATH = "/q/445e032bc95f19e04bcc027fde0468e84e322ffe0c7d400b5a60b77853be2152";
const APP_UA_TOKEN = "CNHOperatoreApp-3ae27ce600615c19e60f9e0fa78cc2b9f6c99642d94be739";

function sendHtml(res, status, title, detail) {
  res.statusCode = status;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.end(`<!doctype html><html lang="it"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;margin:0;background:#f1f5f9;color:#0f172a;display:grid;min-height:100vh;place-items:center"><main style="max-width:420px;padding:28px;text-align:center"><h1 style="color:#c00000">${title}</h1><p style="line-height:1.45">${detail}</p></main></body></html>`);
}

function sendFile(res, filePath, contentType) {
  res.statusCode = 200;
  res.setHeader("content-type", contentType);
  res.setHeader("cache-control", "public, max-age=60, must-revalidate");
  fs.createReadStream(filePath).pipe(res);
}

module.exports = function handler(req, res) {
  const ua = req.headers["user-agent"] || "";
  const isAndroid = /Android/i.test(ua);
  const isIos = /iPhone|iPad|iPod/i.test(ua);
  const isApp = ua.includes(APP_UA_TOKEN);
  const target = req.query.target || "";

  const root = path.join(__dirname, "..");
  const indexPath = path.join(root, "index.html");
  const manifestPath = path.join(root, "manifest.json");
  const apkPath = path.join(root, "downloads", "cnh-operatore.apk");

  if (target === "install") {
    if (isAndroid) {
      res.statusCode = 302;
      res.setHeader("location", "/downloads/cnh-operatore.apk");
      res.end();
      return;
    }
    if (isIos) {
      sendFile(res, indexPath, "text/html; charset=utf-8");
      return;
    }
    sendHtml(res, 200, "Apri dal telefono", "Scansiona questo QR con Android per scaricare l'APK o con iPhone per aprire l'app web.");
    return;
  }

  if (target === "apk") {
    if (isAndroid || isApp) {
      sendFile(res, apkPath, "application/vnd.android.package-archive");
      return;
    }
    sendHtml(res, 403, "Download non disponibile", "L'APK si scarica solo aprendo il QR da un telefono Android.");
    return;
  }

  if (target === "manifest") {
    if (isApp) {
      sendFile(res, manifestPath, "application/manifest+json; charset=utf-8");
      return;
    }
    sendHtml(res, 403, "Accesso riservato", "Apri il QR autorizzato da telefono.");
    return;
  }

  if (isApp) {
    sendFile(res, indexPath, "text/html; charset=utf-8");
    return;
  }
  if (isAndroid) {
    sendHtml(res, 403, "Installa l'app", "Su Android questa app funziona solo tramite APK. Apri il QR autorizzato per scaricarla.");
    return;
  }
  sendHtml(res, 403, "Accesso riservato", `Apri il QR autorizzato da telefono: ${INSTALL_PATH}`);
};

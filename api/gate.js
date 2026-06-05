const fs = require("fs");
const path = require("path");

const APP_UA_TOKEN = "CNHOperatoreApp-3ae27ce600615c19e60f9e0fa78cc2b9f6c99642d94be739";
const APK_FILE = "cnh-operatore-f29e36c5b10ec712d9a26efbf382b3ceae209b9abbac16f4.apk";

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
  const managerPath = path.join(root, "manager.html");
  const manifestPath = path.join(root, "manifest.json");
  const apkPath = path.join(root, "downloads", APK_FILE);

  if (target === "apk") {
    res.setHeader("content-disposition", 'attachment; filename="cnh-operatore.apk"');
    sendFile(res, apkPath, "application/vnd.android.package-archive");
    return;
  }

  if (target === "manifest") {
    if (isApp) {
      sendFile(res, manifestPath, "application/manifest+json; charset=utf-8");
      return;
    }
    sendHtml(res, 403, "Accesso riservato", "Questa risorsa non e' navigabile da browser.");
    return;
  }

  if (target === "manager") {
    sendFile(res, managerPath, "text/html; charset=utf-8");
    return;
  }

  if (target === "ios") {
    if (isIos) {
      res.setHeader("set-cookie", "cnh_ios_app=1; Path=/; Max-Age=31536000; Secure; SameSite=Lax");
      sendFile(res, indexPath, "text/html; charset=utf-8");
      return;
    }
    sendHtml(res, 200, "Apri da iPhone", "Questo link installa la web app iOS. Aprilo da Safari su iPhone, poi usa Condividi e Aggiungi alla schermata Home.");
    return;
  }

  if (isApp) {
    sendFile(res, indexPath, "text/html; charset=utf-8");
    return;
  }
  if ((req.headers.cookie || "").includes("cnh_ios_app=1") && isIos) {
    sendFile(res, indexPath, "text/html; charset=utf-8");
    return;
  }
  if (isAndroid) {
    sendHtml(res, 403, "App richiesta", "Su Android questa applicazione funziona solo tramite APK aziendale.");
    return;
  }
  sendHtml(res, 403, "Accesso riservato", "Questa risorsa non e' navigabile da browser.");
};

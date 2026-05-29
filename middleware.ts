import { NextRequest, NextResponse } from "next/server";

const INSTALL_PATH = "/q/445e032bc95f19e04bcc027fde0468e84e322ffe0c7d400b5a60b77853be2152";
const APP_UA_TOKEN = "CNHOperatoreApp-3ae27ce600615c19e60f9e0fa78cc2b9f6c99642d94be739";
const IOS_COOKIE = "cnh_ios_qr_access";

function html(message: string, detail: string, status = 403) {
  return new NextResponse(
    `<!doctype html><html lang="it"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Accesso app</title><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;margin:0;background:#f1f5f9;color:#0f172a;display:grid;min-height:100vh;place-items:center"><main style="max-width:420px;padding:28px;text-align:center"><h1 style="color:#c00000">${message}</h1><p style="line-height:1.45">${detail}</p></main></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const path = url.pathname;
  const ua = req.headers.get("user-agent") || "";
  const isAndroid = /Android/i.test(ua);
  const isIos = /iPhone|iPad|iPod/i.test(ua);
  const isApp = ua.includes(APP_UA_TOKEN);
  const hasIosAccess = req.cookies.get(IOS_COOKIE)?.value === "1";

  if (path === INSTALL_PATH) {
    if (isAndroid) {
      return NextResponse.redirect(new URL("/downloads/cnh-operatore.apk", req.url));
    }
    if (isIos) {
      const res = NextResponse.rewrite(new URL("/index.html", req.url));
      res.cookies.set(IOS_COOKIE, "1", {
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "strict",
        secure: true,
        path: "/",
      });
      return res;
    }
    return html("Apri dal telefono", "Scansiona questo QR con Android per scaricare l'APK o con iPhone per aprire l'app web.", 200);
  }

  if (path === "/downloads/cnh-operatore.apk") {
    if (isAndroid || isApp) return NextResponse.next();
    return html("Download non disponibile", "L'APK si scarica solo aprendo il QR da un telefono Android.");
  }

  if (path === "/" || path === "/index.html" || path === "/manifest.json") {
    if (isApp) return NextResponse.next();
    if (isIos && hasIosAccess) return NextResponse.next();
    if (isAndroid) return html("Installa l'app", "Su Android questa app funziona solo tramite APK. Apri il QR autorizzato per scaricarla.");
    return html("Accesso riservato", "Apri il QR autorizzato da telefono.");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/index.html", "/manifest.json", "/downloads/cnh-operatore.apk", "/q/:path*"],
};

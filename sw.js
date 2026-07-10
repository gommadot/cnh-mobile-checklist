// Service worker CNHi Painting - notifiche push (solleciti dall'ufficio)
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (e) { data = { title: "Sollecito", body: event.data ? event.data.text() : "" }; }
  const title = data.title || "Sollecito lavorazione";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png?v=1",
    badge: "/icons/icon-192.png?v=1",
    tag: data.tag || "sollecito",
    renotify: true,
    vibrate: [200, 100, 200],
    data: { ident: data.ident || "", url: "/" }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const ident = (event.notification.data && event.notification.data.ident) || "";
  const target = "/" + (ident ? ("?q=" + encodeURIComponent(ident)) : "");
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) { c.postMessage({ type: "sollecito-open", ident }); return c.focus(); }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});

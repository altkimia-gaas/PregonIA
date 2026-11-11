/* Service worker de PregonIA: hace instalable la aplicación y recibe lo que se comparte desde otras apps del celular.
   No guarda la aplicación en caché (siempre se carga la versión vigente); solo atiende el envío a /compartir. */
const CACHE = "pregonia-compartir";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method === "POST" && u.origin === location.origin && u.pathname === "/compartir") e.respondWith(recibir(e.request));
});
async function recibir(req){
  try {
    const f = await req.formData(), c = await caches.open(CACHE);
    const txt = k => String(f.get(k) || "").slice(0, 8000);
    await c.put("/compartir/datos", new Response(JSON.stringify({title: txt("title"), text: txt("text"), url: txt("url"), ts: Date.now()}), {headers: {"content-type": "application/json"}}));
    const img = f.getAll("imagen").find(x => x && typeof x === "object" && x.size && /^image\//.test(x.type) && x.size < 15e6);
    if (img) await c.put("/compartir/imagen", new Response(img, {headers: {"content-type": img.type}})); else await c.delete("/compartir/imagen");
    return Response.redirect("/?compartir=1#menciones", 303);
  } catch (e) {
    return Response.redirect("/?compartir=reintentar#menciones", 303);
  }
}

/* Avisos con la aplicación cerrada (Web Push): los envía la lectura programada del servidor. */
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (er) { d = {cuerpo: e.data ? e.data.text() : ""}; }
  e.waitUntil(self.registration.showNotification(d.titulo || "PregonIA", {body: d.cuerpo || "", tag: d.tag || undefined, icon: "/icono-192.png", badge: "/icono-192.png",
    data: {url: d.url || "/?sin-portada#inicio"}, requireInteraction: !!d.urgente}));
});
/* Al tocar un aviso: si PregonIA ya está abierta, se enfoca y abre ese aviso; si no, se abre. */
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "/?sin-portada#inicio", self.location.origin);
  e.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({type: "window", includeUncontrolled: true});
    const abierta = ventanas.find(c => new URL(c.url).origin === self.location.origin);
    if (abierta) { await abierta.focus(); const g = url.searchParams.get("alerta"); if (g) abierta.postMessage({tipo: "abrir-aviso", g}); return; }
    await self.clients.openWindow(url.href);
  })());
});

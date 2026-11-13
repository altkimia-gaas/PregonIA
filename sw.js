/* Service worker de PregonIA: hace instalable la aplicación y recibe lo que se comparte desde otras apps del celular.
   No guarda la aplicación en caché (siempre se carga la versión vigente); solo atiende el envío a /compartir
   y, si no hay señal al abrirla, muestra una pantalla propia de «Sin conexión» en vez del error del navegador. */
const CACHE = "pregonia-compartir", CACHE_OFF = "pregonia-sin-conexion-v1", OFFLINE = "/offline.html";
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE_OFF).then(c => c.addAll([OFFLINE, "/icono-192.png"])).catch(() => {}).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith("pregonia-sin-conexion-") && k !== CACHE_OFF) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method === "POST" && u.origin === location.origin && u.pathname === "/compartir") return e.respondWith(recibir(e.request));
  if (e.request.mode === "navigate" && e.request.method === "GET" && u.origin === location.origin) e.respondWith(navegar(e.request));
  else if (e.request.method === "GET" && u.origin === location.origin && u.pathname === "/icono-192.png") e.respondWith(fetch(e.request).catch(() => caches.match("/icono-192.png")));
});
/* Siempre va a la red (versión vigente); solo si falla la conexión responde con la pantalla guardada. */
async function navegar(req){
  try { return await fetch(req); }
  catch (e) { return (await caches.match(OFFLINE)) || new Response("Sin conexión", {status: 503, headers: {"content-type": "text/plain; charset=utf-8"}}); }
}
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

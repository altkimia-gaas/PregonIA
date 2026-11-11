/* Ingesta por Compartir: PregonIA se instala en el celular y aparece en la lista «Compartir» de Facebook, WhatsApp o la galería.
   Lo compartido (enlace, texto o captura) lo recibe el service worker (/sw.js), lo deja en una caché local
   y abre la aplicación con la captura asistida ya llenada. Nada sale del celular hasta que la persona presiona «Analizar y agregar». */
const PWA = {aviso: null, instalada: matchMedia("(display-mode: standalone)").matches || navigator.standalone === true};
const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost") && !(window.claude && window.claude.use) && !/claude\.(ai|site)$/.test(location.hostname)) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
addEventListener("beforeinstallprompt", e => { e.preventDefault(); PWA.aviso = e; document.querySelectorAll(".cap-inst").forEach(x => x.hidden = false); });
addEventListener("appinstalled", () => { PWA.aviso = null; PWA.instalada = true; document.querySelectorAll(".cap-inst").forEach(x => x.remove()); toast("PregonIA quedó instalada: ya aparece en Compartir."); });
function instalarHtml(){
  if (PWA.instalada || !movil()) return "";
  if (esIOS) return `<p class="cap-inst ios">En iPhone no se puede compartir directo a PregonIA: en Facebook toca Compartir y luego Copiar enlace, y aquí usa «Pegar».</p>`;
  return `<p class="cap-inst" ${PWA.aviso ? "" : "hidden"}><span>Instala PregonIA en este celular y comparte publicaciones directo desde Facebook.</span><button class="btn sm alt" type="button" data-act="instalar">Instalar PregonIA</button></p>`;
}
document.addEventListener("click", async e => {
  const b = e.target.closest('[data-act="instalar"]'); if (!b || !PWA.aviso) return;
  PWA.aviso.prompt(); const r = await PWA.aviso.userChoice.catch(() => null); PWA.aviso = null;
  if (!r || r.outcome !== "accepted") document.querySelectorAll(".cap-inst").forEach(x => x.hidden = true);
});
/* Busca el medio del catálogo por la dirección compartida (por ejemplo facebook.com/31tv.cl). */
function medioDeUrl(url){
  if (!url) return "";
  let u; try { u = new URL(url); } catch(e) { return ""; }
  const host = u.hostname.replace(/^(www|m|web|mobile)\./, ""), ruta = u.pathname.toLowerCase().split("/").filter(Boolean);
  const id = u.searchParams.get("id");
  const hit = CATALOG.find(m => { if (!m.u) return false; let v; try { v = new URL(m.u); } catch(e) { return false; }
    const vh = v.hostname.replace(/^(www|m|web|mobile)\./, ""); if (vh !== host) return false;
    if (/facebook\.com$/.test(vh)) { const vr = v.pathname.toLowerCase().split("/").filter(Boolean); return vr[0] === "profile.php" ? !!id && v.searchParams.get("id") === id : !!vr[0] && vr[0] === ruta[0]; }
    return true; });
  return hit ? hit.n : "";
}
async function recibirCompartido(){
  const q = new URLSearchParams(location.search); if (!q.has("compartir")) return;
  history.replaceState(null, "", location.pathname + location.hash);
  if (q.get("compartir") === "reintentar") { toast("No alcanzó a llegar lo compartido: vuelve a compartirlo."); return; }
  let datos = null, imagen = null;
  try {
    const c = await caches.open("pregonia-compartir");
    const r = await c.match("/compartir/datos"); if (r) datos = await r.json();
    const ri = await c.match("/compartir/imagen"); if (ri) { const bl = await ri.blob(); imagen = new File([bl], "captura", {type: bl.type || "image/jpeg"}); }
    await c.delete("/compartir/datos"); await c.delete("/compartir/imagen");
  } catch(e) {}
  if (!datos && !imagen) return;
  if (datos && Date.now() - (datos.ts || 0) > 30 * 60000 && !imagen) return;
  const base = separarEnlace([datos?.text, datos?.url].filter(Boolean).join(" ")), url = datos?.url || base.url, texto = base.texto.replace(url, "").trim();
  const medio = medioDeUrl(url);
  if (route() !== "menciones") location.hash = "menciones";
  setTimeout(() => capAbrir({compartida: true, url, texto, medio, imagen,
    aviso: !texto && !imagen ? "Facebook compartió solo el enlace. Pega el texto de la publicación o adjunta una captura." : ""}), 60);
}
recibirCompartido();

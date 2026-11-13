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
/* Guía de instalación en iPhone: Apple no deja que una página ofrezca «Instalar», y sin instalar no llegan avisos.
   Se muestra sola al entrar al piloto (como máximo cada 3 días si la persona dice «Ahora no»), desde la campana
   y con el enlace ?instalar (para mandarlo por WhatsApp a una autoridad). */
const GUIA_IOS_KEY = "pregonia-guia-ios", GUIA_IOS_PAUSA = 3 * 864e5;
const enAppAjena = () => /FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|Line\/|GSA\/|Twitter/i.test(navigator.userAgent);
const navIOS = () => /CriOS/.test(navigator.userAgent) ? "Chrome" : /FxiOS/.test(navigator.userAgent) ? "Firefox" : /EdgiOS/.test(navigator.userAgent) ? "Edge" : "Safari";
const IC_COMP = `<svg class="gi-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5v10h14V11h-1"/></svg>`;
const IC_MAS = `<svg class="gi-ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg>`;
const IC_CAMP = `<svg class="gi-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2H4.5z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/></svg>`;
function guiaIOSAbrir(){
  if ($("#giBack")) return;
  const nav = navIOS(), ajena = enAppAjena(), origen = document.activeElement;
  const pasos = ajena
    ? [[`<b>Ábrela en Safari.</b> Estás dentro de otra app: toca ··· o el menú de esta ventana y elige «Abrir en Safari» (o «Abrir en el navegador»).`, IC_COMP],
       [`En Safari, toca <b>Compartir</b> y luego <b>«Agregar a inicio»</b>.`, IC_MAS],
       [`Abre PregonIA desde el nuevo ícono y activa los avisos en la <b>campana</b>.`, IC_CAMP]]
    : [[nav === "Safari"
          ? `Toca <b>Compartir</b> en la barra de Safari (si no lo ves, toca primero <b>···</b>). Si llegaste desde WhatsApp o el correo, ábrela antes en Safari.`
          : `Toca <b>Compartir</b> junto a la dirección, arriba en ${nav}.`, IC_COMP],
       [`Elige <b>«Agregar a inicio»</b> (si no aparece, desliza hacia abajo o toca «Ver más») y luego <b>«Agregar»</b>. Si ves «Abrir como app web», déjalo activado.`, IC_MAS],
       [`Abre PregonIA desde el <b>nuevo ícono</b> de tu pantalla de inicio y activa los avisos en la <b>campana</b>.`, IC_CAMP]];
  const ov = document.createElement("div"); ov.className = "vid-back gi-back"; ov.id = "giBack";
  ov.innerHTML = `<section class="vid gi" role="dialog" aria-modal="true" aria-labelledby="giT">
    <header class="vid-h"><div><h2 id="giT">Instala PregonIA en tu iPhone</h2><p>Así te llegan los avisos de prensa aunque la app esté cerrada. Toma menos de un minuto.</p></div>
      <button class="hp-x" type="button" data-act="guia-ios-cerrar" aria-label="Cerrar"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>
    <ol class="gi-pasos">${pasos.map(([t, ic], i) => `<li><span class="gi-n">${i + 1}</span><span class="gi-t">${t}</span>${ic}</li>`).join("")}</ol>
    <footer class="gi-f"><button class="btn ghost" type="button" data-act="guia-ios-luego">Ahora no</button><button class="btn alt" type="button" data-act="guia-ios-cerrar">Entendido</button></footer>
  </section>`;
  ov._origen = origen; document.body.append(ov); document.body.classList.add("vid-on");
  ov.querySelector('[data-act="guia-ios-cerrar"]').focus();
}
function guiaIOSCerrar(pausa){
  const ov = $("#giBack"); if (!ov) return;
  try { localStorage.setItem(GUIA_IOS_KEY, String(Date.now() + (pausa ? GUIA_IOS_PAUSA : 0))); } catch(e) {}
  const o = ov._origen; ov.remove(); if (!document.querySelector(".vid-back")) document.body.classList.remove("vid-on"); if (o && o.isConnected) o.focus();
}
/* Solo en iPhone o iPad, sin instalar y sin otra ventana abierta; respeta el «Ahora no» por 3 días. */
function guiaIOSAuto(){
  if (!esIOS || PWA.instalada || document.querySelector(".vid-back")) return;
  let hasta = 0; try { hasta = +localStorage.getItem(GUIA_IOS_KEY) || 0; } catch(e) {}
  if (Date.now() < hasta) return;
  setTimeout(() => { if (!document.querySelector(".vid-back")) guiaIOSAbrir(); }, 1200);
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return; const a = b.dataset.act;
  if (a === "guia-ios") { if (typeof avCerrar === "function" && b.closest("#avisosPanel")) avCerrar(); guiaIOSAbrir(); }
  if (a === "guia-ios-cerrar") guiaIOSCerrar(false);
  if (a === "guia-ios-luego") guiaIOSCerrar(true);
  if (e.target.id === "giBack") guiaIOSCerrar(false);
});
document.addEventListener("keydown", e => {
  const ov = $("#giBack"); if (!ov) return;
  if (e.key === "Escape") { e.preventDefault(); guiaIOSCerrar(false); return; }
  if (e.key === "Tab") { const f = [...ov.querySelectorAll("button")]; const i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
});
/* Enlace para enviar a una autoridad: pregonia.vercel.app/?instalar abre la guía en iPhone (en otros equipos no hace nada). */
(() => { const q = new URLSearchParams(location.search); if (!q.has("instalar")) return;
  const resto = location.search.slice(1).split("&").filter(x => x && !/^instalar(=|$)/.test(x)).join("&"); history.replaceState(null, "", location.pathname + (resto ? "?" + resto : "") + location.hash);
  if (esIOS && !PWA.instalada) setTimeout(guiaIOSAbrir, 600); })();

/* Busca el medio del catálogo por la dirección compartida (por ejemplo facebook.com/31tv.cl). */
function medioDeUrl(url){
  if (!url) return "";
  let u; try { u = new URL(url); } catch(e) { return ""; }
  const host = u.hostname.replace(/^(www|m|web|mobile)\./, ""), ruta = u.pathname.toLowerCase().split("/").filter(Boolean);
  const id = u.searchParams.get("id");
  const hit = CATALOG.find(m => { if (!m.u) return false; let v; try { v = new URL(m.u); } catch(e) { return false; }
    const vh = v.hostname.replace(/^(www|m|web|mobile)\./, ""); if (vh !== host) return false;
    if (/instagram\.com$/.test(vh)) { const vr = v.pathname.toLowerCase().split("/").filter(Boolean); return !!vr[0] && vr[0] === ruta[0]; }  // un enlace a una publicación (/p/…) no trae la cuenta
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

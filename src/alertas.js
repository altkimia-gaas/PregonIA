/* Avisos: cada vez que llegan noticias, el motor de reglas (reglas.js) revisa los hechos y avisa lo urgente.
   - En la campana del encabezado queda la lista de avisos de cada municipio.
   - En este dispositivo: notificación del navegador mientras PregonIA esté abierta o instalada.
   - En el piloto, con la llave de notificaciones configurada: llegan aunque PregonIA esté cerrada (las envía la lectura programada),
     y por correo si el municipio lo configuró. */
S.avisos ||= {pref: null, porOrg: {}, push: null};
Object.keys(S.avisos.porOrg).forEach(k => { if (!k.includes("|")) delete S.avisos.porOrg[k]; });  // formato anterior, sin modo
const AV = {abierto: false, vuelta: null, cfg: null, destacar: null};
const AV_ETQ = {urgente: "Urgente", importante: "Importante", info: "Buena noticia"};
const AV_NIV = [["urgente", "Solo lo urgente", "Críticas que llegaron a prensa regional o nacional, o que crecen rápido. Pensado para el alcalde."],
  ["importante", "Lo crítico", "Además, toda noticia crítica nueva, aunque sea comunal. Pensado para comunicaciones."],
  ["todo", "Todo", "Además, las buenas noticias que llegan a prensa regional o nacional."],
  ["nada", "Nada", "Sin avisos; la campana sigue guardando la lista."]];
fetch("/api/config").then(r => r.ok ? r.json() : {}).then(j => { AV.cfg = j.avisos || null; if (AV.abierto) avPintar(); }).catch(() => {});
const avRol = () => typeof PILOTO !== "undefined" && PILOTO && PILOTO.activo && PILOTO.perfil ? PILOTO.perfil.rol : "";
function avPref(){ return S.avisos.pref || {nivel: ["alcalde", "directivo"].includes(avRol()) ? "urgente" : "importante", silencio: true, correo: true}; }
/* Un estado por municipio y por modo: los avisos de la demostración no se mezclan con los de noticias reales ni con los del piloto,
   y la primera carga de cada modo solo arma la lista (no notifica lo que ya estaba). */
const avModo = () => typeof MODO !== "undefined" && MODO && MODO.tipo ? MODO.tipo : "demo";
const avEstado = (org = S.org) => S.avisos.porOrg[org + "|" + avModo()] ||= {vistos: {}, lista: [], init: false};
const avSoporte = () => "Notification" in window && "serviceWorker" in navigator && !(window.claude && window.claude.use);
const avPermiso = () => avSoporte() ? Notification.permission : "no";
const avPushServidor = () => typeof PILOTO !== "undefined" && PILOTO && PILOTO.activo && !!(AV.cfg && AV.cfg.push);
function hechosApp(){
  return menciones(cuenta(), 3).map(m => ({g: m.g, tonos: m.notas.map(n => n.tono),
    notas: m.notas.map(n => ({ts: n.ts, nivel: nivIdx(MED[n.m].a), medio: n.m, medioNombre: n.fuente || MED[n.m].n, titulo: n.t, url: n.url || "", captura: !!n.captura}))}));
}
function revisarAlertas(){
  if (!S || !cuenta()) return;
  const st = avEstado(), ahora = Date.now(), nuevas = [];
  for (const h of hechosApp()) {
    const {alertas, visto} = alertasDeHecho(h, ahora, st.vistos[h.g]);
    if (!alertas.length) continue;
    st.vistos[h.g] = visto;
    const propia = h.notas.every(n => n.captura); // lo que el equipo acaba de agregar no se le avisa a sí mismo
    alertas.forEach(a => nuevas.push({...a, id: S.org + ":" + a.clave, creada: ahora, leida: !st.init ? a.nivel !== "urgente" : propia}));
  }
  const g = Object.keys(st.vistos); if (g.length > 800) g.slice(0, g.length - 800).forEach(k => delete st.vistos[k]);
  if (!nuevas.length) { if (!st.init) { st.init = true; save(); } avBadge(); return; }
  const primera = !st.init; st.init = true;
  st.lista = nuevas.sort((a, b) => (AV_ORD(b) - AV_ORD(a)) || b.ts - a.ts).concat(st.lista).slice(0, 60);
  save(); avBadge();
  if (primera) return;  // la primera revisión de un municipio solo arma la lista; no notifica lo que ya estaba
  const pref = avPref();
  nuevas.filter(a => !a.leida && pasaPreferencia(a, pref, ahora)).slice(0, 3).forEach(a => {
    if (!avPushServidor() || !S.avisos.push) notificar(a);
    if (document.visibilityState === "visible" && a.nivel === "urgente") toast(`${AV_ETQ[a.nivel]}: ${a.titulo}. Ábrelo en la campana.`);
  });
}
const AV_ORD = a => ({urgente: 3, importante: 2, info: 1})[a.nivel] || 0;
async function notificar(a, prueba){
  if (avPermiso() !== "granted") return false;
  const titulo = `${AV_ETQ[a.nivel] || "Aviso"} · ${a.titulo}`, opts = {body: `${a.titular}${a.medio ? " — " + a.medio : ""}`, tag: a.clave || "prueba", icon: "/icono-192.png", badge: "/icono-192.png",
    data: {url: prueba ? "/?sin-portada#inicio" : `/?sin-portada&alerta=${encodeURIComponent(a.g)}#inicio`}, requireInteraction: a.nivel === "urgente"};
  try { const reg = await navigator.serviceWorker.getRegistration(); if (reg) { await reg.showNotification(titulo, opts); return true; } new Notification(titulo, opts); return true; } catch(e) { return false; }
}
const avNoLeidas = () => avEstado().lista.filter(a => !a.leida).length;
function avBadge(){
  const b = $("#avisosBtn"); if (!b) return; const n = avNoLeidas(), urg = avEstado().lista.some(a => !a.leida && a.nivel === "urgente");
  b.querySelector(".av-n").textContent = n > 9 ? "9+" : n || ""; b.querySelector(".av-n").hidden = !n; b.classList.toggle("urg", urg);
  b.setAttribute("aria-label", n ? `Avisos: ${plural(n, "sin leer", "sin leer")}` : "Avisos");
}
function avBoton(){
  const tools = document.querySelector(".tools"); if (!tools || $("#avisosBtn")) return;
  const b = document.createElement("button"); b.id = "avisosBtn"; b.type = "button"; b.className = "themebtn av-btn"; b.dataset.act = "avisos"; b.setAttribute("aria-haspopup", "dialog"); b.title = "Avisos";
  b.innerHTML = `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2H4.5z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/></svg><span class="av-n" hidden></span>`;
  tools.insertBefore(b, $("#temaBtn") || tools.firstChild);
  const back = document.createElement("div"); back.className = "hp-back"; back.id = "avisosBack"; back.dataset.act = "avisos-cerrar"; back.hidden = true;
  const panel = document.createElement("aside"); panel.className = "help av-panel"; panel.id = "avisosPanel"; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-modal", "true"); panel.setAttribute("aria-labelledby", "avT"); panel.hidden = true;
  panel.innerHTML = `<header class="hp-top"><h2 id="avT">Avisos</h2><button class="hp-x" data-act="avisos-cerrar" aria-label="Cerrar avisos"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header><div class="hp-body" id="avBody"></div>`;
  document.body.append(back, panel); avBadge();
}
function avDispositivo(){
  const per = avPermiso(), push = avPushServidor(), ios = typeof esIOS !== "undefined" && esIOS, inst = typeof PWA !== "undefined" && PWA.instalada;
  if (per === "no") return `<p class="muted">Esta vista no permite avisos del navegador. Ábrelo en pregonia.vercel.app${ios ? " e instálala en la pantalla de inicio" : ""}.</p>`;
  if (ios && !inst) return `<p class="muted">En iPhone los avisos llegan solo con PregonIA instalada: toca Compartir en Safari, luego «Agregar a inicio», y abre PregonIA desde ese ícono.</p>`;
  const instalar = !ios && !inst && typeof PWA !== "undefined" && PWA.aviso && typeof movil === "function" && movil()
    ? `<p class="cap-inst" style="margin:0 0 12px"><span>Instala PregonIA en este celular: queda como una app más, con su ícono y los avisos aunque esté cerrada.</span><button class="btn sm alt" type="button" data-act="instalar">Instalar PregonIA</button></p>` : "";
  return instalar + avDispositivoBase(per, push);
}
function avDispositivoBase(per, push){
  if (per === "denied") return `<p class="muted">Los avisos están bloqueados en este navegador. Actívalos desde el candado junto a la dirección (Configuración del sitio · Notificaciones).</p>`;
  if (per !== "granted") return `<p>${push ? "Recibe aquí lo urgente aunque PregonIA esté cerrada." : "Recibe aquí lo urgente mientras PregonIA esté abierta o instalada."}</p><button class="btn alt sm" type="button" data-act="avisos-activar">Activar avisos en este dispositivo</button>`;
  return `<p><span class="pill t-pos">Activos</span> ${push && S.avisos.push ? "Llegan aunque PregonIA esté cerrada." : push ? "Llegan con PregonIA abierta. <button class=\"btn ghost sm\" type=\"button\" data-act=\"avisos-activar\">Recibirlos también con la app cerrada</button>" : "Llegan mientras PregonIA esté abierta o instalada."}</p><button class="btn ghost sm" type="button" data-act="avisos-probar">Enviar un aviso de prueba</button>`;
}
function avPintar(){
  const el = $("#avBody"); if (!el) return;
  const pref = avPref(), st = avEstado(), piloto = typeof PILOTO !== "undefined" && PILOTO && PILOTO.activo;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const grupos = [["Hoy", st.lista.filter(a => a.creada >= hoy.getTime())], ["Antes", st.lista.filter(a => a.creada < hoy.getTime())]].filter(([, l]) => l.length);
  const item = a => { const m = menciones(cuenta(), 30).find(x => x.g === a.g);
    return `<li class="av-i ${a.nivel} ${a.leida ? "" : "nueva"} ${AV.destacar === a.g ? "dest" : ""}" id="av-${esc(a.g)}">
      <p class="av-k"><span class="pill ${a.nivel === "urgente" ? "t-cri" : a.nivel === "info" ? "t-pos" : "t-neu"}">${AV_ETQ[a.nivel]}</span><span>${esc(a.titulo)}</span>${a.leida ? "" : '<i class="av-dot" aria-label="Sin leer"></i>'}</p>
      <p class="av-t">${a.url ? `<a class="ext" href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.titular)}</a>` : esc(a.titular)}</p>
      <p class="av-m">${esc(a.medio)}${a.medios > 1 ? ` y ${a.medios - 1} más` : ""} · ${ago(a.ts)}</p>
      ${m ? `<div class="av-acts"><button class="btn sm" data-act="vocero" data-g="${esc(a.g)}">${ri("mic")} Vocería</button><button class="btn ghost sm" data-act="responder" data-g="${esc(a.g)}" data-from="inicio">${respondida(a.g) ? "Ver respuesta" : "Preparar respuesta"}</button></div>` : ""}</li>`; };
  el.innerHTML = `
    <section class="av-sec"><h3 class="hp-h">En este dispositivo</h3>${avDispositivo()}</section>
    <section class="av-sec"><h3 class="hp-h">Qué te avisamos</h3>
      <div class="av-opts" role="radiogroup" aria-label="Qué te avisamos">${AV_NIV.map(([k, n, d]) => `<label class="av-opt"><input type="radio" name="avNivel" value="${k}" ${pref.nivel === k ? "checked" : ""}><span><b>${n}</b><small>${d}</small></span></label>`).join("")}</div>
      <label class="av-chk"><input type="checkbox" id="avSilencio" ${pref.silencio !== false ? "checked" : ""}> Silencio de 23:00 a 7:00, salvo lo urgente</label>
      ${piloto ? `<label class="av-chk"><input type="checkbox" id="avCorreo" ${pref.correo !== false ? "checked" : ""} ${AV.cfg && AV.cfg.correo ? "" : "disabled"}> También por correo${AV.cfg && AV.cfg.correo ? "" : ' <span class="muted">(el correo aún no está configurado en el servidor)</span>'}</label>` : ""}
    </section>
    <section class="av-sec"><div class="av-h"><h3 class="hp-h" style="margin:0">Avisos de ${esc(S.org)}</h3>${avNoLeidas() ? `<button class="btn ghost sm" type="button" data-act="avisos-leidos">Marcar todo como leído</button>` : ""}</div>
      ${grupos.length ? grupos.map(([t, l]) => `<h4 class="av-g">${t}</h4><ul class="av-l">${l.map(item).join("")}</ul>`).join("") : `<p class="muted">Sin avisos todavía. Aquí aparecerán las noticias críticas, las que escalan a prensa regional o nacional y los temas que crecen rápido.</p>`}
    </section>`;
  if (AV.destacar) setTimeout(() => document.getElementById("av-" + AV.destacar)?.scrollIntoView({block: "center"}), 30);
}
function avAbrir(destacar){
  avBoton(); AV.vuelta = document.activeElement; AV.abierto = true; AV.destacar = destacar || null; avPintar();
  $("#avisosPanel").hidden = false; $("#avisosBack").hidden = false; document.body.classList.add("hp-on"); $("#avisosPanel .hp-x").focus();
}
function avCerrar(){
  if (!AV.abierto) return; AV.abierto = false;
  const st = avEstado(); if (st.lista.some(a => !a.leida)) { st.lista.forEach(a => a.leida = true); save(); }
  avBadge(); $("#avisosPanel").hidden = true; $("#avisosBack").hidden = true; document.body.classList.remove("hp-on");
  if (AV.vuelta && AV.vuelta.isConnected) AV.vuelta.focus();
}
function avGuardarPref(p){
  S.avisos.pref = {...avPref(), ...p}; save();
  if (typeof PILOTO !== "undefined" && PILOTO && PILOTO.activo && PILOTO.sb) PILOTO.sb.from("avisos").upsert({usuario: PILOTO.user.id, municipio_id: PILOTO.muni.id, nivel: S.avisos.pref.nivel, silencio: S.avisos.pref.silencio !== false, correo: S.avisos.pref.correo !== false, actualizado: new Date().toISOString()}).then(r => { if (r.error) toast("No se pudo guardar la preferencia en el piloto."); });
}
const b64u = s => { const p = (s + "===".slice((s.length + 3) % 4)).replace(/-/g, "+").replace(/_/g, "/"), b = atob(p); return Uint8Array.from(b, c => c.charCodeAt(0)); };
async function avActivar(){
  if (!avSoporte()) return;
  const per = Notification.permission === "granted" ? "granted" : await Notification.requestPermission().catch(() => "default");
  if (per !== "granted") { avPintar(); return toast(per === "denied" ? "Bloqueaste los avisos: puedes activarlos desde el candado junto a la dirección." : "No se activaron los avisos."); }
  if (avPushServidor()) {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: b64u(AV.cfg.push)});
      const j = sub.toJSON();
      const r = await PILOTO.sb.from("suscripciones").upsert({endpoint: j.endpoint, usuario: PILOTO.user.id, municipio_id: PILOTO.muni.id, p256dh: j.keys.p256dh, auth: j.keys.auth, dispositivo: navigator.userAgent.slice(0, 160)}, {onConflict: "endpoint"});
      if (r.error) throw r.error;
      S.avisos.push = j.endpoint; save();
    } catch(e) { toast("Los avisos quedan activos con PregonIA abierta; no se pudo suscribir este dispositivo para recibirlos cerrada."); }
  }
  avPintar(); notificar({nivel: "info", titulo: "Avisos activados", titular: S.avisos.push ? "Te llegarán aunque PregonIA esté cerrada." : "Te llegarán mientras PregonIA esté abierta o instalada.", medio: "PregonIA"}, true);
}
/* Al salir del piloto, este dispositivo deja de recibir avisos de esa cuenta. */
async function avisosAlSalir(){
  try { if (S.avisos.push && PILOTO.sb) { await PILOTO.sb.from("suscripciones").delete().eq("endpoint", S.avisos.push); const reg = await navigator.serviceWorker.getRegistration(); const sub = reg && await reg.pushManager.getSubscription(); if (sub) await sub.unsubscribe(); } } catch(e) {}
}
/* Al entrar al piloto: preferencias guardadas de la persona. */
async function avisosAlEntrar(){
  try { const r = await PILOTO.sb.from("avisos").select("nivel, silencio, correo").eq("usuario", PILOTO.user.id).maybeSingle(); if (r.data) { S.avisos.pref = r.data; save(); } } catch(e) {}
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return; const a = b.dataset.act;
  if (a === "avisos") avAbrir();
  if (a === "avisos-cerrar") avCerrar();
  if (a === "avisos-activar") avActivar();
  if (a === "avisos-probar") { const x = avEstado().lista[0]; notificar(x ? {...x, titulo: "Prueba · " + x.titulo} : {nivel: "info", titulo: "Aviso de prueba", titular: "Así se verán los avisos de PregonIA.", medio: "PregonIA"}, true).then(ok => toast(ok ? "Aviso de prueba enviado." : "No se pudo mostrar el aviso.")); }
  if (a === "avisos-leidos") { avEstado().lista.forEach(x => x.leida = true); save(); avBadge(); avPintar(); }
  if (AV.abierto && (a === "vocero" || a === "responder") && b.closest("#avisosPanel")) avCerrar();
});
document.addEventListener("change", e => {
  if (e.target.name === "avNivel") avGuardarPref({nivel: e.target.value});
  if (e.target.id === "avSilencio") avGuardarPref({silencio: e.target.checked});
  if (e.target.id === "avCorreo") avGuardarPref({correo: e.target.checked});
});
document.addEventListener("keydown", e => {
  if (!AV.abierto) return;
  if (e.key === "Escape") { e.preventDefault(); avCerrar(); return; }
  if (e.key === "Tab") { const f = [...document.querySelectorAll("#avisosPanel button, #avisosPanel input, #avisosPanel a[href]")].filter(x => x.offsetParent && !x.disabled); if (!f.length) return; const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
});
/* Cada vez que cambian las noticias (demo, noticias reales, piloto o captura), se revisan las reglas. */
const refrescarSinAvisos = refrescarNotas;
refrescarNotas = function(base){ refrescarSinAvisos(base); try { revisarAlertas(); } catch(e) {} };
/* Con noticias reales y avisos activos, la lectura se repite cada 10 minutos aunque la pestaña esté en segundo plano. */
setInterval(() => { if (typeof PILOTO !== "undefined" && PILOTO && PILOTO.activo) return; if (MODO.tipo === "real" && !MODO.cargando && (document.visibilityState === "visible" || avPermiso() === "granted")) cargarReales(true, true); }, 10 * 60000);
avBoton(); revisarAlertas();
/* Llegada desde una notificación (abre la campana en ese aviso) o desde el atajo «Avisos» del ícono instalado (abre la campana). */
(() => { const q = new URLSearchParams(location.search), g = q.get("alerta"), lista = q.has("avisos"); if (!g && !lista) return; const resto = location.search.slice(1).split("&").filter(x => x && !x.startsWith("alerta=") && !/^avisos(=|$)/.test(x)).join("&"); history.replaceState(null, "", location.pathname + (resto ? "?" + resto : "") + location.hash); setTimeout(() => avAbrir(g || undefined), 300); })();
navigator.serviceWorker?.addEventListener?.("message", e => { if (e.data && e.data.tipo === "abrir-aviso") avAbrir(e.data.g); });

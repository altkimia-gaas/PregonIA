/* Cuentas de Facebook e Instagram de medios locales y regionales.
   Un editor las inscribe en Ajustes › Fuentes y quedan en el listado de medios. Cómo se procesan:
   · Instagram: la lectura programada (piloto) y «Noticias reales» leen sus publicaciones por la API de Meta (Business Discovery)
     y las clasifican como cualquier nota. Requiere que PregonIA esté conectado con Meta y que la cuenta sea profesional.
   · Facebook: Meta solo permite leer páginas de terceros con un permiso que aprueba tras revisar la app; mientras no esté,
     sus publicaciones se ingresan con Agregar publicación (captura asistida), donde la cuenta ya aparece en la lista.
   En la demostración las inscritas se guardan en el navegador (ids 9000 a 9999); en el piloto, en la base (ids desde 10000).
   Estado y funciones van con var y declaraciones de función: la vista Fuentes puede dibujarse antes de que este archivo cargue. */
var META = {instagram: false, facebook: false, sabido: false};
var RED_EST = {};  // id → {ok, error, n, ts}: resultado de la última lectura
const RED_ID0 = 9000, RED_N = {instagram: "Instagram", facebook: "Facebook"};
function esRed(m){ return !!m && (m.m === "facebook" || m.m === "instagram"); }
S.redes ||= [];

function registrarRed(r){
  const previo = MED[r.id] || {};
  const m = {id: r.id, n: r.n, a: r.a, c: r.c || "", t: RED_N[r.red], l: "C", m: r.red, e: r.estado || "inscrita", o: previo.o || "", u: urlDe(r.red, r.u), usr: r.u,
    propia: !!r.propia, ins: r.ins || null, ult: r.ult || null, err: r.err || null};
  MED[m.id] = m;
  const i = CATALOG.findIndex(x => x.id === m.id);
  if (m.e === "retirado") { if (i >= 0) CATALOG.splice(i, 1); return m; }  // fuera del listado; MED se queda para las notas ya leídas
  if (i >= 0) CATALOG[i] = m; else CATALOG.push(m);
  return m;
}
// Cuentas del catálogo fijo: su usuario sale del enlace.
CATALOG.filter(esRed).forEach(m => { m.usr = usuarioDe(m.m, m.u) || ""; });
S.redes.forEach(r => registrarRed({...r, propia: true}));

function puedeInscribir(){ return typeof PILOTO === "undefined" || !PILOTO || !PILOTO.activo || PILOTO.editor; }
function redRetirable(m){ return puedeInscribir() && (m.propia || false); }
/* Estado que se muestra en Fuentes. */
function estadoRed(m){
  const M = META || {}, st = (RED_EST || {})[m.id] || (m.err ? {ok: false, error: m.err} : m.ult ? {ok: true, ts: Date.parse(m.ult)} : null);
  const activa = m.m === "instagram" ? M.instagram : M.facebook;
  if (!activa) return m.m === "instagram"
    ? {k: "requiere_ajuste", l: "Pendiente de Meta", o: M.sabido ? "Se leerá sola cuando PregonIA quede conectado con Meta. Mientras tanto, sus publicaciones se agregan con Agregar publicación." : "Se lee sola en pregonia.vercel.app, con PregonIA conectado con Meta. Aquí, con Agregar publicación."}
    : {k: "captura_asistida", l: "Captura asistida", o: "Meta no permite leer páginas de Facebook de terceros sin aprobar antes la app. Sus publicaciones se agregan con Agregar publicación, en Menciones."};
  if (st && st.ok === false) return {k: "restringido", l: "No se pudo leer", o: st.error || "Meta no entregó sus publicaciones."};
  return {k: "listo", l: "Lectura automática", o: st && st.ts ? `Leída ${ago(st.ts)}${Number.isFinite(st.n) ? ` · ${plural(st.n, "publicación reciente", "publicaciones recientes")}` : ""}.` : "Se lee con cada lectura de medios."};
}
function actualizarEstadoRedes(lista){ const ts = Date.now(); (lista || []).forEach(e => { if (!e.pendiente) RED_EST[e.id] = {...e, ts}; }); }
/* Para «Noticias reales» (sin base de datos): las inscritas en este navegador viajan en la consulta. */
function redesParam(){
  const l = S.redes.filter(r => r.estado !== "retirado").slice(0, 20).map(r => [r.id, r.red, r.u, r.a, r.c || "", r.n]);
  return l.length ? "&redes=" + encodeURIComponent(JSON.stringify(l)) : "";
}

/* Qué puede leer el servidor ahora (sin conexión con Meta, Instagram queda pendiente y Facebook en captura asistida). */
(async () => {
  if (!/^https?:$/.test(location.protocol)) return;
  try { const r = await fetch("/api/redes?estado"); if (!r.ok) return; const j = await r.json(); META = {instagram: !!j.instagram, facebook: !!j.facebook, sabido: true}; if (route() === "fuentes") render(); } catch(e) {}
})();

/* Inscripción */
const RED_F = {red: "instagram", verificada: null, insistir: false};
function redAbrir(){
  RED_F.verificada = null; RED_F.insistir = false;
  const terr = territorio(), local = COMUNAS_V.includes(terr[0]) ? terr[0] : "";
  const ov = document.createElement("div"); ov.className = "vid-back"; ov.id = "redBack";
  ov.innerHTML = `<section class="vid cap" role="dialog" aria-modal="true" aria-labelledby="redT">
    <header class="vid-h"><div><h2 id="redT">Inscribir cuenta de red social</h2><p>Un medio local o regional que publica en Instagram o Facebook. Queda en el listado de fuentes para todas las cuentas de PregonIA.</p></div><button class="btn ghost" type="button" data-act="red-cerrar" aria-label="Cerrar"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>
    <form class="cap-f" id="redForm" novalidate>
      <div class="cap-row">
        <label class="cap-l">Red<select id="redRed"><option value="instagram">Instagram</option><option value="facebook">Facebook</option></select></label>
        <label class="cap-l">Enlace o usuario<input id="redU" required autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="instagram.com/medio o @medio"></label>
      </div>
      <div class="cap-row">
        <label class="cap-l">Nombre del medio<input id="redN" required autocomplete="off" placeholder="Por ejemplo: Litoral Noticias"></label>
        <label class="cap-l">Alcance<select id="redA"><option value="local">Comunal</option><option value="regional">Regional</option><option value="nacional">Nacional</option></select></label>
      </div>
      <label class="cap-l" id="redCL">Comuna que cubre<select id="redC">${Object.entries(PROVINCIAS).map(([pv, cs]) => `<optgroup label="Provincia de ${esc(pv)}">${cs.map(c => `<option ${c === local ? "selected" : ""}>${esc(c)}</option>`).join("")}</optgroup>`).join("")}</select></label>
      <p class="hint" id="redHint" style="margin:0"></p>
      <p class="cap-err" id="redErr" role="alert" hidden></p>
      <div class="cap-acts"><button class="btn alt" type="submit" id="redOk">Inscribir</button><button class="btn" type="button" data-act="red-cerrar">Cancelar</button></div>
    </form></section>`;
  document.body.appendChild(ov); document.body.classList.add("vid-on"); redAbrir.origen = document.activeElement;
  redPintar(); $("#redU").focus();
}
function redPintar(){
  const red = $("#redRed").value, a = $("#redA").value;
  $("#redCL").firstChild.textContent = a === "local" ? "Comuna que cubre" : "Comuna principal (opcional)";
  if (a !== "local" && !$("#redC").querySelector('option[value=""]')) { $("#redC").insertAdjacentHTML("afterbegin", '<option value="">Toda la región</option>'); $("#redC").value = ""; }
  if (a === "local") $("#redC").querySelector('option[value=""]')?.remove();
  $("#redU").placeholder = red === "instagram" ? "instagram.com/medio o @medio" : "facebook.com/medio";
  $("#redHint").textContent = red === "instagram"
    ? (META.instagram ? "Se leerá sola en cada lectura de medios, si es una cuenta profesional (empresa o creador). PregonIA guarda solo un titular, un resumen propio y el enlace." : "Se leerá sola cuando PregonIA quede conectado con Meta, si es una cuenta profesional. Mientras tanto, sus publicaciones se agregan con Agregar publicación.")
    : (META.facebook ? "Se leerá sola en cada lectura de medios. PregonIA guarda solo un titular, un resumen propio y el enlace." : "Meta aún no permite a PregonIA leer páginas de Facebook de terceros. La cuenta queda en el listado y sus publicaciones se agregan con Agregar publicación, en Menciones.");
}
function redCerrar(){ $("#redBack")?.remove(); document.body.classList.remove("vid-on"); const o = redAbrir.origen; if (o && o.isConnected) o.focus(); }
function redError(msg, campo, info){ const e = $("#redErr"); e.textContent = msg; e.hidden = false; e.classList.toggle("info", !!info); if (campo) $(campo).focus(); }
async function redGuardar(ev){
  ev.preventDefault();
  const red = $("#redRed").value, u = usuarioDe(red, $("#redU").value), a = $("#redA").value, c = $("#redC").value;
  let n = $("#redN").value.trim().replace(/\s+/g, " ");
  if (!u) return redError(red === "instagram" ? "Escribe el enlace de la cuenta (instagram.com/usuario) o su @usuario. Un enlace a una publicación no sirve." : "Escribe el enlace de la página (facebook.com/pagina o facebook.com/profile.php?id=…). Los grupos no se pueden inscribir.", "#redU");
  const ya = CATALOG.find(m => m.m === red && (m.usr || "").toLowerCase() === u.toLowerCase());
  if (ya) return redError(`Ya está en el listado como «${ya.n}».`, "#redU");
  if (a === "local" && !c) return redError("Elige la comuna que cubre.", "#redC");
  const btn = $("#redOk");
  // Revisión con Meta (solo si esa red está conectada): que exista y se pueda leer. Si no se puede, se avisa y se deja inscribir igual.
  if ((red === "instagram" ? META.instagram : META.facebook) && !RED_F.insistir) {
    btn.disabled = true; btn.textContent = "Revisando la cuenta…";
    let v = null; try { const r = await fetch(`/api/redes?red=${red}&u=${encodeURIComponent(u)}`); v = await r.json(); } catch(e) {}
    btn.disabled = false; btn.textContent = "Inscribir";
    if (v && v.ok === false) { RED_F.insistir = true; btn.textContent = "Inscribir igual"; return redError(`${v.error}. Si la inscribes igual, quedará en el listado para agregar sus publicaciones a mano.`, null, true); }
    if (v && v.ok && !n) n = v.nombre || "";
    RED_F.verificada = v && v.ok ? v : null;
  }
  if (n.length < 2) return redError("Escribe el nombre del medio.", "#redN");
  btn.disabled = true; btn.textContent = "Inscribiendo…";
  let m;
  try {
    if (typeof PILOTO !== "undefined" && PILOTO && PILOTO.activo) {
      const {data, error} = await PILOTO.sb.rpc("inscribir_red", {p_red: red, p_usuario: u, p_nombre: n, p_ambito: a, p_comunas: c});
      if (error) throw new Error(error.message);
      m = registrarRed(filaARed(data));
    } else {
      const id = Math.max(RED_ID0, ...S.redes.map(r => r.id)) + 1;
      if (id >= 10000) throw new Error("Llegaste al máximo de cuentas en esta demostración.");
      const r = {id, red, u, n, a, c, ins: Date.now()}; S.redes.push(r); save(); m = registrarRed({...r, propia: true});
    }
  } catch(e) { btn.disabled = false; btn.textContent = "Inscribir"; return redError("No se pudo inscribir: " + (e.message || e)); }
  redCerrar();
  Object.assign(tState.fuente, {e: "redes", a: "todos"}); if (route() !== "fuentes") location.hash = "fuentes"; else render(true);
  const auto = red === "instagram" ? META.instagram : META.facebook, seg = RED_F.verificada && Number.isFinite(RED_F.verificada.seguidores) ? ` (${fmt(RED_F.verificada.seguidores)} seguidores)` : "";
  toast(`Inscribiste ${m.n}${seg}. ${auto ? "Sus publicaciones entran en la próxima lectura de medios." : "Ya aparece en Agregar publicación."}`);
  if (typeof MODO !== "undefined" && MODO.tipo === "real" && auto) cargarReales(true, true);
}
/* Fila de la base (piloto) → cuenta. */
function filaARed(f){ return {id: f.id, red: f.metodo, u: f.usuario_red || usuarioDe(f.metodo, f.url_lectura) || "", n: f.nombre, a: f.ambito, c: f.comunas || "", estado: f.estado, ult: f.ultima_lectura, err: f.error_lectura,
  propia: typeof PILOTO !== "undefined" && PILOTO && PILOTO.muni && f.inscrito_muni === PILOTO.muni.id}; }
/* Piloto: todas las cuentas de redes de la base, con su última lectura. Se llama antes de cargar las notas (necesitan su medio). */
async function cargarRedesPiloto(sb){
  const {data, error} = await sb.from("medios").select("id, nombre, ambito, comunas, metodo, url_lectura, usuario_red, estado, inscrito_muni, ultima_lectura, error_lectura").in("metodo", ["instagram", "facebook"]);
  if (error || !data) return;
  data.forEach(f => registrarRed(filaARed(f)));
}
async function redRetirar(id){
  const m = MED[id]; if (!m) return;
  if (typeof PILOTO !== "undefined" && PILOTO && PILOTO.activo) {
    const {error} = await PILOTO.sb.rpc("retirar_red", {p_id: id});
    if (error) return toast("No se pudo retirar: " + error.message);
    registrarRed({id, red: m.m, u: m.usr, n: m.n, a: m.a, c: m.c, estado: "retirado"}); render(); toast(`Retiraste ${m.n}: deja de leerse. Sus notas ya leídas se conservan.`); return;
  }
  const r = S.redes.find(x => x.id === id); if (!r) return;
  r.estado = "retirado"; save(); registrarRed({...r, propia: true}); render();
  toast(`Retiraste ${m.n}: deja de leerse.`, () => { delete r.estado; save(); registrarRed({...r, propia: true}); render(); });
}
document.addEventListener("click", e => {
  if (e.target.id === "redBack") return redCerrar();
  const b = e.target.closest("[data-act]"); if (!b) return; const a = b.dataset.act;
  if (a === "red-abrir") redAbrir();
  if (a === "red-cerrar") redCerrar();
  if (a === "red-retirar") redRetirar(Number(b.dataset.id));
});
document.addEventListener("change", e => { if (["redRed", "redA"].includes(e.target.id)) { RED_F.insistir = false; $("#redOk").textContent = "Inscribir"; $("#redErr").hidden = true; redPintar(); } });
document.addEventListener("input", e => { if (e.target.id === "redU" && RED_F.insistir) { RED_F.insistir = false; $("#redOk").textContent = "Inscribir"; $("#redErr").hidden = true; } });
document.addEventListener("submit", e => { if (e.target.id === "redForm") redGuardar(e); });
document.addEventListener("keydown", e => {
  if (!$("#redBack")) return;
  if (e.key === "Escape") { e.preventDefault(); redCerrar(); return; }
  if (e.key === "Tab") { const f = [...document.querySelectorAll("#redBack input, #redBack select, #redBack button:not(:disabled)")].filter(x => x.offsetParent); if (!f.length) return; const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
});
if (route() === "fuentes") render();

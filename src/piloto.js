
/* Modo piloto (etapa 2): inicio de sesión con Supabase y datos compartidos por municipio.
   Las noticias vienen de la base (lectura programada cada 30 minutos); temas, marcas, respuestas aprobadas y publicaciones
   agregadas se guardan en la base y las ve todo el equipo. La base registra sola quién hizo qué (tabla actividad).
   Sin sesión, la aplicación sigue siendo la demostración de siempre. */
PILOTO = {activo: false, disponible: false, sb: null, user: null, perfil: null, muni: null, editor: false, snap: null, timer: null, sinc: false, pendiente: false, estado: "", lectura: null};
const ROLES = {admin: "Administración", comunicaciones: "Comunicaciones", alcalde: "Alcalde", directivo: "Equipo directivo", lector: "Solo lectura"};
const cargarSupabase = () => cargarScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js", "supabase");
const ICO_USR = '<circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-3.6 4.4-5.4 8-5.4s6.5 1.8 8 5.4"/>';

/* Acceso en la barra superior */
function pintarAcceso(){
  const tools = $(".tools"); if (!tools || !PILOTO.disponible) return;
  let b = $("#cuentaBtn");
  if (!b) { b = document.createElement("button"); b.id = "cuentaBtn"; b.type = "button"; b.className = "helpbtn"; tools.insertBefore(b, tools.firstChild); }
  if (PILOTO.activo) { const n = PILOTO.perfil.nombre || PILOTO.user.email; b.dataset.act = "cuenta"; b.setAttribute("aria-haspopup", "menu"); b.innerHTML = `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICO_USR}</svg><span>${esc(n.split(" ")[0])}</span>`; b.title = `${n} · ${ROLES[PILOTO.perfil.rol] || PILOTO.perfil.rol}`; }
  else { b.dataset.act = "login"; b.removeAttribute("aria-haspopup"); b.innerHTML = `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICO_USR}</svg><span>Ingresar</span>`; b.title = "Ingresar al piloto"; }
}
function pintarPiloto(){
  const el = $("#demo"), p = PILOTO, l = p.lectura, n = NOTAS.length;
  el.className = "demo real";
  el.innerHTML = `<span class="demo-txt"><b>Piloto</b>${esc(p.muni.nombre)}<span class="demo-mas"> · ${plural(n, "nota", "notas")} en 30 días${l ? ` · última lectura de medios ${horaCorta(l.fin)} (${l.fuentes_ok} de ${l.fuentes_total} fuentes)` : " · aún sin lecturas de medios"}${p.estado ? " · " + p.estado : ""}</span></span>${p.editor ? "" : `<span class="solo-lect">Solo lectura</span>`}`;
}

/* Diálogos: ingreso, nueva contraseña y cuenta sin municipio */
function dialogo(id, titulo, sub, cuerpo){
  cerrarDialogo();
  const ov = document.createElement("div"); ov.className = "vid-back"; ov.id = "dlgBack";
  ov.innerHTML = `<section class="vid cap dlg" role="dialog" aria-modal="true" aria-labelledby="${id}T"><header class="vid-h"><div><h2 id="${id}T">${titulo}</h2><p>${sub}</p></div><button class="btn ghost" type="button" data-act="dlg-close" aria-label="Cerrar"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>${cuerpo}</section>`;
  dialogo.origen = document.activeElement; document.body.appendChild(ov); document.body.classList.add("vid-on");
  const f = ov.querySelector("input, button.btn:not(.ghost)"); if (f) f.focus();
}
function cerrarDialogo(){ const o = $("#dlgBack"); if (!o) return; o.remove(); document.body.classList.remove("vid-on"); if (dialogo.origen && dialogo.origen.isConnected) dialogo.origen.focus(); }
function abrirLogin(){
  dialogo("login", "Ingresar a PregonIA", "Para los equipos municipales del piloto. Si aún no tienes cuenta, pide una invitación a ALTKimia.", `
    <form class="cap-f" id="loginForm" novalidate>
      <label class="cap-l">Correo<input id="lgCorreo" type="email" autocomplete="username" inputmode="email" required></label>
      <label class="cap-l">Contraseña<input id="lgClave" type="password" autocomplete="current-password" required></label>
      <p class="cap-err" id="lgErr" role="alert" hidden></p>
      <div class="cap-acts"><button class="btn alt" type="submit" id="lgOk">Ingresar</button><button class="btn" type="button" data-act="dlg-close">Cancelar</button><button class="btn ghost" type="button" data-act="olvide">Olvidé mi contraseña</button></div>
    </form>`);
}
function pedirClave(tipo){
  dialogo("clave", tipo === "invite" ? "Crea tu contraseña" : "Nueva contraseña", "Mínimo 10 caracteres. Úsala junto a tu correo para ingresar desde cualquier equipo.", `
    <form class="cap-f" id="claveForm" novalidate>
      <label class="cap-l">Contraseña<input id="ckA" type="password" autocomplete="new-password" minlength="10" required></label>
      <label class="cap-l">Repítela<input id="ckB" type="password" autocomplete="new-password" minlength="10" required></label>
      <p class="cap-err" id="ckErr" role="alert" hidden></p>
      <div class="cap-acts"><button class="btn alt" type="submit">Guardar contraseña</button></div>
    </form>`);
}
function errorEn(id, msg, foco){ const e = $(id); e.textContent = msg; e.hidden = false; if (foco) $(foco).focus(); }
async function ingresar(e){
  e.preventDefault();
  const correo = $("#lgCorreo").value.trim(), clave = $("#lgClave").value, ok = $("#lgOk");
  if (!/^\S+@\S+\.\S+$/.test(correo)) return errorEn("#lgErr", "Escribe tu correo.", "#lgCorreo");
  if (!clave) return errorEn("#lgErr", "Escribe tu contraseña.", "#lgClave");
  ok.disabled = true; ok.textContent = "Ingresando…";
  const {data, error} = await PILOTO.sb.auth.signInWithPassword({email: correo, password: clave});
  if (error) { ok.disabled = false; ok.textContent = "Ingresar"; return errorEn("#lgErr", /invalid/i.test(error.message) ? "Correo o contraseña incorrectos." : "No se pudo ingresar: " + error.message, "#lgClave"); }
  cerrarDialogo(); await entrarPiloto(data.user);
}
async function guardarClave(e){
  e.preventDefault();
  const a = $("#ckA").value, b = $("#ckB").value;
  if (a.length < 10) return errorEn("#ckErr", "Usa al menos 10 caracteres.", "#ckA");
  if (a !== b) return errorEn("#ckErr", "Las contraseñas no coinciden.", "#ckB");
  const {error} = await PILOTO.sb.auth.updateUser({password: a});
  if (error) return errorEn("#ckErr", "No se pudo guardar: " + error.message);
  cerrarDialogo(); toast("Contraseña guardada.");
}
async function olvide(){
  const correo = ($("#lgCorreo") && $("#lgCorreo").value.trim()) || "";
  if (!/^\S+@\S+\.\S+$/.test(correo)) return errorEn("#lgErr", "Escribe tu correo y vuelve a tocar «Olvidé mi contraseña».", "#lgCorreo");
  const {error} = await PILOTO.sb.auth.resetPasswordForEmail(correo, {redirectTo: location.origin + "/"});
  if (error) return errorEn("#lgErr", "No se pudo enviar el correo: " + error.message);
  cerrarDialogo(); toast("Te enviamos un correo para crear una nueva contraseña.");
}
function menuCuenta(b){
  if ($("#shrPop")) { cerrarMenu(); return; }
  const p = PILOTO, m = document.createElement("div"); m.className = "shr-pop"; m.id = "shrPop"; m.setAttribute("role", "menu");
  m.innerHTML = `<div class="cta-info"><b>${esc(p.perfil.nombre || p.user.email)}</b><span>${esc(p.user.email)}</span><span>${esc(ROLES[p.perfil.rol] || p.perfil.rol)} · ${esc(p.muni.nombre)}</span></div><button type="button" role="menuitem" data-act="recargar-piloto">Actualizar datos</button><button type="button" role="menuitem" data-act="salir">Salir</button>`;
  document.body.appendChild(m); m._origen = b; ubicarMenu(); m.querySelector("button").focus({preventScroll: true});
}

/* Sesión */
async function entrarPiloto(user){
  const sb = PILOTO.sb;
  const {data: perfil, error} = await sb.from("perfiles").select("nombre, rol, municipio_id, municipios(id, comuna, nombre, plan)").eq("id", user.id).maybeSingle();
  if (error || !perfil || !perfil.municipios) {
    dialogo("sinmuni", "Tu cuenta aún no tiene municipio", "Ingresaste bien, pero falta asignarte un municipio y un rol. Pídeselo a ALTKimia o al administrador del piloto.", `<div class="cap-f"><p class="hint" style="margin:0">${esc(user.email)}</p><div class="cap-acts"><button class="btn" type="button" data-act="salir">Salir</button></div></div>`);
    return;
  }
  Object.assign(PILOTO, {activo: true, user, perfil, muni: perfil.municipios, editor: ["admin", "comunicaciones"].includes(perfil.rol)});
  if (COMUNAS.includes(PILOTO.muni.comuna)) S.org = PILOTO.muni.comuna;
  $("#org").disabled = true; $("#org").title = "En el piloto ves solo tu municipio";
  pintarAcceso();
  try { await cargarDatosPiloto(); toast(`Hola, ${(perfil.nombre || "").split(" ")[0] || "bienvenido"}. Estás en el piloto de ${PILOTO.muni.nombre}.`); }
  catch(e) { toast("No se pudieron cargar los datos del piloto: " + (e.message || e)); }
}
const capAFila = x => ({id: x.id, municipio_id: PILOTO.muni.id, medio_id: MED[x.m] && x.m < FB_ID0 ? x.m : null, medio_nombre: MED[x.m] ? MED[x.m].n : "Página de Facebook", medio_ambito: MED[x.m] ? MED[x.m].a : "local",
  url: x.url || null, titulo: x.t, resumen: x.res, palabras: x.x, tono: x.tono, grupo: x.g, publicado: new Date(x.ts).toISOString(), indice: norm(x.t + " " + x.res + " " + x.x).slice(0, 1000)});
function paginaFB(nombre, ambito){
  let p = S.fbPaginas.find(z => norm(z.n) === norm(nombre));
  if (!p) { p = {id: FB_ID0 + S.fbPaginas.length + 1, n: nombre, a: ambito || "local", c: ambito === "local" ? S.org : ""}; S.fbPaginas.push(p); registrarPagina(p); }
  return p.id;
}
const configDe = c => ({perfil: c.perfil, temas: c.temas, sugeridos: c.sugeridos, caracterizada: c.caracterizada, base: c.base || null, hitos: c.hitos || [], prep: c.prep || {}});
async function cargarDatosPiloto(){
  const sb = PILOTO.sb, mid = PILOTO.muni.id, org = S.org, desde = new Date(Date.now() - 32 * DAY).toISOString();
  const pide = q => q.then(r => { if (r.error) throw new Error(r.error.message); return r.data; });
  const [men, mar, com, cap, lec, mun] = await Promise.all([
    pide(sb.from("menciones").select("tono, resumen, palabras, grupo, notas!inner(id, medio_id, url, titulo, publicado)").eq("municipio_id", mid).eq("rel", true).gte("notas.publicado", desde).limit(5000)),
    pide(sb.from("marcas").select("grupo, tipo").eq("municipio_id", mid)),
    pide(sb.from("comunicados").select("id, grupo, pieza, origen, texto, creado").eq("municipio_id", mid).order("creado", {ascending: false}).limit(300)),
    pide(sb.from("capturas").select("*").eq("municipio_id", mid).gte("publicado", desde)),
    pide(sb.from("lecturas").select("fin, fuentes_ok, fuentes_total").not("fin", "is", null).order("id", {ascending: false}).limit(1)),
    pide(sb.from("municipios").select("config").eq("id", mid).single())
  ]);
  const c = cuenta();
  if (mun.config && mun.config.temas) Object.assign(c, mun.config);
  else if (PILOTO.editor) await pide(sb.from("municipios").update({config: configDe(c)}).eq("id", mid).select("id"));  // primera vez: se sube la caracterización actual
  const notas = men.filter(r => MED[r.notas.medio_id]).map(r => { const n = r.notas, t = n.titulo, res = r.resumen || t, x = r.palabras || "";
    return {id: n.id, m: n.medio_id, ts: Date.parse(n.publicado), t, b: "", x, tono: r.tono || "neu", res, g: String(r.grupo || n.id), url: n.url, hay: norm(t + " " + res + " " + x + " " + org + " comuna"), ht: norm(t), real: true}; });
  Object.keys(S.fp).forEach(k => { if (k.startsWith(org + ":")) delete S.fp[k]; });
  Object.keys(S.resp).forEach(k => { if (k.startsWith(org + ":")) delete S.resp[k]; });
  mar.forEach(m => { (m.tipo === "respondida" ? S.resp : S.fp)[org + ":" + m.grupo] = true; });
  S.comunicados = S.comunicados.filter(x => x.org !== org).concat(com.map(x => ({org, ts: Date.parse(x.creado), pieza: x.pieza, origen: x.origen || "", texto: x.texto, g: x.grupo, dbid: x.id})));
  S.capturas = S.capturas.filter(x => x.org !== org).concat(cap.map(x => ({id: x.id, org, m: x.medio_id && MED[x.medio_id] ? x.medio_id : paginaFB(x.medio_nombre, x.medio_ambito), via: "facebook", ts: Date.parse(x.publicado), t: x.titulo, res: x.resumen || x.titulo, x: x.palabras || "", tono: x.tono || "neu", g: x.grupo || x.id, url: x.url || "", hay: (x.indice || "") + " " + norm(org) + " comuna"})));
  PILOTO.lectura = lec[0] || null; PILOTO.estado = "";
  MODO = {...MODO, tipo: "piloto", info: null, cargando: false};
  guardarLocal(); refrescarNotas(notas); PILOTO.snap = serializar();
  pintarModo(); render();
}

/* Sincronización: cada vez que la aplicación guarda, se comparan los datos con la última versión de la base y se envían solo los cambios. */
function serializar(){
  const org = S.org, lista = o => Object.keys(o).filter(k => k.startsWith(org + ":") && o[k]).map(k => k.slice(org.length + 1)).sort();
  return {fp: lista(S.fp), resp: lista(S.resp), cap: S.capturas.filter(x => x.org === org).map(x => x.id), com: S.comunicados.filter(x => x.org === org && !x.dbid).length, config: JSON.stringify(configDe(cuenta()))};
}
const guardarLocal = save;
save = function(){ guardarLocal(); if (PILOTO.activo) { clearTimeout(PILOTO.timer); PILOTO.timer = setTimeout(sincronizar, 400); } };
async function sincronizar(){
  if (!PILOTO.activo || !PILOTO.snap) return;
  if (PILOTO.sinc) { PILOTO.pendiente = true; return; }
  const ahora = serializar(), antes = PILOTO.snap, dif = (a, b) => a.filter(x => !b.includes(x));
  const hay = dif(ahora.fp, antes.fp).length || dif(antes.fp, ahora.fp).length || dif(ahora.resp, antes.resp).length || dif(antes.resp, ahora.resp).length || ahora.com || dif(ahora.cap, antes.cap).length || dif(antes.cap, ahora.cap).length || ahora.config !== antes.config;
  if (!hay) return;
  if (!PILOTO.editor) { toast("Tu perfil es de solo lectura: ese cambio no se guarda."); return cargarDatosPiloto().catch(() => {}); }
  PILOTO.sinc = true; PILOTO.estado = "guardando…"; pintarModo();
  const sb = PILOTO.sb, mid = PILOTO.muni.id, org = S.org, ops = [];
  const pide = q => Promise.resolve(q).then(r => { if (r && r.error) throw new Error(r.error.message); return r && r.data; });
  try {
    for (const [k, tipo] of [["fp", "no_corresponde"], ["resp", "respondida"]]) {
      const add = dif(ahora[k], antes[k]), del = dif(antes[k], ahora[k]);
      if (add.length) ops.push(pide(sb.from("marcas").upsert(add.map(grupo => ({municipio_id: mid, grupo, tipo})), {onConflict: "municipio_id,grupo,tipo", ignoreDuplicates: true})));
      if (del.length) ops.push(pide(sb.from("marcas").delete().eq("municipio_id", mid).eq("tipo", tipo).in("grupo", del)));
    }
    S.comunicados.filter(x => x.org === org && !x.dbid).forEach(x => ops.push(pide(sb.from("comunicados").insert({municipio_id: mid, grupo: x.g || null, pieza: x.pieza, origen: x.origen || null, texto: x.texto}).select("id").single()).then(d => { x.dbid = d.id; })));
    const capAdd = dif(ahora.cap, antes.cap), capDel = dif(antes.cap, ahora.cap);
    if (capAdd.length) ops.push(pide(sb.from("capturas").upsert(S.capturas.filter(x => x.org === org && capAdd.includes(x.id)).map(capAFila), {onConflict: "id", ignoreDuplicates: true})));
    if (capDel.length) ops.push(pide(sb.from("capturas").delete().eq("municipio_id", mid).in("id", capDel)));
    if (ahora.config !== antes.config) ops.push(pide(sb.from("municipios").update({config: JSON.parse(ahora.config), actualizado: new Date().toISOString()}).eq("id", mid)));
    await Promise.all(ops);
    guardarLocal(); PILOTO.snap = serializar(); PILOTO.estado = "cambios guardados " + horaHM(Date.now());
  } catch(e) {
    PILOTO.estado = ""; toast("No se pudo guardar en la base (" + (e.message || e) + "). Recargamos los datos del equipo.");
    await cargarDatosPiloto().catch(() => {});
  } finally {
    PILOTO.sinc = false; pintarModo();
    if (PILOTO.pendiente) { PILOTO.pendiente = false; sincronizar(); }
  }
}
async function salir(){
  try { await PILOTO.sb.auth.signOut(); } catch(e) {}
  try { localStorage.removeItem(KEY); localStorage.setItem(MODO_KEY, "demo"); } catch(e) {}  // en equipos compartidos no queda copia de los datos del municipio
  location.hash = "inicio"; location.reload();
}

/* Eventos */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return; const a = b.dataset.act;
  if (a === "login") abrirLogin();
  if (a === "dlg-close") cerrarDialogo();
  if (a === "olvide") olvide();
  if (a === "cuenta") menuCuenta(b);
  if (a === "salir") { cerrarMenu(); salir(); }
  if (a === "recargar-piloto") { cerrarMenu(); cargarDatosPiloto().then(() => toast("Datos actualizados.")).catch(er => toast("No se pudieron actualizar: " + er.message)); }
});
document.addEventListener("click", e => { if (e.target.id === "dlgBack") cerrarDialogo(); });
document.addEventListener("submit", e => { if (e.target.id === "loginForm") ingresar(e); if (e.target.id === "claveForm") guardarClave(e); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && $("#dlgBack")) { e.preventDefault(); cerrarDialogo(); } });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && PILOTO.activo && !PILOTO.sinc && !PILOTO.timer) cargarDatosPiloto().catch(() => {}); });
setInterval(() => { if (PILOTO.activo && document.visibilityState === "visible" && !PILOTO.sinc) cargarDatosPiloto().catch(() => {}); }, 5 * 60000);

(async function iniciarPiloto(){
  if (!/^https?:$/.test(location.protocol)) return;
  let cfg; try { cfg = await (await fetch("/api/config", {cache: "no-store"})).json(); } catch(e) { return; }
  if (!cfg || !cfg.supabase) return;
  const tipoEnlace = new URLSearchParams(location.hash.slice(1)).get("type");  // invite o recovery cuando se llega desde un correo de Supabase
  const lib = await cargarSupabase().catch(() => null); if (!lib) return;
  PILOTO.sb = lib.createClient(cfg.supabase.url, cfg.supabase.key, {auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: true}});
  PILOTO.disponible = true; pintarAcceso();
  PILOTO.sb.auth.onAuthStateChange(ev => { if (ev === "PASSWORD_RECOVERY") pedirClave("recovery"); });
  const {data: {session}} = await PILOTO.sb.auth.getSession();
  if (/access_token=|type=/.test(location.hash)) history.replaceState(null, "", location.pathname + location.search + "#inicio");
  if (session) { await entrarPiloto(session.user); if (tipoEnlace === "invite" || tipoEnlace === "recovery") pedirClave(tipoEnlace); }
})();

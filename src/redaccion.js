/* Redacción · cuenta privada del editor de PregonIA para las cuentas de Facebook e Instagram del medio.
   Flujo: territorios elegidos → propuestas con puntaje de impacto → redacción con IA (neutral estricta) → revisión y edición
   → aprobación (siempre manual) → programación → publicación. En la fase 1 se publica descargando las piezas y copiando el texto;
   a la hora programada llega un aviso al celular. En la fase 2 se conecta la API de Meta y la publicación queda automática.
   Modos: «editor» (Supabase, con la sesión de alguien inscrito en la tabla editores) y «prueba» (solo en localhost, datos ficticios
   guardados en el navegador). Fuera de localhost, sin sesión de editor, la página no muestra nada más que el ingreso. */
const RD = {modo: null, sb: null, user: null, cfgPub: null, cfg: null, props: [], posts: [], post: null, fmt: "feed", lam: 0, ia: null, voz: null, reel: {}, guardando: null, timer: null, anim: 0, fb: null};
const RD_LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
const RD_KEY = "pregonia-redaccion-prueba-v1";
const RD_ETIQUETA_IA = "Resumen elaborado con apoyo de IA y revisado por el equipo de El Pregonero.";
const RD_PILOTO = ["Casablanca", "Algarrobo", "El Quisco", "El Tabo", "Cartagena", "San Antonio"];
const RD_CFG0 = {comunas: RD_PILOTO, nacional: true, umbral: 80, silencio: true, resumen_hora: 8, cercanos: ["Casablanca", "Rodrigo Martínez", "Partido Republicano"], meta_diaria: 4};
const RD_HORARIOS = ["08:30", "12:30", "18:30", "21:00", "10:30", "15:30", "20:00", "07:30", "13:30", "22:00"];
const RD_ESTADOS = {borrador: "Borrador", aprobado: "Aprobado", programado: "Programado", publicado: "Publicado", descartado: "Descartado"};

/* Utilidades */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const rdNorm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const slug = s => rdNorm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "pieza";
const ICO = {
  buscar: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', campana: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0"/>',
  salir: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>', dl: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>', copiar: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  ia: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/>', ok: '<path d="M5 12l5 5 9-10"/>', reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  atras: '<path d="M15 6l-6 6 6 6"/>', compartir: '<path d="M12 15V4M8 8l4-4 4 4M5 13v6h14v-6"/>', voz: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>'
};
const ico = k => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICO[k]}</svg>`;
function toast(msg){ const t = $("#rdToast"); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 4200); }
const hace = ts => { const m = Math.round((Date.now() - ts) / 6e4); if (m < 60) return `hace ${Math.max(1, m)} min`; const h = Math.round(m / 60); return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`; };
const fechaHora = ts => new Date(ts).toLocaleString("es-CL", {weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"});
const horaHM = ts => new Date(ts).toLocaleTimeString("es-CL", {hour: "2-digit", minute: "2-digit"});
const diaClave = ts => { const d = new Date(ts); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const localInput = ts => { const d = new Date(ts); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "x" + Math.random().toString(36).slice(2) + Date.now().toString(36));

/* ─── Almacén: Supabase (editor) o navegador (prueba) ─── */
const prueba = {
  leer(){ try { return JSON.parse(localStorage.getItem(RD_KEY) || "null") || {}; } catch(e) { return {}; } },
  escribir(d){ try { localStorage.setItem(RD_KEY, JSON.stringify(d)); } catch(e) { toast("El navegador no dejó guardar los cambios."); } }
};
const PRUEBA_AUTS = typeof impAutoridades === "function" && typeof RD_PRUEBA_AUT !== "undefined" ? impAutoridades(RD_PRUEBA_AUT, variantesNombre) : [];
const store = {
  async cfg(){
    if (RD.modo === "prueba") return {...RD_CFG0, ...(prueba.leer().cfg || {})};
    const {data, error} = await RD.sb.from("redaccion_config").select("*").eq("usuario", RD.user.id).maybeSingle();
    if (error) throw error;
    if (data) return {...RD_CFG0, ...data};
    const nuevo = {usuario: RD.user.id, ...RD_CFG0};
    const r = await RD.sb.from("redaccion_config").insert(nuevo).select("*").single(); if (r.error) throw r.error; return r.data;
  },
  async guardarCfg(c){
    if (RD.modo === "prueba") { const d = prueba.leer(); d.cfg = c; prueba.escribir(d); return; }
    const {usuario, resumen_enviado, ...resto} = c;
    const {error} = await RD.sb.from("redaccion_config").update({...resto, actualizado: new Date().toISOString()}).eq("usuario", RD.user.id); if (error) throw error;
  },
  async propuestas(){
    if (RD.modo === "prueba") {
      const d = prueba.leer(), c = RD.cfg, est = d.estados || {};
      const notas = RD_PRUEBA_NOTAS.filter(n => n.comunas.some(x => c.comunas.includes(x) || (x === "Región" && c.nacional)));
      return impAgrupar(notas).map(g => {
        const imp = impPuntaje(g, {autoridades: PRUEBA_AUTS, cercanos: c.cercanos}), lead = [...g.notas].sort((a, b) => a.ts - b.ts)[0];
        return {id: g.id, titulo: lead.titulo, resumen: lead.desc, comunas: [...new Set(g.notas.flatMap(n => n.comunas))], alcance: imp.alcance, puntaje: imp.puntaje, senales: imp.senales, detalle: imp.detalle,
          notas: g.notas, sensible: imp.sensible, cercanos: imp.cercanos, estado: (est[g.id] || {}).estado || "nueva", ia: false, detectado: new Date(lead.ts).toISOString(), ultima: new Date(imp.ultima).toISOString()};
      });
    }
    const desde = new Date(Date.now() - 4 * 864e5).toISOString();
    const {data, error} = await RD.sb.from("redaccion_propuestas").select("*").gte("actualizado", desde).order("puntaje", {ascending: false}).limit(300);
    if (error) throw error; return data || [];
  },
  async marcarPropuesta(id, estado){
    if (RD.modo === "prueba") { const d = prueba.leer(); (d.estados ||= {})[id] = {estado}; prueba.escribir(d); return; }
    const {error} = await RD.sb.from("redaccion_propuestas").update({estado}).eq("id", id); if (error) throw error;
  },
  async posts(){
    if (RD.modo === "prueba") return (prueba.leer().posts || []).sort((a, b) => Date.parse(b.actualizado) - Date.parse(a.actualizado));
    const {data, error} = await RD.sb.from("redaccion_posts").select("*").order("actualizado", {ascending: false}).limit(300);
    if (error) throw error; return data || [];
  },
  async guardarPost(p){
    p.actualizado = new Date().toISOString();
    if (RD.modo === "prueba") { const d = prueba.leer(); d.posts = (d.posts || []).filter(x => x.id !== p.id).concat([p]); prueba.escribir(d); return p; }
    const fila = {id: p.id, propuesta_id: p.propuesta_id, estado: p.estado, titulo: p.titulo, contenido: p.contenido, formatos: p.formatos, comunas: p.comunas, sensible: p.sensible,
      programado: p.programado, recordado: p.recordado || false, publicado: p.publicado, enlaces: p.enlaces || null, aprobado: p.aprobado, aprobado_por: p.aprobado_por, revision: p.revision || null, meta: p.meta || null, actualizado: p.actualizado};
    const {error} = await RD.sb.from("redaccion_posts").upsert(fila, {onConflict: "id"}); if (error) throw error; return p;
  }
};

/* ─── Arranque y acceso ─── */
async function iniciar(){
  pintarHerramientas();
  let cfg = null;
  if (/^https?:$/.test(location.protocol)) { try { const r = await fetch("/api/config", {cache: "no-store"}); if (r.ok) cfg = await r.json(); } catch(e) {} }
  RD.cfgPub = cfg || {};
  if (cfg && cfg.supabase) {
    const lib = await pzScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js", "supabase").catch(() => null);
    if (!lib) return pantallaError("No se pudo cargar el acceso. Revisa la conexión y recarga la página.");
    RD.sb = lib.createClient(cfg.supabase.url, cfg.supabase.key, {auth: {persistSession: true, autoRefreshToken: true}});
    const {data: {session}} = await RD.sb.auth.getSession();
    if (session) return entrarEditor(session.user);
    return pantallaAcceso();
  }
  if (RD_LOCAL) return entrarPrueba();
  pantallaError("Redacción no está disponible en este sitio.");
}
function pantallaError(msg){ $("#rdMain").innerHTML = `<div class="acceso"><h2>Redacción</h2><p class="lead">${esc(msg)}</p><a class="btn" href="/">Volver a PregonIA</a></div>`; }
function pantallaAcceso(err){
  $("#rdTabs").hidden = true; pintarHerramientas();
  $("#rdMain").innerHTML = `<form class="acceso" id="rdLogin" novalidate>
    <h2>Redacción de PregonIA</h2><p class="lead">Espacio privado del editor de las cuentas de El Pregonero en Facebook e Instagram.</p>
    <label class="campo">Correo<input class="inp" id="rdCorreo" type="email" autocomplete="username" required></label>
    <label class="campo">Contraseña<input class="inp" id="rdClave" type="password" autocomplete="current-password" required></label>
    <p class="err" id="rdErr" role="alert" ${err ? "" : "hidden"}>${esc(err || "")}</p>
    <div class="acciones"><button class="btn pri" type="submit" id="rdEntrar">Ingresar</button><a class="btn ghost" href="/">Volver a PregonIA</a></div>
    ${RD_LOCAL ? `<p class="info" style="margin-top:14px">En este computador también puedes <button class="btn sm" type="button" data-act="prueba">probar con datos ficticios</button></p>` : ""}
  </form>`;
  $("#rdCorreo").focus();
}
async function ingresar(e){
  e.preventDefault();
  const correo = $("#rdCorreo").value.trim(), clave = $("#rdClave").value, b = $("#rdEntrar");
  if (!correo || !clave) return pantallaAcceso("Escribe tu correo y tu contraseña.");
  b.disabled = true; b.textContent = "Ingresando…";
  const {data, error} = await RD.sb.auth.signInWithPassword({email: correo, password: clave});
  if (error) return pantallaAcceso(/invalid/i.test(error.message) ? "Correo o contraseña incorrectos." : "No se pudo ingresar: " + error.message);
  entrarEditor(data.user);
}
async function entrarEditor(user){
  const {data, error} = await RD.sb.rpc("es_editor");
  if (error) return pantallaError("La base aún no tiene Redacción. Hay que correr de nuevo supabase/esquema.sql en Supabase.");
  if (!data) { RD.user = user; RD.modo = "sin-permiso"; pintarHerramientas(); return pantallaError("Tu cuenta no está habilitada como editor de PregonIA. Esta sección es privada."); }
  RD.user = user; RD.modo = "editor"; await cargarTodo();
}
async function entrarPrueba(){ RD.modo = "prueba"; RD.user = {id: "prueba", email: "editor@prueba"}; await cargarTodo(); }
async function salir(){ if (RD.sb) await RD.sb.auth.signOut().catch(() => {}); location.reload(); }
async function cargarTodo(){
  try { RD.cfg = await store.cfg(); [RD.props, RD.posts] = await Promise.all([store.propuestas(), store.posts()]); }
  catch(e) { return pantallaError("No se pudieron cargar los datos: " + (e.message || e)); }
  RD.ia = iaDisponible(); RD.voz = vozDisponible(); RD.fb = facebookEstado();
  if (RD.modo === "editor") sincronizarFacebook();
  $("#rdTabs").hidden = false; pintarHerramientas(); abrirDesdeEnlace(); render();
}
function abrirDesdeEnlace(){
  const q = new URLSearchParams(location.search), post = q.get("post"), p = q.get("p");
  if (post) location.hash = "post/" + post;
  if (p) RD.resaltar = p;
  if (post || p) history.replaceState(null, "", location.pathname + location.hash);
}
function pintarHerramientas(){
  const t = $("#rdTools"); if (!t) return;
  if (!RD.modo || RD.modo === "sin-permiso") { t.innerHTML = RD.user ? `<button class="btn sm" type="button" data-act="salir">${ico("salir")}Cerrar sesión</button>` : ""; return; }
  t.innerHTML = `<span class="modo">${RD.modo === "prueba" ? "<b>Modo prueba</b> · datos ficticios en este navegador" : `<b>Editor</b> · ${esc(RD.user.email)}`}</span>
    <button class="btn sm" type="button" data-act="buscar">${ico("buscar")}Buscar ahora</button>
    <button class="btn sm" type="button" data-act="salir">${ico("salir")}Cerrar sesión</button>`;
}

/* ─── Navegación ─── */
const ruta = () => { const h = (location.hash || "#propuestas").slice(1); return h.startsWith("post/") ? {v: "post", id: h.slice(5)} : {v: ["propuestas", "publicaciones", "calendario", "ajustes"].includes(h) ? h : "propuestas"}; };
const enTerritorio = p => (p.comunas || []).some(c => RD.cfg.comunas.includes(c) || (c === "Región" && RD.cfg.nacional));
const propuestasVisibles = () => RD.props.filter(enTerritorio);
function pintarTabs(){
  const r = ruta().v, nuevas = propuestasVisibles().filter(p => p.estado === "nueva" && p.puntaje >= RD.cfg.umbral).length, bor = RD.posts.filter(p => p.estado === "borrador").length;
  const T = [["propuestas", "Propuestas", nuevas], ["publicaciones", "Publicaciones", bor], ["calendario", "Calendario", 0], ["ajustes", "Ajustes", 0]];
  $("#rdTabs").innerHTML = T.map(([k, n, c]) => `<a href="#${k}" ${r === k || (r === "post" && k === "publicaciones") ? 'aria-current="page"' : ""}>${n}${c ? `<span class="n" aria-label="${c} pendientes">${c}</span>` : ""}</a>`).join("");
}
function render(foco){
  cancelAnimationFrame(RD.anim);
  pintarTabs(); const r = ruta(), m = $("#rdMain");
  if (r.v === "post") { const p = RD.posts.find(x => x.id === r.id); if (!p) { location.hash = "publicaciones"; return; } if (RD.post !== p) { const f = (p.contenido || {}).formato; RD.fmt = f && (p.formatos || []).includes(fmtVista(f.principal)) ? fmtVista(f.principal) : "feed"; } RD.post = p; m.innerHTML = vistaEditor(p); montarEditor(); }
  else { RD.post = null; m.innerHTML = {propuestas: vistaPropuestas, publicaciones: vistaPublicaciones, calendario: vistaCalendario, ajustes: vistaAjustes}[r.v](); if (r.v === "publicaciones") miniaturas(); }
  if (foco) { const h = m.querySelector("h2"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({preventScroll: true}); } }
  if (RD.resaltar) { const el = document.getElementById("p-" + RD.resaltar); if (el) { el.scrollIntoView({block: "center"}); el.focus({preventScroll: true}); } RD.resaltar = null; }
}
window.addEventListener("hashchange", () => { render(true); window.scrollTo(0, 0); });

/* ─── Propuestas ─── */
const SENAL = [["repercusion", "Repercusión", 35], ["redes", "Redes", 20], ["autoridades", "Autoridades", 15], ["temas", "Temas críticos", 20], ["recencia", "Recencia", 10]];
let filtroProp = {ver: "activas", com: "todas"};
function vistaPropuestas(){
  const c = RD.cfg, todas = propuestasVisibles(), com = [...new Set(todas.flatMap(p => p.comunas))].sort();
  let ps = todas.filter(p => filtroProp.ver === "descartadas" ? p.estado === "descartada" : filtroProp.ver === "sobre" ? p.estado === "nueva" && p.puntaje >= c.umbral : p.estado !== "descartada");
  if (filtroProp.com !== "todas") ps = ps.filter(p => p.comunas.includes(filtroProp.com));
  ps.sort((a, b) => (a.estado === "tomada") - (b.estado === "tomada") || b.puntaje - a.puntaje);
  const terr = c.comunas.length ? c.comunas.slice(0, 6).join(", ") + (c.comunas.length > 6 ? ` y ${c.comunas.length - 6} más` : "") : "ninguna comuna";
  return `<h2>Propuestas</h2>
    <p class="lead">Noticias de las últimas 48 horas en ${esc(terr)}${c.nacional ? ", más las regionales y nacionales que afectan a la región" : ""}. Se ordenan por impacto; desde ${c.umbral} puntos te llega un aviso. <a href="#ajustes">Cambiar territorios</a></p>
    <div class="barra">
      <label class="info" for="fVer">Mostrar</label><select class="sel" id="fVer" data-filtro="ver"><option value="activas" ${filtroProp.ver === "activas" ? "selected" : ""}>Activas</option><option value="sobre" ${filtroProp.ver === "sobre" ? "selected" : ""}>Sobre el umbral (${c.umbral}+)</option><option value="descartadas" ${filtroProp.ver === "descartadas" ? "selected" : ""}>Descartadas</option></select>
      <label class="info" for="fCom">Territorio</label><select class="sel" id="fCom" data-filtro="com"><option value="todas">Todos</option>${com.map(x => `<option ${filtroProp.com === x ? "selected" : ""}>${esc(x)}</option>`).join("")}</select>
      <span class="sp"></span><span class="info">${ps.length} ${ps.length === 1 ? "hecho" : "hechos"}</span>
    </div>
    <div class="lista">${ps.length ? ps.map(propHtml).join("") : `<div class="vacio">${todas.length ? "Nada con este filtro." : "Aún no hay noticias de tus territorios en las últimas 48 horas. La lectura corre cada 30 minutos; también puedes tocar «Buscar ahora»."}</div>`}</div>`;
}
function propHtml(p){
  const banda = p.puntaje >= RD.cfg.umbral ? "alto" : p.puntaje >= 50 ? "medio" : "", d = p.detalle || {}, post = RD.posts.find(x => x.propuesta_id === p.id && x.estado !== "descartado");
  const notas = [...(p.notas || [])].sort((a, b) => b.ts - a.ts);
  const tags = [...(d.temas || []).map(t => `<span class="chip am">${esc(t)}</span>`), ...(d.autoridades || []).map(a => `<span class="chip az">${esc(a)}</span>`), d.grave ? `<span class="chip rj">Vidas o daño masivo</span>` : ""].join("");
  return `<article class="prop ${banda === "alto" && p.estado === "nueva" ? "sobre" : ""} ${p.estado === "descartada" ? "desc" : ""}" id="p-${esc(p.id)}" tabindex="-1" aria-labelledby="t-${esc(p.id)}">
    <div class="punt ${banda}" aria-label="Puntaje de impacto ${p.puntaje} de 100">${p.puntaje}<small>impacto</small></div>
    <div>
      <h4 id="t-${esc(p.id)}">${esc(p.titulo)}</h4>
      ${p.resumen ? `<p class="res">${esc(p.resumen)}</p>` : ""}
      <p class="meta"><span>${esc(p.comunas.join(", "))}</span>·<span>alcance ${esc(p.alcance || "comunal")}</span>·<span>${d.medios || 1} ${d.medios === 1 ? "medio" : "medios"}</span>${d.interaccion ? `·<span>${d.interaccion.toLocaleString("es-CL")} interacciones en redes</span>` : ""}·<span>${p.ultima ? hace(Date.parse(p.ultima)) : ""}</span>${p.ia ? `· <span class="chip">Titular y resumen con IA</span>` : ""}${p.estado === "tomada" ? ` <span class="chip ok">En redacción</span>` : ""}</p>
      ${p.sensible ? `<p class="alerta-rev"><b>Revisión reforzada.</b> Toca ${esc((p.cercanos || []).join(", "))}, con quien declaraste relación. Redacta con especial cuidado y aprueba solo si el tratamiento es el mismo que darías a cualquier otro actor.</p>` : ""}
      <div class="senales" role="list" aria-label="Por qué tiene este puntaje">${SENAL.map(([k, n, max]) => { const v = (p.senales || {})[k] || 0; return `<div class="sen" role="listitem">${n}<b>${v} de ${max}</b><span class="t"><i style="width:${Math.round(v / max * 100)}%"></i></span></div>`; }).join("")}</div>
      ${tags ? `<div class="meta">${tags}</div>` : ""}
      <details class="fuentes"><summary>${notas.length} ${notas.length === 1 ? "publicación" : "publicaciones"} en medios y redes</summary><ul>${notas.map(n => `<li><a href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">${esc(n.titulo)}</a> <span>· ${esc(n.medio)} · ${hace(n.ts)}${n.int ? ` · ${impInteraccion(n).toLocaleString("es-CL")} interacciones` : ""}</span></li>`).join("")}</ul></details>
      <div class="acciones">${post ? `<a class="btn pri" href="#post/${post.id}">Ver publicación</a>` : p.estado === "descartada" ? `<button class="btn" type="button" data-act="reactivar" data-id="${esc(p.id)}">Volver a proponer</button>` : `<button class="btn pri" type="button" data-act="redactar" data-id="${esc(p.id)}">${ico("ia")}Redactar publicación</button><button class="btn" type="button" data-act="descartar" data-id="${esc(p.id)}">Descartar</button>`}</div>
    </div></article>`;
}

/* ─── Redacción con IA ─── */
async function iaDisponible(){
  if (!/^https?:$/.test(location.protocol)) return false;
  try { const r = await fetch("/api/ia", {cache: "no-store"}); return r.ok && (await r.json()).ok === true; } catch(e) { return false; }
}
async function vozDisponible(){
  if (!/^https?:$/.test(location.protocol)) return false;
  try { const r = await fetch("/api/voz", {cache: "no-store"}); return r.ok && (await r.json()).ok === true; } catch(e) { return false; }
}
function fuentesDe(p){
  const porMedio = new Map();
  [...(p.notas || [])].sort((a, b) => a.ts - b.ts).forEach(n => { if (!porMedio.has(n.medio)) porMedio.set(n.medio, {medio: n.medio, url: n.url, fecha: n.ts, ambito: n.ambito}); });
  const orden = {nacional: 0, regional: 1, local: 2};
  return [...porMedio.values()].sort((a, b) => (orden[a.ambito] ?? 3) - (orden[b.ambito] ?? 3)).slice(0, 5);
}
const temaPrincipal = p => ((p.detalle || {}).temas || [])[0] || "";
function promptRedaccion(p, textos = []){
  const notas = [...(p.notas || [])].sort((a, b) => a.ts - b.ts).slice(0, 8);
  const leidos = (textos || []).filter(t => t && t.texto && t.texto.length > 200);
  const original = leidos.length
    ? leidos.map((t, i) => `${i ? "NOTA COMPLEMENTARIA" : "NOTA ORIGINAL (fuente principal)"} · ${t.medio}${t.fecha ? " · " + new Date(t.fecha).toLocaleString("es-CL") : ""}\nTítulo: ${t.titulo || ""}\n${t.bajada ? "Bajada: " + t.bajada + "\n" : ""}Texto:\n${t.texto}`).join("\n\n———\n\n")
    : "(No se pudo leer el texto completo de la nota: trabaja solo con los titulares y extractos de abajo y no inventes lo que falta.)";
  return `Eres editor de El Pregonero, un medio informativo digital de la Región de Valparaíso, Chile, con línea editorial NEUTRAL ESTRICTA.

TAREA: escribe una NUEVA VERSIÓN de la noticia para El Pregonero a partir de la nota original. Respeta el FONDO y cambia la FORMA:
- Fondo: conserva todos los hechos relevantes de la nota (qué pasó, dónde, cuándo, a quién afecta, cifras, nombres, cargos, plazos, causas y consecuencias que la nota informa, y lo que dijeron las personas o instituciones), atribuidos a su fuente.
- Forma: redacción y estructura propias, en pirámide invertida (lo más importante primero). No copies frases de la nota: reformula todo con palabras propias; como máximo una cita textual breve (menos de 15 palabras), entre comillas y atribuida a quien la dijo.
- No agregues nada que no esté en la nota: ni datos, ni contexto, ni opinión, ni conclusiones. Si la nota no trae un dato imprescindible, no lo supongas.
- Tu versión debe ser más breve que la original.

${original}

OTRAS PUBLICACIONES SOBRE EL MISMO HECHO (${p.comunas.join(", ")}; alcance ${p.alcance || "comunal"}):
${notas.map(n => `- ${n.medio} · ${new Date(n.ts).toLocaleString("es-CL")} · ${n.titulo}${n.desc ? " — " + n.desc.slice(0, 280) : ""}`).join("\n")}

REGLAS OBLIGATORIAS
1. Tono informativo y neutral: sin adjetivos valorativos (polémico, escandaloso, exitoso, histórico, grave…), sin signos de exclamación, sin mayúsculas sostenidas, sin opinión, sin llamados a apoyar o rechazar a nadie. Mismo trato para todos los sectores políticos. No menciones partidos políticos salvo que sean el centro del hecho.
2. Atribución: los hechos van atribuidos («según [medio]», «informó [institución]», «señaló [cargo y nombre]»).
3. "nota": tu nueva versión de la noticia, 3 a 6 párrafos cortos, entre 500 y 1.300 caracteres. Sin titular, sin enlaces, sin la línea «Fuente:» y sin mención de IA: el sistema los agrega.
4. "ig": versión condensada de "nota" para Instagram, máximo 800 caracteres, mismas reglas (sin titular, enlaces, «Fuente:» ni mención de IA). Los hashtags van aparte.
5. "hashtags": 3 a 5, de lugar y tema (por ejemplo #Casablanca #RegiónDeValparaíso). Nunca hashtags políticos ni de campaña.
6. Pieza gráfica, sacada de tu versión: "kicker" (antetítulo de 2 a 4 palabras: comuna · tema), "titular" (máximo 14 palabras, informativo, con el hecho principal), "bajada" (máximo 30 palabras, con el segundo dato más importante) y "datos" (3 datos clave del hecho, máximo 14 palabras cada uno: cifras, lugar, plazos, quién lo informó o qué viene). La pieza debe leerse como la noticia: nunca uses como dato que el medio publicó un artículo ni la fecha de publicación.
7. "alt": texto alternativo de la imagen para personas ciegas, máximo 200 caracteres, que diga qué muestra la pieza.
8. "historia": {"t": titular corto para la historia (máximo 10 palabras), "x": una frase con el hecho principal}.
9. "slides": 3 o 4 láminas para un carrusel que cuenten la noticia en orden, cada una {"t": subtítulo de máximo 7 palabras, "x": máximo 40 palabras}: qué pasó, detalles y cifras, qué dijeron, qué viene (solo si la nota lo dice).
10. "guion": guion para un reel narrado de 25 a 40 segundos: {"intro": máximo 22 palabras, "datos": una frase de máximo 20 palabras por cada dato clave, "cierre": máximo 14 palabras que nombre la fuente}. Frases cortas y fáciles de decir en voz alta; cifras con números.
11. "formato": actúa como especialista en Facebook e Instagram para medios locales. Compara la nota original con tu versión y elige el formato que mejor transmite ESTA información a vecinos que la verán en el celular: {"principal": "imagen" | "carrusel" | "reel", "historia": true o false, "razon": máximo 30 palabras, concreta, sobre esta noticia}. Criterios:
   - "imagen": un hecho único y claro que se entiende con titular y uno o dos datos; última hora o aviso breve, donde importa la rapidez.
   - "carrusel": tres o más datos, cifras, pasos, plazos, lugares o requisitos; balances, cronologías, «qué se sabe» o información de servicio (cortes, desvíos, horarios, trámites) que la gente guarda o comparte.
   - "reel": hechos de interés comunitario que se entienden mejor narrados y en secuencia, o que necesitan contexto breve; nunca para tragedias con víctimas ni para hechos en desarrollo que pueden cambiar en minutos.
   - "historia": true cuando la información tiene vigencia corta o pide una acción (alertas, cortes, desvíos, plazos que vencen, eventos del día).

Escribe en español de Chile. Responde SOLO con un objeto JSON con las claves kicker, titular, bajada, datos, nota, ig, hashtags, alt, historia, slides, guion, formato. Sin bloque de código ni texto adicional.`;
}
/* Lee en el servidor el texto completo de las notas de la propuesta (solo las direcciones guardadas en ella). */
async function leerNotas(p){
  if (RD.modo !== "editor") return [];
  try {
    const {data: {session}} = await RD.sb.auth.getSession();
    const r = await fetch("/api/nota", {method: "POST", headers: {"content-type": "application/json", authorization: "Bearer " + session.access_token}, body: JSON.stringify({propuesta_id: p.id})});
    const j = await r.json().catch(() => ({})); return r.ok && Array.isArray(j.textos) ? j.textos : [];
  } catch(e) { return []; }
}
const textoLeido = textos => (textos || []).filter(t => t && t.texto && t.texto.length > 200).map(t => ({medio: t.medio, url: t.url, texto: t.texto}));
/* Texto de la publicación: el cuerpo lo redacta la IA (o el editor) y el sistema arma alrededor
   el titular, la fuente con su fecha, el enlace a la nota original (solo Facebook) y la mención de IA. */
const RD_LINEA_SISTEMA = /^(fuentes?:|nota original|resumen elaborado con apoyo de ia)/i;
function fuentesPost(c){ return ((c.fuentes && c.fuentes.length ? c.fuentes : [c.fuente || {}]) || []).filter(f => f && f.medio); }
function bloqueFuente(c, red){
  const fs = fuentesPost(c); if (!fs.length) return "Fuente: [completar fuente]";
  const conFecha = f => f.fecha ? `${f.medio}, ${pzFecha(f.fecha)}` : f.medio;
  const lineas = [fs.length === 1 ? "Fuente: " + conFecha(fs[0]) : "Fuentes: " + fs.map(f => f.fecha ? `${f.medio} (${pzFecha(f.fecha)})` : f.medio).join("; ")];
  if (red === "fb") { const conUrl = fs.filter(f => f.url).slice(0, 3); conUrl.forEach(f => lineas.push(conUrl.length === 1 ? "Nota original: " + f.url : `Nota original en ${f.medio}: ${f.url}`)); }
  return lineas.join("\n");
}
/* Quita del texto lo que arma el sistema (titular al inicio, fuente, enlaces, mención de IA, hashtags al final) para quedarse con el cuerpo. */
function cuerpoDe(txt, c){
  let ls = String(txt || "").replace(/\r/g, "").split("\n");
  ls = ls.filter(l => !RD_LINEA_SISTEMA.test(l.trim()) && !/^\s*https?:\/\/\S+\s*$/.test(l));
  while (ls.length && /^(\s*#[\wÁÉÍÓÚÑáéíóúñ]+\s*)+$/.test(ls[ls.length - 1])) ls.pop();
  let t = ls.join("\n").replace(/https?:\/\/\S+/g, "").replace(/\n{3,}/g, "\n\n").trim();
  const tit = rdNorm(c.titular || "").replace(/[.\s]+$/, "");
  if (tit) { const pri = t.split("\n")[0]; if (rdNorm(pri).replace(/[.\s]+$/, "") === tit) t = t.slice(pri.length).trim(); }
  return t;
}
function componerTexto(c, red, cuerpo){
  const tit = String(c.titular || "").trim(), partes = [tit, String(cuerpo ?? cuerpoDe(c[red], c)).trim(), bloqueFuente(c, red)];
  const cierre = RD_ETIQUETA_IA + (red === "fb" && (c.hashtags || []).length ? "\n" + c.hashtags.join(" ") : "");
  return partes.filter(Boolean).join("\n\n") + "\n\n" + cierre;
}
function componerAmbos(c){ c.fb = componerTexto(c, "fb"); c.ig = componerTexto(c, "ig"); return c; }
async function pedirIA(prompt, signal){
  const r = await fetch("/api/ia", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({prompt, tier: "default"}), signal});
  if (r.status === 429) throw new Error("La IA recibió demasiadas solicitudes. Intenta en unos minutos.");
  if (!r.ok) throw new Error("La IA no respondió.");
  const txt = await r.text(), j = JSON.parse(txt.slice(txt.indexOf("{"), txt.lastIndexOf("}") + 1));
  return j;
}
/* Borrador sin IA (o si la IA falla): mismo formato, solo con lo que trae la propuesta. */
function plantilla(p){
  const fs = fuentesDe(p), medios = fs.map(f => f.medio).join(", ") || "[completar fuente]", lugar = p.comunas.filter(c => c !== "Región").join(", ") || "Región de Valparaíso";
  const res = p.resumen || (p.notas && p.notas[0] && p.notas[0].desc) || "[completar: resumen del hecho]";
  return {kicker: [lugar.split(",")[0], temaPrincipal(p)].filter(Boolean).join(" · "), titular: p.titulo, bajada: res, datos: [`Lugar: ${lugar}`, `Informan: ${fs.slice(0, 2).map(f => f.medio).join(" y ")}`],
    fb: res, ig: res,
    hashtags: ["#" + lugar.split(",")[0].replace(/\s+/g, ""), "#RegiónDeValparaíso"], alt: `Pieza informativa de El Pregonero con el titular: ${p.titulo}`,
    historia: {t: p.titulo, x: res}, slides: [{t: "Qué pasó", x: res}], guion: {intro: p.titulo, datos: [], cierre: `Fuente: ${medios}. Esto fue El Pregonero.`},
    formato: {principal: "imagen", historia: true, facebook: "feed", razon: "Borrador sin IA: se propone la imagen del feed. Cambia el formato si la noticia trae varios datos."}};
}
/* Formato recomendado por la IA (como especialista en redes), validado: si falta algo, se deduce del contenido. */
function formatoIA(f, j){
  f = f && typeof f === "object" ? f : {};
  const nSlides = (Array.isArray(j.slides) ? j.slides : []).filter(x => x && (x.t || x.x)).length, nDatos = (Array.isArray(j.datos) ? j.datos : []).filter(Boolean).length;
  let principal = ["imagen", "carrusel", "reel"].includes(f.principal) ? f.principal : (nSlides >= 3 || nDatos >= 3 ? "carrusel" : "imagen");
  if (principal === "carrusel" && nSlides < 2) principal = "imagen";
  const facebook = principal === "carrusel" || (principal === "reel" && nSlides >= 2) ? "carrusel" : "feed";
  return {principal, historia: f.historia !== false, facebook, razon: String(f.razon || "").replace(/\s+/g, " ").trim().slice(0, 240)};
}
const FMT_NOMBRE = {imagen: "Imagen única", carrusel: "Carrusel", reel: "Reel con voz"};
const fmtVista = f => f === "imagen" ? "feed" : f;
/* Aplica la recomendación: deja generados los formatos recomendados (sin quitar los que el editor ya agregó) y abre la vista en el principal. */
function aplicarFormato(post){
  const f = post.contenido && post.contenido.formato; if (!f) return;
  const set = new Set(post.formatos && post.formatos.length ? post.formatos : ["feed"]); set.add("feed"); if (f.historia) set.add("historia"); if (f.principal !== "imagen") set.add(f.principal);
  post.formatos = FORMATOS.map(([k]) => k).filter(k => set.has(k)); RD.fmt = fmtVista(f.principal);
}
function limpiarIA(j, p){
  const s = (x, n = 2000) => String(x ?? "").replace(/[*#_]{2,}/g, "").trim().slice(0, n);
  const datos = (Array.isArray(j.datos) ? j.datos : []).map(x => s(x, 160)).filter(Boolean).slice(0, 3);
  return {kicker: s(j.kicker, 60), titular: s(j.titular, 160), bajada: s(j.bajada, 260), datos, fb: s(j.nota || j.fb, 2000), ig: s(j.ig, 2200),
    hashtags: (Array.isArray(j.hashtags) ? j.hashtags : String(j.hashtags || "").split(/\s+/)).map(h => s(h, 40).replace(/^#?/, "#")).filter(h => h.length > 1).slice(0, 8),
    alt: s(j.alt, 260), historia: {t: s(j.historia && j.historia.t, 120), x: s(j.historia && j.historia.x, 220)},
    slides: (Array.isArray(j.slides) ? j.slides : []).map(x => ({t: s(x && x.t, 80), x: s(x && x.x, 320)})).filter(x => x.t || x.x).slice(0, 4),
    guion: {intro: s(j.guion && j.guion.intro, 220), datos: ((j.guion && j.guion.datos) || []).map(x => s(x, 200)).slice(0, 3), cierre: s(j.guion && j.guion.cierre, 160)},
    formato: formatoIA(j.formato, j)};
}
async function redactar(id, btn){
  const p = RD.props.find(x => x.id === id); if (!p) return;
  const existente = RD.posts.find(x => x.propuesta_id === id && x.estado !== "descartado"); if (existente) { location.hash = "post/" + existente.id; return; }
  if (btn) { btn.disabled = true; btn.innerHTML = `${ico("ia")}Leyendo la nota original…`; }
  const textos = await leerNotas(p), leido = textoLeido(textos);
  if (btn) btn.innerHTML = `${ico("ia")}Redactando la nueva versión…`;
  let c, ia = false;
  if (await RD.ia) { try { c = limpiarIA(await pedirIA(promptRedaccion(p, textos)), p); ia = Boolean(c.titular && c.fb && c.ig); } catch(e) { toast(String(e.message || e) + " Se usó una plantilla."); } }
  if (!ia) c = plantilla(p);
  const fs = fuentesDe(p);
  Object.assign(c, {fuente: fs[0] || null, fuentes: fs, etiquetaIA: RD_ETIQUETA_IA.replace(/\.$/, ""), ia, version: 1, fechaPieza: Date.now(), original: leido, notaCompleta: leido.length > 0});
  componerAmbos(c);
  const post = {id: uid(), propuesta_id: p.id, estado: "borrador", titulo: c.titular || p.titulo, contenido: c, formatos: ["feed", "historia"], comunas: p.comunas, sensible: !!p.sensible, programado: null, publicado: null, creado: new Date().toISOString()};
  aplicarFormato(post);
  try { await store.guardarPost(post); if (p.estado === "nueva") { await store.marcarPropuesta(p.id, "tomada"); p.estado = "tomada"; } }
  catch(e) { if (btn) { btn.disabled = false; btn.innerHTML = `${ico("ia")}Redactar publicación`; } return toast("No se pudo guardar el borrador: " + (e.message || e)); }
  RD.posts.unshift(post); toast(ia ? "Borrador listo. Revísalo antes de aprobar." : "Borrador con plantilla (sin IA). Complétalo antes de aprobar."); location.hash = "post/" + post.id;
}
async function rehacer(btn){
  const post = RD.post, p = RD.props.find(x => x.id === post.propuesta_id); if (!p) return toast("La propuesta ya no está disponible para volver a redactar.");
  if (!(await RD.ia)) return toast("La IA no está disponible aquí.");
  btn.disabled = true; btn.innerHTML = `${ico("ia")}Leyendo la nota original…`;
  const textos = await leerNotas(p), leido = textoLeido(textos); btn.innerHTML = `${ico("ia")}Redactando la nueva versión…`;
  try { const c = limpiarIA(await pedirIA(promptRedaccion(p, textos)), p); Object.assign(post.contenido, c, {ia: true, version: (post.contenido.version || 1) + 1, original: leido.length ? leido : (post.contenido.original || []), notaCompleta: leido.length > 0 || Boolean(post.contenido.notaCompleta)}); componerAmbos(post.contenido); aplicarFormato(post); post.titulo = c.titular; await guardarAhora(true); render(); toast("Nueva versión redactada. Revísala."); }
  catch(e) { btn.disabled = false; btn.innerHTML = `${ico("ia")}Redactar de nuevo con IA`; toast(String(e.message || e)); }
}

/* ─── Revisión editorial automática ─── */
const RD_VALORATIVAS = ["escandalo", "escandaloso", "escandalosa", "polemica", "polemico", "indignante", "indignacion", "vergonzoso", "vergonzosa", "brutal", "terrible", "increible", "impactante", "insolito", "insolita", "nefasto", "nefasta", "caos", "caotico", "desastroso", "lamentable", "lamentablemente", "afortunadamente", "por fin", "exitoso", "exitosa", "gran logro", "historico", "historica", "alarmante", "impresionante", "espectacular", "maravilloso", "excelente", "pesimo", "fracaso", "ineptitud", "abandono", "vergüenza", "urgente"];
const RD_PARTIDOS = ["republicano", "republicanos", "udi", "renovacion nacional", "evopoli", "partido socialista", "ppd", "partido comunista", "frente amplio", "democracia cristiana", "partido de la gente", "partido liberal", "social cristiano", "democratas", "amarillos"];
const RD_SIGLAS = /\b(RN|PS|PC|DC|PDG|FA|UDI|PPD)\b/;
function textoFuentes(post){
  const p = RD.props.find(x => x.id === post.propuesta_id);
  const orig = ((post.contenido && post.contenido.original) || []).map(o => o.texto || "").join(" ");
  return rdNorm(((p && p.notas) || []).map(n => n.titulo + " " + (n.desc || "")).join(" ") + " " + ((p && p.resumen) || "") + " " + (p ? p.comunas.join(" ") : "") + " " + orig);
}
function revisar(post){
  const c = post.contenido || {}, out = [], add = (nivel, txt) => out.push({nivel, txt});
  const fb = c.fb || "", ig = c.ig || "", pieza = [c.titular, c.bajada, ...(c.datos || []), (c.historia || {}).t, (c.historia || {}).x, ...(c.slides || []).flatMap(s => [s.t, s.x])].join(" ");
  const todo = [fb, ig, pieza].join(" \n "), n = rdNorm(todo), medios = (c.fuentes || []).map(f => f.medio).filter(Boolean);
  if (!c.titular) add("err", "Falta el titular de la pieza.");
  if (/\[completar/i.test(todo)) add("err", "Quedan datos por completar ([completar: …]).");
  const citaFb = medios.some(m => rdNorm(fb).includes(rdNorm(m).split(" (")[0])), citaIg = medios.some(m => rdNorm(ig).includes(rdNorm(m).split(" (")[0]));
  if (!medios.length) add("err", "La publicación no tiene fuente asociada.");
  else { citaFb ? add("ok", "El texto de Facebook cita la fuente.") : add("err", "El texto de Facebook no nombra la fuente."); citaIg ? add("ok", "El texto de Instagram cita la fuente.") : add("err", "El texto de Instagram no nombra la fuente."); }
  const urlFb = fuentesPost(c).map(f => f.url).filter(Boolean);
  if (urlFb.length) urlFb.some(u => fb.includes(u)) ? add("ok", "El texto de Facebook trae el enlace a la nota original.") : add("err", "El texto de Facebook no trae el enlace a la nota original. Usa «Rearmar fuente y enlace».");
  if (/https?:\/\//i.test(ig)) add("err", "Instagram no muestra enlaces en el texto: quítalo y deja solo «Fuente: medio».");
  if (ig.length + (c.hashtags || []).join(" ").length > 2200) add("err", "El texto de Instagram supera los 2.200 caracteres.");
  if ((c.hashtags || []).length > 5) add("adv", `Usa ${c.hashtags.length} hashtags: con 3 a 5 basta para un medio informativo.`);
  const val = RD_VALORATIVAS.filter(w => new RegExp("(^|[^a-z])" + rdNorm(w) + "($|[^a-z])").test(n));
  val.length ? add("adv", `Palabras valorativas: ${val.map(v => "«" + v + "»").join(", ")}. La línea editorial pide solo hechos.`) : add("ok", "Sin palabras valorativas.");
  if (/[!¡]/.test(todo)) add("adv", "Hay signos de exclamación: en un medio neutral no corresponden.");
  const mays = (todo.match(/\b[A-ZÁÉÍÓÚÑ]{6,}\b/g) || []).filter(w => !["SENAPRED", "CESFAM", "CONAF", "SERVIU", "SERNAC", "SERNAGEOMIN"].includes(w));
  if (mays.length) add("adv", `Mayúsculas sostenidas: ${[...new Set(mays)].slice(0, 3).join(", ")}.`);
  const part = RD_PARTIDOS.filter(w => new RegExp("(^|[^a-z])" + w + "($|[^a-z])").test(n)).concat(RD_SIGLAS.test(todo) ? ["sigla de partido"] : []);
  if (part.length) add("adv", `Menciona partidos (${[...new Set(part)].join(", ")}). Déjalo solo si es el centro del hecho.`);
  // Cifras que no aparecen en las fuentes: la IA no debe inventar datos.
  const fuentes = textoFuentes(post).replace(/[.,](?=\d)/g, ""), cifras = [...new Set((rdNorm([fb, ig, pieza].join(" ")).match(/\d[\d.,]*\d|\d/g) || []).map(x => x.replace(/[.,](?=\d)/g, "")))].filter(x => x.length > 1 || Number(x) > 3);
  const raras = cifras.filter(x => !fuentes.includes(x));
  raras.length ? add("adv", `Cifras que no están en las fuentes: ${raras.slice(0, 5).join(", ")}. Verifícalas en el original.`) : cifras.length && add("ok", "Las cifras están en las fuentes.");
  // Frases copiadas: 8 palabras seguidas iguales a un titular o extracto de un medio.
  const fw = textoFuentes(post).replace(/[^a-z0-9ñ ]+/g, " ").split(/\s+/).filter(Boolean), tejas = new Set();
  for (let i = 0; i + 8 <= fw.length; i++) tejas.add(fw.slice(i, i + 8).join(" "));
  const cw = rdNorm([fb, ig].join(" ")).replace(/[^a-z0-9ñ ]+/g, " ").split(/\s+/).filter(Boolean);
  let copia = null; for (let i = 0; i + 8 <= cw.length && !copia; i++) { const t = cw.slice(i, i + 8).join(" "); if (tejas.has(t)) copia = t; }
  copia ? add("adv", `Frase copiada de un medio: «${copia}…». Reescríbela con palabras propias o márcala como cita atribuida.`) : add("ok", "Redacción propia (sin frases copiadas de los medios).");
  const etq = rdNorm(RD_ETIQUETA_IA).slice(0, 30);
  (rdNorm(fb).includes(etq) && rdNorm(ig).includes(etq)) ? add("ok", "Lleva la mención de IA en ambos textos.") : add("adv", "Falta la mención de IA en Facebook o en Instagram (control 32).");
  if (c.ia && c.notaCompleta === false) add("adv", "No se pudo leer el texto completo de la nota original: esta versión se hizo solo con el titular y el extracto. Revísala contra la nota antes de aprobar.");
  else if (c.notaCompleta) add("ok", "Versión escrita a partir del texto completo de la nota original.");
  if (!c.alt) add("adv", "Falta el texto alternativo de la imagen (accesibilidad).");
  if (post.sensible) { const p = RD.props.find(x => x.id === post.propuesta_id); add("adv", `Revisión reforzada: la noticia toca ${(p && p.cercanos || []).join(", ") || "actores con los que declaraste relación"}. Compara el tratamiento con el que darías a cualquier otro actor.`); }
  return out;
}

/* ─── Publicaciones ─── */
let filtroPost = "activas";
function vistaPublicaciones(){
  const orden = {borrador: 0, aprobado: 1, programado: 2, publicado: 3, descartado: 4};
  let ps = RD.posts.filter(p => filtroPost === "activas" ? ["borrador", "aprobado", "programado"].includes(p.estado) : p.estado === filtroPost);
  ps.sort((a, b) => orden[a.estado] - orden[b.estado] || (a.programado && b.programado ? Date.parse(a.programado) - Date.parse(b.programado) : Date.parse(b.actualizado) - Date.parse(a.actualizado)));
  const cuenta = k => RD.posts.filter(p => p.estado === k).length;
  return `<h2>Publicaciones</h2><p class="lead">Borradores redactados con IA, aprobados y programados. Nada sale sin tu aprobación.</p>
    <div class="barra"><label class="info" for="fPost">Mostrar</label><select class="sel" id="fPost" data-filtro="post">
      ${[["activas", `En curso (${cuenta("borrador") + cuenta("aprobado") + cuenta("programado")})`], ["publicado", `Publicadas (${cuenta("publicado")})`], ["descartado", `Descartadas (${cuenta("descartado")})`]].map(([k, n]) => `<option value="${k}" ${filtroPost === k ? "selected" : ""}>${n}</option>`).join("")}</select></div>
    <div class="posts">${ps.length ? ps.map(p => `<button class="post" type="button" data-act="abrir" data-id="${p.id}"><canvas width="216" height="270" data-mini="${p.id}" aria-hidden="true"></canvas>
      <span><h4>${esc(p.titulo || "Sin titular")}</h4><span class="meta">${esc((p.comunas || []).join(", "))}${p.programado ? ` · ${p.estado === "publicado" ? "publicada" : "programada"} ${esc(fechaHora(Date.parse(p.estado === "publicado" && p.publicado ? p.publicado : p.programado)))}` : ""} · ${esc((p.formatos || []).map(f => ({feed: "feed", historia: "historia", carrusel: "carrusel", reel: "reel"})[f]).join(", "))}${p.sensible ? ` · <span class="chip am">Revisión reforzada</span>` : ""}</span></span>
      <span class="estado ${p.estado}">${RD_ESTADOS[p.estado]}</span></button>`).join("") : `<div class="vacio">No hay publicaciones aquí. Empieza desde una <a href="#propuestas">propuesta</a>.</div>`}</div>`;
}
async function miniaturas(){
  await pzFuentesListas();
  document.querySelectorAll("canvas[data-mini]").forEach(cv => { const p = RD.posts.find(x => x.id === cv.dataset.mini); if (!p) return; const ctx = cv.getContext("2d"); ctx.setTransform(0.2, 0, 0, 0.2, 0, 0); pzFeed(ctx, p.contenido || {}); });
}

/* ─── Editor de una publicación ─── */
const FORMATOS = [["feed", "Feed 4:5"], ["historia", "Historia 9:16"], ["carrusel", "Carrusel"], ["reel", "Reel con voz"]];
function vistaEditor(p){
  const c = p.contenido || {}, bloqueado = ["publicado", "descartado"].includes(p.estado), dis = bloqueado ? "disabled" : "";
  const campo = (k, lbl, {area = false, filas = 3, max = 0, ayuda = ""} = {}) => { const v = k.split(".").reduce((o, x) => o && o[x], c) ?? ""; const id = "f-" + k.replace(/\W/g, "-");
    return `<label class="campo" for="${id}">${lbl}${ayuda ? ` <small>${ayuda}</small>` : ""}${area ? `<textarea class="inp" id="${id}" data-k="${k}" rows="${filas}" ${max ? `maxlength="${max}"` : ""} ${dis}>${esc(v)}</textarea>` : `<input class="inp" id="${id}" data-k="${k}" value="${esc(v)}" ${max ? `maxlength="${max}"` : ""} ${dis}>`}${max ? `<span class="cont" data-cont="${k}">${String(v).length} / ${max}</span>` : ""}</label>`; };
  const datos = [0, 1, 2].map(i => campo("datos." + i, `Dato clave ${i + 1}`, {max: 140})).join("");
  const slides = (c.slides && c.slides.length ? c.slides : [{t: "", x: ""}]).map((s, i) => campo(`slides.${i}.t`, `Lámina ${i + 1} · subtítulo`, {max: 80}) + campo(`slides.${i}.x`, `Lámina ${i + 1} · texto`, {area: true, filas: 3, max: 320})).join("");
  const g = c.guion || {};
  const prop = RD.props.find(x => x.id === p.propuesta_id);
  return `<p><a class="btn ghost sm" href="#publicaciones">${ico("atras")}Publicaciones</a></p>
    <div class="fila" style="justify-content:space-between"><h2>${esc(p.titulo || "Publicación")}</h2><span class="estado ${p.estado}">${RD_ESTADOS[p.estado]}</span></div>
    <p class="lead">${esc((p.comunas || []).join(", "))}${prop ? ` · impacto ${prop.puntaje}` : ""}${p.programado ? ` · ${p.estado === "publicado" ? "publicada" : "programada para"} ${esc(fechaHora(Date.parse(p.estado === "publicado" && p.publicado ? p.publicado : p.programado)))}` : ""} · ${c.ia ? "redactado con IA" : "plantilla sin IA"} · versión ${c.version || 1}</p>
    ${p.estado === "aprobado" || p.estado === "programado" ? `<p class="nota">Está aprobada: si cambias el contenido, vuelve a borrador y hay que aprobarla de nuevo.</p>` : ""}
    <div class="ed">
      <div class="ed-col">
        <section class="panel" aria-labelledby="hPieza"><h3 id="hPieza">Pieza gráfica</h3>${campo("kicker", "Antetítulo", {max: 60, ayuda: "comuna · tema"})}${campo("titular", "Titular", {area: true, filas: 2, max: 160})}${campo("bajada", "Bajada", {area: true, filas: 2, max: 260})}${datos}</section>
        <section class="panel" aria-labelledby="hTextos"><h3 id="hTextos">Textos</h3>
          ${campo("fb", "Facebook", {area: true, filas: 12, max: 2000, ayuda: "nueva versión de la noticia, con fuente y enlace a la nota original"})}
          ${campo("ig", "Instagram", {area: true, filas: 8, max: 2200, ayuda: "sin enlaces"})}
          <label class="campo" for="f-hashtags">Hashtags <small>separados por espacio, 3 a 5</small><input class="inp" id="f-hashtags" data-k="hashtags" value="${esc((c.hashtags || []).join(" "))}" ${dis}></label>
          ${campo("alt", "Texto alternativo de la imagen", {area: true, filas: 2, max: 260, ayuda: "para personas ciegas; Instagram lo permite"})}
          <div class="acciones">${bloqueado ? "" : `<button class="btn sm" type="button" data-act="fuente" title="Vuelve a poner el titular, la fuente, el enlace a la nota original y la mención de IA, sin tocar el cuerpo">Rearmar fuente y enlace</button>`}<button class="btn sm" type="button" data-act="copiar" data-q="fb">${ico("copiar")}Copiar texto para Facebook</button><button class="btn sm" type="button" data-act="copiar" data-q="ig">${ico("copiar")}Copiar texto para Instagram</button></div>
        </section>
        <section class="panel suave" aria-labelledby="hHist"><h3 id="hHist">Historia</h3>${campo("historia.t", "Titular de la historia", {max: 120})}${campo("historia.x", "Frase de contexto", {area: true, filas: 2, max: 220})}</section>
        ${(p.formatos || []).includes("carrusel") ? `<section class="panel suave" aria-labelledby="hCar"><h3 id="hCar">Carrusel</h3>${slides}${!bloqueado && (c.slides || []).length < 4 ? `<button class="btn sm" type="button" data-act="lamina">Agregar lámina</button>` : ""}</section>` : ""}
        ${(p.formatos || []).includes("reel") ? `<section class="panel suave" aria-labelledby="hGuion"><h3 id="hGuion">Guion del reel</h3>${campo("guion.intro", "Inicio", {area: true, filas: 2, max: 220})}${[0, 1, 2].map(i => (c.datos || [])[i] ? campo(`guion.datos.${i}`, `Dato ${i + 1}`, {area: true, filas: 2, max: 200}) : "").join("")}${campo("guion.cierre", "Cierre", {area: true, filas: 2, max: 160})}<p class="info">Cada parte se graba con voz sintética en español de Chile y marca la duración de su escena.</p></section>` : ""}
        <section class="panel suave" aria-labelledby="hFuentes"><h3 id="hFuentes">Fuentes</h3><ul style="margin:0;padding-left:18px">${(c.fuentes || []).map(f => `<li><a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer">${esc(f.medio)}</a> <span class="info">· ${esc(f.ambito || "")} · ${esc(new Date(f.fecha).toLocaleString("es-CL"))}</span></li>`).join("") || "<li>Sin fuentes</li>"}</ul>
          ${prop ? `<details class="fuentes"><summary>Todas las publicaciones del hecho (${(prop.notas || []).length})</summary><ul>${[...prop.notas].sort((a, b) => b.ts - a.ts).map(n => `<li><a href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">${esc(n.titulo)}</a> <span>· ${esc(n.medio)}</span></li>`).join("")}</ul></details>` : ""}</section>
      </div>
      <div class="ed-col"><div class="vista">
        <section class="panel" aria-labelledby="hVista"><h3 id="hVista">Vista previa</h3>
          ${c.formato ? `<div class="recomienda"><strong>Formato recomendado: ${esc(FMT_NOMBRE[c.formato.principal] || "Imagen única")}${c.formato.principal === "carrusel" ? ` de ${pzLaminas(c).length} láminas` : ""}${c.formato.historia ? " + historia" : ""}</strong>${c.formato.razon ? `<span>${esc(c.formato.razon)}</span>` : ""}<span class="info">En Facebook se publica ${c.formato.facebook === "carrusel" ? "como carrusel de imágenes" : "con la imagen del feed"}${c.formato.principal === "reel" ? "; el reel se sube a mano desde Meta" : ""}. Puedes cambiarlo abajo.</span></div>` : ""}
          <div class="fmt" role="group" aria-label="Formato">${FORMATOS.map(([k, n]) => (p.formatos || []).includes(k) ? `<button type="button" data-act="fmt" data-f="${k}" aria-pressed="${RD.fmt === k}">${n}</button>` : bloqueado ? "" : `<button type="button" data-act="generar" data-f="${k}" title="Se genera solo para esta noticia"><span class="mas">+</span> ${n}</button>`).join("")}</div>
          <div class="lienzo"><canvas id="rdCanvas" role="img" aria-label="Vista previa de la pieza"></canvas></div>
          <div class="lam" id="rdLam"></div>
          <div id="rdReelCtl"></div>
          <div class="descargas" id="rdDesc"></div>
        </section>
        ${["aprobado", "programado", "publicado"].includes(p.estado) ? `<section class="panel" aria-labelledby="hFb"><h3 id="hFb">Facebook</h3><div id="rdFb"><p class="info" style="margin:0">Revisando la conexión…</p></div></section>` : ""}
        <section class="panel" aria-labelledby="hRev"><h3 id="hRev">Revisión editorial automática</h3><ul class="revision" id="rdRev"></ul><p class="info" style="margin:10px 0 0">Ayuda a detectar problemas; no reemplaza tu verificación en la fuente original.</p></section>
      </div></div>
    </div>
    <div class="accbar">
      ${bloqueado ? "" : `<button class="btn" type="button" data-act="rehacer">${ico("ia")}Redactar de nuevo con IA</button>`}
      <span class="guardado" id="rdGuardado" aria-live="polite"></span><span class="sp"></span>
      ${p.estado === "borrador" ? `<button class="btn peligro" type="button" data-act="descartar-post">Descartar</button><button class="btn pri" type="button" data-act="aprobar">${ico("ok")}Aprobar</button>` : ""}
      ${p.estado === "aprobado" ? `<button class="btn" type="button" data-act="volver-borrador">Volver a borrador</button><button class="btn" type="button" data-act="publicada">Marcar como publicada</button><button class="btn" type="button" data-act="programar">${ico("reloj")}Programar</button><button class="btn pri" type="button" data-act="fb-ahora">Publicar ahora</button>` : ""}
      ${p.estado === "programado" ? `<button class="btn" type="button" data-act="programar">${ico("reloj")}Cambiar hora</button><button class="btn" type="button" data-act="desprogramar">Quitar de la agenda</button><button class="btn pri" type="button" data-act="publicada">Marcar como publicada</button>` : ""}
      ${p.estado === "publicado" && p.enlaces ? Object.entries(p.enlaces).filter(([, u]) => u).map(([k, u]) => `<a class="btn sm" href="${esc(u)}" target="_blank" rel="noopener noreferrer">Ver en ${k === "fb" ? "Facebook" : "Instagram"}</a>`).join("") : ""}
    </div>`;
}
function montarEditor(){
  const p = RD.post; if (!(p.formatos || []).includes(RD.fmt)) RD.fmt = "feed";
  RD.lam = 0; pintarRevision(); pzFuentesListas().then(() => { if (RD.post === p) pintarVista(); }); pintarFacebook();
}
function pintarRevision(){
  const r = revisar(RD.post), el = $("#rdRev"); if (!el) return;
  const orden = {err: 0, adv: 1, ok: 2}; el.innerHTML = [...r].sort((a, b) => orden[a.nivel] - orden[b.nivel]).map(x => `<li class="${x.nivel}">${esc(x.txt)}</li>`).join("");
}
function altoDe(f){ return f === "historia" || f === "reel" ? PZ.HIST : PZ.FEED; }
function pintarVista(){
  cancelAnimationFrame(RD.anim);
  const cv = $("#rdCanvas"); if (!cv) return; const p = RD.post, c = p.contenido || {}, f = RD.fmt;
  cv.width = PZ.W; cv.height = altoDe(f); const ctx = cv.getContext("2d"); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const lam = $("#rdLam"), desc = $("#rdDesc"), reel = $("#rdReelCtl"); lam.innerHTML = ""; reel.innerHTML = "";
  const comp = navigator.canShare ? `<button class="btn sm" type="button" data-act="compartir-pieza">${ico("compartir")}Compartir</button>` : "";
  if (f === "feed") { pzFeed(ctx, c); cv.setAttribute("aria-label", "Pieza para el feed: " + (c.titular || "")); desc.innerHTML = `<button class="btn sm" type="button" data-act="dl" data-f="feed">${ico("dl")}Descargar imagen</button>${comp}`; }
  if (f === "historia") { pzHistoria(ctx, c); cv.setAttribute("aria-label", "Historia: " + ((c.historia || {}).t || c.titular || "")); desc.innerHTML = `<button class="btn sm" type="button" data-act="dl" data-f="historia">${ico("dl")}Descargar historia</button>${comp}`; }
  if (f === "carrusel") {
    const L = pzLaminas(c); RD.lam = Math.min(RD.lam, L.length - 1); pzLamina(ctx, c, RD.lam); cv.setAttribute("aria-label", `Carrusel, lámina ${RD.lam + 1} de ${L.length}`);
    lam.innerHTML = L.map((_, i) => `<button type="button" data-act="lam" data-i="${i}" aria-pressed="${i === RD.lam}" aria-label="Lámina ${i + 1}">${i + 1}</button>`).join("");
    desc.innerHTML = `<button class="btn sm" type="button" data-act="dl" data-f="carrusel">${ico("dl")}Descargar ${L.length} láminas</button>${comp}`;
  }
  if (f === "reel") pintarReel(cv, ctx);
}
/* Reel: vista animada, voz por escena (ElevenLabs vía /api/voz), música propia y exportación a MP4. */
function planReel(){
  const p = RD.post, guardado = RD.reel[p.id], c = p.contenido || {}, firma = JSON.stringify([c.titular, c.bajada, c.datos, c.guion, c.kicker, (c.fuentes || []).map(f => f.medio)]);
  if (guardado && guardado.firma === firma) return guardado;
  const plan = pzRetimar({c, escenas: pzEscenas(c)}); plan.firma = firma; RD.reel[p.id] = plan; return plan;
}
function pintarReel(cv, ctx){
  const plan = planReel(), desc = $("#rdDesc"), ctl = $("#rdReelCtl"), t0 = performance.now(), quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  cv.setAttribute("aria-label", `Reel de ${Math.round(plan.total)} segundos: ${plan.escenas.length} escenas con el titular, los datos clave y la fuente.`);
  const vozTxt = plan.audio ? `Con voz y música · ${Math.round(plan.total)} s` : `${Math.round(plan.total)} s · sin voz todavía`;
  ctl.innerHTML = `<p class="info" style="margin:10px 0 0">${vozTxt}${plan.vozEstandar ? " · se usó la voz estándar (el plan de ElevenLabs no permite la voz chilena)" : ""}</p>
    <div class="acciones">${RD.post.estado === "descartado" ? "" : `<button class="btn sm" type="button" data-act="voz-reel">${ico("voz")}${plan.audio ? "Grabar de nuevo la voz" : "Grabar voz"}</button>`}<button class="btn sm pri" type="button" data-act="mp4">Preparar video MP4</button></div>
    <div class="prog" id="rdProg" hidden><span class="bar"><i></i></span><span class="info" id="rdPct">0%</span></div>`;
  desc.innerHTML = plan.blob ? `<button class="btn sm" type="button" data-act="dl" data-f="reel">${ico("dl")}Descargar video</button>${navigator.canShare ? `<button class="btn sm" type="button" data-act="compartir-pieza">${ico("compartir")}Compartir</button>` : ""}` : "";
  if (quieto) { pzReelCuadro(ctx, plan, Math.min(2, plan.total - 0.01)); return; }
  const loop = now => { const t = ((now - t0) / 1000) % (plan.total + 0.8); pzReelCuadro(ctx, plan, Math.min(t, plan.total - 0.001)); RD.anim = requestAnimationFrame(loop); };
  RD.anim = requestAnimationFrame(loop);
}
async function grabarVoz(btn){
  const plan = planReel();
  if (!(await RD.voz)) return toast(RD.modo === "prueba" ? "La voz se graba en pregonia.vercel.app (aquí no hay servidor de voz). Puedes preparar el video solo con música." : "Falta configurar la voz de ElevenLabs en Vercel.");
  btn.disabled = true; btn.innerHTML = `${ico("voz")}Grabando…`;
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    for (const s of plan.escenas) {
      const r = await fetch("/api/voz", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({texto: s.txt})});
      if (!r.ok) { let m = ""; try { m = (await r.json()).error; } catch(e) {} throw new Error(m || "El servicio de voz no respondió"); }
      if (r.headers.get("x-voz") === "estandar") plan.vozEstandar = true;
      const buf = await r.arrayBuffer(); s.voz = await new Promise((ok, no) => { const q = ac.decodeAudioData(buf, ok, no); if (q && q.then) q.then(ok, no); });
    }
    ac.close().catch(() => {}); pzRetimar(plan); plan.audio = await pzMezcla(plan, true); plan.blob = null; toast("Voz grabada. Ahora prepara el video.");
  } catch(e) { toast("No se pudo grabar la voz: " + (e.message || e)); }
  pintarVista();
}
async function prepararMP4(btn){
  const plan = planReel(), prog = $("#rdProg"), bar = prog.querySelector("i"), pct = $("#rdPct");
  btn.disabled = true; prog.hidden = false;
  const av = x => { bar.style.width = Math.round(x * 100) + "%"; pct.textContent = Math.round(x * 100) + "%"; };
  try {
    await pzFuentesListas();
    const audio = plan.audio || await pzMezcla(plan, true);  // sin voz: solo la música propia
    cancelAnimationFrame(RD.anim);
    let blob = await pzMP4(plan, audio, av);
    if (!blob) { toast("Este navegador graba el video en tiempo real: deja la pestaña abierta unos " + Math.round(plan.total) + " segundos."); blob = await pzGrabado(plan, audio, av); }
    if (!blob) throw new Error("Este navegador no permite crear videos. Prueba con Chrome, Edge o Safari actualizados.");
    plan.blob = blob; toast(plan.audioCodec === "opus" ? "Video listo, pero este navegador grabó el audio en Opus: Instagram pide AAC. Prepáralo en Chrome o Safari de escritorio." : plan.audio ? "Video listo con voz y música." : "Video listo con música (sin voz).");
  } catch(e) { toast(String(e.message || e)); }
  pintarVista();
}

/* Descargas y compartir */
async function archivosDe(f){
  const c = RD.post.contenido || {}, base = `PregonIA-${slug(c.titular)}`;
  if (f === "feed") return [new File([await pzPNG(ctx => pzFeed(ctx, c), PZ.FEED)], base + "-feed.png", {type: "image/png"})];
  if (f === "historia") return [new File([await pzPNG(ctx => pzHistoria(ctx, c), PZ.HIST)], base + "-historia.png", {type: "image/png"})];
  if (f === "carrusel") { const L = pzLaminas(c), out = []; for (let i = 0; i < L.length; i++) out.push(new File([await pzPNG(ctx => pzLamina(ctx, c, i), PZ.FEED)], `${base}-carrusel-${i + 1}.png`, {type: "image/png"})); return out; }
  if (f === "reel") { const plan = planReel(); return plan.blob ? [new File([plan.blob], base + "-reel." + (/webm/.test(plan.blob.type) ? "webm" : "mp4"), {type: plan.blob.type})] : []; }
  return [];
}
async function descargar(f){
  await pzFuentesListas();
  const fs = await archivosDe(f); if (!fs.length) return toast("Primero prepara el video.");
  for (const file of fs) { const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); await new Promise(r => setTimeout(r, 250)); }
  toast(fs.length > 1 ? `Se descargaron ${fs.length} láminas.` : "Descargado.");
}
async function compartirPieza(){
  await pzFuentesListas();
  const fs = await archivosDe(RD.fmt); if (!fs.length) return toast("Primero prepara el video.");
  const texto = (RD.post.contenido.ig || "") + "\n\n" + (RD.post.contenido.hashtags || []).join(" ");
  if (!navigator.canShare || !navigator.canShare({files: fs})) return descargar(RD.fmt);
  try { await navigator.clipboard.writeText(texto).catch(() => {}); await navigator.share({files: fs, title: RD.post.titulo}); toast("Copié el texto de Instagram: pégalo al publicar."); } catch(e) { if (e && e.name !== "AbortError") toast("No se pudo compartir."); }
}
function rearmarFuente(){
  const p = RD.post; if (!p) return; const c = p.contenido, antes = c.fb + "\u0000" + c.ig;
  componerAmbos(c); if (c.fb + "\u0000" + c.ig === antes) return toast("La fuente y el enlace ya estaban completos.");
  ["fb", "ig"].forEach(k => { const el = $("#f-" + k); if (el) { el.value = c[k]; alEditar(el); } });
  toast("Listo: titular, fuente, enlace y mención de IA rearmados.");
}
async function copiarTexto(q){
  const c = RD.post.contenido || {}, txt = q === "ig" ? (c.ig || "") + ((c.hashtags || []).length ? "\n\n" + c.hashtags.join(" ") : "") : (c.fb || "");
  try { await navigator.clipboard.writeText(txt); toast(q === "ig" ? "Texto de Instagram copiado, con hashtags." : "Texto de Facebook copiado."); }
  catch(e) { const el = $(q === "ig" ? "#f-ig" : "#f-fb"); if (el) { el.focus(); el.select(); } toast("Texto seleccionado: cópialo con el teclado."); }
}

/* Edición y guardado */
function ponerValor(obj, ruta, v){
  const ks = ruta.split("."); let o = obj;
  for (let i = 0; i < ks.length - 1; i++) { const k = /^\d+$/.test(ks[i]) ? Number(ks[i]) : ks[i], sig = ks[i + 1]; if (o[k] == null) o[k] = /^\d+$/.test(sig) ? [] : {}; o = o[k]; }
  const ult = /^\d+$/.test(ks[ks.length - 1]) ? Number(ks[ks.length - 1]) : ks[ks.length - 1]; o[ult] = v;
}
function alEditar(el){
  const p = RD.post; if (!p || ["publicado", "descartado"].includes(p.estado)) return;
  const k = el.dataset.k; let v = el.value;
  if (k === "hashtags") v = v.split(/\s+/).map(h => h.trim()).filter(Boolean).map(h => h.replace(/^#?/, "#"));
  ponerValor(p.contenido, k, v);
  if (k.startsWith("datos.")) p.contenido.datos = (p.contenido.datos || []).map(x => x || "");
  if (k === "titular") p.titulo = v;
  const cont = document.querySelector(`[data-cont="${k}"]`); if (cont) { const max = Number(el.getAttribute("maxlength")); cont.textContent = `${v.length} / ${max}`; cont.classList.toggle("mal", v.length >= max); }
  if (p.estado === "aprobado" || p.estado === "programado") {
    const enFb = fbDe(p) && fbDe(p).estado === "programado";
    p.estado = "borrador"; p.aprobado = null; p.aprobado_por = null;
    (enFb ? cancelarFacebook(p) : Promise.resolve(true)).then(() => guardarAhora(true));
    toast(enFb ? "Cambiaste una publicación aprobada: volvió a borrador y se quitó de la agenda de Facebook." : "Cambiaste una publicación aprobada: volvió a borrador y hay que aprobarla de nuevo."); render(); return; }
  $("#rdGuardado").textContent = "Cambios sin guardar…";
  clearTimeout(RD.timer); RD.timer = setTimeout(() => guardarAhora(), 700);
  clearTimeout(RD.tVista); RD.tVista = setTimeout(() => { pintarRevision(); pintarVista(); }, 250);
}
async function guardarAhora(silencio){
  clearTimeout(RD.timer); const p = RD.post; if (!p) return;
  try { await store.guardarPost(p); const g = $("#rdGuardado"); if (g) g.textContent = "Guardado " + horaHM(Date.now()); }
  catch(e) { const g = $("#rdGuardado"); if (g) g.textContent = "No se pudo guardar"; if (!silencio) toast("No se pudo guardar: " + (e.message || e)); }
}

/* Aprobación, agenda y publicación */
function dialogo(html, alAceptar){
  const ov = document.createElement("div"); ov.className = "dlg-back"; ov.id = "rdDlg";
  ov.innerHTML = `<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlgT">${html}</div>`;
  const origen = document.activeElement; document.body.appendChild(ov);
  const cerrar = () => { ov.remove(); if (origen && origen.isConnected) origen.focus(); };
  ov.addEventListener("click", e => { if (e.target === ov || e.target.closest("[data-dlg=cerrar]")) cerrar(); });
  ov.addEventListener("keydown", e => { if (e.key === "Escape") cerrar(); if (e.key === "Tab") { const f = [...ov.querySelectorAll("button, input, select, textarea, a[href]")].filter(x => !x.disabled); if (!f.length) return; const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } } });
  ov.querySelector("form").addEventListener("submit", async e => { e.preventDefault(); const ok = await alAceptar(ov); if (ok !== false) cerrar(); });
  const f = ov.querySelector("input, select, textarea, button.pri"); if (f) f.focus();
}
function aprobar(){
  const p = RD.post, r = revisar(p), errs = r.filter(x => x.nivel === "err"), advs = r.filter(x => x.nivel === "adv");
  if (errs.length) { toast("Antes de aprobar, corrige lo marcado en rojo en la revisión."); $("#rdRev").scrollIntoView({block: "center"}); return; }
  const prop = RD.props.find(x => x.id === p.propuesta_id);
  dialogo(`<form><h2 id="dlgT">Aprobar publicación</h2><p class="lead" style="margin:0 0 8px">${esc(p.titulo)}</p>
    ${advs.length ? `<p class="nota">${advs.length} ${advs.length === 1 ? "advertencia" : "advertencias"} en la revisión: ${esc(advs.map(a => a.txt.split(".")[0]).join(" · "))}.</p>` : ""}
    <label class="ckl"><input type="checkbox" required id="ck1"> Verifiqué los hechos, las cifras y los nombres en la fuente original.</label>
    <label class="ckl"><input type="checkbox" required id="ck2"> El texto es neutral: el mismo trato que daría a cualquier sector o autoridad.</label>
    ${p.sensible ? `<label class="ckl"><input type="checkbox" required id="ck3"> Revisión reforzada: la noticia toca ${esc((prop && prop.cercanos || []).join(", ") || "actores cercanos")} y revisé que el tratamiento no favorezca ni perjudique.</label>` : ""}
    <div class="acciones"><button class="btn" type="button" data-dlg="cerrar">Cancelar</button><button class="btn pri" type="submit">Aprobar</button></div></form>`, async () => {
    const prev = {...p};
    p.aprobado = new Date().toISOString(); p.aprobado_por = RD.user.id; p.revision = {advertencias: advs.map(a => a.txt), confirmo: ["hechos", "neutralidad"].concat(p.sensible ? ["revision_reforzada"] : []), ts: p.aprobado};
    p.estado = p.programado && Date.parse(p.programado) > Date.now() ? "programado" : "aprobado";
    try { await store.guardarPost(p); } catch(e) { Object.assign(p, prev); toast("No se pudo aprobar: " + (e.message || e)); return false; }
    toast(p.estado === "programado" ? "Aprobada y programada." : "Aprobada. Ahora elige: «Publicar ahora» o «Programar»."); render();
  });
}
/* Horarios sugeridos: los primeros de la lista según la meta diaria, sin chocar (90 minutos) con otra publicación agendada. */
function sugerencias(n = 6){
  const ocupados = RD.posts.filter(p => p.id !== (RD.post && RD.post.id) && ["programado", "publicado"].includes(p.estado) && (p.programado || p.publicado)).map(p => Date.parse(p.programado || p.publicado));
  const slots = RD_HORARIOS.slice(0, RD.cfg.meta_diaria || 4).sort(), out = [], ahora = Date.now() + 10 * 6e4;
  for (let d = 0; d < 8 && out.length < n; d++) for (const s of slots) {
    const [h, m] = s.split(":").map(Number), t = new Date(); t.setDate(t.getDate() + d); t.setHours(h, m, 0, 0);
    if (t.getTime() < ahora || ocupados.some(o => Math.abs(o - t.getTime()) < 90 * 6e4)) continue;
    out.push(t.getTime()); if (out.length >= n) break;
  }
  return out;
}
async function programar(){
  const p = RD.post, sug = sugerencias(), ini = p.programado ? Date.parse(p.programado) : sug[0] || Date.now() + 36e5, fb = await RD.fb;
  if (fbDe(p) && fbDe(p).estado === "programado") return toast("Ya está programada en Facebook. Usa «Quitar de la agenda» para cambiarle la hora.");
  const conFb = fb && fb.facebook;
  dialogo(`<form><h2 id="dlgT">Programar</h2><p class="lead" style="margin:0 0 10px">${conFb ? `Facebook la publica sola a esa hora en ${esc(fb.pagina.nombre)}. Para Instagram, historias y reels te llega un aviso al celular con la pieza lista.` : "A esa hora te llega un aviso al celular, con la pieza lista para descargar y el texto para copiar."}</p>
    <label class="campo" for="pgFecha">Fecha y hora<input class="inp" type="datetime-local" id="pgFecha" value="${localInput(ini)}" min="${localInput(Date.now())}" required></label>
    <p class="info" style="margin:0 0 6px">Horarios libres sugeridos (meta: ${RD.cfg.meta_diaria} al día):</p>
    <div class="acciones" style="margin-top:0">${sug.map(t => `<button class="btn sm" type="button" data-sug="${t}">${esc(fechaHora(t))}</button>`).join("") || `<span class="info">No quedan horarios libres en la semana.</span>`}</div>
    ${conFb ? `<label class="ckl"><input type="checkbox" id="pgFb" checked> Que Facebook la publique sola a esa hora (${esc(fb.pagina.nombre)})</label>${fbSelector(p, "pgFbImg")}` : ""}
    <div class="acciones"><button class="btn" type="button" data-dlg="cerrar">Cancelar</button><button class="btn pri" type="submit">Programar</button></div></form>`, async ov => {
    const v = ov.querySelector("#pgFecha").value, t = Date.parse(v); if (!v || !Number.isFinite(t)) return false;
    if (t < Date.now() - 6e4) { toast("Elige una hora futura."); return false; }
    const enFb = conFb && ov.querySelector("#pgFb") && ov.querySelector("#pgFb").checked, img = enFb && ov.querySelector("#pgFbImg") ? ov.querySelector("#pgFbImg").value : "feed";
    if (enFb && (t - Date.now() < 11 * 6e4 || t - Date.now() > 29 * 864e5)) { toast("Facebook solo programa entre 11 minutos y 29 días desde ahora."); return false; }
    const prev = {...p}; Object.assign(p, {programado: new Date(t).toISOString(), estado: "programado", recordado: false});
    try { await store.guardarPost(p); } catch(e) { Object.assign(p, prev); toast("No se pudo programar: " + (e.message || e)); return false; }
    if (enFb) { const ok = await enviarFacebook("programar", img, t); if (!ok) { render(); return; } toast("Programada en Facebook para el " + fechaHora(t) + ". Se publicará sola."); }
    else toast("Programada para el " + fechaHora(t));
    render();
  });
  document.querySelectorAll("[data-sug]").forEach(b => b.addEventListener("click", () => { $("#pgFecha").value = localInput(Number(b.dataset.sug)); }));
}
function marcarPublicada(){
  const p = RD.post;
  dialogo(`<form><h2 id="dlgT">Marcar como publicada</h2><p class="lead" style="margin:0 0 10px">Pega los enlaces de las publicaciones para dejar el registro (opcional).</p>
    <label class="campo" for="enFb">Enlace en Facebook<input class="inp" id="enFb" type="url" placeholder="https://www.facebook.com/…" value="${esc((p.enlaces || {}).fb || "")}"></label>
    <label class="campo" for="enIg">Enlace en Instagram<input class="inp" id="enIg" type="url" placeholder="https://www.instagram.com/p/…" value="${esc((p.enlaces || {}).ig || "")}"></label>
    <div class="acciones"><button class="btn" type="button" data-dlg="cerrar">Cancelar</button><button class="btn pri" type="submit">Marcar publicada</button></div></form>`, async ov => {
    const ok = u => !u || /^https:\/\/(www\.|m\.)?(facebook\.com|fb\.watch|instagram\.com)\//i.test(u), fb = ov.querySelector("#enFb").value.trim(), ig = ov.querySelector("#enIg").value.trim();
    if (!ok(fb) || !ok(ig)) { toast("Los enlaces deben ser de facebook.com o instagram.com."); return false; }
    const prev = {...p}; Object.assign(p, {estado: "publicado", publicado: new Date().toISOString(), enlaces: {fb, ig}, programado: p.programado || new Date().toISOString()});
    try { await store.guardarPost(p); } catch(e) { Object.assign(p, prev); toast("No se pudo guardar: " + (e.message || e)); return false; }
    toast("Registrada como publicada."); render();
  });
}
async function cambiarEstado(estado, msg){
  const p = RD.post;
  if (fbDe(p) && fbDe(p).estado === "programado" && !(await cancelarFacebook(p))) return;
  const prev = {...p}; p.estado = estado;
  if (estado === "borrador") { p.aprobado = null; p.aprobado_por = null; }
  if (estado === "aprobado") p.programado = null;
  try { await store.guardarPost(p); toast(msg); render(); } catch(e) { Object.assign(p, prev); toast("No se pudo guardar: " + (e.message || e)); }
}

/* ─── Facebook (fase 2): publicación en la página de El Pregonero por /api/publicar ─── */
const fbDe = p => (p && p.meta && p.meta.fb) || null;
async function facebookEstado(){
  if (RD.modo !== "editor" || !/^https?:$/.test(location.protocol)) return {facebook: false, prueba: RD.modo === "prueba"};
  try { const r = await fetch("/api/publicar", {cache: "no-store"}); return r.ok ? await r.json() : {facebook: false}; } catch(e) { return {facebook: false}; }
}
async function llamarPublicar(cuerpo){
  const {data: {session}} = await RD.sb.auth.getSession();
  const r = await fetch("/api/publicar", {method: "POST", headers: {"content-type": "application/json", authorization: "Bearer " + session.access_token}, body: JSON.stringify(cuerpo)});
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "Facebook no respondió.");
  return j;
}
/* Lo programado en Facebook cuya hora pasó: se confirma con Meta y se marca publicado. */
async function sincronizarFacebook(){
  const fb = await RD.fb; if (!fb || !fb.facebook) return;
  try { const j = await llamarPublicar({accion: "sincronizar"}); if (j.publicadas) { RD.posts = await store.posts(); render(); toast(`${j.publicadas} ${j.publicadas === 1 ? "publicación salió" : "publicaciones salieron"} en Facebook.`); } } catch(e) {}
}
/* Imágenes para Facebook: la pieza del feed o las láminas del carrusel, en JPEG para no pasar el límite de envío. */
async function jpegsFacebook(c, cual){
  await pzFuentesListas();
  const uno = dibujar => { const cv = document.createElement("canvas"); cv.width = PZ.W; cv.height = PZ.FEED; dibujar(cv.getContext("2d")); return cv.toDataURL("image/jpeg", 0.9).split(",")[1]; };
  return cual === "carrusel" ? pzLaminas(c).map((_, i) => uno(ctx => pzLamina(ctx, c, i))) : [uno(ctx => pzFeed(ctx, c))];
}
function fbSelector(p, id){
  if (!(p.formatos || []).includes("carrusel")) return "";
  const rec = ((p.contenido || {}).formato || {}).facebook === "carrusel";
  return `<label class="campo" for="${id}">Imagen para Facebook<select class="sel" id="${id}"><option value="feed"${rec ? "" : " selected"}>Pieza del feed (1 imagen)</option><option value="carrusel"${rec ? " selected" : ""}>Carrusel (${pzLaminas(p.contenido || {}).length} imágenes)${rec ? " · recomendado" : ""}</option></select></label>`;
}
async function enviarFacebook(accion, cual, cuando){
  const p = RD.post;
  try {
    const imagenes = await jpegsFacebook(p.contenido || {}, cual);
    const j = await llamarPublicar({accion, post_id: p.id, imagenes, programado: cuando ? new Date(cuando).toISOString() : undefined});
    p.meta = {...(p.meta || {}), fb: j.fb}; p.estado = j.estado;
    if (j.estado === "publicado") { p.publicado = new Date().toISOString(); p.enlaces = {...(p.enlaces || {}), fb: j.fb.enlace}; }
    else { p.recordado = true; }
    return true;
  } catch(e) { toast("Facebook: " + (e.message || e)); return false; }
}
async function cancelarFacebook(p){
  try { await llamarPublicar({accion: "cancelar", post_id: p.id}); if (p.meta) delete p.meta.fb; return true; }
  catch(e) { toast("No se pudo quitar de Facebook: " + (e.message || e) + " Revísalo en la página."); return false; }
}
async function pintarFacebook(){
  const el = $("#rdFb"); if (!el) return; const p = RD.post, fb = await RD.fb, f = fbDe(p);
  if (!$("#rdFb") || RD.post !== p) return;
  if (!fb || !fb.facebook) { el.innerHTML = `<p class="info" style="margin:0">${fb && fb.prueba ? "En el modo de prueba no se publica en Facebook." : fb && fb.error ? esc(fb.error) : "La página de Facebook aún no está conectada. Mientras tanto, descarga la pieza y copia el texto."}</p>`; return; }
  const pag = `${esc(fb.pagina.nombre)}${fb.pagina.usuario ? " (@" + esc(fb.pagina.usuario) + ")" : ""}`;
  if (f && f.estado === "publicado") { el.innerHTML = `<p style="margin:0 0 8px">Publicada en ${pag}.</p>${f.enlace ? `<a class="btn sm" href="${esc(f.enlace)}" target="_blank" rel="noopener noreferrer">Ver en Facebook</a>` : ""}`; return; }
  if (f && f.estado === "programado") { el.innerHTML = `<p style="margin:0 0 8px">Programada en ${pag} para el ${esc(fechaHora(Date.parse(f.programado)))}. Facebook la publicará sola.</p><p class="info" style="margin:0">Para cambiarle la hora o el contenido, primero quítala de la agenda.</p>`; return; }
  if (p.estado === "publicado") { el.innerHTML = `<p class="info" style="margin:0">Marcada como publicada a mano.</p>`; return; }
  el.innerHTML = `<p style="margin:0 0 8px">Conectada a ${pag}.</p>${fbSelector(p, "fbImg")}<div class="acciones" style="margin-top:4px"><button class="btn pri sm" type="button" data-act="fb-ahora">Publicar ahora en Facebook</button></div><p class="info" style="margin:8px 0 0">Para dejarla agendada, usa «Programar»: Facebook la publica sola a la hora.</p>`;
}
async function publicarAhoraFacebook(){
  const fb = await RD.fb;
  if (!fb || !fb.facebook) return toast(fb && fb.prueba ? "En el modo de prueba no se publica en Facebook." : "Facebook no está conectado: descarga la pieza, copia el texto y usa «Marcar como publicada».");
  const p = RD.post, rec = ((p.contenido || {}).formato || {}).facebook === "carrusel" && (p.formatos || []).includes("carrusel") ? "carrusel" : "feed", cual = $("#fbImg") ? $("#fbImg").value : rec;
  dialogo(`<form><h2 id="dlgT">Publicar ahora en Facebook</h2><p class="lead" style="margin:0 0 10px">Sale de inmediato en la página de El Pregonero, con el texto de Facebook aprobado y ${cual === "carrusel" ? "las láminas del carrusel" : "la pieza del feed"}.</p>
    <p class="info" style="margin:0">Una vez publicada, cualquier corrección se hace en Facebook y se indica en la publicación, como dice la línea editorial.</p>
    <div class="acciones"><button class="btn" type="button" data-dlg="cerrar">Cancelar</button><button class="btn pri" type="submit">Publicar</button></div></form>`, async ov => {
    const b = ov.querySelector("button[type=submit]"); b.disabled = true; b.textContent = "Publicando…";
    const ok = await enviarFacebook("publicar", cual);
    if (ok) toast("Publicada en Facebook."); render(); return ok;
  });
}

/* ─── Calendario ─── */
function vistaCalendario(){
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0); const meta = RD.cfg.meta_diaria || 4, slots = RD_HORARIOS.slice(0, meta).sort();
  const agendados = RD.posts.filter(p => ["programado", "publicado"].includes(p.estado) && (p.programado || p.publicado));
  const dias = Array.from({length: 7}, (_, i) => { const d = new Date(hoy); d.setDate(d.getDate() + i); return d; });
  const aprobadas = RD.posts.filter(p => p.estado === "aprobado");
  return `<h2>Calendario</h2><p class="lead">Próximos 7 días. Meta: ${meta} publicaciones al día (se cambia en Ajustes). Los huecos muestran los horarios sugeridos.</p>
    ${aprobadas.length ? `<p class="nota">${aprobadas.length} ${aprobadas.length === 1 ? "publicación aprobada espera" : "publicaciones aprobadas esperan"} horario: ${aprobadas.map(p => `<a href="#post/${p.id}">${esc(p.titulo)}</a>`).join(" · ")}</p>` : ""}
    <div class="cal" style="margin-top:14px">${dias.map(d => {
      const k = diaClave(d), del = agendados.filter(p => diaClave(Date.parse(p.estado === "publicado" && p.publicado ? p.publicado : p.programado)) === k).sort((a, b) => Date.parse(a.programado || a.publicado) - Date.parse(b.programado || b.publicado));
      const futuro = s => { const t = new Date(d); t.setHours(Number(s.slice(0, 2)), Number(s.slice(3)), 0, 0); return t.getTime() > Date.now(); };
      const libres = slots.filter(futuro).filter(s => !del.some(p => { const t = new Date(Date.parse(p.programado || p.publicado)); return Math.abs(t.getHours() * 60 + t.getMinutes() - (Number(s.slice(0, 2)) * 60 + Number(s.slice(3)))) < 90; }));
      return `<section class="dia ${k === diaClave(Date.now()) ? "hoy" : ""}" aria-label="${esc(d.toLocaleDateString("es-CL", {weekday: "long", day: "numeric", month: "long"}))}">
        <h4>${esc(d.toLocaleDateString("es-CL", {weekday: "short", day: "numeric"}))}</h4><div class="cuenta ${del.length >= meta ? "ok" : ""}">${del.length} de ${meta}</div>
        ${del.map(p => `<button class="cita ${p.estado === "publicado" ? "pub" : ""}" type="button" data-act="abrir" data-id="${p.id}"><b>${esc(horaHM(Date.parse(p.estado === "publicado" && p.publicado ? p.publicado : p.programado)))} · ${p.estado === "publicado" ? "publicada" : "programada"}</b>${esc(p.titulo)}</button>`).join("")}
        ${libres.slice(0, Math.max(0, meta - del.length)).map(s => `<span class="hueco">${s} · libre</span>`).join("")}</section>`; }).join("")}</div>`;
}

/* ─── Ajustes ─── */
function vistaAjustes(){
  const c = RD.cfg;
  const provs = Object.entries(PROVINCIAS).map(([prov, cs]) => { const todas = cs.every(x => c.comunas.includes(x)), alguna = cs.some(x => c.comunas.includes(x));
    return `<div class="prov"><label class="prov-h"><input type="checkbox" data-prov="${esc(prov)}" ${todas ? "checked" : ""} ${!todas && alguna ? 'data-mixto="1"' : ""}> Provincia de ${esc(prov)}</label>
      <div class="comunas">${cs.map(x => `<label class="ck"><input type="checkbox" data-comuna="${esc(x)}" ${c.comunas.includes(x) ? "checked" : ""}>${esc(x)}</label>`).join("")}</div></div>`; }).join("");
  const push = "serviceWorker" in navigator && "PushManager" in window && RD.cfgPub && RD.cfgPub.avisos && RD.cfgPub.avisos.push && RD.modo === "editor";
  return `<h2>Ajustes</h2><p class="lead">Territorios que cubre El Pregonero, avisos y revisión reforzada. Se guardan solos.</p>
    <div class="ajustes">
      <section class="panel" aria-labelledby="hTerr"><h3 id="hTerr">Territorios</h3>
        <p class="info" style="margin-top:0">${c.comunas.length} de 38 comunas de la Región de Valparaíso. <button class="btn sm ghost" type="button" data-act="piloto">Solo litoral central</button><button class="btn sm ghost" type="button" data-act="todas">Toda la región</button><button class="btn sm ghost" type="button" data-act="ninguna">Ninguna</button></p>
        ${provs}
        <div class="prov"><label class="prov-h"><input type="checkbox" data-cfg="nacional" ${c.nacional ? "checked" : ""}> Noticias regionales y nacionales que afectan a la región</label><p class="info" style="margin:6px 0 0">Gobierno regional, consejo regional, delegación, puertos y temas de alcance provincial o regional, aunque no nombren una comuna.</p></div>
      </section>
      <div>
        <section class="panel" aria-labelledby="hAv"><h3 id="hAv">Avisos</h3>
          <label class="campo" for="cfUmbral">Avisar desde este puntaje de impacto: <b id="cfUmbralV">${c.umbral}</b><input type="range" id="cfUmbral" min="50" max="95" step="5" value="${c.umbral}" data-cfg="umbral"></label>
          <label class="ckl"><input type="checkbox" data-cfg="silencio" ${c.silencio !== false ? "checked" : ""}> Silencio de 23:00 a 7:00, salvo puntaje 90 o más</label>
          <label class="campo" for="cfHora">Resumen de la mañana<select class="sel" id="cfHora" data-cfg="resumen_hora">${[6, 7, 8, 9, 10].map(h => `<option value="${h}" ${c.resumen_hora === h ? "selected" : ""}>${String(h).padStart(2, "0")}:00</option>`).join("")}</select></label>
          ${push ? `<button class="btn" type="button" data-act="push">${ico("campana")}Activar avisos en este dispositivo</button><p class="info">En iPhone, primero instala Redacción en la pantalla de inicio (Compartir › Agregar a inicio) y actívalos desde ahí.</p>` : `<p class="info">${RD.modo === "prueba" ? "Los avisos al celular funcionan con la cuenta de editor en pregonia.vercel.app." : "Faltan las llaves de avisos (VAPID) en Vercel para activarlos."}</p>`}
        </section>
        <section class="panel" aria-labelledby="hMeta"><h3 id="hMeta">Ritmo de publicación</h3>
          <label class="campo" for="cfMeta">Publicaciones por día<select class="sel" id="cfMeta" data-cfg="meta_diaria">${[1, 2, 3, 4, 5, 6].map(n => `<option ${c.meta_diaria === n ? "selected" : ""}>${n}</option>`).join("")}</select></label>
          <p class="info" style="margin:0">Horarios sugeridos: ${RD_HORARIOS.slice(0, c.meta_diaria).sort().join(", ")}.</p>
        </section>
        <section class="panel" aria-labelledby="hRel"><h3 id="hRel">Revisión reforzada</h3>
          <p class="info" style="margin-top:0">Si una noticia nombra alguno de estos términos, se marca y la aprobación pide una confirmación adicional. Úsala para territorios, personas u organizaciones con las que tienes relación.</p>
          <label class="campo" for="cfCerc">Términos, separados por coma<textarea class="inp" id="cfCerc" rows="3" data-cfg="cercanos">${esc((c.cercanos || []).join(", "))}</textarea></label>
        </section>
        <section class="panel suave" aria-labelledby="hPeso"><h3 id="hPeso">Cómo se calcula el impacto</h3>
          <p class="info" style="margin:0">Repercusión en medios (35 puntos: cuántos medios y de qué alcance) · interacción en redes de las cuentas de medios monitoreadas (20) · autoridades de la nómina que aparecen (15) · temas críticos: agua, emergencias, seguridad, salud y grandes inversiones, más gravedad (20) · recencia (10). Es por palabras y conteos, sin IA, para que sea explicable.</p>
        </section>
      </div>
    </div>`;
}
let tCfg = null;
function guardarCfgLuego(){ clearTimeout(tCfg); tCfg = setTimeout(async () => { try { await store.guardarCfg(RD.cfg); toast("Ajustes guardados."); if (RD.modo === "prueba") RD.props = await store.propuestas(); pintarTabs(); } catch(e) { toast("No se pudieron guardar los ajustes: " + (e.message || e)); } }, 500); }
function ponerComunas(lista){ RD.cfg.comunas = [...new Set(lista)].sort((a, b) => a.localeCompare(b, "es")); guardarCfgLuego(); render(); }
async function activarPush(){
  try {
    const per = await Notification.requestPermission(); if (per !== "granted") return toast("No se activaron: el navegador no dio permiso.");
    const reg = await navigator.serviceWorker.register("/sw.js"), listo = await navigator.serviceWorker.ready;
    const b64u = s => { const p = (s + "===".slice((s.length + 3) % 4)).replace(/-/g, "+").replace(/_/g, "/"), b = atob(p); return Uint8Array.from(b, c => c.charCodeAt(0)); };
    const sub = await listo.pushManager.getSubscription() || await listo.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: b64u(RD.cfgPub.avisos.push)});
    const j = sub.toJSON(), {error} = await RD.sb.from("redaccion_suscripciones").upsert({endpoint: j.endpoint, usuario: RD.user.id, p256dh: j.keys.p256dh, auth: j.keys.auth, dispositivo: navigator.userAgent.slice(0, 160)}, {onConflict: "endpoint"});
    if (error) throw error; reg && toast("Avisos activados en este dispositivo.");
  } catch(e) { toast("No se pudieron activar los avisos: " + (e.message || e)); }
}

/* Buscar ahora */
async function buscarAhora(btn){
  btn.disabled = true; const txt = btn.innerHTML; btn.innerHTML = `${ico("buscar")}Buscando…`;
  try {
    if (RD.modo === "editor") {
      const {data: {session}} = await RD.sb.auth.getSession();
      const r = await fetch("/api/redaccion", {method: "POST", headers: {authorization: "Bearer " + session.access_token}}), j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "La búsqueda no respondió");
      toast(`Búsqueda lista: ${j.hechos || 0} hechos revisados${j.nuevas ? `, ${j.nuevas} nuevos` : ""}.`);
    } else toast("Modo prueba: se recalcularon los puntajes con los datos ficticios.");
    RD.props = await store.propuestas(); render();
  } catch(e) { toast(String(e.message || e)); }
  btn.disabled = false; btn.innerHTML = txt;
}

/* ─── Eventos ─── */
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return; const a = b.dataset.act;
  if (a === "salir") return salir();
  if (a === "prueba") return entrarPrueba();
  if (a === "buscar") return buscarAhora(b);
  if (a === "redactar") return redactar(b.dataset.id, b);
  if (a === "descartar" || a === "reactivar") { const p = RD.props.find(x => x.id === b.dataset.id); if (!p) return; const est = a === "descartar" ? "descartada" : "nueva";
    try { await store.marcarPropuesta(p.id, est); p.estado = est; render(); toast(a === "descartar" ? "Descartada. La encuentras en «Descartadas»." : "Volvió a las propuestas."); } catch(er) { toast("No se pudo guardar: " + (er.message || er)); } return; }
  if (a === "abrir") { location.hash = "post/" + b.dataset.id; return; }
  if (a === "fmt") { RD.fmt = b.dataset.f; RD.lam = 0; document.querySelectorAll("[data-act=fmt]").forEach(x => x.setAttribute("aria-pressed", x.dataset.f === RD.fmt)); return pintarVista(); }
  if (a === "generar") { const p = RD.post; if (!p.formatos.includes(b.dataset.f)) p.formatos.push(b.dataset.f);
    if (b.dataset.f === "carrusel" && !(p.contenido.slides || []).length) p.contenido.slides = [{t: "Qué pasó", x: p.contenido.bajada || ""}];
    if (b.dataset.f === "reel" && !(p.contenido.guion && p.contenido.guion.intro)) p.contenido.guion = {intro: p.contenido.titular, datos: (p.contenido.datos || []).slice(0, 3), cierre: `Fuente: ${pzFuentes(p.contenido)}. Esto fue El Pregonero.`};
    RD.fmt = b.dataset.f; await guardarAhora(); render(); return; }
  if (a === "lam") { RD.lam = Number(b.dataset.i); document.querySelectorAll("[data-act=lam]").forEach(x => x.setAttribute("aria-pressed", Number(x.dataset.i) === RD.lam)); return pintarVista(); }
  if (a === "lamina") { RD.post.contenido.slides = (RD.post.contenido.slides || []).concat([{t: "", x: ""}]); await guardarAhora(); return render(); }
  if (a === "dl") return descargar(b.dataset.f);
  if (a === "compartir-pieza") return compartirPieza();
  if (a === "copiar") return copiarTexto(b.dataset.q);
  if (a === "fuente") return rearmarFuente();
  if (a === "rehacer") return rehacer(b);
  if (a === "aprobar") { await guardarAhora(true); return aprobar(); }
  if (a === "programar") return programar();
  if (a === "publicada") return marcarPublicada();
  if (a === "desprogramar") return cambiarEstado("aprobado", "Se quitó de la agenda; sigue aprobada.");
  if (a === "volver-borrador") return cambiarEstado("borrador", "Volvió a borrador.");
  if (a === "descartar-post") return cambiarEstado("descartado", "Publicación descartada.");
  if (a === "voz-reel") return grabarVoz(b);
  if (a === "fb-ahora") return publicarAhoraFacebook();
  if (a === "mp4") return prepararMP4(b);
  if (a === "push") return activarPush();
  if (a === "piloto") return ponerComunas(RD_PILOTO);
  if (a === "todas") return ponerComunas(COMUNAS_V);
  if (a === "ninguna") return ponerComunas([]);
});
document.addEventListener("input", e => {
  const el = e.target;
  if (el.dataset.k && RD.post) return alEditar(el);
  if (el.id === "cfUmbral") { $("#cfUmbralV").textContent = el.value; RD.cfg.umbral = Number(el.value); guardarCfgLuego(); }
  if (el.id === "cfCerc") { RD.cfg.cercanos = el.value.split(",").map(x => x.trim()).filter(Boolean).slice(0, 30); guardarCfgLuego(); }
});
document.addEventListener("change", e => {
  const el = e.target;
  if (el.dataset.filtro === "ver" || el.dataset.filtro === "com") { filtroProp[el.dataset.filtro] = el.value; return render(); }
  if (el.dataset.filtro === "post") { filtroPost = el.value; return render(); }
  if (el.dataset.comuna) { const x = el.dataset.comuna; ponerComunas(el.checked ? RD.cfg.comunas.concat([x]) : RD.cfg.comunas.filter(y => y !== x)); return; }
  if (el.dataset.prov) { const cs = PROVINCIAS[el.dataset.prov]; ponerComunas(el.checked ? RD.cfg.comunas.concat(cs) : RD.cfg.comunas.filter(y => !cs.includes(y))); return; }
  if (el.dataset.cfg === "nacional" || el.dataset.cfg === "silencio") { RD.cfg[el.dataset.cfg] = el.checked; guardarCfgLuego(); if (el.dataset.cfg === "nacional") render(); return; }
  if (el.dataset.cfg === "resumen_hora" || el.dataset.cfg === "meta_diaria") { RD.cfg[el.dataset.cfg] = Number(el.value); guardarCfgLuego(); render(); }
});
document.addEventListener("submit", e => { if (e.target.id === "rdLogin") ingresar(e); });
window.addEventListener("pagehide", () => { if (RD.timer) guardarAhora(true); });
/* Casillas de provincia con selección parcial. */
new MutationObserver(() => document.querySelectorAll("[data-mixto]").forEach(x => { x.indeterminate = true; })).observe(document.getElementById("rdMain"), {childList: true});
iniciar();
/* Actualización automática de la app instalada: al volver a la app (o cada 5 minutos con la app a la vista) revisa
   /version.json; si hay una versión publicada más nueva, se recarga al volver a ella, o en cuanto no haya nada a medio
   escribir ni un diálogo abierto. La versión la pone scripts/build.py (resumen del archivo publicado). */
(() => {
  const V = "__PREGONIA_VERSION__", K = "redaccion";
  if (/^__/.test(V) || !/^https?:$/.test(location.protocol)) return;
  let nueva = false;
  const ocupado = () => { const a = document.activeElement;
    return !!((a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable)) || document.querySelector("#entBack, #insBack, #dlgBack, .vid-back")); };
  const recargar = () => { if (nueva && !ocupado()) location.reload(); };
  async function revisar(){
    try { const j = await (await fetch("/version.json", {cache: "no-store"})).json(); if (j && j[K] && j[K] !== V) nueva = true; } catch(e) {}
    return nueva;
  }
  document.addEventListener("visibilitychange", async () => { if (document.visibilityState === "visible" && await revisar()) recargar(); });
  setInterval(() => { if (document.visibilityState === "visible") revisar().then(n => { if (n && !document.hasFocus()) recargar(); }); }, 5 * 60e3);
  addEventListener("focusout", () => { if (nueva) setTimeout(recargar, 1500); });
})();

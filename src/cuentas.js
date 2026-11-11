/* Cuentas: municipios y autoridades electas (diputados, senadores, consejeros regionales y concejales).
   Una cuenta de autoridad funciona con la misma lógica que la de un municipio: temas, menciones, reportes, respuestas y avisos,
   pero sus temas base son la persona y su territorio, y sus piezas y reportes están pensados para su cargo y su equipo.
   La entrada al sistema se elige por rol, zona y nombre. Nunca se inventan noticias sobre personas reales:
   las menciones de una autoridad salen solo de medios reales. */
const esAut = (c = cuenta()) => !!(c && c.perfil && c.perfil.tipo === "Autoridad");
const cargoCuenta = (c = cuenta()) => esAut(c) ? cargoDe(c.perfil.rol, c.perfil.g) : "";
function inst(c = cuenta()){ return esAut(c) ? `${cargoCuenta(c)} ${c.perfil.nombre}` : "Municipalidad de " + S.org; }
const territorio = (c = cuenta()) => esAut(c) ? c.perfil.comunas : [S.org];
const datosLbl = () => esAut() ? "DATOS DE LA OFICINA" : "DATOS DEL MUNICIPIO";
const baseAutoridad = p => `[Completar] Comisiones o espacios que integra ${p.nombre}.\n[Completar] Proyectos, mociones o iniciativas que impulsa, con su estado.\n[Completar] Gestiones recientes en ${p.zonaNombre}, con fecha y resultado.\n[Completar] Vocería autorizada y contacto de prensa.`;

/* Temas base de una autoridad: la persona (por todas las formas en que la nombra la prensa) y su territorio. */
function candidatosAut(p){
  const cargo = cargoDe(p.rol, p.g), ctxTerr = ["comuna", "vecinos", "region de valparaiso", "municipio", "municipalidad", "alcalde", "alcaldesa", "gobierno regional", "core", "diputado", "diputada", "senador", "senadora"];
  const nucleo = [
    T(p.nombre, "Núcleo", p.variantes.slice(), [], [], {persona: true}),
    T(`${p.zonaNombre} (territorio)`, "Núcleo", p.comunas.slice(0, 40), p.comunas.length > 6 ? ctxTerr : [], ["marruecos", "colombia", "texas", "cartagena de indias"])
  ];
  const otros = [T(CARGOS[p.rol].organo, "Candidato", [norm(CARGOS[p.rol].organo), cargo.toLowerCase()], p.comunas.length > 6 ? ["valparaiso"] : p.comunas.slice())];
  (p.agenda || []).forEach(a => { if (a.trim()) otros.push(T(a.trim(), "Agenda", [a.trim()])); });
  Object.entries(SENS).forEach(([key, s]) => otros.push(T(s.n, (p.sens || []).includes(key) ? "Sensibilidad" : "Descubrimiento", s.t.slice(), p.comunas.slice(0, 40), [], {sens: key})));
  return {nucleo, otros};
}
function crearCuentaAutoridad({rol, zona, a, nombre, g}){
  const z = zonaDe(rol, zona); if (!z) return null;
  const persona = a || {rol, zona, n: nombre.trim(), c: nombre.trim(), p: "", g};
  const perfil = {tipo: "Autoridad", rol, g: persona.g, zona, zonaNombre: rol === "concejal" ? "Comuna de " + z.n : z.n, comunas: z.comunas.slice(), autoridadId: a ? a.id : null,
    nombre: persona.n, completo: persona.c, partido: persona.p, variantes: variantesNombre(persona), plan: "regional", agenda: [], sens: [], comuna: null};
  let key = persona.n; if (COMUNAS.includes(key) || (S.cuentas[key] && !esAut(S.cuentas[key]))) key += " (" + cargoDe(rol, persona.g) + ")";
  if (!S.cuentas[key]) { const pr = proponer(perfil); S.cuentas[key] = {perfil, temas: pr.base, sugeridos: pr.sugeridos, borradores: 0, caracterizada: true, visto: false, onbOculto: false, base: baseAutoridad(perfil)}; }
  return key;
}
/* Selector del encabezado: municipios, autoridades ya agregadas y la opción de entrar con otra cuenta. */
function opcionesCuenta(){
  const auts = Object.keys(S.cuentas).filter(k => esAut(S.cuentas[k]));
  return `<optgroup label="Municipios">${COMUNAS.map(c => `<option value="${esc(c)}" ${c === S.org ? "selected" : ""}>${esc(c)}</option>`).join("")}</optgroup>`
    + (auts.length ? `<optgroup label="Autoridades">${auts.map(k => `<option value="${esc(k)}" ${k === S.org ? "selected" : ""}>${esc(k)} · ${esc(cargoCuenta(S.cuentas[k]))}</option>`).join("")}</optgroup>` : "")
    + `<option value="__entrar">Entrar con otra cuenta…</option>`;
}
function cambiarCuenta(key){
  if (!S.cuentas[key]) return;
  S.org = key; save();
  const sel = $("#org"); sel.innerHTML = opcionesCuenta(); sel.value = key;  // el cambio lee el valor del selector: primero debe existir la opción
  sel.dispatchEvent(new Event("change"));
}

/* Entrada por rol, zona y nombre */
const ENT = {rol: "municipio", zona: "Casablanca", sel: "", libre: "", g: "F", enPortada: false};
function entNombres(){ return AUTORIDADES.filter(a => a.rol === ENT.rol && a.zona === ENT.zona); }
function entZonas(){ return ENT.rol === "municipio" ? COMUNAS.map(c => ({id: c, n: c, comunas: [c]})) : ZONAS[ENT.rol]; }
function entCuerpo(){
  const zs = entZonas(), z = zs.find(x => x.id === ENT.zona) || zs[0]; ENT.zona = z.id;
  const ns = entNombres(), lista = ENT.rol !== "municipio" && ENT.rol !== "concejal";
  if (lista && ENT.sel !== "__otra" && !ns.some(a => a.id === ENT.sel)) ENT.sel = ns[0] ? ns[0].id : "__otra";
  const lbl = CARGOS[ENT.rol].zona, gen = `<div class="ent-gen" role="radiogroup" aria-label="Cargo"><label><input type="radio" name="entG" value="F" ${ENT.g === "F" ? "checked" : ""}> ${cargoDe(ENT.rol, "F")}</label><label><input type="radio" name="entG" value="M" ${ENT.g === "M" ? "checked" : ""}> ${cargoDe(ENT.rol, "M")}</label></div>`;
  return `<fieldset class="ent-paso"><legend><span class="n">1</span>Rol</legend>
      <div class="ent-roles" role="radiogroup" aria-label="Rol">${Object.entries(CARGOS).map(([k, r]) => `<label class="ent-rol ${ENT.rol === k ? "on" : ""}"><input type="radio" name="entRol" value="${k}" ${ENT.rol === k ? "checked" : ""}><b>${k === "municipio" ? "Municipio" : r.n.replace(" o ", " / ")}</b><small>${r.organo}</small></label>`).join("")}</div></fieldset>
    <fieldset class="ent-paso"><legend><span class="n">2</span>${lbl}</legend>
      <select id="entZona" aria-label="${lbl}">${zs.map(x => `<option value="${esc(x.id)}" ${x.id === z.id ? "selected" : ""}>${esc(x.n)}</option>`).join("")}</select>
      ${z.comunas.length > 1 ? `<p class="ent-com">${z.comunas.length === COMUNAS_V.length ? `Las ${z.comunas.length} comunas de la Región de Valparaíso.` : `${z.comunas.length} comunas: ${z.comunas.map(esc).join(", ")}.`}</p>` : ENT.rol === "municipio" ? `<p class="ent-com">Comunas del piloto del litoral central.</p>` : ""}</fieldset>
    ${ENT.rol === "municipio" ? "" : `<fieldset class="ent-paso"><legend><span class="n">3</span>Nombre</legend>
      ${lista ? `<div class="ent-ns" role="radiogroup" aria-label="Nombre">${ns.map(a => `<label class="ent-n ${ENT.sel === a.id ? "on" : ""}"><input type="radio" name="entN" value="${a.id}" ${ENT.sel === a.id ? "checked" : ""}><b>${esc(a.n)}</b><small>${esc(cargoDe(a.rol, a.g))}${a.p ? " · " + esc(a.p) : ""}</small></label>`).join("")}<label class="ent-n ${ENT.sel === "__otra" ? "on" : ""}"><input type="radio" name="entN" value="__otra" ${ENT.sel === "__otra" ? "checked" : ""}><b>Otra persona</b><small>Si hubo un reemplazo o no aparece</small></label></div>` : ""}
      ${!lista || ENT.sel === "__otra" ? `<input id="entLibre" class="ent-libre" value="${esc(ENT.libre)}" placeholder="Nombre y apellido" autocomplete="off" aria-label="Nombre y apellido">${gen}` : ""}
      ${lista ? `<p class="ent-com">Nómina al inicio del período. Corte: ${NOMINA_CORTE}.</p>` : ""}</fieldset>`}
    <p class="cap-err" id="entErr" role="alert" hidden></p>`;
}
function entPintar(){ const b = $("#entBody"); if (!b) return; const foco = document.activeElement && (document.activeElement.name || document.activeElement.id); b.innerHTML = entCuerpo(); const el = foco && (document.getElementById(foco) || document.querySelector(`[name="${foco}"]:checked`)); if (el) el.focus(); }
function entAbrir(enPortada){
  ENT.enPortada = !!enPortada;
  const c = cuenta(); if (c && esAut(c)) Object.assign(ENT, {rol: c.perfil.rol, zona: c.perfil.zona, sel: c.perfil.autoridadId || "__otra", libre: c.perfil.autoridadId ? "" : c.perfil.nombre, g: c.perfil.g}); else Object.assign(ENT, {rol: "municipio", zona: S.org});
  $("#entBack")?.remove();
  const ov = document.createElement("div"); ov.className = "vid-back ent-back"; ov.id = "entBack";
  ov.innerHTML = `<section class="vid ent" role="dialog" aria-modal="true" aria-labelledby="entT">
    <header class="vid-h"><div><h2 id="entT">¿Para quién es PregonIA?</h2><p>Elige el rol, la zona y el nombre. Cada cuenta sigue la prensa de esa persona o institución y de su territorio.</p></div><button class="btn ghost" type="button" data-act="ent-cerrar" aria-label="Cerrar"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>
    <form class="ent-f" id="entForm" novalidate><div id="entBody"></div><div class="ent-acts"><button class="btn alt" type="submit">Entrar</button></div></form></section>`;
  document.body.appendChild(ov); document.body.classList.add("vid-on"); entAbrir.vuelta = document.activeElement;
  entPintar(); setTimeout(() => document.querySelector('#entBack input[name="entRol"]:checked')?.focus(), 30);
}
function entCerrar(){ $("#entBack")?.remove(); document.body.classList.remove("vid-on"); const o = entAbrir.vuelta; if (o && o.isConnected && !ENT.enPortada) o.focus(); }
function entEntrar(e){
  e.preventDefault();
  const err = $("#entErr"); let key;
  if (ENT.rol === "municipio") key = ENT.zona;
  else {
    const a = ENT.sel && ENT.sel !== "__otra" ? AUTORIDADES.find(x => x.id === ENT.sel) : null, libre = ENT.libre.trim().replace(/\s+/g, " ");
    if (!a && (libre.length < 5 || libre.split(" ").length < 2)) { err.textContent = "Escribe nombre y apellido."; err.hidden = false; $("#entLibre")?.focus(); return; }
    key = crearCuentaAutoridad({rol: ENT.rol, zona: ENT.zona, a, nombre: libre, g: ENT.g});
  }
  const portada = ENT.enPortada; entCerrar();
  if (portada) { mostrarPortada(false); if (!location.hash || location.hash === "#portada") location.hash = "inicio"; }
  if (key !== S.org) cambiarCuenta(key); else render(true);
  if (esAut()) toast(`Entraste como ${inst()}. ${typeof MODO !== "undefined" && MODO.disponible ? "Buscando sus menciones en medios reales…" : "Sus menciones se leen de medios reales en pregonia.vercel.app."}`);
}
document.addEventListener("change", e => {
  const t = e.target;
  if (t.name === "entRol") { ENT.rol = t.value; ENT.zona = ""; ENT.sel = ""; ENT.libre = ""; entPintar(); }
  if (t.id === "entZona") { ENT.zona = t.value; ENT.sel = ""; entPintar(); }
  if (t.name === "entN") { ENT.sel = t.value; entPintar(); if (t.value === "__otra") $("#entLibre")?.focus(); }
  if (t.name === "entG") ENT.g = t.value;
});
document.addEventListener("input", e => { if (e.target.id === "entLibre") ENT.libre = e.target.value; });
document.addEventListener("submit", e => { if (e.target.id === "entForm") entEntrar(e); });
document.addEventListener("click", e => {
  if (e.target.id === "entBack" && !ENT.enPortada) return entCerrar();
  const b = e.target.closest("[data-act]"); if (!b) return;
  if (b.dataset.act === "ent-cerrar") entCerrar();
  if (b.dataset.act === "ent-abrir") entAbrir(false);
});
document.addEventListener("keydown", e => {
  if (!$("#entBack")) return;
  if (e.key === "Escape") { e.preventDefault(); entCerrar(); return; }
  if (e.key === "Tab") { const f = [...document.querySelectorAll("#entBack input:checked, #entBack input:not([type=radio]), #entBack select, #entBack button")].filter(x => x.offsetParent); if (!f.length) return; const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
});

/* Frente a sus pares: presencia en prensa de las autoridades del mismo cargo y zona (solo con noticias reales). */
function paresAutCard(){
  const p = cuenta().perfil, pares = MODO && MODO.tipo === "real" && MODO.info && MODO.info.pares;
  if (!pares || !pares.length) return `<div class="card"><h3>Frente a sus pares</h3><p class="muted" style="margin:0">${p.autoridadId ? `Con noticias reales, aquí se compara la presencia en prensa de ${esc(p.nombre)} con la de ${CARGOS[p.rol].n.split(" o ")[0].toLowerCase()}s de ${esc(p.zonaNombre)} en los últimos 14 días.` : "La comparación con pares está disponible para las autoridades de la nómina."}</p></div>`;
  const filas = pares.slice().sort((a, b) => b.n - a.n), max = Math.max(1, ...filas.map(r => r.n)), yo = filas.findIndex(r => r.yo) + 1, tot = filas.reduce((s, r) => s + r.n, 0) || 1, mio = filas.find(r => r.yo) || {n: 0};
  return `<div class="card"><h3>Frente a sus pares</h3>
    <p class="vtx" style="margin:0 0 10px">${esc(p.nombre)} es ${yo}.° de ${filas.length} en presencia en prensa de ${esc(p.zonaNombre)} en 14 días, con ${plural(mio.n, "nota", "notas")} (${pct(mio.n, tot)}% del total del grupo).</p>
    <ul class="hbars">${filas.map(r => `<li><span class="t"><i style="background:${r.yo ? "var(--accent)" : "var(--amb-l)"}"></i><span>${r.yo ? "<b>" + esc(r.n_) + "</b>" : esc(r.n_)}${r.p ? ` <small class="muted">${esc(r.p)}</small>` : ""}</span></span><span class="b" ${tipAttr(r.n + " notas")}><i style="width:${(r.n / max * 100).toFixed(1)}%;background:${r.yo ? "var(--accent)" : "var(--amb-l)"}"></i></span><span class="v mono">${r.n}</span></li>`).join("")}</ul>
    <p class="hint" style="margin:10px 0 0">Cuenta notas con el nombre en el titular o el resumen, en medios chilenos, según Google News. No mide tono. Uso interno.</p></div>`;
}

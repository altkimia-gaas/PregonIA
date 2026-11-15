/* Cuentas: municipios con su alcalde o alcaldesa (las 38 comunas de la región) y autoridades (diputados, senadores, consejeros regionales, concejales,
   gobernador regional y delegados presidenciales).
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
  // Las ocho temáticas con la lente de su cargo y los dolores de su territorio; el contexto incluye su nombre, porque sus notas reales ya la nombran.
  Object.entries(ejesDe(p)).forEach(([key, s]) => otros.push(T(s.n, (p.sens || []).includes(key) ? "Sensibilidad" : "Descubrimiento", s.t.slice(), s.ctx.slice(), [], {sens: key})));
  return {nucleo, otros};
}
function crearCuentaAutoridad({rol, zona, a, nombre, g}){
  const z = zonaDe(rol, zona); if (!z) return null;
  const persona = a || {rol, zona, n: nombre.trim(), c: nombre.trim(), p: "", g};
  const perfil = {tipo: "Autoridad", rol, g: persona.g, zona, zonaNombre: rol === "concejal" ? "Comuna de " + z.n : z.n, comunas: z.comunas.slice(), autoridadId: a ? a.id : null,
    nombre: persona.n, completo: persona.c, partido: persona.p, variantes: variantesNombre(persona), plan: "regional", agenda: [], sens: sensDe(z.comunas), comuna: null};
  let key = persona.n; if (COMUNAS_V.includes(key) || (S.cuentas[key] && !esAut(S.cuentas[key]))) key += " (" + cargoDe(rol, persona.g) + ")";
  if (!S.cuentas[key]) { const pr = proponer(perfil); S.cuentas[key] = {perfil, temas: pr.base, sugeridos: pr.sugeridos, borradores: 0, caracterizada: true, visto: false, onbOculto: false, base: baseAutoridad(perfil), tv: TV}; }
  return key;
}
/* Municipio de cualquiera de las 38 comunas, con su alcalde o alcaldesa: la persona se sigue por nombre como tema base. */
function crearCuentaMunicipio(c, a, nombre, g){
  if (!COMUNAS_V.includes(c)) return null;
  const persona = a || (nombre ? {rol: "alcalde", zona: c, n: nombre, c: nombre, p: "", g} : null);
  const extra = persona ? {autoridad: cargoDe("alcalde", persona.g) + " " + persona.n, alcaldeId: a ? a.id : null, g: persona.g, variantes: variantesNombre(persona)} : {autoridad: "", alcaldeId: null, variantes: []};
  const cu = S.cuentas[c];
  if (cu && !esAut(cu)) {
    if (cu.perfil.autoridad !== extra.autoridad || !cu.perfil.variantes) {
      Object.assign(cu.perfil, extra);
      const nuevo = candidatos(cu.perfil).nucleo[1], i = cu.temas.findIndex(t => t.origen === "Núcleo" && (t.terminos || []).includes("Alcalde de " + c));
      if (i >= 0) cu.temas[i] = {...nuevo, ...puntaje(nuevo)}; else cu.temas.splice(1, 0, {...nuevo, ...puntaje(nuevo)});
    }
    return c;
  }
  const perfil = {tipo: "Municipio", comuna: c, agenda: (AGENDA[c] || []).slice(), sens: sensDe([c]), plan: "comunal", ...extra}, pr = proponer(perfil);
  S.cuentas[c] = {perfil, temas: pr.base, sugeridos: pr.sugeridos, borradores: 0, caracterizada: false, visto: false, onbOculto: false, tv: TV};
  return c;
}
const munisCuenta = () => COMUNAS.concat(Object.keys(S.cuentas).filter(k => !COMUNAS.includes(k) && !esAut(S.cuentas[k])).sort((a, b) => a.localeCompare(b, "es")));
/* Selector del encabezado: municipios, autoridades ya agregadas y la opción de entrar con otra cuenta. */
function opcionesCuenta(){
  const auts = Object.keys(S.cuentas).filter(k => esAut(S.cuentas[k]));
  return `<optgroup label="Municipios">${munisCuenta().map(c => `<option value="${esc(c)}" ${c === S.org ? "selected" : ""}>${esc(c)}</option>`).join("")}</optgroup>`
    + (auts.length ? `<optgroup label="Autoridades">${auts.map(k => `<option value="${esc(k)}" ${k === S.org ? "selected" : ""}>${esc(k)} · ${esc(cargoCuenta(S.cuentas[k]))}</option>`).join("")}</optgroup>` : "")
    + `<option value="__entrar">Entrar con otra cuenta…</option>`;
}
function cambiarCuenta(key){
  if (!S.cuentas[key]) return;
  S.org = key; save();
  const sel = $("#org"); sel.innerHTML = opcionesCuenta(); sel.value = key;  // el cambio lee el valor del selector: primero debe existir la opción
  sel.dispatchEvent(new Event("change"));
}

/* Entrada por rol, territorio y nombre, en pasos: 1 cargo (o búsqueda directa por nombre), 2 comuna, 3 persona, 4 revisión.
   Siempre se pregunta la comuna, que todos conocen; el distrito, la circunscripción o la circunscripción provincial se deducen de ella.
   En el teléfono es una decisión por pantalla; desde 760 px se agrega un riel con los pasos. Para la demostración se pide una contraseña
   común («pregonia») en la revisión; una vez ingresada en esta pestaña no se vuelve a pedir. Es un resguardo de acceso a la demo, no seguridad. */
const CLAVE_DEMO = "pregonia", CLAVE_KEY = "pregonia-clave";
const claveOk = () => { try { return sessionStorage.getItem(CLAVE_KEY) === "1"; } catch(e) { return false; } };
const ENT = {paso: 1, rol: "", zona: "", comuna: "", sel: "", libre: "", g: "F", qn: "", qc: "", enPortada: false};
const ENT_ROLES = [
  {k: "municipio", n: "Alcalde o alcaldesa", s: "Municipalidad", corto: "Alcaldía", ic: "M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6"},
  {k: "concejal", n: "Concejal o concejala", s: "Concejo Municipal", corto: "Concejal/a", ic: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"},
  {k: "diputado", n: "Diputado o diputada", s: "Cámara de Diputadas y Diputados", corto: "Diputado/a", ic: "M3 18a9 9 0 0 1 18 0M7 18a5 5 0 0 1 10 0M3 21h18"},
  {k: "senador", n: "Senador o senadora", s: "Senado", corto: "Senador/a", ic: "M3 21h18M4 10h16M12 3l9 5H3l9-5M6 10v8M10 10v8M14 10v8M18 10v8"},
  {k: "core", n: "Consejero o consejera regional", s: "Consejo Regional de Valparaíso", corto: "Consejero/a regional", ic: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2M9 4v14M15 6v14"},
  {k: "gobernador", n: "Gobernador o gobernadora regional", s: "Gobierno Regional de Valparaíso", corto: "Gobernador/a", ic: "M5 21V4M5 4h12l-2.5 4L17 12H5"},
  {k: "delegado", n: "Delegado o delegada presidencial", s: "Delegación regional o provincial", corto: "Delegado/a", ic: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"}
];
/* Cargos con un solo territorio posible: la zona queda elegida y el paso 2 solo la confirma. */
const ZONA_FIJA = {senador: "C6", gobernador: "REG"};
const entFija = (rol = ENT.rol) => !!ZONA_FIJA[rol];
const eIco = (d, cl = "ico") => `<svg class="${cl}" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const I_ATR = "M15 18l-6-6 6-6", I_X = "M6 6l12 12M18 6L6 18", I_OK = "M5 12l5 5 9-10", I_BUS = "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.3-4.3", I_PIN = "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5", I_SIG = "M9 6l6 6-6 6", I_LAP = "M4 20h4L19 9l-4-4L4 16v4";
const entRolN = (rol = ENT.rol) => rol === "municipio" ? "alcalde" : rol;  // en un municipio, la persona que se elige es el alcalde
const entRol = () => ENT_ROLES.find(r => r.k === ENT.rol);
const unir = a => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " y " + a[a.length - 1];
/* La zona electoral de cada cargo a partir de la comuna. */
function zonaDeComuna(rol, c){
  if (rol === "municipio" || rol === "concejal") return c;
  if (ZONA_FIJA[rol]) return ZONA_FIJA[rol];
  if (rol === "delegado") { const z = ZONAS.delegado.find(x => x.id !== "REG" && x.comunas.includes(c)); return z ? z.id : "REG"; }  // provincia de Valparaíso: la delegación regional
  const z = (ZONAS[rol] || []).find(x => x.comunas.includes(c)); return z ? z.id : "";
}
const entZona = () => ENT.rol === "municipio" || ENT.rol === "concejal" ? (COMUNAS_V.includes(ENT.zona) ? {id: ENT.zona, n: ENT.zona, comunas: [ENT.zona]} : null) : zonaDe(ENT.rol, ENT.zona);
const entNombres = () => AUTORIDADES.filter(a => a.rol === entRolN() && a.zona === ENT.zona);
const entPersona = () => ENT.sel && ENT.sel !== "__otra" ? AUTORIDADES.find(x => x.id === ENT.sel) : null;
const entLibre = () => ENT.libre.trim().replace(/\s+/g, " ");
const entLibreOk = () => entLibre().length >= 5 && entLibre().split(" ").length >= 2;
const entPersonaOk = () => !!entPersona() || ((ENT.sel === "__otra" || ENT.rol === "concejal") && entLibreOk());
const entZonaCorta = (rol, zona) => rol === "alcalde" || rol === "municipio" || rol === "concejal" ? zona : ZONA_FIJA[rol] || (rol === "delegado" && zona === "REG") ? "Región de Valparaíso" : (zonaDe(rol, zona) || {}).n || "";
/* Texto del territorio: lo que la comuna elegida significa para ese cargo. */
function entTerritorio(largo){
  const z = entZona(); if (!z) return "";
  const c = ENT.comuna, otras = z.comunas.filter(x => x !== c);
  if (ENT.rol === "municipio" || ENT.rol === "concejal") return `Comuna de ${z.n} · Provincia de ${provinciaDe(z.n)}`;
  if (ENT.rol === "senador") return "Circunscripción 6 · las 38 comunas de la Región de Valparaíso";
  if (ENT.rol === "gobernador") return "Región de Valparaíso · 38 comunas · 8 provincias";
  if (ENT.rol === "delegado") return z.id === "REG" ? (largo ? "Toda la Región de Valparaíso; gobierna en forma directa la provincia de Valparaíso: " + unir(PROVINCIAS["Valparaíso"]) + "." : "Delegación regional · 38 comunas")
    : (largo ? `${z.n}: ${unir(z.comunas)}.` : `${z.n} · ${z.comunas.length} ${z.comunas.length === 1 ? "comuna" : "comunas"}`);
  if (ENT.rol === "diputado") return c ? `${c} pertenece al ${z.n}, que agrupa ${z.comunas.length} comunas.` : `${z.n} · ${z.comunas.length} comunas`;
  const cupos = AUTORIDADES.filter(a => a.rol === "core" && a.zona === z.id).length;
  if (!largo) return `${z.n} · ${unir(z.comunas)}`;
  return c ? `${c} elige consejeros regionales en ${z.n}${otras.length ? ", junto a " + unir(otras) : ""} · ${cupos} cupos.` : `${z.n}: ${unir(z.comunas)} · ${cupos} cupos.`;
}
function entChips(){
  const r = entRol(), ch = [];
  if (r) ch.push([1, r.corto]);
  if (ENT.paso >= 3 && entZona()) ch.push([2, entFija() || (ENT.rol === "delegado" && ENT.zona === "REG") ? "Región de Valparaíso" : ENT.rol === "delegado" ? entZona().n : ENT.rol === "diputado" ? (ENT.comuna ? ENT.comuna + " · " : "") + entZona().n : ENT.rol === "core" ? (ENT.comuna ? ENT.comuna + " · " : "") + entZona().n.replace(/ (Norte|Sur)$/, "") : entZona().n]);
  return ch.map(([n, t]) => `<button class="ent-chip" type="button" data-act="ent-ir" data-v="${n}" aria-label="Cambiar ${esc(t)}">${esc(t)}${eIco(I_LAP)}</button>`).join("");
}
/* Paso 1: búsqueda por nombre en toda la nómina, o el cargo. */
function entHits(){
  const q = norm(ENT.qn.trim()); if (q.length < 2) return "";
  const hs = AUTORIDADES.filter(a => norm(a.c).split(" ").some(w => w.startsWith(q)) || norm(a.c).includes(q) || norm(a.n).includes(q)).slice(0, 6);
  if (!hs.length) return `<p class="ent-nota">No está en la nómina precargada. Elige el cargo y usa «Otra persona».</p>`;
  return `<ul class="ent-hits">${hs.map(a => `<li><button type="button" data-act="ent-hit" data-v="${a.id}"><span class="ent-av">${esc(iniciales(a.n))}</span><span class="ent-tx"><b>${esc(a.c)}</b><small>${esc(cargoDe(a.rol, a.g))} · ${esc(entZonaCorta(a.rol, a.zona))}</small></span>${eIco(I_SIG)}</button></li>`).join("")}</ul>`;
}
const iniciales = n => n.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
/* Paso 2: comunas por provincia, o filtradas por la búsqueda (sin importar tildes ni mayúsculas). */
function entComunas(){
  const sub = c => ENT.rol === "diputado" ? (zonaDe("diputado", zonaDeComuna("diputado", c)) || {}).n : ENT.rol === "core" ? "Consejeros de " + ((zonaDe("core", zonaDeComuna("core", c)) || {}).n || "") : "Provincia de " + provinciaDe(c);
  const btn = c => `<button type="button" class="ent-op ${ENT.comuna === c ? "on" : ""}" data-act="ent-com" data-v="${esc(c)}" aria-pressed="${ENT.comuna === c}"><span class="ent-tx"><b>${esc(c)}</b><small>${esc(sub(c))}</small></span>${ENT.comuna === c ? eIco(I_OK, "ico ok") : ""}</button>`;
  const q = norm(ENT.qc.trim());
  if (q) {
    const r = COMUNAS_V.filter(c => norm(c).includes(q));
    return r.length ? `<section class="ent-grupo"><h4>${r.length === 1 ? "1 resultado" : r.length + " resultados"}</h4><div class="ent-ops">${r.map(btn).join("")}</div></section>`
      : `<p class="ent-vacio">No encontramos «${esc(ENT.qc.trim())}» entre las 38 comunas de la Región de Valparaíso. Revisa la ortografía o borra la búsqueda.</p>`;
  }
  return `<section class="ent-grupo"><h4>Comunas del piloto</h4><div class="ent-pils">${COMUNAS.map(c => `<button type="button" class="ent-pil" data-act="ent-com" data-v="${esc(c)}">${esc(c)}</button>`).join("")}</div></section>`
    + Object.entries(PROVINCIAS).map(([pv, cs]) => `<section class="ent-grupo"><h4>Provincia de ${esc(pv)}</h4><div class="ent-ops">${cs.map(btn).join("")}</div></section>`).join("");
}
function entTitulo(){
  const z = entZona(), r = entRol();
  if (ENT.paso === 1) return ["¿A quién quieres monitorear?", "Elige el cargo. Después definimos el territorio y la persona."];
  if (ENT.paso === 2 && ENT.rol === "gobernador") return ["Territorio", "El gobierno regional responde por las 38 comunas, así que la región ya queda seleccionada."];
  if (ENT.paso === 2 && ENT.rol === "delegado") return ["¿Qué delegación?", "La delegación regional cubre toda la región; cada provincia, salvo Valparaíso, tiene además su delegación provincial."];
  if (ENT.paso === 2) return ENT.rol === "senador" ? ["Territorio", "La Región de Valparaíso es una sola circunscripción senatorial, así que ya la dejamos seleccionada."]
    : ["¿En qué comuna?", {municipio: "Buscamos a su alcalde o alcaldesa.", concejal: "Buscamos su concejo municipal.", diputado: "Con la comuna deducimos el distrito. No necesitas saber cuál es.", core: "Con la comuna deducimos la circunscripción que elige a sus consejeros."}[ENT.rol]];
  if (ENT.paso === 3) return [{municipio: "Alcaldía de " + (z && z.n), concejal: "Concejo Municipal de " + (z && z.n), diputado: "Diputados del " + (z && z.n), senador: "Senado · Circunscripción 6", core: "Consejo Regional · " + (z && z.n), gobernador: "Gobierno Regional de Valparaíso", delegado: z && z.id === "REG" ? "Delegación Presidencial Regional" : "Delegación Presidencial · " + (z && z.n)}[ENT.rol], ENT.rol === "concejal" ? "Escribe el nombre de la persona que quieres seguir." : "Toca a la persona que quieres seguir."];
  return ["Revisa y entra", "Puedes cambiar cualquier dato antes de entrar."];
}
const entGenero = () => `<div class="ent-gen" role="radiogroup" aria-label="Cargo"><label><input type="radio" name="entG" value="F" ${ENT.g === "F" ? "checked" : ""}> ${cargoDe(entRolN(), "F")}</label><label><input type="radio" name="entG" value="M" ${ENT.g === "M" ? "checked" : ""}> ${cargoDe(entRolN(), "M")}</label></div>`;
const entCampoLibre = lbl => `<label class="ent-campo" for="entLibre">${lbl}</label><input id="entLibre" class="ent-in" value="${esc(ENT.libre)}" placeholder="Nombre y apellido" autocomplete="off">${entGenero()}`;
function entPaso(){
  if (ENT.paso === 1) return `<div class="ent-bloque"><label class="ent-campo" for="entQN">¿Ya sabes a quién? Búscalo por nombre</label>
      <div class="ent-bus">${eIco(I_BUS)}<input id="entQN" class="ent-in" type="search" value="${esc(ENT.qn)}" placeholder="Ej: Rosso, Brito, Martínez" autocomplete="off"></div><div id="entRes">${entHits()}</div></div>
    <p class="ent-o" aria-hidden="true"><span>o elige el cargo</span></p>
    <div class="ent-roles">${ENT_ROLES.map(r => `<button type="button" class="ent-op ent-rol ${ENT.rol === r.k ? "on" : ""}" data-act="ent-rol" data-v="${r.k}" aria-pressed="${ENT.rol === r.k}"><span class="ent-ic">${eIco(r.ic)}</span><span class="ent-tx"><b>${r.n}</b><small>${r.s}</small></span>${eIco(I_SIG)}</button>`).join("")}</div>
    <p class="ent-nota">¿Tu cargo no aparece? <a href="mailto:soporte@altkimia.cl">Escríbenos</a> y lo sumamos.</p>`;
  if (ENT.paso === 2 && entFija()) return `<div class="ent-op on ent-fija"><span class="ent-ic">${eIco(entRol().ic)}</span><span class="ent-tx"><b>Región de Valparaíso</b><small>${ENT.rol === "senador" ? "Circunscripción 6 · " : ""}38 comunas · 8 provincias</small></span>${eIco(I_OK, "ico ok")}</div>`;
  if (ENT.paso === 2 && ENT.rol === "delegado") return `<div class="ent-ops">${ZONAS.delegado.map(z => `<button type="button" class="ent-op ${ENT.zona === z.id ? "on" : ""}" data-act="ent-zona" data-v="${z.id}" aria-pressed="${ENT.zona === z.id}"><span class="ent-tx"><b>${esc(z.id === "REG" ? "Delegación regional" : z.n)}</b><small>${esc(z.id === "REG" ? "Toda la región · gobierna directamente la provincia de Valparaíso" : unir(z.comunas))}</small></span>${ENT.zona === z.id ? eIco(I_OK, "ico ok") : eIco(I_SIG)}</button>`).join("")}</div>`;
  if (ENT.paso === 2) return `<div class="ent-bloque"><label class="ent-campo" for="entQC">Buscar comuna</label><div class="ent-bus">${eIco(I_BUS)}<input id="entQC" class="ent-in" type="search" value="${esc(ENT.qc)}" placeholder="Ej: Casablanca" autocomplete="off"></div></div><div id="entRes" class="ent-lista">${entComunas()}</div>`;
  const banner = `<p class="ent-banner">${eIco(I_PIN)}<span>${esc(entTerritorio(true))}</span></p>`;
  if (ENT.paso === 3 && ENT.rol === "concejal") return banner + `<div class="ent-bloque">${entCampoLibre("Nombre del concejal o concejala")}<p class="ent-nota">La nómina de concejos aún no está precargada. Escribe el nombre como aparece en la prensa.</p></div>`;
  if (ENT.paso === 3) {
    const ns = entNombres();
    return banner + `<div class="ent-ops ent-personas">${ns.map(a => `<button type="button" class="ent-op ${ENT.sel === a.id ? "on" : ""}" data-act="ent-n" data-v="${a.id}" aria-pressed="${ENT.sel === a.id}"><span class="ent-av">${esc(iniciales(a.n))}</span><span class="ent-tx"><b>${esc(a.c)}</b><small>${esc(cargoDe(a.rol, a.g))}${a.p ? " · " + esc(a.p) : a.rol === "alcalde" ? " · período 2024-2028" : ""}</small></span>${ENT.sel === a.id ? eIco(I_OK, "ico ok") : ""}</button>`).join("")}
      <button type="button" class="ent-op ent-otra ${ENT.sel === "__otra" ? "on" : ""}" data-act="ent-n" data-v="__otra" aria-pressed="${ENT.sel === "__otra"}"><span class="ent-av">+</span><span class="ent-tx"><b>Otra persona</b><small>Si hubo un reemplazo o no aparece</small></span></button></div>
      ${ENT.sel === "__otra" ? `<div class="ent-bloque">${entCampoLibre("Nombre de la autoridad")}</div>` : ""}
      <p class="ent-nota">Nómina al inicio del período. Corte: ${NOMINA_CORTE}.</p>`;
  }
  const a = entPersona(), nom = a ? a.c : entLibre(), g = a ? a.g : ENT.g, z = entZona();
  const cuentaTx = ENT.rol === "municipio" ? "Municipalidad de " + z.n : cargoDe(ENT.rol, g) + " · " + CARGOS[ENT.rol].organo;
  const prensa = ENT.rol === "municipio" || ENT.rol === "concejal" ? `Nacional, regional y local de ${z.n}` : `Nacional, regional y de las ${z.comunas.length} comunas de su territorio`;
  const fila = (k, v, n) => `<div class="ent-fila"><div><dt>${k}</dt><dd>${esc(v)}</dd></div>${n ? `<button type="button" class="ent-link" data-act="ent-ir" data-v="${n}">Cambiar</button>` : ""}</div>`;
  return `<section class="ent-resumen"><div class="ent-quien"><span class="ent-av xl">${esc(iniciales(nom))}</span><div><b>${esc(nom)}</b><small>${esc(cuentaTx)}</small></div></div>
      <dl>${fila("Cargo", ENT_ROLES.find(r => r.k === ENT.rol).n, 1)}${fila("Territorio", entTerritorio(false), 2)}${fila(ENT.rol === "municipio" ? "Alcalde o alcaldesa" : "Persona", nom, 3)}${fila("Prensa que seguiremos", prensa, 0)}</dl></section>
    ${ENT.rol === "municipio" && !COMUNAS.includes(z.n) ? `<p class="ent-nota">Esta comuna se sigue con noticias reales; la demostración trae noticias ficticias solo del litoral central.</p>` : ""}
    ${claveOk() ? "" : `<div class="ent-bloque"><label class="ent-campo" for="entClave">Contraseña de la demostración</label><input id="entClave" class="ent-in" type="password" autocomplete="current-password" autocapitalize="off" spellcheck="false" placeholder="Ingresa la contraseña"></div>`}
    <button type="button" class="ent-link ent-otra-aut" data-act="ent-reset">Elegir otra autoridad</button>`;
}
function entPuede(){
  if (ENT.paso === 2) return entFija();
  if (ENT.paso === 3) return entPersonaOk();
  return ENT.paso === 4;
}
function entCuerpo(){
  if (ENT.paso === 3 && ENT.rol !== "concejal" && !ENT.sel) { const ns = entNombres(); if (ns.length === 1) ENT.sel = ns[0].id; }  // una sola persona posible (alcaldía): queda elegida
  const [t, st] = entTitulo(), pie = ENT.paso >= 3 || (ENT.paso === 2 && entFija()), ok = entPuede();
  const rail = ["Cargo", "Territorio", "Persona", "Revisión"].map((l, i) => {
    const n = i + 1, val = n === 1 ? (entRol() || {}).n : n === 2 ? (ENT.paso > 2 || (entFija() && ENT.paso > 1) ? entTerritorio(false) : "") : n === 3 ? (ENT.paso > 3 ? (entPersona() || {}).c || entLibre() : "") : "";
    const est = ENT.paso > n ? "hecho" : ENT.paso === n ? "actual" : "";
    return `<li><button type="button" class="ent-r ${est}" data-act="ent-ir" data-v="${n}" ${n > ENT.paso ? "disabled" : ""} ${ENT.paso === n ? 'aria-current="step"' : ""}><span class="ent-rn">${ENT.paso > n ? eIco(I_OK) : n}</span><span class="ent-tx"><b>${l}</b><small>${esc(val || (ENT.paso === n ? "En curso" : "Pendiente"))}</small></span></button></li>`;
  }).join("");
  return `<header class="ent-h">
      <button class="ent-ib ent-atras" type="button" data-act="ent-atras" aria-label="Volver al paso anterior" ${ENT.paso === 1 ? "hidden" : ""}>${eIco(I_ATR)}</button>
      <div class="ent-marca"><b>Pregon<span>IA</span></b><small>La prensa no espera. Tú tampoco.</small></div>
      <span class="ent-pasoN" aria-live="polite">${ENT.paso <= 3 ? `Paso ${ENT.paso} de 3` : "Revisión"}</span>
      <button class="ent-ib" type="button" data-act="ent-cerrar" aria-label="Cerrar">${eIco(I_X)}</button></header>
    <div class="ent-prog" aria-hidden="true">${[1, 2, 3].map(i => `<i class="${ENT.paso >= i ? "on" : ""}"></i>`).join("")}</div>
    <div class="ent-cuerpo">
      <nav class="ent-rail" aria-label="Pasos"><ol>${rail}</ol><p>Nómina al inicio del período. Corte: ${NOMINA_CORTE}.</p></nav>
      <div class="ent-main">
        <div class="ent-scroll">
          ${ENT.paso > 1 && ENT.paso < 4 ? `<div class="ent-chips">${entChips()}</div>` : ""}
          <div class="ent-tit"><span class="ent-pasoT">${ENT.paso <= 3 ? `Paso ${ENT.paso} de 3` : "Revisión"}</span><h2 id="entT" tabindex="-1">${esc(t)}</h2><p>${esc(st)}</p></div>
          ${entPaso()}
          <p class="cap-err" id="entErr" role="alert" hidden></p>
        </div>
        ${pie ? `<footer class="ent-pie"><button class="btn alt ent-cta" type="submit" ${ok ? "" : 'aria-disabled="true"'}>${ENT.paso === 4 ? "Entrar a PregonIA" : "Continuar"}</button></footer>` : ""}
      </div>
    </div>`;
}
function entPintar(foco){
  const f = $("#entForm"); if (!f) return;
  const act = document.activeElement, id = act && act.id, pos = id && act.selectionStart != null ? act.selectionStart : null;
  f.innerHTML = entCuerpo();
  const el = foco === "titulo" ? $("#entT") : id && document.getElementById(id);
  if (el) { el.focus(); if (pos != null && el.setSelectionRange) try { el.setSelectionRange(pos, pos); } catch(e) {} }
}
function entIr(n){ ENT.paso = Math.max(1, Math.min(4, n)); if (ENT.paso <= 2) ENT.qc = ""; entPintar("titulo"); $("#entForm .ent-scroll")?.scrollTo(0, 0); }
function entAbrir(enPortada){
  Object.assign(ENT, {paso: 1, rol: "", zona: "", comuna: "", sel: "", libre: "", qn: "", qc: "", enPortada: !!enPortada});
  $("#entBack")?.remove();
  const ov = document.createElement("div"); ov.className = "vid-back ent-back"; ov.id = "entBack";
  ov.innerHTML = `<section class="vid ent" role="dialog" aria-modal="true" aria-labelledby="entT"><form class="ent-f" id="entForm" novalidate></form></section>`;
  document.body.appendChild(ov); document.body.classList.add("vid-on"); entAbrir.vuelta = document.activeElement;
  entPintar(); setTimeout(() => (matchMedia("(pointer: coarse)").matches ? $("#entT") : $("#entQN"))?.focus(), 30);  // en el teléfono no se abre el teclado sobre los cargos
}
function entCerrar(){ $("#entBack")?.remove(); document.body.classList.remove("vid-on"); const o = entAbrir.vuelta; if (o && o.isConnected && !ENT.enPortada) o.focus(); }
function entError(msg, foco){ const err = $("#entErr"); if (!err) return; err.textContent = msg; err.hidden = false; if (foco) { foco.focus(); foco.select?.(); } }
function entEntrar(e){
  e.preventDefault();
  if (ENT.paso < 4) {
    if (ENT.paso === 3 && !entPersonaOk()) return entError(ENT.sel || ENT.rol === "concejal" ? "Escribe nombre y apellido." : "Elige a la persona que quieres seguir.", $("#entLibre"));
    if (!entPuede()) return;
    return entIr(ENT.paso + 1);
  }
  if (!claveOk()) {
    const c = $("#entClave");
    if (!c || c.value.trim().toLowerCase() !== CLAVE_DEMO) return entError(c && c.value ? "Contraseña incorrecta." : "Ingresa la contraseña.", c);
    try { sessionStorage.setItem(CLAVE_KEY, "1"); } catch(e) {}
  }
  const a = entPersona(), libre = entLibre();
  if (!a && !entLibreOk()) return entIr(3);
  const key = ENT.rol === "municipio" ? crearCuentaMunicipio(ENT.zona, a, libre, ENT.g) : crearCuentaAutoridad({rol: ENT.rol, zona: ENT.zona, a, nombre: libre, g: ENT.g});
  const portada = ENT.enPortada; entCerrar();
  if (portada) { mostrarPortada(false); if (!location.hash || location.hash === "#portada") location.hash = "inicio"; }
  if (key !== S.org) cambiarCuenta(key); else render(true);
  if (esAut() || !COMUNAS.includes(S.org)) toast(`Entraste como ${esAut() ? inst() : inst() + (cuenta().perfil.autoridad ? " · " + cuenta().perfil.autoridad : "")}. ${typeof MODO !== "undefined" && MODO.disponible ? "Buscando sus menciones en medios reales…" : "Sus menciones se leen de medios reales en pregonia.vercel.app."}`);
}
document.addEventListener("change", e => {
  const t = e.target; if (!t.closest || !t.closest("#entBack")) return;
  if (t.name === "entG") ENT.g = t.value;
});
document.addEventListener("input", e => {
  const t = e.target; if (!t.closest || !t.closest("#entBack")) return;
  if (t.id === "entQN") { ENT.qn = t.value; $("#entRes").innerHTML = entHits(); }
  if (t.id === "entQC") { ENT.qc = t.value; $("#entRes").innerHTML = entComunas(); }
  if (t.id === "entLibre") { const antes = entPuede(); ENT.libre = t.value; if (entPuede() !== antes) { const b = $("#entForm .ent-cta"); if (b) { if (entPuede()) b.removeAttribute("aria-disabled"); else b.setAttribute("aria-disabled", "true"); } } }
});
document.addEventListener("submit", e => { if (e.target.id === "entForm") entEntrar(e); });
document.addEventListener("click", e => {
  if (e.target.id === "entBack" && !ENT.enPortada) return entCerrar();
  const b = e.target.closest("[data-act]"); if (!b) return;
  const v = b.dataset.v;
  switch (b.dataset.act) {
    case "ent-abrir": return entAbrir(false);
    case "ent-cerrar": return entCerrar();
    case "ent-atras": return entIr(ENT.paso - 1);
    case "ent-ir": return entIr(+v);
    case "ent-reset": Object.assign(ENT, {rol: "", zona: "", comuna: "", sel: "", libre: "", qn: ""}); return entIr(1);
    case "ent-rol": {
      if (v !== ENT.rol) Object.assign(ENT, {rol: v, sel: "", libre: "", zona: ENT.comuna ? zonaDeComuna(v, ENT.comuna) : ZONA_FIJA[v] || ""});
      if (ZONA_FIJA[v]) ENT.zona = ZONA_FIJA[v];
      return entIr(2);
    }
    case "ent-com": {
      const z = zonaDeComuna(ENT.rol, v);
      if (v !== ENT.comuna || z !== ENT.zona) Object.assign(ENT, {comuna: v, zona: z, sel: z === ENT.zona ? ENT.sel : "", libre: ""});
      return entIr(3);
    }
    case "ent-zona": { if (v !== ENT.zona) Object.assign(ENT, {zona: v, comuna: "", sel: "", libre: ""}); return entIr(3); }
    case "ent-n": { ENT.sel = v; entPintar(); if (v === "__otra") $("#entLibre")?.focus(); return; }
    case "ent-hit": {
      const a = AUTORIDADES.find(x => x.id === v); if (!a) return;
      Object.assign(ENT, {rol: a.rol === "alcalde" ? "municipio" : a.rol, zona: a.zona, comuna: a.rol === "alcalde" ? a.zona : "", sel: a.id, libre: "", g: a.g, qn: ""});
      return entIr(4);
    }
  }
});
document.addEventListener("keydown", e => {
  if (!$("#entBack")) return;
  if (e.key === "Escape") { e.preventDefault(); entCerrar(); return; }
  if (e.key === "Tab") { const f = [...document.querySelectorAll("#entBack button:not([disabled]), #entBack input, #entBack a[href]")].filter(x => x.offsetParent && !(x.type === "radio" && !x.checked)); if (!f.length) return; const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
});

/* Lista de pares por presencia en prensa (14 días, Google News): la usan autoridades y alcaldes. */
function paresLista(titulo, quien, grupo, pares){
  const filas = pares.slice().sort((a, b) => b.n - a.n), max = Math.max(1, ...filas.map(r => r.n)), yo = filas.findIndex(r => r.yo) + 1, tot = filas.reduce((s, r) => s + r.n, 0) || 1, mio = filas.find(r => r.yo) || {n: 0};
  return `<div class="card"><h3>${titulo}</h3>
    <p class="vtx" style="margin:0 0 10px">${esc(quien)} es ${yo}.° de ${filas.length} en presencia en prensa de ${esc(grupo)} en 14 días, con ${plural(mio.n, "nota", "notas")} (${pct(mio.n, tot)}% del total del grupo).</p>
    <ul class="hbars">${filas.map(r => `<li><span class="t"><i style="background:${r.yo ? "var(--accent)" : "var(--amb-l)"}"></i><span>${r.yo ? "<b>" + esc(r.n_) + "</b>" : esc(r.n_)}${r.p ? ` <small class="muted">${esc(r.p)}</small>` : ""}</span></span><span class="b" ${tipAttr(r.n + " notas")}><i style="width:${(r.n / max * 100).toFixed(1)}%;background:${r.yo ? "var(--accent)" : "var(--amb-l)"}"></i></span><span class="v mono">${r.n}</span></li>`).join("")}</ul>
    <p class="hint" style="margin:10px 0 0">Cuenta notas con el nombre en el titular o el resumen, en medios chilenos, según Google News. No mide tono. Uso interno.</p></div>`;
}
/* Frente a sus pares: presencia en prensa de las autoridades del mismo cargo y zona (solo con noticias reales). */
function paresAutCard(){
  const p = cuenta().perfil, pares = MODO && MODO.tipo === "real" && MODO.info && MODO.info.pares;
  if (pares && pares.length) return paresLista("Frente a sus pares", p.nombre, p.zonaNombre, pares);
  if (!pares || !pares.length) return `<div class="card"><h3>Frente a sus pares</h3><p class="muted" style="margin:0">${p.autoridadId ? `Con noticias reales, aquí se compara la presencia en prensa de ${esc(p.nombre)} con la de ${CARGOS[p.rol].n.split(" o ")[0].toLowerCase()}s de ${esc(p.zonaNombre)} en los últimos 14 días.` : "La comparación con pares está disponible para las autoridades de la nómina."}</p></div>`;
}

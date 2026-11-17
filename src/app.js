
NOTAS.forEach(n => { n.g = String(n.g); });

/* Catálogos del motor de sugerencia (forma de lectura; la comparación ignora tildes y mayúsculas) */
const CTX = ["comuna","vecinos","vecinas","municipio","municipalidad","alcalde","alcaldesa","concejo","litoral","provincia","región","sector","plaza","temporada","playa","Senapred","Carabineros","bomberos","Cesfam","agricultores","viña","feria","calles","borde costero","paseo","humedal","regata","cuenca","Las Cruces","Pinomar","Llolleo","Barrancas","Lo Ovalle","Los Maitenes","Lagunillas","Quintay"];
const EXC = {"Los Andes":["cordillera de los Andes","Universidad de los Andes","Clínica Universidad de los Andes"],"Santa María":["Federico Santa María","Universidad Santa María","USM"],"La Cruz":["Cruz Roja"],"Valparaíso":[],"Casablanca":["Marruecos","película","Bogart"],"San Antonio":["Texas","Spurs","NBA","San Antonio de Padua"],"Cartagena":["Cartagena de Indias","Colombia","Murcia"],"Algarrobo":["Argentina","especie arbórea","árbol"],"El Quisco":[],"El Tabo":[]};
const AGENDA = {"Casablanca":["Polideportivo","Plataforma logística"],"San Antonio":["Puerto Exterior","Borde costero"],"Cartagena":["Playa Grande","Patrimonio"],"El Quisco":["Plan regulador"],"El Tabo":["Las Cruces"],"Algarrobo":["Humedal"]};
const SENS = {
  agua:{n:"Agua y sequía", t:["agua","sequía","escasez hídrica","corte de agua","aljibe","agua potable"]},
  emergencias:{n:"Emergencias e incendios", t:["incendio","emergencia","Senapred","marejada","bomberos"]},
  seguridad:{n:"Seguridad", t:["seguridad","patrullaje","Carabineros","robo","luminarias","iluminación","salvavidas"]},
  salud:{n:"Salud municipal", t:["Cesfam","salud"]},
  educacion:{n:"Educación municipal", t:["colegio","escuela","liceo","educación"]},
  transito:{n:"Calles, tránsito y rutas", t:["Ruta 68","congestión","tránsito","calles","veredas","transporte"]},
  aseo:{n:"Aseo y residuos", t:["basura","microbasural","reciclaje","recolección"]},
  turismo:{n:"Turismo y temporada", t:["turismo","temporada","visitantes","playa","Vendimia","ocupación","fiesta"]}
};
const CRIT = ["incendio","emergencia","reclam","denuncia","paraliz","corte de agua","marejada","critic","robo"];

const reCache = new Map();
function termRe(t){ const k = norm(t); if (!reCache.has(k)) reCache.set(k, new RegExp("(^|[^a-z0-9])" + k.replace(/[.*+?^${}()|[\]\\]/g,"\\$&") + "($|[^a-z0-9])")); return reCache.get(k); }
/* Palabras tan comunes que, solas y fuera del titular, no bastan para clasificar una nota en una temática
   («dispuso agua y atención» en una nota de incendio no la vuelve una noticia de agua). */
const GENERICAS = new Set(["agua","salud","seguridad","emergencia","calles","temporada","playa","fiesta","visitantes","turismo","educación","transporte","tránsito"].map(norm));
function matchTema(tema, n){
  const found = tema.terminos.filter(t => t && termRe(t).test(n.hay));
  if (!found.length) return null;
  if (tema.exclusiones.some(e => e && termRe(e).test(n.hay))) return null;
  if (tema.contexto.length && !tema.contexto.some(c => c && termRe(c).test(n.hay))) return null;
  const enTitulo = found.some(t => termRe(t).test(n.ht));
  if (tema.sens && !enTitulo && found.every(t => GENERICAS.has(norm(t))) && new Set(found.map(norm)).size < 2) return null;
  // «obliga a cortar el tránsito» en una nota de incendio no la vuelve una noticia de conectividad: en emergencias, otro eje necesita una palabra propia.
  if (tema.sens && tema.sens !== "emergencias" && found.every(t => GENERICAS.has(norm(t))) && ["incendio", "marejada", "temporal", "emergencia"].some(k => termRe(k).test(n.hay) || n.hay.includes(k))) return null;
  return {found, enTitulo};
}
const uid = () => Math.random().toString(36).slice(2, 9);
function T(nombre, origen, terminos, contexto=[], exclusiones=[], extra={}){ return {id: uid(), nombre, origen, terminos, contexto, exclusiones, activo: true, ...extra}; }
function candidatos(perfil){
  if (perfil.tipo === "Autoridad") return candidatosAut(perfil);
  const c = perfil.comuna;
  const nucleo = [
    T("Municipalidad de " + c, "Núcleo", ["Municipalidad de " + c, "Municipio de " + c]),
    T(perfil.autoridad ? perfil.autoridad : "Alcalde de " + c, "Núcleo", ["Alcalde de " + c, "Alcaldesa de " + c].concat(perfil.autoridad ? [perfil.autoridad] : [], perfil.variantes || [])),
    T(c + " (comuna)", "Núcleo", [c], ctxComuna(c), excComuna(c))
  ];
  const otros = [ T("Concejo municipal", "Candidato", ["concejo municipal","concejal","concejala","concejales"], [c]) ];
  perfil.agenda.forEach(a => { if (a.trim()) otros.push(T(a.trim(), "Agenda", [a.trim()], norm(a).includes(norm(c)) ? [] : [c])); });
  // Las mismas ocho temáticas para todos, con el nombre, las palabras y los dolores de esta comuna (src/territorios.js).
  Object.entries(ejesDe(perfil)).forEach(([key, s]) => otros.push(T(s.n, perfil.sens.includes(key) ? "Sensibilidad" : "Descubrimiento", s.t.slice(), s.ctx.slice(), [], {sens: key})));
  return {nucleo, otros};
}
function puntaje(tema){
  let vol = 0, cri = 0; const seen = new Set();
  NOTAS.forEach(n => { if (NOW - n.ts > 30*DAY) return; if (!seen.has(n.g) && matchTema(tema, n)) { seen.add(n.g); vol++; if (n.tono === "cri") cri++; } });
  const bonus = (tema.origen === "Sensibilidad" ? 5 : 0) + (tema.origen === "Agenda" ? 3 : 0);
  return {vol, cri, score: vol + cri*2 + bonus};
}
function proponer(perfil){
  const {nucleo, otros} = candidatos(perfil);
  const libres = Math.max(0, PLANES[perfil.plan].temas - nucleo.length);
  nucleo.forEach(t => Object.assign(t, puntaje(t)));
  otros.forEach(t => Object.assign(t, puntaje(t)));
  const orden = otros.filter(t => t.score > 0).sort((a,b) => b.score - a.score);
  if (perfil.tipo === "Autoridad") orden.push(...otros.filter(t => !(t.score > 0)));  // una autoridad sigue su agenda aunque hoy no haya notas
  return {base: nucleo.concat(orden.slice(0, libres)), sugeridos: orden.slice(libres, libres + 5)};
}

/* Estado por municipio (aislado) */
const KEY = "pregonia-demo-v2";
function defaults(){
  const s = {org: "Casablanca", cuentas: {}, comunicados: [], fp: {}, resp: {}};
  COMUNAS.forEach(c => {
    const perfil = {tipo: "Municipio", comuna: c, autoridad: "", agenda: AGENDA[c].slice(), sens: sensDe([c]), plan: "comunal"};
    const p = proponer(perfil);
    s.cuentas[c] = {perfil, temas: p.base, sugeridos: p.sugeridos, borradores: 0, caracterizada: false, visto: false, onbOculto: false, tv: TV};
  });
  return s;
}
let S;
try { const raw = localStorage.getItem(KEY); S = raw ? JSON.parse(raw) : defaults(); if (!S.cuentas || !S.cuentas.Casablanca) S = defaults(); } catch(e) { S = defaults(); }
S.resp ||= {}; S.fp ||= {};
if (Object.values(S.cuentas).map(adaptarCuenta).some(Boolean)) save();
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch(e) {}  // pide al navegador no borrar los temas guardados en este equipo  // cuentas de una versión anterior: temas adaptados a su territorio
function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e) {} }
const cuenta = () => S.cuentas[S.org];
const respondida = g => !!S.resp[S.org + ":" + g];
/* Decidir no responder también es atender una crítica (no amplificarla, resolverla directo, no corresponde): queda registrado con su motivo. */
const NO_RESP = {amplifica: "Responder la amplificaría", directo: "Se resolvió directo con el medio o los vecinos", noCorresponde: "No nos corresponde responder"};
const noResp = g => (S.noResp || {})[S.org + ":" + g] || null;
const atendida = g => respondida(g) || !!noResp(g);
const noRespHtml = m => `<details class="nr"><summary>No responder</summary><div class="nr-ops">${Object.entries(NO_RESP).map(([k, t]) => `<button class="btn sm ghost" type="button" data-act="no-resp" data-g="${m.g}" data-k="${k}">${t}</button>`).join("")}</div></details>`;
/* Tono de un grupo de notas. Una emergencia sin reclamo ni cuestionamiento es un hecho grave, no una crítica a la cuenta:
   queda neutra y marcada como grave, para informar y no para defenderse. */
const CRIT_PERSONA = ["reclam", "denuncia", "critic", "acusa", "cuestion", "exigen", "emplaza", "molestia", "demora", "falta de", "paraliz", "irregular", "responsabiliz", "negligen", "abandono", "lentitud", "sin respuesta", "protesta"];
const EMERG = ["incendio", "emergencia", "temporal", "marejada", "evacuacion", "alerta roja", "senapred", "damnificad", "aluvion", "socavon"];
function tonoDe(notas){
  const ts = notas.map(n => n.tono); let tono = ts.includes("cri") ? "cri" : ts.includes("pos") ? "pos" : "neu", grave = false;
  if (tono === "cri") { const hay = notas.map(n => n.hay).join(" | "); if (EMERG.some(k => kwRe(k).test(hay)) && !CRIT_PERSONA.some(k => kwRe(k).test(hay))) { tono = "neu"; grave = true; } }
  return {tono, grave};
}
/* Para una autoridad, lo que se dice de ella se separa de lo que pasa en su territorio: tono, críticas, impacto y parte
   se calculan solo con notas que la nombran (protagonista, fuente citada o mencionada). Un municipio responde por toda su comuna. */
const sobreCuenta = (ms, c = cuenta()) => esAut(c) ? ms.filter(m => papelDe(m).k !== "terr") : ms;
const delTerritorio = (ms, c = cuenta()) => esAut(c) ? ms.filter(m => papelDe(m).k === "terr") : [];
/* Críticas que exigen respuesta. Municipio: toda crítica de su comuna. Autoridad: las que la nombran y además la tienen de protagonista,
   llegaron a prensa regional o salieron en tres o más medios. */
const exigeRespuesta = (m, c = cuenta()) => m.tono === "cri" && (!esAut(c) || (papelDe(m).k !== "terr" && (papelDe(m).k === "prot" || escalera(m.notas).max >= 1 || new Set(m.notas.map(n => n.m)).size >= 3)));

/* Menciones y métricas */
function menciones(c = cuenta(), dias = 30){
  const temas = c.temas.filter(t => t.activo);
  const grupos = new Map();
  NOTAS.forEach(n => {
    if (NOW - n.ts > dias*DAY) return;
    if (S.fp[S.org + ":" + n.g]) return;
    temas.forEach(t => {
      const r = matchTema(t, n); if (!r) return;
      let g = grupos.get(n.g);
      if (!g) { g = {g: n.g, notas: [], temas: new Map()}; grupos.set(n.g, g); }
      if (!g.notas.includes(n)) g.notas.push(n);
      const prev = g.temas.get(t.id) || {tema: t, found: new Set(), enTitulo: false};
      r.found.forEach(f => prev.found.add(f)); prev.enTitulo = prev.enTitulo || r.enTitulo;
      g.temas.set(t.id, prev);
    });
  });
  return [...grupos.values()].map(g => {
    g.notas.sort((a,b) => a.ts - b.ts);
    const lead = g.notas.slice().sort((a,b) => PESO[MED[b.m].l] - PESO[MED[a.m].l] || a.ts - b.ts)[0];
    const {tono, grave} = tonoDe(g.notas);
    const critico = tono === "cri" && g.notas.some(n => CRIT.some(w => n.hay.includes(w)));
    return {...g, lead, tono, grave, critico, first: g.notas[0].ts, last: g.notas[g.notas.length-1].ts, alcance: g.notas.reduce((s,n) => s + PESO[MED[n.m].l], 0)};
  }).sort((a,b) => b.last - a.last);
}
function metricas(ms){
  const vol = ms.length, pos = ms.filter(m => m.tono==="pos").length, cri = ms.filter(m => m.tono==="cri").length, neu = vol - pos - cri;
  return {vol, pos, neu, cri, neto: vol ? Math.round((pos - cri) / vol * 100) : 0, alcance: ms.reduce((s,m) => s + m.alcance, 0)};
}
const pendientes = (c = cuenta()) => sobreCuenta(menciones(c, 7), c).filter(m => (esAut(c) ? exigeRespuesta(m, c) : m.critico) && !atendida(m.g));
function genericaComuna(c){ return {id:"g-"+norm(c), nombre:c, terminos:[c, "Municipalidad de "+c], contexto: ctxComuna(c), exclusiones: excComuna(c), activo:true}; }

/* Utilidades de interfaz */
const $ = s => document.querySelector(s);
const ICO = {
  inicio:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  menciones:'<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  reportes:'<path d="M4 20V11M10 20V5M16 20v-7M21 20H3"/>',
  comunicados:'<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  config:'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  temas:'<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01"/>',
  asistente:'<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  fuentes:'<path d="M4.9 19.1a10 10 0 0 1 0-14.2M19.1 4.9a10 10 0 0 1 0 14.2M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4M12 12h.01"/>'
};
const icon = k => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICO[k]}</svg>`;
const MAIN = [["inicio","Inicio"],["menciones","Menciones"],["reportes","Reportes"],["comunicados","Comunicados"]];
const CONFIG = [["temas","Mis temas"],["asistente","Asistente de temas"],["prioridades","Prioridades"],["fuentes","Fuentes"]];
const ALIAS = {panel:"inicio", caracterizacion:"asistente"};
const route = () => { const k = (location.hash || "#inicio").slice(1); return ALIAS[k] || k; };
const isConfig = k => CONFIG.some(([x]) => x === k);
/* Período global (24 horas, semana o 30 días): uno solo para todas las pestañas, recordado entre sesiones. */
const PER_KEY = "pregonia-periodo";
const PER0 = (() => { try { const v = localStorage.getItem(PER_KEY); return ["1", "7", "30"].includes(v) ? v : "7"; } catch(e) { return "7"; } })();
let tState = {tema:"todos", tono:"todos", dias:PER0, q:"", rep:"alcalde", draft:null, from:null, pieza:null, enf:null, open:{}, ctxAll:{}, refocus:null, fuente:{a:"todos", e:"todos"}};
let toastUndo = null;
function toast(msg, undo){
  $("#toastMsg").textContent = msg; const b = $("#toastAct");
  toastUndo = undo || null; b.hidden = !undo; b.textContent = "Deshacer";
  $("#toast").hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => { $("#toast").hidden = true; toastUndo = null; }, undo ? 6000 : 3000);
}
$("#toastAct").addEventListener("click", () => { if (toastUndo) toastUndo(); $("#toast").hidden = true; toastUndo = null; });
function ago(ts){ const m = Math.round((NOW - ts)/60000); if (m < 60) return "hace " + Math.max(1,m) + " min"; const h = Math.round(m/60); if (h < 24) return "hace " + h + " h"; const d = Math.round(h/24); return "hace " + d + (d===1?" día":" días"); }
function fecha(ts){ return new Date(ts).toLocaleDateString("es-CL", {day:"numeric", month:"short"}) + ", " + new Date(ts).toLocaleTimeString("es-CL", {hour:"2-digit", minute:"2-digit"}); }
function dia(ts){ const a = new Date(NOW); a.setHours(0,0,0,0); const d = Math.round((a - new Date(ts).setHours(0,0,0,0)) / DAY); return d <= 0 ? "Hoy" : d === 1 ? "Ayer" : d < 7 ? "Esta semana" : "Hace más de una semana"; }
const tonoLbl = {pos:"Positivo", neu:"Neutro", cri:"Crítico"};
const tonoPl = {pos:"Positivas", neu:"Neutras", cri:"Críticas"};
const pillTono = t => `<span class="pill ic t-${t}"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${({cri:'<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.4h.01"/>',pos:'<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16.2 9.6"/>',neu:'<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>'})[t]}</svg>${tonoLbl[t]}</span>`;
const nomMedio = n => n.fuente || MED[n.m].n;  // las fuentes institucionales sin ficha propia guardan su nombre real
const medioN = n => { const nm = nomMedio(n), red = n.via === "instagram" || MED[n.m].t === "Instagram" ? "Instagram" : n.via === "facebook" || MED[n.m].t === "Facebook" ? "Facebook" : ""; return nm + (red ? (nm.includes(red) ? "" : " · " + red) : MED[n.m].e === "restringido" ? " (vía Google News)" : ""); };
const signo = n => (n > 0 ? "+" : "") + n;
const plural = (n, s, p) => n + " " + (n === 1 ? s : p);
/* Balance del tono: veredicto en cinco niveles. El índice (positivas − críticas) / total solo decide el nivel; el usuario ve palabras y conteos. */
const VER = [[40,"Muy favorable","claramente más a favor que en contra","Muy a favor"],[10,"Favorable","más a favor que en contra","A favor"],[-9,"Equilibrada","lo positivo y lo crítico se compensan","Equilibrado"],[-39,"Desfavorable","más en contra que a favor","En contra"],[-101,"Muy desfavorable","claramente más en contra que a favor","Muy en contra"]];
function veredicto(M){ if (!M.vol) return {n:"Sin noticias", f:"no hubo noticias en el período", c:"Sin datos", k:"neu", i:-1}; const i = VER.findIndex(x => M.neto >= x[0]), v = VER[i]; return {n:v[1], f:v[2], c:v[3], k: i <= 1 ? "pos" : i >= 3 ? "cri" : "neu", i}; }
const conteo = M => `${plural(M.pos,"positiva","positivas")} · ${plural(M.neu,"neutra","neutras")} · ${plural(M.cri,"crítica","críticas")}`;

const PER_OPS = [["1", "24 horas"], ["7", "Semana"], ["30", "30 días"]];
const perAplica = () => !isConfig(route());
function perNota(){
  if (route() !== "reportes" || tState.rep === "gestion") return "";
  const f = {diario: "diario", mesa: "diario", crisis: "últimos 7 días", calendario: "próximos 12 meses"}[tState.rep];
  return f ? `<span class="per-nota">Este informe tiene período fijo (${f})</span>` : "";
}
const perCtl = () => `<div class="perg" role="group" aria-label="Período">${PER_OPS.map(([k, l]) => `<button type="button" data-act="per" data-v="${k}" aria-pressed="${tState.dias === k}">${l}</button>`).join("")}</div>${perNota()}`;
function renderChrome(){
  const k = route(), cfg = isConfig(k);
  const pg = $("#perG"); if (pg) pg.innerHTML = perAplica() ? perCtl() : "";
  $("#org").innerHTML = opcionesCuenta();
  const c = cuenta(), pl = PLANES[c.perfil.plan];
  $("#planLbl").textContent = "Plan " + pl.nombre + " · " + clp(pl.precio) + "/mes";
  const act = c.temas.filter(t => t.activo).length, usoMenc = menciones(c).reduce((s,m) => s + m.notas.length, 0);
  $("#usage").innerHTML = [["Temas", act, pl.temas],["Menciones del mes", usoMenc, pl.menciones],["Borradores", c.borradores||0, pl.borradores]].map(([n,v,mx]) => `<div class="row"><span>${n}</span><span class="mono">${fmt(v)} de ${fmt(mx)}</span></div><span class="bar ${v>=mx?"full":""}" aria-hidden="true"><i style="width:${Math.min(100, v/mx*100)}%"></i></span>`).join("") + (act >= pl.temas && c.sugeridos.length ? `<a href="#temas">Sumar más temas</a>` : "");
  const pend = pendientes().length;
  const link = ([key, name], ic, cnt) => `<a href="#${key}" ${key===k || (key==="temas" && cfg) ? 'aria-current="page"' : ""}>${icon(ic)}<span>${name}</span>${cnt ? `<span class="count" aria-label="${cnt} por revisar">${cnt}</span>` : ""}</a>`;
  $("#nav").innerHTML = MAIN.map(x => link(x, x[0], x[0]==="menciones" ? pend : 0)).join("") + link(["temas","Ajustes"], "config", 0);
  $("#fecha").textContent = PILOTO && PILOTO.activo ? (PILOTO.lectura ? "Lectura de medios cada 30 min · última " + horaCorta(PILOTO.lectura.fin) : "Lectura de medios cada 30 min") : "Monitoreando " + CATALOG.filter(m => m.m !== "facebook" && m.m !== "instagram" && m.a !== "institucional" && m.t !== "Otro medio").length + " medios · actualizado " + new Date(NOW - 7*60000).toLocaleTimeString("es-CL", {hour:"2-digit", minute:"2-digit", hourCycle:"h23"});
  $("#bnav").innerHTML = MAIN.map(x => link(x, x[0], x[0]==="menciones" ? pend : 0)).join("") + link(["temas","Ajustes"], "config", 0);
}

/* Inicio */
function onboarding(){
  const c = cuenta(); if (c.onbOculto) return "";
  const steps = [
    [c.caracterizada, "Define tus temas", "Responde cinco preguntas y PregonIA propone qué seguir.", "#asistente", "Abrir asistente"],
    [c.visto, "Revisa tus menciones", "Mira lo que se publicó y marca lo que no corresponda.", "#menciones", "Ver menciones"],
    [S.comunicados.some(x => x.org === S.org), "Prepara una respuesta", "Convierte una mención en un borrador listo para revisar.", "#comunicados", "Preparar borrador"]
  ];
  if (steps.every(s => s[0])) return "";
  return `<section class="onb" aria-label="Primeros pasos"><div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap"><h3>Primeros pasos en ${esc(S.org)}</h3><button class="btn ghost sm" data-act="onb-hide">Ocultar</button></div>
  <ol class="steps">${steps.map(([ok, t, d, href, cta], i) => `<li class="${ok?"ok":""}"><span class="n">${ok ? "✓ Listo" : "Paso " + (i+1)}</span><b>${t}</b><span class="muted" style="font-size:12.5px">${d}</span>${ok ? "" : `<a class="btn sm" href="${href}" style="align-self:flex-start">${cta}</a>`}</li>`).join("")}</ol></section>`;
}
/* Inicio: la portada responde cuatro preguntas, cada noticia una sola vez.
   ¿Cómo estamos? (veredicto y cifras frente al período anterior) · ¿Qué hago hoy? (responder y aprovechar)
   · ¿Qué está cambiando? (temas y asuntos sin tema) · ¿Qué viene? (calendario) · y quién marca la agenda.
   El período se elige: 24 horas, semana (7 días) o 30 días; la comparación es contra el período anterior del mismo largo. */
const NUM_TX = ["ningún", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez"];
const numTx = n => NUM_TX[n] || String(n);
const sinTema = m => [...m.temas.values()].every(x => x.tema.origen === "Núcleo");
/* Para explicar el tono: el tema propio de la noticia; si solo nombra a la cuenta, el área a la que corresponde. */
/* Lectura agregada (tono, impacto, partes): por categoría del cargo, para que cada noticia cuente una vez y nada quede «sin tema». */
const temaLectura = m => categoriaDe(m).n;
const catPorNombre = (n, c = cuenta()) => catsDe(c).find(x => x.n === n) || null;
// En una autoridad todo la nombra a ella: si solo calza su tema núcleo, el asunto lo dice la categoría de la noticia, no su nombre.
const temaCorto = m => { const t = [...m.temas.values()].map(x => x.tema).find(t => t.origen !== "Núcleo"), k = !t && esAut() ? categoriaDe(m) : null;
  return (t ? t.nombre : k && k !== CAT_OTROS ? k.n : temaDe(m)).split(":")[0]; };
/* Menciones del período anterior: las notas entre `dias` y 2×`dias` atrás, agrupadas igual que las actuales. */
function mencionesPrevias(c, dias){
  return menciones(c, dias * 2).map(m => { const notas = m.notas.filter(n => NOW - n.ts >= dias * DAY); if (!notas.length) return null;
    const {_cat, _enf, _pap, ...base} = m; return {...base, notas, ...tonoDe(notas), alcance: notas.reduce((s, n) => s + PESO[MED[n.m].l], 0)}; }).filter(Boolean);
}
const delta = (a, b, hayPrev) => !hayPrev ? "" : `<span class="ini-d ${a > b ? "up" : a < b ? "down" : ""}">${ri(a > b ? "up" : a < b ? "down" : "flat")}${a === b ? "igual" : signo(a - b)}</span>`;
/* Pulso del período: noticias por hora (24 horas) o por día (semana, 30 días), apiladas por tono.
   Mismo criterio que la cifra «Noticias»: cada asunto una vez, en el momento de su última nota. El ancho se ajusta a la pantalla
   para que en el teléfono se lea entero (el gráfico anterior quedaba cortado y escondía los últimos días). */
function chartPulso(ms, per){
  const n = per === 1 ? 24 : per, paso = per === 1 ? 3600e3 : DAY;
  const W = Math.round(Math.max(320, Math.min(760, (document.querySelector("#view")?.clientWidth || innerWidth) - 40))), H = W < 520 ? 150 : 170, L = 26, B = 24, top = 18;
  const bk = Array.from({length: n}, (_, i) => ({pos: 0, neu: 0, cri: 0, k: n - 1 - i}));
  const hoy0 = new Date(NOW).setHours(0, 0, 0, 0);
  // Por hora en 24 horas; por día calendario en semana y 30 días. Lo que cae justo en el borde va al tramo más antiguo, para que el total coincida con la cifra «Noticias».
  ms.forEach(m => { const k = per === 1 ? Math.floor((NOW - m.last) / paso) : Math.round((hoy0 - new Date(m.last).setHours(0, 0, 0, 0)) / DAY); bk[n - 1 - Math.min(n - 1, Math.max(0, k))][m.tono]++; });
  const tots = bk.map(x => x.pos + x.neu + x.cri), max = Math.max(2, ...tots), step = Math.max(1, Math.ceil(max / 2)), ymax = step * 2;
  const slot = (W - L - 6) / n, bw = Math.max(3, Math.min(per === 7 ? 34 : 14, slot - 3)), y = v => top + (H - top - B) * (1 - v / ymax);
  const etq = x => { const d = new Date(NOW - x.k * paso); return per === 1 ? d.toLocaleTimeString("es-CL", {hour: "2-digit", minute: "2-digit", hourCycle: "h23"}).slice(0, 2) + " h" : per === 7 ? d.toLocaleDateString("es-CL", {weekday: "short", day: "numeric"}) : `${d.getDate()}/${d.getMonth() + 1}`; };
  const largo = x => { const d = new Date(NOW - x.k * paso); return per === 1 ? "Entre " + d.toLocaleTimeString("es-CL", {hour: "2-digit", hourCycle: "h23"}) + ":00 y " + new Date(+d + 3600e3).toLocaleTimeString("es-CL", {hour: "2-digit", hourCycle: "h23"}) + ":00" : d.toLocaleDateString("es-CL", {weekday: "long", day: "numeric", month: "long"}); };
  const cada = per === 1 ? (W < 520 ? 6 : 3) : per === 7 ? 1 : (W < 520 ? 7 : 5);
  let g = "";
  for (let v = 0; v <= ymax; v += step) g += `<line x1="${L}" x2="${W - 4}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${v}</text>`;
  const imax = tots.indexOf(Math.max(...tots));
  bk.forEach((x, i) => {
    const X = L + 3 + i * slot + (slot - bw) / 2, tot = tots[i]; let acc = 0;
    const segs = [["pos", "url(#pat-pos)"], ["neu", "var(--neu)"], ["cri", "var(--cri)"]].filter(([k]) => x[k]);
    segs.forEach(([k, col], j) => { const y1 = y(acc + x[k]), y0 = y(acc) - (acc ? 2 : 0), last = j === segs.length - 1, r = Math.min(3, bw / 2);
      g += last ? `<path d="M${X},${y0} V${y1 + r} Q${X},${y1} ${X + r},${y1} H${X + bw - r} Q${X + bw},${y1} ${X + bw},${y1 + r} V${y0} Z" fill="${col}"/>` : `<rect x="${X}" y="${y1}" width="${bw}" height="${Math.max(1, y0 - y1)}" fill="${col}"/>`; acc += x[k]; });
    if (i === imax && tot) g += `<text x="${X + bw / 2}" y="${y(tot) - 5}" text-anchor="middle" class="pk">${tot}</text>`;
    if ((n - 1 - i) % cada === 0) g += `<text x="${i === n - 1 ? Math.min(W - 2, X + bw) : X + bw / 2}" y="${H - 7}" text-anchor="${i === n - 1 ? "end" : "middle"}">${per === 1 && i === n - 1 ? "ahora" : etq(x)}</text>`;
    g += `<rect class="hit" x="${L + 3 + i * slot}" y="${top - 8}" width="${slot}" height="${H - top - B + 8}" ${tipAttr(`${largo(x)}: ${tot ? [x.cri && plural(x.cri, "crítica", "críticas"), x.neu && plural(x.neu, "neutra", "neutras"), x.pos && plural(x.pos, "positiva", "positivas")].filter(Boolean).join(", ") : "sin noticias"}`)}/>`;
  });
  const total = tots.reduce((a, b) => a + b, 0), resumen = `${plural(total, "noticia", "noticias")} ${per === 1 ? "en 24 horas, por hora" : per === 7 ? "en 7 días, por día" : "en 30 días, por día"}; el máximo fue ${tots[imax]} (${largo(bk[imax]).toLowerCase()})`;
  return `<svg class="chart ini-pulso-svg" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(resumen)}">${g}</svg>`;
}
function vInicio(){
  const c = cuenta(), per = Number(tState.dias) || 7, perTx = {1: "en 24 horas", 7: "esta semana", 30: "en 30 días"}[per], antTx = {1: "las 24 horas anteriores", 7: "la semana anterior", 30: "los 30 días anteriores"}[per];
  // Autoridad: «ms» es lo que la nombra; «todas» suma lo que pasa en su territorio, que va al radar.
  const todas = menciones(c, per), prevT = mencionesPrevias(c, per), ms = sobreCuenta(todas, c), prev = sobreCuenta(prevT, c), M = metricas(ms), P = metricas(prev), hayPrev = prev.length > 0 || sobreCuenta(menciones(c, per * 2), c).length > ms.length;
  const v = veredicto(M), vP = veredicto(P), pend = pendientes(c), aut = esAut(), quien = aut ? c.perfil.nombre : S.org;
  const E = new Map(ms.map(m => [m.g, escalera(m.notas)]));
  const usadas = new Set();
  // Responder: críticas de la semana sin respuesta, primero las que llegaron más lejos y más rápido.
  const resp = pend.slice().sort((a, b) => escalera(b.notas).max - escalera(a.notas).max || b.notas.length - a.notas.length || b.last - a.last);
  resp.forEach(m => usadas.add(m.g));
  const ms30 = menciones(c, 30);
  const datoDe = m => { const ids = [...m.temas.values()].filter(x => x.tema.origen !== "Núcleo").map(x => x.tema.id); if (!ids.length) return null;
    // La nota de apoyo comparte tema y al menos una palabra clave concreta con la crítica (no basta el mismo tema amplio).
    const claves = id => new Set([...(m.temas.get(id).found || [])].map(norm).filter(t => !GENERICAS.has(t)));
    const d = ms30.filter(x => x.tono === "pos" && x.g !== m.g && !usadas.has(x.g) && ids.some(id => x.temas.has(id) && [...x.temas.get(id).found].some(f => claves(id).has(norm(f))))).sort((a, b) => b.last - a.last)[0];
    if (d) usadas.add(d.g); return d || null; };
  // Informar: hechos graves recientes (emergencias sin crítica a la cuenta). No se defienden: se informa qué pasa y qué se hace.
  const graves = ms.filter(m => m.grave && NOW - m.last < 2 * DAY && !usadas.has(m.g)).sort((a, b) => riesgo(b) - riesgo(a)).slice(0, 2);
  graves.forEach(m => usadas.add(m.g));
  const gravesHtml = graves.map(m => `<article class="ini-card grave">
      <p class="ini-kick neu">${ri("neu")} Hecho grave · ${esc(categoriaDe(m).n)}</p>
      <h3 class="ini-h">${esc(m.lead.t)}</h3>
      <p class="ini-meta">${esc(medioN(m.lead))} · ${ago(m.last)}${m.notas.length > 1 ? ` · en ${plural(m.notas.length, "medio", "medios")}` : ""}</p>
      <p class="ini-por">No es una crítica ${aut ? "a " + esc(quien) : "al municipio"}: conviene informar qué pasa, qué se está haciendo y dónde informarse.</p>
      <div class="ini-acts"><button class="btn" data-act="responder" data-g="${m.g}" data-from="inicio">Preparar información</button><button class="btn ghost" data-act="vocero" data-g="${m.g}">${ri("mic")} Vocería</button></div>
    </article>`).join("");
  const respHtml = resp.slice(0, 3).map(m => { const e = escalera(m.notas), k24 = new Set(m.notas.filter(n => n.ts - m.first < DAY).map(n => n.m)).size, area = areaDe(m), d = datoDe(m);
    return `<article class="ini-card cri">
      <p class="ini-kick cri">${esc(temaCorto(m))}${area ? " · " + esc(area) : ""}</p>
      <h3 class="ini-h">${esc(m.lead.t)}</h3>
      <p class="ini-meta">${esc(medioN(m.lead))} · ${ago(m.last)}${m.notas.length > 1 ? ` · en ${plural(m.notas.length, "medio", "medios")}` : ""}</p>
      <div class="ini-esc">${escHtml(e)}${k24 > 1 ? `<span>${k24} medios en 24 horas</span>` : ""}</div>
      ${d ? `<p class="ini-dato">${ri("rank")}<span><b>Dato para la respuesta:</b> ${ago(d.last)}, ${esc(nomMedio(d.lead))} publicó «${esc(d.lead.t)}».</span></p>` : ""}
      <div class="ini-acts"><button class="btn primary" data-act="responder" data-g="${m.g}" data-from="inicio">Preparar respuesta</button><button class="btn" data-act="vocero" data-g="${m.g}">${ri("mic")} ${m === resp[0] ? "Me llaman de la radio" : "Vocería"}</button></div>
      ${noRespHtml(m)}
    </article>`; }).join("") + (resp.length > 3 ? `<a class="btn ghost sm" href="#menciones" data-act="ver-criticas">Ver las ${resp.length} críticas sin respuesta</a>` : "");
  // Aprovechar: lo positivo que llegó más lejos, para compartir o convertir en nota propia.
  const apro = ms.filter(m => m.tono === "pos" && !usadas.has(m.g)).sort((a, b) => E.get(b.g).max - E.get(a.g).max || b.notas.length - a.notas.length || b.last - a.last).slice(0, 2);
  apro.forEach(m => usadas.add(m.g));
  const aproHtml = apro.map((m, i) => { const e = E.get(m.g);
    return `<article class="ini-card pos ${i ? "chico" : ""}">
      <p class="ini-kick pos">${esc(llego(e))}${m.notas.length > 1 ? ` · ${plural(m.notas.length, "medio", "medios")}` : ""}</p>
      <h3 class="ini-h">${esc(m.lead.t)}</h3>
      <p class="ini-meta">${esc(medioN(m.lead))} · ${ago(m.last)}</p>
      ${i ? "" : `<p class="ini-por">Nota ${e.max === 2 ? "nacional" : e.max === 1 ? "regional" : "comunal"} y positiva: material para las redes ${aut ? "de la oficina" : "municipales"} y el informe de gestión.</p>`}
      <div class="ini-acts"><button class="btn pos-b" data-act="ini-wa" data-g="${m.g}">${ri("pos")} Compartir por WhatsApp</button>${i ? "" : `<button class="btn ghost" data-act="responder" data-g="${m.g}" data-from="inicio">Preparar nota propia</button>`}</div>
    </article>`; }).join("");
  // Cifras
  const fuera = ms.filter(m => E.get(m.g).max >= 1), nac = ms.filter(m => E.get(m.g).max === 2), nacCri = nac.filter(m => m.tono === "cri").length;
  const fueraP = prev.filter(m => escalera(m.notas).max >= 1).length;
  const tPers = aut ? c.temas.find(t => t.persona) : c.temas.find(t => t.origen === "Núcleo" && /^(Alcalde|Alcaldesa) /.test(t.nombre));
  const tTerr = aut ? c.temas.find(t => t.origen === "Núcleo" && / \(territorio\)$/.test(t.nombre)) : null;
  const kTema = aut ? tTerr : tPers, msK = aut ? delTerritorio(todas, c) : kTema ? ms.filter(m => m.temas.has(kTema.id)) : [], MK = metricas(msK), msKP = aut ? delTerritorio(prevT, c) : kTema ? prev.filter(m => m.temas.has(kTema.id)) : [];
  const kLbl = aut ? "Radar del territorio" : (c.perfil.g === "F" ? "La alcaldesa" : "El alcalde") + " en la prensa";
  const conteoCorto = X => [[X.pos, "positiva", "positivas"], [X.neu, "neutra", "neutras"], [X.cri, "crítica", "críticas"]].filter(x => x[0]).map(x => plural(...x)).join(", ") || "sin notas";
  // Veredicto
  const frentes = resp.length, lejos = resp.filter(m => escalera(m.notas).max >= 1).length;
  const titulo = !M.vol ? (aut ? `Ninguna noticia nombró a ${esc(quien)} ${perTx}.` : `Sin noticias sobre ${esc(quien)} ${perTx}.`) : `Cobertura ${v.n.toLowerCase()} ${perTx}, ${frentes ? `con ${numTx(frentes)} ${frentes === 1 ? "frente crítico abierto" : "frentes críticos abiertos"}` : "sin frentes críticos abiertos"}.`;
  const balance = !M.vol ? "" : v.i === 2 ? `En la prensa sobre ${esc(quien)}, lo positivo y lo crítico se compensan.` : `La prensa habló ${v.f} de ${esc(quien)}.`;
  const pesa = frentes ? ` Lo que pesa: ${[...new Set(resp.map(m => temaCorto(m).toLowerCase()))].slice(0, 2).map(x => `<b class="c">${esc(x)}</b>`).join(" y ")}${frentes > 2 ? ` (${numTx(frentes)} notas en total)` : ""}, sin respuesta${lejos ? `; ${lejos === frentes ? (frentes === 1 ? "ya llegó" : frentes === 2 ? "ambas ya llegaron" : "todas ya llegaron") : `${numTx(lejos)} ya ${lejos === 1 ? "llegó" : "llegaron"}`} más allá de la prensa comunal` : ""}.` : (apro.length ? ` Nada crítico espera respuesta; hay ${plural(ms.filter(m => m.tono === "pos").length, "nota positiva", "notas positivas")} para aprovechar.` : "");
  const medN = PILOTO && PILOTO.activo ? CATALOG.length : CATALOG.filter(m => m.m !== "facebook" && m.m !== "instagram" && m.a !== "institucional" && m.t !== "Otro medio").length;
  // Qué está cambiando
  const filasT = c.temas.filter(t => t.activo && t.origen !== "Núcleo").map(t => { const sub = (aut ? todas : ms).filter(m => m.temas.has(t.id)), subP = (aut ? prevT : prev).filter(m => m.temas.has(t.id)); return {t, sub, n: sub.length, np: subP.length, X: metricas(sub)}; })
    .filter(x => x.n || x.np).sort((a, b) => b.n - a.n || (b.n - b.np) - (a.n - a.np));
  const filaT = x => { const nuevo = x.sub.find(m => !usadas.has(m.g)), ya = x.sub.length && !nuevo;
    return `<li><button class="ini-fila" data-act="goto-tema" data-id="${x.t.id}" aria-label="${esc(x.t.nombre)}: ${x.n} noticias ${perTx}, ${x.np} ${antTx}">
      <span class="ini-fn">${esc(x.t.nombre)}</span><span class="ini-fv mono">${x.n}${hayPrev ? ` ${ri(x.n > x.np ? "up" : x.n < x.np ? "down" : "flat", "ini-fa " + (x.n > x.np ? "up" : x.n < x.np ? "down" : ""))}<small>de ${x.np}</small>` : ""}</span>
      <span class="ini-fs">${x.n ? segbar([{l: "Críticas", v: x.X.cri, c: "var(--cri)"}, {l: "Neutras", v: x.X.neu, c: "var(--neu)"}, {l: "Positivas", v: x.X.pos, c: "var(--pos)"}]) : ""}<span>${x.n ? conteoCorto(x.X) : "sin notas " + perTx}${ya ? " · ya está en «Qué hacer hoy»" : ""}</span></span>
      ${nuevo ? `<span class="ini-ft">${esc(nuevo.lead.t)} <small>· ${esc(nomMedio(nuevo.lead))}</small></span>` : ""}</button></li>`; };
  const grupos = {}; (aut ? todas : ms).filter(sinTema).forEach(m => { const a = areaDe(m); if (a) (grupos[a] = grupos[a] || []).push(m); });
  const asuntos = Object.entries(grupos).filter(([, xs]) => xs.length >= 2).sort((a, b) => b[1].length - a[1].length).slice(0, 3);
  const filaA = ([a, xs]) => { const X = metricas(xs), ya = xs.filter(m => usadas.has(m.g)).length;
    return `<li class="ini-asunto"><div class="ini-fila"><span class="ini-fn">${esc(a)} <small class="ini-sin">sin tema asignado</small></span><span class="ini-fv mono">${xs.length}</span>
      <span class="ini-fs">${segbar([{l: "Críticas", v: X.cri, c: "var(--cri)"}, {l: "Neutras", v: X.neu, c: "var(--neu)"}, {l: "Positivas", v: X.pos, c: "var(--pos)"}])}<span>${conteoCorto(X)}${ya ? ` · ${ya} ya en «Qué hacer hoy»` : ""}</span></span>
      <span class="ini-ft">${xs.filter(m => !usadas.has(m.g)).slice(0, 2).map(m => esc(m.lead.t)).join(" · ") || ""}</span>
      <span class="ini-fb"><button class="btn sm" data-act="ini-tema" data-a="${esc(a)}">Seguir como tema</button></span></div></li>`; };
  // Qué viene
  const hitos = hitosOrdenados(c).filter(x => x.o.curso || x.o.dias <= 45).slice(0, 3);
  const vieneHtml = hitos.map(({h, o}) => { const n = hitoMenciones(h, ms30).length, hechas = prepHechas(h, o, c).length;
    return `<li><span class="ini-vh"><b>${esc(h.nombre)}</b><span class="${h.tipo === "riesgo" && !o.curso && o.dias <= 21 ? "pronto" : ""}">${esc(cuandoHito(o).replace("En curso · quedan", "en curso ·"))}</span></span>
      <span class="ini-vm">${h.tipo === "riesgo" ? "Riesgo" : "Oportunidad"} · ${n ? `<b>${plural(n, "nota", "notas")} del tema ya publicadas</b>` : "sin notas aún"}${h.prep.length ? ` · preparación ${hechas} de ${h.prep.length}` : ""} · <button class="ini-link" data-act="cal-ver" data-h="${esc(h.id)}">Preparar</button></span></li>`; }).join("");
  // Quién marca la agenda
  const med = {}; ms.forEach(m => m.notas.forEach(n => { const x = med[n.m] = med[n.m] || {id: n.m, tot: 0, pos: 0, neu: 0, cri: 0}; x.tot++; x[n.tono]++; }));
  const medTop = Object.values(med).sort((a, b) => b.tot - a.tot || b.cri - a.cri).slice(0, 4);
  const lado = x => x.cri * 2 > x.tot ? ["cri", "mayoría crítica"] : x.pos * 2 > x.tot ? ["pos", "mayoría positiva"] : ["", "mixta"];
  const agendaHtml = medTop.map(x => { const [k, l] = lado(x); return `<li><span class="ini-an"><b>${esc(MED[x.id].n)}</b><small class="${k}">${NIVS[nivIdx(MED[x.id].a)][1]} · ${l}</small></span>${segbar([{l: "Críticas", v: x.cri, c: "var(--cri)"}, {l: "Neutras", v: x.neu, c: "var(--neu)"}, {l: "Positivas", v: x.pos, c: "var(--pos)"}])}<span class="mono">${x.tot}</span></li>`; }).join("");
  // Hasta dónde llegaron: noticias por el nivel más alto de prensa que alcanzaron, y qué pasó con las críticas.
  const nivN = [0, 1, 2].map(i => ms.filter(m => E.get(m.g).max === i)), nivC = nivN.map(xs => xs.filter(m => m.tono === "cri").length);
  const criFuera = ms.filter(m => m.tono === "cri" && E.get(m.g).max >= 1), criFueraN = criFuera.length, criTot = ms.filter(m => m.tono === "cri").length;
  const maxCri = criFuera.reduce((x, m) => Math.max(x, E.get(m.g).max), 0);
  const llegaron = (n, nivel) => `${n} ${n === 1 ? "llegó" : "llegaron"} a prensa ${nivel}`;
  const partesCri = [nivC[2] ? llegaron(nivC[2], "nacional") : "", nivC[1] ? llegaron(nivC[1], "regional") : ""].filter(Boolean);
  const fraseAlcance = !M.vol ? `sin noticias ${perTx}` : !criTot ? "ninguna crítica en el período" : !criFueraN ? (criTot === 1 ? "la crítica se quedó en la prensa comunal" : `las ${criTot} críticas se quedaron en la prensa comunal`)
    : criFueraN === criTot && partesCri.length === 1 ? `${criTot === 1 ? "la crítica llegó" : `las ${criTot} críticas llegaron`} a prensa ${nivC[2] ? "nacional" : "regional"}`
    : `de ${plural(criTot, "crítica", "críticas")}, ${partesCri.join(" y ")}`;
  const escaleraKpi = () => { const mx = Math.max(1, ...nivN.map(x => x.length));
    return `<span class="ini-lad" role="img" aria-label="${esc(`Prensa nacional: ${nivN[2].length}; regional: ${nivN[1].length}; solo comunal: ${nivN[0].length}`)}">${[[2, "Nacional"], [1, "Regional"], [0, "Solo comunal"]].map(([i, l]) => `<span class="ini-lad-r"><span class="ini-lad-l">${l}</span><span class="ini-lad-b"><i class="lv${i}" style="width:${nivN[i].length ? Math.max(6, nivN[i].length / mx * 100) : 0}%"></i></span><span class="mono">${nivN[i].length}</span>${nivC[i] ? `<span class="ini-lad-c" title="${plural(nivC[i], "crítica", "críticas")}">${ri("cri")}${nivC[i]}</span>` : `<span></span>`}</span>`).join("")}</span>`; };
  // Impacto por tema: alcance ponderado (cada publicación pesa 3, 2 o 1 según el tamaño del medio) de lo crítico frente a lo positivo, por tema
  // (o por área, si la noticia solo nombra a la cuenta). Cada noticia cuenta en un solo grupo.
  const impG = {}; ms.forEach(m => { const k = temaLectura(m), x = impG[k] = impG[k] || {k, cri: 0, pos: 0, neu: 0, n: 0, ms: []}; x[m.tono] += m.alcance; x.n++; x.ms.push(m); });
  const impL = Object.values(impG).map(x => ({...x, bal: x.pos - x.cri, tot: x.pos + x.cri + x.neu, cat: catPorNombre(x.k, c)})).sort((a, b) => (b.cri + b.pos) - (a.cri + a.pos) || b.tot - a.tot);
  const impMax = Math.max(1, ...impL.map(x => Math.max(x.cri, x.pos))), peorImp = impL.filter(x => x.cri).sort((a, b) => a.bal - b.bal)[0], mejorImp = impL.filter(x => x.pos).sort((a, b) => b.bal - a.bal)[0];
  const filaImp = (x, link) => { const inner = `<span class="ini-imp-n">${esc(x.k)}<small>${plural(x.n, "noticia", "noticias")}</small></span><span class="ini-imp-b neg"><i style="width:${x.cri / impMax * 100}%"></i></span><span class="ini-imp-b pos"><i style="width:${x.pos / impMax * 100}%"></i></span><span class="mono ini-imp-v ${x.bal < 0 ? "c" : x.bal > 0 ? "p" : ""}">${signo(x.bal)}</span>`;
    const lbl = `${x.k}: impacto crítico ${x.cri}, positivo ${x.pos}, balance ${signo(x.bal)}`;
    return link && x.cat ? `<li><button class="ini-imp-r" ${goA({fcat: x.cat.k})} aria-label="${esc(lbl)}">${inner}</button></li>` : `<li><div class="ini-imp-r" role="group" aria-label="${esc(lbl)}">${inner}</div></li>`; };
  // Críticas atendidas: cuántas críticas que exigían respuesta tienen respuesta aprobada o decisión de no responder y cuánto tardó, desde la primera nota.
  const criP = ms.filter(m => exigeRespuesta(m, c)).sort((a, b) => atendida(a.g) - atendida(b.g) || a.first - b.first);
  const tResp = m => { const t = S.resp[S.org + ":" + m.g]; return typeof t === "number" ? Math.max(0, (t - m.first) / 36e5) : null; };
  const resps = criP.filter(m => atendida(m.g)), hs = criP.filter(m => respondida(m.g)).map(tResp).filter(x => x != null).sort((a, b) => a - b), med_h = hs.length ? hs[Math.floor((hs.length - 1) / 2)] : null;
  const pendC = criP.filter(m => !atendida(m.g)), viejaH = pendC.length ? Math.max(...pendC.map(m => (NOW - m.first) / 36e5)) : 0;
  const fH = h => h < 1 ? "menos de 1 h" : h < 48 ? Math.round(h) + " h" : Math.round(h / 24) + " días";
  // De dónde viene la crítica: notas críticas del período por medio.
  const notasC = ms.flatMap(m => m.notas).filter(n => n.tono === "cri"), porMedC = {};
  notasC.forEach(n => porMedC[n.m] = (porMedC[n.m] || 0) + 1);
  const rankC = Object.entries(porMedC).sort((a, b) => b[1] - a[1]), topC = rankC[0], shareC = topC ? pct(topC[1], notasC.length) : 0;
  const concentrada = notasC.length >= 3 && shareC >= 50;
  // Segundo nivel de los indicadores: para qué sirve, para quién, y el total agregado según el criterio que informa.
  const abierto = ["vol", "tono", "lejos", "pers", "resp", "conc", "imp"].includes(tState.iniKpi) && (tState.iniKpi !== "pers" || kTema) ? tState.iniKpi : null;
  const kAttr = k => `type="button" data-act="ini-kpi" data-k="${k}" aria-expanded="${abierto === k}" aria-controls="iniDet"${abierto === k ? ' data-on="1"' : ""}`;
  const mini = X => segbar([{l: "Críticas", v: X.cri, c: "var(--cri)"}, {l: "Neutras", v: X.neu, c: "var(--neu)"}, {l: "Positivas", v: X.pos, c: "var(--pos)"}]);
  const fila = (attrs, nombre, sub, n, extra = "") => `<li><button class="ini-dr" ${attrs}><span class="ini-dn">${nombre}${sub ? `<small>${sub}</small>` : ""}</span>${extra}<span class="mono ini-dv">${n}</span>${ri("sig", "ini-dg")}</button></li>`;
  const goA = o => `data-act="goto" data-dias="${per}"` + Object.entries(o).map(([k, v]) => ` data-${k}="${esc(String(v))}"`).join("");
  const prop = (n, t) => t ? `${pct(n, t)}%` : "";
  function detalleKpi(){
    if (!abierto) return "";
    const head = (t, para, quien) => `<div class="ini-det-h"><div><h3 id="iniDetT">${t}</h3><p class="ini-para"><b>Para qué sirve:</b> ${para}</p><p class="ini-quien"><b>Quién lo usa:</b> ${quien}</p></div><button class="ini-x" type="button" data-act="ini-kpi" data-k="${abierto}" aria-label="Cerrar detalle">${ri("x")}</button></div>`;
    let body = "";
    if (abierto === "vol") {
      const temasT = c.temas.filter(t => t.activo && t.origen !== "Núcleo").map(t => { const sub = ms.filter(m => m.temas.has(t.id)); return {t, sub, X: metricas(sub), np: prev.filter(m => m.temas.has(t.id)).length}; }).filter(x => x.sub.length).sort((a, b) => b.sub.length - a.sub.length);
      const sin = ms.filter(sinTema), medR = Object.values(med).sort((a, b) => b.tot - a.tot).slice(0, 6);
      body = `<div class="ini-det-g"><section><h4>Por tema</h4><ul class="ini-dl">${temasT.map(x => fila(`data-act="goto-tema" data-id="${x.t.id}"`, esc(x.t.nombre), hayPrev ? `${x.np} ${antTx}` : "", x.sub.length, mini(x.X))).join("")}${sin.length ? fila(goA({tono: "todos"}), "Sin tema asignado", "solo nombran a " + esc(quien), sin.length, mini(metricas(sin))) : ""}</ul><p class="ini-nota">Una noticia puede tocar más de un tema; por eso la suma puede superar el total.</p></section>
        <section><h4>Por medio</h4><ul class="ini-dl">${medR.map(x => fila(goA({medio: x.id}), esc(MED[x.id].n), NIVS[nivIdx(MED[x.id].a)][1], x.tot, mini(x))).join("")}</ul><p class="ini-nota">Cuenta publicaciones: una misma noticia en tres medios suma en los tres.</p></section></div>`;
      return `<section class="ini-det" id="iniDet" aria-labelledby="iniDetT">${head(`Noticias ${perTx}: ${M.vol}`, `muestra cuánto ocupa ${esc(quien)} la agenda y si eso sube o baja. Un salto sin un anuncio propio que lo explique suele anticipar un problema.`, aut ? "el equipo de prensa de la oficina, para decidir si reforzar o bajar el perfil." : "el encargado de comunicaciones, para decidir si reforzar o bajar el perfil.")}${body}</section>`;
    }
    if (abierto === "tono") {
      const bloque = (k, lbl) => { const xs = ms.filter(m => m.tono === k), por = {}; xs.forEach(m => { const t = temaLectura(m); por[t] = (por[t] || 0) + 1; });
        const top = Object.entries(por).sort((a, b) => b[1] - a[1]).slice(0, 3);
        return `<section class="ini-tb ${k}"><button class="ini-tbh" ${goA({tono: k})}><span>${ri(k)} ${lbl}</span><span class="mono">${xs.length}<small>${prop(xs.length, M.vol)}</small></span></button>
          ${top.length ? `<ul class="ini-dl">${top.map(([t, n]) => { const ct = catPorNombre(t, c); return fila(ct ? goA({tono: k, fcat: ct.k}) : goA({tono: k}), esc(t), "", n); }).join("")}</ul>` : `<p class="ini-nota">Ninguna ${perTx}.</p>`}</section>`; };
      const tC = Object.entries(ms.filter(m => m.tono === "cri").reduce((o, m) => (o[temaLectura(m)] = (o[temaLectura(m)] || 0) + 1, o), {})).sort((a, b) => b[1] - a[1])[0];
      const tP = Object.entries(ms.filter(m => m.tono === "pos").reduce((o, m) => (o[temaLectura(m)] = (o[temaLectura(m)] || 0) + 1, o), {})).sort((a, b) => b[1] - a[1])[0];
      body = `${tC || tP ? `<p class="ini-explica">${tC ? `Las críticas vienen sobre todo de <b>${esc(tC[0].toLowerCase())}</b> (${tC[1]} de ${M.cri})` : "No hubo críticas"}${tP ? `; lo positivo, de <b>${esc(tP[0].toLowerCase())}</b> (${tP[1]} de ${M.pos})` : ""}.</p>` : ""}<div class="ini-det-g tres">${bloque("cri", "Críticas")}${bloque("neu", "Neutras")}${bloque("pos", "Positivas")}</div>`;
      return `<section class="ini-det" id="iniDet" aria-labelledby="iniDetT">${head(`Tono ${perTx}: ${v.n.toLowerCase()}`, `resume si la prensa trata a ${esc(quien)} a favor o en contra, y qué temas lo explican. Sirve para decidir dónde defender y qué amplificar.`, aut ? "la autoridad y su equipo de prensa." : "el alcalde y el encargado de comunicaciones.")}${body}</section>`;
    }
    if (abierto === "lejos") {
      const nivel = (i, lbl) => { const xs = ms.filter(m => E.get(m.g).max === i).sort((a, b) => (b.tono === "cri") - (a.tono === "cri") || b.notas.length - a.notas.length), X = metricas(xs);
        return `<section class="ini-tb lv${i}"><button class="ini-tbh" ${goA({llego: i})}><span>${lbl}</span><span class="mono">${xs.length}${X.cri ? `<small class="c">${plural(X.cri, "crítica", "críticas")}</small>` : ""}</span></button>
          ${xs.length ? `<ul class="ini-dl">${xs.slice(0, 3).map(m => fila(goA({llego: i, tono: m.tono}), esc(m.lead.t), esc(nomMedio(m.lead)) + (m.notas.length > 1 ? ` y ${m.notas.length - 1} más` : ""), pillTono(m.tono))).join("")}</ul>${xs.length > 3 ? `<button class="ini-mas2" ${goA({llego: i})}>Ver las ${xs.length}</button>` : ""}` : `<p class="ini-nota">Ninguna ${perTx}.</p>`}</section>`; };
      const sub = ms.filter(m => E.get(m.g).subio).length;
      body = `${sub ? `<p class="ini-explica"><b>${plural(sub, "noticia empezó", "noticias empezaron")}</b> en un medio de menor alcance y ${sub === 1 ? "subió" : "subieron"} de nivel ${perTx}: son las que más conviene vigilar.</p>` : ""}<div class="ini-det-g tres">${nivel(2, "Prensa nacional")}${nivel(1, "Prensa regional")}${nivel(0, "Solo prensa comunal")}</div>`;
      return `<section class="ini-det" id="iniDet" aria-labelledby="iniDetT">${head(`Hasta dónde llegaron: ${nivN[2].length} a prensa nacional, ${nivN[1].length} a regional, ${nivN[0].length} solo comunal`, "muestra qué noticias salieron del ámbito comunal. Una crítica que llega a prensa regional o nacional ya no se resuelve solo en el territorio: pide vocería y coordinación con otras autoridades.", aut ? "la autoridad y su equipo de prensa, para priorizar." : "el alcalde, comunicaciones y la jefatura del área afectada, para priorizar.")}${body}</section>`;
    }
    if (abierto === "imp") {
      body = `<div class="ini-imp-ej" aria-hidden="true"><span>Tema o área</span><span class="neg">← resta (críticas)</span><span class="pos">suma (positivas) →</span><span>Balance</span></div><ul class="ini-imp grande">${impL.map(x => filaImp(x, true)).join("")}</ul>
        <p class="ini-nota"><b>Cómo se calcula:</b> cada publicación suma puntos según el tamaño del medio: 3 si es grande (nivel A, como BioBioChile o Meganoticias), 2 si es mediano y 1 si es pequeño o comunal. Las críticas restan y las positivas suman; las neutras no mueven el balance. Una noticia publicada en cuatro medios suma los cuatro. Los temas propios se pueden abrir; las áreas agrupan noticias que aún no tienen tema.</p>`;
      return `<section class="ini-det" id="iniDet" aria-labelledby="iniDetT">${head("Impacto por tema", `muestra qué temas le están costando y cuáles le están sumando a la imagen de ${esc(quien)}, considerando no solo cuántas notas hubo sino en qué medios salieron. Ordena dónde poner el esfuerzo de respuesta y qué conviene difundir.`, aut ? "la autoridad y su equipo de prensa, para priorizar su agenda." : "el alcalde y el encargado de comunicaciones, para priorizar; las jefaturas, para ver cómo se percibe su área.")}${body}</section>`;
    }
    if (abierto === "resp") {
      const filaR = m => { const r = respondida(m.g), nr = noResp(m.g), h = tResp(m), edad = (NOW - m.first) / 36e5;
        return `<li><button class="ini-dr" ${r || nr ? `data-act="goto" data-dias="${per}" data-tono="cri"` : `data-act="responder" data-g="${m.g}" data-from="inicio"`}><span class="ini-dn">${esc(m.lead.t)}<small>${esc(nomMedio(m.lead))} · ${r ? (h != null ? `respondida en ${fH(h)}` : "respondida") : nr ? `decidimos no responder: ${esc(NO_RESP[nr.k] || "")}` : `<span class="${edad > 24 ? "c" : ""}">sin decisión, hace ${fH(edad)}</span>`}</small></span><span class="ini-dv">${r ? pillTono("pos").replace("Positivo", "Respondida") : nr ? `<span class="pill">No responder</span>` : `<span class="btn sm primary">Preparar respuesta</span>`}</span>${ri("sig", "ini-dg")}</button></li>`; };
      body = criP.length ? `<ul class="ini-dl">${criP.map(filaR).join("")}</ul><p class="ini-nota">Cuenta como atendida al aprobar su respuesta en Comunicados o al registrar la decisión de no responder${aut ? ". Solo entran las críticas que la nombran y que la tienen de protagonista, llegaron a prensa regional o salieron en tres o más medios" : ""}. Se marcan las que llevan más de 24 horas sin decisión.</p>` : `<p class="ini-nota">Ninguna crítica ${perTx} exigía respuesta${aut ? " (las críticas de su territorio que no la nombran van al radar)" : ""}.</p>`;
      return `<section class="ini-det" id="iniDet" aria-labelledby="iniDetT">${head(`Críticas atendidas: ${resps.length} de ${criP.length}`, `mide si el equipo toma una decisión a tiempo frente a cada crítica que lo exige: responder, o no responder con un motivo (no amplificarla, resolverla directo). Una crítica que nadie decide suele repetirse en otros medios sin la versión ${aut ? "de la oficina" : "del municipio"}.`, aut ? "la autoridad, para evaluar a su equipo de prensa; el equipo, para priorizar." : "el alcalde, para evaluar la gestión de comunicaciones; el encargado, para priorizar.")}${body}</section>`;
    }
    if (abierto === "conc") {
      const filaM = ([id, n]) => `<li><button class="ini-dr" data-act="goto" data-dias="${per}" data-tono="cri" data-medio="${esc(id)}"><span class="ini-dn">${esc(MED[id].n)}<small>${NIVS[nivIdx(MED[id].a)][1]}</small></span><span class="ini-bar" aria-hidden="true"><i style="width:${pct(n, notasC.length)}%"></i></span><span class="mono ini-dv">${n}<small> · ${pct(n, notasC.length)}%</small></span>${ri("sig", "ini-dg")}</button></li>`;
      const lectura = !notasC.length ? "" : notasC.length < 3 ? `Hay ${plural(notasC.length, "nota crítica", "notas críticas")} ${perTx}: muy pocas para hablar de concentración.` : concentrada ? `La crítica la impulsa sobre todo <b>${esc(MED[topC[0]].n)}</b>. Conviene revisar la relación con ese medio y ofrecerle la versión ${aut ? "de la oficina" : "del municipio"} antes que una respuesta pública amplia.` : `La crítica viene de ${plural(rankC.length, "medio", "medios")} distintos: es un tema instalado, no de un medio en particular, y pide una respuesta pública.`;
      body = notasC.length ? `${lectura ? `<p class="ini-explica">${lectura}</p>` : ""}<ul class="ini-dl">${rankC.map(filaM).join("")}</ul><p class="ini-nota">Cuenta notas críticas, no noticias: si tres medios publican la misma crítica, suma en los tres.</p>` : `<p class="ini-nota">No hubo notas críticas ${perTx}.</p>`;
      return `<section class="ini-det" id="iniDet" aria-labelledby="iniDetT">${head("De dónde viene la crítica", "distingue si la crítica la impulsa un medio en particular o si está repartida en la prensa. Cambia la estrategia: conversar con un medio o responder en público.", aut ? "el equipo de prensa, para su relación con los medios." : "el encargado de comunicaciones, para su relación con los medios.")}${body}</section>`;
    }
    if (aut) {
      const goT = o => `data-act="goto" data-dias="${per}" data-alc="terr"` + Object.entries(o).map(([k, v]) => ` data-${k}="${esc(String(v))}"`).join("");
      const lista = (xs, lbl, que, vacio) => `<section><h4>${lbl} · ${xs.length}</h4><p class="ini-nota">${que}</p>${xs.length ? `<ul class="ini-dl">${xs.slice(0, 4).map(m => fila(goT({fcat: categoriaDe(m).k}), esc(m.lead.t), esc(nomMedio(m.lead)) + " · " + ago(m.last) + " · " + esc(categoriaDe(m).n), m.grave ? `<span class="pill">Hecho grave</span>` : pillTono(m.tono))).join("")}</ul>` : `<p class="ini-nota">${vacio}</p>`}</section>`;
      const G = msK.filter(m => m.grave).sort((a, b) => riesgo(b) - riesgo(a)), R = msK.filter(m => m.tono === "cri").sort((a, b) => riesgo(b) - riesgo(a)), O = msK.filter(m => m.tono === "pos").sort((a, b) => escalera(b.notas).max - escalera(a.notas).max || b.last - a.last);
      body = msK.length ? `<div class="ini-det-g tres">${lista(G, "Emergencias y hechos graves", "Mostrar presencia y coordinar con el servicio a cargo; no es una crítica a la autoridad.", "Ninguno en el período.")}${lista(R, "Reclamos en el territorio", "Gestionar con el municipio o el servicio y comunicar la gestión si hay avance.", "Ninguno en el período.")}${lista(O, "Oportunidades para aparecer", "Buenas noticias donde sumarse con un saludo o una visita, si corresponde a su agenda.", "Ninguna en el período.")}</div><p class="ini-nota">El radar no entra en el tono, las críticas ni el parte: son noticias de su territorio que no la nombran.</p>` : `<p class="ini-nota">Sin noticias de su territorio ${perTx}.</p>`;
      return `<section class="ini-det" id="iniDet" aria-labelledby="iniDetT">${head(`Radar del territorio: ${msK.length}`, `separa lo que pasa en el territorio que representa ${esc(quien)} de lo que la prensa dice de la persona. Ahí aparecen gestiones posibles y oportunidades de presencia, sin contaminar su tono.`, "el equipo territorial y la jefatura de prensa, para la agenda de la semana.")}${body}</section>`;
    }
    const xs = msK.slice().sort((a, b) => b.last - a.last), por = {}; xs.forEach(m => { const t = temaLectura(m); por[t] = (por[t] || 0) + 1; });
    body = xs.length ? `<div class="ini-det-g"><section><h4>Qué se publicó</h4><ul class="ini-dl">${xs.slice(0, 5).map(m => fila(`data-act="goto-tema" data-id="${kTema.id}"`, esc(m.lead.t), esc(nomMedio(m.lead)) + " · " + ago(m.last), pillTono(m.tono))).join("")}</ul></section>
      <section><h4>En qué temas</h4><ul class="ini-dl">${Object.entries(por).sort((a, b) => b[1] - a[1]).map(([t, n]) => fila(`data-act="goto-tema" data-id="${kTema.id}"`, esc(t), "", n)).join("")}</ul><p class="ini-nota">${MK.cri ? `${plural(MK.cri, "nota crítica", "notas críticas")} lo nombran: revisar si conviene que responda en persona.` : "Ninguna nota crítica lo nombra en el período."}</p></section></div>`
      : `<p class="ini-nota">Ninguna nota lo nombra ${perTx}.</p>`;
    return `<section class="ini-det" id="iniDet" aria-labelledby="iniDetT">${head(`${esc(kLbl)}: ${MK.vol}`, aut ? `muestra cuánto se habla del territorio que representa ${esc(quien)} y con qué tono, más allá de lo que se dice de la persona.` : `separa la exposición personal ${c.perfil.g === "F" ? "de la alcaldesa" : "del alcalde"} de la del municipio: qué se dice de ${c.perfil.g === "F" ? "ella" : "él"}, en qué temas y con qué tono.`, aut ? "la autoridad, para conectar su agenda con los problemas de su territorio." : `${c.perfil.g === "F" ? "la alcaldesa" : "el alcalde"} y quien lleva su agenda de prensa.`)}${body}</section>`;
  }
  const sec = (id, t, extra = "") => `<div class="ini-sec"><h2 id="${id}">${t}</h2><span class="ini-line"></span>${extra}</div>`;
  return `<section class="ini-ver" aria-labelledby="verT">
    <div class="ini-ed"><span class="ini-ekick">Edición ${esc(S.org)} · ${new Date(NOW).toLocaleDateString("es-CL", {weekday: "long", day: "numeric", month: "long"})}</span>
</div>
    <h2 id="verT" class="ini-tit" tabindex="-1">${titulo}</h2>
    ${balance || pesa ? `<p class="ini-lead">${balance}${pesa}</p>` : ""}
    ${aut && !M.vol && typeof MODO !== "undefined" && MODO.tipo === "demo" ? `<p class="ini-lead">La demostración no inventa noticias sobre personas reales: lo que la prensa dice de ${esc(quien)} aparece con noticias reales, en pregonia.vercel.app.</p>` : ""}
    ${aut && msK.length ? `<p class="ini-lead">${M.vol ? "Aparte, en" : "En"} su territorio hubo ${plural(msK.length, "noticia", "noticias")} que no ${c.perfil.g === "F" ? "la" : "lo"} nombran${msK.filter(m => m.grave).length ? `, ${plural(msK.filter(m => m.grave).length, "hecho grave", "hechos graves")}` : ""}${MK.cri ? `${msK.filter(m => m.grave).length ? " y" : ","} ${plural(MK.cri, "reclamo", "reclamos")}` : ""}: no cuentan en su tono, pero pueden ser gestión o presencia. <button class="ini-link" ${kAttr("pers")}>Ver el radar</button></p>` : ""}
    <div class="ini-kpis">
      ${aut && !M.vol ? "" : `<button class="ini-kpi" ${kAttr("vol")}><span class="l">Noticias ${perTx}</span><span class="v"><span class="mono">${M.vol}</span>${delta(M.vol, P.vol, hayPrev)}</span><span class="s">${hayPrev ? `frente a ${P.vol} ${per === 1 ? "en " : ""}${antTx}` : `sin datos de ${antTx} para comparar`} · en ${plural(Object.keys(med).length, "medio", "medios")}</span></button>
      <button class="ini-kpi" ${kAttr("tono")}><span class="l">Tono ${per === 7 ? "de la semana" : perTx}</span><span class="v word ${v.k}">${v.n}</span>${segbar([{l: "Críticas", v: M.cri, c: "var(--cri)"}, {l: "Neutras", v: M.neu, c: "var(--neu)"}, {l: "Positivas", v: M.pos, c: "var(--pos)"}])}<span class="s">${conteoCorto(M)}${hayPrev && P.vol ? ` · antes: ${vP.n.toLowerCase()}` : ""}</span></button>
      <button class="ini-kpi" ${kAttr("lejos")}><span class="l">Hasta dónde llegaron</span>${escaleraKpi()}<span class="s ini-lad-s ${criFueraN ? "c" : ""}">${fraseAlcance}</span></button>
      <button class="ini-kpi ${pendC.length ? "alerta" : ""}" ${kAttr("resp")}><span class="l">Críticas atendidas</span><span class="v"><span class="mono">${resps.length}</span><small>de ${criP.length}</small></span><span class="s">${!criP.length ? `ninguna exigía respuesta ${perTx}` : med_h != null ? `tardan ${fH(med_h)} (mediana) desde la primera nota${pendC.length ? ` · ${pendC.length} sin decisión` : ""}` : `${pendC.length} sin decisión; la más antigua lleva ${fH(viejaH)}`}</span></button>
      <button class="ini-kpi" ${kAttr("conc")}><span class="l">De dónde viene la crítica</span><span class="v word ${concentrada ? "cri" : ""}">${!notasC.length ? "Sin críticas" : notasC.length < 3 ? "Pocas para medir" : concentrada ? "Concentrada" : "Repartida"}</span><span class="s">${!topC ? `ninguna nota crítica ${perTx}` : concentrada || notasC.length < 3 ? `${esc(MED[topC[0]].n)} publicó ${topC[1]} de ${plural(notasC.length, "nota crítica", "notas críticas")} (${shareC}%)` : `${plural(notasC.length, "nota crítica", "notas críticas")} en ${plural(rankC.length, "medio", "medios")}; ninguno publicó más de ${topC[1]}`}</span></button>`}
      ${kTema ? `<button class="ini-kpi ${aut && !M.vol ? "ancho" : ""}" ${kAttr("pers")}><span class="l">${esc(kLbl)}</span><span class="v"><span class="mono">${MK.vol}</span><small>${MK.vol === 1 ? "mención" : "menciones"}</small>${delta(MK.vol, msKP.length, hayPrev)}</span><span class="s">${conteoCorto(MK)}</span></button>` : ""}
      ${impL.length ? `<button class="ini-kpi ancho" ${kAttr("imp")}><span class="l">Impacto por tema</span><span class="ini-imp-ej" aria-hidden="true"><span>Tema</span><span class="neg">← resta (críticas)</span><span class="pos">suma (positivas) →</span><span>Balance</span></span><ul class="ini-imp">${impL.slice(0, 4).map(x => filaImp(x, false)).join("")}</ul><span class="s">${peorImp ? `Mayor impacto negativo: <b>${esc(peorImp.k.toLowerCase())}</b> (${signo(peorImp.bal)})` : "Ningún tema con impacto negativo"}${mejorImp ? ` · mayor impacto positivo: <b>${esc(mejorImp.k.toLowerCase())}</b> (${signo(mejorImp.bal)})` : ""}</span></button>` : ""}
    </div>
    ${detalleKpi()}
    ${M.vol ? `<div class="ini-pulso"><div class="ini-pulso-h"><h3>Cómo se movió la prensa ${perTx}</h3><div class="legend"><span><i style="background:var(--cri)"></i>Críticas</span><span><i style="background:var(--neu)"></i>Neutras</span><span><i style="background:var(--pos)"></i>Positivas</span></div></div>${chartPulso(ms, per)}</div>` : ""}
    <p class="ini-valor">${ri("reloj")}<span>Hoy leímos <b>${medN} medios</b> de la región y el país. De todo lo publicado, estas son las notas sobre ${esc(quien)} que importan y lo que conviene hacer con ellas.</span></p>
  </section>
  <section aria-labelledby="hoyT">
    ${sec("hoyT", "Qué hacer hoy")}
    <div class="ini-hoy ${apro.length ? "" : "solo"}">
      <div class="ini-col"><p class="ini-colt cri">${ri("cri")} Responder · ${resp.length}</p>${resp.length ? respHtml : `<div class="allgood">${ri("ok")} ${aut ? `Nada que ${c.perfil.g === "F" ? "la" : "lo"} nombre exige respuesta en los últimos 7 días.` : "Todo al día: ninguna crítica sin decisión en los últimos 7 días."}</div>`}
        ${graves.length ? `<p class="ini-colt neu">${ri("neu")} Informar · ${graves.length}</p>${gravesHtml}` : ""}</div>
      ${apro.length ? `<div class="ini-col"><p class="ini-colt pos">${ri("up")} Aprovechar · ${apro.length}</p>${aproHtml}</div>` : ""}
    </div>
  </section>
  <div class="ini-bajo">
    <section aria-labelledby="camT">
      ${sec("camT", "Qué está cambiando", `<span class="ini-sub">${{1: "24 h vs. las 24 anteriores", 7: "semana vs. la anterior", 30: "30 días vs. los anteriores"}[per]}</span>`)}
      ${!c.caracterizada && !c.onbOculto ? `<p class="ini-afina">${ri("pin")}<span>Estos temas los propuso PregonIA a partir del territorio. Afinarlos toma cinco preguntas y mejora toda la lectura.</span><a class="btn sm" href="#asistente">Afinar temas</a><button class="ini-link" type="button" data-act="onb-hide">Ocultar</button></p>` : ""}
      ${filasT.length || asuntos.length ? `<ul class="ini-lista">${filasT.map(filaT).join("")}${asuntos.map(filaA).join("")}</ul>` : `<p class="muted">Sin notas de tus temas ${perTx}.</p>`}
    </section>
    <div class="ini-der">
      ${vieneHtml ? `<section aria-labelledby="vieT">${sec("vieT", "Qué viene")}<ul class="ini-lista ini-viene">${vieneHtml}</ul></section>` : ""}
      ${agendaHtml ? `<section aria-labelledby="ageT">${sec("ageT", "Quién marca la agenda", `<span class="ini-sub">${{1: "24 horas", 7: "7 días", 30: "30 días"}[per]}</span>`)}<ul class="ini-lista ini-agenda">${agendaHtml}<li class="ini-mas"><a href="#reportes">Todos los medios y noticias por día, en Reportes →</a></li></ul></section>` : ""}
    </div>
  </div>`;
}
/* Acciones de la portada */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  if (b.dataset.act === "ini-kpi") { const k = b.dataset.k, cerrar = tState.iniKpi === k; tState.iniKpi = cerrar ? null : k; render(); setTimeout(() => { const el = cerrar ? document.querySelector(`.ini-kpi[data-k="${k}"]`) : document.getElementById("iniDetT"); if (el) { if (!cerrar) { el.setAttribute("tabindex", "-1"); document.getElementById("iniDet")?.scrollIntoView({block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"}); } el.focus({preventScroll: !cerrar ? true : false}); } }, 0); }
  if (b.dataset.act === "ini-wa") { const m = menciones(cuenta(), 30).find(x => x.g === b.dataset.g); if (!m) return;
    const t = `«${m.lead.t}» · ${nomMedio(m.lead)}${m.lead.url ? "\n" + m.lead.url : ""}`; abrirEnlace("https://wa.me/?text=" + encodeURIComponent(t), true); }
  if (b.dataset.act === "ini-tema") { const c = cuenta(), a = b.dataset.a, ar = catPorNombre(a, c); if (!ar) return;
    const xs = menciones(c, 30).filter(m => sinTema(m) && areaDe(m) === a), hay = xs.map(m => m.notas.map(n => n.hay).join(" ")).join(" ");
    const terms = [...new Set(ar.t.map(k => (hay.match(new RegExp("(^|[^a-z0-9])(" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[a-z]*)")) || [])[2]).filter(Boolean))].filter(t => !GENERICAS.has(norm(t)));  // las palabras genéricas atraparían notas de más
    if (!terms.length) return;
    const t = T(a, "Agenda", terms, territorio(c).slice(0, 40)); c.temas.push({...t, ...puntaje(t)}); save(); render(true);
    toast(`Ahora sigues «${a}» como tema, con: ${terms.join(", ")}. Puedes ajustarlo en Ajustes.`); }
});

/* Menciones */
function itemHtml(m){
  const temas = [...m.temas.values()], resp = respondida(m.g), nr = noResp(m.g);
  const otros = m.notas.filter(n => n !== m.lead).map(n => n.url ? `<a class="ext" href="${esc(n.url)}" target="_blank" rel="noopener">${esc(nomMedio(n))}</a>` : esc(nomMedio(n)));
  return `<article class="item ${resp?"resp":(m.critico?"cri":"")}">
    <div class="meta">${pillTono(m.tono)}${m.grave ? '<span class="pill grave">Hecho grave</span>' : ""}${resp?'<span class="pill done">Respondida</span>':""}${nr && !resp ? `<span class="pill done" title="${esc(NO_RESP[nr.k] || "")}">No responder</span>` : ""}<span>${esc(medioN(m.lead))}</span><span>·</span><span title="${fecha(m.lead.ts)}">${ago(m.lead.ts)}</span>${m.notas.length>1?`<span>·</span><span>en ${m.notas.length} medios</span>`:""}</div>
    ${fichaHtml(m)}
    <h4>${m.lead.url ? `<a class="ext" href="${esc(m.lead.url)}" target="_blank" rel="noopener">${esc(m.lead.t)}<span class="sr"> (abre el medio en otra pestaña)</span></a>` : esc(m.lead.t)}</h4>
    <p class="res">${esc(m.lead.res)}</p>
    <details><summary>¿Por qué aparece?</summary><p>${temas.map(x => `Tema <b>${esc(x.tema.nombre)}</b>: contiene «${[...x.found].map(esc).join("», «")}»${x.enTitulo?" en el titular":""}.`).join(" ")}${otros.length?` También la publicaron ${otros.join(", ")}.`:""}</p></details>
    ${correccionHtml(m)}
    <div class="acts">${resp ? `<button class="btn sm" data-act="responder" data-g="${m.g}" data-from="menciones">Ver respuesta</button>` : `<button class="btn ${m.critico?"primary":""} sm" data-act="responder" data-g="${m.g}" data-from="menciones">Responder</button>`}${m.tono === "cri" && !resp && !nr ? noRespHtml(m) : ""}<button class="btn ghost sm" data-act="vocero" data-g="${m.g}">${ri("mic")} Vocería</button><button class="btn ghost sm" data-act="fp" data-g="${m.g}">No corresponde</button>${m.notas.some(n => n.captura) ? `<button class="btn ghost sm" data-act="cap-del" data-g="${m.g}">Quitar lo que agregué</button>` : ""}</div>
  </article>`;
}
function vMenciones(){
  const c = cuenta(); c.visto = true; save();
  let base = menciones(c, Number(tState.dias));
  // Autoridad: por defecto, solo lo que la nombra; su territorio y todo, a un toque.
  const alc = esAut(c) ? (tState.alc || "sobre") : "todo", nSobre = sobreCuenta(base, c).length, nTerr = delTerritorio(base, c).length;
  if (alc === "sobre") base = sobreCuenta(base, c); else if (alc === "terr") base = delTerritorio(base, c);
  if (tState.tema !== "todos") base = base.filter(m => m.temas.has(tState.tema));
  if (tState.q.trim()) { const q = norm(tState.q); base = base.filter(m => m.notas.some(n => n.hay.includes(q))); }
  if (tState.llego != null) base = base.filter(m => escalera(m.notas).max === Number(tState.llego));
  if (tState.medio != null) base = base.filter(m => m.notas.some(n => String(n.m) === String(tState.medio)));
  if (tState.fcat) base = base.filter(m => categoriaDe(m, c).k === tState.fcat);
  if (tState.fenf) base = base.filter(m => enfoqueDe(m).k === tState.fenf);
  if (tState.fpap) base = base.filter(m => papelDe(m).k === tState.fpap);
  if (tState.fprio) base = base.filter(m => fichaDe(m, c).prio === tState.fprio);
  if (tState.fcomp) base = base.filter(m => fichaDe(m, c).comp === tState.fcomp);
  const cnt = k => k === "todos" ? base.length : base.filter(m => m.tono === k).length;
  const ms = tState.tono === "todos" ? base : base.filter(m => m.tono === tState.tono);
  const fps = Object.keys(S.fp).filter(k => k.startsWith(S.org+":")).length;
  const activos = (tState.tema!=="todos") + (tState.tono!=="todos") + !!tState.q.trim() + (tState.llego != null) + (tState.medio != null) + !!tState.fcat + !!tState.fenf + !!tState.fpap + !!tState.fprio + !!tState.fcomp;
  const chipsX = (tState.llego != null ? `<button class="btn sm fchip" data-act="f-x" data-k="llego" aria-label="Quitar filtro: ${esc(["Solo prensa comunal","Llegó a prensa regional","Llegó a prensa nacional"][tState.llego])}">${esc(["Solo prensa comunal","Llegó a prensa regional","Llegó a prensa nacional"][tState.llego])} ✕</button>` : "") + (tState.medio != null && MED[tState.medio] ? `<button class="btn sm fchip" data-act="f-x" data-k="medio" aria-label="Quitar filtro: ${esc(MED[tState.medio].n)}">${esc(MED[tState.medio].n)} ✕</button>` : "");
  let html = "", last = "";
  ms.forEach(m => { const d = dia(m.last); if (d !== last) { html += `<h3 class="day">${d}</h3>`; last = d; } html += itemHtml(m); });
  return `<div class="head"><div><h2 tabindex="-1">Menciones</h2><p>Cada noticia aparece una vez aunque la publiquen varios medios. El resumen es propio; el texto del medio no se reproduce.</p></div><button class="btn alt" type="button" data-act="cap-open"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Agregar publicación</button></div>
  ${esAut(c) ? `<div class="seg alc" role="group" aria-label="Qué noticias ver">${[["sobre", "Sobre " + c.perfil.nombre, nSobre], ["terr", "Su territorio", nTerr], ["todo", "Todas", nSobre + nTerr]].map(([k, l, n]) => `<button data-act="f-alc" data-k="${k}" aria-pressed="${alc === k}">${esc(l)}<span class="c">${n}</span></button>`).join("")}</div>` : ""}
  <div class="filters">
    <div class="seg" role="group" aria-label="Tono">${["todos","cri","neu","pos"].map(k => `<button data-act="f-tono" data-k="${k}" aria-pressed="${tState.tono===k}">${k==="todos"?"Todas":tonoPl[k]}<span class="c">${cnt(k)}</span></button>`).join("")}</div>
    
    <select id="fTema" aria-label="Tema"><option value="todos">Todos los temas</option>${c.temas.filter(t=>t.activo).map(t => `<option value="${t.id}" ${tState.tema===t.id?"selected":""}>${esc(t.nombre)}</option>`).join("")}</select>
    <select id="fPrio" aria-label="Prioridad"><option value="">Prioridad</option>${Object.entries(PRIORIDADES).map(([k, n]) => `<option value="${k}" ${tState.fprio === k ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>
    <select id="fComp" aria-label="Competencia"><option value="">Competencia</option>${Object.entries(COMPETENCIAS).map(([k, n]) => `<option value="${k}" ${tState.fcomp === k ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>
    <select id="fCat" aria-label="Categoría"><option value="">Categoría</option>${catsDe(c).concat([CAT_OTROS]).map(x => `<option value="${x.k}" ${tState.fcat === x.k ? "selected" : ""}>${esc(x.n)}</option>`).join("")}</select>
    <select id="fEnf" aria-label="Enfoque"><option value="">Enfoque</option>${ENF_NOTA.map(x => `<option value="${x.k}" ${tState.fenf === x.k ? "selected" : ""}>${esc(x.n)}</option>`).join("")}</select>
    <select id="fPap" aria-label="${esAut() ? "Papel de la autoridad" : "Papel del municipio"}"><option value="">${esAut() ? "Cualquier papel de la autoridad" : "Cualquier papel del municipio"}</option>${Object.entries(PAPELES).map(([k, n]) => `<option value="${k}" ${tState.fpap === k ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>
    <input id="fQ" type="search" placeholder="Buscar una palabra" value="${esc(tState.q)}" aria-label="Buscar en las menciones">
  </div>
  <div class="active" aria-live="polite"><span>${ms.length} ${ms.length===1?"noticia":"noticias"}</span>${chipsX}${activos?`<button class="btn ghost sm" data-act="f-reset">Quitar filtros</button>`:""}${fps?`<span>· ${fps} marcadas como “no corresponde”</span><button class="btn ghost sm" data-act="fp-reset">Restaurar</button>`:""}</div>
  <div class="feed">${html || `<div class="card"><b>No hay noticias con estos filtros.</b><p class="muted" style="margin:4px 0 0">Prueba con un período más largo o <button class="btn ghost sm" data-act="f-reset">quita los filtros</button>.</p></div>`}</div>`;
}

/* Configuración › Prioridades: plazos por tipo de cliente, competencias del cargo (para validar) y correcciones del equipo. */
function vPrioridades(){
  const c = cuenta(), pl = plazosDe(c), base = PLAZOS[tipoCliente(c)], mat = MATRIZ[rolDe(c)] || MATRIZ.municipio, cors = Object.entries(c.correcciones || {}).sort((a, b) => b[1].ts - a[1].ts);
  const etq = {a: "área", e: "encuadre", p: "papel", im: "impulsor", prio: "prioridad", acc: "acción"}, nom = {a: AREAS, e: ENCUADRES, p: PAPELES_F, im: IMPULSORES, prio: PRIORIDADES, acc: Object.fromEntries(Object.entries(ACCIONES).map(([k, v]) => [k, v[0]]))};
  return `<div class="head"><div><h2 tabindex="-1">Prioridades</h2><p>Cómo decide PregonIA qué es urgente para ${esc(inst())}: plazos de respuesta, qué áreas son de su competencia y lo que el equipo ha corregido.</p></div></div>
  ${subtabs()}
  <section class="card"><h3>Plazos de respuesta · ${esc(base.n)}</h3><p class="hint" style="margin:0 0 10px">Corren desde la última publicación del hecho. P4 se revisa una vez por semana.</p>
    <div class="plazos">${["P1", "P2", "P3"].map(k => `<label>${esc(PRIORIDADES[k])}<span><input type="number" min="1" max="720" step="1" data-plazo="${k}" value="${pl[k]}" aria-label="Plazo de ${esc(PRIORIDADES[k])} en horas"> horas</span><small>Base del cargo: ${base[k]} h</small></label>`).join("")}</div></section>
  <section class="card" style="margin-top:14px"><h3>Competencias del cargo</h3><p class="hint" style="margin:0 0 10px">Borrador por validar. Define qué le corresponde resolver a la cuenta en cada área; de esto dependen la prioridad y la acción sugerida. Un cambio rige para todas las noticias del área.</p>
    <table class="mtab comp"><thead><tr><th>Área</th><th>Competencia</th></tr></thead><tbody>${Object.entries(AREAS).map(([k, n]) => { const v = competenciaDe(k, c); return `<tr><td>${esc(n)}${v !== mat[k] ? ' <span class="rev ok">Ajustada</span>' : ""}</td><td><select data-comp="${k}" aria-label="Competencia en ${esc(n)}">${["P", "C", "I", "A"].map(x => `<option value="${x}" ${v === x ? "selected" : ""}>${esc(COMPETENCIAS[x])}</option>`).join("")}</select></td></tr>`; }).join("")}</tbody></table>
    <button class="btn ghost sm" type="button" data-act="prio-reset" style="margin-top:10px">Volver a los valores base del cargo</button></section>
  <section class="card" style="margin-top:14px"><h3>Correcciones del equipo<span class="c">${cors.length}</span></h3><p class="hint" style="margin:0 0 10px">${PILOTO && PILOTO.activo ? "Las 12 más recientes entran como criterio para la IA en cada lectura." : "En el piloto, las 12 más recientes entran como criterio para la IA en cada lectura."}</p>
    ${cors.length ? `<ul class="cors">${cors.slice(0, 30).map(([g, x]) => `<li><b>${esc(x.t || "Noticia")}</b><span>${Object.keys(etq).filter(k => x[k]).map(k => `${etq[k]}: ${esc(nom[k][x[k]] || x[k])}`).join(" · ")} · ${fecha(x.ts)}</span><button class="btn ghost sm" type="button" data-act="cor-del" data-g="${esc(g)}">Quitar</button></li>`).join("")}</ul>` : `<p class="empty">Aún no hay correcciones. Se hacen desde «Corregir ficha», en cada noticia de Menciones.</p>`}</section>`;
}
/* Configuración */
function subtabs(){ const k = route(); return `<div class="subtabs" role="navigation" aria-label="Configuración">${CONFIG.map(([key,n]) => `<a href="#${key}" ${key===k?'aria-current="page"':""}>${n}</a>`).join("")}</div>`; }
function chipEd(t, k, label, hint, limit){
  const all = t[k], showAll = tState.ctxAll[t.id + k] || !limit || all.length <= limit, list = showAll ? all : all.slice(0, limit);
  return `<div class="field"><span class="lbl" id="l-${t.id}-${k}">${label}</span>
  <div class="chips" role="group" aria-labelledby="l-${t.id}-${k}">${list.map((v,i) => `<span class="chip ${k==="exclusiones"?"ex":""}">${esc(v)}<button data-act="chip-del" data-tema="${t.id}" data-k="${k}" data-i="${i}" aria-label="Quitar ${esc(v)}">×</button></span>`).join("")}${!showAll?`<button class="btn ghost sm" data-act="ctx-all" data-key="${t.id+k}">+${all.length - limit} más</button>`:""}<input data-chipin="${t.id}:${k}" placeholder="Escribe y presiona Enter" aria-label="Agregar a ${label}"></div>
  <small>${hint}</small></div>`;
}
/* Cobertura de los temas: qué parte de lo publicado en 30 días calza con al menos un tema propio (no solo con el nombre de la cuenta).
   Si es baja, el tono, los temas y los avisos se apoyan en pocas noticias. */
function coberturaTemas(c){
  const ms = menciones(c, 30); if (!ms.length) return "";
  const fuera = ms.filter(sinTema), dentro = ms.length - fuera.length, p = pct(dentro, ms.length), k = p >= 70 ? "pos" : p >= 50 ? "neu" : "cri";
  const grupos = {}; fuera.forEach(m => { const a = areaDe(m) || "Otros asuntos"; (grupos[a] = grupos[a] || []).push(m); });
  const filas = Object.entries(grupos).sort((a, b) => b[1].length - a[1].length).map(([a, xs]) => `<li><span class="ini-dn">${esc(a)}<small>${esc(xs[0].lead.t)}${xs.length > 1 ? ` y ${xs.length - 1} más` : ""}</small></span><span class="mono">${xs.length}</span>${catPorNombre(a) ? `<button class="btn sm" data-act="ini-tema" data-a="${esc(a)}">Seguir como tema</button>` : `<span></span>`}</li>`).join("");
  return `<section class="card cob" aria-labelledby="cobT"><div class="cob-h"><div><h3 id="cobT">Cobertura de tus temas</h3><p class="cob-v"><span class="mono ${k}">${p}%</span> de lo publicado en 30 días calza con algún tema propio (${dentro} de ${plural(ms.length, "noticia", "noticias")}).</p></div></div>
    <p class="ini-para"><b>Para qué sirve:</b> indica qué parte de la prensa lee PregonIA con tus temas. Si es baja, el tono por tema, los cambios y los avisos se apoyan en pocas noticias, y conviene sumar temas.</p>
    <p class="ini-quien"><b>Quién lo usa:</b> quien administra la cuenta${esAut() ? "" : " en el municipio"}.</p>
    ${fuera.length ? `<p class="cob-s">Las ${fuera.length} restantes solo nombran ${esAut() ? "a la autoridad o su territorio" : "a la comuna, la municipalidad o el alcalde"}. Por área:</p><ul class="cob-l">${filas}</ul>` : ""}</section>`;
}
/* Categorías del cargo: el set fijo con que se clasifica toda la prensa de la cuenta, sin consumir temas del plan. */
function categoriasCard(c){
  const ms = menciones(c, 30); if (!ms.length) return "";
  const cs = catsDe(c).concat([CAT_OTROS]), por = new Map(cs.map(x => [x.k, []])); ms.forEach(m => por.get(categoriaDe(m, c).k).push(m));
  const otros = por.get("otros").length, p = pct(ms.length - otros, ms.length), k = p >= 95 ? "pos" : p >= 85 ? "neu" : "cri", cargo = esAut() ? cargoCuenta().toLowerCase() : "municipio";
  const filas = cs.map(x => { const xs = por.get(x.k), X = metricas(xs); if (!xs.length && x.k === "otros") return "";
    return `<li><button class="cat-f" data-act="goto" data-dias="30" data-fcat="${x.k}" ${xs.length ? "" : "disabled"}><span class="ini-dn">${esc(x.n)}<small>${x.r.length ? "Responde: " + esc(x.r.join(" · ")) : "No calza con ninguna categoría del cargo"}</small></span>
      <span class="cat-s">${xs.length ? segbar([{l: "Críticas", v: X.cri, c: "var(--cri)"}, {l: "Neutras", v: X.neu, c: "var(--neu)"}, {l: "Positivas", v: X.pos, c: "var(--pos)"}]) : ""}</span><span class="mono">${xs.length}</span></button></li>`; }).join("");
  return `<section class="card cob" aria-labelledby="catT"><div class="cob-h"><div><h3 id="catT">Categorías de ${esc(cargo)}</h3><p class="cob-v"><span class="mono ${k}">${p}%</span> de lo publicado en 30 días cae en una categoría del cargo${otros ? ` (${plural(otros, "noticia queda", "noticias quedan")} en «Otros asuntos»)` : ""}.</p></div></div>
    <p class="ini-para"><b>Para qué sirve:</b> ordena toda la prensa de la cuenta con un set fijo pensado para ${esAut() ? "este cargo" : "un municipio"}, y no gasta temas del plan. Cada noticia lleva además su enfoque (gestión, reclamo, emergencia, probidad, política, judicial u opinión) y el papel ${esAut() ? "de la autoridad" : "del municipio"} en ella. Los temas de abajo son seguimientos finos con avisos.</p>
    <p class="ini-quien"><b>Quién lo usa:</b> quien administra la cuenta, para revisar que la prensa quede bien leída; toca una categoría para ver sus noticias.</p>
    <ul class="cob-l cat-l">${filas}</ul></section>`;
}
function vTemas(){
  const c = cuenta(), pl = PLANES[c.perfil.plan], act = c.temas.filter(t => t.activo).length;
  return `<div class="head"><div><h2 tabindex="-1">Mis temas</h2><p>Usas ${act} de los ${pl.temas} temas del plan ${pl.nombre}. Abre un tema para ajustar qué palabras lo activan; el conteo se actualiza al instante.</p></div><a class="btn" href="#asistente">Rehacer con el asistente</a></div>
  ${subtabs()}
  ${categoriasCard(c)}
  ${coberturaTemas(c)}
  <div class="feed">${c.temas.map(t => { const p = puntaje(t), open = !!tState.open[t.id]; return `<div class="tema">
    <div class="top"><div><span class="origin">${esc(t.origen)}</span><h4>${esc(t.nombre)}</h4></div><span class="cnt muted" style="font-size:12.5px"><b class="mono" style="color:var(--ink)">${p.vol}</b> noticias en 30 días${p.cri?` · <span style="color:var(--cri)">${p.cri} críticas</span>`:""}</span><button class="btn sm" data-act="tema-open" data-id="${t.id}" aria-expanded="${open}">${open?"Cerrar":"Editar"}</button></div>
    ${open ? `<div class="body">
      ${chipEd(t, "terminos", "Palabras que activan el tema", "Basta con que una aparezca. No distingue tildes ni mayúsculas.")}
      ${chipEd(t, "exclusiones", "Excluir si aparece", "Úsalo para homónimos: otra ciudad, una película, un equipo.")}
      ${chipEd(t, "contexto", "Y además debe mencionar (opcional)", "Exige al menos una de estas palabras. Vacío: no se exige nada.", 10)}
      ${t.origen !== "Núcleo" ? `<div><button class="btn ghost sm" data-act="quitar" data-id="${t.id}">Quitar este tema</button></div>` : ""}
    </div>` : ""}</div>`; }).join("")}</div>
  ${c.sugeridos.length ? `<h3 style="font-family:var(--f-display);font-size:19px;margin:26px 0 4px">Temas sugeridos</h3><p class="muted" style="margin:0 0 10px">Ya aparecen en las noticias de ${esc(S.org)}. Se suman en paquetes de 5 por ${clp(49000)} al mes.</p>
  <div class="prop">${c.sugeridos.map((t,i) => `<div class="prow sug"><span class="num">+${i+1}</span><div><b>${esc(t.nombre)}</b><div class="muted" style="font-size:12px">${t.vol} noticias en 30 días${t.cri?` · ${t.cri} críticas`:""}</div></div><button class="btn sm" data-act="addsug" data-id="${t.id}">Agregar</button></div>`).join("")}</div>` : ""}`;
}
let propuesta = null;
function vAsistente(){
  const p = cuenta().perfil;
  return `<div class="head"><div><h2 tabindex="-1">Asistente de temas</h2><p>Cinco preguntas. Con tus respuestas y lo publicado en los últimos 30 días, PregonIA propone qué seguir. Nada cambia hasta que lo confirmes.</p></div></div>
  ${subtabs()}
  <form id="carForm" class="card form" novalidate>
    ${esAut() ? `<div class="field span2"><label>1. Cuenta</label><p style="margin:0"><b>${esc(inst())}</b> · ${esc(p.zonaNombre)}${p.partido ? " · " + esc(p.partido) : ""}</p><small>Para cambiar de autoridad usa «Entrar con otra cuenta» en el encabezado.</small></div>` : `<div class="field"><label for="cTipo">1. ¿Quién usará la cuenta?</label><select id="cTipo"><option ${p.tipo==="Municipio"?"selected":""}>Municipio</option><option ${p.tipo==="Autoridad electa"?"selected":""}>Autoridad electa</option></select></div>`}
    <div class="field"><label for="cPlan">2. ¿Qué plan?</label><select id="cPlan">${Object.entries(PLANES).map(([k,v]) => `<option value="${k}" ${p.plan===k?"selected":""}>${v.nombre}: ${v.temas} temas, ${clp(v.precio)} al mes</option>`).join("")}</select></div>
    ${esAut() ? "" : `<div class="field"><label for="cAut">3. Nombre de la autoridad principal <span class="muted">(opcional)</span></label><input id="cAut" value="${esc(p.autoridad)}" placeholder="Ej.: nombre y apellido del alcalde"><small>Solo personas en su rol público.</small></div>`}
    <div class="field"><label for="cAg">${esAut() ? "3. Proyectos, comisiones o causas que impulsa" : "4. Proyectos u obras con nombre propio"}</label><input id="cAg" value="${esc(p.agenda.join(", "))}" placeholder="${esAut() ? "Ej.: ley de humedales, comisión de Salud, Ruta 68" : "Ej.: Polideportivo, Plan regulador"}"><small>Sepáralos con comas.</small></div>
    <fieldset class="field span2"><legend>${esAut() ? "4. ¿Qué temas son sensibles hoy en su territorio?" : "5. ¿Qué temas son sensibles hoy en la comuna?"}</legend><div class="checks">${Object.entries(ejesDe(esAut() ? p : {...p, comuna: S.org})).map(([k,s]) => `<label><input type="checkbox" name="sens" value="${k}" ${p.sens.includes(k)?"checked":""}> ${esc(s.n)}</label>`).join("")}</div><small>${(pt => pt ? `Adaptados a ${esAut() ? esc(p.zonaNombre) : esc(S.org)}: ${esc(pt.charAt(0).toLowerCase() + pt.slice(1))}. ` : "")(perfilTerritorial(esAut() ? p : {...p, comuna: S.org}))}Los que marques tienen prioridad; el resto entra solo si ya aparece en las noticias.</small></fieldset>
    <div class="span2"><button class="btn primary" type="submit">Ver propuesta</button></div>
  </form>
  <div id="propOut" style="margin-top:16px">${propuesta ? propHtml() : ""}</div>`;
}
function propHtml(){
  const pl = PLANES[propuesta.perfil.plan];
  return `<div class="card" style="display:grid;gap:12px" tabindex="-1" id="propCard"><div><h3 style="margin:0;font-family:var(--f-display);font-size:19px">Propuesta: ${pl.temas} temas para ${esc(propuesta.perfil.comuna)}</h3><p class="muted" style="margin:4px 0 0">Los tres primeros son fijos. El resto se ordena por cuánto aparecen, cuántas noticias críticas tienen y lo que marcaste como sensible.</p></div>
  <div class="prop">${propuesta.base.map((t,i) => `<div class="prow"><span class="num">${i+1}</span><div><b>${esc(t.nombre)}</b><div class="muted" style="font-size:12px"><span class="origin">${esc(t.origen)}</span> · ${t.vol} noticias en 30 días${t.cri?` · ${t.cri} críticas`:""}</div></div></div>`).join("")}</div>
  ${propuesta.sugeridos.length ? `<p class="muted" style="margin:0;font-size:12.5px">Quedan como sugeridos para más adelante: ${propuesta.sugeridos.map(t => esc(t.nombre)).join(", ")}.</p>` : ""}
  <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" data-act="activar">Usar estos temas</button><button class="btn" data-act="descartar">Descartar</button></div></div>`;
}
function vFuentes(){
  // Las cuentas de Facebook e Instagram tienen un estado vivo (lectura automática, pendiente de Meta, captura asistida o error): src/redes.js.
  const f = tState.fuente, est = m => esRed(m) ? estadoRed(m) : {k: m.e, l: null, o: m.o};
  const todas = CATALOG.filter(m => m.e !== "retirado"), redes = todas.filter(esRed), web = todas.filter(m => !esRed(m) && m.a !== "institucional" && m.t !== "Otro medio");
  const rows = todas.filter(m => (f.a==="todos"||m.a===f.a) && (f.e==="todos" || (f.e==="redes" ? esRed(m) : !esRed(m) && m.e===f.e)));
  const cnt = k => todas.filter(m => !esRed(m) && m.e===k).length;
  const lbl = {listo:"Listo", requiere_ajuste:"Requiere ajuste", restringido:"Restringido", captura_asistida:"Captura asistida"};
  const met = {rss:"RSS", sitemap_noticias:"Sitemap de noticias", sitemap:"Sitemap", sitemap_mensual:"Sitemap mensual", portada:"Portada", google_news:"Google News", rss_filtrado:"RSS filtrado", sitemap_filtrado:"Sitemap filtrado", facebook:"Facebook", instagram:"Instagram"};
  const nIg = redes.filter(m => m.m === "instagram").length, nFb = redes.length - nIg;
  return `<div class="head"><div><h2 tabindex="-1">Fuentes</h2><p>Los ${web.length} medios web que PregonIA lee y cómo se lee cada uno (verificado el 3 de noviembre de 2026), más ${plural(redes.length, "cuenta", "cuentas")} de medios en redes sociales (${nIg} de Instagram y ${nFb} de Facebook). Los restringidos se consultan solo vía Google News. Las cuentas de redes se leen solas cuando hay un lector conectado; si no, sus publicaciones se agregan con Agregar publicación.</p></div>
    ${puedeInscribir() ? `<button class="btn alt" type="button" data-act="red-abrir">Inscribir cuenta de red social</button>` : ""}</div>
  ${subtabs()}
  <div class="filters">
    <div class="seg" role="group" aria-label="Estado">${[["todos","Todos",todas.length],["listo","Listos",cnt("listo")],["requiere_ajuste","Requieren ajuste",cnt("requiere_ajuste")],["restringido","Restringidos",cnt("restringido")],["redes","Redes sociales",redes.length]].map(([v,l,n]) => `<button data-act="f-est" data-k="${v}" aria-pressed="${f.e===v}">${l}<span class="c">${n}</span></button>`).join("")}</div>
    <div class="seg" role="group" aria-label="Ámbito">${[["todos","Todos"],["nacional","Nacional"],["regional","Regional"],["local","Local"],["institucional","Institucional"]].map(([v,l]) => `<button data-act="f-amb" data-k="${v}" aria-pressed="${f.a===v}">${l}</button>`).join("")}</div>
  </div>
  <div class="card scroll" style="padding:0"><table class="ftab"><thead><tr><th>Medio</th><th>Ámbito</th><th>Comuna</th><th>Lectura</th><th>Estado</th></tr></thead><tbody>${rows.map(m => { const e = est(m); return `<tr><td class="fm"><b>${esc(m.n)}</b>${e.o?`<div class="muted" style="font-size:12px">${esc(e.o)}</div>`:""}${esRed(m) && redRetirable(m) ? `<div><button class="btn ghost sm" type="button" data-act="red-retirar" data-id="${m.id}">Retirar</button></div>` : ""}</td><td data-l="Ámbito">${m.a}</td><td data-l="Comuna">${esc((m.c||"").replace(/;/g, ", ")) || '<span class="muted">—</span>'}</td><td data-l="Lectura">${met[m.m]||m.m}${esRed(m) && m.usr ? `<div><a class="muted" style="font-size:12px" href="${esc(m.u)}" target="_blank" rel="noopener">${/^\d+$/.test(m.usr) ? "perfil " + esc(m.usr) : "@" + esc(m.usr)}</a></div>` : ""}</td><td data-l="Estado"><span class="pill e-${e.k}">${esc(e.l || lbl[e.k] || e.k)}</span></td></tr>`; }).join("")}</tbody></table></div>`;
}

/* Reportes: cada resultado se lee como gráfico y como cifra */
const RI = {
  sig:'<path d="M9 6l6 6-6 6"/>', x:'<path d="M6 6l12 12M18 6L6 18"/>',
  cri:'<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.4h.01"/>',
  pos:'<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16.2 9.6"/>',
  neu:'<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
  noticias:'<path d="M4 5h13v14H6a2 2 0 0 1-2-2z"/><path d="M17 9h3v8a2 2 0 0 1-2 2M8 9h5M8 12.5h5M8 16h3"/>',
  clima:'<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/><path d="M12 9v7"/>',
  alcance:'<path d="M4.9 19.1a10 10 0 0 1 0-14.2M19.1 4.9a10 10 0 0 1 0 14.2M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4"/><circle cx="12" cy="12" r="1.5"/>',
  propaga:'<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.9l7.6-3.8M8.2 13.1l7.6 3.8"/>',
  reloj:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin:'<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  rank:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3"/>',
  cal:'<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  up:'<path d="M12 19V5M6 11l6-6 6 6"/>', down:'<path d="M12 5v14M6 13l6 6 6-6"/>', flat:'<path d="M5 12h14"/>',
  mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>',
  ok:'<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16.2 9.6"/>', espera:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
};
const ri = (k, cls="") => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${RI[k]}</svg>`;
const tonoCol = {cri:"var(--cri)", neu:"var(--neu)", pos:"var(--pos)"};
const AMB = [["nacional","Nacional","var(--amb-n)"],["regional","Regional","var(--amb-r)"],["local","Local","var(--amb-l)"],["institucional","Institucional","var(--neu)"]];
const ambCol = a => (AMB.find(x => x[0] === a) || AMB[2])[2];
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;

const tipAttr = s => `data-tip="${esc(s)}"`;
function tile({icon, tone="", label, value, unit="", delta="", sub="", viz=""}){
  return `<div class="tile"><div class="top"><span class="chipi ${tone}">${ri(icon)}</span><span class="lb">${label}</span></div><div class="big">${value}${unit?`<small>${unit}</small>`:""}</div>${delta}${viz}${sub?`<div class="sub">${sub}</div>`:""}</div>`;
}
function deltaHtml(cur, prev, upGood, period="vs. 15 días anteriores"){
  if (!prev && !cur) return `<span class="delta">${ri("flat")} Sin variación ${period}</span>`;
  const d = cur - prev, cls = d === 0 ? "" : ((d > 0) === upGood ? "up-good" : (upGood === null ? "" : "up-bad"));
  const txt = prev ? (d > 0 ? "+" : "") + Math.round(d / prev * 100) + "%" : (d > 0 ? "+" + d : String(d));
  return `<span class="delta ${cls}">${ri(d > 0 ? "up" : d < 0 ? "down" : "flat")} ${d === 0 ? "Igual" : txt} ${period}</span>`;
}
function deltaVer(Mr, Ma){ const a = veredicto(Mr), b = veredicto(Ma); if (a.i < 0 || b.i < 0) return `<span class="delta">${ri("flat")} Sin datos para comparar quincenas</span>`; if (a.i === b.i) return `<span class="delta">${ri("flat")} Igual que la quincena anterior</span>`; const mejor = a.i < b.i; return `<span class="delta">${ri(mejor ? "up" : "down")} ${mejor ? "Mejoró" : "Empeoró"} desde ${b.n.toLowerCase()}</span>`; }
function deltaPts(cur, prev){ const d = cur - prev; return `<span class="delta ${d>0?"up-good":d<0?"up-bad":""}">${ri(d > 0 ? "up" : d < 0 ? "down" : "flat")} ${d === 0 ? "Igual" : (d > 0 ? "+" : "−") + Math.abs(d) + " pts"} vs. quincena anterior</span>`; }
function serieDias(ms, n = 30){ const a = Array(n).fill(0); ms.forEach(m => { const d = Math.floor((NOW - m.last) / DAY); if (d < n) a[n-1-d]++; }); return a; }
function sparkline(vals){
  const W = 200, H = 40, max = Math.max(1, ...vals), x = i => 2 + i * (W - 6) / (vals.length - 1), y = v => H - 4 - (H - 10) * v / max;
  const pts = vals.map((v,i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const li = vals.length - 1;
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Tendencia de 30 días"><polygon points="2,${H-4} ${pts} ${x(li)},${H-4}" fill="var(--accent)" fill-opacity=".1"/><polyline points="${pts}" fill="none" stroke="var(--neu-ink)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/><circle cx="${x(li)}" cy="${y(vals[li])}" r="4" fill="var(--accent)" stroke="var(--surface)" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
}
function escala(i){ const n = ["Muy desfavorable","Desfavorable","Equilibrada","Favorable","Muy favorable"]; return `<div class="vscale" role="img" aria-label="Nivel: ${i < 0 ? "sin datos" : VER[i][1]}">${n.map((x,j) => `<span class="${4 - j === i ? "on" : ""}" ${tipAttr(x)}></span>`).join("")}</div><div class="scale"><span>En contra</span><span>Equilibrada</span><span>A favor</span></div>`; }
function segbar(parts, tall){ const tot = parts.reduce((s,p) => s + p.v, 0) || 1; return `<div class="segbar ${tall?"tall":""}" role="img" aria-label="${esc(parts.map(p => p.l + ": " + p.v).join(", "))}">${parts.filter(p => p.v).map(p => `<span style="flex:${p.v};background:${p.c}" ${tipAttr(p.l + ": " + p.v + " (" + pct(p.v, tot) + "%)")}></span>`).join("")}</div>`; }
function keys(parts){ return `<div class="keys">${parts.map(p => `<span><i style="background:${p.c}"></i>${p.l} <b>${p.v}</b></span>`).join("")}</div>`; }
function climaHtml(M){ const v = veredicto(M), k = v.k === "pos" ? "up" : v.k === "cri" ? "down" : "flat"; return `<span class="clima">${ri(k)}${v.c}</span>`; }
function ambitos(ms){ const r = {nacional:0, regional:0, local:0, institucional:0}; ms.forEach(m => m.notas.forEach(n => r[MED[n.m].a] = (r[MED[n.m].a]||0) + 1)); return r; }

function chartDias(ms, n = 30){
  const W = 720, H = 200, L = 30, B = 26, top = 10;
  const days = Array.from({length:n}, (_,i) => ({pos:0, neu:0, cri:0, d: n-1-i}));
  ms.forEach(m => { const d = Math.floor((NOW - m.last)/DAY); if (d < n) days[n-1-d][m.tono]++; });
  const max = Math.max(3, ...days.map(x => x.pos+x.neu+x.cri)), step = Math.ceil(max/3), ymax = step*3, slot = (W-L-8)/n, bw = Math.min(16, slot - 4);
  const y = v => top + (H-top-B) * (1 - v/ymax);
  let g = "";
  for (let v = 0; v <= ymax; v += step) g += `<line x1="${L}" x2="${W-4}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L-6}" y="${y(v)+3}" text-anchor="end">${v}</text>`;
  days.forEach((x,i) => {
    const X = L + 4 + i*slot + (slot - bw)/2, dt = new Date(NOW - x.d*DAY), lbl = dt.toLocaleDateString("es-CL", {weekday:"short", day:"numeric", month:"short"});
    const tot = x.pos + x.neu + x.cri; let acc = 0; const segs = [["pos","url(#pat-pos)"],["neu","var(--neu)"],["cri","var(--cri)"]].filter(([k]) => x[k]);
    segs.forEach(([k,col], j) => { const y1 = y(acc + x[k]) + (j ? 0 : 0), y0 = y(acc) - (acc ? 2 : 0), h = Math.max(1, y0 - y1), last = j === segs.length - 1;
      g += last ? `<path d="M${X},${y0} V${y1+4} Q${X},${y1} ${X+4},${y1} H${X+bw-4} Q${X+bw},${y1} ${X+bw},${y1+4} V${y0} Z" fill="${col}"/>` : `<rect x="${X}" y="${y1}" width="${bw}" height="${h}" fill="${col}"/>`; acc += x[k]; });
    if (i % 5 === 4 || i === n-1) g += `<text x="${X + bw/2}" y="${H-8}" text-anchor="middle">${dt.getDate()}/${dt.getMonth()+1}</text>`;
    g += `<rect class="hit" x="${L + 4 + i*slot}" y="${top}" width="${slot}" height="${H-top-B}" ${tipAttr(`${lbl}: ${tot ? [x.cri && plural(x.cri,"crítica","críticas"), x.neu && plural(x.neu,"neutra","neutras"), x.pos && plural(x.pos,"positiva","positivas")].filter(Boolean).join(", ") : "sin noticias"}`)}/>`;
  });
  return `<div class="scroll"><svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" style="min-width:420px" role="img" aria-label="Noticias por día y tono, últimos ${n} días">${g}</svg></div><div class="legend"><span><i style="background:var(--cri)"></i>Críticas</span><span><i style="background:var(--neu)"></i>Neutras</span><span><i style="background:var(--pos)"></i>Positivas</span></div>`;
}

/* Informes por lector. El nivel del medio (comunal, regional, nacional) no es un informe:
   es un dato de cada asunto, "hasta dónde llegó". */
const REPS = [
  ["alcalde","Parte del alcalde",{para:"Alcalde", cuando:"Lunes, 8:00 · semanal", lectura:"2 minutos, en el celular", responde:"¿Cómo me trató la prensa, qué se puede complicar y qué hago?"}],
  ["diario","Informe diario",{para:"Alcalde, equipo directivo y comunicaciones", cuando:"Todos los días, 8:00", lectura:"3 minutos los indicadores; el clipping, como respaldo", responde:"¿Qué se publicó sobre la comuna, con qué tono y dónde está cada nota?"}],
  ["mesa","Mesa de comunicaciones",{para:"Encargado(a) de comunicaciones", cuando:"Todos los días, 8:30", lectura:"10 a 15 minutos", responde:"¿Qué respondo hoy, qué está escalando y qué difundo?"}],
  ["gestion","Informe de gestión",{para:"Alcalde y equipo directivo", cuando:"Primer lunes del mes", lectura:"15 minutos, en reunión de equipo", responde:"¿Cómo se percibe la gestión, por tema, y cómo estamos frente a las comunas vecinas?"}],
  ["calendario","Calendario de riesgos",{para:"Comunicaciones, alcalde y directores", cuando:"Revisión mensual y antes de cada fecha", lectura:"5 minutos", responde:"¿Qué se viene, qué suele estallar y qué tenemos listo?"}],
  ["crisis","Episodio crítico",{para:"Alcalde y comunicaciones", cuando:"Se activa solo ante una noticia crítica", lectura:"5 minutos", responde:"¿Cómo se propagó y qué hacemos ahora?"}]
];
function vReportes(){
  if (!REPS.some(r => r[0] === tState.rep)) tState.rep = "alcalde";
  const cur = REPS.find(r => r[0] === tState.rep), p = repMeta(cur[0], cur[2]);
  return `<div class="head"><div><h2 tabindex="-1">Reportes</h2><p>Un informe por lector. Cada uno responde una sola pregunta, con el nivel de detalle que esa persona necesita.</p></div></div>
  <div class="tabs" role="tablist">${REPS.map(([k,n]) => `<button role="tab" aria-selected="${tState.rep===k}" data-act="rep" data-k="${k}">${esAut() && k === "alcalde" ? "Parte semanal" : k === "alcalde" && cuenta().perfil.g === "F" && cuenta().perfil.autoridad ? "Parte de la alcaldesa" : n}</button>`).join("")}</div>
  <dl class="para"><div><dt>Para</dt><dd>${p.para}</dd></div><div><dt>Cuándo</dt><dd>${p.cuando}</dd></div><div><dt>Lectura</dt><dd>${p.lectura}</dd></div><div class="q"><dt>Responde</dt><dd>${p.responde}</dd></div></dl>
  ${({alcalde:repAlcalde, diario:repDiario, mesa:repMesa, gestion:repGestion, crisis:repCrisis, calendario:repCalendario})[tState.rep]()}`;
}
/* Para una autoridad, los lectores de cada informe son la autoridad y su equipo, no el alcalde. */
function repMeta(k, p){
  if (!esAut()) return p;
  const c = cargoCuenta(), m = {alcalde: {para: c}, diario: {para: c + " y su equipo de prensa"}, mesa: {para: "Jefatura de prensa", responde: "¿Qué respondo hoy, qué está escalando y qué difundo?"}, gestion: {para: c + " y su equipo", responde: "¿Cómo se percibe su trabajo, por tema, y cómo está frente a sus pares?"}, crisis: {para: c + " y jefatura de prensa"}, calendario: {para: c + " y su equipo"}}[k] || {};
  return {...p, ...m, responde: (m.responde || p.responde).replace("¿Cómo me trató la prensa", "¿Cómo le trató la prensa")};
}
const muestra = n => n < 20 ? `<p class="note" style="margin-top:14px">Muestra pequeña (${plural(n,"noticia","noticias")}): las proporciones pueden cambiar mucho con pocas notas nuevas.</p>` : "";

/* Hasta dónde llegó: comunal → regional → nacional */
const NIVS = [["local","Comunal"],["regional","Regional"],["nacional","Nacional"]];
const nivIdx = a => a === "nacional" ? 2 : a === "regional" ? 1 : 0;
function escalera(notas){
  const ord = notas.slice().sort((a,b) => a.ts - b.ts), r = NIVS.map(([k,l]) => ({k, l, n:0, first:null}));
  ord.forEach(n => { const x = r[nivIdx(MED[n.m].a)]; x.n++; if (x.first === null) x.first = n.ts; });
  const max = r.reduce((s,x,i) => x.n ? i : s, -1), inicio = ord.length ? nivIdx(MED[ord[0].m].a) : -1;
  return {r, max, inicio, subio: max > inicio};
}
const llego = e => e.max < 0 ? "Sin noticias" : ["Solo prensa comunal","Llegó a prensa regional","Llegó a prensa nacional"][e.max];
const hora = ts => new Date(ts).toLocaleString("es-CL", {day:"numeric", month:"short", hour:"2-digit", minute:"2-digit", hourCycle:"h23"});
function escHtml(e, big){
  const tip = e.r.map(x => x.l + ": " + (x.n ? plural(x.n,"nota","notas") + " desde " + hora(x.first) : "sin notas")).join(" · ");
  return `<span class="esc" role="img" aria-label="${esc(llego(e) + ". " + tip)}" ${tipAttr(tip)}><span class="sig" aria-hidden="true">${e.r.map((x,i) => `<i class="${i <= e.max ? "on" : ""}"></i>`).join("")}</span><span>${llego(e)}</span>${big ? `<span class="cts">${e.r.map(x => x.l + " " + x.n).join(" · ")}</span>` : ""}</span>`;
}
const ruta = e => e.r.filter(x => x.n).sort((a,b) => a.first - b.first).map(x => x.l + " " + hora(x.first)).join(" → ");

/* Quién se hace cargo */
/* Área de una noticia: su categoría del cargo (src/categorias.js), o null si no calza con ninguna. */
function areaDe(m){ const x = categoriaDe(m); return x.k === "otros" ? null : x.n; }
const temaDe = m => [...m.temas.values()].map(x => x.tema.nombre).filter(n => !/\((comuna|territorio)\)$/.test(n))[0] || "General";
function riesgo(m){ const e = escalera(m.notas); return (m.tono === "cri" ? 10 : m.grave ? 7 : m.tono === "neu" ? 2 : 0) * (1 + e.max) + m.notas.length + (atendida(m.g) ? -6 : 0) + (NOW - m.last < 2*DAY ? 2 : 0); }
function accion(m){
  if (esAut()) return accionAut(m);
  const e = escalera(m.notas), cat = categoriaDe(m), area = cat.r.length ? cat.r.join(" · ") : null; let a, r;
  if (m.tono === "cri") {
    if (respondida(m.g)) { a = "La respuesta ya está aprobada. Seguir el tema y avisar si aparece en otro medio."; r = ["Comunicaciones"]; }
    else if (e.max === 2) { a = "Vocería del alcalde hoy, con datos oficiales y una sola versión."; r = ["Alcalde","Comunicaciones",area]; }
    else if (e.max === 1) { a = "Declaración institucional antes de que el tema llegue a medios nacionales."; r = ["Comunicaciones",area]; }
    else { a = "Responder en el medio comunal y contactar a los vecinos afectados."; r = [area || "Dirección del área","Comunicaciones"]; }
  } else if (m.tono === "neu") { a = "Preparar información para los vecinos en los canales municipales, por si el tema crece."; r = ["Comunicaciones",area]; }
  else { a = e.max === 0 ? "Llevarla a medios regionales: hasta ahora solo la publicó la prensa comunal." : "Difundirla en redes municipales y usarla en la próxima vocería."; r = ["Comunicaciones",area]; }
  return {a, r: [...new Set(r.filter(Boolean).join(" · ").split(" · "))].join(" · ")};
}
/* Para una autoridad, la acción depende de si la noticia la nombra o solo ocurre en su territorio. */
function accionAut(m){
  const e = escalera(m.notas), propia = [...m.temas.values()].some(x => x.tema.persona); let a, r;
  if (m.tono === "cri") {
    if (respondida(m.g)) { a = "La respuesta ya está aprobada. Seguir el tema y avisar si aparece en otro medio."; r = ["Prensa"]; }
    else if (!propia) { a = "Ocurre en su territorio y no la nombra: gestionar con el municipio o el servicio a cargo y, si hay avance, comunicar la gestión."; r = ["Equipo territorial", "Prensa"]; }
    else if (e.max === 2) { a = "Vocería hoy, con una sola versión y datos, antes de que otros fijen la lectura."; r = [cargoCuenta(), "Jefatura de prensa"]; }
    else if (e.max === 1) { a = "Declaración breve y publicación en redes antes de que el tema llegue a medios nacionales."; r = ["Prensa", cargoCuenta()]; }
    else { a = "Responder en el mismo medio y conversar con quienes reclaman en el territorio."; r = ["Equipo territorial", "Prensa"]; }
  } else if (m.tono === "neu") { a = propia ? "Seguir el tema y tener una posición lista por si le consultan." : "Seguir el tema: puede convertirse en una gestión o una consulta de vecinos."; r = ["Prensa", "Equipo territorial"]; }
  else { a = propia ? (e.max === 0 ? "Llevarla a medios regionales y amplificarla en redes." : "Amplificarla en redes y usarla en la próxima entrevista.") : "Sumarse con un reconocimiento si corresponde a su agenda."; r = ["Prensa"]; }
  // Responsables propios de la categoría (por ejemplo, Equipo legislativo o Gestión de emergencias), sin repetir y en un máximo de tres.
  const cat = categoriaDe(m), rc = cat.r.map(x => /^(Concejal o concejala|Consejero o consejera)$/.test(x) ? cargoCuenta() : x);
  return {a, r: [...new Set(r.concat(rc).filter(Boolean))].slice(0, 3).join(" · ")};
}
const enMedios = m => { const k = new Set(m.notas.map(n => n.m)).size; return esc(nomMedio(m.lead)) + (k > 1 ? ` y ${k - 1} ${k === 2 ? "medio más" : "medios más"}` : ""); };
const rango = (d0, d1) => new Date(d0).toLocaleDateString("es-CL",{day:"numeric", month:"short"}) + " al " + new Date(d1).toLocaleDateString("es-CL",{day:"numeric", month:"short", year:"numeric"});

/* 1. Parte del alcalde: semanal, una pantalla */
/* El parte sigue el período elegido arriba (24 horas, semana o 30 días) y se compara con el período anterior de igual largo. */
const PER_PARTE = {
  1: {sust: "24 horas", tx: "en las últimas 24 horas", ant: "las 24 horas anteriores", de: "de las últimas 24 horas", rotulo: "Parte de 24 horas"},
  7: {sust: "semana", tx: "esta semana", ant: "la semana anterior", de: "de la semana", rotulo: "Parte semanal"},
  30: {sust: "30 días", tx: "en los últimos 30 días", ant: "los 30 días anteriores", de: "de los últimos 30 días", rotulo: "Parte de 30 días"}};
function partePer(){ const dias = [1, 7, 30].includes(Number(tState.dias)) ? Number(tState.dias) : 7; return {dias, ...PER_PARTE[dias]}; }
function parteData(){
  // Autoridad: el parte habla de lo que la nombra; su territorio queda en el radar de Inicio.
  const P = partePer(), all = sobreCuenta(menciones(cuenta(), 2 * P.dias)), sem = all.filter(m => NOW - m.last < P.dias*DAY), ant = all.filter(m => NOW - m.last >= P.dias*DAY);
  const M = metricas(sem), Ma = metricas(ant), v = veredicto(M), va = veredicto(Ma);
  const cand = sem.filter(m => m.tono !== "pos").sort((a,b) => riesgo(b) - riesgo(a)), asuntos = [], vistos = new Set();
  cand.forEach(m => { if (asuntos.length < 3 && riesgo(m) >= 4 && (m.tono === "cri" || m.grave) && !vistos.has(categoriaDe(m).k)) { asuntos.push(m); vistos.add(categoriaDe(m).k); } });
  cand.forEach(m => { if (asuntos.length < 3 && !asuntos.includes(m) && riesgo(m) >= 12) asuntos.push(m); });
  const buena = sem.filter(m => m.tono === "pos").sort((a,b) => escalera(b.notas).max - escalera(a.notas).max || b.notas.length - a.notas.length)[0];
  const comp = va.i < 0 ? `No hay datos de ${P.ant} para comparar.` : va.i === v.i ? `Igual que en ${P.ant}.` : `En ${P.ant} fue ${va.n.toLowerCase()}: ${v.i < va.i ? "mejoró" : "empeoró"}.`;
  // Tratamiento de las noticias: hasta dónde llegaron, si las críticas se respondieron y qué temas restan o suman (alcance ponderado por tamaño del medio).
  const E = new Map(sem.map(m => [m.g, escalera(m.notas)])), niv = [0, 1, 2].map(i => { const xs = sem.filter(m => E.get(m.g).max === i); return {n: xs.length, cri: xs.filter(m => m.tono === "cri").length}; });
  const cris = sem.filter(m => exigeRespuesta(m)), resp = cris.filter(m => atendida(m.g)).length;
  const impG = {}; sem.forEach(m => { const k = temaLectura(m), x = impG[k] = impG[k] || {k, cri: 0, pos: 0, neu: 0, n: 0, c: {pos: 0, neu: 0, cri: 0}}; x[m.tono] += m.alcance; x.c[m.tono]++; x.n++; });
  const imp = Object.values(impG).map(x => ({...x, bal: x.pos - x.cri})).sort((a, b) => (b.cri + b.pos) - (a.cri + a.pos) || b.n - a.n);
  return {P, sem, M, v, comp, asuntos, buena, niv, criTot: cris.length, resp, imp, per: rango(NOW - (P.dias === 1 ? 1 : P.dias - 1)*DAY, NOW)};
}
function repAlcalde(){
  const d = parteData(), P = d.P;
  if (!d.sem.length) return `<div class="allgood">${ri("ok")} Ningún medio publicó sobre ${esc(S.org)} ${P.tx}.</div>`;
  const item = (m, i) => { const e = escalera(m.notas), ac = accion(m); return `<li class="${m.tono}"><span class="n">${i + 1}</span><div class="bd"><span class="kick">${esc(categoriaDe(m).n)} · ${m.grave ? "Hecho grave" : tonoLbl[m.tono]}${respondida(m.g) ? " · respondida" : noResp(m.g) ? " · se decidió no responder" : ""}</span><b class="t">${esc(m.lead.res)}</b><span class="sub">${enMedios(m)} · ${ago(m.last)}</span><div class="lleg">${escHtml(e)}</div><p class="acc"><b>Qué hacer</b>${ac.a}</p><p class="rsp"><b>Responsable</b>${ac.r}</p></div></li>`; };
  return `<div class="rhead"><h3>${esc(S.org)} · ${P.rotulo.toLowerCase()}</h3><span class="per">${ri("cal")} ${d.per}</span></div>
  <div class="parte">
    <section class="ver"><span class="kick">Cómo ${esAut() && cuenta().perfil.g === "F" ? "la" : "lo"} trató la prensa ${P.tx}</span><p class="vbig ${d.v.k}">${d.v.n}</p><p class="vtx">${d.v.f.charAt(0).toUpperCase() + d.v.f.slice(1)}: ${conteo(d.M)}. ${d.comp}</p>${escala(d.v.i)}<p class="vtx trato">Hasta dónde llegaron: ${d.niv[2].n} a prensa nacional, ${d.niv[1].n} a regional y ${d.niv[0].n} solo comunal. ${d.criTot ? `Críticas atendidas: ${d.resp} de ${d.criTot}.` : "Sin críticas que exigieran respuesta."}</p></section>
    <section><h4>Lo que se puede complicar</h4>${d.asuntos.length ? `<ol class="asuntos">${d.asuntos.map(item).join("")}</ol>` : `<p class="vtx">Ningún asunto de riesgo ${P.tx}.</p>`}</section>
    ${d.buena ? `<section class="cap"><h4>Para aprovechar</h4><ol class="asuntos">${item(d.buena, -1).replace('<span class="n">0</span>', `<span class="n">${ri("pos")}</span>`)}</ol></section>` : ""}
    <div class="acts"><button class="btn alt" data-act="vid-open"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.2v5.6l4.8-2.8z"/></svg>Video resumen</button><button class="btn primary" data-act="copiar-parte">Copiar texto</button><button class="btn" data-act="goto" data-tono="todos" data-dias="${P.dias}">Ver las noticias ${P.de}</button></div>
    ${shareBar("parte")}
  </div>
  ${muestra(d.M.vol)}`;
}
function parteTexto(){
  const d = parteData(), P = d.P, L = [`*PregonIA · ${P.rotulo} · ${S.org}*`, d.per, "", `*Prensa ${P.de}: ${d.v.n.toLowerCase()}.* ${conteo(d.M)}. ${d.comp}`, `Hasta dónde llegaron: ${d.niv[2].n} a prensa nacional, ${d.niv[1].n} a regional y ${d.niv[0].n} solo comunal.${d.criTot ? ` Críticas atendidas: ${d.resp} de ${d.criTot}.` : ""}`, ""];
  if (d.asuntos.length) { L.push("*Lo que se puede complicar*"); d.asuntos.forEach((m, i) => { const ac = accion(m); L.push(`${i + 1}. ${m.lead.res} (${llego(escalera(m.notas)).toLowerCase()})`, `   Qué hacer: ${ac.a}`, `   Responsable: ${ac.r}`); }); L.push(""); }
  if (d.buena) { const ac = accion(d.buena); L.push("*Para aprovechar*", `${d.buena.lead.res}`, `   ${ac.a}`); }
  return L.join("\n");
}

/* 2. Mesa de comunicaciones: diaria, para operar */
function repMesa(){
  const c = cuenta(), m30 = sobreCuenta(menciones(c), c), m7 = m30.filter(m => NOW - m.last < 7*DAY), hoy = m30.filter(m => NOW - m.last < DAY);
  const porResp = m7.filter(m => exigeRespuesta(m, c) && !atendida(m.g)).sort((a,b) => escalera(b.notas).max - escalera(a.notas).max || b.last - a.last);
  const subiendo = m7.filter(m => escalera(m.notas).subio).sort((a,b) => b.last - a.last);
  const difundir = m30.filter(m => m.tono === "pos" && NOW - m.last < 14*DAY && escalera(m.notas).max < 2 && !respondida(m.g)).sort((a,b) => escalera(a.notas).max - escalera(b.notas).max || b.last - a.last);
  const md = {}; m30.forEach(m => m.notas.forEach(n => { const x = md[n.m] ||= {n:0, cri:0, pos:0}; x.n++; if (n.tono === "cri") x.cri++; if (n.tono === "pos") x.pos++; }));
  const medios = Object.entries(md).sort((a,b) => nivIdx(MED[a[0]].a) - nivIdx(MED[b[0]].a) || b[1].n - a[1].n).slice(0, 10);
  const cola = colaDecisiones(menciones(c).filter(m => NOW - m.last < 7*DAY));
  const li = (m, btn, extra = "") => `<li><span class="kick">${esc(temaDe(m))} · ${tonoLbl[m.tono]}</span><b>${esc(m.lead.res)}</b><span class="sub">${enMedios(m)} · ${ago(m.last)}</span>${escHtml(escalera(m.notas))}${extra}${btn ? `<button class="btn sm" style="justify-self:start" data-act="responder" data-g="${m.g}" data-from="reportes">${btn}</button>` : ""}</li>`;
  const vacio = t => `<p class="empty">${t}</p>`;
  return `<div class="rhead"><h3>${esc(S.org)} · mesa de comunicaciones</h3><span class="per">${ri("cal")} ${new Date(NOW).toLocaleDateString("es-CL",{weekday:"long", day:"numeric", month:"long"})}</span></div>
  <div class="rgrid r4">
    ${tile({icon:"cri", tone: porResp.length ? "cri" : "", label:"Por responder", value: porResp.length, sub:"críticas de los últimos 7 días sin respuesta aprobada"})}
    ${tile({icon:"propaga", label:"Subiendo de nivel", value: subiendo.length, sub:"empezaron en un medio menor y ya llegaron a otro mayor"})}
    ${tile({icon:"pos", tone:"pos", label:"Para difundir", value: difundir.length, sub:"buenas noticias que aún no llegan a la prensa nacional"})}
    ${tile({icon:"noticias", label:"Publicadas en 24 horas", value: hoy.reduce((s,m) => s + m.notas.filter(n => NOW - n.ts < DAY).length, 0), sub:"notas nuevas sobre los temas monitoreados"})}
  </div>
  <section class="card grp" style="margin-top:14px"><h4>${ri("cri")} Cola de decisiones<span class="c">${cola.length}</span></h4><p class="hint" style="margin:0 0 8px">Ordenada por prioridad y plazo. Cada hecho trae la acción sugerida; si no corresponde, corrige su ficha en Menciones.</p>
    ${cola.length ? `<ul class="cola">${cola.slice(0, 10).map(({m, f}) => `<li><span class="kick"><span class="pill ${PRIO_CLS[f.prio]} prio">${PRIORIDADES[f.prio]}</span> ${esc(AREAS[f.area])} · ${esc(COMPETENCIAS[f.comp])}${venceTxt(f) ? ` · <span class="${f.vence < Date.now() ? "venc" : ""}">${venceTxt(f)}</span>` : ""}</span><b>${esc(m.lead.res)}</b><span class="sub">${enMedios(m)} · ${ago(m.last)}</span><p class="acc sm accion-${f.acc}"><b>${esc(ACCIONES[f.acc][0])}</b>${esc(ACCIONES[f.acc][1])}</p>${["responder", "aclarar", "aportar", "amplificar"].includes(f.acc) ? `<button class="btn sm" style="justify-self:start" data-act="responder" data-g="${m.g}" data-from="reportes">${f.acc === "amplificar" ? "Preparar comunicado" : "Preparar respuesta"}</button>` : ""}</li>`).join("")}</ul>${cola.length > 10 ? `<button class="btn ghost sm" data-act="goto" data-dias="7">Ver las ${cola.length} en Menciones</button>` : ""}` : vacio("Nada exige una decisión del equipo en los últimos 7 días.")}</section>
  <div class="rgrid r21" style="margin-top:14px">
    <section class="card grp"><h4>${ri("cri")} Por responder hoy<span class="c">${porResp.length}</span></h4>${porResp.length ? `<ul class="cola">${porResp.map(m => li(m, "Preparar respuesta", `<p class="acc sm"><b>Sugerido</b>${accion(m).a}</p>`)).join("")}</ul>` : vacio("No hay críticas pendientes de respuesta.")}</section>
    <section class="card grp"><h4>${ri("up")} Subiendo de nivel<span class="c">${subiendo.length}</span></h4>${subiendo.length ? `<ul class="cola">${subiendo.map(m => li(m, null, `<span class="sub">Recorrido: ${ruta(escalera(m.notas))}</span>`)).join("")}</ul>` : vacio("Ningún tema pasó de la prensa comunal a la regional o nacional esta semana.")}
      <p class="hint" style="margin:10px 0 0">Mientras un tema está en la prensa comunal todavía se puede contener con una respuesta directa.</p></section>
  </div>
  <div class="rgrid r21" style="margin-top:14px">
    <section class="card grp"><h4>${ri("pos")} Buenas noticias para difundir<span class="c">${difundir.length}</span></h4>${difundir.length ? `<ul class="cola">${difundir.slice(0,4).map(m => li(m, "Preparar comunicado")).join("")}</ul>${difundir.length > 4 ? `<button class="btn ghost sm" data-act="goto" data-tono="pos" data-dias="30">Ver las ${difundir.length} en Menciones</button>` : ""}` : vacio("No hay buenas noticias pendientes de difusión en las últimas dos semanas.")}</section>
    <section class="card"><h3>A quién llamar</h3><p class="hint" style="margin:0 0 8px">Medios que publicaron sobre ${esc(S.org)} en 30 días. Los comunales primero: son los que se pueden contactar directamente.</p>
      <table class="mtab"><thead><tr><th>Medio</th><th>Nivel</th><th class="num">Notas</th><th class="num">Crít.</th></tr></thead><tbody>${medios.map(([id,x]) => `<tr><td>${esc(MED[id].n)}</td><td>${NIVS[nivIdx(MED[id].a)][1]}</td><td class="num">${x.n}</td><td class="num">${x.cri}</td></tr>`).join("")}</tbody></table>
      <p class="hint" style="margin:10px 0 0">En producción se agrega la firma de cada nota, para saber qué periodista cubre la comuna.</p></section>
  </div>`;
}

/* 2b. Informe diario: indicadores del período y clipping agrupado por mención, con el enlace a cada publicación (trazabilidad) */
const PERIODOS = [["24h","Últimas 24 h"],["hoy","Hoy"],["ayer","Ayer"]];
const fechaLarga = ts => new Date(ts).toLocaleDateString("es-CL", {weekday: "long", day: "numeric", month: "long"});
const horaHM = ts => new Date(ts).toLocaleTimeString("es-CL", {hour: "2-digit", minute: "2-digit", hourCycle: "h23"});
const NIVLBL = {local: "Comunal", regional: "Regional", nacional: "Nacional", institucional: "Institucional"};
function rangoDiario(k){
  const h = new Date(NOW); h.setHours(0, 0, 0, 0); const hoy = h.getTime();
  if (k === "hoy") return [hoy, NOW + 1, "Hoy, " + fechaLarga(NOW) + ", hasta las " + horaHM(NOW)];
  if (k === "ayer") return [hoy - DAY, hoy, "Ayer, " + fechaLarga(hoy - DAY)];
  return [NOW - DAY, NOW + 1, "Últimas 24 horas, hasta las " + horaHM(NOW) + " del " + fechaLarga(NOW)];
}
function diarioData(){
  const k = tState.dia || "24h", [d0, d1, etiqueta] = rangoDiario(k), largo = d1 - d0, en = (n, a, b) => n.ts >= a && n.ts < b;
  const todas = menciones(cuenta(), 32);
  const grupos = todas.map(m => ({m, pubs: m.notas.filter(n => en(n, d0, d1)).sort((x, y) => x.ts - y.ts)})).filter(x => x.pubs.length);
  const prev = todas.reduce((s, m) => s + m.notas.filter(n => en(n, d0 - largo, d0)).length, 0);
  const pubs = grupos.flatMap(x => x.pubs), M = metricas(grupos.map(x => x.m)), niv = {local: 0, regional: 0, nacional: 0}, medios = {}, temas = {};
  pubs.forEach(n => { niv[MED[n.m].a] = (niv[MED[n.m].a] || 0) + 1; medios[n.m] = (medios[n.m] || 0) + 1; });
  grupos.forEach(({m, pubs}) => { const x = temas[temaDe(m)] ||= {n: 0, cri: 0, pos: 0}; x.n += pubs.length; if (m.tono !== "neu") x[m.tono] += pubs.length; });
  const orden = {cri: 0, neu: 1, pos: 2};
  grupos.sort((a, b) => orden[a.m.tono] - orden[b.m.tono] || riesgo(b.m) - riesgo(a.m) || b.pubs.length - a.pubs.length);
  const f = new Date(d1 - 1), base = String(f.getDate()).padStart(2, "0") + String(f.getMonth() + 1).padStart(2, "0");
  grupos.forEach((x, i) => { x.ref = `D-${base}-${String(i + 1).padStart(2, "0")}`; x.antes = x.m.first < d0; });
  return {k, d0, d1, etiqueta, grupos, pubs, prev, M, v: veredicto(M), niv, medios: Object.entries(medios).sort((a, b) => b[1] - a[1]), temas: Object.entries(temas).sort((a, b) => b[1].n - a[1].n), sinResp: grupos.filter(x => x.m.tono === "cri" && !respondida(x.m.g)).length};
}
const difTxt = (cur, prev, flecha = true) => cur === prev ? "igual que el período anterior" : `${flecha ? (cur > prev ? "▲ " : "▼ ") : ""}${Math.abs(cur - prev)} ${cur > prev ? "más" : "menos"} que el período anterior`;
function repDiario(){
  const d = diarioData();
  const per = `<div class="seg" role="group" aria-label="Período del informe">${PERIODOS.map(([k, l]) => `<button data-act="dia" data-k="${k}" aria-pressed="${d.k === k}">${l}</button>`).join("")}</div>`;
  const head = `<div class="rhead"><h3>${esc(S.org)} · informe diario</h3><span class="per">${ri("cal")} ${esc(d.etiqueta)}</span></div><div class="diario-per">${per}</div>`;
  if (!d.pubs.length) return head + `<div class="allgood">${ri("ok")} Ningún medio publicó sobre ${esc(S.org)} en este período. ${d.prev ? `En el período anterior hubo ${plural(d.prev, "publicación", "publicaciones")}.` : ""}</div>`;
  const nMed = d.medios.length, maxT = Math.max(...d.temas.map(([, x]) => x.n)), maxN = Math.max(1, ...Object.values(d.niv));
  const barra = (n, max, cls = "") => `<span class="bar ${cls}" aria-hidden="true"><i style="width:${Math.round(n / max * 100)}%"></i></span>`;
  const pub = n => `<li><span class="mono hh">${horaHM(n.ts)}</span><span class="niv">${NIVLBL[MED[n.m].a] || ""}</span><span class="md">${esc(medioN(n))}</span><span class="tt">${n.url ? `<a class="ext" href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.t)}<span class="sr"> (abre la fuente)</span></a>` : `${esc(n.t)}<span class="nolink"> · nota de demostración, sin enlace</span>`}</span></li>`;
  const item = x => { const m = x.m, resp = respondida(m.g); return `<li class="clip-i ${m.tono}" id="clip-${esc(x.ref)}">
      <div class="clip-h"><span class="ref mono">${x.ref}</span>${pillTono(m.tono)}<span class="kick">${esc(temaDe(m))}</span>${resp ? '<span class="pill done">Respondida</span>' : ""}</div>
      <b class="clip-t">${esc(m.lead.res)}</b>
      <div class="clip-m">${escHtml(escalera(m.notas))}<span>${plural(x.pubs.length, "publicación", "publicaciones")} en el período${x.antes ? ` · viene desde el ${hora(m.first)}, en ${esc(MED[m.notas[0].m].n)}` : ""}</span></div>
      <ul class="clip-p">${x.pubs.map(pub).join("")}</ul>
      ${m.tono === "cri" && !resp ? `<div class="clip-a"><button class="btn sm primary" data-act="responder" data-g="${m.g}" data-from="reportes">Preparar respuesta</button></div>` : ""}
    </li>`; };
  return head + `
  <div class="rgrid r4 dk">
    ${tile({icon: "noticias", label: "Publicaciones", value: d.pubs.length, sub: difTxt(d.pubs.length, d.prev)})}
    ${tile({icon: "alcance", label: "Noticias distintas", value: d.grupos.length, sub: `publicadas por ${plural(nMed, "medio", "medios")}`})}
    ${tile({icon: d.v.k, tone: d.v.k, label: "Tono del período", value: `<span class="word ${d.v.k}">${d.v.n}</span>`, sub: conteo(d.M)})}
    ${tile({icon: "cri", tone: d.sinResp ? "cri" : "", label: "Críticas sin respuesta", value: d.sinResp, sub: "noticias críticas del período sin respuesta aprobada"})}
  </div>
  <div class="rgrid r3" style="margin-top:14px">
    <section class="card"><h3>Hasta dónde llegó</h3><table class="mtab dtab"><tbody>${["local", "regional", "nacional"].map(k => `<tr><td>Prensa ${NIVLBL[k].toLowerCase()}</td><td class="bc">${barra(d.niv[k] || 0, maxN)}</td><td class="num">${d.niv[k] || 0}</td></tr>`).join("")}</tbody></table><p class="hint" style="margin:8px 0 0">Publicaciones del período según el alcance del medio.</p></section>
    <section class="card"><h3>Temas</h3><table class="mtab dtab"><tbody>${d.temas.slice(0, 6).map(([n, x]) => `<tr><td>${esc(n)}${x.cri ? ` <span class="cri-n">${x.cri} crít.</span>` : ""}</td><td class="bc">${barra(x.n, maxT)}</td><td class="num">${x.n}</td></tr>`).join("")}</tbody></table></section>
    <section class="card"><h3>Medios que más publicaron</h3><table class="mtab dtab"><tbody>${d.medios.slice(0, 6).map(([id, n]) => `<tr><td>${esc(MED[id].n)} <span class="muted">· ${NIVLBL[MED[id].a] || ""}</span></td><td class="num">${n}</td></tr>`).join("")}</tbody></table></section>
  </div>
  <section class="card clip" style="margin-top:14px"><h3>Clipping · ${plural(d.grupos.length, "mención", "menciones")} · ${plural(d.pubs.length, "publicación", "publicaciones")}</h3>
    <p class="hint" style="margin:0 0 10px">Cada mención agrupa las publicaciones del mismo hecho. El código sirve para citarla; el titular lleva a la nota original. Primero lo crítico.</p>
    <ol class="clip-l">${d.grupos.map(item).join("")}</ol>
  </section>
  <div class="parte-sh">${shareBar("diario")}</div>
  <p class="note" style="margin-top:12px">${MODO.tipo !== "demo" ? "Hecho con noticias reales leídas de los medios del catálogo." : "En la demostración las notas no tienen enlace; con Noticias reales cada titular lleva a su fuente."} En el piloto, este informe llega solo cada mañana a las 8:00 por correo o WhatsApp.</p>`;
}
function diarioTexto(){
  const d = diarioData(), L = [`*PregonIA · Informe diario · ${S.org}*`, d.etiqueta, ""];
  if (!d.pubs.length) return L.concat([`Ningún medio publicó sobre ${S.org} en este período.`]).join("\n");
  L.push("*Indicadores*", `Publicaciones: ${d.pubs.length} (${difTxt(d.pubs.length, d.prev, false)})`, `Noticias distintas: ${d.grupos.length}, en ${plural(d.medios.length, "medio", "medios")}`, `Tono: ${d.v.n} (${conteo(d.M)})`, `Críticas sin respuesta: ${d.sinResp}`, `Alcance: comunal ${d.niv.local || 0} · regional ${d.niv.regional || 0} · nacional ${d.niv.nacional || 0}`, `Temas: ${d.temas.slice(0, 5).map(([n, x]) => `${n} (${x.n})`).join(", ")}`, "", "*Clipping*");
  d.grupos.forEach(x => { const m = x.m; L.push("", `*${x.ref} · ${tonoLbl[m.tono]} · ${temaDe(m)}*`, m.lead.res, `${llego(escalera(m.notas))}${respondida(m.g) ? " · respondida" : ""}`); x.pubs.forEach(n => { L.push(`  • ${horaHM(n.ts)} · ${medioN(n)} (${(NIVLBL[MED[n.m].a] || "").toLowerCase()}): ${n.t}`); if (n.url) L.push(`    ${n.url}`); }); });
  return L.join("\n");
}

/* 3. Informe de gestión: mensual, para el alcalde y su equipo */
let lecturaTxt = {};
const GP = () => { const d = Number(tState.dias) || 30; return {d, en: {1: "en las últimas 24 horas", 7: "en los últimos 7 días", 30: "en los últimos 30 días"}[d], del: {1: "de las últimas 24 horas", 7: "de la semana", 30: "del mes"}[d], este: {1: "en estas 24 horas", 7: "esta semana", 30: "este mes"}[d]}; };
function repGestion(){
  const P = GP(), c = cuenta(), ms = menciones(c, P.d), M = metricas(ms);
  if (!ms.length) return `<div class="allgood">Ningún medio publicó sobre ${esc(S.org)} ${P.en}.</div>`;
  const rec = ms.filter(m => NOW - m.last < P.d * DAY / 2), ant = ms.filter(m => NOW - m.last >= P.d * DAY / 2), Mr = metricas(rec), Ma = metricas(ant);
  const porTema = c.temas.filter(t => t.activo).map(t => { const sub = ms.filter(m => m.temas.has(t.id)); return {t, ...metricas(sub), e: escalera(sub.flatMap(m => m.notas))}; }).sort((a,b) => b.vol - a.vol);
  const esp = porTema.filter(x => !/\(comuna\)$/.test(x.t.nombre)), conDatos = esp.filter(x => x.vol);
  const topCri = esp.slice().sort((a,b) => b.cri - a.cri)[0], topPos = esp.slice().sort((a,b) => b.pos - a.pos)[0], nac = conDatos.filter(x => x.e.max === 2);
  const finds = [
    [veredicto(M).k, `La cobertura ${P.del} fue <b>${veredicto(M).n.toLowerCase()}</b>: ${veredicto(M).f}, con ${conteo(M)}.`],
    topCri && topCri.cri ? ["cri", `<b>${esc(topCri.t.nombre)}</b> concentró las críticas: ${topCri.cri} de ${M.cri}.`] : null,
    nac.length ? ["neu", `${nac.length === 1 ? "Un tema llegó" : nac.length + " temas llegaron"} a la prensa nacional: <b>${nac.map(x => esc(x.t.nombre)).join(", ")}</b>.`] : ["pos", `Ningún tema específico llegó a la prensa nacional ${P.este}.`],
    topPos && topPos.pos ? ["pos", `<b>${esc(topPos.t.nombre)}</b> aportó la mayor cobertura positiva (${plural(topPos.pos,"noticia","noticias")}).`] : null
  ].filter(Boolean);
  const maxSide = Math.max(1, ...porTema.map(x => Math.max(x.cri + x.neu/2, x.pos + x.neu/2))), w = v => (v / maxSide * 100).toFixed(2) + "%";
  const notas = ms.flatMap(m => m.notas.map(n => ({n, tono: n.tono}))).sort((a,b) => b.n.ts - a.n.ts);
  return `<div class="rhead"><h3>${esc(S.org)} · informe de gestión</h3><span class="per">${ri("cal")} ${rango(NOW - 29*DAY, NOW)}</span></div>
  <div class="card" style="margin-bottom:14px"><h3>Lo principal</h3><ul class="find">${finds.map(([k, t]) => `<li><span class="chipi ${k}">${ri(k)}</span><p>${t}</p></li>`).join("")}</ul></div>
  <div class="rgrid r4">
    ${tile({icon:"noticias", label:"Noticias", value:M.vol, delta: deltaHtml(Mr.vol, Ma.vol, null), viz: sparkline(serieDias(ms)), sub:"sin contar réplicas de la misma noticia"})}
    ${tile({icon:"clima", tone: veredicto(M).k === "neu" ? "" : veredicto(M).k, label:"Tono de la cobertura", value:`<span class="word">${veredicto(M).n}</span>`, delta: deltaVer(Mr, Ma), viz: escala(veredicto(M).i), sub: conteo(M)})}
    ${tile({icon:"alcance", label:"Temas en prensa nacional", value: nac.length, unit:"de " + conDatos.length, sub:`temas con noticias ${P.este} que llegaron a medios nacionales`})}
    ${tile({icon:"cri", tone:"cri", label:"Noticias críticas", value: M.cri, unit: pct(M.cri, M.vol) + "% del total", delta: deltaHtml(Mr.cri, Ma.cri, false), viz:`<div class="meter" ${tipAttr(M.cri + " de " + M.vol + " noticias")}><i style="width:${pct(M.cri, M.vol)}%"></i></div>`})}
  </div>
  <div class="card" style="margin-top:14px"><h3>Tono y alcance por tema</h3>
    <div class="div esd" role="table" aria-label="Tono y alcance por tema">
      <div class="hd" role="row"><span role="columnheader">Tema</span><span class="ax" role="columnheader"><span>← Críticas</span><span>Positivas →</span></span><span class="num" role="columnheader">Notic.</span><span class="num" role="columnheader">Balance</span><span role="columnheader">Hasta dónde llegó</span></div>
      ${porTema.map(x => `<div class="rw" role="row" tabindex="0" data-act="goto-tema" data-id="${x.t.id}" aria-label="${esc(x.t.nombre)}: ${x.vol} noticias, ${x.cri} críticas, ${x.pos} positivas, ${llego(x.e).toLowerCase()}">
        <span class="nm" role="cell">${esc(x.t.nombre)}</span>
        <span class="dbar" role="cell"><span class="L">${x.cri?`<span style="width:${w(x.cri)};background:var(--cri)" ${tipAttr(x.t.nombre + ": " + plural(x.cri,"crítica","críticas"))}></span>`:""}${x.neu?`<span style="width:${w(x.neu/2)};background:var(--neu)" ${tipAttr(x.t.nombre + ": " + plural(x.neu,"neutra","neutras"))}></span>`:""}</span><span class="R">${x.neu?`<span style="width:${w(x.neu/2)};background:var(--neu)" ${tipAttr(x.t.nombre + ": " + plural(x.neu,"neutra","neutras"))}></span>`:""}${x.pos?`<span style="width:${w(x.pos)};background:var(--pos)" ${tipAttr(x.t.nombre + ": " + plural(x.pos,"positiva","positivas"))}></span>`:""}</span></span>
        <span class="num" role="cell" data-l="Noticias">${x.vol}</span><span class="num" role="cell" data-l="Balance">${climaHtml(x)}</span><span role="cell" class="ll">${x.vol ? escHtml(x.e) : '<span class="sub">Sin noticias</span>'}</span></div>`).join("")}
    </div>
    <div class="legend" style="margin-top:10px"><span><i style="background:var(--cri)"></i>Críticas, a la izquierda</span><span><i style="background:var(--neu)"></i>Neutras, al centro</span><span><i style="background:var(--pos)"></i>Positivas, a la derecha</span><span><span class="sig" aria-hidden="true"><i class="on"></i><i class="on"></i><i></i></span>Hasta dónde llegó: comunal, regional, nacional</span></div>
  </div>
  <div class="rgrid r21" style="margin-top:14px">
    <div class="card"><h3>Noticias por día</h3>${chartDias(ms)}</div>
    ${esAut() ? paresAutCard() : paresCard()}
  </div>
  <div class="card" style="margin-top:14px;display:grid;gap:10px"><h3 style="margin:0">Lectura del analista</h3><p class="hint" style="margin:0">Redactada por IA con las cifras y los resúmenes ${P.del}. Revísala antes de usarla.</p>
    <div id="lectura" class="draft" style="min-height:90px">${esc(lecturaTxt.gestion || lecturaBase(M, porTema))}</div>
    <div><button class="btn primary" data-act="lectura">Redactar con IA</button></div></div>
  <details class="card resp" style="margin-top:14px"><summary>Respaldo: las ${notas.length} notas ${P.del}</summary>
    <div class="scroll"><table><thead><tr><th>Fecha</th><th>Medio</th><th>Nivel</th><th>Tono</th><th>Titular</th></tr></thead><tbody>${notas.map(({n}) => `<tr><td class="mono">${hora(n.ts)}</td><td>${esc(nomMedio(n))}</td><td>${NIVS[nivIdx(MED[n.m].a)][1]}</td><td>${tonoLbl[n.tono]}</td><td>${esc(n.t)}</td></tr>`).join("")}</tbody></table></div>
    <p class="hint" style="margin:10px 0 0">En producción cada fila enlaza a la nota original en el sitio del medio.</p></details>
  ${muestra(M.vol)}`;
}
function lecturaBase(M, porTema){
  const esp = porTema.filter(x => !/\(comuna\)$/.test(x.t.nombre)), top = esp.slice().sort((a,b) => b.vol - a.vol)[0], crit = esp.slice().sort((a,b) => b.cri - a.cri)[0];
  return `${S.org} sumó ${plural(M.vol, "noticia", "noticias")} ${GP().en.replace("en los últimos", "en").replace("en las últimas", "en")}, con una cobertura ${veredicto(M).n.toLowerCase()} (${conteo(M)}). El tema con más presencia fue ${top?top.t.nombre:"—"} y el que concentró más notas críticas fue ${crit&&crit.cri?crit.t.nombre + " (" + llego(crit.e).toLowerCase() + ")":"ninguno"}. Usa el botón para una lectura interpretativa con recomendaciones para el equipo.`;
}
function paresCard(){
  const pr = MODO && MODO.tipo === "real" && MODO.info && MODO.info.pares, pa = cuenta().perfil, prov = provinciaDe(S.org);
  if (pr && pr.length) return paresLista("Frente a los alcaldes de la provincia", pa.autoridad ? pa.autoridad.replace(/^Alcald(e|esa) /, "") : "Su alcalde", "la provincia de " + prov, pr);
  if (!COMUNAS.includes(S.org)) return `<div class="card"><h3>Frente a los alcaldes de la provincia</h3><p class="muted" style="margin:0">Con noticias reales, aquí se compara la presencia en prensa de ${esc(pa.autoridad || "su alcalde o alcaldesa")} con la de los demás alcaldes de la provincia de ${esc(prov)} en los últimos 14 días.</p></div>`;
  const rows = COMUNAS.map(c => ({c, ...metricas(menciones({temas:[genericaComuna(c)]}))})).map(r => ({...r, pc: pct(r.cri, r.vol)}));
  const tot = rows.reduce((s,r) => s + r.vol, 0) || 1, maxV = Math.max(1, ...rows.map(r => r.vol)), me = rows.find(r => r.c === S.org);
  const pos = rows.slice().sort((a,b) => b.vol - a.vol).indexOf(me) + 1, promPc = Math.round(rows.reduce((s,r) => s + r.pc, 0) / rows.length);
  return `<div class="card"><h3>Frente a las comunas vecinas</h3>
    <p class="vtx" style="margin:0 0 10px">${esc(S.org)} es la <b>${pos}.ª</b> comuna del litoral con más noticias. ${me.pc}% de sus noticias fueron críticas; el promedio de las seis es ${promPc}%.</p>
    <ul class="hbars">${rows.slice().sort((a,b) => b.vol - a.vol).map(r => `<li><span class="t"><i style="background:${r.c===S.org?"var(--accent)":"var(--amb-l)"}"></i><span>${r.c===S.org?"<b>"+esc(r.c)+"</b>":esc(r.c)}</span></span><span class="b" ${tipAttr(r.c + ": " + plural(r.vol,"noticia","noticias") + " · " + r.pc + "% críticas")}><i style="width:${r.vol/maxV*100}%;background:${r.c===S.org?"var(--accent)":"var(--amb-l)"}"></i></span><span class="v">${pct(r.vol,tot)}%</span></li>`).join("")}</ul>
    <p class="hint" style="margin:10px 0 0">Uso interno. Se calcula solo con noticias públicas de cada comuna.</p></div>`;
}

function propagacion(m){
  const W = 720, H = 220, L = 40, R = 20, B = 30, top = 30;
  const t0 = m.first, span = Math.max(1, (m.notas[m.notas.length-1].ts - t0) / 36e5), xmax = Math.max(1, Math.ceil(span));
  const x = h => L + (W - L - R) * h / xmax, ymax = Math.max(2, m.notas.length), y = v => top + (H - top - B) * (1 - v / ymax);
  let g = "", path = `M${x(0)},${y(0)}`;
  for (let v = 0; v <= ymax; v++) g += `<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L-8}" y="${y(v)+3}" text-anchor="end">${v}</text>`;
  const stepH = xmax <= 6 ? 1 : Math.ceil(xmax / 6);
  for (let h = 0; h <= xmax; h += stepH) g += `<text x="${x(h)}" y="${H-10}" text-anchor="middle">${h === 0 ? "inicio" : "+" + h + " h"}</text>`;
  m.notas.forEach((n, i) => { const h = (n.ts - t0) / 36e5; path += ` H${x(h)} V${y(i+1)}`; });
  path += ` H${x(xmax)}`;
  g += `<path d="${path}" fill="none" stroke="var(--cri)" stroke-width="2" stroke-linejoin="round"/>`;
  m.notas.forEach((n, i) => { const h = (n.ts - t0) / 36e5, cx = x(h), cy = y(i+1), md = MED[n.m];
    g += `<circle cx="${cx}" cy="${cy}" r="6" fill="${ambCol(md.a)}" stroke="var(--surface)" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="14" fill="transparent" ${tipAttr(`${md.n} (${md.a}) · ${new Date(n.ts).toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"})} · ${n.res}`)}/>`;
    if (i === 0 || i === m.notas.length - 1) { const last = i && i === m.notas.length - 1; g += `<text x="${cx + (last ? -12 : 12)}" y="${last ? cy + 20 : cy - 12}" text-anchor="${last ? "end" : "start"}" style="font-family:var(--f-body);font-size:11.5px;fill:var(--ink)">${esc(md.n.split(",")[0])}</text>`; } });
  return `<div class="scroll"><svg class="chart prop" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Medios acumulados que publicaron la noticia, por hora">${g}</svg></div><div class="legend">${AMB.map(([k,l,c]) => `<span><i style="background:${c};border-radius:50%"></i>Medio ${l.toLowerCase()}</span>`).join("")}<span><i style="background:var(--cri);height:2px;width:14px;border-radius:0"></i>Medios acumulados</span></div>`;
}
function repCrisis(){
  const ms = menciones(cuenta(), 7).filter(m => m.tono === "cri").sort((a,b) => b.notas.length - a.notas.length || b.last - a.last);
  if (!ms.length) return `<div class="allgood">${ri("ok")} No hubo episodios críticos en los últimos 7 días.</div>`;
  const m = ms[0], medios = new Set(m.notas.filter(n => n.ts - m.first < DAY).map(n => n.m)).size, resp = respondida(m.g);
  const hrs = Math.max(0, Math.round((m.last - m.first) / 36e5)), ambN = {nacional:0, regional:0, local:0, institucional:0}; m.notas.forEach(n => ambN[MED[n.m].a]++);
  const ambP = AMB.map(([k,l,c]) => ({l, v: ambN[k], c}));
  return `<div class="rhead"><h3 style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="pill ic t-cri">${ri("cri")} Episodio crítico</span>${resp?`<span class="pill ic done">${ri("ok")} Respondida</span>`:""}</h3><span class="per">${ri("cal")} ${fecha(m.first)}</span></div>
  <div class="card" style="margin-bottom:14px"><b style="font-size:17px;line-height:1.35;display:block">${esc(m.lead.t)}</b><p class="muted" style="margin:6px 0 0">${esc(m.lead.res)}</p></div>
  <div class="rgrid r4">
    ${tile({icon:"propaga", tone:"cri", label:"Medios en 24 horas", value: medios, sub: "publicaron la misma noticia"})}
    ${tile({icon:"reloj", label:"Duración de la propagación", value: hrs, unit: hrs === 1 ? "hora" : "horas", sub:"entre la primera y la última nota"})}
    ${tile({icon:"alcance", label:"Hasta dónde llegó", value:`<span class="word">${["Comunal","Regional","Nacional"][escalera(m.notas).max]}</span>`, viz: escHtml(escalera(m.notas), true), sub: ruta(escalera(m.notas))})}
    ${tile({icon: resp ? "ok" : "espera", tone: resp ? "pos" : "cri", label:"Respuesta del municipio", value: resp ? "Lista" : "Pendiente", sub: resp ? "borrador aprobado" : "aún sin respuesta aprobada"})}
  </div>
  <div class="card" style="margin-top:14px"><h3>Cómo se propagó</h3>${propagacion(m)}</div>
  <div class="rgrid r21" style="margin-top:14px">
    <div class="card"><h3>Cronología</h3><ol class="timeline">${m.notas.map(n => `<li><b>${fecha(n.ts)}</b> · ${n.url ? `<a class="ext" href="${esc(n.url)}" target="_blank" rel="noopener">${esc(medioN(n))}</a>` : esc(medioN(n))}<br><span class="muted">${esc(n.res)}</span></li>`).join("")}</ol></div>
    <div class="card" style="display:grid;gap:12px;align-content:start"><h3 style="margin:0">Qué hacer</h3><p class="note">Informa medidas concretas en las próximas horas, con una sola vocería y datos oficiales.</p><button class="btn primary" data-act="responder" data-g="${m.g}" data-from="reportes">${resp?"Ver respuesta":"Preparar respuesta"}</button><button class="btn" data-act="vocero" data-g="${m.g}">${ri("mic")} Kit de vocería</button>${ms.length>1?`<p class="hint" style="margin:0">Otros episodios de la semana: ${ms.slice(1,4).map(x => esc(x.lead.t)).join(" · ")}</p>`:""}</div>
  </div>`;
}
/* Tooltips compartidos */
(function(){
  const tip = document.getElementById("tip");
  const show = (el, x, y) => { tip.textContent = el.getAttribute("data-tip"); tip.hidden = false; const r = tip.getBoundingClientRect(); let L = x + 14, T = y + 14; if (L + r.width > innerWidth - 8) L = x - r.width - 14; if (T + r.height > innerHeight - 8) T = y - r.height - 14; tip.style.left = Math.max(8, L) + "px"; tip.style.top = Math.max(8, T) + "px"; };
  document.addEventListener("pointermove", e => { const el = e.target.closest && e.target.closest("[data-tip]"); if (el) show(el, e.clientX, e.clientY); else tip.hidden = true; });
  document.addEventListener("pointerleave", () => tip.hidden = true);
  document.addEventListener("scroll", () => tip.hidden = true, {passive: true});
})();

/* Comunicados */
const PIEZAS = {
  declaracion:["Declaración breve","2 a 4 frases para responder rápido","Declaración breve de 2 a 4 frases"],
  comunicado:["Comunicado de prensa","Titular, bajada y cuerpo","Comunicado de prensa (titular, bajada, cuerpo de 3 a 5 párrafos, datos de respaldo y contacto de prensa)"],
  aclaracion:["Aclaración al medio","Carta al director (Ley 19.733)","Carta al director solicitando aclaración o rectificación conforme a la Ley 19.733"],
  mensajes:["Mensajes clave","3 ideas para el vocero","Tres mensajes clave para el vocero, con dato de respaldo cada uno y frases a evitar"],
  preguntas:["Preguntas probables","Para una entrevista","Cinco preguntas probables de la prensa con respuestas sugeridas"],
  redes:["Publicación para redes","Texto breve para X, Instagram o Facebook","Publicación para redes sociales de la autoridad: un texto de máximo 600 caracteres, con una idea central, un dato y un llamado o compromiso concreto, sin hashtags innecesarios"],
  columna:["Columna de opinión","Para un medio regional","Columna de opinión de 450 a 600 palabras para un medio regional, firmada por la autoridad, con título, una tesis clara, dos o tres argumentos con datos y un cierre"],
  intervencion:["Minuta de intervención","Para sala, comisión o sesión","Minuta de intervención de 2 a 3 minutos para la sala, una comisión o una sesión: contexto, posición, dos argumentos con datos, propuesta o petición concreta y frase de cierre"],
  minuta:["Minuta interna","Una página para la autoridad","Minuta de una página para la autoridad: situación, cobertura, riesgos y opciones"]
};
const PIEZAS_MUNI = ["declaracion", "comunicado", "aclaracion", "mensajes", "preguntas", "minuta"], PIEZAS_AUT = ["declaracion", "redes", "columna", "intervencion", "comunicado", "aclaracion", "mensajes", "preguntas"];
const piezasDe = () => esAut() ? PIEZAS_AUT : PIEZAS_MUNI;
const ENFOQUES = {datos:"Responder con datos", aclarar:"Aclarar los hechos", contextualizar:"Contextualizar", reconocer:"Reconocer y corregir", anunciar:"Anunciar un logro"};
const recPieza = m => !m ? "comunicado" : m.tono === "cri" ? "declaracion" : "comunicado";
const recEnf = m => !m ? "anunciar" : m.tono === "cri" ? "datos" : m.tono === "pos" ? "anunciar" : "contextualizar";
const baseConocimiento = () => `[Ejemplo] Teléfono de emergencias municipales: 800 000 000 (ficticio).\n[Ejemplo] El municipio dispone de 2 camiones aljibe propios.\n[Ejemplo] Vocero autorizado: encargado(a) de comunicaciones.\n[Completar] Agrega cifras oficiales, documentos y decisiones del municipio.`;
function vComunicados(){
  const c = cuenta(), ms = menciones(c, Number(tState.dias)), m = tState.draft && menciones(c, 32).find(x => x.g === tState.draft), pl = PLANES[c.perfil.plan];
  const pieza = tState.pieza || recPieza(m), enf = tState.enf || recEnf(m), rp = recPieza(m), re = recEnf(m);
  const draft = (c.drafts||{})[tState.draft || "_"] || "";
  const back = tState.from ? `<a class="back" href="#${tState.from}">← Volver a ${({inicio:"Inicio", menciones:"Menciones", reportes:"Reportes"})[tState.from]}</a>` : "";
  const aprob = S.comunicados.filter(x => x.org===S.org);
  return `${back}<div class="head"><div><h2 tabindex="-1">Preparar una respuesta</h2><p>Tres decisiones y un borrador. Solo usa datos ${esAut() ? "de la oficina" : "del municipio"} y de la noticia; lo que falte queda marcado para que lo completes. Nada se publica sin tu aprobación.</p></div><span class="muted mono" style="font-size:12.5px">${c.borradores||0} de ${pl.borradores} borradores del mes</span></div>
  <div class="grid two">
    <form id="comForm" class="card stepper" novalidate>
      <section><h3><span class="n">1</span>¿A qué respondes?</h3>
        <select id="kMen" aria-label="Noticia de origen" class="field" style="padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface);min-height:36px"><option value="">Nada: es un anuncio propio</option>${(m && !ms.some(x => x.g === m.g) ? [m].concat(ms) : ms).map(x => `<option value="${x.g}" ${m&&m.g===x.g?"selected":""}>${tonoLbl[x.tono]} · ${esc(x.lead.t.slice(0,80))}${x.lead.t.length>80?"…":""}</option>`).join("")}</select>
        ${m ? `<div class="mini"><div class="meta" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:12.5px;color:var(--muted)">${pillTono(m.tono)}<span>${esc(medioN(m.lead))} · ${ago(m.lead.ts)}</span></div><b>${esc(m.lead.t)}</b><span class="muted" style="font-size:12.5px">${esc(m.lead.res)}</span></div>` : ""}
      </section>
      <section><h3><span class="n">2</span>¿Qué necesitas?</h3>
        <div class="opts" role="radiogroup" aria-label="Pieza">${piezasDe().filter(k => PIEZAS[k]).map(k => [k, PIEZAS[k]]).map(([k,[n,d]]) => `<label class="opt"><input type="radio" name="pieza" value="${k}" ${pieza===k?"checked":""}>${k===rp?'<span class="rec">Sugerido</span>':""}<b>${n}</b><span>${d}</span></label>`).join("")}</div>
      </section>
      <section><h3><span class="n">3</span>¿Con qué enfoque?</h3>
        <div class="checks" role="radiogroup" aria-label="Enfoque">${Object.entries(ENFOQUES).map(([k,v]) => `<label><input type="radio" name="enf" value="${k}" ${enf===k?"checked":""}> ${v}${k===re?' <span class="muted">(sugerido)</span>':""}</label>`).join("")}</div>
      </section>
      <details class="kb"><summary>${esAut() ? "Datos de la oficina que puede usar la IA" : "Datos del municipio que puede usar la IA"}</summary><div class="field" style="margin-top:8px"><textarea id="kBase" aria-label="Datos del municipio">${esc(c.base || (esAut() ? baseAutoridad(c.perfil) : baseConocimiento()))}</textarea><small>Los datos del ejemplo son ficticios. En producción se cargan cifras y documentos oficiales.</small></div></details>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" type="submit" id="btnGen">Generar borrador</button><button class="btn" type="button" data-act="stop" id="btnStop" hidden>Detener</button></div>
    </form>
    <div class="card" style="display:grid;gap:10px;align-content:start"><h3 style="margin:0">Borrador</h3>
      <textarea id="kOut" class="draft" aria-label="Borrador" placeholder="El borrador aparecerá aquí. También puedes escribirlo tú.">${esc(draft)}</textarea>
      <p class="note" id="kNote">Antes de aprobar, completa lo marcado [completar] y valida las citas con el vocero.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" data-act="aprobar" id="btnAprob" ${draft.trim()?"":"disabled"}>Aprobar</button><button class="btn" data-act="copiar" id="btnCopy" ${draft.trim()?"":"disabled"}>Copiar</button></div>
      ${shareBar("draft", {off: !draft.trim(), id: "shareDraft"})}
    </div>
  </div>
  <div class="card" style="margin-top:14px"><h3>Aprobados</h3>${aprob.length ? `<div class="scroll"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Responde a</th><th>Estado</th><th>Compartir</th></tr></thead><tbody>${aprob.map((x, i) => `<tr><td class="mono">${fecha(x.ts)}</td><td>${esc(x.pieza)}</td><td>${esc(x.origen)}</td><td><span class="pill done">Aprobado</span></td><td>${shareBar("aprob", {i, compact: true})}</td></tr>`).join("")}</tbody></table></div>` : '<p class="muted" style="margin:0">Todavía no apruebas ninguno en esta cuenta.</p>'}</div>`;
}

/* Compartir: WhatsApp (envía el PDF), correo (Gmail, Outlook o programa) y PDF. Sin servidor: el PDF se arma en el navegador. */
const SH_ICO = {
  wa:'<path d="M4.4 19.6l1.3-3.8a8 8 0 1 1 2.8 2.6z"/><path d="M9 9.4c.4 2.3 2 3.9 4.6 4.6"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.6 6.6L12 13l8.4-6.4"/>',
  pdf:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M12 10.5v6.5M9.2 14.3l2.8 2.8 2.8-2.8"/>'
};
const SH_VIAS = [["wa","WhatsApp"],["mail","Correo"],["pdf","PDF"]];
function shareBar(src, {i = null, compact = false, off = false, id = ""} = {}){
  return `<div class="shr${compact ? " compact" : ""}"${id ? ` id="${id}"` : ""} role="group" aria-label="Compartir">${compact ? "" : '<span class="lbl">Compartir</span>'}${SH_VIAS.map(([v, n]) => `<button class="btn sm" type="button" data-act="share" data-via="${v}" data-src="${src}"${i != null ? ` data-i="${i}"` : ""}${compact ? ` aria-label="${n}" title="${n}"` : ""}${v === "mail" ? ` aria-haspopup="menu" aria-expanded="false"` : ""}${off ? " disabled" : ""}><svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${SH_ICO[v]}</svg>${compact ? "" : `<span>${n}</span>`}</button>`).join("")}</div>`;
}
const plano = t => t.replace(/\*([^*\n]+)\*/g, "$1");
function shareDoc(src, i){
  if (src === "draft") {
    const pz = document.querySelector('input[name="pieza"]:checked')?.value || "comunicado", m = tState.draft && menciones().find(x => x.g === tState.draft), t = ($("#kOut")?.value || "").trim();
    return {titulo: PIEZAS[pz][0], sub: m ? "Responde a: " + m.lead.t : "Anuncio propio", texto: t, cuerpo: t, borrador: true};
  }
  if (src === "vocero") return vocDoc();
  if (src === "diario") { const t = diarioTexto(), d = diarioData(); return {titulo: "Informe diario de prensa", sub: d.etiqueta, sinFecha: true, tipo: "diario", texto: t, cuerpo: t.split("\n").slice(3).join("\n")}; }
  if (src === "parte") { const t = parteTexto(); return {titulo: esAut() ? partePer().rotulo + " · " + inst() : partePer().rotulo + " del alcalde", sub: "Período: " + parteData().per, sinFecha: true, texto: t, cuerpo: t.split("\n").slice(3).join("\n")}; }
  if (src === "aprob") { const x = S.comunicados.filter(y => y.org === S.org)[i]; return x && x.texto ? {titulo: x.pieza, sub: "Responde a: " + x.origen + " · aprobado el " + fecha(x.ts), texto: x.texto, cuerpo: x.texto} : null; }
  return null;
}
const hoyISO = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const hoyTxt = () => new Date().toLocaleDateString("es-CL", {day: "numeric", month: "long", year: "numeric"});
const slug = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const nombreArchivo = (d, ext) => `PregonIA-${slug(d.titulo)}-${slug(S.org)}-${hoyISO()}.${ext}`;
function abrirEnlace(url, nueva){ const a = document.createElement("a"); a.href = url; if (nueva) { a.target = "_blank"; a.rel = "noopener"; } document.body.appendChild(a); a.click(); a.remove(); }
const dlCap = (window.claude && window.claude.use) ? window.claude.use("downloads").catch(() => null) : Promise.resolve(null);
async function guardarArchivo(nombre, blob, silencio){
  const dl = await dlCap;
  if (dl) {
    try { await dl.save({filename: nombre, data: blob}); if (!silencio) toast("Guardado: " + nombre); }
    catch(err) { if (err && err.code === "declined") return; toast(err && err.code === "rate_limited" ? "Ya hay una descarga esperando tu confirmación." : "Esta vista no permite guardar archivos. Ábrela en pregonia.vercel.app."); }
    return;
  }
  const u = URL.createObjectURL(blob), a = document.createElement("a"); a.href = u; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000);
  if (!silencio) toast("Descargado: " + nombre);
}
/* PDF: jsPDF se carga solo al primer uso. Sus fuentes base cubren el español (WinAnsi); lo demás se aproxima. */
let jspdfP = null;
function cargarJsPDF(){
  return jspdfP ||= new Promise((ok, no) => {
    if (window.jspdf) return ok(window.jspdf);
    const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = () => window.jspdf ? ok(window.jspdf) : no(new Error("jspdf")); s.onerror = () => { jspdfP = null; s.remove(); no(new Error("jspdf")); };
    document.head.appendChild(s);
  });
}
const CP1252 = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
const pdfTxt = s => s.replace(/[→⟶➜]/g, "->").replace(/[‐-‒−]/g, "-").replace(/­/g, "").replace(/[^\x09\x0A\x20-\x7E\xA0-\xFF]/g, ch => CP1252.includes(ch) ? ch : ch.normalize("NFKD").replace(/[^\x20-\x7E\xA0-\xFF]/g, ""));
async function pdfBlob(d){
  const {jsPDF} = await cargarJsPDF(), doc = new jsPDF({unit: "mm", format: "a4"}), M = 20, AN = 210 - 2 * M, ALTO = 297, PIE = ALTO - 14;
  doc.setProperties({title: pdfTxt(d.titulo + " · " + S.org), author: "PregonIA", creator: "PregonIA"});
  let y = M;
  const salto = h => { if (y + h > PIE - 6) { doc.addPage(); y = M; } };
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(30, 77, 140); doc.text(pdfTxt("PregonIA · " + inst()), M, y); y += 8;
  doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(21, 27, 36);
  doc.splitTextToSize(pdfTxt(d.titulo), AN).forEach(l => { doc.text(l, M, y); y += 7; });
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(91, 101, 115);
  doc.splitTextToSize(pdfTxt(d.sub + (d.sinFecha ? "" : " · " + hoyTxt())), AN).forEach(l => { doc.text(l, M, y); y += 4.6; });
  y += 2; doc.setDrawColor(213, 219, 227); doc.setLineWidth(0.3); doc.line(M, y, M + AN, y); y += 8;
  doc.setTextColor(21, 27, 36); doc.setFontSize(11);
  for (const bruta of d.cuerpo.split("\n")) {
    if (!bruta.trim()) { y += 2.6; continue; }
    if (/^\s*https?:\/\/\S+\s*$/.test(bruta)) {
      const url = bruta.trim(), ver = url.replace(/^https?:\/\/(www\.)?/, ""), sang = Math.min(12, (bruta.match(/^ */)[0].length) * 1.4);
      salto(5.2); doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(21, 101, 192);
      doc.textWithLink(pdfTxt(ver.length > 88 ? ver.slice(0, 86) + "…" : ver), M + sang, y, {url});
      doc.setFontSize(11); doc.setTextColor(21, 27, 36); y += 6; continue;
    }
    const negrita = /^\s*\*[^*]+\*\s*$/.test(bruta), sangria = Math.min(12, (bruta.match(/^ */)[0].length) * 1.4), txt = pdfTxt(plano(bruta).trim());
    doc.setFont("helvetica", negrita ? "bold" : "normal");
    for (const l of doc.splitTextToSize(txt, AN - sangria)) { salto(5.6); doc.text(l, M + sangria, y); y += 5.6; }
    y += 1.4;
  }
  const n = doc.getNumberOfPages(), pie = d.borrador ? "Borrador generado con IA por PregonIA · Revisar antes de difundir" : "Preparado con PregonIA · Incluye análisis generado con IA";
  for (let p = 1; p <= n; p++) { doc.setPage(p); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(120, 128, 140); doc.text(pdfTxt(pie), M, PIE + 6); doc.text(`Página ${p} de ${n}`, M + AN, PIE + 6, {align: "right"}); }
  return doc.output("blob");
}
const movil = () => matchMedia("(pointer: coarse)").matches;
const pdfCache = {};
/* PDF del informe diario con la gráfica del sistema en versión clara (sin fondo, apta para imprimir): tarjetas de indicadores, barras y clipping por mención con enlaces. */
async function pdfDiario(){
  const {jsPDF} = await cargarJsPDF(), doc = new jsPDF({unit: "mm", format: "a4"}), W = 210, H = 297, M = 15, AN = W - 2 * M, PIE = H - 13;
  const d = diarioData(), C = {card: "#FFFFFF", line: "#D8D4CC", text: "#111827", muted: "#56627A", blue: "#1976D2", blueL: "#1565C0", track: "#ECEAE4",
    cri: "#B3261E", pos: "#2A9466", neu: "#CC9A10", cris: "#FBE6E3", poss: "#DDF2E8", neus: "#FBF1D6"};
  const T = s => pdfTxt(String(s ?? "")), tc = k => C[k] || C.neu, tsoft = k => C[k + "s"] || C.neus;
  const fondo = () => {}; // página blanca, sin color de fondo
  const fuente = (size, bold, font = "helvetica") => { doc.setFont(font, bold ? "bold" : "normal"); doc.setFontSize(size); };
  const txt = (s, x, y, o = {}) => { fuente(o.size || 9, o.bold, o.font); doc.setTextColor(o.color || C.text); if (doc.setCharSpace) doc.setCharSpace(o.cs || 0); doc.text(T(s), x, y, {align: o.align || "left"}); if (doc.setCharSpace) doc.setCharSpace(0); };
  const lineas = (s, w, size, bold) => { fuente(size, bold); return doc.splitTextToSize(T(s), w); };
  const ancho = (s, size, bold, font) => { fuente(size, bold, font); return doc.getTextWidth(T(s)); };
  const recorta = (s, w, size, bold) => { let x = T(s); if (ancho(x, size, bold) <= w) return x; while (x.length > 3 && ancho(x + "…", size, bold) > w) x = x.slice(0, -1); return x.trim() + "…"; };
  const tarjeta = (x, y, w, h) => { doc.setFillColor(C.card); doc.setDrawColor(C.line); doc.setLineWidth(0.25); doc.roundedRect(x, y, w, h, 2, 2, "FD"); };
  const ceja = (s, x, y, color = C.blueL) => txt(String(s).toUpperCase(), x, y, {size: 6.8, bold: true, color, cs: 0.35});
  const marca = (x, yb, s) => { doc.setFillColor("#2196F3"); [0.42, 0.7, 1].forEach((h, i) => doc.roundedRect(x + i * s * 0.55, yb - s * h, s * 0.38, s * h, s * 0.07, s * 0.07, "F")); return x + s * 1.6; };
  const logo = (x, y, size) => { const x2 = marca(x, y, size * 0.33) + 0.6; txt("Pregon", x2, y, {size, bold: true}); txt("IA", x2 + ancho("Pregon", size, true), y, {size, bold: true, color: "#2196F3"}); };
  const barra = (x, y, w, frac, color = C.blue) => { doc.setFillColor(C.track); doc.roundedRect(x, y, w, 1.8, 0.9, 0.9, "F"); if (frac > 0) { doc.setFillColor(color); doc.roundedRect(x, y, Math.max(1.8, w * frac), 1.8, 0.9, 0.9, "F"); } };
  const senal = (x, yb, nivel, color) => [1.4, 2.3, 3.2].forEach((h, i) => { doc.setFillColor(i <= nivel ? color : C.track); doc.roundedRect(x + i * 1.6, yb - h, 1.1, h, 0.3, 0.3, "F"); });
  const cabeceraCorta = () => { logo(M, 12, 10); txt(`Informe diario · ${S.org} · ${d.etiqueta}`, W - M, 11.5, {size: 7.5, color: C.muted, align: "right"}); doc.setDrawColor(C.line); doc.setLineWidth(0.3); doc.line(M, 16, W - M, 16); return 22; };
  doc.setProperties({title: T(`Informe diario de prensa · ${S.org}`), author: "PregonIA", creator: "PregonIA · ALTKimia"});
  fondo();
  // Encabezado
  logo(M, 17, 15); txt("INFORME DIARIO DE PRENSA", W - M, 14, {size: 6.8, bold: true, color: C.muted, align: "right"});
  txt(inst(), M, 29, {size: 19, bold: true});
  txt(d.etiqueta, M, 36, {size: 9.5, color: C.blueL});
  doc.setDrawColor(C.line); doc.setLineWidth(0.3); doc.line(M, 40, W - M, 40);
  let y = 45;
  if (!d.pubs.length) {
    tarjeta(M, y, AN, 22); txt(`Ningún medio publicó sobre ${S.org} en este período.`, M + 6, y + 10, {size: 11, bold: true});
    txt(d.prev ? `En el período anterior hubo ${plural(d.prev, "publicación", "publicaciones")}.` : "Tampoco hubo publicaciones en el período anterior.", M + 6, y + 16, {size: 8.5, color: C.muted});
  } else {
    // Indicadores
    const tw = (AN - 3 * 4) / 4, th = 27;
    [["Publicaciones", String(d.pubs.length), C.text, difTxt(d.pubs.length, d.prev, false)],
     ["Noticias distintas", String(d.grupos.length), C.text, `publicadas por ${plural(d.medios.length, "medio", "medios")}`],
     ["Tono del período", d.v.n, tc(d.v.k), conteo(d.M)],
     ["Críticas pendientes", String(d.sinResp), d.sinResp ? C.cri : C.text, "noticias críticas sin respuesta aprobada"]
    ].forEach(([lb, val, col, sub], i) => {
      const x = M + i * (tw + 4); tarjeta(x, y, tw, th); txt(recorta(lb.toUpperCase(), tw - 10, 6.8, true), x + 4, y + 6, {size: 6.8, bold: true, color: C.muted, cs: 0.25});
      let size = 20; while (size > 11 && ancho(val, size, true) > tw - 8) size -= 1;
      txt(val, x + 4, y + 16, {size, bold: true, color: col});
      lineas(sub, tw - 8, 6.8).slice(0, 2).forEach((l, k) => txt(l, x + 4, y + 21 + k * 3, {size: 6.8, color: C.muted}));
    });
    y += th + 4;
    // Alcance, temas y medios
    const cw = (AN - 8) / 3, ch = 42;
    const c1 = M, c2 = M + cw + 4, c3 = M + 2 * (cw + 4);
    tarjeta(c1, y, cw, ch); ceja("Hasta dónde llegó", c1 + 4, y + 6);
    const maxN = Math.max(1, ...Object.values(d.niv));
    [["local", "Comunal"], ["regional", "Regional"], ["nacional", "Nacional"]].forEach(([k, l], i) => { const yy = y + 14 + i * 8; txt(l, c1 + 4, yy, {size: 8, color: C.muted}); barra(c1 + 21, yy - 1.6, cw - 33, (d.niv[k] || 0) / maxN); txt(String(d.niv[k] || 0), c1 + cw - 4, yy, {size: 8.5, bold: true, align: "right"}); });
    txt("Publicaciones según el alcance del medio", c1 + 4, y + ch - 4, {size: 6.5, color: C.muted});
    tarjeta(c2, y, cw, ch); ceja("Temas", c2 + 4, y + 6);
    const maxT = Math.max(1, ...d.temas.map(([, x]) => x.n));
    d.temas.slice(0, 4).forEach(([n, x], i) => { const yy = y + 12.5 + i * 7.4; const extra = x.cri ? ` · ${x.cri} crít.` : ""; txt(recorta(n, cw - 20, 7.8, true), c2 + 4, yy, {size: 7.8, bold: true}); if (extra) txt(extra.trim().replace(/^· /, ""), c2 + cw - 10, yy, {size: 6.5, color: C.cri, align: "right"}); txt(String(x.n), c2 + cw - 4, yy, {size: 8.5, bold: true, align: "right"}); barra(c2 + 4, yy + 1.6, cw - 8, x.n / maxT, x.cri ? C.cri : C.blue); });
    tarjeta(c3, y, cw, ch); ceja("Medios que más publicaron", c3 + 4, y + 6);
    d.medios.slice(0, 5).forEach(([id, n], i) => { const yy = y + 13 + i * 6; txt(recorta(MED[id].n, cw - 30, 7.8, true), c3 + 4, yy, {size: 7.8, bold: true}); txt((NIVLBL[MED[id].a] || "").toUpperCase(), c3 + cw - 11, yy, {size: 5.8, color: C.muted, align: "right", cs: 0.2}); txt(String(n), c3 + cw - 4, yy, {size: 8.5, bold: true, align: "right"}); });
    y += ch + 8;
    // Clipping
    ceja(`Clipping · ${plural(d.grupos.length, "mención", "menciones")} · ${plural(d.pubs.length, "publicación", "publicaciones")}`, M, y);
    txt("Cada mención agrupa las publicaciones del mismo hecho. El código sirve para citarla y cada enlace abre la nota original. Primero lo crítico.", M, y + 4.5, {size: 7, color: C.muted});
    y += 9;
    for (const g of d.grupos) {
      const m = g.m, xi = M + 6, wi = AN - 10, resp = respondida(m.g), e = escalera(m.notas), col = tc(m.tono);
      const res = lineas(m.lead.res, wi, 10, true);
      const pubs = g.pubs.slice(0, 10).map(n => ({n, tl: lineas(n.t, wi - 16, 8.6).slice(0, 3)}));
      const hPubs = pubs.reduce((s, p) => s + 4.4 + p.tl.length * 3.9 + (p.n.url ? 3.8 : 0) + 1.6, 0) + (g.pubs.length > pubs.length ? 4 : 0);
      const h = 7 + 3 + res.length * 4.6 + 6.5 + 3 + hPubs + 3;
      if (y + h > PIE - 10) { doc.addPage(); fondo(); y = cabeceraCorta(); }
      tarjeta(M, y, AN, h); doc.setFillColor(col); doc.roundedRect(M, y, 1.8, h, 0.9, 0.9, "F");
      // cabecera de la mención
      let x = xi, yy = y + 6.2;
      fuente(7.5, true, "courier"); const rw = doc.getTextWidth(g.ref) + 3.4; doc.setDrawColor(C.line); doc.roundedRect(x, yy - 3.6, rw, 5, 1, 1, "S"); txt(g.ref, x + 1.7, yy, {size: 7.5, bold: true, font: "courier", color: C.blueL}); x += rw + 2.5;
      const pl = tonoLbl[m.tono], pw = ancho(pl, 7, true) + 5; doc.setFillColor(tsoft(m.tono)); doc.roundedRect(x, yy - 3.6, pw, 5, 2.5, 2.5, "F"); txt(pl, x + 2.5, yy, {size: 7, bold: true, color: col}); x += pw + 2.5;
      if (resp) { const rw2 = ancho("Respondida", 7, true) + 5; doc.setFillColor(C.poss); doc.roundedRect(x, yy - 3.6, rw2, 5, 2.5, 2.5, "F"); txt("Respondida", x + 2.5, yy, {size: 7, bold: true, color: C.pos}); x += rw2 + 2.5; }
      txt(recorta(temaDe(m).toUpperCase(), M + AN - 4 - x, 6.8, true), x, yy, {size: 6.8, bold: true, color: C.muted, cs: 0.3});
      yy = y + 7 + 4.6;
      res.forEach(l => { txt(l, xi, yy, {size: 10, bold: true}); yy += 4.6; });
      senal(xi, yy + 1.4, e.max, col); txt(llego(e), xi + 6.5, yy + 1.2, {size: 7.8, bold: true, color: col});
      const metaX = xi + 7.5 + ancho(llego(e), 7.8, true) + 3;
      txt(`${plural(g.pubs.length, "publicación", "publicaciones")} en el período${g.antes ? ` · viene desde el ${hora(m.first)}` : ""}`, metaX, yy + 1.2, {size: 7.2, color: C.muted});
      yy += 5.5;
      doc.setDrawColor(C.line); doc.setLineWidth(0.25); if (doc.setLineDashPattern) doc.setLineDashPattern([0.8, 0.8], 0); doc.line(xi, yy, M + AN - 4, yy); if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);
      yy += 4.2;
      pubs.forEach(({n, tl}) => {
        txt(horaHM(n.ts), xi, yy, {size: 7.5, font: "courier", color: C.muted});
        txt((NIVLBL[MED[n.m].a] || "").toUpperCase(), xi + 12, yy, {size: 5.8, color: C.muted, cs: 0.25});
        txt(recorta(medioN(n), wi - 30, 8.4, true), xi + 28, yy, {size: 8.4, bold: true});
        yy += 4.2;
        tl.forEach(l => { txt(l, xi + 12, yy, {size: 8.6}); yy += 3.9; });
        if (n.url) { const ver = n.url.replace(/^https?:\/\/(www\.)?/, ""), vis = recorta(ver, wi - 16, 7, false); fuente(7, false); doc.setTextColor(C.blueL); doc.textWithLink(vis, xi + 12, yy, {url: n.url}); yy += 3.8; }
        yy += 1.6;
      });
      if (g.pubs.length > pubs.length) txt(`y ${plural(g.pubs.length - pubs.length, "publicación más", "publicaciones más")} en el sistema`, xi + 12, yy, {size: 7, color: C.muted});
      y += h + 4;
    }
  }
  const nota = MODO.tipo !== "demo" ? "Noticias reales leídas de los medios del catálogo de PregonIA. Los resúmenes son propios; el texto de los medios no se reproduce." : "Demostración con noticias ficticias: las notas no tienen enlace. Con Noticias reales cada publicación lleva a su fuente.";
  const n = doc.getNumberOfPages();
  for (let p = 1; p <= n; p++) { doc.setPage(p); doc.setDrawColor(C.line); doc.setLineWidth(0.3); doc.line(M, PIE, W - M, PIE); txt("PregonIA · Un producto de ALTKimia", M, PIE + 5, {size: 7, color: C.muted}); txt(`Página ${p} de ${n}`, W - M, PIE + 5, {size: 7, color: C.muted, align: "right"}); if (p === n) lineas(nota, AN, 6.5).slice(0, 2).forEach((l, k) => txt(l, M, PIE - 5.5 + k * 3, {size: 6.5, color: C.muted})); }
  return doc.output("blob");
}
async function pdfDe(d){ const k = d.titulo + "\u0001" + d.sub + "\u0001" + d.cuerpo; return pdfCache[k] ||= new File([await (d.tipo === "diario" ? pdfDiario() : pdfBlob(d))], nombreArchivo(d, "pdf"), {type: "application/pdf"}); }
/* En el celular: hoja de compartir del sistema con el PDF adjunto (WhatsApp, Gmail, Outlook…). */
async function compartirArchivo(d, destino){
  if (!navigator.canShare || !movil()) return false;
  let f; try { f = await pdfDe(d); } catch(err) { return false; }
  if (!navigator.canShare({files: [f]})) return false;
  try { await navigator.share({files: [f], title: d.titulo + " · " + S.org, text: d.titulo + " · " + inst()}); }
  catch(err) {
    if (err && err.name === "AbortError") return true;
    if (err && err.name === "NotAllowedError") { toast(`El PDF está listo: toca ${destino} otra vez para enviarlo.`); return true; }
    return false;
  }
  return true;
}
function correoMenu(b){
  cerrarMenu();
  const m = document.createElement("div");
  m.className = "shr-pop"; m.id = "shrPop"; m.setAttribute("role", "menu"); m.setAttribute("aria-label", "Enviar por correo");
  m.innerHTML = [["gmail", "Gmail"], ["outlook", "Outlook"], ["mailto", "Programa de correo del equipo"]].map(([v, n]) => `<button type="button" role="menuitem" data-act="share" data-via="${v}" data-src="${b.dataset.src}"${b.dataset.i != null ? ` data-i="${b.dataset.i}"` : ""}>${n}</button>`).join("");
  document.body.appendChild(m); m._origen = b; b.setAttribute("aria-expanded", "true"); ubicarMenu();
  m.querySelector("button").focus({preventScroll: true});
}
function ubicarMenu(){
  const m = $("#shrPop"); if (!m) return; const b = m._origen;
  if (!b || !b.isConnected) { cerrarMenu(); return; }
  const r = b.getBoundingClientRect(), w = m.offsetWidth, h = m.offsetHeight;
  m.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + "px";
  m.style.top = (r.bottom + 6 + h > innerHeight && r.top - 6 - h > 0 ? r.top - 6 - h : r.bottom + 6) + "px";
}
function cerrarMenu(){ const m = $("#shrPop"); if (!m) return; m._origen?.setAttribute("aria-expanded", "false"); m.remove(); }
document.addEventListener("click", e => { if ($("#shrPop") && !e.target.closest("#shrPop") && !e.target.closest('[data-via="mail"]') && !e.target.closest('[data-act="cuenta"]')) cerrarMenu(); }, true);
document.addEventListener("keydown", e => { if (e.key === "Escape" && $("#shrPop")) { const o = $("#shrPop")._origen; cerrarMenu(); o?.focus(); } });
addEventListener("scroll", ubicarMenu, {passive: true, capture: true}); addEventListener("resize", ubicarMenu);
async function compartir(b){
  const via = b.dataset.via, d = shareDoc(b.dataset.src, Number(b.dataset.i));
  if (!d || !d.texto) { cerrarMenu(); toast("No hay texto para compartir todavía."); return; }
  const aviso = d.borrador && /\[completar/i.test(d.texto) ? " Ojo: aún hay partes marcadas [completar]." : "";
  const asunto = d.titulo + " · " + inst(), cuerpo = plano(d.texto);
  if (via === "wa") {
    if (await compartirArchivo(d, "WhatsApp")) return;
    // Computador: WhatsApp Web no recibe archivos por enlace. Se abre el chat y se guarda el PDF para adjuntarlo.
    abrirEnlace("https://wa.me/?text=" + encodeURIComponent(`*${asunto}*\nTe envío el documento en PDF.`), true);
    try { await guardarArchivo(nombreArchivo(d, "pdf"), await pdfDe(d), true); toast("Abrimos WhatsApp y guardamos el PDF: en el chat, adjúntalo con el clip o arrástralo." + aviso); }
    catch(err) { toast("No se pudo preparar el PDF. Revisa la conexión e intenta de nuevo."); }
    return;
  }
  if (via === "mail") {
    if (await compartirArchivo(d, "Correo")) return;
    if ($("#shrPop") && $("#shrPop")._origen === b) { cerrarMenu(); return; }
    correoMenu(b); return;
  }
  if (via === "gmail" || via === "outlook" || via === "mailto") {
    cerrarMenu();
    if (navigator.clipboard) navigator.clipboard.writeText(cuerpo).catch(() => {});
    const su = encodeURIComponent(asunto), bo = encodeURIComponent(cuerpo);
    if (via === "gmail") abrirEnlace(`https://mail.google.com/mail/?view=cm&fs=1&su=${su}&body=${bo}`, true);
    if (via === "outlook") abrirEnlace(`https://outlook.office.com/mail/deeplink/compose?subject=${su}&body=${bo}`, true);
    if (via === "mailto") abrirEnlace(`mailto:?subject=${su}&body=${bo}`, false);
    toast((via === "mailto" ? "Abrimos el programa de correo con el texto." : `Abrimos ${via === "gmail" ? "Gmail" : "Outlook"} con el texto listo.`) + " También quedó copiado, y con el botón PDF puedes adjuntarlo." + aviso);
    return;
  }
  if (via === "pdf") {
    b.disabled = true;
    try { await guardarArchivo(nombreArchivo(d, "pdf"), await pdfDe(d)); }
    catch(err) { toast("No se pudo preparar el PDF. Revisa la conexión e intenta de nuevo."); }
    finally { b.disabled = false; }
  }
}

/* Render y navegación */
const VIEWFN = {inicio:vInicio, menciones:vMenciones, reportes:vReportes, comunicados:vComunicados, temas:vTemas, asistente:vAsistente, prioridades:vPrioridades, fuentes:vFuentes};
function render(focus){
  // Mientras se leen los medios no se muestra una portada a medias: va la pantalla de lectura (Ajustes sigue disponible).
  if (MODO.cargando && !isConfig(route())) { renderChrome(); $("#view").innerHTML = procesandoHtml(); cerrarMenu(); procesandoPaso(); return; }
  renderChrome(); $("#view").innerHTML = (perAplica() ? `<div class="perbar">${perCtl()}</div>` : "") + (VIEWFN[route()] || vInicio)();
  cerrarMenu(); if ($("#view .shr")) cargarJsPDF().catch(() => {});
  { const pt = $("#portada"); if (pt && !pt.hidden) pintarMini(); }
  if (focus) { const h = $("#view h2"); if (h) h.focus({preventScroll:true}); }
  if (tState.refocus) { const el = document.querySelector(`[data-chipin="${tState.refocus}"]`); if (el) el.focus(); tState.refocus = null; }
}
window.addEventListener("hashchange", () => { render(true); window.scrollTo(0,0); });
$("#org").addEventListener("change", e => { if (e.target.value === "__entrar") { e.target.value = S.org; entAbrir(false); return; } S.org = e.target.value; tState = {...tState, tema:"todos", draft:null, from:null, pieza:null, enf:null, open:{}}; propuesta = null; lecturaTxt = {}; save(); render(true); toast(esAut() ? "Ahora ves la cuenta de " + inst() + ". Cada cuenta ve solo sus datos." : "Ahora ves " + S.org + ". Cada municipio ve solo sus datos."); });
function perGuardar(v){ if (!["1", "7", "30"].includes(String(v))) return; tState.dias = String(v); try { localStorage.setItem(PER_KEY, tState.dias); } catch(e) {} }
function goMenciones(patch){ Object.assign(tState, {tema:"todos", tono:"todos", q:"", llego:null, medio:null, fcat:null, fenf:null, fpap:null, fprio:null, fcomp:null, alc:"sobre"}, patch); if (patch && patch.dias) perGuardar(patch.dias); if (route() === "menciones") render(true); else location.hash = "menciones"; }

document.addEventListener("change", e => {
  const id = e.target.id;
  if (id === "fTema") { tState.tema = e.target.value; render(); }
  if (id === "fCat" || id === "fEnf" || id === "fPap" || id === "fPrio" || id === "fComp") { tState[{fCat: "fcat", fEnf: "fenf", fPap: "fpap", fPrio: "fprio", fComp: "fcomp"}[id]] = e.target.value || null; render(); }
  // Configuración › Prioridades: plazos y competencias de la cuenta
  if (e.target.dataset && e.target.dataset.plazo) { const c = cuenta(), v = Number(e.target.value); c.plazos = c.plazos || {}; if (v > 0) c.plazos[e.target.dataset.plazo] = v; else delete c.plazos[e.target.dataset.plazo]; c.fv = (c.fv || 0) + 1; save(); toast("Plazo actualizado."); }
  if (e.target.dataset && e.target.dataset.comp) { const c = cuenta(), area = e.target.dataset.comp, base = (MATRIZ[rolDe(c)] || MATRIZ.municipio)[area]; c.compArea = c.compArea || {}; if (e.target.value === base) delete c.compArea[area]; else c.compArea[area] = e.target.value; c.fv = (c.fv || 0) + 1; save(); render(); toast("Competencia actualizada para " + AREAS[area] + "."); }
  if (id === "kBase") { cuenta().base = e.target.value; save(); }
  if (id === "kMen") { tState.draft = e.target.value || null; tState.pieza = null; tState.enf = null; render(); }
  if (e.target.name === "pieza") tState.pieza = e.target.value;
  if (e.target.name === "enf") tState.enf = e.target.value;
});
let qTimer;
document.addEventListener("input", e => {
  if (e.target.id === "fQ") { clearTimeout(qTimer); const v = e.target.value; qTimer = setTimeout(() => { tState.q = v; render(); const el = $("#fQ"); if (el) { el.focus(); el.setSelectionRange(v.length, v.length); } }, 250); }
  if (e.target.id === "kOut") { const c = cuenta(); (c.drafts ||= {})[tState.draft || "_"] = e.target.value; save(); const has = !!e.target.value.trim(); $("#btnAprob").disabled = !has; $("#btnCopy").disabled = !has; document.querySelectorAll("#shareDraft button").forEach(x => x.disabled = !has); }
});
function chipAdd(el){
  const v = el.value.replace(/,/g, "").trim(); if (!v) return;
  const [id, k] = el.dataset.chipin.split(":"), t = cuenta().temas.find(x => x.id === id); if (!t) return;
  if (!t[k].some(x => norm(x) === norm(v))) t[k].push(v);
  el.value = ""; save(); tState.refocus = el.dataset.chipin; render();
}
document.addEventListener("keydown", e => {
  const el = e.target;
  if (el.dataset && el.dataset.chipin) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); chipAdd(el); }
    if (e.key === "Backspace" && !el.value) { const [id, k] = el.dataset.chipin.split(":"), t = cuenta().temas.find(x => x.id === id); if (t && t[k].length) { t[k].pop(); save(); tState.refocus = el.dataset.chipin; render(); } }
  }
  if ((e.key === "Enter" || e.key === " ") && el.matches && el.matches("tr.click, .div .rw")) { e.preventDefault(); el.click(); }
});
document.addEventListener("focusout", e => { const el = e.target; if (el.dataset && el.dataset.chipin && el.value.trim()) chipAdd(el); });

document.addEventListener("submit", e => {
  e.preventDefault();
  if (e.target.id === "carForm") {
    const pa = cuenta().perfil, aut = esAut() ? "" : $("#cAut").value.trim();
    const perfil = {...(esAut() ? pa : {...pa, tipo: $("#cTipo").value, comuna: S.org, autoridad: aut, ...(aut === pa.autoridad ? {} : {alcaldeId: null, variantes: []})}), agenda: $("#cAg").value.split(",").map(s => s.trim()).filter(Boolean), sens: [...document.querySelectorAll('input[name="sens"]:checked')].map(x => x.value), plan: $("#cPlan").value};
    propuesta = {perfil, ...proponer(perfil)};
    $("#propOut").innerHTML = propHtml(); const pc = $("#propCard"); pc.scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start"}); pc.focus({preventScroll:true});
  }
  if (e.target.id === "comForm") generar();
});

document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const act = b.dataset.act, c = cuenta();
  if (act === "responder") { e.preventDefault(); tState.draft = b.dataset.g; tState.from = b.dataset.from || null; tState.pieza = null; tState.enf = null; if (route() === "comunicados") render(true); else location.hash = "comunicados"; }
  if (act === "goto") goMenciones(Object.fromEntries(["tono", "dias", "tema", "llego", "medio", "fcat", "fenf", "fpap", "alc"].filter(k => b.dataset[k] != null).map(k => [k, b.dataset[k]])));
  if (act === "goto-tema") goMenciones({tema: b.dataset.id});
  if (act === "ver-criticas") { e.preventDefault(); goMenciones({tono:"cri", dias:"7"}); }
  if (act === "f-tono") { tState.tono = b.dataset.k; render(); }
  if (act === "f-alc") { tState.alc = b.dataset.k; render(); }
  if (act === "no-resp") { const k = S.org + ":" + b.dataset.g; S.noResp = S.noResp || {}; S.noResp[k] = {k: b.dataset.k, ts: Date.now()}; save(); render();
    toast(`Registrado: no responder (${NO_RESP[b.dataset.k].toLowerCase()}). Cuenta como crítica atendida.`, () => { delete S.noResp[k]; save(); render(); }); }
  if (act === "f-dias" || act === "per") { perGuardar(b.dataset.k || b.dataset.v); render(); setTimeout(() => document.querySelector(`#${innerWidth <= 820 ? "view" : "perG"} [data-act="per"][data-v="${tState.dias}"]`)?.focus(), 0); }
  if (act === "f-reset") { Object.assign(tState, {tema:"todos", tono:"todos", q:"", llego:null, medio:null, fcat:null, fenf:null, fpap:null, fprio:null, fcomp:null, alc:"sobre"}); render(); }
  if (act === "f-x") { tState[b.dataset.k] = null; render(); }
  if (act === "f-est") { tState.fuente.e = b.dataset.k; render(); }
  if (act === "f-amb") { tState.fuente.a = b.dataset.k; render(); }
  if (act === "fic-guardar") { const g = b.dataset.g, box = b.closest(".corr-g"), campos = {}; box.querySelectorAll("[data-fic]").forEach(x => { campos[x.dataset.fic] = x.value; }); const m = menciones(cuenta(), 30).find(x => x.g === g); guardarCorreccion(g, campos, m); render(); toast(PILOTO && PILOTO.activo ? "Corrección guardada. La lectura siguiente la usa como criterio." : "Corrección guardada en esta cuenta."); }
  if (act === "fic-borrar") { const c = cuenta(); if (c.correcciones) delete c.correcciones[b.dataset.g]; c.fv = (c.fv || 0) + 1; save(); render(); toast("La ficha volvió a la clasificación automática."); }
  if (act === "prio-reset") { const c = cuenta(); delete c.plazos; delete c.compArea; c.fv = (c.fv || 0) + 1; save(); render(); toast("Plazos y competencias vuelven a los valores base del cargo."); }
  if (act === "cor-del") { const c = cuenta(); if (c.correcciones) delete c.correcciones[b.dataset.g]; c.fv = (c.fv || 0) + 1; save(); render(); }
  if (act === "fp") { const key = S.org + ":" + b.dataset.g; S.fp[key] = true; save(); render(); toast("Marcada como “no corresponde”. Servirá para afinar las exclusiones.", () => { delete S.fp[key]; save(); render(); }); }
  if (act === "fp-reset") { Object.keys(S.fp).filter(k => k.startsWith(S.org+":")).forEach(k => delete S.fp[k]); save(); render(); }
  if (act === "onb-hide") { c.onbOculto = true; save(); render(); toast("Aviso oculto. Puedes afinar tus temas cuando quieras en Ajustes.", () => { c.onbOculto = false; save(); render(); }); }
  if (act === "tema-open") { tState.open[b.dataset.id] = !tState.open[b.dataset.id]; render(); }
  if (act === "ctx-all") { tState.ctxAll[b.dataset.key] = true; render(); }
  if (act === "chip-del") { const t = c.temas.find(x => x.id === b.dataset.tema); if (t) { const k = b.dataset.k, i = Number(b.dataset.i), v = t[k][i]; t[k].splice(i, 1); save(); render(); toast(`Quitaste «${v}».`, () => { t[k].splice(i, 0, v); save(); render(); }); } }
  if (act === "quitar") { const i = c.temas.findIndex(t => t.id === b.dataset.id); if (i >= 0) { const t = c.temas.splice(i,1)[0]; c.sugeridos.unshift(t); save(); render(); toast(`Quitaste el tema ${t.nombre}.`, () => { c.sugeridos.splice(c.sugeridos.indexOf(t),1); c.temas.splice(i,0,t); save(); render(); }); } }
  if (act === "addsug") { const i = c.sugeridos.findIndex(t => t.id === b.dataset.id); if (i >= 0) { const t = c.sugeridos.splice(i,1)[0], pl = PLANES[c.perfil.plan], lleno = c.temas.filter(x => x.activo).length >= pl.temas; if (lleno) t.origen = "Paquete adicional"; c.temas.push(t); save(); render(); toast(lleno ? `${t.nombre} agregado. Supera el plan: en producción se suma el paquete de 5 temas.` : `${t.nombre} agregado.`, () => { c.temas.splice(c.temas.indexOf(t),1); c.sugeridos.splice(i,0,t); save(); render(); }); } }
  if (act === "activar" && propuesta) { const prev = {perfil: c.perfil, temas: c.temas, sugeridos: c.sugeridos}; c.perfil = propuesta.perfil; c.temas = propuesta.base; c.sugeridos = propuesta.sugeridos; c.caracterizada = true; propuesta = null; save(); location.hash = "temas"; toast("Listo: " + c.temas.length + " temas activos en " + S.org + ".", () => { Object.assign(c, prev); save(); render(); }); }
  if (act === "descartar") { propuesta = null; $("#propOut").innerHTML = ""; }
  if (act === "rep") { tState.rep = b.dataset.k; render(); }
  if (act === "dia") { tState.dia = b.dataset.k; render(); }
  if (act === "copiar-parte") { const txt = parteTexto(); try { await navigator.clipboard.writeText(txt); toast("Parte copiado. Pégalo en WhatsApp o en un correo."); } catch(err) { const ta = document.createElement("textarea"); ta.value = txt; ta.className = "draft"; ta.style.marginTop = "12px"; b.closest(".acts").after(ta); ta.focus(); ta.select(); toast("Texto seleccionado: cópialo con el teclado."); } }
  if (act === "share") compartir(b);
  if (act === "lectura") lectura(b);
  if (act === "stop") ctl?.abort();
  if (act === "aprobar") {
    const txt = $("#kOut").value.trim(); if (!txt) return;
    const m = tState.draft && menciones().find(x => x.g === tState.draft);
    const pz = document.querySelector('input[name="pieza"]:checked')?.value || "comunicado";
    S.comunicados.unshift({org: S.org, ts: Date.now(), pieza: PIEZAS[pz][0], origen: m ? m.lead.t.slice(0,70) : "Anuncio propio", texto: txt, g: m ? m.g : null});
    if (m) S.resp[S.org + ":" + m.g] = Date.now();  // hora de aprobación: mide el tiempo de respuesta
    save(); render(); toast(m ? "Aprobado. La noticia quedó como respondida." : "Aprobado y guardado.");
  }
  if (act === "copiar") { const el = $("#kOut"); try { await navigator.clipboard.writeText(el.value); toast("Borrador copiado."); } catch(err) { el.focus(); el.select(); toast("Texto seleccionado: cópialo con el teclado."); } }
});

/* IA desde la página (usa la cuenta de Claude de quien la abre) */
/* Fuera de claude.ai (por ejemplo en Vercel) la IA va por /api/ia, con la clave solo en el servidor. Misma forma que sample(): (texto, {signal, onText, modelTier}) → {text}. */
const aBase64 = b => new Promise((ok, mal) => { const r = new FileReader(); r.onload = () => ok({type: b.type || "image/jpeg", data: String(r.result).split(",")[1]}); r.onerror = mal; r.readAsDataURL(b); });
async function iaServidor(){
  if (!/^https?:$/.test(location.protocol)) return null;
  try { const r = await fetch("/api/ia", {cache: "no-store"}); if (!r.ok) return null; const j = await r.json(); if (!j.ok) return null; } catch(e) { return null; }
  return Object.assign(async function(input, opts = {}){
    let r;
    try { r = await fetch("/api/ia", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({prompt: String(input), tier: opts.modelTier === "quick" ? "quick" : "default", images: opts.images && opts.images.length ? await Promise.all(opts.images.slice(0, 2).map(aBase64)) : undefined}), signal: opts.signal}); }
    catch(err) { throw {code: err && err.name === "AbortError" ? "cancelled" : "network", message: String(err)}; }
    if (r.status === 429) throw {code: "rate_limited"};
    if (!r.ok || !r.body) throw {code: "error", message: await r.text().catch(() => "")};
    const lector = r.body.getReader(), dec = new TextDecoder(); let text = "";
    try { for (;;) { const {done, value} = await lector.read(); if (done) break; const delta = dec.decode(value, {stream: true}); text += delta; if (opts.onText) opts.onText({text, delta}); } }
    catch(err) { throw {code: opts.signal && opts.signal.aborted ? "cancelled" : "error", text}; }
    return {text, truncated: false};
  }, {imagenes: true});
}
let samplePromise = ((window.claude && window.claude.use) ? window.claude.use("sample").catch(() => null) : Promise.resolve(null)).then(s => s || iaServidor());
let ctl = null;
function prompt(m, pieza, enfoque, base){
  return `Eres el asistente de comunicaciones de PregonIA para ${esAut() ? "el equipo de " + inst() + " (" + cuenta().perfil.zonaNombre + ", Región de Valparaíso)" : inst()}, en Chile. Redacta en español de Chile: ${PIEZAS[pieza][2]}. Enfoque: ${ENFOQUES[enfoque]}.

Reglas obligatorias:
1. Usa solo datos que estén en los ${datosLbl()} o en la NOTICIA. Si falta un dato necesario, escribe [completar: qué dato falta]. No inventes cifras, fechas, nombres ni compromisos.
2. Toda cita textual va marcada así: [cita propuesta, validar con el vocero].
3. No copies frases del medio; describe la noticia con palabras propias y nombra el medio.
4. ${esAut() ? "Tono propio del cargo: sobrio, cercano y respetuoso. Sin ataques personales ni descalificaciones a otras autoridades o partidos. Si falta la posición de la autoridad sobre el tema, escribe [completar: posición]." : "Tono institucional, sobrio y respetuoso. Sin promoción personal ni partidaria de ninguna autoridad."}
5. Devuelve solo el texto de la pieza, sin explicaciones previas.

NOTICIA:
${m ? `Medio: ${nomMedio(m.lead)}. Titular: ${m.lead.t}. Resumen: ${m.lead.res}. Tono detectado: ${tonoLbl[m.tono]}. Otros medios que la publicaron: ${m.notas.length-1}.` : "No hay noticia: es un anuncio propio."}

${datosLbl()}:
${base}`;
}
function plantilla(m, pieza){
  return `${PIEZAS[pieza][0]} · ${inst()}\n\n[Plantilla: la IA no está disponible en esta vista]\n\nEn relación con ${m ? "lo informado por " + nomMedio(m.lead) + " (" + m.lead.res.replace(/\.$/,"") + ")" : "[completar: anuncio]"}, la Municipalidad de ${S.org} informa:\n\n1. [completar: hechos verificados]\n2. [completar: medidas adoptadas y plazos]\n3. [completar: canal de contacto para vecinos]\n\n[cita propuesta, validar con el vocero]: «[completar]»\n\nContacto de prensa: [completar]`;
}
function setDraft(txt){ const c = cuenta(); (c.drafts ||= {})[tState.draft || "_"] = txt; const has = !!txt.trim(); const a = $("#btnAprob"), k = $("#btnCopy"); if (a) a.disabled = !has; if (k) k.disabled = !has; document.querySelectorAll("#shareDraft button").forEach(x => x.disabled = !has); }
async function generar(){
  const c = cuenta(), pl = PLANES[c.perfil.plan];
  const m = tState.draft && menciones().find(x => x.g === tState.draft);
  const pieza = document.querySelector('input[name="pieza"]:checked')?.value || "comunicado", enfoque = document.querySelector('input[name="enf"]:checked')?.value || "datos", base = $("#kBase").value;
  c.base = base;
  const out = $("#kOut"), btn = $("#btnGen"), stop = $("#btnStop"), note = $("#kNote");
  const sample = await samplePromise;
  if (!sample) { out.value = plantilla(m, pieza); setDraft(out.value); c.borradores = (c.borradores||0) + 1; save(); renderChrome(); note.textContent = "La IA no está disponible en esta vista, así que usamos una plantilla. Abre la página en Claude para redactar con IA."; return; }
  ctl = new AbortController(); btn.disabled = true; stop.hidden = false; out.value = "Redactando…";
  try {
    const {text} = await sample(prompt(m, pieza, enfoque, base), {signal: ctl.signal, cache: false, onText: ({text}) => { out.value = text; }});
    out.value = text; setDraft(text); c.borradores = (c.borradores||0) + 1; save(); renderChrome();
    note.textContent = (c.borradores > pl.borradores ? "Superaste los borradores de tu plan; en producción se suma un paquete. " : "") + "Borrador generado con IA (Claude): revisa lo marcado [completar], las cifras y las citas propuestas antes de aprobar.";
  } catch(err) {
    out.value = err && err.text ? err.text : "";
    if (err && (err.code === "not_granted" || err.code === "sampling_disabled")) { out.value = plantilla(m, pieza); note.textContent = "No se autorizó el uso de Claude en esta vista; usamos una plantilla."; }
    else if (err && err.code === "cancelled") note.textContent = "Redacción detenida. Puedes editar lo que alcanzó a escribir.";
    else if (err && err.code === "rate_limited") note.textContent = "Llegaste al límite de uso por ahora. Intenta más tarde.";
    else note.textContent = "No se pudo terminar el borrador. Intenta de nuevo en un momento.";
    setDraft(out.value); save();
  } finally { btn.disabled = false; stop.hidden = true; }
}
async function lectura(btn){
  const c = cuenta(), ms = menciones(c, GP().d), M = metricas(ms), el = $("#lectura");
  const sample = await samplePromise;
  if (!sample) { el.textContent = "La IA no está disponible en esta vista. Abre la página en Claude para redactar la lectura."; return; }
  btn.disabled = true; el.textContent = "Redactando…";
  const datos = ms.slice(0, 25).map(m => `- [${tonoLbl[m.tono]}] ${m.lead.res} (${m.notas.length} medio(s); ${llego(escalera(m.notas)).toLowerCase()})`).join("\n");
  const temas = c.temas.filter(t=>t.activo).map(t => { const sub = ms.filter(m => m.temas.has(t.id)), x = metricas(sub); return `${t.nombre}: ${x.vol} noticias, ${x.cri} críticas, ${llego(escalera(sub.flatMap(m => m.notas))).toLowerCase()}`; }).join("; ");
  try {
    const {text} = await sample(`Eres analista de reputación de PregonIA. Escribe en español de Chile la "lectura del analista" del informe de gestión mensual de ${inst()}. Lo leen el alcalde y su equipo directivo en reunión. Dos párrafos breves: qué temas de gestión marcaron la percepción y por qué, qué temas escalaron de la prensa comunal a la regional o nacional, y dos recomendaciones accionables con el área municipal responsable. Usa solo estos datos, no inventes cifras ni hechos, habla de gestión y servicios, no de la figura del alcalde, y no promuevas a ninguna autoridad ni partido.\n\nCifras del mes: ${M.vol} noticias, tono de la cobertura ${veredicto(M).n.toLowerCase()} (${conteo(M)}).\nPor tema: ${temas}\nResúmenes:\n${datos}`, {onText: ({text}) => { el.textContent = text; }});
    lecturaTxt.gestion = text; el.textContent = text;
  } catch(err) {
    el.textContent = err && err.text ? err.text : (err && err.code === "not_granted" ? "No se autorizó el uso de Claude en esta vista." : "No se pudo redactar la lectura. Intenta de nuevo en un momento.");
  } finally { btn.disabled = false; }
}


/* Ayuda: cómo se usa y preguntas frecuentes */
const AYUDA_VISTA = {
  inicio:["Inicio", "La portada responde cuatro preguntas. Arriba, cómo estamos: un veredicto y cuatro cifras comparadas con el período anterior; elige 24 horas, Semana o 30 días. Luego qué hacer hoy: las críticas por responder, con un dato que ayuda a contestar, y lo positivo para aprovechar. Más abajo, qué temas están cambiando (y asuntos que aún no sigues), qué viene en el calendario y qué medios marcan la agenda. Cada noticia aparece una sola vez."],
  menciones:["Menciones", "Todas las noticias que calzaron con tus temas. Cada noticia aparece una vez aunque la publiquen varios medios. Filtra por tono, período, tema o palabra. \"¿Por qué aparece?\" muestra qué término calzó; \"No corresponde\" la descarta y ayuda a afinar las exclusiones."],
  comunicados:["Comunicados", "Prepara una respuesta en tres decisiones: a qué respondes, qué pieza necesitas y con qué enfoque. La IA redacta solo con la noticia y los datos del municipio; lo que falta queda marcado [completar]. Nada se publica: tú apruebas y difundes. Desde el borrador o la lista de aprobados lo envías en PDF por WhatsApp, por correo (Gmail, Outlook o tu programa) o lo guardas en PDF."],
  temas:["Mis temas", "Los temas que PregonIA vigila. Cada tema tiene términos (lo que se busca), contexto (palabras que deben acompañar) y exclusiones (lo que descarta). Tu plan define cuántos temas activos puedes tener."],
  asistente:["Asistente de temas", "Responde cinco preguntas sobre el municipio y PregonIA propone los temas base de tu plan, más sugerencias para sumar. Revisa la propuesta antes de activarla."],
  fuentes:["Fuentes", "Los medios web del catálogo: nacionales, regionales y comunales de las ocho provincias de la Región de Valparaíso. Cada uno muestra cómo se lee y su estado: listo, requiere ajuste o restringido (se lee vía Google News)."],
  rep_alcalde:["Reportes · Parte del alcalde", "Para el alcalde, cada lunes, en dos minutos. Dice cómo lo trató la prensa en la semana, hasta tres asuntos que se pueden complicar con qué hacer y quién se encarga, y una buena noticia para aprovechar. Se envía en PDF por WhatsApp, por correo o se guarda en PDF, y el botón Video resumen lo convierte en un video corto para el celular."],
  rep_diario:["Reportes · Informe diario", "Indicadores del período (publicaciones, noticias distintas, tono, críticas sin respuesta, alcance, temas y medios) y el clipping: cada mención agrupa las publicaciones del mismo hecho, con un código para citarla y el enlace a cada nota original. Elige últimas 24 horas, hoy o ayer, y compártelo en PDF por WhatsApp o correo."],
  rep_mesa:["Reportes · Mesa de comunicaciones", "Para el encargado de comunicaciones, cada mañana. Críticas sin respuesta, temas que están subiendo de la prensa comunal a la regional o nacional, buenas noticias por difundir y los medios a los que conviene llamar."],
  rep_gestion:["Reportes · Informe de gestión", "Para el alcalde y su equipo, una vez al mes. Tendencia, tono y alcance por tema, comparación interna con las comunas vecinas, lectura del analista y el respaldo con todas las notas."],
  rep_crisis:["Reportes · Episodio crítico", "Se activa solo cuando una noticia crítica se propaga. Muestra cuántos medios la publicaron, hasta dónde llegó, la cronología y si ya hay respuesta aprobada."]
};
const GUIA = [
  ["Elige el municipio", "Usa el selector de la barra superior. Cada municipio ve solo sus datos."],
  ["Define qué vigilar", "En Ajustes, el asistente propone los temas según el perfil del municipio. Puedes ajustar términos, contexto y exclusiones."],
  ["Revisa lo publicado", "En Menciones y en Inicio ves cada noticia con su tono, el medio y hasta dónde llegó: prensa comunal, regional o nacional."],
  ["Responde a tiempo", "\"Preparar respuesta\" abre un borrador hecho con datos del municipio. Lo revisas, completas lo marcado y lo apruebas."],
  ["Informa a quien decide", "En Reportes hay un informe por lector: parte semanal del alcalde, mesa diaria de comunicaciones, informe de gestión mensual y episodio crítico."]
];
const FAQ = [
  ["Avisos", [
    ["¿De qué me avisa PregonIA?", "De tres cosas: una noticia crítica nueva, una noticia crítica que escala de prensa comunal a regional o nacional, y un tema que crece rápido (tres medios en seis horas). Si eliges «Todo», también de las buenas noticias que llegan a prensa regional o nacional. Cada hecho se avisa una sola vez por nivel."],
    ["¿Cómo elijo qué me llega?", "En la campana del encabezado, «Qué te avisamos»: solo lo urgente (pensado para el alcalde), lo crítico (para comunicaciones), todo o nada. El silencio de 23:00 a 7:00 deja pasar solo lo urgente."],
    ["¿Me llegan con PregonIA cerrada?", "En el piloto, sí: una vez configuradas las llaves de avisos en el servidor, al activar los avisos en tu celular te llegan aunque la aplicación esté cerrada, porque los envía la lectura programada cada 30 minutos. Sin esa configuración, llegan mientras PregonIA esté abierta o instalada."],
    ["¿Y en iPhone?", "En iPhone los avisos llegan solo con PregonIA instalada en la pantalla de inicio: en Safari toca Compartir, luego «Agregar a inicio», y activa los avisos desde ese ícono."],
    ["¿Puedo recibirlos por correo?", "Sí, en el piloto, si el municipio configuró el envío de correos. Se manda un correo por lectura con todos los avisos nuevos que te corresponden, no uno por noticia."]
  ]],
  ["Vocería y calendario", [
    ["¿Qué es el kit de vocería?", "Una hoja para una entrevista en minutos: lo que pasó, hasta dónde llegó, qué hacer, tres mensajes con su dato de respaldo, frases a evitar y cinco preguntas probables con respuesta. Ábrelo con «Me llaman de la radio» en Inicio o con «Vocería» en cada noticia. Usa solo los datos del municipio y de la noticia; lo que falte queda marcado [completar]."],
    ["¿De dónde salen los datos del kit?", "De «Datos del municipio», en Comunicados. Mientras más cifras oficiales cargues ahí, con su fecha, mejores mensajes prepara. Los datos de ejemplo aparecen marcados como ficticios."],
    ["¿Qué es el calendario de riesgos?", "Las fechas que se repiten cada año y en las que ciertos temas suelen llegar a la prensa: temporada estival, incendios, temporales, Fiestas Patrias, PADEM, presupuesto. Está en Reportes. Cada fecha trae qué suele pasar, una lista de preparación que puedes marcar y las noticias recientes del tema."],
    ["¿Puedo agregar fechas de mi comuna?", "Sí. En Reportes · Calendario de riesgos, «Agregar fecha propia»: aniversario, fiestas locales o sesiones clave del concejo, con sus palabras clave y lo que hay que preparar."]
  ]],
  ["Monitoreo", [
    ["¿Qué medios revisa PregonIA?", "Más de 100 medios digitales: nacionales, regionales de Valparaíso y comunales de las ocho provincias de la región, más páginas de Facebook de medios locales que se ingresan con captura asistida. La lista completa, con el estado de cada uno, está en Ajustes › Fuentes."],
    ["¿Cada cuánto se actualiza?", "Cada 15 minutos. La barra superior muestra la hora de la última actualización. En este prototipo las noticias son ficticias."],
    ["¿Por qué no aparece una noticia que vi?", "Puede que el medio no esté en el catálogo, que sea un medio restringido (se lee vía Google News y llega con retraso) o que la nota no calce con los términos del tema. Revisa términos, variantes y exclusiones en Ajustes › Mis temas."],
    ["¿Por qué aparece una noticia que no tiene que ver?", "Suele ser una coincidencia de nombre, como Casablanca la película o San Antonio de Texas. Márcala como \"No corresponde\" y agrega esa palabra a las exclusiones del tema."],
    ["¿PregonIA copia las noticias de los medios?", "No. Muestra el título, el medio, la fecha, un resumen propio de una línea y el enlace a la nota original. No reproduce el texto, respeta las reglas de cada sitio y no salta muros de pago."],
    ["¿Revisa redes sociales?", "No las lee por su cuenta. Las publicaciones de Facebook o de grupos vecinales se suman con «Agregar publicación»: pegas el texto o subes una captura y la IA la analiza. En el celular, con PregonIA instalada, basta con tocar Compartir en Facebook y elegir PregonIA."],
    ["¿Cómo instalo PregonIA en el celular?", "En Android, abre pregonia.vercel.app en Chrome y toca «Instalar PregonIA» en Agregar publicación, o el menú de Chrome y luego Instalar aplicación. Desde ese momento aparece en la lista de Compartir de Facebook y otras apps. En iPhone se puede agregar a la pantalla de inicio, pero Safari no permite compartir hacia ella: copia el enlace y usa el botón Pegar."]
  ]],
  ["Lectura de los resultados", [
    ["¿Cómo se decide si una noticia es crítica, neutra o positiva?", "Una IA clasifica el tono de cada noticia respecto del tema vigilado, no del medio en general. Si no estás de acuerdo, puedes marcarlo; esas correcciones sirven para mejorar la clasificación."],
    ["¿Cómo se ordenan las noticias por categoría, enfoque y papel?", "Cada cargo tiene un set fijo de categorías (por ejemplo, un diputado tiene «Proyectos de ley» y «Fiscalización»; un delegado, «Orden público» y «Emergencias»). Cada noticia cae en la categoría con más palabras calzadas, y las del titular pesan el triple; no gasta temas del plan. Además lleva su enfoque (gestión, reclamo, emergencia, probidad, política, judicial u opinión) y el papel de la autoridad: protagonista si la nombra el titular, fuente citada si la cita el texto, mencionada o solo su territorio. Puedes filtrar por las tres en Menciones."],
    ["¿Qué significa \"favorable\" o \"desfavorable\"?", "Es el veredicto del período en cinco niveles, de muy desfavorable a muy favorable. Compara las noticias positivas con las críticas sobre el total: si se compensan, la cobertura es equilibrada. Siempre va con los conteos para que veas de dónde sale."],
    ["¿Qué es \"hasta dónde llegó\"?", "Las tres barras muestran el nivel de prensa más alto que alcanzó una noticia o un tema: comunal, regional o nacional. Un tema que nace en un medio comunal y aparece después en uno regional es una señal temprana de riesgo: todavía se puede contener."],
    ["¿Qué es el alcance?", "Un puntaje que pesa más una nota en un medio nacional que en uno local: nacional vale 3, regional 2 y local 1."],
    ["¿Por qué dice \"muestra pequeña\"?", "Cuando hay menos de 20 noticias, unas pocas notas nuevas pueden cambiar mucho las proporciones. Úsalas como orientación, no como tendencia."],
    ["¿Cómo se eligen los asuntos del parte del alcalde?", "Por riesgo: pesan el tono, el nivel de prensa alcanzado, cuántos medios lo publicaron, si es reciente y si ya tiene respuesta. Se muestran tres como máximo, de temas distintos."],
    ["¿Quién define el responsable sugerido?", "PregonIA lo asigna según las palabras de la noticia (emergencias, agua, salud, obras, entre otras). Es una sugerencia: cada municipio puede ajustar ese mapa a su organigrama."]
  ]],
  ["Comunicados e IA", [
    ["¿La IA publica algo por su cuenta?", "No. Solo prepara borradores. Una persona los revisa, completa y aprueba; publicar o enviar es siempre una decisión del municipio."],
    ["¿De dónde saca los datos la IA?", "Solo de la noticia y de los datos que el municipio carga (cifras, documentos, decisiones). Si falta un dato, lo marca [completar] en vez de inventarlo, y las citas quedan marcadas para validarlas con el vocero."],
    ["¿Qué es una aclaración por Ley 19.733?", "La ley de prensa da derecho a quien fue aludido por información inexacta o injuriosa a que el medio publique su aclaración o rectificación, dentro de los plazos que fija la ley. PregonIA prepara el borrador de la carta; conviene que lo revise el área jurídica antes de enviarlo."],
    ["¿Puede la IA escribir sobre el alcalde?", "Puede redactar comunicados institucionales, pero evita la promoción personal o partidaria. En cuentas municipales advierte cuando un borrador se acerca a eso, por las reglas sobre uso de recursos públicos."]
  ]],
  ["Plan y cuenta", [
    ["¿Qué pasa si llego al límite del plan?", "PregonIA avisa al 80% y al 100% del límite de temas, menciones o borradores. Antes de sumar un paquete conviene ajustar exclusiones; si hace falta, se suma un paquete de 5 temas."],
    ["¿Otros municipios ven mis datos?", "No. Cada cuenta ve solo lo suyo. La comparación con las comunas vecinas usa solo noticias públicas, nunca la configuración ni los datos de otra cuenta."],
    ["¿Cuántas personas pueden usarlo?", "El plan Comunal incluye 3 usuarios y el Regional o Político, 5."],
    ["¿Cómo comparto el parte con el alcalde?", "En Reportes › Parte del alcalde, la barra Compartir lo envía en PDF por WhatsApp o por correo, o lo guarda en PDF en tu computador."],
    ["¿Cómo agrego publicaciones de Facebook?", "En Menciones, el botón Agregar publicación: indicas la página o medio, pegas el enlace y el texto del post, y PregonIA lo analiza como cualquier noticia (tono, resumen, tema, si es el mismo hecho que ya publicó otro medio). Sirve para medios locales que publican solo en Facebook. PregonIA guarda un resumen propio, no el texto del post, y no lee Facebook por su cuenta."],
    ["¿Dónde está el informe diario con el clipping?", "En Reportes › Informe diario. Arriba van los indicadores del período; abajo, el clipping agrupado por mención, con un código para cada una (por ejemplo D-0611-01) y el enlace a cada publicación. Con Noticias reales cada titular abre la nota en el medio. El PDF conserva los enlaces."],
    ["¿Qué es el video resumen?", "En Reportes › Parte del alcalde, el botón Video resumen arma un video vertical de menos de un minuto con el resultado de la semana, los temas con más publicaciones, hasta tres asuntos que se pueden complicar (en qué medios salió, hasta dónde llegó, qué hacer y quién responde) y la buena noticia. Se ve en la pantalla, se prepara en MP4 y se envía por WhatsApp o se descarga. Es para uso interno: no usa fotos ni logos de los medios."],
    ["¿Cómo envío o guardo una respuesta?", "Bajo el borrador está la barra Compartir. En el celular, WhatsApp y Correo abren la hoja de compartir con el PDF adjunto: eliges la app y el contacto. En el computador, WhatsApp abre el chat y guarda el PDF para que lo adjuntes con el clip; Correo te deja elegir Gmail, Outlook o el programa de correo del equipo, con asunto y texto listos. Nada se envía solo: tú eliges a quién."]
  ]],
  ["Autoridades", [
    ["¿Para quién es la versión de autoridades?", "Para alcaldesas y alcaldes, diputadas y diputados, senadoras y senadores, consejeras y consejeros regionales, concejales, el gobernador regional y las delegaciones presidenciales de la Región de Valparaíso, y sus equipos de prensa. Se entra eligiendo el cargo, la zona (distrito, circunscripción o comuna) y el nombre."],
    ["¿Puedo seguir cualquier municipio de la región?", "Sí. En «Municipio / alcaldía» están las 38 comunas de la Región de Valparaíso, por provincia, con su alcalde o alcaldesa del período 2024-2028. La cuenta sigue a la municipalidad, a la comuna y a la persona por su nombre, y con noticias reales la compara con los alcaldes de su provincia. La demostración trae noticias ficticias solo del litoral central."],
    ["¿De dónde sale la lista de nombres?", "Parlamentarios, consejeros regionales y alcaldes vienen precargados según la nómina vigente al " + NOMINA_CORTE + ". Si falta alguien o cambió, elige «Otra persona» y escribe el nombre. Los concejales escriben el suyo."],
    ["¿Qué noticias ve una autoridad?", "Con «Noticias reales», las que la nombran en los medios leídos y en Google News de los últimos 14 días; la IA descarta homónimos y mide el tono respecto de su imagen y su trabajo. En la demostración solo hay noticias ficticias del territorio."],
    ["¿Qué es «Frente a sus pares»?", "Cuántas notas nombraron a cada autoridad del mismo cargo y zona en los últimos 14 días. Mide presencia, no aprobación: una polémica también suma."],
    ["¿Las piezas cambian para una autoridad?", "Sí. Además de declaración, comunicado y aclaración, hay publicación para redes, columna de opinión y minuta de intervención para sala, comisión o pleno. Los textos usan el tono del cargo y nunca inventan cifras ni posiciones: lo que falta queda marcado para completar."],
    ["¿Funciona el piloto con usuarios para autoridades?", "Todavía no: el piloto con usuarios y lectura programada está habilitado para municipios. Las cuentas de autoridad funcionan en este navegador, con noticias reales al vuelo."]
  ]]
];
let helpOpen = false, helpQ = "", helpReturn = null, helpCtl = null;
function ayudaVista(){ const k = route(); return k === "reportes" ? AYUDA_VISTA["rep_" + tState.rep] || AYUDA_VISTA.rep_alcalde : AYUDA_VISTA[k] || AYUDA_VISTA.inicio; }
function faqHtml(){
  const q = norm(helpQ.trim()), grupos = FAQ.map(([g, items]) => [g, items.filter(([p, r]) => !q || norm(p + " " + r).includes(q))]).filter(([, it]) => it.length), n = grupos.reduce((s, [, it]) => s + it.length, 0);
  if (!n) return `<p class="hint">Ninguna pregunta frecuente coincide con «${esc(helpQ)}». Pregúntale a PregonIA más abajo.</p>`;
  return (q ? `<p class="hint">${plural(n, "pregunta coincide", "preguntas coinciden")}.</p>` : "") + grupos.map(([g, items]) => `<div class="hp-grp"><h4>${g}</h4>${items.map(([p, r]) => `<details ${q ? "open" : ""}><summary>${esc(p)}</summary><p>${esc(r)}</p></details>`).join("")}</div>`).join("");
}
function renderHelp(){
  const el = $("#help"); if (!el) return;
  const [t, d] = ayudaVista();
  el.querySelector(".hp-body").innerHTML = `
    <section class="hp-here"><span class="kick">Estás en</span><h3>${esc(t)}</h3><p>${esc(d)}</p></section>
    <section class="hp-apar"><h3 class="hp-h">Apariencia</h3><button class="btn sm" type="button" data-act="tema" id="temaAyuda">${textoTema()}</button></section>
    <section><h3 class="hp-h">Cómo se usa, en cinco pasos</h3><ol class="hp-guia">${GUIA.map(([a, b]) => `<li><b>${a}</b><span>${b}</span></li>`).join("")}</ol></section>
    <section><h3 class="hp-h">Preguntas frecuentes</h3><input id="helpQ" class="hp-q" type="search" placeholder="Busca, por ejemplo: tono, WhatsApp, límite" aria-label="Buscar en las preguntas frecuentes" value="${esc(helpQ)}"><div id="faqOut">${faqHtml()}</div></section>
    <section class="hp-teclado"><h3 class="hp-h">Atajos de teclado</h3><dl class="hp-atajos"><dt><span class="kbd">1</span> a <span class="kbd">5</span></dt><dd>Ir a Inicio, Menciones, Reportes, Comunicados o Ajustes</dd><dt><span class="kbd">/</span></dt><dd>Buscar en las menciones</dd><dt><span class="kbd">?</span></dt><dd>Abrir o cerrar esta ayuda</dd><dt><span class="kbd">Esc</span></dt><dd>Cerrar ventanas y menús</dd></dl></section>
    <section class="hp-ask"><h3 class="hp-h">¿No encuentras la respuesta?</h3><p class="hint" style="margin:0 0 8px">Pregúntale a PregonIA. Responde con la guía y las preguntas frecuentes de este sistema.</p>
      <form id="helpForm"><textarea id="helpAsk" rows="2" placeholder="Por ejemplo: ¿cómo agrego un tema nuevo?" aria-label="Tu pregunta"></textarea><div style="display:flex;gap:8px;margin-top:8px"><button class="btn primary sm" type="submit" id="helpBtn">Preguntar</button><button class="btn sm" type="button" data-act="help-stop" id="helpStop" hidden>Detener</button></div></form>
      <div id="helpAns" class="hp-ans" aria-live="polite" hidden></div></section>
    <section><h3 class="hp-h">Privacidad y condiciones</h3><p class="hint" style="margin:0 0 6px">Cómo tratamos los datos, qué hace la IA y quién procesa la información.</p><ul class="hp-legal" style="margin:0;padding-left:18px;display:grid;gap:4px"><li><a href="/legal.html#privacidad" target="_blank" rel="noopener">Política de privacidad</a></li><li><a href="/legal.html#terminos" target="_blank" rel="noopener">Términos de uso</a></li><li><a href="/legal.html#ia" target="_blank" rel="noopener">Uso de inteligencia artificial</a></li><li><a href="/legal.html#proveedores" target="_blank" rel="noopener">Proveedores que procesan datos</a></li><li><a href="/legal.html#medios" target="_blank" rel="noopener">Medios y derechos de autor</a></li><li><a href="/legal.html#contacto" target="_blank" rel="noopener">Contacto y derechos sobre tus datos</a></li></ul></section>`;
}
function abrirAyuda(){
  helpReturn = document.activeElement; helpOpen = true; renderHelp();
  $("#help").hidden = false; $("#helpBack").hidden = false; document.body.classList.add("hp-on");
  $("#help .hp-x").focus();
}
function cerrarAyuda(){
  helpCtl?.abort(); helpOpen = false; $("#help").hidden = true; $("#helpBack").hidden = true; document.body.classList.remove("hp-on");
  if (helpReturn && helpReturn.focus) helpReturn.focus();
}
async function preguntarAyuda(){
  const q = $("#helpAsk").value.trim(), out = $("#helpAns"), btn = $("#helpBtn"), stop = $("#helpStop"); if (!q) return;
  out.hidden = false;
  const sample = await samplePromise;
  if (!sample) { out.textContent = "La IA no está disponible en esta vista. Abre la página en Claude para preguntarle a PregonIA, o revisa las preguntas frecuentes."; return; }
  const [t, d] = ayudaVista();
  const base = `PANTALLA ACTUAL: ${t}. ${d}\n\nGUÍA:\n${GUIA.map(([a, b], i) => `${i + 1}. ${a}: ${b}`).join("\n")}\n\nPREGUNTAS FRECUENTES:\n${FAQ.flatMap(([g, it]) => it.map(([p, r]) => `[${g}] ${p} ${r}`)).join("\n")}\n\nPANTALLAS: ${Object.values(AYUDA_VISTA).map(([a, b]) => a + ": " + b).join(" | ")}`;
  helpCtl = new AbortController(); btn.disabled = true; stop.hidden = false; out.textContent = "Pensando…";
  try {
    const {text} = await sample(`Eres la ayuda de PregonIA, un sistema que monitorea noticias sobre municipios en medios digitales chilenos. Responde en español de Chile, en tono cordial y directo, en máximo 120 palabras, la pregunta del usuario. Usa solo la información de abajo. Si la respuesta no está, dilo con claridad y sugiere escribir al equipo de ALTkimia; no inventes funciones, cifras ni plazos. Cuando ayude, indica dónde está la opción (por ejemplo: Ajustes › Mis temas).\n\n${base}\n\nPREGUNTA: ${q}`, {signal: helpCtl.signal, cache: false, modelTier: "quick", onText: ({text}) => { out.textContent = text; }});
    out.textContent = text + "\n\n— Respuesta generada con IA. Puede contener errores; confírmala en las preguntas frecuentes.";
  } catch(err) {
    out.textContent = err && err.text ? err.text : err && err.code === "cancelled" ? "Respuesta detenida." : err && err.code === "not_granted" ? "No se autorizó el uso de Claude en esta vista. Revisa las preguntas frecuentes." : err && err.code === "rate_limited" ? "Llegaste al límite de uso por ahora. Intenta más tarde." : "No se pudo responder ahora. Intenta de nuevo en un momento.";
  } finally { btn.disabled = false; stop.hidden = true; }
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  if (b.dataset.act === "help") { helpOpen ? cerrarAyuda() : abrirAyuda(); }
  if (b.dataset.act === "help-close") cerrarAyuda();
  if (b.dataset.act === "help-stop") helpCtl?.abort();
});
document.addEventListener("input", e => { if (e.target.id === "helpQ") { helpQ = e.target.value; $("#faqOut").innerHTML = faqHtml(); } });
document.addEventListener("submit", e => { if (e.target.id === "helpForm") { e.preventDefault(); preguntarAyuda(); } });
document.addEventListener("keydown", e => {
  if (!helpOpen) return;
  if (e.key === "Escape") { e.preventDefault(); cerrarAyuda(); }
  if (e.key === "Enter" && !e.shiftKey && e.target.id === "helpAsk") { e.preventDefault(); preguntarAyuda(); }
  if (e.key === "Tab") { const f = [...$("#help").querySelectorAll('button:not([hidden]):not(:disabled),input,textarea,summary,a[href]')].filter(x => x.offsetParent); if (!f.length) return; const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
});
window.addEventListener("hashchange", () => { if (helpOpen) renderHelp(); });


var PILOTO; // estado del modo piloto (src/piloto.js); var para que exista antes de que ese módulo se cargue
/* Noticias reales (etapa 1): /api/noticias lee los medios del catálogo y la demostración queda a un clic. */
const NOTAS_DEMO = NOTAS.slice(), MODO_KEY = "pregonia-modo";
let MODO = {tipo: "demo", info: null, cargando: false, disponible: false};
const horaCorta = iso => new Date(iso).toLocaleTimeString("es-CL", {hour: "2-digit", minute: "2-digit", hourCycle: "h23"});
function pintarModo(){
  const el = $("#demo"); if (!el) return;
  if (PILOTO && PILOTO.activo) return pintarPiloto();
  const real = MODO.tipo === "real" && MODO.info, i = MODO.info;
  // Selector siempre visible con las dos opciones; en claude.ai (sin servidor) "Reales" lleva al sitio publicado.
  const sw = MODO.disponible || MODO.cargando
    ? `<span class="modo-sw" role="group" aria-label="Noticias que muestra la aplicación"><button type="button" data-act="modo-demo" aria-pressed="${!real && !MODO.cargando}"><span class="demo-mas">Demostración</span><span class="solo-movil">Demo</span></button><button type="button" data-act="modo-real" aria-pressed="${Boolean(real) || MODO.cargando}" ${MODO.cargando ? "disabled" : ""}>${MODO.cargando ? "Leyendo…" : `<span class="demo-mas">Noticias reales</span><span class="solo-movil">Reales</span>`}</button></span>`
    : (/^https?:$/.test(location.protocol) ? "" : `<a class="modo-link" href="https://pregonia.vercel.app/" target="_blank" rel="noopener">Noticias reales en pregonia.vercel.app</a>`);
  if (MODO.cargando) { el.className = "demo"; el.innerHTML = `<span class="demo-txt"><b>Leyendo medios</b>Buscando noticias de ${esc(S.org)}<span class="demo-mas"> en unas 70 fuentes; puede tardar hasta un minuto</span>…</span>${sw}`; return; }
  if (real) { el.className = "demo real"; el.innerHTML = `<span class="demo-txt"><b>Datos reales</b>${plural(i.notas.length, "nota", "notas")}<span class="demo-mas"> de ${esc(i.comuna)} en ${i.ventana_dias} días · ${i.fuentes.leidas} de ${i.fuentes.total} fuentes leídas a las ${horaCorta(i.generado)}${i.ia ? "" : i.ia_parcial ? " · tono clasificado en parte" : " · tono sin clasificar"}</span></span>${sw}`; return; }
  if (!esAut() && !COMUNAS.includes(S.org)) { el.className = "demo"; el.innerHTML = `<span class="demo-txt"><b>Prototipo</b><span class="demo-mas">La demostración trae noticias ficticias solo del litoral central · con «Noticias reales» se leen las de ${esc(S.org)}</span><span class="solo-movil">Datos ficticios</span></span>${sw}`; return; }
  el.className = "demo"; el.innerHTML = esAut()
    ? `<span class="demo-txt"><b>Prototipo</b><span class="demo-mas">Noticias ficticias del territorio, ninguna nombra a ${esc(cuenta().perfil.nombre)} · con «Noticias reales» se leen las que sí</span><span class="solo-movil">Datos ficticios</span></span>${sw}`
    : `<span class="demo-txt"><b>Prototipo</b><span class="demo-mas">Noticias y cifras ficticias · catálogo de más de 100 medios real</span><span class="solo-movil">Datos ficticios</span></span>${sw}`;
}
async function cargarReales(force, silencioso){
  if (PILOTO && PILOTO.activo) return;
  if (MODO.cargando || (MODO.tipo === "real" && MODO.info && MODO.info.comuna === S.org && !force)) return; MODO.cargando = true; MODO.inicio = Date.now(); pintarModo(); render();
  const org = S.org;
  try {
    const pa = esAut() ? cuenta().perfil : null;
    const q = !pa ? "comuna=" + encodeURIComponent(org) : pa.autoridadId ? "autoridad=" + encodeURIComponent(pa.autoridadId) : "rol=" + encodeURIComponent(pa.rol) + "&zona=" + encodeURIComponent(pa.zona) + "&nombre=" + encodeURIComponent(pa.nombre) + "&g=" + pa.g;
    const r = await fetch("/api/noticias?" + q + redesParam()); if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json(); if (PILOTO && PILOTO.activo) { MODO.cargando = false; render(); return; } if (org !== S.org) { MODO.cargando = false; return cargarReales(); }
    const nuevas = (j.notas || []).filter(n => MED[n.m]).map(n => ({id: n.id, m: n.m, ts: n.ts, t: n.t, b: "", x: n.x || "", tono: n.tono, res: n.res, g: String(n.g), url: n.url, ...(n.fuente ? {fuente: n.fuente} : {}), ...(n.via ? {via: n.via} : {}), ...(n.f ? {f: n.f} : {}), hay: norm(n.t + " " + n.res + " " + (n.x || "") + " " + (pa ? (n.sobre === "institucion" ? norm(CARGOS[pa.rol].organo) : pa.variantes[0]) : org + " comuna")), ht: norm(n.t), real: true}));  // la IA ya confirmó que la nota es de esta comuna (o de la autoridad o su institución)
    actualizarEstadoRedes(j.redes);  // estado de cada cuenta de Facebook e Instagram para la vista Fuentes
    MODO = {...MODO, tipo: "real", info: {...j, comuna: org, notas: nuevas}, cargando: false}; refrescarNotas(nuevas);  // el modo primero: los avisos se guardan por modo
    try { localStorage.setItem(MODO_KEY, "real"); } catch(e) {}
    pintarModo(); render();
    if (!silencioso) toast(nuevas.length ? `Listo: ${plural(nuevas.length, "nota real", "notas reales")} de ${org}. Ábrelas en Menciones.` : `Los medios leídos no publicaron sobre ${org} en los últimos ${j.ventana_dias} días.`);
  } catch(e) { MODO.cargando = false; pintarModo(); render(); if (!silencioso) toast("No se pudieron leer los medios ahora. Sigues viendo la demostración."); }
}
/* Ícono animado de carga: un periódico abierto que da vuelta sus páginas (el mismo de assets/periodico-animado.svg).
   La página izquierda es el reflejo exacto de la derecha, así la hoja que pasa calza sin salto. */
const IP_PAG = '<path class="ip-p" d="M32 14H54.5a1.5 1.5 0 0 1 1.5 1.5v33a1.5 1.5 0 0 1-1.5 1.5H32Z"/><line class="ip-t" x1="36" y1="19.5" x2="52" y2="19.5"/><line class="ip-l" x1="36" y1="26" x2="42.5" y2="26"/><line class="ip-l" x1="36" y1="30.5" x2="42.5" y2="30.5"/><line class="ip-l" x1="36" y1="35" x2="42.5" y2="35"/><line class="ip-l" x1="36" y1="39.5" x2="42.5" y2="39.5"/><line class="ip-l" x1="36" y1="44" x2="41" y2="44"/><line class="ip-l" x1="45.5" y1="26" x2="52" y2="26"/><line class="ip-l" x1="45.5" y1="30.5" x2="52" y2="30.5"/><rect class="ip-f" x="45.5" y="34" width="6.5" height="11" rx="1.2"/>';
const icoPeriodico = (px = 20) => `<svg class="ico-per" viewBox="0 0 64 64" width="${px}" height="${px}" aria-hidden="true"><g class="ip-izq">${IP_PAG}</g><g>${IP_PAG}</g><path class="ip-som" d="M32 14H56V50H32Z"/><g class="ip-hoja">${IP_PAG}</g><line class="ip-lomo" x1="32" y1="14" x2="32" y2="50"/></svg>`;
/* Pantalla de lectura: posiciona a PregonIA mientras el servidor lee los medios y la IA clasifica.
   Siete diarios de colores giran en órbita; uno a la vez pasa al centro, se abre y se le dan vuelta las páginas;
   al terminar queda con visto en la órbita y entra el siguiente. Sin movimiento si el sistema lo pide. */
const DIARIOS = [
  {n: "DIARIO", c: "#1976D2", p: "#E3F0FB"}, {n: "NOTICIAS", c: "#D9443C", p: "#FBE7E5"}, {n: "CRÓNICA", c: "#2E9E6B", p: "#E2F4EA"},
  {n: "GACETA", c: "#C98A0B", p: "#FBF0D9"}, {n: "EL PREGÓN", c: "#7B4BC4", p: "#EFE7FA"}, {n: "SEMANARIO", c: "#0F8C99", p: "#DDF2F4"}, {n: "LA VOZ", c: "#E0598B", p: "#FBE5EE"}
];
const PR_ORB = 7, PR_MS = 2600;  // 3 páginas por diario
function diarioMini(d, i){
  // Edición · Edición: diarios en blanco y negro (papel, cabezal en tinta, foto gris); los colores salen del modo claro u oscuro.
  const ln = (y, w) => `<rect class="dm-l" x="5" y="${y}" width="${w}" height="2" rx="1"/>`;
  return `<svg viewBox="0 0 40 50" aria-hidden="true"><rect class="dm-papel" x=".75" y=".75" width="38.5" height="48.5" rx="3"/><rect class="dm-cab" x="5" y="4.5" width="30" height="3.5" rx="1"/><rect class="dm-filete" x="5" y="10" width="30" height="1"/>
    <rect class="dm-foto" x="5" y="15" width="${i % 2 ? 30 : 14}" height="${i % 2 ? 10 : 14}" rx="1.5"/>${i % 2 ? ln(29, 30) + ln(33, 26) : ln(16, 12) + ln(20, 12) + ln(24, 10)}${ln(37, 30)}${ln(41, 24)}</svg>`;
}
const prPagina = lado => `<div class="pr-pag ${lado}">${[0, 1, 2, 3, 4, 5].map(k => `<i style="width:${[86, 70, 92, 64, 88, 74][(k + (lado === "der" ? 2 : 0)) % 6]}%"></i>`).join("")}</div>`;
function prLibro(d){
  return `<div class="pr-libro" style="--c:var(--ink);--p:var(--surface)"><div class="pr-cab"><span>${d.n}</span></div>
    <div class="pr-abierto">${prPagina("izq")}${prPagina("der")}<div class="pr-hoja"><div class="pr-cara fr">${prPagina("der")}</div><div class="pr-cara re">${prPagina("izq")}</div></div></div></div>`;
}
const PR_PASOS = [[0, "Leyendo los medios nacionales, regionales y locales…"], [8, "Juntando la misma noticia publicada en varios medios…"], [18, "La IA está leyendo el tono y escribiendo resúmenes propios…"], [32, "Ordenando por alcance y preparando qué conviene hacer…"], [55, "Unos segundos más: hay muchas fuentes para revisar…"]];
function procesandoHtml(){
  const quien = esAut() ? cuenta().perfil.nombre : S.org, hoy = new Date(NOW).toLocaleDateString("es-CL", {weekday: "long", day: "numeric", month: "long"});
  const orbita = DIARIOS.map((d, i) => `<span class="pr-o${i ? "" : " leyendo"}" style="--a:${i * 360 / PR_ORB}deg"><span class="pr-oi">${diarioMini(d, i)}<span class="pr-ok">✓</span></span></span>`).join("");
  return `<section class="pr" role="status" aria-live="polite" aria-labelledby="prT">
    <div class="pr-circ" aria-hidden="true"><span class="pr-pista"></span><div class="pr-orbita">${orbita}</div><div class="pr-centro" id="prCentro">${prLibro(DIARIOS[0])}</div></div>
    <span class="ini-ekick">Leyendo la prensa · ${esc(hoy)}</span>
    <h2 id="prT" class="pr-t" tabindex="-1">Estamos leyendo la prensa por ti</h2>
    <p class="pr-s">Más de 100 medios nacionales, regionales y locales en una sola lectura: qué se dice de <b>${esc(quien)}</b>, hasta dónde llegó y qué conviene hacer.</p>
    <p class="pr-paso">${icoPeriodico(24)}<span id="prPaso">${PR_PASOS[0][1]}</span></p>
    <p class="pr-nota" id="prNota">Suele tardar menos de un minuto.</p>
  </section>`;
}
function procesandoPaso(){
  clearInterval(procesandoPaso.t); clearInterval(procesandoPaso.l);
  const tick = () => { const el = $("#prPaso"); if (!el || !MODO.cargando) { clearInterval(procesandoPaso.t); return; }
    const seg = Math.round((Date.now() - (MODO.inicio || Date.now())) / 1000), p = PR_PASOS.filter(x => seg >= x[0]).pop()[1];
    if (el.textContent !== p) el.textContent = p; const n = $("#prNota"); if (n) n.textContent = seg < 5 ? "Suele tardar menos de un minuto." : `Llevamos ${seg} s · suele tardar menos de un minuto.`; };
  // Un diario a la vez: el leído queda con visto en la órbita y el siguiente pasa al centro. Al completar la vuelta, empieza otra tanda.
  let i = 0; const leer = () => { const c = $("#prCentro"); if (!c || !MODO.cargando) { clearInterval(procesandoPaso.l); return; }
    const os = [...document.querySelectorAll(".pr-o")]; os[i].classList.remove("leyendo"); os[i].classList.add("leido");
    i = (i + 1) % PR_ORB; if (!i) os.forEach(o => o.classList.remove("leido"));
    os[i].classList.add("leyendo"); c.innerHTML = prLibro(DIARIOS[i]); };
  tick(); procesandoPaso.t = setInterval(tick, 1000); procesandoPaso.l = setInterval(leer, PR_MS);
}
function usarDemo(){ if (MODO.tipo === "demo") return; MODO = {...MODO, tipo: "demo", info: null}; refrescarNotas(NOTAS_DEMO); try { localStorage.setItem(MODO_KEY, "demo"); } catch(e) {} pintarModo(); render(); toast("Volviste a la demostración con noticias ficticias."); }
document.addEventListener("click", e => { const b = e.target.closest("[data-act]"); if (!b) return; if (b.dataset.act === "modo-real") cargarReales(); if (b.dataset.act === "modo-demo") usarDemo(); });
$("#org").addEventListener("change", () => { if ($("#entBack")) return; pintarModo(); if (MODO.tipo === "real" || ((esAut() || !COMUNAS.includes(S.org)) && MODO.disponible)) cargarReales(true); });  // sin noticias ficticias propias, se leen las reales  // con el selector de cuentas abierto no hay cambio todavía
(async () => {
  pintarModo();
  if (!/^https?:$/.test(location.protocol)) return;
  try { const r = await fetch("/api/noticias?ping=1", {cache: "no-store"}); if (!r.ok || !(await r.json()).ok) return; } catch(e) { return; }
  MODO.disponible = true; pintarModo();
  let pref = null; try { pref = localStorage.getItem(MODO_KEY); } catch(e) {}
  if (pref === "real") cargarReales();
})();

/* Edición: un solo diseño (Edición) en versión clara y oscura. Sin preferencia guardada sigue al teléfono; el botón la fija. */
const TEMA_KEY = "pregonia-modo", ICO_TEMA = {sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>', luna: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'};
const mqOscuro = matchMedia("(prefers-color-scheme: dark)");
function modoGuardado(){ try { const m = localStorage.getItem(TEMA_KEY); return m === "oscuro" || m === "claro" ? m : null; } catch(e) { return null; } }
function modoActual(){ return document.documentElement.getAttribute("data-modo") === "oscuro" ? "oscuro" : "claro"; }
function textoTema(){ return "Usar modo " + (modoActual() === "oscuro" ? "claro" : "oscuro"); }
function aplicarModo(m){ const r = document.documentElement; r.setAttribute("data-theme", "editorial"); r.setAttribute("data-modo", m); const tc = document.querySelector('meta[name="theme-color"]'); if (tc) tc.setAttribute("content", m === "oscuro" ? "#121212" : "#FFFFFF"); }
function pintarTema(){ const osc = modoActual() === "oscuro", b = $("#temaBtn"), ba = $("#temaAyuda"); if (ba) ba.textContent = textoTema(); if (!b) return; $("#temaIco").innerHTML = osc ? ICO_TEMA.sol : ICO_TEMA.luna; b.setAttribute("aria-label", "Cambiar a modo " + (osc ? "claro" : "oscuro")); b.title = "Cambiar a modo " + (osc ? "claro" : "oscuro"); }
aplicarModo(modoGuardado() || (mqOscuro.matches ? "oscuro" : "claro"));
pintarTema();
try { mqOscuro.addEventListener("change", e => { if (!modoGuardado()) aplicarModo(e.matches ? "oscuro" : "claro"); }); } catch(e) {}
new MutationObserver(pintarTema).observe(document.documentElement, {attributes: true, attributeFilter: ["data-modo"]});
/* Volver arriba: aparece en páginas largas, por encima de la barra inferior en el celular. */
addEventListener("scroll", () => { const b = $("#arriba"); if (b) b.hidden = scrollY < innerHeight * 0.9 || document.body.classList.contains("pt-on"); }, {passive: true});
function irAlContenido(){ const h = $("#view h2") || $("#view"); h.setAttribute("tabindex", "-1"); h.focus({preventScroll: true}); }
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return; const a = b.dataset.act;
  if (a === "tema") { const n = modoActual() === "oscuro" ? "claro" : "oscuro"; aplicarModo(n); try { localStorage.setItem(TEMA_KEY, n); } catch(err) {} toast("Modo " + n + " activado."); }
  if (a === "skip") irAlContenido();
  if (a === "arriba") { scrollTo({top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"}); irAlContenido(); }
});
/* Atajos: 1 a 5 cambian de sección, / busca en menciones, ? abre la ayuda. Nunca mientras se escribe ni con ventanas abiertas. */
document.addEventListener("keydown", e => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
  const el = e.target; if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
  if (document.body.classList.contains("pt-on") || document.body.classList.contains("vid-on") || $("#shrPop")) return;
  if (e.key === "?") { e.preventDefault(); helpOpen ? cerrarAyuda() : abrirAyuda(); return; }
  if (helpOpen) return;
  const sec = ["inicio", "menciones", "reportes", "comunicados", "temas"][Number(e.key) - 1];
  if (sec) { e.preventDefault(); if (location.hash !== "#" + sec) location.hash = sec; return; }
  if (e.key === "/") { e.preventDefault(); const q = () => { const i = $("#fQ"); if (i) { i.focus(); i.select(); } }; if (route() === "menciones") q(); else { location.hash = "menciones"; setTimeout(q, 80); } }
});

/* Portada de bienvenida: aparece cada vez que se abre o recarga la aplicación, y con #portada o el logo.
   Sin sesión ofrece dos puertas: «Ver demostración» (aviso legal y elección de autoridad o municipio) e «Ingresar» (equipos con invitación).
   Con sesión del piloto, una sola: «Entrar a mi edición», directo a su institución. Ambas llevan a la sección de la dirección
   si había una (enlaces compartidos); si no, a Inicio. */

/* Edición · Miniatura de la edición del día en la portada.
   Sin sesión del piloto: siempre "Comuna de Ejemplo" con datos de ejemplo (nunca un municipio real, ni el de la demo).
   Con sesión: la edición del municipio de esa persona, con sus datos; mientras cargan, un bloque de espera. */
function miniPortadaHtml(M, pend, kick, sello){
  const v = veredicto(M), tit = M.vol ? `Cobertura ${v.n.toLowerCase()} hoy${pend ? ", con " + plural(pend, "crítica por responder", "críticas por responder") : ""}.` : "Sin noticias en las últimas 24 horas.";
  return `${sello ? '<span class="pd-sello">Datos de ejemplo</span>' : ""}<p class="pd-mini-k">${esc(kick)}</p><p class="pd-mini-t">${esc(tit)}</p>
    <div class="pd-mini-c"><div><b>${M.vol}</b><small>${M.vol === 1 ? "noticia" : "noticias"} en 24 horas</small></div>
    <div><b class="${v.k}">${esc(v.c)}</b>${segbar([{l: "Críticas", v: M.cri, c: "var(--cri)"}, {l: "Neutras", v: M.neu, c: "var(--neu)"}, {l: "Positivas", v: M.pos, c: "var(--pos)"}])}<small class="cnt">${esc(conteo(M))}</small></div>
    <div><b class="${pend ? "cri" : "pos"}">${pend}</b><small>${pend === 1 ? "crítica" : "críticas"} por responder</small></div></div>`;
}
function pintarMini(){
  const box = $("#ptMini"), pie = $("#ptMiniPie"); if (!box) return;
  const piloto = typeof PILOTO !== "undefined" && PILOTO && PILOTO.activo;
  if (piloto && (MODO.cargando || MODO.tipo !== "piloto")) { box.className = "pd-mini espera"; box.textContent = "Preparando tu edición de hoy…"; pie.textContent = ""; return; }
  box.className = "pd-mini";
  if (piloto) {
    const c = cuenta(), ms = sobreCuenta(menciones(c, 1), c), M = metricas(ms), pend = pendientes(c).length;
    box.innerHTML = miniPortadaHtml(M, pend, `Edición ${S.org} · hoy`, false);
    pie.textContent = `Tu edición de hoy, con las noticias de ${S.org}.`;
  } else {
    box.innerHTML = miniPortadaHtml({vol: 12, pos: 7, neu: 4, cri: 1, neto: 50}, 1, "Edición Comuna de Ejemplo · hoy", true);
    pie.textContent = "Así se ve la edición de cada día para un municipio. Comuna y cifras de ejemplo.";
  }
}
function pintarAccesoPortada(){
  const go = $("#ptGo"); if (!go) return;
  const pl = typeof PILOTO !== "undefined" && PILOTO, dentro = !!(pl && pl.activo);
  $("#ptGoTx").textContent = dentro ? "Entrar a mi edición" : "Ver demostración";
  $("#ptIn").hidden = dentro || !(pl && pl.disponible);  // sin Supabase configurado (por ejemplo, el archivo suelto) no hay a qué ingresar
  $("#ptPiloto").hidden = dentro;
  $("#ptEstado").textContent = dentro ? "Edición de " + pl.muni.nombre : "Demostración con noticias ficticias";
}
function salirPortada(){ mostrarPortada(false); if (!location.hash || location.hash === "#portada") location.hash = "inicio"; }
function mostrarPortada(on){
  const p = $("#portada"); if (!p) return;
  if (on) { pintarMini(); pintarAccesoPortada(); }
  p.hidden = !on; document.body.classList.toggle("pt-on", on);
  if (on) { window.scrollTo(0, 0); setTimeout(() => $("#ptGo").focus({preventScroll:true}), 60); }
}
document.addEventListener("click", e => {
  if (!e.target.closest("#ptGo")) return;
  if (typeof PILOTO !== "undefined" && PILOTO && PILOTO.activo) return salirPortada();  // con sesión: directo a su institución
  // Demostración: antes de entrar se muestra el aviso legal; con sesión iniciada lo cubre el registro en la base.
  avisoLegal().then(ok => { if (ok) entAbrir(true); });  // la entrada se elige por rol, zona y nombre
});
window.addEventListener("hashchange", () => { if (location.hash === "#portada") mostrarPortada(true); });
/* Edición · Fecha del cabezal de la portada, como la de un diario. */
(() => { const f = $("#ptFecha"); if (!f) return; const d = new Date().toLocaleDateString("es-CL", {weekday: "long", day: "numeric", month: "long", year: "numeric"}); f.textContent = d.charAt(0).toUpperCase() + d.slice(1); })();

render();
mostrarPortada(!/[?&](sin-portada|ingresar)\b/.test(location.search));  // ?ingresar llega desde /servicio: va directo al acceso de clientes


NOTAS.forEach(n => { n.g = String(n.g); });

/* Catálogos del motor de sugerencia (forma de lectura; la comparación ignora tildes y mayúsculas) */
const CTX = ["comuna","vecinos","vecinas","municipio","municipalidad","alcalde","alcaldesa","concejo","litoral","provincia","región","sector","plaza","temporada","playa","Senapred","Carabineros","bomberos","Cesfam","agricultores","viña","feria","calles","borde costero","paseo","humedal","regata","cuenca","Las Cruces","Pinomar","Llolleo","Barrancas","Lo Ovalle","Los Maitenes","Lagunillas","Quintay"];
const EXC = {"Casablanca":["Marruecos","película","Bogart"],"San Antonio":["Texas","Spurs","NBA","San Antonio de Padua"],"Cartagena":["Cartagena de Indias","Colombia","Murcia"],"Algarrobo":["Argentina","especie arbórea","árbol"],"El Quisco":[],"El Tabo":[]};
const AGENDA = {"Casablanca":["Polideportivo","Plataforma logística"],"San Antonio":["Puerto Exterior","Borde costero"],"Cartagena":["Playa Grande","Patrimonio"],"El Quisco":["Plan regulador"],"El Tabo":["Las Cruces"],"Algarrobo":["Humedal"]};
const SENS = {
  agua:{n:"Agua y sequía", t:["agua","sequía","escasez hídrica","corte de agua","aljibe","agua potable"]},
  emergencias:{n:"Emergencias e incendios", t:["incendio","emergencia","Senapred","marejada","bomberos"]},
  seguridad:{n:"Seguridad", t:["seguridad","patrullaje","Carabineros","robo"]},
  salud:{n:"Salud municipal", t:["Cesfam","salud"]},
  educacion:{n:"Educación municipal", t:["colegio","escuela","liceo","educación"]},
  transito:{n:"Calles, tránsito y rutas", t:["Ruta 68","congestión","tránsito","calles","veredas","transporte"]},
  aseo:{n:"Aseo y residuos", t:["basura","microbasural","reciclaje","recolección"]},
  turismo:{n:"Turismo y temporada", t:["turismo","temporada","visitantes","playa","Vendimia","ocupación","fiesta"]}
};
const CRIT = ["incendio","emergencia","reclam","denuncia","paraliz","corte de agua","marejada","critic","robo"];

const reCache = new Map();
function termRe(t){ const k = norm(t); if (!reCache.has(k)) reCache.set(k, new RegExp("(^|[^a-z0-9])" + k.replace(/[.*+?^${}()|[\]\\]/g,"\\$&") + "($|[^a-z0-9])")); return reCache.get(k); }
function matchTema(tema, n){
  const found = tema.terminos.filter(t => t && termRe(t).test(n.hay));
  if (!found.length) return null;
  if (tema.exclusiones.some(e => e && termRe(e).test(n.hay))) return null;
  if (tema.contexto.length && !tema.contexto.some(c => c && termRe(c).test(n.hay))) return null;
  return {found, enTitulo: found.some(t => termRe(t).test(n.ht))};
}
const uid = () => Math.random().toString(36).slice(2, 9);
function T(nombre, origen, terminos, contexto=[], exclusiones=[], extra={}){ return {id: uid(), nombre, origen, terminos, contexto, exclusiones, activo: true, ...extra}; }
function candidatos(perfil){
  const c = perfil.comuna;
  const nucleo = [
    T("Municipalidad de " + c, "Núcleo", ["Municipalidad de " + c, "Municipio de " + c]),
    T(perfil.autoridad ? perfil.autoridad : "Alcalde de " + c, "Núcleo", ["Alcalde de " + c, "Alcaldesa de " + c].concat(perfil.autoridad ? [perfil.autoridad] : [])),
    T(c + " (comuna)", "Núcleo", [c], CTX.slice(), (EXC[c] || []).slice())
  ];
  const otros = [ T("Concejo municipal", "Candidato", ["concejo municipal","concejal","concejala","concejales"], [c]) ];
  perfil.agenda.forEach(a => { if (a.trim()) otros.push(T(a.trim(), "Agenda", [a.trim()], norm(a).includes(norm(c)) ? [] : [c])); });
  Object.entries(SENS).forEach(([key, s]) => otros.push(T(s.n, perfil.sens.includes(key) ? "Sensibilidad" : "Descubrimiento", s.t.slice(), [c], [], {sens: key})));
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
  return {base: nucleo.concat(orden.slice(0, libres)), sugeridos: orden.slice(libres, libres + 5)};
}

/* Estado por municipio (aislado) */
const KEY = "pregonia-demo-v2";
function defaults(){
  const s = {org: "Casablanca", cuentas: {}, comunicados: [], fp: {}, resp: {}};
  COMUNAS.forEach(c => {
    const perfil = {tipo: "Municipio", comuna: c, autoridad: "", agenda: AGENDA[c].slice(), sens: ["agua","emergencias","seguridad"], plan: "comunal"};
    const p = proponer(perfil);
    s.cuentas[c] = {perfil, temas: p.base, sugeridos: p.sugeridos, borradores: 0, caracterizada: false, visto: false, onbOculto: false};
  });
  return s;
}
let S;
try { const raw = localStorage.getItem(KEY); S = raw ? JSON.parse(raw) : defaults(); if (!S.cuentas || !S.cuentas.Casablanca) S = defaults(); } catch(e) { S = defaults(); }
S.resp ||= {}; S.fp ||= {};
function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e) {} }
const cuenta = () => S.cuentas[S.org];
const respondida = g => !!S.resp[S.org + ":" + g];

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
    const tonos = g.notas.map(n => n.tono);
    const tono = tonos.includes("cri") ? "cri" : (tonos.includes("pos") ? "pos" : "neu");
    const critico = tono === "cri" && g.notas.some(n => CRIT.some(w => n.hay.includes(w)));
    return {...g, lead, tono, critico, first: g.notas[0].ts, last: g.notas[g.notas.length-1].ts, alcance: g.notas.reduce((s,n) => s + PESO[MED[n.m].l], 0)};
  }).sort((a,b) => b.last - a.last);
}
function metricas(ms){
  const vol = ms.length, pos = ms.filter(m => m.tono==="pos").length, cri = ms.filter(m => m.tono==="cri").length, neu = vol - pos - cri;
  return {vol, pos, neu, cri, neto: vol ? Math.round((pos - cri) / vol * 100) : 0, alcance: ms.reduce((s,m) => s + m.alcance, 0)};
}
const pendientes = (c = cuenta()) => menciones(c, 7).filter(m => m.critico && !respondida(m.g));
function genericaComuna(c){ return {id:"g-"+norm(c), nombre:c, terminos:[c, "Municipalidad de "+c], contexto: CTX, exclusiones: EXC[c]||[], activo:true}; }

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
const CONFIG = [["temas","Mis temas"],["asistente","Asistente de temas"],["fuentes","Fuentes"]];
const ALIAS = {panel:"inicio", caracterizacion:"asistente"};
const route = () => { const k = (location.hash || "#inicio").slice(1); return ALIAS[k] || k; };
const isConfig = k => CONFIG.some(([x]) => x === k);
let tState = {tema:"todos", tono:"todos", dias:"30", q:"", rep:"alcalde", draft:null, from:null, pieza:null, enf:null, open:{}, ctxAll:{}, refocus:null, fuente:{a:"todos", e:"todos"}};
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
const medioN = n => MED[n.m].n + (n.via === "facebook" || MED[n.m].t === "Facebook" ? " · Facebook" : MED[n.m].e === "restringido" ? " (vía Google News)" : "");
const signo = n => (n > 0 ? "+" : "") + n;
const plural = (n, s, p) => n + " " + (n === 1 ? s : p);
/* Balance del tono: veredicto en cinco niveles. El índice (positivas − críticas) / total solo decide el nivel; el usuario ve palabras y conteos. */
const VER = [[40,"Muy favorable","claramente más a favor que en contra","Muy a favor"],[10,"Favorable","más a favor que en contra","A favor"],[-9,"Equilibrada","lo positivo y lo crítico se compensan","Equilibrado"],[-39,"Desfavorable","más en contra que a favor","En contra"],[-101,"Muy desfavorable","claramente más en contra que a favor","Muy en contra"]];
function veredicto(M){ if (!M.vol) return {n:"Sin noticias", f:"no hubo noticias en el período", c:"Sin datos", k:"neu", i:-1}; const i = VER.findIndex(x => M.neto >= x[0]), v = VER[i]; return {n:v[1], f:v[2], c:v[3], k: i <= 1 ? "pos" : i >= 3 ? "cri" : "neu", i}; }
const conteo = M => `${plural(M.pos,"positiva","positivas")} · ${plural(M.neu,"neutra","neutras")} · ${plural(M.cri,"crítica","críticas")}`;

function renderChrome(){
  const k = route(), cfg = isConfig(k);
  $("#org").innerHTML = COMUNAS.map(c => `<option ${c===S.org?"selected":""}>${c}</option>`).join("");
  const c = cuenta(), pl = PLANES[c.perfil.plan];
  $("#planLbl").textContent = "Plan " + pl.nombre + " · " + clp(pl.precio) + "/mes";
  const act = c.temas.filter(t => t.activo).length, usoMenc = menciones(c).reduce((s,m) => s + m.notas.length, 0);
  $("#usage").innerHTML = [["Temas", act, pl.temas],["Menciones del mes", usoMenc, pl.menciones],["Borradores", c.borradores||0, pl.borradores]].map(([n,v,mx]) => `<div class="row"><span>${n}</span><span class="mono">${fmt(v)} de ${fmt(mx)}</span></div><span class="bar ${v>=mx?"full":""}" aria-hidden="true"><i style="width:${Math.min(100, v/mx*100)}%"></i></span>`).join("") + (act >= pl.temas && c.sugeridos.length ? `<a href="#temas">Sumar más temas</a>` : "");
  const pend = pendientes().length;
  const link = ([key, name], ic, cnt) => `<a href="#${key}" ${key===k || (key==="temas" && cfg) ? 'aria-current="page"' : ""}>${icon(ic)}<span>${name}</span>${cnt ? `<span class="count" aria-label="${cnt} por revisar">${cnt}</span>` : ""}</a>`;
  $("#nav").innerHTML = MAIN.map(x => link(x, x[0], x[0]==="menciones" ? pend : 0)).join("") + link(["temas","Ajustes"], "config", 0);
  $("#fecha").textContent = "Monitoreando 100 medios · actualizado " + new Date(NOW - 7*60000).toLocaleTimeString("es-CL", {hour:"2-digit", minute:"2-digit", hourCycle:"h23"});
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
function vInicio(){
  const c = cuenta(), ms = menciones(c), M = metricas(ms), pend = pendientes(c), v = veredicto(M);
  const medios = {}; ms.forEach(m => m.notas.forEach(n => medios[n.m] = (medios[n.m]||0) + 1));
  const topM = Object.entries(medios).sort((a,b) => b[1]-a[1]).slice(0,6);
  const sem = ms.filter(m => NOW - m.last < 7*DAY);
  const lead = pend[0] || sem.slice().sort((a,b) => b.notas.length - a.notas.length || b.last - a.last)[0] || ms[0];
  const otras = pend.slice(1, 4);
  const ultimas = ms.flatMap(m => m.notas).sort((a,b) => b.ts - a.ts).slice(0, 8);
  const hhmm = ts => NOW - ts < DAY ? new Date(ts).toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit",hourCycle:"h23"}) : dia(ts) === "Ayer" ? "Ayer" : new Date(ts).toLocaleDateString("es-CL",{day:"numeric",month:"short"});
  const secciones = c.temas.filter(t => t.activo).map(t => { const sub = ms.filter(m => m.temas.has(t.id)).sort((a,b) => b.last - a.last); return {t, sub, M: metricas(sub)}; }).sort((a,b) => b.sub.length - a.sub.length);
  const leadHtml = !lead ? `<article class="dg-lead"><p class="dg-kick">Sin noticias</p><h3 class="dg-h1">Ningún medio publicó sobre ${esc(S.org)} en los últimos 30 días.</h3></article>` : (() => { const e = escalera(lead.notas), k24 = new Set(lead.notas.filter(n => n.ts - lead.first < DAY).map(n => n.m)).size, esPend = pend.includes(lead);
    return `<article class="dg-lead ${lead.tono}">
      <div class="dg-lead-tx">
        <p class="dg-kick ${lead.tono}">${esPend ? "Requiere respuesta · " : "Lo más publicado de la semana · "}${esc(temaDe(lead))}</p>
        <h3 class="dg-h1">${esc(lead.lead.t)}</h3>
        <p class="dg-bajada">${esc(lead.lead.res)}</p>
        <p class="dg-meta">${pillTono(lead.tono)}<span>${esc(medioN(lead.lead))}</span><span>${ago(lead.last)}</span>${lead.notas.length > 1 ? `<span>en ${lead.notas.length} medios</span>` : ""}</p>
        <div class="dg-acts">${esPend ? `<button class="btn primary" data-act="responder" data-g="${lead.g}" data-from="inicio">Preparar respuesta</button>` : ""}<button class="btn" data-act="goto" data-tono="todos" data-dias="7">Ver la cobertura</button></div>
      </div>
      <aside class="dg-ficha" aria-label="Datos de la noticia"><span class="dg-ficha-n">${k24}</span><span class="dg-ficha-l">${k24 === 1 ? "medio la publicó" : "medios la publicaron"} en 24 horas</span>${escHtml(e, true)}<span class="dg-ficha-l">${esc(ruta(e))}</span></aside>
    </article>`; })();
  return `${onboarding()}
  <header class="dg-ed">
    <div class="dg-ed-row"><span class="dg-kick">Edición ${esc(S.org)}</span><span>${new Date(NOW).toLocaleDateString("es-CL",{weekday:"long", day:"numeric", month:"long", year:"numeric"})}</span><span>Actualizado ${new Date(NOW - 7*60000).toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit",hourCycle:"h23"})}</span></div>
    <h2 tabindex="-1">${esc(S.org)}, hoy</h2>
    <p class="dg-sum">${pend.length ? `<b class="c">${pend.length} ${pend.length===1?"noticia crítica":"noticias críticas"}</b> sin responder esta semana.` : "Sin noticias críticas pendientes esta semana."} En 30 días, ${plural(M.vol,"noticia","noticias")} sobre la comuna en ${plural(Object.keys(medios).length,"medio","medios")}; la cobertura fue <b>${v.n.toLowerCase()}</b>.</p>
  </header>
  ${ultimas.length ? `<section class="dg-ticker" aria-label="Lo último"><span class="dg-ticker-l"><i class="dot" aria-hidden="true"></i>Lo último</span><ul>${ultimas.map(n => `<li><time>${hhmm(n.ts)}</time><span>${esc(n.t)}</span><em>${esc(MED[n.m].n)}</em></li>`).join("")}</ul></section>` : ""}
  <section class="dg-ind" aria-label="Indicadores">
    <button data-act="goto" data-tono="todos" data-dias="30"><span class="l">Noticias · 30 días</span><span class="v">${M.vol}</span><span class="s">en ${plural(Object.keys(medios).length,"medio","medios")}, sin réplicas</span></button>
    <button data-act="goto" data-tono="cri" data-dias="30"><span class="l">Tono de la cobertura</span><span class="v word ${v.k}">${v.n}</span>${escala(v.i)}</button>
    <button data-act="goto" data-tono="todos" data-dias="30" title="Alcance ponderado: medio nacional ×3, regional ×2, local ×1"><span class="l">Alcance</span><span class="v">${fmt(M.alcance)}</span><span class="s">nacional ×3 · regional ×2 · local ×1</span></button>
    <button data-act="goto" data-tono="cri" data-dias="7" class="${pend.length ? "alerta" : ""}"><span class="l">Por responder</span><span class="v">${pend.length}</span><span class="s">críticas de la última semana</span></button>
  </section>
  <section class="dg-portada" aria-labelledby="hoyT">
    <h3 class="dg-sec" id="hoyT">Para revisar hoy</h3>
    <div class="dg-portada-g ${otras.length ? "" : "solo"}">
      ${leadHtml}
      ${otras.length ? `<div class="dg-col"><p class="dg-sec-s">También requieren respuesta</p>${otras.map(m => `<article class="dg-sec-n ${m.tono}"><p class="dg-kick ${m.tono}">${esc(temaDe(m))}</p><h4>${esc(m.lead.t)}</h4><p class="dg-meta"><span>${esc(medioN(m.lead))}</span><span>${ago(m.last)}</span></p>${escHtml(escalera(m.notas))}<button class="btn sm" data-act="responder" data-g="${m.g}" data-from="inicio">Preparar respuesta</button></article>`).join("")}${pend.length > 4 ? `<a class="btn ghost sm" href="#menciones" data-act="ver-criticas">Ver las ${pend.length}</a>` : ""}</div>` : ""}
    </div>
    ${!pend.length ? `<div class="allgood" style="margin-top:12px">${ri("ok")} Todo al día: nada crítico sin responder en los últimos 7 días.</div>` : ""}
  </section>
  <section aria-labelledby="secT">
    <h3 class="dg-sec" id="secT">Por tema</h3>
    <div class="dg-temas">${secciones.map(x => { const m = x.sub[0]; return `<button class="dg-tema" data-act="goto-tema" data-id="${x.t.id}" aria-label="${esc(x.t.nombre)}: ${x.sub.length} noticias, ${x.M.cri} críticas">
      <span class="dg-tema-h"><span class="dg-kick">${esc(x.t.nombre)}</span><span class="dg-tema-c">${x.sub.length}<small>${x.M.cri ? ` · ${x.M.cri} crít.` : ""}</small></span></span>
      ${m ? `<span class="dg-tema-t">${esc(m.lead.t)}</span><span class="dg-meta">${pillTono(m.tono)}<span>${esc(MED[m.lead.m].n)} · ${ago(m.last)}</span></span>` : `<span class="dg-tema-t muted">Sin noticias en 30 días</span>`}
      ${segbar([{l:"Críticas", v:x.M.cri, c:"var(--cri)"},{l:"Neutras", v:x.M.neu, c:"var(--neu)"},{l:"Positivas", v:x.M.pos, c:"var(--pos)"}])}</button>`; }).join("")}</div>
  </section>
  <div class="dg-fondo">
    <section class="card"><h3>Noticias por día</h3><p class="hint" style="margin:-4px 0 8px">Últimos 30 días, por tono. Pasa el cursor por una barra para ver el detalle.</p>${chartDias(ms)}</section>
    <section class="card dg-rank"><h3>Medios que más hablan de ${esc(S.org)}</h3>${topM.length ? `<ol>${topM.map(([id,n], i) => `<li><span class="dg-rank-n">${i + 1}</span><span class="dg-rank-m">${esc(MED[id].n)}<small>${NIVS[nivIdx(MED[id].a)][1]}</small></span><span class="dg-rank-v">${n}</span></li>`).join("")}</ol>` : '<p class="muted">Sin menciones.</p>'}</section>
  </div>`;
}

/* Menciones */
function itemHtml(m){
  const temas = [...m.temas.values()], resp = respondida(m.g);
  const otros = m.notas.filter(n => n !== m.lead).map(n => n.url ? `<a class="ext" href="${esc(n.url)}" target="_blank" rel="noopener">${esc(MED[n.m].n)}</a>` : esc(MED[n.m].n));
  return `<article class="item ${resp?"resp":(m.critico?"cri":"")}">
    <div class="meta">${pillTono(m.tono)}${resp?'<span class="pill done">Respondida</span>':""}<span>${esc(medioN(m.lead))}</span><span>·</span><span title="${fecha(m.lead.ts)}">${ago(m.lead.ts)}</span>${m.notas.length>1?`<span>·</span><span>en ${m.notas.length} medios</span>`:""}</div>
    <h4>${m.lead.url ? `<a class="ext" href="${esc(m.lead.url)}" target="_blank" rel="noopener">${esc(m.lead.t)}<span class="sr"> (abre el medio en otra pestaña)</span></a>` : esc(m.lead.t)}</h4>
    <p class="res">${esc(m.lead.res)}</p>
    <details><summary>¿Por qué aparece?</summary><p>${temas.map(x => `Tema <b>${esc(x.tema.nombre)}</b>: contiene «${[...x.found].map(esc).join("», «")}»${x.enTitulo?" en el titular":""}.`).join(" ")}${otros.length?` También la publicaron ${otros.join(", ")}.`:""}</p></details>
    <div class="acts">${resp ? `<button class="btn sm" data-act="responder" data-g="${m.g}" data-from="menciones">Ver respuesta</button>` : `<button class="btn ${m.critico?"primary":""} sm" data-act="responder" data-g="${m.g}" data-from="menciones">Responder</button>`}<button class="btn ghost sm" data-act="fp" data-g="${m.g}">No corresponde</button>${m.notas.some(n => n.captura) ? `<button class="btn ghost sm" data-act="cap-del" data-g="${m.g}">Quitar lo que agregué</button>` : ""}</div>
  </article>`;
}
function vMenciones(){
  const c = cuenta(); c.visto = true; save();
  let base = menciones(c, Number(tState.dias));
  if (tState.tema !== "todos") base = base.filter(m => m.temas.has(tState.tema));
  if (tState.q.trim()) { const q = norm(tState.q); base = base.filter(m => m.notas.some(n => n.hay.includes(q))); }
  const cnt = k => k === "todos" ? base.length : base.filter(m => m.tono === k).length;
  const ms = tState.tono === "todos" ? base : base.filter(m => m.tono === tState.tono);
  const fps = Object.keys(S.fp).filter(k => k.startsWith(S.org+":")).length;
  const activos = (tState.tema!=="todos") + (tState.tono!=="todos") + (tState.dias!=="30") + !!tState.q.trim();
  let html = "", last = "";
  ms.forEach(m => { const d = dia(m.last); if (d !== last) { html += `<h3 class="day">${d}</h3>`; last = d; } html += itemHtml(m); });
  return `<div class="head"><div><h2 tabindex="-1">Menciones</h2><p>Cada noticia aparece una vez aunque la publiquen varios medios. El resumen es propio; el texto del medio no se reproduce.</p></div><button class="btn alt" type="button" data-act="cap-open"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Agregar publicación</button></div>
  <div class="filters">
    <div class="seg" role="group" aria-label="Tono">${["todos","cri","neu","pos"].map(k => `<button data-act="f-tono" data-k="${k}" aria-pressed="${tState.tono===k}">${k==="todos"?"Todas":tonoPl[k]}<span class="c">${cnt(k)}</span></button>`).join("")}</div>
    <div class="seg" role="group" aria-label="Período">${[["1","24 h"],["7","7 días"],["30","30 días"]].map(([v,l]) => `<button data-act="f-dias" data-k="${v}" aria-pressed="${tState.dias===v}">${l}</button>`).join("")}</div>
    <select id="fTema" aria-label="Tema"><option value="todos">Todos los temas</option>${c.temas.filter(t=>t.activo).map(t => `<option value="${t.id}" ${tState.tema===t.id?"selected":""}>${esc(t.nombre)}</option>`).join("")}</select>
    <input id="fQ" type="search" placeholder="Buscar una palabra" value="${esc(tState.q)}" aria-label="Buscar en las menciones">
  </div>
  <div class="active" aria-live="polite"><span>${ms.length} ${ms.length===1?"noticia":"noticias"}</span>${activos?`<button class="btn ghost sm" data-act="f-reset">Quitar filtros</button>`:""}${fps?`<span>· ${fps} marcadas como “no corresponde”</span><button class="btn ghost sm" data-act="fp-reset">Restaurar</button>`:""}</div>
  <div class="feed">${html || `<div class="card"><b>No hay noticias con estos filtros.</b><p class="muted" style="margin:4px 0 0">Prueba con un período más largo o <button class="btn ghost sm" data-act="f-reset">quita los filtros</button>.</p></div>`}</div>`;
}

/* Configuración */
function subtabs(){ const k = route(); return `<div class="subtabs" role="navigation" aria-label="Configuración">${CONFIG.map(([key,n]) => `<a href="#${key}" ${key===k?'aria-current="page"':""}>${n}</a>`).join("")}</div>`; }
function chipEd(t, k, label, hint, limit){
  const all = t[k], showAll = tState.ctxAll[t.id + k] || !limit || all.length <= limit, list = showAll ? all : all.slice(0, limit);
  return `<div class="field"><span class="lbl" id="l-${t.id}-${k}">${label}</span>
  <div class="chips" role="group" aria-labelledby="l-${t.id}-${k}">${list.map((v,i) => `<span class="chip ${k==="exclusiones"?"ex":""}">${esc(v)}<button data-act="chip-del" data-tema="${t.id}" data-k="${k}" data-i="${i}" aria-label="Quitar ${esc(v)}">×</button></span>`).join("")}${!showAll?`<button class="btn ghost sm" data-act="ctx-all" data-key="${t.id+k}">+${all.length - limit} más</button>`:""}<input data-chipin="${t.id}:${k}" placeholder="Escribe y presiona Enter" aria-label="Agregar a ${label}"></div>
  <small>${hint}</small></div>`;
}
function vTemas(){
  const c = cuenta(), pl = PLANES[c.perfil.plan], act = c.temas.filter(t => t.activo).length;
  return `<div class="head"><div><h2 tabindex="-1">Mis temas</h2><p>Usas ${act} de los ${pl.temas} temas del plan ${pl.nombre}. Abre un tema para ajustar qué palabras lo activan; el conteo se actualiza al instante.</p></div><a class="btn" href="#asistente">Rehacer con el asistente</a></div>
  ${subtabs()}
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
    <div class="field"><label for="cTipo">1. ¿Quién usará la cuenta?</label><select id="cTipo"><option ${p.tipo==="Municipio"?"selected":""}>Municipio</option><option ${p.tipo==="Autoridad electa"?"selected":""}>Autoridad electa</option></select></div>
    <div class="field"><label for="cPlan">2. ¿Qué plan?</label><select id="cPlan">${Object.entries(PLANES).map(([k,v]) => `<option value="${k}" ${p.plan===k?"selected":""}>${v.nombre}: ${v.temas} temas, ${clp(v.precio)} al mes</option>`).join("")}</select></div>
    <div class="field"><label for="cAut">3. Nombre de la autoridad principal <span class="muted">(opcional)</span></label><input id="cAut" value="${esc(p.autoridad)}" placeholder="Ej.: nombre y apellido del alcalde"><small>Solo personas en su rol público.</small></div>
    <div class="field"><label for="cAg">4. Proyectos u obras con nombre propio</label><input id="cAg" value="${esc(p.agenda.join(", "))}" placeholder="Ej.: Polideportivo, Plan regulador"><small>Sepáralos con comas.</small></div>
    <fieldset class="field span2"><legend>5. ¿Qué temas son sensibles hoy en la comuna?</legend><div class="checks">${Object.entries(SENS).map(([k,s]) => `<label><input type="checkbox" name="sens" value="${k}" ${p.sens.includes(k)?"checked":""}> ${s.n}</label>`).join("")}</div><small>Los que marques tienen prioridad; el resto entra solo si ya aparece en las noticias.</small></fieldset>
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
  const f = tState.fuente, rows = CATALOG.filter(m => (f.a==="todos"||m.a===f.a) && (f.e==="todos"||m.e===f.e));
  const cnt = k => CATALOG.filter(m => m.e===k).length;
  const lbl = {listo:"Listo", requiere_ajuste:"Requiere ajuste", restringido:"Restringido", captura_asistida:"Captura asistida"};
  const met = {rss:"RSS", sitemap_noticias:"Sitemap de noticias", sitemap:"Sitemap", sitemap_mensual:"Sitemap mensual", portada:"Portada", google_news:"Google News", rss_filtrado:"RSS filtrado", sitemap_filtrado:"Sitemap filtrado", facebook:"Facebook"};
  return `<div class="head"><div><h2 tabindex="-1">Fuentes</h2><p>Los ${CATALOG.filter(m => m.m !== "facebook").length} medios web que PregonIA lee y cómo se lee cada uno (verificado el 3 de noviembre de 2026), más ${plural(CATALOG.filter(m => m.m === "facebook").length, "página", "páginas")} de Facebook. Los restringidos se consultan solo vía Google News; las de Facebook se ingresan con Agregar publicación, en Menciones.</p></div></div>
  ${subtabs()}
  <div class="filters">
    <div class="seg" role="group" aria-label="Estado">${[["todos","Todos",CATALOG.length],["listo","Listos",cnt("listo")],["requiere_ajuste","Requieren ajuste",cnt("requiere_ajuste")],["restringido","Restringidos",cnt("restringido")],["captura_asistida","Facebook",cnt("captura_asistida")]].map(([v,l,n]) => `<button data-act="f-est" data-k="${v}" aria-pressed="${f.e===v}">${l}<span class="c">${n}</span></button>`).join("")}</div>
    <div class="seg" role="group" aria-label="Ámbito">${[["todos","Todos"],["nacional","Nacional"],["regional","Regional"],["local","Local"]].map(([v,l]) => `<button data-act="f-amb" data-k="${v}" aria-pressed="${f.a===v}">${l}</button>`).join("")}</div>
  </div>
  <div class="card scroll" style="padding:0"><table class="ftab"><thead><tr><th>Medio</th><th>Ámbito</th><th>Comuna</th><th>Lectura</th><th>Estado</th></tr></thead><tbody>${rows.map(m => `<tr><td class="fm"><b>${esc(m.n)}</b>${m.o?`<div class="muted" style="font-size:12px">${esc(m.o)}</div>`:""}</td><td data-l="Ámbito">${m.a}</td><td data-l="Comuna">${esc((m.c||"").replace(/;/g, ", ")) || '<span class="muted">—</span>'}</td><td data-l="Lectura">${met[m.m]||m.m}</td><td data-l="Estado"><span class="pill e-${m.e}">${lbl[m.e]}</span></td></tr>`).join("")}</tbody></table></div>`;
}

/* Reportes: cada resultado se lee como gráfico y como cifra */
const RI = {
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
  ok:'<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16.2 9.6"/>', espera:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
};
const ri = (k, cls="") => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${RI[k]}</svg>`;
const tonoCol = {cri:"var(--cri)", neu:"var(--neu)", pos:"var(--pos)"};
const AMB = [["nacional","Nacional","var(--amb-n)"],["regional","Regional","var(--amb-r)"],["local","Local","var(--amb-l)"]];
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
function ambitos(ms){ const r = {nacional:0, regional:0, local:0}; ms.forEach(m => m.notas.forEach(n => r[MED[n.m].a] = (r[MED[n.m].a]||0) + 1)); return r; }

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
    const tot = x.pos + x.neu + x.cri; let acc = 0; const segs = [["neu","var(--neu)"],["pos","url(#pat-pos)"],["cri","var(--cri)"]].filter(([k]) => x[k]);
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
  ["crisis","Episodio crítico",{para:"Alcalde y comunicaciones", cuando:"Se activa solo ante una noticia crítica", lectura:"5 minutos", responde:"¿Cómo se propagó y qué hacemos ahora?"}]
];
function vReportes(){
  if (!REPS.some(r => r[0] === tState.rep)) tState.rep = "alcalde";
  const cur = REPS.find(r => r[0] === tState.rep), p = cur[2];
  return `<div class="head"><div><h2 tabindex="-1">Reportes</h2><p>Un informe por lector. Cada uno responde una sola pregunta, con el nivel de detalle que esa persona necesita.</p></div></div>
  <div class="tabs" role="tablist">${REPS.map(([k,n]) => `<button role="tab" aria-selected="${tState.rep===k}" data-act="rep" data-k="${k}">${n}</button>`).join("")}</div>
  <dl class="para"><div><dt>Para</dt><dd>${p.para}</dd></div><div><dt>Cuándo</dt><dd>${p.cuando}</dd></div><div><dt>Lectura</dt><dd>${p.lectura}</dd></div><div class="q"><dt>Responde</dt><dd>${p.responde}</dd></div></dl>
  ${({alcalde:repAlcalde, diario:repDiario, mesa:repMesa, gestion:repGestion, crisis:repCrisis})[tState.rep]()}`;
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
const AREAS = [[["incendio","emergencia","senapred","bomberos","marejada","temporal"],"Emergencias"],[["agua","sequia","hidric","apr","aljibe","pozo","estero"],"Operaciones"],[["cesfam","salud","consultorio","hospital"],"Salud"],[["colegio","escuela","liceo","educacion","daem","matricula"],"Educación"],[["robo","delito","seguridad","carabineros","delincuencia"],"Seguridad pública"],[["obra","calle","vereda","bache","pavimento","plan regulador","permiso","polideportivo","construccion"],"Obras y Secplan"],[["turismo","feria","fiesta","temporada","vino","vina","vendimia","ocupacion","costumbrista"],"Fomento y turismo"],[["basura","residuos","aseo","microbasural"],"Aseo y ornato"],[["adultos mayores","talleres","subsidio","vivienda"],"Dideco"]];
function areaDe(m){ const h = m.notas.map(n => n.hay).join(" "); const a = AREAS.find(([ks]) => ks.some(k => h.includes(k))); return a ? a[1] : null; }
const temaDe = m => [...m.temas.values()].map(x => x.tema.nombre).filter(n => !/\(comuna\)$/.test(n))[0] || "General";
function riesgo(m){ const e = escalera(m.notas); return (m.tono === "cri" ? 10 : m.tono === "neu" ? 2 : 0) * (1 + e.max) + m.notas.length + (respondida(m.g) ? -6 : 0) + (NOW - m.last < 2*DAY ? 2 : 0); }
function accion(m){
  const e = escalera(m.notas), area = areaDe(m); let a, r;
  if (m.tono === "cri") {
    if (respondida(m.g)) { a = "La respuesta ya está aprobada. Seguir el tema y avisar si aparece en otro medio."; r = ["Comunicaciones"]; }
    else if (e.max === 2) { a = "Vocería del alcalde hoy, con datos oficiales y una sola versión."; r = ["Alcalde","Comunicaciones",area]; }
    else if (e.max === 1) { a = "Declaración institucional antes de que el tema llegue a medios nacionales."; r = ["Comunicaciones",area]; }
    else { a = "Responder en el medio comunal y contactar a los vecinos afectados."; r = [area || "Dirección del área","Comunicaciones"]; }
  } else if (m.tono === "neu") { a = "Preparar información para los vecinos en los canales municipales, por si el tema crece."; r = ["Comunicaciones",area]; }
  else { a = e.max === 0 ? "Llevarla a medios regionales: hasta ahora solo la publicó la prensa comunal." : "Difundirla en redes municipales y usarla en la próxima vocería."; r = ["Comunicaciones",area]; }
  return {a, r: [...new Set(r.filter(Boolean))].join(" · ")};
}
const enMedios = m => { const k = new Set(m.notas.map(n => n.m)).size; return esc(MED[m.lead.m].n) + (k > 1 ? ` y ${k - 1} ${k === 2 ? "medio más" : "medios más"}` : ""); };
const rango = (d0, d1) => new Date(d0).toLocaleDateString("es-CL",{day:"numeric", month:"short"}) + " al " + new Date(d1).toLocaleDateString("es-CL",{day:"numeric", month:"short", year:"numeric"});

/* 1. Parte del alcalde: semanal, una pantalla */
function parteData(){
  const all = menciones(cuenta(), 14), sem = all.filter(m => NOW - m.last < 7*DAY), ant = all.filter(m => NOW - m.last >= 7*DAY);
  const M = metricas(sem), Ma = metricas(ant), v = veredicto(M), va = veredicto(Ma);
  const cand = sem.filter(m => m.tono !== "pos").sort((a,b) => riesgo(b) - riesgo(a)), asuntos = [], vistos = new Set();
  cand.forEach(m => { if (asuntos.length < 3 && riesgo(m) >= 4 && (m.tono === "cri" || (areaDe(m) && riesgo(m) >= 6)) && !vistos.has(temaDe(m))) { asuntos.push(m); vistos.add(temaDe(m)); } });
  cand.forEach(m => { if (asuntos.length < 3 && !asuntos.includes(m) && riesgo(m) >= 12) asuntos.push(m); });
  const buena = sem.filter(m => m.tono === "pos").sort((a,b) => escalera(b.notas).max - escalera(a.notas).max || b.notas.length - a.notas.length)[0];
  const comp = va.i < 0 ? "No hay datos de la semana anterior para comparar." : va.i === v.i ? `Igual que la semana anterior.` : `La semana anterior fue ${va.n.toLowerCase()}: ${v.i < va.i ? "mejoró" : "empeoró"}.`;
  return {sem, M, v, comp, asuntos, buena, per: rango(NOW - 6*DAY, NOW)};
}
function repAlcalde(){
  const d = parteData();
  if (!d.sem.length) return `<div class="allgood">${ri("ok")} Ningún medio publicó sobre ${esc(S.org)} en los últimos 7 días.</div>`;
  const item = (m, i) => { const e = escalera(m.notas), ac = accion(m); return `<li class="${m.tono}"><span class="n">${i + 1}</span><div class="bd"><span class="kick">${esc(temaDe(m))} · ${tonoLbl[m.tono]}${respondida(m.g) ? " · respondida" : ""}</span><b class="t">${esc(m.lead.res)}</b><span class="sub">${enMedios(m)} · ${ago(m.last)}</span><div class="lleg">${escHtml(e)}</div><p class="acc"><b>Qué hacer</b>${ac.a}</p><p class="rsp"><b>Responsable</b>${ac.r}</p></div></li>`; };
  return `<div class="rhead"><h3>${esc(S.org)} · parte semanal</h3><span class="per">${ri("cal")} ${d.per}</span></div>
  <div class="parte">
    <section class="ver"><span class="kick">Cómo lo trató la prensa esta semana</span><p class="vbig ${d.v.k}">${d.v.n}</p><p class="vtx">${d.v.f.charAt(0).toUpperCase() + d.v.f.slice(1)}: ${conteo(d.M)}. ${d.comp}</p>${escala(d.v.i)}</section>
    <section><h4>Lo que se puede complicar</h4>${d.asuntos.length ? `<ol class="asuntos">${d.asuntos.map(item).join("")}</ol>` : `<p class="vtx">Ningún asunto de riesgo esta semana.</p>`}</section>
    ${d.buena ? `<section class="cap"><h4>Para aprovechar</h4><ol class="asuntos">${item(d.buena, -1).replace('<span class="n">0</span>', `<span class="n">${ri("pos")}</span>`)}</ol></section>` : ""}
    <div class="acts"><button class="btn alt" data-act="vid-open"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.2v5.6l4.8-2.8z"/></svg>Video resumen</button><button class="btn primary" data-act="copiar-parte">Copiar texto</button><button class="btn" data-act="goto" data-tono="todos" data-dias="7">Ver las noticias de la semana</button></div>
    ${shareBar("parte")}
  </div>
  ${muestra(d.M.vol)}`;
}
function parteTexto(){
  const d = parteData(), L = [`*PregonIA · Parte semanal · ${S.org}*`, d.per, "", `*Prensa de la semana: ${d.v.n.toLowerCase()}.* ${conteo(d.M)}. ${d.comp}`, ""];
  if (d.asuntos.length) { L.push("*Lo que se puede complicar*"); d.asuntos.forEach((m, i) => { const ac = accion(m); L.push(`${i + 1}. ${m.lead.res} (${llego(escalera(m.notas)).toLowerCase()})`, `   Qué hacer: ${ac.a}`, `   Responsable: ${ac.r}`); }); L.push(""); }
  if (d.buena) { const ac = accion(d.buena); L.push("*Para aprovechar*", `${d.buena.lead.res}`, `   ${ac.a}`); }
  return L.join("\n");
}

/* 2. Mesa de comunicaciones: diaria, para operar */
function repMesa(){
  const c = cuenta(), m30 = menciones(c), m7 = m30.filter(m => NOW - m.last < 7*DAY), hoy = m30.filter(m => NOW - m.last < DAY);
  const porResp = m7.filter(m => m.tono === "cri" && !respondida(m.g)).sort((a,b) => escalera(b.notas).max - escalera(a.notas).max || b.last - a.last);
  const subiendo = m7.filter(m => escalera(m.notas).subio).sort((a,b) => b.last - a.last);
  const difundir = m30.filter(m => m.tono === "pos" && NOW - m.last < 14*DAY && escalera(m.notas).max < 2 && !respondida(m.g)).sort((a,b) => escalera(a.notas).max - escalera(b.notas).max || b.last - a.last);
  const md = {}; m30.forEach(m => m.notas.forEach(n => { const x = md[n.m] ||= {n:0, cri:0, pos:0}; x.n++; if (n.tono === "cri") x.cri++; if (n.tono === "pos") x.pos++; }));
  const medios = Object.entries(md).sort((a,b) => nivIdx(MED[a[0]].a) - nivIdx(MED[b[0]].a) || b[1].n - a[1].n).slice(0, 10);
  const li = (m, btn, extra = "") => `<li><span class="kick">${esc(temaDe(m))} · ${tonoLbl[m.tono]}</span><b>${esc(m.lead.res)}</b><span class="sub">${enMedios(m)} · ${ago(m.last)}</span>${escHtml(escalera(m.notas))}${extra}${btn ? `<button class="btn sm" style="justify-self:start" data-act="responder" data-g="${m.g}" data-from="reportes">${btn}</button>` : ""}</li>`;
  const vacio = t => `<p class="empty">${t}</p>`;
  return `<div class="rhead"><h3>${esc(S.org)} · mesa de comunicaciones</h3><span class="per">${ri("cal")} ${new Date(NOW).toLocaleDateString("es-CL",{weekday:"long", day:"numeric", month:"long"})}</span></div>
  <div class="rgrid r4">
    ${tile({icon:"cri", tone: porResp.length ? "cri" : "", label:"Por responder", value: porResp.length, sub:"críticas de los últimos 7 días sin respuesta aprobada"})}
    ${tile({icon:"propaga", label:"Subiendo de nivel", value: subiendo.length, sub:"empezaron en un medio menor y ya llegaron a otro mayor"})}
    ${tile({icon:"pos", tone:"pos", label:"Para difundir", value: difundir.length, sub:"buenas noticias que aún no llegan a la prensa nacional"})}
    ${tile({icon:"noticias", label:"Publicadas en 24 horas", value: hoy.reduce((s,m) => s + m.notas.filter(n => NOW - n.ts < DAY).length, 0), sub:"notas nuevas sobre los temas monitoreados"})}
  </div>
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
const NIVLBL = {local: "Comunal", regional: "Regional", nacional: "Nacional"};
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
  <p class="note" style="margin-top:12px">${MODO.tipo === "real" ? "Hecho con noticias reales leídas de los medios del catálogo." : "En la demostración las notas no tienen enlace; con Noticias reales cada titular lleva a su fuente."} En el piloto, este informe llega solo cada mañana a las 8:00 por correo o WhatsApp.</p>`;
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
function repGestion(){
  const c = cuenta(), ms = menciones(c), M = metricas(ms);
  if (!ms.length) return `<div class="allgood">Ningún medio publicó sobre ${esc(S.org)} en los últimos 30 días.</div>`;
  const rec = ms.filter(m => NOW - m.last < 15*DAY), ant = ms.filter(m => NOW - m.last >= 15*DAY), Mr = metricas(rec), Ma = metricas(ant);
  const porTema = c.temas.filter(t => t.activo).map(t => { const sub = ms.filter(m => m.temas.has(t.id)); return {t, ...metricas(sub), e: escalera(sub.flatMap(m => m.notas))}; }).sort((a,b) => b.vol - a.vol);
  const esp = porTema.filter(x => !/\(comuna\)$/.test(x.t.nombre)), conDatos = esp.filter(x => x.vol);
  const topCri = esp.slice().sort((a,b) => b.cri - a.cri)[0], topPos = esp.slice().sort((a,b) => b.pos - a.pos)[0], nac = conDatos.filter(x => x.e.max === 2);
  const finds = [
    [veredicto(M).k, `La cobertura del mes fue <b>${veredicto(M).n.toLowerCase()}</b>: ${veredicto(M).f}, con ${conteo(M)}.`],
    topCri && topCri.cri ? ["cri", `<b>${esc(topCri.t.nombre)}</b> concentró las críticas: ${topCri.cri} de ${M.cri}.`] : null,
    nac.length ? ["neu", `${nac.length === 1 ? "Un tema llegó" : nac.length + " temas llegaron"} a la prensa nacional: <b>${nac.map(x => esc(x.t.nombre)).join(", ")}</b>.`] : ["pos", "Ningún tema específico llegó a la prensa nacional este mes."],
    topPos && topPos.pos ? ["pos", `<b>${esc(topPos.t.nombre)}</b> aportó la mayor cobertura positiva (${plural(topPos.pos,"noticia","noticias")}).`] : null
  ].filter(Boolean);
  const maxSide = Math.max(1, ...porTema.map(x => Math.max(x.cri + x.neu/2, x.pos + x.neu/2))), w = v => (v / maxSide * 100).toFixed(2) + "%";
  const notas = ms.flatMap(m => m.notas.map(n => ({n, tono: n.tono}))).sort((a,b) => b.n.ts - a.n.ts);
  return `<div class="rhead"><h3>${esc(S.org)} · informe de gestión</h3><span class="per">${ri("cal")} ${rango(NOW - 29*DAY, NOW)}</span></div>
  <div class="card" style="margin-bottom:14px"><h3>Lo principal</h3><ul class="find">${finds.map(([k, t]) => `<li><span class="chipi ${k}">${ri(k)}</span><p>${t}</p></li>`).join("")}</ul></div>
  <div class="rgrid r4">
    ${tile({icon:"noticias", label:"Noticias", value:M.vol, delta: deltaHtml(Mr.vol, Ma.vol, null), viz: sparkline(serieDias(ms)), sub:"sin contar réplicas de la misma noticia"})}
    ${tile({icon:"clima", tone: veredicto(M).k === "neu" ? "" : veredicto(M).k, label:"Tono de la cobertura", value:`<span class="word">${veredicto(M).n}</span>`, delta: deltaVer(Mr, Ma), viz: escala(veredicto(M).i), sub: conteo(M)})}
    ${tile({icon:"alcance", label:"Temas en prensa nacional", value: nac.length, unit:"de " + conDatos.length, sub:"temas con noticias este mes que llegaron a medios nacionales"})}
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
    ${paresCard()}
  </div>
  <div class="card" style="margin-top:14px;display:grid;gap:10px"><h3 style="margin:0">Lectura del analista</h3><p class="hint" style="margin:0">Redactada por IA con las cifras y los resúmenes del mes. Revísala antes de usarla.</p>
    <div id="lectura" class="draft" style="min-height:90px">${esc(lecturaTxt.gestion || lecturaBase(M, porTema))}</div>
    <div><button class="btn primary" data-act="lectura">Redactar con IA</button></div></div>
  <details class="card resp" style="margin-top:14px"><summary>Respaldo: las ${notas.length} notas del mes</summary>
    <div class="scroll"><table><thead><tr><th>Fecha</th><th>Medio</th><th>Nivel</th><th>Tono</th><th>Titular</th></tr></thead><tbody>${notas.map(({n}) => `<tr><td class="mono">${hora(n.ts)}</td><td>${esc(MED[n.m].n)}</td><td>${NIVS[nivIdx(MED[n.m].a)][1]}</td><td>${tonoLbl[n.tono]}</td><td>${esc(n.t)}</td></tr>`).join("")}</tbody></table></div>
    <p class="hint" style="margin:10px 0 0">En producción cada fila enlaza a la nota original en el sitio del medio.</p></details>
  ${muestra(M.vol)}`;
}
function lecturaBase(M, porTema){
  const esp = porTema.filter(x => !/\(comuna\)$/.test(x.t.nombre)), top = esp.slice().sort((a,b) => b.vol - a.vol)[0], crit = esp.slice().sort((a,b) => b.cri - a.cri)[0];
  return `${S.org} sumó ${M.vol} noticias en 30 días, con una cobertura ${veredicto(M).n.toLowerCase()} (${conteo(M)}). El tema con más presencia fue ${top?top.t.nombre:"—"} y el que concentró más notas críticas fue ${crit&&crit.cri?crit.t.nombre + " (" + llego(crit.e).toLowerCase() + ")":"ninguno"}. Usa el botón para una lectura interpretativa con recomendaciones para el equipo.`;
}
function paresCard(){
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
  const hrs = Math.max(0, Math.round((m.last - m.first) / 36e5)), ambN = {nacional:0, regional:0, local:0}; m.notas.forEach(n => ambN[MED[n.m].a]++);
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
    <div class="card" style="display:grid;gap:12px;align-content:start"><h3 style="margin:0">Qué hacer</h3><p class="note">Informa medidas concretas en las próximas horas, con una sola vocería y datos oficiales.</p><button class="btn primary" data-act="responder" data-g="${m.g}" data-from="reportes">${resp?"Ver respuesta":"Preparar respuesta"}</button>${ms.length>1?`<p class="hint" style="margin:0">Otros episodios de la semana: ${ms.slice(1,4).map(x => esc(x.lead.t)).join(" · ")}</p>`:""}</div>
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
  minuta:["Minuta interna","Una página para la autoridad","Minuta de una página para la autoridad: situación, cobertura, riesgos y opciones"]
};
const ENFOQUES = {datos:"Responder con datos", aclarar:"Aclarar los hechos", contextualizar:"Contextualizar", reconocer:"Reconocer y corregir", anunciar:"Anunciar un logro"};
const recPieza = m => !m ? "comunicado" : m.tono === "cri" ? "declaracion" : "comunicado";
const recEnf = m => !m ? "anunciar" : m.tono === "cri" ? "datos" : m.tono === "pos" ? "anunciar" : "contextualizar";
const baseConocimiento = () => `[Ejemplo] Teléfono de emergencias municipales: 800 000 000 (ficticio).\n[Ejemplo] El municipio dispone de 2 camiones aljibe propios.\n[Ejemplo] Vocero autorizado: encargado(a) de comunicaciones.\n[Completar] Agrega cifras oficiales, documentos y decisiones del municipio.`;
function vComunicados(){
  const c = cuenta(), ms = menciones(c), m = tState.draft && ms.find(x => x.g === tState.draft), pl = PLANES[c.perfil.plan];
  const pieza = tState.pieza || recPieza(m), enf = tState.enf || recEnf(m), rp = recPieza(m), re = recEnf(m);
  const draft = (c.drafts||{})[tState.draft || "_"] || "";
  const back = tState.from ? `<a class="back" href="#${tState.from}">← Volver a ${({inicio:"Inicio", menciones:"Menciones", reportes:"Reportes"})[tState.from]}</a>` : "";
  const aprob = S.comunicados.filter(x => x.org===S.org);
  return `${back}<div class="head"><div><h2 tabindex="-1">Preparar una respuesta</h2><p>Tres decisiones y un borrador. Solo usa datos del municipio y de la noticia; lo que falte queda marcado para que lo completes. Nada se publica sin tu aprobación.</p></div><span class="muted mono" style="font-size:12.5px">${c.borradores||0} de ${pl.borradores} borradores del mes</span></div>
  <div class="grid two">
    <form id="comForm" class="card stepper" novalidate>
      <section><h3><span class="n">1</span>¿A qué respondes?</h3>
        <select id="kMen" aria-label="Noticia de origen" class="field" style="padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--surface);min-height:36px"><option value="">Nada: es un anuncio propio</option>${ms.map(x => `<option value="${x.g}" ${m&&m.g===x.g?"selected":""}>${tonoLbl[x.tono]} · ${esc(x.lead.t.slice(0,80))}${x.lead.t.length>80?"…":""}</option>`).join("")}</select>
        ${m ? `<div class="mini"><div class="meta" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:12.5px;color:var(--muted)">${pillTono(m.tono)}<span>${esc(medioN(m.lead))} · ${ago(m.lead.ts)}</span></div><b>${esc(m.lead.t)}</b><span class="muted" style="font-size:12.5px">${esc(m.lead.res)}</span></div>` : ""}
      </section>
      <section><h3><span class="n">2</span>¿Qué necesitas?</h3>
        <div class="opts" role="radiogroup" aria-label="Pieza">${Object.entries(PIEZAS).map(([k,[n,d]]) => `<label class="opt"><input type="radio" name="pieza" value="${k}" ${pieza===k?"checked":""}>${k===rp?'<span class="rec">Sugerido</span>':""}<b>${n}</b><span>${d}</span></label>`).join("")}</div>
      </section>
      <section><h3><span class="n">3</span>¿Con qué enfoque?</h3>
        <div class="checks" role="radiogroup" aria-label="Enfoque">${Object.entries(ENFOQUES).map(([k,v]) => `<label><input type="radio" name="enf" value="${k}" ${enf===k?"checked":""}> ${v}${k===re?' <span class="muted">(sugerido)</span>':""}</label>`).join("")}</div>
      </section>
      <details class="kb"><summary>Datos del municipio que puede usar la IA</summary><div class="field" style="margin-top:8px"><textarea id="kBase" aria-label="Datos del municipio">${esc(c.base || baseConocimiento())}</textarea><small>Los datos del ejemplo son ficticios. En producción se cargan cifras y documentos oficiales.</small></div></details>
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
  if (src === "diario") { const t = diarioTexto(), d = diarioData(); return {titulo: "Informe diario de prensa", sub: d.etiqueta, sinFecha: true, tipo: "diario", texto: t, cuerpo: t.split("\n").slice(3).join("\n")}; }
  if (src === "parte") { const t = parteTexto(); return {titulo: "Parte semanal del alcalde", sub: "Semana del " + parteData().per, sinFecha: true, texto: t, cuerpo: t.split("\n").slice(3).join("\n")}; }
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
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(30, 77, 140); doc.text(pdfTxt("PregonIA · Municipalidad de " + S.org), M, y); y += 8;
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
  const n = doc.getNumberOfPages(), pie = d.borrador ? "Borrador preparado con PregonIA · Revisar antes de difundir" : "Preparado con PregonIA";
  for (let p = 1; p <= n; p++) { doc.setPage(p); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(120, 128, 140); doc.text(pdfTxt(pie), M, PIE + 6); doc.text(`Página ${p} de ${n}`, M + AN, PIE + 6, {align: "right"}); }
  return doc.output("blob");
}
const movil = () => matchMedia("(pointer: coarse)").matches;
const pdfCache = {};
/* PDF del informe diario con la gráfica del sistema: fondo ALTKimia, tarjetas de indicadores, barras y clipping por mención con enlaces. */
async function pdfDiario(){
  const {jsPDF} = await cargarJsPDF(), doc = new jsPDF({unit: "mm", format: "a4"}), W = 210, H = 297, M = 15, AN = W - 2 * M, PIE = H - 13;
  const d = diarioData(), C = {bg: "#080B12", card: "#111827", line: "#1E2D4A", text: "#F0F4FF", muted: "#8B9DC3", blue: "#2196F3", blueL: "#42A5F5", track: "#1A2540",
    cri: "#E0604A", pos: "#20A493", neu: "#8A97A8", cris: "#3A1C16", poss: "#0F2E2B", neus: "#1A2433"};
  const T = s => pdfTxt(String(s ?? "")), tc = k => C[k] || C.neu, tsoft = k => C[k + "s"] || C.neus;
  const fondo = () => { doc.setFillColor(C.bg); doc.rect(0, 0, W, H, "F"); doc.setFillColor("#0E1A2E"); for (let y = 6; y < H; y += 8) for (let x = 6; x < W; x += 8) doc.circle(x, y, 0.16, "F"); };
  const fuente = (size, bold, font = "helvetica") => { doc.setFont(font, bold ? "bold" : "normal"); doc.setFontSize(size); };
  const txt = (s, x, y, o = {}) => { fuente(o.size || 9, o.bold, o.font); doc.setTextColor(o.color || C.text); if (doc.setCharSpace) doc.setCharSpace(o.cs || 0); doc.text(T(s), x, y, {align: o.align || "left"}); if (doc.setCharSpace) doc.setCharSpace(0); };
  const lineas = (s, w, size, bold) => { fuente(size, bold); return doc.splitTextToSize(T(s), w); };
  const ancho = (s, size, bold, font) => { fuente(size, bold, font); return doc.getTextWidth(T(s)); };
  const recorta = (s, w, size, bold) => { let x = T(s); if (ancho(x, size, bold) <= w) return x; while (x.length > 3 && ancho(x + "…", size, bold) > w) x = x.slice(0, -1); return x.trim() + "…"; };
  const tarjeta = (x, y, w, h) => { doc.setFillColor(C.card); doc.setDrawColor(C.line); doc.setLineWidth(0.25); doc.roundedRect(x, y, w, h, 2, 2, "FD"); };
  const ceja = (s, x, y, color = C.blueL) => txt(String(s).toUpperCase(), x, y, {size: 6.8, bold: true, color, cs: 0.35});
  const marca = (x, yb, s) => { doc.setFillColor(C.blue); [0.42, 0.7, 1].forEach((h, i) => doc.roundedRect(x + i * s * 0.55, yb - s * h, s * 0.38, s * h, s * 0.07, s * 0.07, "F")); return x + s * 1.6; };
  const logo = (x, y, size) => { const x2 = marca(x, y, size * 0.33) + 0.6; txt("Pregon", x2, y, {size, bold: true}); txt("IA", x2 + ancho("Pregon", size, true), y, {size, bold: true, color: C.blue}); };
  const barra = (x, y, w, frac, color = C.blue) => { doc.setFillColor(C.track); doc.roundedRect(x, y, w, 1.8, 0.9, 0.9, "F"); if (frac > 0) { doc.setFillColor(color); doc.roundedRect(x, y, Math.max(1.8, w * frac), 1.8, 0.9, 0.9, "F"); } };
  const senal = (x, yb, nivel, color) => [1.4, 2.3, 3.2].forEach((h, i) => { doc.setFillColor(i <= nivel ? color : C.track); doc.roundedRect(x + i * 1.6, yb - h, 1.1, h, 0.3, 0.3, "F"); });
  const cabeceraCorta = () => { logo(M, 12, 10); txt(`Informe diario · ${S.org} · ${d.etiqueta}`, W - M, 11.5, {size: 7.5, color: C.muted, align: "right"}); doc.setDrawColor(C.line); doc.setLineWidth(0.3); doc.line(M, 16, W - M, 16); return 22; };
  doc.setProperties({title: T(`Informe diario de prensa · ${S.org}`), author: "PregonIA", creator: "PregonIA · ALTKimia"});
  fondo();
  // Encabezado
  logo(M, 17, 15); txt("INFORME DIARIO DE PRENSA", W - M, 14, {size: 6.8, bold: true, color: C.muted, align: "right"});
  txt("Municipalidad de " + S.org, M, 29, {size: 19, bold: true});
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
  const nota = MODO.tipo === "real" ? "Noticias reales leídas de los medios del catálogo de PregonIA. Los resúmenes son propios; el texto de los medios no se reproduce." : "Demostración con noticias ficticias: las notas no tienen enlace. Con Noticias reales cada publicación lleva a su fuente.";
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
  try { await navigator.share({files: [f], title: d.titulo + " · " + S.org, text: d.titulo + " · Municipalidad de " + S.org}); }
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
document.addEventListener("click", e => { if ($("#shrPop") && !e.target.closest("#shrPop") && !e.target.closest('[data-via="mail"]')) cerrarMenu(); }, true);
document.addEventListener("keydown", e => { if (e.key === "Escape" && $("#shrPop")) { const o = $("#shrPop")._origen; cerrarMenu(); o?.focus(); } });
addEventListener("scroll", ubicarMenu, {passive: true, capture: true}); addEventListener("resize", ubicarMenu);
async function compartir(b){
  const via = b.dataset.via, d = shareDoc(b.dataset.src, Number(b.dataset.i));
  if (!d || !d.texto) { cerrarMenu(); toast("No hay texto para compartir todavía."); return; }
  const aviso = d.borrador && /\[completar/i.test(d.texto) ? " Ojo: aún hay partes marcadas [completar]." : "";
  const asunto = d.titulo + " · Municipalidad de " + S.org, cuerpo = plano(d.texto);
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
const VIEWFN = {inicio:vInicio, menciones:vMenciones, reportes:vReportes, comunicados:vComunicados, temas:vTemas, asistente:vAsistente, fuentes:vFuentes};
function render(focus){
  renderChrome(); $("#view").innerHTML = (VIEWFN[route()] || vInicio)();
  cerrarMenu(); if ($("#view .shr")) cargarJsPDF().catch(() => {});
  if (focus) { const h = $("#view h2"); if (h) h.focus({preventScroll:true}); }
  if (tState.refocus) { const el = document.querySelector(`[data-chipin="${tState.refocus}"]`); if (el) el.focus(); tState.refocus = null; }
}
window.addEventListener("hashchange", () => { render(true); window.scrollTo(0,0); });
$("#org").addEventListener("change", e => { S.org = e.target.value; tState = {...tState, tema:"todos", draft:null, from:null, pieza:null, enf:null, open:{}}; propuesta = null; lecturaTxt = {}; save(); render(true); toast("Ahora ves " + S.org + ". Cada municipio ve solo sus datos."); });
function goMenciones(patch){ Object.assign(tState, {tema:"todos", tono:"todos", dias:"30", q:""}, patch); if (route() === "menciones") render(true); else location.hash = "menciones"; }

document.addEventListener("change", e => {
  const id = e.target.id;
  if (id === "fTema") { tState.tema = e.target.value; render(); }
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
    const perfil = {tipo: $("#cTipo").value, comuna: S.org, autoridad: $("#cAut").value.trim(), agenda: $("#cAg").value.split(",").map(s => s.trim()).filter(Boolean), sens: [...document.querySelectorAll('input[name="sens"]:checked')].map(x => x.value), plan: $("#cPlan").value};
    propuesta = {perfil, ...proponer(perfil)};
    $("#propOut").innerHTML = propHtml(); const pc = $("#propCard"); pc.scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start"}); pc.focus({preventScroll:true});
  }
  if (e.target.id === "comForm") generar();
});

document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const act = b.dataset.act, c = cuenta();
  if (act === "responder") { e.preventDefault(); tState.draft = b.dataset.g; tState.from = b.dataset.from || null; tState.pieza = null; tState.enf = null; if (route() === "comunicados") render(true); else location.hash = "comunicados"; }
  if (act === "goto") goMenciones({tono: b.dataset.tono, dias: b.dataset.dias});
  if (act === "goto-tema") goMenciones({tema: b.dataset.id});
  if (act === "ver-criticas") { e.preventDefault(); goMenciones({tono:"cri", dias:"7"}); }
  if (act === "f-tono") { tState.tono = b.dataset.k; render(); }
  if (act === "f-dias") { tState.dias = b.dataset.k; render(); }
  if (act === "f-reset") { Object.assign(tState, {tema:"todos", tono:"todos", dias:"30", q:""}); render(); }
  if (act === "f-est") { tState.fuente.e = b.dataset.k; render(); }
  if (act === "f-amb") { tState.fuente.a = b.dataset.k; render(); }
  if (act === "fp") { const key = S.org + ":" + b.dataset.g; S.fp[key] = true; save(); render(); toast("Marcada como “no corresponde”. Servirá para afinar las exclusiones.", () => { delete S.fp[key]; save(); render(); }); }
  if (act === "fp-reset") { Object.keys(S.fp).filter(k => k.startsWith(S.org+":")).forEach(k => delete S.fp[k]); save(); render(); }
  if (act === "onb-hide") { c.onbOculto = true; save(); render(); toast("Primeros pasos ocultos.", () => { c.onbOculto = false; save(); render(); }); }
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
    S.comunicados.unshift({org: S.org, ts: Date.now(), pieza: PIEZAS[pz][0], origen: m ? m.lead.t.slice(0,70) : "Anuncio propio", texto: txt});
    if (m) S.resp[S.org + ":" + m.g] = true;
    save(); render(); toast(m ? "Aprobado. La noticia quedó como respondida." : "Aprobado y guardado.");
  }
  if (act === "copiar") { const el = $("#kOut"); try { await navigator.clipboard.writeText(el.value); toast("Borrador copiado."); } catch(err) { el.focus(); el.select(); toast("Texto seleccionado: cópialo con el teclado."); } }
});

/* IA desde la página (usa la cuenta de Claude de quien la abre) */
/* Fuera de claude.ai (por ejemplo en Vercel) la IA va por /api/ia, con la clave solo en el servidor. Misma forma que sample(): (texto, {signal, onText, modelTier}) → {text}. */
async function iaServidor(){
  if (!/^https?:$/.test(location.protocol)) return null;
  try { const r = await fetch("/api/ia", {cache: "no-store"}); if (!r.ok) return null; const j = await r.json(); if (!j.ok) return null; } catch(e) { return null; }
  return async function(input, opts = {}){
    let r;
    try { r = await fetch("/api/ia", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({prompt: String(input), tier: opts.modelTier === "quick" ? "quick" : "default"}), signal: opts.signal}); }
    catch(err) { throw {code: err && err.name === "AbortError" ? "cancelled" : "network", message: String(err)}; }
    if (r.status === 429) throw {code: "rate_limited"};
    if (!r.ok || !r.body) throw {code: "error", message: await r.text().catch(() => "")};
    const lector = r.body.getReader(), dec = new TextDecoder(); let text = "";
    try { for (;;) { const {done, value} = await lector.read(); if (done) break; const delta = dec.decode(value, {stream: true}); text += delta; if (opts.onText) opts.onText({text, delta}); } }
    catch(err) { throw {code: opts.signal && opts.signal.aborted ? "cancelled" : "error", text}; }
    return {text, truncated: false};
  };
}
let samplePromise = ((window.claude && window.claude.use) ? window.claude.use("sample").catch(() => null) : Promise.resolve(null)).then(s => s || iaServidor());
let ctl = null;
function prompt(m, pieza, enfoque, base){
  return `Eres el asistente de comunicaciones de PregonIA para la Municipalidad de ${S.org}, en Chile. Redacta en español de Chile: ${PIEZAS[pieza][2]}. Enfoque: ${ENFOQUES[enfoque]}.

Reglas obligatorias:
1. Usa solo datos que estén en los DATOS DEL MUNICIPIO o en la NOTICIA. Si falta un dato necesario, escribe [completar: qué dato falta]. No inventes cifras, fechas, nombres ni compromisos.
2. Toda cita textual va marcada así: [cita propuesta, validar con el vocero].
3. No copies frases del medio; describe la noticia con palabras propias y nombra el medio.
4. Tono institucional, sobrio y respetuoso. Sin promoción personal ni partidaria de ninguna autoridad.
5. Devuelve solo el texto de la pieza, sin explicaciones previas.

NOTICIA:
${m ? `Medio: ${MED[m.lead.m].n}. Titular: ${m.lead.t}. Resumen: ${m.lead.res}. Tono detectado: ${tonoLbl[m.tono]}. Otros medios que la publicaron: ${m.notas.length-1}.` : "No hay noticia: es un anuncio propio."}

DATOS DEL MUNICIPIO:
${base}`;
}
function plantilla(m, pieza){
  return `${PIEZAS[pieza][0]} · Municipalidad de ${S.org}\n\n[Plantilla: la IA no está disponible en esta vista]\n\nEn relación con ${m ? "lo informado por " + MED[m.lead.m].n + " (" + m.lead.res.replace(/\.$/,"") + ")" : "[completar: anuncio]"}, la Municipalidad de ${S.org} informa:\n\n1. [completar: hechos verificados]\n2. [completar: medidas adoptadas y plazos]\n3. [completar: canal de contacto para vecinos]\n\n[cita propuesta, validar con el vocero]: «[completar]»\n\nContacto de prensa: [completar]`;
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
    note.textContent = (c.borradores > pl.borradores ? "Superaste los borradores de tu plan; en producción se suma un paquete. " : "") + "Revisa lo marcado [completar] y las citas propuestas antes de aprobar.";
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
  const c = cuenta(), ms = menciones(c), M = metricas(ms), el = $("#lectura");
  const sample = await samplePromise;
  if (!sample) { el.textContent = "La IA no está disponible en esta vista. Abre la página en Claude para redactar la lectura."; return; }
  btn.disabled = true; el.textContent = "Redactando…";
  const datos = ms.slice(0, 25).map(m => `- [${tonoLbl[m.tono]}] ${m.lead.res} (${m.notas.length} medio(s); ${llego(escalera(m.notas)).toLowerCase()})`).join("\n");
  const temas = c.temas.filter(t=>t.activo).map(t => { const sub = ms.filter(m => m.temas.has(t.id)), x = metricas(sub); return `${t.nombre}: ${x.vol} noticias, ${x.cri} críticas, ${llego(escalera(sub.flatMap(m => m.notas))).toLowerCase()}`; }).join("; ");
  try {
    const {text} = await sample(`Eres analista de reputación de PregonIA. Escribe en español de Chile la "lectura del analista" del informe de gestión mensual de la Municipalidad de ${S.org}. Lo leen el alcalde y su equipo directivo en reunión. Dos párrafos breves: qué temas de gestión marcaron la percepción y por qué, qué temas escalaron de la prensa comunal a la regional o nacional, y dos recomendaciones accionables con el área municipal responsable. Usa solo estos datos, no inventes cifras ni hechos, habla de gestión y servicios, no de la figura del alcalde, y no promuevas a ninguna autoridad ni partido.\n\nCifras del mes: ${M.vol} noticias, tono de la cobertura ${veredicto(M).n.toLowerCase()} (${conteo(M)}).\nPor tema: ${temas}\nResúmenes:\n${datos}`, {onText: ({text}) => { el.textContent = text; }});
    lecturaTxt.gestion = text; el.textContent = text;
  } catch(err) {
    el.textContent = err && err.text ? err.text : (err && err.code === "not_granted" ? "No se autorizó el uso de Claude en esta vista." : "No se pudo redactar la lectura. Intenta de nuevo en un momento.");
  } finally { btn.disabled = false; }
}


/* Ayuda: cómo se usa y preguntas frecuentes */
const AYUDA_VISTA = {
  inicio:["Inicio", "La portada del día. Arriba ves cuántas noticias críticas faltan por responder, lo último que se publicó y cuatro indicadores. \"Para revisar hoy\" pone primero la noticia crítica más importante; \"Por tema\" muestra cada tema con su última nota. Toca un indicador o un tema para ver sus noticias."],
  menciones:["Menciones", "Todas las noticias que calzaron con tus temas. Cada noticia aparece una vez aunque la publiquen varios medios. Filtra por tono, período, tema o palabra. \"¿Por qué aparece?\" muestra qué término calzó; \"No corresponde\" la descarta y ayuda a afinar las exclusiones."],
  comunicados:["Comunicados", "Prepara una respuesta en tres decisiones: a qué respondes, qué pieza necesitas y con qué enfoque. La IA redacta solo con la noticia y los datos del municipio; lo que falta queda marcado [completar]. Nada se publica: tú apruebas y difundes. Desde el borrador o la lista de aprobados lo envías en PDF por WhatsApp, por correo (Gmail, Outlook o tu programa) o lo guardas en PDF."],
  temas:["Mis temas", "Los temas que PregonIA vigila. Cada tema tiene términos (lo que se busca), contexto (palabras que deben acompañar) y exclusiones (lo que descarta). Tu plan define cuántos temas activos puedes tener."],
  asistente:["Asistente de temas", "Responde cinco preguntas sobre el municipio y PregonIA propone los temas base de tu plan, más sugerencias para sumar. Revisa la propuesta antes de activarla."],
  fuentes:["Fuentes", "Los 100 medios del catálogo: 50 nacionales y 50 de la Región de Valparaíso. Cada uno muestra cómo se lee y su estado: listo, requiere ajuste o restringido (se lee vía Google News)."],
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
  ["Monitoreo", [
    ["¿Qué medios revisa PregonIA?", "100 medios digitales: 50 nacionales y 50 de la Región de Valparaíso, incluidos los medios comunales del litoral central, más páginas de Facebook de medios locales que se ingresan con captura asistida. La lista completa, con el estado de cada uno, está en Ajustes › Fuentes."],
    ["¿Cada cuánto se actualiza?", "Cada 15 minutos. La barra superior muestra la hora de la última actualización. En este prototipo las noticias son ficticias."],
    ["¿Por qué no aparece una noticia que vi?", "Puede que el medio no esté en el catálogo, que sea un medio restringido (se lee vía Google News y llega con retraso) o que la nota no calce con los términos del tema. Revisa términos, variantes y exclusiones en Ajustes › Mis temas."],
    ["¿Por qué aparece una noticia que no tiene que ver?", "Suele ser una coincidencia de nombre, como Casablanca la película o San Antonio de Texas. Márcala como \"No corresponde\" y agrega esa palabra a las exclusiones del tema."],
    ["¿PregonIA copia las noticias de los medios?", "No. Muestra el título, el medio, la fecha, un resumen propio de una línea y el enlace a la nota original. No reproduce el texto, respeta las reglas de cada sitio y no salta muros de pago."],
    ["¿Revisa redes sociales?", "No. Esta versión cubre medios digitales. Las redes sociales quedan para una etapa posterior."]
  ]],
  ["Lectura de los resultados", [
    ["¿Cómo se decide si una noticia es crítica, neutra o positiva?", "Una IA clasifica el tono de cada noticia respecto del tema vigilado, no del medio en general. Si no estás de acuerdo, puedes marcarlo; esas correcciones sirven para mejorar la clasificación."],
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
    <section><h3 class="hp-h">Cómo se usa, en cinco pasos</h3><ol class="hp-guia">${GUIA.map(([a, b]) => `<li><b>${a}</b><span>${b}</span></li>`).join("")}</ol></section>
    <section><h3 class="hp-h">Preguntas frecuentes</h3><input id="helpQ" class="hp-q" type="search" placeholder="Busca, por ejemplo: tono, WhatsApp, límite" aria-label="Buscar en las preguntas frecuentes" value="${esc(helpQ)}"><div id="faqOut">${faqHtml()}</div></section>
    <section class="hp-teclado"><h3 class="hp-h">Atajos de teclado</h3><dl class="hp-atajos"><dt><span class="kbd">1</span> a <span class="kbd">5</span></dt><dd>Ir a Inicio, Menciones, Reportes, Comunicados o Ajustes</dd><dt><span class="kbd">/</span></dt><dd>Buscar en las menciones</dd><dt><span class="kbd">?</span></dt><dd>Abrir o cerrar esta ayuda</dd><dt><span class="kbd">Esc</span></dt><dd>Cerrar ventanas y menús</dd></dl></section>
    <section class="hp-ask"><h3 class="hp-h">¿No encuentras la respuesta?</h3><p class="hint" style="margin:0 0 8px">Pregúntale a PregonIA. Responde con la guía y las preguntas frecuentes de este sistema.</p>
      <form id="helpForm"><textarea id="helpAsk" rows="2" placeholder="Por ejemplo: ¿cómo agrego un tema nuevo?" aria-label="Tu pregunta"></textarea><div style="display:flex;gap:8px;margin-top:8px"><button class="btn primary sm" type="submit" id="helpBtn">Preguntar</button><button class="btn sm" type="button" data-act="help-stop" id="helpStop" hidden>Detener</button></div></form>
      <div id="helpAns" class="hp-ans" aria-live="polite" hidden></div></section>`;
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
    out.textContent = text;
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


/* Noticias reales (etapa 1): /api/noticias lee los medios del catálogo y la demostración queda a un clic. */
const NOTAS_DEMO = NOTAS.slice(), MODO_KEY = "pregonia-modo";
let MODO = {tipo: "demo", info: null, cargando: false, disponible: false};
const horaCorta = iso => new Date(iso).toLocaleTimeString("es-CL", {hour: "2-digit", minute: "2-digit", hourCycle: "h23"});
function pintarModo(){
  const el = $("#demo"); if (!el) return;
  const real = MODO.tipo === "real" && MODO.info, i = MODO.info;
  // Selector siempre visible con las dos opciones; en claude.ai (sin servidor) "Reales" lleva al sitio publicado.
  const sw = MODO.disponible || MODO.cargando
    ? `<span class="modo-sw" role="group" aria-label="Noticias que muestra la aplicación"><button type="button" data-act="modo-demo" aria-pressed="${!real && !MODO.cargando}"><span class="demo-mas">Demostración</span><span class="solo-movil">Demo</span></button><button type="button" data-act="modo-real" aria-pressed="${Boolean(real) || MODO.cargando}" ${MODO.cargando ? "disabled" : ""}>${MODO.cargando ? "Leyendo…" : `<span class="demo-mas">Noticias reales</span><span class="solo-movil">Reales</span>`}</button></span>`
    : (/^https?:$/.test(location.protocol) ? "" : `<a class="modo-link" href="https://pregonia.vercel.app/" target="_blank" rel="noopener">Noticias reales en pregonia.vercel.app</a>`);
  if (MODO.cargando) { el.className = "demo"; el.innerHTML = `<span class="demo-txt"><b>Leyendo medios</b>Buscando noticias de ${esc(S.org)}<span class="demo-mas"> en unas 70 fuentes; puede tardar hasta un minuto</span>…</span>${sw}`; return; }
  if (real) { el.className = "demo real"; el.innerHTML = `<span class="demo-txt"><b>Datos reales</b>${plural(i.notas.length, "nota", "notas")}<span class="demo-mas"> de ${esc(i.comuna)} en ${i.ventana_dias} días · ${i.fuentes.leidas} de ${i.fuentes.total} fuentes leídas a las ${horaCorta(i.generado)}${i.ia ? "" : i.ia_parcial ? " · tono clasificado en parte" : " · tono sin clasificar"}</span></span>${sw}`; return; }
  el.className = "demo"; el.innerHTML = `<span class="demo-txt"><b>Prototipo</b><span class="demo-mas">Noticias y cifras ficticias · catálogo de 100 medios real</span><span class="solo-movil">Datos ficticios</span></span>${sw}`;
}
async function cargarReales(force){
  if (MODO.cargando || (MODO.tipo === "real" && MODO.info && MODO.info.comuna === S.org && !force)) return; MODO.cargando = true; pintarModo();
  const org = S.org;
  try {
    const r = await fetch("/api/noticias?comuna=" + encodeURIComponent(org)); if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json(); if (org !== S.org) { MODO.cargando = false; return cargarReales(); }
    const nuevas = (j.notas || []).filter(n => MED[n.m]).map(n => ({id: n.id, m: n.m, ts: n.ts, t: n.t, b: "", x: n.x || "", tono: n.tono, res: n.res, g: String(n.g), url: n.url, hay: norm(n.t + " " + n.res + " " + (n.x || "") + " " + org + " comuna"), ht: norm(n.t), real: true}));  // la IA ya confirmó que la nota es de esta comuna
    refrescarNotas(nuevas); MODO = {...MODO, tipo: "real", info: {...j, notas: nuevas}, cargando: false};
    try { localStorage.setItem(MODO_KEY, "real"); } catch(e) {}
    pintarModo(); render();
    toast(nuevas.length ? `Listo: ${plural(nuevas.length, "nota real", "notas reales")} de ${org}. Ábrelas en Menciones.` : `Los medios leídos no publicaron sobre ${org} en los últimos ${j.ventana_dias} días.`);
  } catch(e) { MODO.cargando = false; pintarModo(); toast("No se pudieron leer los medios ahora. Sigues viendo la demostración."); }
}
function usarDemo(){ if (MODO.tipo === "demo") return; refrescarNotas(NOTAS_DEMO); MODO = {...MODO, tipo: "demo", info: null}; try { localStorage.setItem(MODO_KEY, "demo"); } catch(e) {} pintarModo(); render(); toast("Volviste a la demostración con noticias ficticias."); }
document.addEventListener("click", e => { const b = e.target.closest("[data-act]"); if (!b) return; if (b.dataset.act === "modo-real") cargarReales(); if (b.dataset.act === "modo-demo") usarDemo(); });
$("#org").addEventListener("change", () => { if (MODO.tipo === "real") cargarReales(true); });
(async () => {
  pintarModo();
  if (!/^https?:$/.test(location.protocol)) return;
  try { const r = await fetch("/api/noticias?ping=1", {cache: "no-store"}); if (!r.ok || !(await r.json()).ok) return; } catch(e) { return; }
  MODO.disponible = true; pintarModo();
  let pref = null; try { pref = localStorage.getItem(MODO_KEY); } catch(e) {}
  if (pref === "real") cargarReales();
})();

/* Tema: la marca es oscura; el modo claro es una opción que se recuerda en este navegador. */
const TEMA_KEY = "pregonia-tema", ICO_TEMA = {sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>', luna: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'};
function temaActual(){ return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark"; }
function pintarTema(){ const claro = temaActual() === "light", b = $("#temaBtn"); if (!b) return; $("#temaIco").innerHTML = claro ? ICO_TEMA.luna : ICO_TEMA.sol; b.setAttribute("aria-label", claro ? "Cambiar a modo oscuro" : "Cambiar a modo claro"); b.title = claro ? "Modo oscuro" : "Modo claro"; }
try { const t = localStorage.getItem(TEMA_KEY); if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t); } catch(e) {}
pintarTema();
new MutationObserver(pintarTema).observe(document.documentElement, {attributes: true, attributeFilter: ["data-theme"]});
/* Volver arriba: aparece en páginas largas, por encima de la barra inferior en el celular. */
addEventListener("scroll", () => { const b = $("#arriba"); if (b) b.hidden = scrollY < innerHeight * 0.9 || document.body.classList.contains("pt-on"); }, {passive: true});
function irAlContenido(){ const h = $("#view h2") || $("#view"); h.setAttribute("tabindex", "-1"); h.focus({preventScroll: true}); }
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return; const a = b.dataset.act;
  if (a === "tema") { const n = temaActual() === "light" ? "dark" : "light"; document.documentElement.setAttribute("data-theme", n); try { localStorage.setItem(TEMA_KEY, n); } catch(err) {} toast(n === "light" ? "Modo claro activado." : "Modo oscuro activado."); }
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
   "Empezar" lleva a la sección de la dirección si había una (enlaces compartidos); si no, a Inicio. */
function mostrarPortada(on){
  const p = $("#portada"); if (!p) return;
  p.hidden = !on; document.body.classList.toggle("pt-on", on);
  if (on) { window.scrollTo(0, 0); setTimeout(() => $("#ptGo").focus({preventScroll:true}), 60); }
}
document.addEventListener("click", e => {
  if (!e.target.closest("#ptGo")) return;
  mostrarPortada(false);
  const k = location.hash.slice(1);
  if (!k || k === "portada") location.hash = "inicio"; else render(true);
});
window.addEventListener("hashchange", () => { if (location.hash === "#portada") mostrarPortada(true); });

render();
mostrarPortada(!/[?&]sin-portada\b/.test(location.search));

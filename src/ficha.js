/* Ficha editorial de cada hecho (diseño en el proyecto: «clasificacion-editorial-pregonia»).
   Qué es (área, encuadre, impulsor) · qué le implica a la cuenta (competencia, papel, tono doble) · qué hacer (prioridad, acción, plazo).
   La IA entrega por nota: a (área), e (encuadre), im (impulsor), p (papel), t2 (tono hacia la contraparte), g (gravedad) y cf (confianza).
   Sin esos datos (demostración o nota sin clasificar) se deduce de las capas por palabras clave (categoría, enfoque y papel).
   Competencia, prioridad, acción y plazo salen de reglas explícitas, y el equipo puede corregir cada ficha: la corrección se aplica
   al hecho, la competencia corregida rige para toda el área en la cuenta, y en el piloto las correcciones se guardan en la configuración
   y entran como criterios para la IA en la lectura siguiente (aprendizaje). */

const AREAS = {
  agua: "Agua y saneamiento", seguridad: "Seguridad", salud: "Salud", educacion: "Educación", vivienda: "Vivienda y barrios",
  obras: "Obras, vialidad y transporte", ambiente: "Residuos y medio ambiente", emergencias: "Emergencias", fomento: "Fomento y empleo",
  social: "Desarrollo social", territorio: "Planificación territorial", probidad: "Presupuesto y probidad", politica: "Relación política", local: "Vida local"
};
const ENCUADRES = {
  logro: "Logro o gestión", servicio: "Servicio", reclamo: "Reclamo ciudadano", conflicto: "Conflicto entre actores", emergencia: "Emergencia",
  probidad: "Probidad o irregularidad", judicial: "Judicial", politico: "Político-electoral", opinion: "Opinión", humano: "Historia humana"
};
const IMPULSORES = {propia: "Agenda propia", autoridad: "Otra autoridad", vecinos: "Vecinos u organizaciones", gremio: "Gremio o empresa", fiscalizador: "Fiscalizador", medio: "Iniciativa del medio"};
const PAPELES_F = {prot: "Protagonista", fuente: "Fuente citada", menc: "Mencionada", alud: "Aludida sin nombre", aus: "Ausente: vacío de vocería", no: "No aparece"};
const COMPETENCIAS = {P: "Competencia propia", C: "Competencia compartida", I: "Incidencia (fiscaliza o legisla)", AE: "Ajena, pero la exponen", A: "Competencia ajena"};
const PRIORIDADES = {P1: "P1 · Crisis", P2: "P2 · Atender", P3: "P3 · Oportunidad", P4: "P4 · Monitoreo", R: "Ruido"};
const ACCIONES = {
  responder: ["Responder", "Dar la versión propia con vocería, por los canales que el tema exige."],
  aclarar: ["Aclarar con datos", "Es de su competencia y la prensa no recoge su versión ni su gestión: informar qué se está haciendo, con datos y una vocería breve."],
  aportar: ["Aportar posición", "Tema de terceros donde la cuenta puede aportar: fijar posición o una gestión concreta."],
  amplificar: ["Amplificar", "Buena noticia: llevarla a más medios y a las redes propias."],
  anticipar: ["Anticipar", "Hay un hito cerca: preparar mensaje y vocería antes de que llegue."],
  coordinar: ["Coordinar", "La solución depende de otra institución: coordinar con ella y comunicar la gestión, no prometer lo ajeno."],
  escalar: ["Escalar a jurídico", "Probidad o tribunales: revisar con jurídico y la jefatura antes de cualquier declaración."],
  monitorear: ["Monitorear", "Seguirlo sin acción por ahora; reaccionar si cambia el tono, el alcance o la gravedad."],
  noamp: ["No amplificar", "Crítica aislada en un solo medio, de alcance local: responder en público la haría crecer. Resolver directo con los afectados y vigilar."],
  archivar: ["Archivar", "No es de su competencia ni la expone."]
};

/* Matriz de competencias por cargo (borrador: la valida Antonio; editable por cuenta en Configuración › Prioridades).
   P propia · C compartida · I incidencia · A ajena. Educación municipal: propia mientras no haya traspaso al SLEP. */
const MATRIZ = {
  municipio:  {agua: "C", seguridad: "C", salud: "P", educacion: "P", vivienda: "C", obras: "P", ambiente: "P", emergencias: "P", fomento: "C", social: "P", territorio: "P", probidad: "P", politica: "P", local: "P"},
  concejal:   {agua: "I", seguridad: "I", salud: "I", educacion: "I", vivienda: "I", obras: "I", ambiente: "I", emergencias: "I", fomento: "I", social: "I", territorio: "P", probidad: "P", politica: "P", local: "I"},
  core:       {agua: "C", seguridad: "C", salud: "C", educacion: "A", vivienda: "C", obras: "C", ambiente: "C", emergencias: "C", fomento: "C", social: "A", territorio: "P", probidad: "P", politica: "P", local: "A"},
  gobernador: {agua: "C", seguridad: "C", salud: "C", educacion: "A", vivienda: "C", obras: "P", ambiente: "C", emergencias: "C", fomento: "P", social: "C", territorio: "P", probidad: "P", politica: "P", local: "A"},
  delegado:   {agua: "C", seguridad: "P", salud: "C", educacion: "A", vivienda: "C", obras: "C", ambiente: "A", emergencias: "P", fomento: "A", social: "C", territorio: "A", probidad: "P", politica: "P", local: "A"},
  diputado:   {agua: "I", seguridad: "I", salud: "I", educacion: "I", vivienda: "I", obras: "I", ambiente: "I", emergencias: "I", fomento: "I", social: "I", territorio: "A", probidad: "P", politica: "P", local: "A"},
  senador:    {agua: "I", seguridad: "I", salud: "I", educacion: "I", vivienda: "I", obras: "I", ambiente: "I", emergencias: "I", fomento: "I", social: "I", territorio: "A", probidad: "P", politica: "P", local: "A"}
};
MATRIZ.alcalde = MATRIZ.municipio;

/* Plazos de respuesta por tipo de cliente, en horas (P4 se revisa una vez por semana). Editables por cuenta. */
const PLAZOS = {
  municipio:     {n: "Municipio", P1: 2, P2: 24, P3: 72},
  delegado:      {n: "Delegación presidencial", P1: 1, P2: 12, P3: 72},
  gobernador:    {n: "Gobierno regional", P1: 2, P2: 24, P3: 72},
  parlamentario: {n: "Diputado o senador", P1: 4, P2: 48, P3: 168},
  colegiado:     {n: "Consejero regional o concejal", P1: 6, P2: 48, P3: 168}
};
const tipoCliente = (c = cuenta()) => { const r = rolDe(c); return r === "delegado" || r === "gobernador" ? r : r === "diputado" || r === "senador" ? "parlamentario" : r === "core" || r === "concejal" ? "colegiado" : "municipio"; };
const plazosDe = (c = cuenta()) => ({...PLAZOS[tipoCliente(c)], ...((c && c.plazos) || {})});
const competenciaDe = (area, c = cuenta()) => ((c && c.compArea) || {})[area] || (MATRIZ[rolDe(c)] || MATRIZ.municipio)[area] || "A";

/* Excepciones por institución a cargo (borrador para validar, igual que la matriz). Dentro de un área, la noticia puede tratar
   de algo que no administra la cuenta: un hospital no es salud municipal (lo administra el Servicio de Salud), una ruta del MOP
   no es una vía comunal y un liceo traspasado al SLEP ya no es educación municipal. Si el texto del hecho nombra a esa institución
   y no nombra a la parte propia, la competencia baja al valor de la excepción (que pasa a «ajena, pero la exponen» si la nombran).
   Se puede desactivar cada una en Configuración › Prioridades. */
const EXCEPCIONES = [
  {id: "hospital", area: "salud", roles: ["municipio", "alcalde", "concejal"], comp: "A",
    n: "Hospitales, SAMU y Servicio de Salud", d: "La salud municipal es la atención primaria (Cesfam, Cecosf, postas y SAPU). Los hospitales los administra el Servicio de Salud.",
    si: /hospital|samu|servicio de salud|seremi de salud|minsal|ministerio de salud|clinica/, no: /cesfam|cecosf|posta|sapu|sar\b|atencion primaria|salud municipal|departamento de salud/},
  {id: "slep", area: "educacion", roles: ["municipio", "alcalde", "concejal"], comp: "A",
    n: "Establecimientos del SLEP", d: "Con el traspaso a un Servicio Local de Educación Pública, los colegios y liceos dejan de ser municipales.",
    si: /\bslep\b|servicio local de educacion/, no: /daem|dem\b|corporacion municipal|educacion municipal/},
  {id: "rutas", area: "obras", roles: ["municipio", "alcalde", "concejal"], comp: "C",
    n: "Rutas y obras del MOP o del Serviu", d: "Las rutas nacionales y las obras del MOP o del Serviu no son vías comunales: el municipio coordina, no resuelve.",
    si: /\bmop\b|vialidad|ruta \d|ruta 68|autopista|concesionaria|serviu|ministerio de obras publicas|efe\b|tren/, no: /direccion de obras|dom\b|calle|pasaje|vereda|bacheo municipal/},
  {id: "sanitaria", area: "agua", roles: ["municipio", "alcalde", "concejal"], comp: "C",
    n: "Empresa sanitaria y DGA", d: "Los cortes y la calidad del agua potable urbana son de la sanitaria (Esval y otras), fiscalizada por la SISS; el municipio coordina y apoya con aljibes.",
    si: /esval|sanitaria|siss|superintendencia de servicios sanitarios|aguas andinas|\bdga\b|direccion general de aguas/, no: /aljibe|camion aljibe|municipalidad repart|municipio repart/},
  {id: "policias", area: "seguridad", roles: ["municipio", "alcalde", "concejal"], comp: "A",
    n: "Hechos policiales y causas penales", d: "Un delito y su investigación son de Carabineros, la PDI y la Fiscalía. La seguridad municipal es prevención, patrullaje preventivo y apoyo a víctimas.",
    si: /carabineros|\bpdi\b|fiscalia|fiscal |detenid|formaliza|imputad|juzgado de garantia/, no: /seguridad municipal|seguridad publica municipal|plan comunal de seguridad|camaras municipales|patrullaje municipal|concejo comunal de seguridad|alcald/}
];
const excepcionesActivas = (c = cuenta()) => { const off = (c && c.excOff) || {}, r = rolDe(c); return EXCEPCIONES.filter(x => !off[x.id] && x.roles.includes(r)); };
function excepcionDe(m, area, c = cuenta()){
  const txt = norm(m.notas.map(n => (n.t || "") + " " + (n.res || "")).join(" "));
  return excepcionesActivas(c).find(x => x.area === area && x.si.test(txt) && !x.no.test(txt)) || null;
}

/* Sin ficha de la IA: la categoría por palabras clave da el área. */
const CAT_AREA = {
  agua: "agua", emergencias: "emergencias", seguridad: "seguridad", salud: "salud", educacion: "educacion", obras: "obras", ambiente: "ambiente",
  economia: "fomento", social: "social", gestion: "probidad", politica: "politica", votaciones: "politica", fiscalizacion: "probidad",
  presupuesto: "probidad", ordenanzas: "territorio", servicios: "obras", saludedu: "salud", comunidad: "social", inversion: "obras",
  sesiones: "politica", gobernacion: "politica", probidad: "probidad", conectividad: "obras", productivo: "fomento", local: "local",
  leyes: "politica", distrito: "local", acusaciones: "politica", nombramientos: "politica", region: "fomento", consejo: "politica",
  transporte: "obras", territorio: "territorio", descentralizacion: "politica", gobierno: "politica", municipios: "politica",
  orden: "seguridad", tomas: "vivienda", conflictos: "social", migracion: "social", programas: "social", voceria: "politica",
  relacion: "politica", provincias: "politica"
};
const CAT_AREA_ROL = {delegado: {servicios: "politica"}};
const ENF_ENCUADRE = {opinion: "opinion", emergencia: "emergencia", probidad: "probidad", judicial: "judicial", conflicto: "reclamo", politica: "politico"};

/* Lo que más se repite entre las notas del hecho (empate: el primero). */
const moda = xs => { const c = {}; let best = null; xs.filter(Boolean).forEach(x => { c[x] = (c[x] || 0) + 1; if (!best || c[x] > c[best]) best = x; }); return best; };
const ORDEN_ENC = ["probidad", "judicial", "emergencia", "conflicto", "reclamo", "politico", "opinion", "humano", "servicio", "logro"];
const ORDEN_PAP = ["prot", "fuente", "menc", "alud", "no"];
const correccionDe = (g, c = cuenta()) => ((c && c.correcciones) || {})[g] || null;

function fichaDe(m, c = cuenta()){
  const clave = (c && c.fv || 0) + "|" + rolDe(c); m._fic = m._fic || {}; if (m._fic[clave]) return m._fic[clave];
  const fs = m.notas.map(n => n.f).filter(Boolean), ia = fs.length > 0, cor = correccionDe(m.g, c) || {};
  const cat = categoriaDe(m, c), enf = enfoqueDe(m), pap = papelDe(m);
  // Qué es
  const area = cor.a || moda(fs.map(f => f.a)) || ((CAT_AREA_ROL[rolDe(c)] || {})[cat.k]) || CAT_AREA[cat.k] || "local";
  const encuadre = cor.e || ORDEN_ENC.find(k => fs.some(f => f.e === k)) || ENF_ENCUADRE[enf.k] || (m.tono === "pos" ? "logro" : "servicio");
  const impulsor = cor.im || moda(fs.map(f => f.im)) || null;
  // Qué le implica
  let papel = cor.p || ORDEN_PAP.find(k => fs.some(f => f.p === k)) || (pap.k === "terr" ? "no" : pap.k);
  const tono = m.tono, tono2 = fs.some(f => f.t2 === "cri") ? "cri" : fs.some(f => f.t2 === "pos") ? "pos" : fs.length ? "neu" : null;
  const critico = tono === "cri" || tono2 === "cri";
  const gravedad = fs.length ? Math.max(...fs.map(f => Number.isFinite(f.g) ? f.g : 0)) : (m.grave ? 2 : tono === "cri" ? 1 : 0);
  const confianza = fs.some(f => f.cf === "b") ? "b" : fs.some(f => f.cf === "m") ? "m" : ia ? "a" : null;
  const medios = new Set(m.notas.map(n => n.m)).size, alcance = escalera(m.notas).max;
  const v6 = new Set(m.notas.filter(n => n.ts - m.first <= 6 * 36e5).map(n => n.m)).size;
  const exc = !cor.comp && !((c && c.compArea) || {})[area] ? excepcionDe(m, area, c) : null;
  let comp = cor.comp || (exc ? exc.comp : competenciaDe(area, c));
  const expuesta = ["prot", "fuente", "menc", "alud"].includes(papel);
  if (comp === "A" && expuesta) comp = "AE";
  // Vacío de vocería: tema crítico o grave de su competencia propia, en dos o más medios, sin su versión.
  // No aplica a lo policial o judicial, a las historias humanas ni a la opinión: ahí no se espera una versión de la cuenta.
  if (!cor.p && comp === "P" && papel === "no" && !["local", "politica"].includes(area) && !["judicial", "humano", "opinion"].includes(encuadre) && (critico || gravedad >= 2) && medios >= 2) papel = "aus";
  // Qué hacer: prioridad
  let prio;
  if (comp === "A") prio = "R";
  else if ((critico && (comp === "P" || papel === "prot") && (gravedad >= 3 || alcance >= 1 || v6 >= 3)) || (["probidad", "judicial"].includes(encuadre) && expuesta && (critico || gravedad >= 2))) prio = "P1";
  else if ((critico && (comp === "P" || comp === "C" || (comp === "AE" && papel !== "menc"))) || papel === "aus" || (critico && papel === "prot")) prio = "P2";
  else if ((tono === "pos" || tono2 === "pos") && (expuesta || comp === "P")) prio = "P3";
  else if ((comp === "I" || comp === "C") && ["reclamo", "conflicto", "emergencia"].includes(encuadre) && gravedad >= 2) prio = "P3";
  else prio = "P4";
  // Una oportunidad que ya pasó no queda en la cola: baja a monitoreo (no hay nada que atender a destiempo).
  if (prio === "P3" && !cor.prio && m.last + plazosDe(c).P3 * 36e5 < Date.now()) prio = "P4";
  if (cor.prio) prio = cor.prio;
  // Acción
  let acc;
  if (prio === "R") acc = "archivar";
  else if (prio === "P1") acc = ["probidad", "judicial"].includes(encuadre) ? "escalar" : "responder";
  else if (prio === "P2") acc = papel === "aus" ? "aclarar"
    : (medios === 1 && alcance === 0 && gravedad <= 1 && papel !== "prot") ? "noamp"
    : (comp === "C" || comp === "AE") && papel !== "prot" ? "coordinar" : "responder";
  else if (prio === "P3") acc = (tono === "pos" || tono2 === "pos") ? "amplificar" : "aportar";
  else acc = "monitorear";
  if (cor.acc) acc = cor.acc;
  // Plazo: corre desde la última publicación (cada nota nueva es un desarrollo del hecho).
  const h = plazosDe(c)[prio], vence = h ? m.last + h * 36e5 : null;
  const decidido = respondida(m.g) || !!noResp(m.g);
  const ri = typeof rafagaInfo === "function" ? rafagaInfo(m.notas.map(n => ({ts: n.ts, medio: n.m})).sort((a, b) => a.ts - b.ts)) : {k: 0},
    alza = ri.k >= 3 && Date.now() - m.last < 48 * 36e5 ? `${ri.k} medios en ${lapsoTxt(ri.ms)}` : "";
  const f = {ia, area, encuadre, alza, impulsor, papel, tono, tono2, gravedad, confianza, medios, alcance, v6, comp, exc: exc ? exc.id : null, prio, acc, vence, decidido, corregida: !!correccionDe(m.g, c),
    revisar: confianza === "b" && !correccionDe(m.g, c), sinTono: m.notas.length > 0 && m.notas.every(n => n.sinTono)};
  return (m._fic[clave] = f);
}

/* Presentación */
const PRIO_CLS = {P1: "t-cri", P2: "t-neu", P3: "t-pos", P4: "", R: ""};
function venceTxt(f){
  if (!f.vence || f.decidido) return "";
  const r = f.vence - Date.now(), hh = Math.abs(r) / 36e5;
  const t = hh < 1 ? Math.max(1, Math.round(hh * 60)) + " min" : hh < 48 ? Math.round(hh) + " h" : Math.round(hh / 24) + " días";
  return r < 0 ? `vencido hace ${t}` : `plazo: ${t}`;
}
function fichaHtml(m){
  const f = fichaDe(m), [an, ad] = ACCIONES[f.acc];
  return `<p class="clasif ficha"><span class="pill ${PRIO_CLS[f.prio]} prio" title="Prioridad">${PRIORIDADES[f.prio]}</span>${venceTxt(f) ? `<span class="${f.vence < Date.now() ? "venc" : ""}">${venceTxt(f)}</span>` : ""}${f.alza ? `<span class="alza" title="Tema en alza: varios medios lo publicaron en poco tiempo">En alza · ${esc(f.alza)}</span>` : ""}<span class="cl-cat">${esc(AREAS[f.area])}</span><span${f.exc ? ` title="${esc((EXCEPCIONES.find(x => x.id === f.exc) || {}).d || "")}"` : ""}>${esc(COMPETENCIAS[f.comp])}${f.exc ? " · " + esc((EXCEPCIONES.find(x => x.id === f.exc) || {}).n || "") : ""}</span><span>${esc(ENCUADRES[f.encuadre])}</span><span>${esc(PAPELES_F[f.papel] || "")}</span>${f.impulsor ? `<span>${esc(IMPULSORES[f.impulsor])}</span>` : ""}${f.sinTono ? `<span class="rev" title="La IA no alcanzó a leer el tono; se completa en la próxima lectura. Revísalo antes de descartar.">Tono por confirmar</span>` : f.revisar ? `<span class="rev" title="La IA no está segura de esta ficha">Revisar</span>` : ""}${f.corregida ? `<span class="rev ok" title="Corregida por el equipo">Corregida</span>` : ""}</p>
    ${f.decidido ? "" : `<p class="acc sm accion-${f.acc}"><b>${esc(an)}</b>${esc(ad)}</p>`}`;
}
/* Corrección de la ficha: los mismos campos que calcula el sistema; lo que no se toca queda automático. */
function correccionHtml(m){
  const f = fichaDe(m), cor = correccionDe(m.g) || {};
  const sel = (k, label, opts, val) => `<label>${label}<select data-fic="${k}"><option value="">Automático${val ? " (" + esc(opts[val] || val) + ")" : ""}</option>${Object.entries(opts).map(([v, n]) => `<option value="${v}" ${cor[k] === v ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>`;
  return `<details class="corr"><summary>Corregir ficha</summary><div class="corr-g" data-g="${esc(m.g)}">
    ${sel("a", "Área", AREAS, f.area)}${sel("comp", "Competencia (rige para toda el área)", {P: COMPETENCIAS.P, C: COMPETENCIAS.C, I: COMPETENCIAS.I, A: COMPETENCIAS.A}, f.comp === "AE" ? "A" : f.comp)}
    ${sel("e", "Encuadre", ENCUADRES, f.encuadre)}${sel("p", "Papel", PAPELES_F, f.papel)}${sel("im", "Impulsor", IMPULSORES, f.impulsor)}
    ${sel("prio", "Prioridad", PRIORIDADES, f.prio)}${sel("acc", "Acción", Object.fromEntries(Object.entries(ACCIONES).map(([k, v]) => [k, v[0]])), f.acc)}
    <div class="corr-b"><button class="btn sm primary" type="button" data-act="fic-guardar" data-g="${esc(m.g)}">Guardar corrección</button>${correccionDe(m.g) ? `<button class="btn sm ghost" type="button" data-act="fic-borrar" data-g="${esc(m.g)}">Volver a automático</button>` : ""}</div>
    <p class="hint">La corrección queda en esta cuenta y enseña al sistema: en el piloto entra como criterio para clasificar las noticias siguientes.</p></div></details>`;
}
function guardarCorreccion(g, campos, m){
  const c = cuenta(); c.correcciones = c.correcciones || {};
  const limpio = Object.fromEntries(Object.entries(campos).filter(([k, v]) => v));
  if (limpio.comp) { (c.compArea = c.compArea || {})[limpio.a || fichaDe(m).area] = limpio.comp; delete limpio.comp; }
  if (Object.keys(limpio).length) c.correcciones[g] = {...limpio, t: m ? m.lead.t : "", ts: Date.now()};
  else delete c.correcciones[g];
  // Tope: las 60 más recientes (la IA usa las 12 últimas como criterio).
  const ks = Object.keys(c.correcciones).sort((a, b) => c.correcciones[b].ts - c.correcciones[a].ts); ks.slice(60).forEach(k => delete c.correcciones[k]);
  c.fv = (c.fv || 0) + 1; save();
}
/* Cola de decisiones: lo que exige una decisión del equipo, de lo más urgente a lo menos. */
function colaDecisiones(ms){
  const rank = {P1: 0, P2: 1, P3: 2};
  return ms.map(m => ({m, f: fichaDe(m)})).filter(x => rank[x.f.prio] != null && !x.f.decidido)
    .sort((a, b) => rank[a.f.prio] - rank[b.f.prio] || (a.f.vence || 0) - (b.f.vence || 0));
}

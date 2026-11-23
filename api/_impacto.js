// Generado por scripts/build.py desde src/impacto.js. No editar a mano.
/* Redacción · puntaje de impacto de una noticia (0 a 100) para proponerla como publicación de las cuentas de PregonIA.
   Lo usan la página /redaccion (modo de prueba) y el servidor (api/_redaccion.js, lectura programada):
   scripts/build.py copia este archivo a api/_impacto.js para que ambos puntúen exactamente igual.
   Cuatro señales que eligió el editor, más la recencia:
     repercusión en medios (cuántos medios y de qué alcance), interacción en redes (cuentas de medios monitoreadas),
     autoridades de la nómina que aparecen y temas críticos (agua, emergencias, seguridad, salud, grandes inversiones).
   Todo es por palabras y conteos, sin IA: es barato, explicable y se puede auditar. */
const IMP_PESOS = {repercusion: 35, redes: 20, autoridades: 15, temas: 20, recencia: 10};
const IMP_TEMAS = {
  agua: {n: "Agua y sequía", p: ["agua potable", "sequia", "escasez hidrica", "camion aljibe", "aljibe", "corte de agua", "sin agua", "esval", "embalse", "napas", "acuifero", "apr ", "agua potable rural", "derechos de agua", "desalinizadora"]},
  emergencias: {n: "Emergencias", p: ["incendio", "evacuacion", "senapred", "alerta roja", "alerta amarilla", "temporal", "marejada", "tsunami", "sismo", "terremoto", "aluvion", "inundacion", "corte de luz", "sin luz", "emergencia", "bomberos", "derrame"]},
  seguridad: {n: "Seguridad", p: ["homicidio", "balacera", "disparos", "baleado", "asalto", "portonazo", "robo", "delincuencia", "narcotrafico", "detenido", "carabineros", "pdi", "fiscalia", "seguridad publica", "toma de terreno", "crimen", "secuestro", "encerrona"]},
  salud: {n: "Salud", p: ["hospital", "cesfam", "sapu", "urgencia", "lista de espera", "brote", "virus", "contagio", "vacunacion", "seremi de salud", "intoxicacion", "medicos", "salud primaria", "dengue", "influenza"]},
  inversion: {n: "Grandes inversiones", p: ["millones de dolares", "mil millones", "inversion", "megaproyecto", "puerto", "plataforma logistica", "concesion", "licitacion", "proyecto inmobiliario", "planta", "seia", "evaluacion ambiental", "fndr", "gobierno regional aprobo", "core aprobo", "obra"]}
};
/* Palabras que agravan cualquier tema: vidas en riesgo o daño masivo. */
const IMP_GRAVE = ["muerto", "muertos", "fallecido", "fallecidos", "fallecio", "victima fatal", "victimas fatales", "herido grave", "heridos", "desaparecido", "evacuados", "damnificados", "estado de catastrofe", "alerta roja", "zona de catastrofe"];
/* Peso de cada cargo cuando aparece en la noticia. */
const IMP_CARGO = {gobernador: 15, senador: 14, diputado: 13, delegado: 12, alcalde: 12, core: 9, concejal: 7};
/* Términos de la región, para las noticias de alcance regional y nacional que afectan a los territorios elegidos. */
const IMP_REGION = ["region de valparaiso", "quinta region", "v region", "gobierno regional de valparaiso", "gore valparaiso", "gobernador regional", "consejo regional de valparaiso", "delegacion presidencial regional", "litoral central", "provincia de san antonio", "provincia de valparaiso", "provincia de marga marga", "provincia de quillota", "provincia de los andes", "provincia de petorca", "provincia de san felipe"];

const impNorm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ");
const impEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const impTiene = (t, p) => new RegExp("(^|[^a-z0-9])" + impEsc(p.trim()) + "($|[^a-z0-9])").test(t);

/* Nómina lista para buscar: [{n, rol, zona, re}]. Se arma una vez (variantes de nombre de src/autoridades.js). */
function impAutoridades(lista, variantes){
  return (lista || []).map(a => {
    const vs = (variantes ? variantes(a) : [impNorm(a.n)]).map(impNorm).filter(v => v.split(" ").length >= 2);
    return vs.length ? {n: a.n, rol: a.rol, zona: a.zona, re: new RegExp("(^|[^a-z])(" + vs.map(impEsc).join("|") + ")([^a-z]|$)")} : null;
  }).filter(Boolean);
}

/* Palabras con contenido de un titular, para comparar si dos notas cuentan el mismo hecho. */
const IMP_VACIAS = new Set("el la los las un una unos unas de del al a en y o u que por para con sin sobre tras ante entre hasta desde se su sus es son fue ser han ha hay mas muy ya no si lo le les como este esta estos estas ese esa eso tu mi nos ni pero porque cuando donde quien cual cuales tras segun".split(" "));
function impPalabras(t){ return new Set(impNorm(t).replace(/[^a-z0-9ñ ]+/g, " ").split(" ").filter(w => w.length > 2 && !IMP_VACIAS.has(w))); }
function impParecido(a, b){
  const A = a instanceof Set ? a : impPalabras(a), B = b instanceof Set ? b : impPalabras(b);
  if (!A.size || !B.size) return 0; let c = 0; A.forEach(w => { if (B.has(w)) c++; });
  return c / Math.min(A.size, B.size) * 0.6 + c / (A.size + B.size - c) * 0.4;
}
/* Agrupa notas que cuentan el mismo hecho. Codicioso y barato: suficiente para proponer.
   Dos notas son el mismo hecho si sus titulares se parecen mucho, o si tocan la misma comuna en menos de 36 horas,
   comparten al menos dos palabras con contenido (sin contar el nombre de la comuna) y el mismo tema crítico. */
const IMP_UMBRAL_GRUPO = 0.42;
const impTemasDe = t => new Set(Object.entries(IMP_TEMAS).filter(([, x]) => x.p.some(p => impTiene(t, p))).map(([k]) => k));
function impFicha(n){
  const t = impNorm(n.titulo + " " + (n.desc || "")), com = new Set((n.comunas || []).filter(c => c !== "Región"));
  const fuera = new Set([...com].flatMap(c => [...impPalabras(c)]));
  return {p: impPalabras(n.titulo), q: new Set([...impPalabras(n.titulo)].filter(w => !fuera.has(w))), com, temas: impTemasDe(t), ts: n.ts};
}
function impMismoHecho(a, b){
  if (impParecido(a.p, b.p) >= IMP_UMBRAL_GRUPO) return true;
  if (![...a.com].some(c => b.com.has(c)) || Math.abs(a.ts - b.ts) > 36 * 36e5) return false;
  let comunes = 0; a.q.forEach(w => { if (b.q.has(w)) comunes++; });
  return comunes >= 2 && [...a.temas].some(t => b.temas.has(t));
}
function impAgrupar(notas, grupos = []){
  const gs = grupos.map(g => ({...g, notas: [...g.notas], _f: g.notas.map(impFicha)}));
  [...notas].sort((a, b) => a.ts - b.ts).forEach(n => {
    if (gs.some(g => g.notas.some(x => x.url === n.url))) return;
    const f = impFicha(n); let mejor = null, mv = 0;
    gs.forEach(g => { const v = Math.max(...g._f.map(q => impMismoHecho(f, q) ? 1 + impParecido(f.p, q.p) : 0)); if (v > mv) { mv = v; mejor = g; } });
    if (mejor) { mejor.notas.push(n); mejor._f.push(f); mejor.cambio = true; }
    else gs.push({id: "h" + n.id, notas: [n], _f: [f], nuevo: true, cambio: true});
  });
  return gs.map(g => { delete g._f; return g; });
}
/* Alcance de un hecho: nacional si lo publicó un medio nacional; regional si uno regional; si no, comunal. */
function impAlcance(notas){ const a = new Set(notas.map(n => n.ambito)); return a.has("nacional") ? "nacional" : a.has("regional") ? "regional" : "comunal"; }
/* Interacción de una publicación de redes: me gusta + 2 × comentarios + 3 × compartidos. */
const impInteraccion = n => n && n.int ? (Number(n.int.l) || 0) + 2 * (Number(n.int.c) || 0) + 3 * (Number(n.int.s) || 0) : 0;

/* Puntaje de un hecho. ctx: {ahora, autoridades (de impAutoridades), cercanos: [términos de revisión reforzada], pesos}. */
function impPuntaje(h, ctx = {}){
  const P = {...IMP_PESOS, ...(ctx.pesos || {})}, ahora = ctx.ahora || Date.now(), notas = h.notas || [];
  const texto = impNorm(notas.map(n => n.titulo + " " + (n.desc || "")).join(" · "));
  // Repercusión: medios distintos y alcance del mayor.
  const medios = [...new Set(notas.map(n => n.medio))], alc = impAlcance(notas);
  const rep = Math.min(1, ([0, 6, 16, 24, 29, 32][Math.min(medios.length, 5)] + (alc === "nacional" ? 3 : alc === "regional" ? 1 : 0)) / 35);
  // Redes: interacción sumada de las publicaciones de cuentas de medios (escala logarítmica, 2.000 puntos ≈ máximo).
  const inter = notas.reduce((s, n) => s + impInteraccion(n), 0), red = inter ? Math.min(1, Math.log10(1 + inter) / Math.log10(2001)) : 0;
  // Autoridades de la nómina.
  const auts = (ctx.autoridades || []).filter(a => a.re.test(texto));
  const aut = auts.length ? Math.min(1, (Math.max(...auts.map(a => IMP_CARGO[a.rol] || 8)) + 2 * (auts.length - 1)) / 15) : 0;
  // Temas críticos y gravedad.
  const temas = Object.entries(IMP_TEMAS).filter(([, t]) => t.p.some(p => impTiene(texto, p))).map(([k, t]) => ({k, n: t.n}));
  const grave = IMP_GRAVE.some(p => impTiene(texto, p));
  const tem = Math.min(1, ((temas.length ? 14 + 3 * (temas.length - 1) : 0) + (grave ? 6 : 0)) / 20);
  // Recencia: la nota más nueva.
  const ult = notas.length ? Math.max(...notas.map(n => n.ts)) : 0, horas = (ahora - ult) / 36e5;
  const rec = horas < 3 ? 1 : horas < 6 ? 0.8 : horas < 12 ? 0.6 : horas < 24 ? 0.4 : horas < 48 ? 0.2 : 0;
  const senales = {repercusion: Math.round(rep * P.repercusion), redes: Math.round(red * P.redes), autoridades: Math.round(aut * P.autoridades), temas: Math.round(tem * P.temas), recencia: Math.round(rec * P.recencia)};
  const total = Object.values(P).reduce((s, v) => s + v, 0) || 100;
  const puntaje = Math.round(Object.values(senales).reduce((s, v) => s + v, 0) / total * 100);
  // Revisión reforzada: la noticia toca territorios o actores con los que el editor declaró relación.
  const cercanos = (ctx.cercanos || []).filter(c => c && impTiene(texto, impNorm(c)));
  return {puntaje, senales, alcance: alc, ultima: ult,
    detalle: {medios: medios.length, nombres: medios.slice(0, 8), interaccion: inter, redes: notas.filter(n => n.via === "instagram" || n.via === "facebook").length,
      autoridades: auts.map(a => a.n), temas: temas.map(t => t.n), grave},
    sensible: cercanos.length > 0, cercanos};
}

/* Ámbito de una noticia (área de interés), para que la selección del día cubra temas distintos y no cinco notas del mismo.
   Se decide por palabras, sin IA; gana el ámbito con más coincidencias y, si empatan, el primero de la lista. */
const IMP_AMBITOS = [
  ["Seguridad", ["homicidio", "balacera", "disparos", "baleado", "asalto", "portonazo", "robo", "delincuencia", "narcotrafico", "detenido", "carabineros", "pdi", "fiscalia", "seguridad publica", "crimen", "secuestro", "encerrona", "formalizado"]],
  ["Agua y medio ambiente", ["agua potable", "sequia", "escasez hidrica", "aljibe", "esval", "embalse", "napas", "acuifero", "apr ", "derechos de agua", "desalinizadora", "humedal", "contaminacion", "medio ambiente", "reciclaje", "basural", "sma", "seia"]],
  ["Emergencias", ["incendio", "evacuacion", "senapred", "alerta roja", "alerta amarilla", "temporal", "marejada", "sismo", "terremoto", "aluvion", "inundacion", "corte de luz", "sin luz", "emergencia", "bomberos", "accidente", "choque", "volcamiento"]],
  ["Salud", ["hospital", "cesfam", "sapu", "urgencia", "lista de espera", "brote", "virus", "contagio", "vacunacion", "seremi de salud", "intoxicacion", "medicos", "salud primaria", "influenza", "dengue"]],
  ["Economía y fomento", ["empleo", "desempleo", "emprendedor", "emprendimiento", "pyme", "pymes", "comercio", "feria", "sercotec", "corfo", "turismo", "enoturismo", "vendimia", "vino", "viña", "vinedo", "agricola", "exportacion", "inversion", "empresa", "plataforma logistica", "puerto", "zona franca"]],
  ["Obras e infraestructura", ["obra", "obras", "pavimentacion", "ruta 68", "ruta 78", "camino", "puente", "alcantarillado", "luminarias", "licitacion", "polideportivo", "construccion", "mop", "serviu", "vivienda", "subsidio habitacional", "tranque", "plaza"]],
  ["Educación", ["colegio", "escuela", "liceo", "educacion", "alumnos", "estudiantes", "profesores", "jardin infantil", "junji", "daem", "universidad", "matricula", "sae", "simce", "paes"]],
  ["Cultura, deporte y comunidad", ["cultura", "festival", "fiesta", "concierto", "museo", "biblioteca", "patrimonio", "deporte", "club deportivo", "campeonato", "futbol", "aniversario", "vecinos", "junta de vecinos", "voluntarios", "adulto mayor", "mujeres", "juventud"]],
  ["Gestión y política local", ["alcalde", "concejo municipal", "concejales", "municipalidad", "municipio", "presupuesto municipal", "ordenanza", "core", "gobierno regional", "gobernador", "delegado presidencial", "contraloria", "diputado", "senador"]]
];
const IMP_AMBITO_BASE = "Comunidad";
function impAmbito(h){
  const t = impNorm((h.notas || []).map(n => n.titulo + " " + (n.desc || "")).join(" · ")) + " " + impNorm(h.titulo || "");
  let mejor = IMP_AMBITO_BASE, mv = 0;
  IMP_AMBITOS.forEach(([n, ps]) => { const v = ps.filter(p => impTiene(t, p)).length; if (v > mv) { mv = v; mejor = n; } });
  return mejor;
}
/* Selección del día: lo de mayor impacto, con tope por ámbito para que cubra áreas distintas.
   Primero toma lo mejor de cada ámbito (en orden de puntaje) y después completa con lo que quede, hasta «max» y «porAmbito» por ámbito. */
function impSeleccion(props, {max = 8, porAmbito = 2, piso = 30} = {}){
  const ord = [...props].filter(p => p.puntaje >= piso).sort((a, b) => b.puntaje - a.puntaje).map(p => ({p, a: impAmbito(p)}));
  const cuenta = new Map(), elegidas = [], vistos = new Set();
  const tomar = x => { if (elegidas.length >= max || vistos.has(x.p.id) || (cuenta.get(x.a) || 0) >= porAmbito) return; vistos.add(x.p.id); cuenta.set(x.a, (cuenta.get(x.a) || 0) + 1); elegidas.push(x); };
  ord.forEach(x => { if (!cuenta.get(x.a)) tomar(x); });
  ord.forEach(tomar);
  return elegidas.sort((a, b) => b.p.puntaje - a.p.puntaje);
}
export { IMP_PESOS, IMP_TEMAS, IMP_REGION, impNorm, impTiene, impAutoridades, impPalabras, impParecido, impAgrupar, impAlcance, impInteraccion, impPuntaje, IMP_UMBRAL_GRUPO, IMP_AMBITOS, impAmbito, impSeleccion };

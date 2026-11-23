// Redacción · detección de noticias de alto impacto para las cuentas de Facebook e Instagram de PregonIA.
// La llama la lectura programada (api/ingesta.js) con lo que ya leyó de los medios, para no leer dos veces cada fuente,
// y también /api/redaccion cuando el editor pide «Buscar ahora».
// Pasos: noticias de las comunas elegidas por los editores (y, si lo pidieron, las regionales y nacionales que afectan a la región)
// → se agrupan por hecho → puntaje de impacto (api/_impacto.js, el mismo de la página) → la IA escribe un titular y un resumen
// neutrales solo de lo que supera el piso → se guardan como propuestas → avisos al celular del editor.
// Nada se publica desde aquí: el editor revisa, redacta y aprueba en /redaccion.
// Tablas: editores, redaccion_config, redaccion_propuestas, redaccion_posts, redaccion_suscripciones (supabase/esquema.sql).
import { candidatasDe, leerGoogleNews, leerGoogleNewsConsulta } from "./_lectura.js";
import { AUTORIDADES, variantesNombre } from "./_autoridades.js";
import { impAutoridades, impAgrupar, impPuntaje, impNorm, impTiene, IMP_REGION } from "./_impacto.js";

const VENTANA_H = 48;          // noticias de las últimas 48 horas
const PISO_IA = 30;            // solo lo que llega a este puntaje pasa por la IA (titular y resumen propios)
const MAX_IA = 12;             // tope de hechos por pasada que pasan por la IA (costo acotado)
const SITIO = () => process.env.SITIO_URL || "https://pregonia.cl";
const AUTS = impAutoridades(AUTORIDADES, variantesNombre);
const lista = xs => "(" + xs.map(x => '"' + String(x).replace(/["\\]/g, "") + '"').join(",") + ")";

/* Hora de Chile (America/Santiago), para el resumen de la mañana y el silencio nocturno. */
function chile(ts = Date.now()){
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23"}).formatToParts(new Date(ts)).map(x => [x.type, x.value]));
  return {fecha: `${p.year}-${p.month}-${p.day}`, hora: Number(p.hour)};
}

/* Titular y resumen neutrales con Claude Haiku: hechos atribuidos, sin adjetivos ni opinión. Descarta lo que no es noticia. */
async function iaNeutral(grupos){
  const clave = process.env.ANTHROPIC_API_KEY; if (!clave || !grupos.length) return new Map();
  const lineas = grupos.map((g, i) => `${i}. ${g.notas.slice(0, 4).map(n => `[${n.medio}] ${n.titulo}${n.desc ? " — " + n.desc.slice(0, 200) : ""}`).join(" | ")}`).join("\n");
  const prompt = `Eres editor de El Pregonero, un medio informativo digital de la Región de Valparaíso, Chile, con línea editorial neutral estricta. Estos son hechos noticiosos; cada línea junta las notas de distintos medios sobre el mismo hecho:

${lineas}

Para cada hecho devuelve un objeto con:
- "i": su número.
- "noticia": false si no es un hecho noticioso de interés público (publicidad, avisos comerciales, horóscopo, farándula sin interés público, obituarios de personas privadas, concursos); si no, true.
- "titular": titular propio, informativo y neutral, de máximo 14 palabras, en español de Chile. Sin adjetivos valorativos, sin signos de exclamación, sin mayúsculas sostenidas y sin copiar el titular de un medio.
- "resumen": resumen propio de máximo 35 palabras, solo con hechos que estén en las notas, atribuidos («según [medio]» cuando corresponda). No agregues datos, cifras ni nombres que no estén en las notas. No menciones partidos políticos salvo que sean el centro del hecho.

Responde solo con un arreglo JSON compacto, en una sola línea, sin bloque de código ni texto adicional.`;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {method: "POST", signal: AbortSignal.timeout(25000),
      headers: {"x-api-key": clave, "anthropic-version": "2023-06-01", "content-type": "application/json"},
      body: JSON.stringify({model: process.env.ANTHROPIC_MODEL_RAPIDO || "claude-haiku-5-5", max_tokens: 3000, messages: [{role: "user", content: prompt}]})});
    if (!r.ok) return new Map();
    const d = await r.json(), txt = (d.content || []).map(c => c.text || "").join("");
    const a = JSON.parse(txt.slice(txt.indexOf("["), txt.lastIndexOf("]") + 1));
    return new Map((Array.isArray(a) ? a : []).filter(x => Number.isInteger(Number(x.i))).map(x => [Number(x.i), x]));
  } catch(e) { return new Map(); }
}

/* Avisos al celular del editor (Web Push), con las llaves de los avisos de PregonIA. */
const pushListo = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
async function enviar(sb, subs, carga){
  if (!pushListo() || !subs.length) return 0;
  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:avisos@pregonia.cl", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  let ok = 0;
  await Promise.all(subs.map(async s => {
    try { await webpush.sendNotification({endpoint: s.endpoint, keys: {p256dh: s.p256dh, auth: s.auth}}, JSON.stringify(carga), {TTL: 6 * 3600, urgency: carga.urgente ? "high" : "normal"}); ok++; }
    catch(e) { if (e && (e.statusCode === 404 || e.statusCode === 410)) await sb(`redaccion_suscripciones?endpoint=eq.${encodeURIComponent(s.endpoint)}`, {method: "DELETE"}).catch(() => {}); }
  }));
  return ok;
}

/* Notas candidatas: de cada comuna elegida y, si se pidió, las regionales que afectan a la región. Cada una sabe a qué comunas toca. */
function candidatas(items, comunas, nacional, gn, desde, ahora){
  const porUrl = new Map(), inter = new Map(items.filter(x => x.int).map(x => [x.url, x.int]));
  const sumar = (n, territorio) => { const x = porUrl.get(n.url) || {...n, comunas: [], ...(inter.get(n.url) ? {int: inter.get(n.url)} : {})}; if (!x.comunas.includes(territorio)) x.comunas.push(territorio); porUrl.set(n.url, x); };
  comunas.forEach(c => candidatasDe(c, items.concat(gn[c] || []), desde, ahora).forEach(n => sumar(n, c)));
  if (nacional) {
    const reg = items.concat(gn._region || []).filter(x => Number.isFinite(x.fecha) && x.fecha >= desde && x.fecha <= ahora + 36e5 && IMP_REGION.some(p => impTiene(impNorm(x.titulo + " " + (x.desc || "")), p)));
    reg.forEach(x => sumar({id: "r" + hashUrl(x.url), m: x.m.id, medio: x.m.nombre, ambito: x.m.ambito, titulo: x.titulo, desc: x.desc, url: x.url, ts: Math.min(x.fecha, ahora), via: x.via || "lectura"}, "Región"));
  }
  return [...porUrl.values()].map(n => ({id: n.id, medio: n.medio, ambito: n.ambito, titulo: n.titulo.slice(0, 300), desc: (n.desc || "").slice(0, 300), url: n.url, ts: n.ts, via: n.via || "lectura", comunas: n.comunas, ...(n.int ? {int: n.int} : {})}));
}
const hashUrl = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };

/* Lectura de Google News para las comunas que la lectura programada no consultó (las que no son cuentas cliente). */
export async function googleNewsRedaccion(comunas, nacional, yaLeidas = {}){
  const gn = {...yaLeidas};
  await Promise.all(comunas.filter(c => !gn[c]).map(async c => { gn[c] = await leerGoogleNews(c, 2).catch(() => []); }));
  if (nacional) gn._region = await leerGoogleNewsConsulta('"Región de Valparaíso"', 2).catch(() => []);
  return gn;
}

/* Paso completo. sb: función de Supabase del servidor (clave secreta). items: notas leídas de medios y redes (con su medio en .m).
   gnPorComuna: Google News ya leído por la lectura programada ({comuna: items}). */
export async function detectarRedaccion(sb, items, {gnPorComuna = {}, ahora = Date.now()} = {}){
  let configs;
  try { configs = await sb("redaccion_config?select=usuario,comunas,nacional,umbral,silencio,resumen_hora,resumen_enviado,cercanos,pesos"); }
  catch(e) { return {omitido: "sin tablas de redacción (correr supabase/esquema.sql)"}; }
  configs = (configs || []).filter(c => (c.comunas || []).length || c.nacional);
  if (!configs.length) return {omitido: "sin territorios elegidos"};
  const comunas = [...new Set(configs.flatMap(c => c.comunas || []))], nacional = configs.some(c => c.nacional);
  const desde = ahora - VENTANA_H * 36e5, gn = await googleNewsRedaccion(comunas, nacional, gnPorComuna);
  const notas = candidatas(items, comunas, nacional, gn, desde, ahora);

  // Hechos ya propuestos en los últimos 3 días: lo nuevo se suma a ellos en vez de duplicarlos.
  const previas = await sb(`redaccion_propuestas?actualizado=gte.${new Date(ahora - 3 * 864e5).toISOString()}&select=id,titulo,notas,comunas,estado,ia,avisado,detectado&limit=1000`) || [];
  const grupos = impAgrupar(notas, previas.map(p => ({id: p.id, notas: p.notas || [], previa: p})));
  const cercanos = [...new Set(configs.flatMap(c => c.cercanos || []))], pesos = configs[0].pesos || undefined;
  const tocados = grupos.filter(g => g.cambio).map(g => {
    const imp = impPuntaje(g, {ahora, autoridades: AUTS, cercanos, pesos});
    const comunasG = [...new Set(g.notas.flatMap(n => n.comunas || []).concat(g.previa ? g.previa.comunas || [] : []))];
    return {g, imp, comunas: comunasG};
  });

  // IA solo para lo que vale la pena y aún no tiene titular propio (o que cambió de forma importante).
  const paraIA = tocados.filter(x => x.imp.puntaje >= PISO_IA && !(x.g.previa && x.g.previa.ia)).sort((a, b) => b.imp.puntaje - a.imp.puntaje).slice(0, MAX_IA);
  const ia = await iaNeutral(paraIA.map(x => x.g));
  const iaDe = new Map(paraIA.map((x, i) => [x.g.id, ia.get(i)]));

  const filas = tocados.map(({g, imp, comunas: cs}) => {
    const p = g.previa || {}, r = iaDe.get(g.id), lead = [...g.notas].sort((a, b) => a.ts - b.ts)[0];
    const fila = {id: g.id, comunas: cs, alcance: imp.alcance, puntaje: imp.puntaje, senales: imp.senales, detalle: imp.detalle, sensible: imp.sensible, cercanos: imp.cercanos,
      notas: g.notas.slice(0, 30), ultima: new Date(imp.ultima).toISOString(), actualizado: new Date(ahora).toISOString()};
    if (!g.previa) Object.assign(fila, {titulo: lead.titulo, resumen: null, estado: "nueva", ia: false, avisado: false, detectado: new Date(ahora).toISOString()});
    if (r && r.titular) Object.assign(fila, {titulo: String(r.titular).slice(0, 200), resumen: String(r.resumen || "").slice(0, 400), ia: true});
    if (r && r.noticia === false && (!p.estado || p.estado === "nueva")) Object.assign(fila, {estado: "descartada", motivo: "La IA lo marcó como no noticioso"});
    return fila;
  });
  if (filas.length) await sb("redaccion_propuestas?on_conflict=id", {method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: filas});

  // Para avisar se usa el estado guardado: un hecho ya avisado, tomado o descartado no vuelve a sonar aunque reciba notas nuevas.
  const antes = new Map(previas.map(p => [p.id, p]));
  const paraAvisar = filas.map(f => { const p = antes.get(f.id); return p ? {...f, estado: f.estado || p.estado, avisado: p.avisado} : f; });
  const avisos = await avisarRedaccion(sb, configs, paraAvisar, ahora).catch(e => ({error: String(e.message || e).slice(0, 120)}));
  return {notas: notas.length, hechos: tocados.length, nuevas: filas.filter(f => f.detectado).length, ia: ia.size, avisos};
}

/* Avisos: lo que supera el umbral (urgente), el resumen de la mañana y la hora de publicar lo programado. */
async function avisarRedaccion(sb, configs, filas, ahora){
  if (!pushListo()) return {push: 0, motivo: "sin llaves de avisos"};
  const subs = await sb("redaccion_suscripciones?select=endpoint,p256dh,auth,usuario") || [];
  if (!subs.length) return {push: 0, motivo: "sin dispositivos suscritos"};
  const {fecha, hora} = chile(ahora), noche = hora >= 23 || hora < 7; let push = 0;
  const yaAvisadas = new Set();
  for (const c of configs) {
    const susSubs = subs.filter(s => s.usuario === c.usuario); if (!susSubs.length) continue;
    const suyas = filas.filter(f => f.estado === "nueva" && !f.avisado && f.puntaje >= (c.umbral || 80) && (f.comunas || []).some(x => (c.comunas || []).includes(x) || (x === "Región" && c.nacional)));
    for (const f of suyas.slice(0, 3)) {
      if (noche && c.silencio !== false && f.puntaje < 90) continue;
      push += await enviar(sb, susSubs, {titulo: `Impacto ${f.puntaje} · ${(f.comunas || []).join(", ")}`, cuerpo: f.titulo, tag: "rd-" + f.id, urgente: f.puntaje >= 90, url: `/redaccion?p=${encodeURIComponent(f.id)}#propuestas`});
      yaAvisadas.add(f.id);
    }
    // Resumen de la mañana: una vez al día, a la hora elegida.
    if (hora >= (c.resumen_hora ?? 8) && hora < 12 && c.resumen_enviado !== fecha) {
      const [nuevas, prog] = await Promise.all([
        sb(`redaccion_propuestas?estado=eq.nueva&puntaje=gte.40&actualizado=gte.${new Date(ahora - 864e5).toISOString()}&select=id,comunas&limit=200`),
        sb(`redaccion_posts?estado=eq.programado&programado=gte.${new Date(ahora).toISOString()}&programado=lt.${new Date(ahora + 864e5).toISOString()}&select=id&limit=50`)]);
      const mias = (nuevas || []).filter(p => (p.comunas || []).some(x => (c.comunas || []).includes(x) || (x === "Región" && c.nacional)));
      push += await enviar(sb, susSubs, {titulo: "Redacción PregonIA · resumen de la mañana", cuerpo: `${mias.length} ${mias.length === 1 ? "propuesta lista" : "propuestas listas"} para revisar · ${(prog || []).length} ${(prog || []).length === 1 ? "publicación programada" : "publicaciones programadas"} para hoy`, tag: "rd-resumen", url: "/redaccion#propuestas"});
      await sb(`redaccion_config?usuario=eq.${c.usuario}`, {method: "PATCH", prefer: "return=minimal", body: {resumen_enviado: fecha}});
    }
  }
  if (yaAvisadas.size) await sb(`redaccion_propuestas?id=in.${encodeURIComponent(lista([...yaAvisadas]))}`, {method: "PATCH", prefer: "return=minimal", body: {avisado: true}});
  // Hora de publicar: en la fase 1 la publicación es manual; el aviso lleva directo a la pieza lista para descargar y copiar.
  const due = await sb(`redaccion_posts?estado=eq.programado&recordado=eq.false&programado=lte.${new Date(ahora + 5 * 6e4).toISOString()}&select=id,titulo,autor&limit=20`) || [];
  for (const p of due) {
    push += await enviar(sb, subs.filter(s => s.usuario === p.autor).length ? subs.filter(s => s.usuario === p.autor) : subs, {titulo: "Hora de publicar en las redes de PregonIA", cuerpo: p.titulo || "Publicación programada", tag: "rd-pub-" + p.id, urgente: true, url: `/redaccion?post=${p.id}#publicaciones`});
    await sb(`redaccion_posts?id=eq.${p.id}`, {method: "PATCH", prefer: "return=minimal", body: {recordado: true}});
  }
  return {push, recordatorios: due.length};
}
export { chile };

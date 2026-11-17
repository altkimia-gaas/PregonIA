// Lectura de medios compartida por /api/noticias (etapa 1, al vuelo) y /api/ingesta (etapa 2, lectura programada).
// Lee los RSS y sitemaps de noticias del catálogo y Google News; nunca guarda ni devuelve el texto de los medios.
import { gunzipSync } from "node:zlib";
import { CATALOGO } from "./_catalogo.js";
import { COMUNAS_V } from "./_autoridades.js";

/* Las 38 comunas de la Región de Valparaíso, con las formas en que la prensa las escribe. */
const ALIAS = { "Llaillay": ["llay-llay", "llay llay"], "Isla de Pascua": ["rapa nui"] };
const COMUNAS = Object.fromEntries(COMUNAS_V.map(c => [c, [c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")].concat(ALIAS[c] || [])]));
/* Frases que contienen el nombre de una comuna sin hablar de ella. */
const QUITAR = ["region de valparaiso", "cordillera de los andes", "universidad de los andes", "federico santa maria", "universidad santa maria", "cruz roja"];
// Palabras que en Google News acotan la búsqueda a la comuna chilena (Casablanca de Marruecos, Cartagena de Colombia, San Antonio de Texas).
const CONTEXTO = '(Valparaíso OR comuna OR municipalidad OR alcalde OR Chile OR "litoral central")';
const EXCLUIR = ["marruecos", "marroqui", "colombia", "cartagena de indias", "texas", "spurs", "ibiza", "murcia"];
const METODOS = new Set(["rss", "rss_filtrado", "sitemap_noticias", "sitemap_filtrado", "sitemap", "sitemap_mensual", "portada"]);
const VENTANA_DIAS = 14, MAX_IA = 120, UA = "PregonIA/0.1 (monitoreo de prensa municipal; +https://pregonia.vercel.app)";

const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const deEnt = s => s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, c) => c[0] === "#" ? String.fromCodePoint(c[1].toLowerCase() === "x" ? parseInt(c.slice(2), 16) : parseInt(c.slice(1), 10)) : (ENT[c.toLowerCase()] ?? m));
const sinTags = s => s.replace(/<[^>]+>/g, " ");
const limpiar = s => sinTags(deEnt(sinTags(String(s || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")))).replace(/\s+/g, " ").trim();
const tag = (xml, n) => { const m = xml.match(new RegExp(`<${n}(?:\\s[^>]*)?>([\\s\\S]*?)</${n}>`, "i")); return m ? m[1] : ""; };
/* Etiqueta de un sitemap de noticias con cualquier prefijo: news:title, n:title… (El Mostrador y Pauta usan n:). */
const tagNs = (xml, n) => { const m = xml.match(new RegExp(`<(\\w+):${n}(?:\\s[^>]*)?>([\\s\\S]*?)</\\1:${n}>`, "i")); return m ? m[2] : ""; };
const attr = (xml, n, a) => { const m = xml.match(new RegExp(`<${n}\\s[^>]*${a}=["']([^"']+)["']`, "i")); return m ? m[1] : ""; };
const bloques = (xml, n) => xml.match(new RegExp(`<${n}[\\s>][\\s\\S]*?</${n}>`, "gi")) || [];
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const dominio = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", ...extra } });

/* Descarga y decodifica. Con max, corta la descarga al llegar a esos bytes (mapas del sitio enormes ordenados del más nuevo al más antiguo).
   Los .gz (mapas mensuales comprimidos) se descomprimen. */
async function leer(url, ms = 8000, max = 0){
  const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/rss+xml, application/xml, text/xml, text/html, */*" }, signal: AbortSignal.timeout(ms), redirect: "follow" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  let buf;
  if (max && r.body) {
    const lector = r.body.getReader(), partes = []; let n = 0;
    while (n < max) { const {done, value} = await lector.read(); if (done) break; partes.push(value); n += value.length; }
    lector.cancel().catch(() => {});
    buf = new Uint8Array(n); let k = 0; partes.forEach(p => { buf.set(p, k); k += p.length; });
  } else buf = new Uint8Array(await r.arrayBuffer());
  if (buf[0] === 0x1f && buf[1] === 0x8b) buf = new Uint8Array(gunzipSync(buf));
  const cabeza = new TextDecoder("latin1").decode(buf.slice(0, 300));
  let enc = ((r.headers.get("content-type") || "").match(/charset=([\w-]+)/i) || cabeza.match(/encoding=["']([\w-]+)["']/i) || [])[1] || "utf-8";
  let txt; try { txt = new TextDecoder(enc.toLowerCase()).decode(buf); } catch { txt = new TextDecoder("utf-8").decode(buf); }
  if ((txt.match(/�/g) || []).length > 5) txt = new TextDecoder("latin1").decode(buf);
  return txt;
}
/* Fecha escrita en la dirección de la nota: /2026/11/16/, 2026-11-16, -16-11-2026 o /20261116. */
/* Solo trae el día: se fija a mediodía de Chile, sin pasar de ahora (una nota de esta mañana no puede quedar en el futuro). */
const fechaDeUrl = u => { const t = fechaDeUrl0(u); return Number.isFinite(t) ? Math.min(t, Date.now()) : t; };
function fechaDeUrl0(u){
  let m = u.match(/\/(20\d\d)\/(\d\d)\/(\d\d)\//) || u.match(/(20\d\d)-(\d\d)-(\d\d)/) || u.match(/\/(20\d\d)(\d\d)(\d\d)(?:\/|-|$)/);
  if (m) return Date.parse(`${m[1]}-${m[2]}-${m[3]}T12:00:00-03:00`);
  m = u.match(/-(\d\d)-(\d\d)-(20\d\d)(?:\.html?|\/)?$/);
  return m ? Date.parse(`${m[3]}-${m[2]}-${m[1]}T12:00:00-03:00`) : NaN;
}
/* Titular a partir de la dirección, cuando el mapa del sitio no lo trae: «ivan-poduje-la-clave…» → «Ivan poduje la clave…».
   Sin tildes, pero el cruce de nombres y comunas ya las ignora; la IA escribe el resumen. */
const tituloDeUrl = u => { const s = decodeURIComponent((u.replace(/[?#].*$/, "").replace(/\/+$/, "").split("/").pop() || "").replace(/\.html?$/, "")).replace(/^\d+-/, "").replace(/-\d\d-\d\d-20\d\d$/, "").replace(/[-_]+/g, " ").trim(); return s ? s[0].toUpperCase() + s.slice(1) : ""; };
function parsear(xml){
  const out = [];
  if (/<urlset[\s>]/i.test(xml)) {
    for (const u of bloques(xml, "url")) {
      const titulo = limpiar(tagNs(u, "title")); if (!titulo) continue;
      out.push({ titulo, url: limpiar(tag(u, "loc")), fecha: Date.parse(limpiar(tagNs(u, "publication_date")) || limpiar(tag(u, "lastmod"))), desc: limpiar(tagNs(u, "keywords")) });
    }
    return out;
  }
  for (const it of bloques(xml, "item")) {
    out.push({ titulo: limpiar(tag(it, "title")), url: limpiar(tag(it, "link")) || limpiar(tag(it, "guid")), fecha: Date.parse(limpiar(tag(it, "pubDate")) || limpiar(tag(it, "dc:date"))), desc: limpiar(tag(it, "description")).slice(0, 400), fuente: limpiar(tag(it, "source")), fuenteUrl: attr(it, "source", "url") });
  }
  for (const e of bloques(xml, "entry")) {
    out.push({ titulo: limpiar(tag(e, "title")), url: attr(e, "link", "href"), fecha: Date.parse(limpiar(tag(e, "published")) || limpiar(tag(e, "updated"))), desc: limpiar(tag(e, "summary")).slice(0, 400) });
  }
  return out.filter(x => x.titulo && x.url);
}

/* Mapa del sitio corriente (no de noticias): dirección y fecha de modificación; titular del mapa si lo trae, si no, desde la dirección. */
function parsearSitemap(xml){
  const out = [];
  for (const u of bloques(xml, "url")) {
    const url = limpiar(tag(u, "loc")); if (!url) continue;
    const fecha = Date.parse(limpiar(tagNs(u, "publication_date")) || limpiar(tag(u, "lastmod"))) || fechaDeUrl(url);
    const titulo = limpiar(tagNs(u, "title")) || tituloDeUrl(url);
    if (titulo.split(" ").length >= 3) out.push({ titulo, url, fecha, desc: limpiar(tagNs(u, "keywords")) });
  }
  return out;
}
/* Índice de mapas: se leen los dos hijos más recientes (por lastmod; si no traen, los primeros de la lista), preferentemente los de notas. */
async function leerSitemap(url, max = 1500000){
  const xml = await leer(url, 10000, max);
  if (!/<sitemapindex[\s>]/i.test(xml)) return parsearSitemap(xml);
  const hijos = bloques(xml, "sitemap").map(b => ({loc: limpiar(tag(b, "loc")), t: Date.parse(limpiar(tag(b, "lastmod"))) || 0})).filter(h => h.loc);
  const notas = hijos.filter(h => /news|noticia|post|article|pags_\d{6}/i.test(h.loc)), lista = (notas.length ? notas : hijos).slice().sort((a, b) => b.t - a.t).slice(0, 2);
  return (await Promise.all(lista.map(h => leer(h.loc, 10000, max).then(parsearSitemap).catch(() => [])))).flat();
}
/* Portada o sección de un medio sin RSS ni mapa con fechas: los enlaces a notas (misma web, dirección con varias palabras y texto de 5 palabras o más).
   La fecha sale de la dirección; si no la trae, queda la de la primera lectura (la lectura programada la guarda una sola vez). */
const RUTA_NO_NOTA = /\/(tag|tags|etiqueta|categoria|category|autor|author|seccion|page|pagina|buscar|search|programa|programas|podcast|en-vivo|envivo)\//i;
function parsearPortada(html, base, excluir = null){
  const origen = new URL(base).host.replace(/^www\./, ""), porUrl = new Map(), ahora = Date.now();
  for (const m of html.matchAll(/<a\b[^>]*?href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let u; try { u = new URL(deEnt(m[1]), base); } catch { continue; }
    if (u.host.replace(/^www\./, "") !== origen || RUTA_NO_NOTA.test(u.pathname) || (excluir && excluir.test(u.pathname))) continue;
    if (!/[a-z0-9]+-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+/i.test(u.pathname)) continue;
    const texto = limpiar(m[2]).replace(/^\d{1,2}:\d\d\s+/, "");
    const url = u.origin + u.pathname, previo = porUrl.get(url);
    const titulo = texto.split(" ").length >= 5 ? texto : (previo ? previo.titulo : tituloDeUrl(url));
    if (!previo || titulo.length > previo.titulo.length) porUrl.set(url, {titulo, url, fecha: fechaDeUrl(url) || ahora, desc: "", fechaAprox: !fechaDeUrl(url)});
  }
  return [...porUrl.values()].filter(x => x.titulo.split(" ").length >= 4);
}
/* Rutas que una portada no debe tomar porque son de otra ficha del catálogo (ediciones locales de SoyChile). */
const EXCLUIR_RUTA = { 23: /^\/(valparaiso|san-antonio|quillota)\// };
/* Cómo se lee cada método. */
async function leerFuente(url, m){
  if (m.metodo === "portada") return parsearPortada(await leer(url, 10000, 2500000), url, EXCLUIR_RUTA[m.id]);
  if (m.metodo === "sitemap" || m.metodo === "sitemap_mensual" || (m.metodo === "sitemap_filtrado" && m.lector === "sitemap")) return leerSitemap(url);
  // Respaldo con más plazo: un medio lento o caído en un momento no se pierde por esa pasada.
  return parsear(await leer(url).catch(() => leer(url, 12000)));
}

/* Clasificación con Claude Haiku, en lotes paralelos para responder rápido: relevancia, tono, resumen propio y palabras clave.
   En paralelo, una llamada corta solo con los titulares agrupa las notas que cuentan el mismo hecho. */
const LOTE = 10;
const DIAG = [];
const dormir = ms => new Promise(ok => setTimeout(ok, ms));
/* Cola de la IA: la API limita las solicitudes simultáneas de la organización (la lectura programada lanzaba unas 30 a la vez y
   recibía 429). Como máximo IA_PARALELO a la vez; ante 429 o 529 (sobrecarga) se espera y se reintenta, respetando retry-after. */
const IA = {activas: 0, cola: []}, IA_PARALELO = 8;
async function turnoIA(){ if (IA.activas >= IA_PARALELO) await new Promise(ok => IA.cola.push(ok)); IA.activas++; }
function soltarIA(){ IA.activas--; const sig = IA.cola.shift(); if (sig) sig(); }
async function llamar(prompt, maxTok){
  for (let k = 0; k < 3; k++) {
    await turnoIA(); let r;
    try { r = await llamar1(prompt, maxTok); } finally { soltarIA(); }
    if (!r || !r.limite) return r;
    await dormir(Math.min(8000, r.espera || 2000 * 2 ** k));
  }
  return null;
}
async function llamar1(prompt, maxTok){
  const clave = process.env.ANTHROPIC_API_KEY; if (!clave) return null; let txt = "";
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal: AbortSignal.timeout(28000),
      headers: { "x-api-key": clave, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL_RAPIDO || "claude-haiku-5-5", max_tokens: maxTok, messages: [{ role: "user", content: prompt }] })
    });
    if (r.status === 429 || r.status === 529) { DIAG.push("IA limitada (" + r.status + "), reintento"); return {limite: true, espera: Number(r.headers.get("retry-after")) * 1000 || 0}; }
    if (!r.ok) { const e = (await r.text()).slice(0, 200); console.error("Anthropic", r.status, e); DIAG.push("HTTP " + r.status + " " + e.replace(/\s+/g, " ").slice(0, 120)); return null; }
    const d = await r.json(); txt = (d.content || []).map(c => c.text || "").join("");
    try { const a = JSON.parse(txt.slice(txt.indexOf("["), txt.lastIndexOf("]") + 1)); if (Array.isArray(a)) return a; } catch {}
    // Respuesta cortada o con texto extra: se rescatan los objetos completos uno a uno.
    const sueltos = (txt.match(/\{[^{}]*\}/g) || []).map(s => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
    if (sueltos.length) { DIAG.push("rescate parcial: " + sueltos.length + " objetos"); return sueltos; }
    throw new SyntaxError("sin JSON");
  } catch(e) { console.error("Anthropic", e && e.name, String(e).slice(0, 200)); DIAG.push((e && e.name || "error") + ": " + String(e && e.message || e).slice(0, 80) + (txt ? " | salida: " + txt.slice(0, 80) + " … " + txt.slice(-60) : "")); return null; }
}
const linea = (n, i) => `${i}. [${n.medio} · ${n.ambito}] ${n.titulo}${n.desc ? " — " + n.desc.slice(0, 240) : ""}`;
function promptLote(comuna, notas, base){
  return `Eres analista de prensa de PregonIA para la Municipalidad de ${comuna}, Región de Valparaíso, Chile. Revisa estas notas de prensa:

${notas.map((n, k) => linea(n, base + k) + (n.sobre === "pc" ? " (hallada por la comuna)" : "")).join("\n")}

Las notas marcadas «(hallada por la comuna)» salieron de una búsqueda de ${comuna} y la nombran en el cuerpo aunque el titular no lo diga: decide por su tema si trata de la comuna.

Para cada nota devuelve un objeto con:
- "i": su número.
- "rel": true solo si trata de la comuna de ${comuna} en Chile, su municipio, sus autoridades o hechos ocurridos allí; false si es otro lugar con el mismo nombre, si la comuna aparece solo de pasada o si solo es el lugar de una cárcel, un tribunal, una carretera o un trámite judicial y el hecho no afecta a los vecinos ni al municipio.
- "tono": la postura de la nota hacia el municipio y su gestión. "cri" si lo critica, lo cuestiona o recoge reclamos contra él (servicios que fallan, demoras, denuncias, conflictos con vecinos); "pos" si lo favorece (logros, inversiones, eventos exitosos); "neu" si es informativa. Una emergencia o un accidente que solo se informa, sin reclamos ni cuestionamientos al municipio, es "neu".
- "res": un resumen propio de una frase, de máximo 20 palabras, en español de Chile, sin copiar frases del medio.
- "x": entre 3 y 6 palabras clave en minúsculas separadas por espacios (temas, lugares, instituciones).

Responde solo con un arreglo JSON compacto, en una sola línea, sin bloque de código ni texto adicional.`;
}
/* Autoridades: las mismas reglas que una comuna. Una comuna lee lo que trata de ella, de su municipio o de sus autoridades;
   una autoridad lee lo que la nombra y lo que trata de la institución que integra en su territorio. La IA lo juzga respecto de la persona. */
const esSujeto = x => x && typeof x === "object";
const MARCA = {pc: " (hallada por su nombre)", i: " (sobre su institución)"};
const lineaAut = (n, i) => linea(n, i) + (MARCA[n.sobre] || "");
function promptLoteAut(a, notas, base){
  const inst = a.institucion || a.zona;
  return `Eres analista de prensa de PregonIA para el equipo de ${a.cargo} ${a.nombre} (${a.zona}, Región de Valparaíso, Chile). Revisa estas notas de prensa:

${notas.map((n, k) => lineaAut(n, base + k)).join("\n")}

Para cada nota devuelve un objeto con:
- "i": su número.
- "rel": true si la nota nombra a ${a.nombre} como ${a.cargo.toLowerCase()} o trata directamente de su labor; también si trata de ${inst} (sus acuerdos, votaciones, proyectos, recursos, autoridades o polémicas), porque eso afecta a quien la integra. Las notas marcadas «(hallada por su nombre)» salieron de una búsqueda de su nombre y la mencionan en el cuerpo aunque el titular no lo diga: son true salvo que traten claramente de otra persona o de otro lugar. false si es otra persona con un nombre parecido, si es de otra región o si la institución o el territorio aparecen solo de pasada.
- "tono": la postura de la nota hacia ${a.nombre} o, si la nota trata de su institución, hacia la gestión de ${inst}; no lo grave del hecho. "cri" si la critica, la cuestiona o la vincula a una polémica o denuncia; "pos" si la favorece (iniciativas, logros, reconocimientos); "neu" si es informativa, solo la cita o informa un hecho grave sin cuestionarla.
- "res": un resumen propio de una frase, de máximo 20 palabras, en español de Chile, sin copiar frases del medio.
- "x": entre 3 y 6 palabras clave en minúsculas separadas por espacios (temas, lugares, instituciones).

Responde solo con un arreglo JSON compacto, en una sola línea, sin bloque de código ni texto adicional.`;
}
function promptGrupos(comuna, notas, existentes = []){
  if (esSujeto(comuna)) comuna = comuna.nombre;
  return `Estas son notas de prensa sobre ${comuna}, Chile:

${notas.map((n, i) => `${i}. ${n.titulo} (${n.medio})`).join("\n")}
${existentes.length ? `
Hechos ya registrados en días anteriores (código: titular):
${existentes.map((e, k) => `E${k}: ${e.titulo}`).join("\n")}
` : ""}
Agrupa las notas que cuentan el mismo hecho, aunque sean de medios distintos. Si una nota cuenta un hecho ya registrado, usa su código (por ejemplo "E3") como etiqueta; si no, inventa una etiqueta corta del hecho. Responde solo con un arreglo JSON de objetos {"i": número, "g": "etiqueta"}, uno por nota; las notas del mismo hecho llevan la misma etiqueta. JSON compacto en una sola línea, sin bloque de código.`;
}
async function clasificar(comuna, notas, existentes = []){
  if (!process.env.ANTHROPIC_API_KEY || !notas.length) return {porI: new Map(), ok: false};
  const lotes = []; for (let k = 0; k < notas.length; k += LOTE) lotes.push(k);
  const pl = esSujeto(comuna) ? promptLoteAut : promptLote;
  const lote = async k => (await llamar(pl(comuna, notas.slice(k, k + LOTE), k), 4000)) || (await llamar(pl(comuna, notas.slice(k, k + LOTE), k), 4000)); // un reintento
  const [grupos, ...partes] = await Promise.all([llamar(promptGrupos(comuna, notas, existentes), 4000), ...lotes.map(lote)]);
  const porI = new Map();
  partes.forEach(p => (p || []).forEach(c => { if (Number.isInteger(Number(c.i))) porI.set(Number(c.i), {...c}); }));
  (grupos || []).forEach(c => {
    if (!c.g) return; const m = /^E(\d+)$/i.exec(String(c.g).trim()), e = m && existentes[Number(m[1])];
    const x = porI.get(Number(c.i)) || {}; if (e) x.grupoExistente = e.grupo; else x.g = c.g; porI.set(Number(c.i), x);
  });
  return {porI, ok: partes.every(Boolean) && Boolean(grupos)};
}

/* Lectura de fuentes: los feeds del catálogo se leen una vez y sirven para todas las comunas; Google News se consulta por comuna. */
/* Política de lectura: lo restringido (robots.txt o términos) no se lee directo, solo llega vía Google News.
   Un mismo feed se descarga una vez; las ediciones filtradas se quedan con las notas que calzan con su filtro
   (BioBio Región de Valparaíso: su sección regional) y el medio padre con el resto. */
/* Ediciones filtradas: 54 BioBío Región de Valparaíso; 40 Bloomberg Línea Chile; 58 24 Horas Valparaíso (su sección en el mapa mensual);
   57 Meganoticias Región de Valparaíso (no tiene sección: las notas cuya dirección nombra una comuna o la región). */
const RE_URL_REGION = /valparaiso|vina-del-mar|con-?con|quintero|puchuncavi|casablanca|quilpue|villa-alemana|limache|olmue|quillota|la-calera|hijuelas|nogales|san-antonio|cartagena|el-quisco|el-tabo|algarrobo|santo-domingo|san-felipe|los-andes|la-ligua|cabildo|papudo|zapallar|petorca|llay-?llay|putaendo|catemu|panquehue|rinconada|calle-larga|san-esteban|rapa-nui|isla-de-pascua|juan-fernandez/;
const FILTROS = { 54: u => /\/region-de-valparaiso\//.test(u), 40: u => /\/latinoamerica\/chile\//.test(u),
  58: u => /\/regiones\/zona-centro\/valparaiso\//.test(u), 57: u => RE_URL_REGION.test(u.split("/").pop() || "") };
const seLee = m => METODOS.has(m.metodo) && m.url && m.estado !== "restringido" && m.estado !== "en_prueba" && !(m.metodo.endsWith("_filtrado") && !FILTROS[m.id]);
export async function leerCatalogo(){
  const fuentes = CATALOGO.filter(seLee), errores = [], porUrl = new Map();
  fuentes.forEach(m => { if (!porUrl.has(m.url)) porUrl.set(m.url, []); porUrl.get(m.url).push(m); });
  const items = (await Promise.all([...porUrl.entries()].map(async ([url, ms]) => {
    try {
      const filtrados = ms.filter(m => FILTROS[m.id]), resto = ms.find(m => !FILTROS[m.id]);
      // El grupo se lee con el método de su medio padre (una edición filtrada comparte la fuente del padre).
      const base = resto || ms[0], its = await leerFuente(url, {...base, lector: /^sitemap(_mensual)?$/.test(base.metodo) ? "sitemap" : ""});
      return its.map(x => { const f = filtrados.find(m => FILTROS[m.id](x.url)); const m = f || resto; return m ? { ...x, m } : null; }).filter(Boolean);
    } catch(e) { ms.forEach(m => errores.push(m.nombre)); return []; }
  }))).flat();
  return {items, total: fuentes.length, errores};
}
const porDominio = new Map(), porNombre = new Map();
/* Fuentes institucionales sin ficha propia (ministerios, servicios, municipalidades, Fuerzas Armadas): una ficha común que conserva el nombre real. */
const INST = CATALOGO.find(m => m.id === 299);
const esInstitucional = (d, nombre) => /(^|\.)(gob|mil)\.cl$/.test(d) || /municipalidad|^muni|imv\.cl$/.test(d) || /municipalidad|ministerio|gobierno regional|delegaci[oó]n presidencial|subsecretar|seremi|senapred|carabineros|fuerza a[eé]rea|armada de chile|ej[eé]rcito/i.test(nombre || "");
/* Medios que Google News encuentra y no están en el catálogo: antes se descartaban (un tercio de lo hallado en Valparaíso y Viña del Mar).
   Ahora entran con una ficha común que conserva el nombre real del medio: regional si el medio es de la región, nacional si no.
   Quedan fuera los medios extranjeros (dominio de otro país) y los de deportes, clima o agregadores, que no traen noticias de gestión. */
const OTRO_NAC = CATALOGO.find(m => m.id === 297), OTRO_REG = CATALOGO.find(m => m.id === 296);
const RE_REGION = /valpara|vina del mar|aconcagua|litoral|quinta region|v region|san antonio|quillota|quilpue|villa alemana|casablanca|limache|la ligua|petorca|los andes|san felipe|rapa nui|con ?con|quintero|puchuncavi|cartagena|algarrobo|el quisco|el tabo|la calera/;
const RE_AJENO = /(^|\.)(as\.com|365scores\.com|bolavip\.com|besoccer\.com|transfermarkt\.\w+|flashscore\.\w+|espn\.\w+|volcanodiscovery\.com|tutiempo\.net|accuweather\.com)$/;
const extranjero = d => { const t = d.split(".").pop(); return t.length === 2 && t !== "cl"; };
function otroMedio(d, nombre){
  if (!d && !nombre) return null;
  if (d && (extranjero(d) || RE_AJENO.test(d))) return null;
  return RE_REGION.test(norm(nombre + " " + d)) ? OTRO_REG : OTRO_NAC;
}
const FICHA_COMUN = new Set([INST, OTRO_NAC, OTRO_REG].filter(Boolean));
CATALOGO.forEach(m => { const d = dominio(m.url); if (d) porDominio.set(d, m); porNombre.set(norm(m.nombre), m); });

/* Google News. Medido el 17-nov-2026: con varias consultas a la vez responde 429 (demasiadas solicitudes) y esa lectura se perdía;
   además entrega como máximo 100 notas por consulta (Valparaíso en 14 días tiene más de 250).
   Por eso: cola con pocas consultas a la vez y una pausa entre ellas, reintentos con espera creciente ante 429 o errores del servidor,
   y si una consulta llega al tope, se vuelve a pedir por tramos de fechas hasta bajar del tope. Todo dentro del plazo de la función. */
const GN = {activas: 0, cola: [], proximo: 0, limite: 0, stats: null, ahorro: false, cache: new Map()};
const GN_CACHE_MS = 15 * 60000, GN_CACHE_MAX = 400;  // la misma consulta en 15 minutos (pares de una provincia, cuentas que comparten territorio) no se repite
const nuevasStats = () => ({consultas: 0, cache: 0, notas: 0, vacias: 0, reintentos: 0, r429: 0, fallidas: 0, tramos: 0, ahorro: false});
const GN_PARALELO = 2, GN_PAUSA = 450, GN_TOPE = 100;
/* Plazo para las consultas a Google News de esta invocación (los reintentos y tramos no lo pasan). */
export const plazoGoogleNews = ms => { GN.limite = Date.now() + ms; GN.stats = nuevasStats(); GN.ahorro = false; };
/* Tras un 429, Google está limitando: lo prescindible (pares, tramos) se deja para que las consultas principales alcancen a leerse. */
export const ahorroGoogleNews = () => GN.ahorro;
/* Cifras de Google News de esta invocación, para ver en la respuesta si algo se perdió (429, respuestas vacías, tramos). */
export const statsGoogleNews = () => ({...(GN.stats || nuevasStats())});
const limite = () => GN.limite > Date.now() ? GN.limite : Date.now() + 40000;
async function turno(){
  if (GN.activas >= GN_PARALELO) await new Promise(ok => GN.cola.push(ok));
  GN.activas++;
  const t = Math.max(Date.now(), GN.proximo); GN.proximo = t + GN_PAUSA;
  if (t > Date.now()) await dormir(t - Date.now());
}
function soltar(){ GN.activas--; const sig = GN.cola.shift(); if (sig) sig(); }
/* Google también limita respondiendo 200 sin notas: una respuesta vacía se reintenta una vez, tras una espera, antes de darla por buena. */
async function leerGN(url, prescindible = false){
  const st0 = GN.stats || (GN.stats = nuevasStats());
  const c = GN.cache.get(url); if (c && Date.now() - c.t < GN_CACHE_MS) { st0.cache++; return c.xml; }
  st0.consultas++;
  const guardar = xml => { if (GN.cache.size >= GN_CACHE_MAX) GN.cache.delete(GN.cache.keys().next().value); GN.cache.set(url, {t: Date.now(), xml}); return xml; };
  let vacia = false;
  for (let k = 0; ; k++) {
    await turno(); let err, xml;
    if (prescindible && GN.ahorro) { soltar(); throw new Error("ahorro"); }  // lo prescindible cede su turno cuando Google limita
    try { xml = await leer(url, 10000); } catch(e) { err = e; } finally { soltar(); }
    if (!err) {
      const n = (xml.match(/<item[\s>]/g) || []).length;
      if (n || vacia || Date.now() + 5000 > limite()) { st0.notas += n; if (!n) st0.vacias++; return n ? guardar(xml) : xml; }
      vacia = true; st0.reintentos++; GN.proximo = Math.max(GN.proximo, Date.now() + 2500); await dormir(2500); continue;
    }
    const st = Number((/HTTP (\d+)/.exec(err && err.message) || [])[1]) || 0, reintentable = !st || st === 429 || st >= 500;
    const espera = 1500 * 2 ** k;
    if (st === 429) { st0.r429++; GN.ahorro = st0.ahorro = true; GN.proximo = Math.max(GN.proximo, Date.now() + espera); }  // todas las consultas esperan, no solo esta
    if (!reintentable || k >= 3 || Date.now() + espera + 3000 > limite()) { st0.fallidas++; throw err; }
    st0.reintentos++; await dormir(espera);
  }
}
const urlGN = q => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=es-419&gl=CL&ceid=CL:es-419`;
const diaISO = t => new Date(t).toISOString().slice(0, 10);
/* Tramos de fechas de una consulta que llegó al tope: mitades sucesivas (hasta 8 tramos), sin repetir notas. Un tramo que falla no borra lo ya leído. */
async function porTramos(q, desde, hasta, prof, vistos, out){
  const medio = Math.floor((desde + hasta) / 2);
  for (const [a, b] of [[desde, medio], [medio, hasta]]) {
    if (GN.ahorro) return;
    if (GN.stats) GN.stats.tramos++;
    let its; try { its = parsear(await leerGN(urlGN(`${q} after:${diaISO(a - 864e5)} before:${diaISO(b + 864e5)}`), true)); } catch(e) { continue; }
    its.forEach(x => { const k = x.url || x.titulo; if (!vistos.has(k)) { vistos.add(k); out.push(x); } });
    if (its.length >= GN_TOPE - 2 && prof > 1 && b - a > 1.5 * 864e5 && Date.now() + 8000 < limite()) await porTramos(q, a, b, prof - 1, vistos, out);
  }
}
export async function leerGoogleNews(comuna, dias = VENTANA_DIAS){ return (await leerGoogleNewsConsulta(`"${comuna}" ${CONTEXTO}`, dias)).map(x => ({...x, q: "comuna"})); }
/* Google News con una consulta cualquiera. Con catalogo = true quedan los medios del catálogo y los demás medios chilenos con ficha común;
   con false, todo lo que encuentre (para contar). Con tramos = true, una consulta que llega al tope se completa por tramos de fechas. */
export async function leerGoogleNewsConsulta(q, dias = VENTANA_DIAS, catalogo = true, tramos = catalogo, prescindible = false){
  let items = parsear(await leerGN(urlGN(`${q} when:${dias}d`), prescindible));
  if (tramos && items.length >= GN_TOPE - 2) {
    const vistos = new Set(items.map(x => x.url || x.titulo)), mas = [];
    await porTramos(q, Date.now() - dias * 864e5, Date.now(), 3, vistos, mas);
    items = items.concat(mas);
  }
  if (!catalogo) return items;
  return items.map(x => {
    const d = dominio(x.fuenteUrl), m = porDominio.get(d) || porNombre.get(norm(x.fuente)) || (INST && esInstitucional(d, x.fuente) ? INST : otroMedio(d, x.fuente)); if (!m) return null;
    return { ...x, titulo: x.titulo.replace(new RegExp("\\s+-\\s+" + x.fuente.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"), ""), desc: "", m, via: "google_news", fuente: FICHA_COMUN.has(m) ? x.fuente.replace(/^\|\s*/, "").slice(0, 80) : undefined };
  }).filter(Boolean);
}
/* Candidatas de una autoridad, con las mismas reglas que una comuna (que lee lo que nombra a la comuna o sale en sus medios locales):
   - lo que la nombra por cualquiera de sus variantes, en el titular o la bajada ("p");
   - lo que Google News encontró buscando su nombre ("pc"): Google lo halló en el cuerpo, aunque el titular no la nombre;
   - lo que trata de la institución que integra en su territorio ("i"): un término del órgano más uno del territorio,
     o un término del órgano en lo que Google News encontró buscando la institución en ese territorio.
   Primero lo que trata de la persona, para que el tope de clasificación no lo deje fuera; dentro de cada grupo, lo más reciente. */
export function candidatasPorNombre(variantes, items, desde, ahora = Date.now(), inst = null){
  const rx = xs => new RegExp(`(^|[^a-z])(${xs.map(v => norm(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})([^a-z]|$)`);
  const re = rx(variantes), reOrg = inst && inst.organo.length ? rx(inst.organo) : null, reTer = inst && inst.territorio.length ? rx(inst.territorio) : null;
  const vistos = new Set(), out = [];
  for (const x of items) {
    if (!Number.isFinite(x.fecha) || x.fecha < desde || x.fecha > ahora + 36e5) continue;
    const t = norm(x.titulo + " " + x.desc);
    const sobre = re.test(t) ? "p" : x.q === "nombre" ? "pc"
      : reOrg && reOrg.test(t) && (x.q === "inst" || (reTer && reTer.test(t))) && !EXCLUIR.some(w => t.includes(w)) ? "i" : "";
    if (!sobre) continue;
    const k1 = x.url, k2 = x.m.id + "|" + norm(x.titulo);
    if (vistos.has(k1) || vistos.has(k2)) continue; vistos.add(k1); vistos.add(k2);
    out.push({ id: "r" + hash(x.url), m: x.m.id, medio: x.m.nombre, ambito: x.m.ambito, titulo: x.titulo, desc: x.desc, url: x.url, ts: Math.min(x.fecha, ahora), via: x.via || "lectura", sobre, ...(x.fuente ? {fuente: x.fuente} : {}) });
  }
  const orden = {p: 0, pc: 0, i: 1};
  return out.sort((a, b) => orden[a.sobre] - orden[b.sobre] || b.ts - a.ts);
}
/* Lo que menciona la comuna en la ventana, sin duplicados (mismo enlace o mismo titular en el mismo medio), del más reciente al más antiguo. */
export function candidatasDe(comuna, items, desde, ahora = Date.now()){
  const claves = COMUNAS[comuna] || [norm(comuna)], re = new RegExp(`(^|[^a-z])(${claves.join("|")})([^a-z]|$)`);
  const menciona = t => re.test(t) && !EXCLUIR.some(w => t.includes(w));
  const vistos = new Set(), out = [];
  for (const x of items) {
    if (!Number.isFinite(x.fecha) || x.fecha < desde || x.fecha > ahora + 36e5) continue;
    const t = QUITAR.reduce((s, q) => s.split(q).join(" "), norm(x.titulo + " " + x.desc)), local = x.m.ambito === "local" && (x.m.comuna || "").split(";").map(norm).includes(norm(comuna));
    // Lo que Google News halló buscando la comuna la nombra en el cuerpo aunque el titular no lo haga (un 30% en Viña del Mar).
    const porConsulta = x.q === "comuna" && !EXCLUIR.some(w => t.includes(w));
    if (!menciona(t) && !(local && !EXCLUIR.some(w => t.includes(w))) && !porConsulta) continue;
    const k1 = x.url, k2 = x.m.id + "|" + norm(x.titulo);
    if (vistos.has(k1) || vistos.has(k2)) continue; vistos.add(k1); vistos.add(k2);
    out.push({ id: "r" + hash(x.url), m: x.m.id, medio: x.m.nombre, ambito: x.m.ambito, titulo: x.titulo, desc: x.desc, url: x.url, ts: Math.min(x.fecha, ahora), via: x.via || "lectura", sobre: menciona(t) || local ? "p" : "pc", ...(x.fuente ? {fuente: x.fuente} : {}) });
  }
  return out.sort((a, b) => (a.sobre === "pc") - (b.sobre === "pc") || b.ts - a.ts);  // lo que nombra la comuna primero, para el tope de clasificación
}
/* Salud de fuentes: qué entrega cada medio leído, qué dice su robots.txt y qué medios aparecen en Google News sin estar en el catálogo.
   Solo lectura de datos públicos; no clasifica con IA ni guarda nada. */
function robotsPermite(txt, ruta){
  const grupos = []; let g = null, enReglas = false;
  for (const l of txt.split(/\r?\n/)) {
    const m = l.replace(/#.*/, "").trim().match(/^([a-z-]+)\s*:\s*(.*)$/i); if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === "user-agent") { if (!g || enReglas) { g = {ua: [], reglas: []}; grupos.push(g); enReglas = false; } g.ua.push(v.toLowerCase()); }
    else if ((k === "disallow" || k === "allow") && g) { enReglas = true; g.reglas.push([k, v]); }
  }
  const para = ua => grupos.filter(x => x.ua.some(u => u === ua || (ua !== "*" && ua.includes(u) && u !== "*")));
  const evalua = gs => { let mejor = null; gs.forEach(x => x.reglas.forEach(([k, v]) => { if (v && ruta.startsWith(v) && (!mejor || v.length > mejor[1].length || (v.length === mejor[1].length && k === "allow"))) mejor = [k, v]; })); return mejor ? mejor[0] === "allow" : true; };
  const propios = para("pregonia"), ia = ["gptbot", "claudebot", "anthropic-ai", "ccbot", "google-extended"].filter(b => para(b).some(x => x.reglas.some(([k, v]) => k === "disallow" && v === "/")));
  return { permite: evalua(propios.length ? propios : para("*")), bloqueaIA: ia };
}
export async function saludFuentes(consultasGN = [], soloIds = null){
  const ahora = Date.now(), desde = ahora - VENTANA_DIAS * 864e5;
  const leidas = CATALOGO.filter(m => METODOS.has(m.metodo) && m.url && (!soloIds || soloIds.has(m.id)));  // incluye restringidos y en prueba: el diagnóstico los mide igual
  const fuentes = await Promise.all(leidas.map(async m => {
    const r = {id: m.id, nombre: m.nombre, ambito: m.ambito, metodo: m.metodo, estado: m.estado, seLee: seLee(m)};
    const u = (() => { try { return new URL(m.url); } catch { return null; } })();
    const [feed, rob] = await Promise.allSettled([(b => leerFuente(m.url, {...b, lector: /^sitemap(_mensual)?$/.test(b.metodo) ? "sitemap" : ""}))(CATALOGO.find(x => x.url === m.url && !FILTROS[x.id]) || m), u ? leer(u.origin + "/robots.txt", 6000) : Promise.reject(new Error("URL"))]);
    if (rob.status === "fulfilled") Object.assign(r, robotsPermite(rob.value, u.pathname + u.search)); else r.robots = "sin robots.txt";
    if (feed.status === "rejected") return {...r, ok: false, error: String(feed.reason && feed.reason.message || feed.reason).slice(0, 80)};
    const it = feed.value.filter(x => !FILTROS[m.id] || FILTROS[m.id](x.url)), con = it.filter(x => Number.isFinite(x.fecha) && !x.fechaAprox), ult = con.length ? Math.max(...con.map(x => x.fecha)) : null;
    return {...r, ok: true, items: it.length, sinFecha: it.length - con.length, en14: con.filter(x => x.fecha >= desde).length, ultima: ult ? new Date(ult).toISOString() : null, diasSinPublicar: ult ? Math.round((ahora - ult) / 864e5) : null};
  }));
  const vistos = new Map();
  await Promise.all(consultasGN.map(async q => { try {
    const its = await leerGoogleNewsConsulta(q, VENTANA_DIAS, false);
    its.forEach(x => { const k = dominio(x.fuenteUrl) || norm(x.fuente); const v = vistos.get(k) || {fuente: x.fuente, dominio: dominio(x.fuenteUrl), notas: 0, catalogo: null}; v.notas++; const m = porDominio.get(dominio(x.fuenteUrl)) || porNombre.get(norm(x.fuente)); if (m) v.catalogo = m.id; vistos.set(k, v); });
  } catch(e) {} }));
  const gn = [...vistos.values()].sort((a, b) => b.notas - a.notas);
  return {generado: new Date(ahora).toISOString(), fuentes, googleNews: {consultas: consultasGN.length, enCatalogo: gn.filter(x => x.catalogo), fueraDelCatalogo: gn.filter(x => !x.catalogo).slice(0, 60)}};
}
export { COMUNAS, VENTANA_DIAS, MAX_IA, DIAG, norm, hash, clasificar, json };

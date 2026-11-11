// Lectura de medios compartida por /api/noticias (etapa 1, al vuelo) y /api/ingesta (etapa 2, lectura programada).
// Lee los RSS y sitemaps de noticias del catálogo y Google News; nunca guarda ni devuelve el texto de los medios.
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
const METODOS = new Set(["rss", "rss_filtrado", "sitemap_noticias", "sitemap_filtrado"]);
const VENTANA_DIAS = 14, MAX_IA = 80, UA = "PregonIA/0.1 (monitoreo de prensa municipal; +https://pregonia.vercel.app)";

const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const deEnt = s => s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, c) => c[0] === "#" ? String.fromCodePoint(c[1].toLowerCase() === "x" ? parseInt(c.slice(2), 16) : parseInt(c.slice(1), 10)) : (ENT[c.toLowerCase()] ?? m));
const sinTags = s => s.replace(/<[^>]+>/g, " ");
const limpiar = s => sinTags(deEnt(sinTags(String(s || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")))).replace(/\s+/g, " ").trim();
const tag = (xml, n) => { const m = xml.match(new RegExp(`<${n}(?:\\s[^>]*)?>([\\s\\S]*?)</${n}>`, "i")); return m ? m[1] : ""; };
const attr = (xml, n, a) => { const m = xml.match(new RegExp(`<${n}\\s[^>]*${a}=["']([^"']+)["']`, "i")); return m ? m[1] : ""; };
const bloques = (xml, n) => xml.match(new RegExp(`<${n}[\\s>][\\s\\S]*?</${n}>`, "gi")) || [];
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const dominio = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", ...extra } });

async function leer(url, ms = 8000){
  const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/rss+xml, application/xml, text/xml, */*" }, signal: AbortSignal.timeout(ms), redirect: "follow" });
  if (!r.ok) throw new Error("HTTP " + r.status);
  const buf = new Uint8Array(await r.arrayBuffer()), cabeza = new TextDecoder("latin1").decode(buf.slice(0, 300));
  let enc = ((r.headers.get("content-type") || "").match(/charset=([\w-]+)/i) || cabeza.match(/encoding=["']([\w-]+)["']/i) || [])[1] || "utf-8";
  let txt; try { txt = new TextDecoder(enc.toLowerCase()).decode(buf); } catch { txt = new TextDecoder("utf-8").decode(buf); }
  if ((txt.match(/�/g) || []).length > 5) txt = new TextDecoder("latin1").decode(buf);
  return txt;
}
function parsear(xml){
  const out = [];
  if (/<urlset[\s>]/i.test(xml)) {
    for (const u of bloques(xml, "url")) {
      const titulo = limpiar(tag(u, "news:title")); if (!titulo) continue;
      out.push({ titulo, url: limpiar(tag(u, "loc")), fecha: Date.parse(limpiar(tag(u, "news:publication_date")) || limpiar(tag(u, "lastmod"))), desc: limpiar(tag(u, "news:keywords")) });
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

/* Clasificación con Claude Haiku, en lotes paralelos para responder rápido: relevancia, tono, resumen propio y palabras clave.
   En paralelo, una llamada corta solo con los titulares agrupa las notas que cuentan el mismo hecho. */
const LOTE = 10;
const DIAG = [];
async function llamar(prompt, maxTok){
  const clave = process.env.ANTHROPIC_API_KEY; if (!clave) return null; let txt = "";
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal: AbortSignal.timeout(28000),
      headers: { "x-api-key": clave, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL_RAPIDO || "claude-haiku-5-5", max_tokens: maxTok, messages: [{ role: "user", content: prompt }] })
    });
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

${notas.map((n, k) => linea(n, base + k)).join("\n")}

Para cada nota devuelve un objeto con:
- "i": su número.
- "rel": true solo si trata de la comuna de ${comuna} en Chile, su municipio, sus autoridades o hechos ocurridos allí; false si es otro lugar con el mismo nombre, si la comuna aparece solo de pasada o si solo es el lugar de una cárcel, un tribunal, una carretera o un trámite judicial y el hecho no afecta a los vecinos ni al municipio.
- "tono": "cri" si es negativa o riesgosa para la gestión o la imagen del municipio o la comuna (reclamos, emergencias, conflictos, críticas), "pos" si la favorece (logros, inversiones, eventos exitosos), "neu" si es informativa.
- "res": un resumen propio de una frase, de máximo 20 palabras, en español de Chile, sin copiar frases del medio.
- "x": entre 3 y 6 palabras clave en minúsculas separadas por espacios (temas, lugares, instituciones).

Responde solo con un arreglo JSON compacto, en una sola línea, sin bloque de código ni texto adicional.`;
}
/* Autoridades: la relevancia y el tono se juzgan respecto de la persona, no de una comuna. */
const esSujeto = x => x && typeof x === "object";
function promptLoteAut(a, notas, base){
  return `Eres analista de prensa de PregonIA para el equipo de ${a.cargo} ${a.nombre} (${a.zona}, Región de Valparaíso, Chile). Revisa estas notas de prensa:

${notas.map((n, k) => linea(n, base + k)).join("\n")}

Para cada nota devuelve un objeto con:
- "i": su número.
- "rel": true solo si la nota nombra a ${a.nombre} como ${a.cargo.toLowerCase()} o trata directamente de su labor; false si es otra persona con un nombre parecido o si no la nombra.
- "tono": "cri" si es negativa o riesgosa para la imagen o el trabajo de ${a.nombre} (críticas, cuestionamientos, polémicas, denuncias), "pos" si la favorece (iniciativas, logros, reconocimientos), "neu" si es informativa o solo la cita.
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
export async function leerCatalogo(){
  const fuentes = CATALOGO.filter(m => METODOS.has(m.metodo) && m.url), errores = [];
  const items = (await Promise.all(fuentes.map(async m => { try { return parsear(await leer(m.url)).map(x => ({ ...x, m })); } catch(e) { errores.push(m.nombre); return []; } }))).flat();
  return {items, total: fuentes.length, errores};
}
const porDominio = new Map(), porNombre = new Map();
CATALOGO.forEach(m => { const d = dominio(m.url); if (d) porDominio.set(d, m); porNombre.set(norm(m.nombre), m); });
export async function leerGoogleNews(comuna, dias = VENTANA_DIAS){ return leerGoogleNewsConsulta(`"${comuna}" ${CONTEXTO}`, dias); }
/* Google News con una consulta cualquiera. Con catalogo = true solo quedan los medios del catálogo; con false, todo lo que encuentre (para contar). */
export async function leerGoogleNewsConsulta(q, dias = VENTANA_DIAS, catalogo = true){
  const gq = `${q} when:${dias}d`, gn = `https://news.google.com/rss/search?q=${encodeURIComponent(gq)}&hl=es-419&gl=CL&ceid=CL:es-419`;
  const items = parsear(await leer(gn, 10000));
  if (!catalogo) return items;
  return items.map(x => {
    const m = porDominio.get(dominio(x.fuenteUrl)) || porNombre.get(norm(x.fuente)); if (!m) return null;
    return { ...x, titulo: x.titulo.replace(new RegExp("\\s+-\\s+" + x.fuente.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"), ""), desc: "", m, via: "google_news" };
  }).filter(Boolean);
}
/* Lo que nombra a una autoridad (por cualquiera de sus variantes de nombre) en la ventana, sin duplicados. */
export function candidatasPorNombre(variantes, items, desde, ahora = Date.now()){
  const re = new RegExp(`(^|[^a-z])(${variantes.map(v => norm(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})([^a-z]|$)`);
  const vistos = new Set(), out = [];
  for (const x of items) {
    if (!Number.isFinite(x.fecha) || x.fecha < desde || x.fecha > ahora + 36e5) continue;
    if (!re.test(norm(x.titulo + " " + x.desc))) continue;
    const k1 = x.url, k2 = x.m.id + "|" + norm(x.titulo);
    if (vistos.has(k1) || vistos.has(k2)) continue; vistos.add(k1); vistos.add(k2);
    out.push({ id: "r" + hash(x.url), m: x.m.id, medio: x.m.nombre, ambito: x.m.ambito, titulo: x.titulo, desc: x.desc, url: x.url, ts: Math.min(x.fecha, ahora), via: x.via || "lectura" });
  }
  return out.sort((a, b) => b.ts - a.ts);
}
/* Lo que menciona la comuna en la ventana, sin duplicados (mismo enlace o mismo titular en el mismo medio), del más reciente al más antiguo. */
export function candidatasDe(comuna, items, desde, ahora = Date.now()){
  const claves = COMUNAS[comuna] || [norm(comuna)], re = new RegExp(`(^|[^a-z])(${claves.join("|")})([^a-z]|$)`);
  const menciona = t => re.test(t) && !EXCLUIR.some(w => t.includes(w));
  const vistos = new Set(), out = [];
  for (const x of items) {
    if (!Number.isFinite(x.fecha) || x.fecha < desde || x.fecha > ahora + 36e5) continue;
    const t = QUITAR.reduce((s, q) => s.split(q).join(" "), norm(x.titulo + " " + x.desc)), local = x.m.ambito === "local" && (x.m.comuna || "").split(";").map(norm).includes(norm(comuna));
    if (!menciona(t) && !(local && !EXCLUIR.some(w => t.includes(w)))) continue;
    const k1 = x.url, k2 = x.m.id + "|" + norm(x.titulo);
    if (vistos.has(k1) || vistos.has(k2)) continue; vistos.add(k1); vistos.add(k2);
    out.push({ id: "r" + hash(x.url), m: x.m.id, medio: x.m.nombre, ambito: x.m.ambito, titulo: x.titulo, desc: x.desc, url: x.url, ts: Math.min(x.fecha, ahora), via: x.via || "lectura" });
  }
  return out.sort((a, b) => b.ts - a.ts);
}
export { COMUNAS, VENTANA_DIAS, MAX_IA, DIAG, norm, hash, clasificar, json };

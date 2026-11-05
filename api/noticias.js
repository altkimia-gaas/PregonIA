// Noticias reales para PregonIA (etapa 1, sin base de datos).
// Lee en paralelo los medios del catálogo que publican RSS o sitemap de noticias, más Google News para los que bloquean la lectura
// directa; se queda con lo que menciona la comuna en los últimos 14 días y pide a Claude Haiku que descarte homónimos, clasifique
// el tono para la gestión municipal, escriba un resumen propio y agrupe las notas que cuentan el mismo hecho.
// Nunca se guarda ni se devuelve el texto de los medios: solo titular, enlace, medio, fecha y el resumen propio.
// La respuesta queda 15 minutos en la caché de Vercel, así que las visitas siguientes no vuelven a leer los medios.
// Variables: ANTHROPIC_API_KEY (ya usada por la IA), ANTHROPIC_MODEL_RAPIDO (opcional, por defecto claude-haiku-5-5).
import { CATALOGO } from "./_catalogo.js";

const COMUNAS = {
  "Casablanca": ["casablanca"],
  "San Antonio": ["san antonio"],
  "Cartagena": ["cartagena"],
  "El Quisco": ["el quisco"],
  "El Tabo": ["el tabo"],
  "Algarrobo": ["algarrobo"]
};
// Palabras que en Google News acotan la búsqueda a la comuna chilena (Casablanca de Marruecos, Cartagena de Colombia, San Antonio de Texas).
const CONTEXTO = '(Valparaíso OR comuna OR municipalidad OR alcalde OR Chile OR "litoral central")';
const EXCLUIR = ["marruecos", "marroqui", "colombia", "cartagena de indias", "texas", "spurs", "ibiza", "murcia"];
const METODOS = new Set(["rss", "rss_filtrado", "sitemap_noticias", "sitemap_filtrado"]);
const VENTANA_DIAS = 14, MAX_IA = 80, UA = "PregonIA/0.1 (monitoreo de prensa municipal; +https://pregonia.vercel.app)";

const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
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
function promptGrupos(comuna, notas){
  return `Estas son notas de prensa sobre ${comuna}, Chile:

${notas.map((n, i) => `${i}. ${n.titulo} (${n.medio})`).join("\n")}

Agrupa las que cuentan el mismo hecho, aunque sean de medios distintos. Responde solo con un arreglo JSON de objetos {"i": número, "g": "etiqueta-corta-del-hecho"}, uno por nota; las notas del mismo hecho llevan la misma etiqueta. JSON compacto en una sola línea, sin bloque de código.`;
}
async function clasificar(comuna, notas){
  if (!process.env.ANTHROPIC_API_KEY || !notas.length) return {porI: new Map(), ok: false};
  const lotes = []; for (let k = 0; k < notas.length; k += LOTE) lotes.push(k);
  const lote = async k => (await llamar(promptLote(comuna, notas.slice(k, k + LOTE), k), 4000)) || (await llamar(promptLote(comuna, notas.slice(k, k + LOTE), k), 4000)); // un reintento
  const [grupos, ...partes] = await Promise.all([llamar(promptGrupos(comuna, notas), 4000), ...lotes.map(lote)]);
  const porI = new Map();
  partes.forEach(p => (p || []).forEach(c => { if (Number.isInteger(Number(c.i))) porI.set(Number(c.i), {...c}); }));
  (grupos || []).forEach(c => { const x = porI.get(Number(c.i)); if (x && c.g) x.g = c.g; else if (c.g) porI.set(Number(c.i), {g: c.g}); });
  return {porI, ok: partes.every(Boolean) && Boolean(grupos)};
}

export async function GET(req){
  const u = new URL(req.url); DIAG.length = 0;
  if (u.searchParams.has("ping")) return json({ ok: true, ia: Boolean(process.env.ANTHROPIC_API_KEY) }, 200, { "cache-control": "no-store" });
  const comuna = u.searchParams.get("comuna") || "Casablanca", claves = COMUNAS[comuna];
  if (!claves) return json({ error: "Comuna no disponible" }, 400);
  const ahora = Date.now(), desde = ahora - VENTANA_DIAS * 864e5;
  const re = new RegExp(`(^|[^a-z])(${claves.join("|")})([^a-z]|$)`);
  const menciona = t => re.test(t) && !EXCLUIR.some(w => t.includes(w));
  const porDominio = new Map(), porNombre = new Map();
  CATALOGO.forEach(m => { const d = dominio(m.url); if (d) porDominio.set(d, m); porNombre.set(norm(m.nombre), m); });

  const fuentes = CATALOGO.filter(m => METODOS.has(m.metodo) && m.url);
  const gq = `"${comuna}" ${CONTEXTO} when:${VENTANA_DIAS}d`;
  const gn = `https://news.google.com/rss/search?q=${encodeURIComponent(gq)}&hl=es-419&gl=CL&ceid=CL:es-419`;
  const errores = [];
  const lecturas = await Promise.all([
    ...fuentes.map(async m => { try { return parsear(await leer(m.url)).map(x => ({ ...x, m })); } catch(e) { errores.push(m.nombre); return []; } }),
    (async () => { try { return parsear(await leer(gn, 10000)).map(x => {
      const m = porDominio.get(dominio(x.fuenteUrl)) || porNombre.get(norm(x.fuente)); if (!m) return null;
      return { ...x, titulo: x.titulo.replace(new RegExp("\\s+-\\s+" + x.fuente.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"), ""), desc: "", m, via: "google_news" };
    }).filter(Boolean); } catch(e) { errores.push("Google News"); return []; } })()
  ]);

  // Quedarse con lo de la comuna en la ventana, sin duplicados (mismo enlace o mismo titular en el mismo medio).
  const vistos = new Set(), candidatas = [];
  for (const x of lecturas.flat()) {
    if (!Number.isFinite(x.fecha) || x.fecha < desde || x.fecha > ahora + 36e5) continue;
    const t = norm(x.titulo + " " + x.desc), local = x.m.ambito === "local" && norm(x.m.comuna) === norm(comuna);
    if (!menciona(t) && !(local && !EXCLUIR.some(w => t.includes(w)))) continue;
    const k1 = x.url, k2 = x.m.id + "|" + norm(x.titulo);
    if (vistos.has(k1) || vistos.has(k2)) continue; vistos.add(k1); vistos.add(k2);
    candidatas.push({ id: "r" + hash(x.url), m: x.m.id, medio: x.m.nombre, ambito: x.m.ambito, titulo: x.titulo, desc: x.desc, url: x.url, ts: Math.min(x.fecha, ahora) });
  }
  candidatas.sort((a, b) => b.ts - a.ts);
  const lote = candidatas.slice(0, MAX_IA);

  let clas = {porI: new Map(), ok: false}; try { clas = await clasificar(comuna, lote); } catch(e) { console.error("clasificar", e); }
  const porI = clas.porI;
  const notas = [], grupos = new Map();
  lote.forEach((n, i) => {
    const c = porI.get(i);
    if (c && c.rel === false) return;
    const etiqueta = c && c.g ? "g:" + norm(c.g) : n.id, clasificada = Boolean(c && c.tono);
    notas.push({ id: n.id, m: n.m, ts: n.ts, t: n.titulo, url: n.url, tono: c && ["cri", "neu", "pos"].includes(c.tono) ? c.tono : "neu", res: c && c.res ? String(c.res).slice(0, 220) : n.titulo, x: c && c.x ? String(c.x).slice(0, 120) : "", clasificada, etiqueta });
  });
  // Grupo estable: el id de la nota más antigua del mismo hecho, para que "respondida" o "no corresponde" sobrevivan a una nueva lectura.
  notas.slice().sort((a, b) => a.ts - b.ts).forEach(n => { if (!grupos.has(n.etiqueta)) grupos.set(n.etiqueta, n.id); });
  notas.forEach(n => { n.g = grupos.get(n.etiqueta); delete n.etiqueta; });

  return json({
    comuna, generado: new Date(ahora).toISOString(), ventana_dias: VENTANA_DIAS, ia: clas.ok, ia_parcial: !clas.ok && clas.porI.size > 0,
    fuentes: { leidas: fuentes.length + 1 - errores.length, total: fuentes.length + 1, con_error: errores.slice(0, 40) },
    candidatas: candidatas.length, ...(DIAG.length ? {ia_diagnostico: DIAG.slice(0, 6)} : {}), notas
  }, 200, { "cache-control": clas.ok ? "public, max-age=0, s-maxage=900, stale-while-revalidate=3600" : "public, max-age=0, s-maxage=60" });
}

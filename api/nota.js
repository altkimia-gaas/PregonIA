// Lectura de la nota original para Redacción: el editor pide una propuesta y el servidor descarga el texto completo
// de las notas de los medios que la componen, para que la IA escriba una versión nueva con el mismo fondo.
// Solo lee las direcciones guardadas en la propuesta (nunca una dirección que mande el navegador) y solo para el editor.
// El texto se usa para redactar y revisar; no se publica. Variables: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY.
import { sb, editor, json } from "./_servidor.js";

const MAX_BYTES = 2_000_000, MAX_PRINCIPAL = 7000, MAX_OTRAS = 2500;
const RUIDO = /(suscr[ií]bete|newsletter|cookies|todos los derechos|©|lee tambi[eé]n|te puede interesar|s[ií]guenos|whatsapp|telegram|publicidad|comparte esta|haz clic|click aqu[ií]|click ac[aá]|ir directamente al contenido|descarga la app|tambi[eé]n te puede|noticias relacionadas|m[aá]s le[ií]das)/i;

const ENT = {amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", laquo: "«", raquo: "»", ndash: "–", mdash: "—", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ", Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", Ntilde: "Ñ", uuml: "ü", iexcl: "¡", iquest: "¿", deg: "°"};
const deco = t => String(t || "").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&([a-z]+);/gi, (m, k) => ENT[k] ?? m);
const limpio = t => deco(String(t || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const meta = (h, prop) => { const m = h.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, "i")); const c = m && m[0].match(/content=["']([^"']*)["']/i); return c ? deco(c[1]).trim() : ""; };

/* Texto del artículo: primero el articleBody de los datos estructurados; si no, los párrafos del <article> (o de la página). */
function extraer(html){
  let cuerpo = "";
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { const j = JSON.parse(m[1].trim()); const lista = [].concat(j["@graph"] || j); for (const o of lista) { if (o && typeof o.articleBody === "string" && o.articleBody.length > cuerpo.length) cuerpo = o.articleBody; } } catch(e) {}
  }
  cuerpo = limpio(cuerpo);
  if (cuerpo.length < 400) {
    const sinRuido = html.replace(/<(script|style|noscript|nav|header|footer|aside|form|figure|figcaption)[\s\S]*?<\/\1>/gi, " ");
    const zonas = [...sinRuido.matchAll(/<article[\s\S]*?<\/article>/gi)].map(m => m[0]).sort((a, b) => b.length - a.length);
    const zona = zonas[0] || sinRuido;
    const pars = [...zona.matchAll(/<(p|h2|h3|li)[^>]*>([\s\S]*?)<\/\1>/gi)].map(m => limpio(m[2])).filter(p => p.length > 50 && !RUIDO.test(p));
    const vistos = new Set(), unicos = pars.filter(p => !vistos.has(p) && vistos.add(p));
    if (unicos.join(" ").length > cuerpo.length) cuerpo = unicos.join("\n\n");
  }
  return cuerpo;
}

async function leer(nota, max){
  try {
    const u = new URL(nota.url); if (!/^https?:$/.test(u.protocol)) return null;
    const r = await fetch(u, {redirect: "follow", signal: AbortSignal.timeout(9000), headers: {"user-agent": "Mozilla/5.0 (compatible; PregonIA-Redaccion/1.0; +https://pregonia.cl/legal.html)", "accept": "text/html,application/xhtml+xml", "accept-language": "es-CL,es;q=0.9"}});
    if (!r.ok || !/html/i.test(r.headers.get("content-type") || "")) return {medio: nota.medio, url: nota.url, error: `HTTP ${r.status}`};
    const buf = await r.arrayBuffer(); const html = new TextDecoder("utf-8").decode(buf.slice(0, MAX_BYTES));
    const texto = extraer(html);
    return {medio: nota.medio, url: nota.url, titulo: meta(html, "og:title") || limpio((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]), bajada: meta(html, "og:description") || meta(html, "description"),
      fecha: meta(html, "article:published_time") || null, texto: texto.slice(0, max), largo: texto.length};
  } catch(e) { return {medio: nota.medio, url: nota.url, error: String(e.name === "TimeoutError" ? "tardó demasiado" : e.message || e).slice(0, 80)}; }
}

async function manejar(req){
  if (req.method === "GET") return json({ok: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY)});
  if (req.method !== "POST") return json({error: "Método no permitido"}, 405);
  const u = await editor(req); if (!u) return json({error: "Solo el editor de PregonIA puede leer notas"}, 403);
  let b; try { b = await req.json(); } catch(e) { return json({error: "Solicitud inválida"}, 400); }
  const id = String(b && b.propuesta_id || "").replace(/[^\w-]/g, ""); if (!id) return json({error: "Falta la propuesta"}, 400);
  const fila = ((await sb(`redaccion_propuestas?id=eq.${id}&select=notas`)) || [])[0]; if (!fila) return json({error: "La propuesta no existe"}, 404);
  const orden = {nacional: 0, regional: 1, local: 2}, porMedio = new Map();
  [...(fila.notas || [])].sort((a, b) => (a.ts || 0) - (b.ts || 0)).forEach(n => { if (n && n.url && !porMedio.has(n.medio)) porMedio.set(n.medio, n); });
  const notas = [...porMedio.values()].sort((a, b) => (orden[a.ambito] ?? 3) - (orden[b.ambito] ?? 3)).slice(0, 3);
  const textos = await Promise.all(notas.map((n, i) => leer(n, i ? MAX_OTRAS : MAX_PRINCIPAL)));
  return json({ok: true, textos: textos.filter(Boolean)});
}
export const GET = manejar, POST = manejar;

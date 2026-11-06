// Noticias reales para PregonIA (etapa 1, sin base de datos): lee los medios al vuelo para una comuna, clasifica con Claude Haiku
// y devuelve titular, enlace, medio, fecha y resumen propio. La respuesta queda 15 minutos en la caché de Vercel.
// La lectura y la clasificación viven en _lectura.js, compartido con la lectura programada (/api/ingesta).
import { COMUNAS, VENTANA_DIAS, MAX_IA, DIAG, norm, clasificar, json, leerCatalogo, leerGoogleNews, candidatasDe } from "./_lectura.js";

export async function GET(req){
  const u = new URL(req.url); DIAG.length = 0;
  if (u.searchParams.has("ping")) return json({ ok: true, ia: Boolean(process.env.ANTHROPIC_API_KEY) }, 200, { "cache-control": "no-store" });
  const comuna = u.searchParams.get("comuna") || "Casablanca";
  if (!COMUNAS[comuna]) return json({ error: "Comuna no disponible" }, 400);
  const ahora = Date.now(), desde = ahora - VENTANA_DIAS * 864e5;
  const [cat, gn] = await Promise.all([leerCatalogo(), leerGoogleNews(comuna).catch(() => null)]);
  const errores = cat.errores.concat(gn ? [] : ["Google News"]);
  const candidatas = candidatasDe(comuna, cat.items.concat(gn || []), desde, ahora), lote = candidatas.slice(0, MAX_IA);

  let clas = {porI: new Map(), ok: false}; try { clas = await clasificar(comuna, lote); } catch(e) { console.error("clasificar", e); }
  const porI = clas.porI, notas = [], grupos = new Map();
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
    fuentes: { leidas: cat.total + 1 - errores.length, total: cat.total + 1, con_error: errores.slice(0, 40) },
    candidatas: candidatas.length, ...(DIAG.length ? {ia_diagnostico: DIAG.slice(0, 6)} : {}), notas
  }, 200, { "cache-control": clas.ok ? "public, max-age=0, s-maxage=900, stale-while-revalidate=3600" : "public, max-age=0, s-maxage=60" });
}

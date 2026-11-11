// Lectura programada (etapa 2): cada 30 minutos lee los medios, guarda las notas nuevas de cada comuna cliente y las clasifica.
// Solo se clasifica lo nuevo (lo ya visto no se vuelve a pagar) y las notas nuevas se agrupan con los hechos de días anteriores,
// para que el historial, las respuestas y las marcas queden en el mismo hecho aunque lleguen notas días después.
// La llama un programador externo (GitHub Actions) con Authorization: Bearer CRON_SECRET.
// Variables: SUPABASE_URL, SUPABASE_SECRET_KEY, CRON_SECRET, ANTHROPIC_API_KEY. Para avisos: ver api/_avisos.js.
// Después de guardar, revisa los hechos que recibieron notas nuevas y avisa lo urgente (notificación y correo).
import { COMUNAS, VENTANA_DIAS, DIAG, norm, clasificar, json, leerCatalogo, leerGoogleNews, candidatasDe } from "./_lectura.js";
import { avisar } from "./_avisos.js";

const MAX_POR_COMUNA = 30;  // tope de notas nuevas que se clasifican por comuna en cada pasada; el resto entra en la siguiente

async function sb(ruta, {method = "GET", body, prefer} = {}){
  const url = process.env.SUPABASE_URL, clave = process.env.SUPABASE_SECRET_KEY;
  const headers = {apikey: clave, "content-type": "application/json", ...(prefer ? {prefer} : {})};
  if (!String(clave).startsWith("sb_")) headers.authorization = "Bearer " + clave; // claves antiguas (JWT de service_role)
  const r = await fetch(`${url}/rest/v1/${ruta}`, {method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000)});
  if (!r.ok) throw new Error(`Supabase ${method} ${ruta.split("?")[0]}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.status === 204 || method === "DELETE" ? null : r.json().catch(() => null);
}

async function procesarComuna(muni, items, desde, ahora){
  const {id: municipio_id, comuna} = muni;
  const candidatas = candidatasDe(comuna, items, desde, ahora);
  if (!candidatas.length) return {comuna, candidatas: 0, nuevas: 0, clasificadas: 0};
  // Lo ya registrado para esta comuna en la ventana (incluye lo descartado por no ser de la comuna, para no volver a clasificarlo).
  const desdeIso = new Date(desde - 2 * 864e5).toISOString();
  const previas = await sb(`menciones?municipio_id=eq.${municipio_id}&clasificado=gte.${desdeIso}&select=nota_id,grupo,rel,notas(titulo,publicado)&limit=2000`);
  const vistas = new Set(previas.map(p => p.nota_id));
  const nuevas = candidatas.filter(c => !vistas.has(c.id)).slice(0, MAX_POR_COMUNA);
  if (!nuevas.length) return {comuna, candidatas: candidatas.length, nuevas: 0, clasificadas: 0};
  // Hechos recientes (un titular por grupo) para que lo nuevo se sume al hecho que corresponde.
  const porGrupo = new Map();
  previas.filter(p => p.rel && p.grupo && p.notas).sort((a, b) => Date.parse(b.notas.publicado) - Date.parse(a.notas.publicado))
    .forEach(p => { if (!porGrupo.has(p.grupo)) porGrupo.set(p.grupo, {grupo: p.grupo, titulo: p.notas.titulo}); });
  const existentes = [...porGrupo.values()].slice(0, 40);

  await sb("notas?on_conflict=id", {method: "POST", prefer: "resolution=ignore-duplicates,return=minimal",
    body: nuevas.map(n => ({id: n.id, medio_id: n.m, url: n.url, titulo: n.titulo.slice(0, 400), publicado: new Date(n.ts).toISOString(), via: n.via === "google_news" ? "google_news" : "lectura"}))});

  const clas = await clasificar(comuna, nuevas, existentes);
  // Grupo estable: el de un hecho existente, o la nota más antigua de un hecho nuevo.
  const etiquetaDe = (n, c) => c && c.grupoExistente ? "e:" + c.grupoExistente : c && c.g ? "g:" + norm(c.g) : "n:" + n.id;
  const grupoPorEtiqueta = new Map();
  nuevas.map((n, i) => ({n, c: clas.porI.get(i)})).sort((a, b) => a.n.ts - b.n.ts).forEach(({n, c}) => {
    const e = etiquetaDe(n, c); if (!grupoPorEtiqueta.has(e)) grupoPorEtiqueta.set(e, c && c.grupoExistente ? c.grupoExistente : n.id);
  });
  const filas = nuevas.map((n, i) => {
    const c = clas.porI.get(i), ok = Boolean(c && c.tono);
    return {nota_id: n.id, municipio_id, rel: c && c.rel === false ? false : true, tono: ok && ["cri", "neu", "pos"].includes(c.tono) ? c.tono : "neu",
      resumen: c && c.res ? String(c.res).slice(0, 220) : n.titulo.slice(0, 220), palabras: c && c.x ? String(c.x).slice(0, 120) : "", grupo: grupoPorEtiqueta.get(etiquetaDe(n, c)), ia: ok};
  });
  // Lo que la IA no alcanzó a clasificar se guarda igual (neutro, con el titular) y queda marcado con ia = false para revisarlo.
  await sb("menciones?on_conflict=nota_id,municipio_id", {method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body: filas});
  return {comuna, candidatas: candidatas.length, nuevas: nuevas.length, clasificadas: filas.filter(f => f.ia).length, descartadas: filas.filter(f => !f.rel).length, grupos: filas.filter(f => f.rel).map(f => f.grupo)};
}

async function manejar(req){
  // Sin espacios ni saltos de línea en los extremos: pegar en el campo de Vercel suele agregar uno al final.
  const secreto = (process.env.CRON_SECRET || "").trim();
  if (!secreto) return json({error: "Falta configurar CRON_SECRET en el servidor"}, 503);
  if ((req.headers.get("authorization") || "").trim() !== "Bearer " + secreto) return json({error: "No autorizado"}, 401);
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) return json({error: "Falta configurar Supabase en el servidor"}, 503);
  DIAG.length = 0;
  const ahora = Date.now(), desde = ahora - VENTANA_DIAS * 864e5;
  const [lectura] = await sb("lecturas", {method: "POST", prefer: "return=representation", body: {inicio: new Date(ahora).toISOString()}});
  try {
    const munis = (await sb("municipios?activo=eq.true&select=id,comuna")).filter(m => COMUNAS[m.comuna]);
    const [cat, ...gns] = await Promise.all([leerCatalogo(), ...munis.map(m => leerGoogleNews(m.comuna).catch(() => null))]);
    const errores = cat.errores.concat(gns.some(g => !g) ? ["Google News"] : []);
    const res = await Promise.all(munis.map((m, k) => procesarComuna(m, cat.items.concat(gns[k] || []), desde, ahora).catch(e => ({comuna: m.comuna, error: String(e.message || e).slice(0, 200)}))));
    // Avisos: un error aquí no debe perder la lectura ya guardada.
    await Promise.all(res.map(async (r, k) => { const grupos = r.grupos || []; delete r.grupos; if (!grupos.length) return;
      try { r.avisos = await avisar(sb, munis[k], grupos, Date.now()); } catch(e) { r.avisos = {error: String(e.message || e).slice(0, 160)}; } }));
    const suma = k => res.reduce((s, r) => s + (r[k] || 0), 0);
    const resumen = {fin: new Date().toISOString(), fuentes_ok: cat.total + 1 - errores.length, fuentes_total: cat.total + 1, errores: errores.slice(0, 60),
      candidatas: suma("candidatas"), nuevas: suma("nuevas"), clasificadas: suma("clasificadas"), detalle: {comunas: res, ia: DIAG.slice(0, 8)}};
    await sb(`lecturas?id=eq.${lectura.id}`, {method: "PATCH", body: resumen, prefer: "return=minimal"});
    return json({ok: true, lectura: lectura.id, ...resumen}, 200, {"cache-control": "no-store"});
  } catch(e) {
    await sb(`lecturas?id=eq.${lectura.id}`, {method: "PATCH", body: {fin: new Date().toISOString(), detalle: {error: String(e.message || e).slice(0, 300)}}, prefer: "return=minimal"}).catch(() => {});
    return json({ok: false, error: String(e.message || e).slice(0, 300)}, 500);
  }
}
export const GET = manejar, POST = manejar;

// Noticias reales para PregonIA (etapa 1, sin base de datos): lee los medios al vuelo para una comuna, clasifica con Claude Haiku
// y devuelve titular, enlace, medio, fecha y resumen propio. La respuesta queda 15 minutos en la caché de Vercel.
// La lectura y la clasificación viven en _lectura.js, compartido con la lectura programada (/api/ingesta).
import { COMUNAS, VENTANA_DIAS, MAX_IA, DIAG, norm, clasificar, fichaNota, json, leerCatalogo, leerGoogleNews, leerGoogleNewsConsulta, candidatasDe, candidatasPorNombre, saludFuentes, plazoGoogleNews, statsGoogleNews, ahorroGoogleNews } from "./_lectura.js";
import { AUTORIDADES, cargoDe, zonaDe, variantesNombre, provinciaDe } from "./_autoridades.js";
import { limpio, consulta, sujeto, fichaIA, institucion, leerSujeto } from "./_sujetos.js";
import { CATALOGO } from "./_catalogo.js";
import { leerRedes, usuarioDe, cuentasCatalogo } from "./_redes.js";

/* Cuentas de Facebook e Instagram: las del catálogo fijo más las que la persona inscribió en su navegador (parámetro redes,
   JSON [[id, red, usuario, ámbito, comuna, nombre], …], ids 9000 a 9999). En el piloto las inscritas viven en la base. */
const AMBITOS = new Set(["nacional", "regional", "local"]);
function redesDe(u){
  let extra = []; try { extra = JSON.parse(u.searchParams.get("redes") || "[]"); } catch {}
  const propias = (Array.isArray(extra) ? extra : []).slice(0, 20).map(x => Array.isArray(x) && {id: Number(x[0]), red: x[1], usuario: usuarioDe(x[1], x[2]), ambito: x[3], comuna: limpio(x[4], 300), nombre: limpio(x[5], 80) || "Cuenta en redes"})
    .filter(m => m && m.id >= 9000 && m.id < 10000 && m.usuario && AMBITOS.has(m.ambito));
  const fijas = cuentasCatalogo(CATALOGO);
  return fijas.concat(propias.filter(p => !fijas.some(f => f.red === p.red && f.usuario.toLowerCase() === p.usuario.toLowerCase())));
}

/* Autoridades: consulta y ficha de la persona en _sujetos.js (las comparte la lectura programada del piloto). */
const sujetoDe = u => u.searchParams.get("autoridad")
  ? sujeto({id: u.searchParams.get("autoridad")})
  : sujeto({rol: u.searchParams.get("rol"), zona: u.searchParams.get("zona"), nombre: u.searchParams.get("nombre"), g: u.searchParams.get("g")});
/* Presencia en prensa de los pares: cuántas notas los nombran en la ventana, en cualquier medio que indexe Google News.
   Pares de una autoridad: mismo cargo y zona en la nómina. Pares de un alcalde: los alcaldes de su provincia. */
async function paresDe(a, desde){
  // Delegados: el regional y los siete provinciales se comparan entre sí (cada zona tiene una sola persona).
  const mismo = a.rol === "alcalde" ? x => x.rol === "alcalde" && provinciaDe(x.zona) === provinciaDe(a.zona) : a.rol === "delegado" ? x => x.rol === "delegado" : x => x.rol === a.rol && x.zona === a.zona;
  const lista = AUTORIDADES.filter(x => mismo(x) && x.id !== a.id).concat([a]);
  if (lista.length < 2) return [];
  return Promise.all(lista.map(async x => {
    if (ahorroGoogleNews()) return {n_: x.n, n: null};  // Google está limitando: los pares no le quitan turno a las notas
    let n = 0; try {
      // La consulta exige el nombre, así que todo lo que devuelve la nombra (en el cuerpo, si no en el titular): se cuenta igual para todos los cargos.
      n = (await leerGoogleNewsConsulta(consulta(x), VENTANA_DIAS, false, false, true)).filter(i => Number.isFinite(i.fecha) && i.fecha >= desde).length;
    } catch(e) { n = null; }
    return {n_: x.n, p: x.p || (a.rol === "alcalde" ? x.zona : ""), n, yo: x === a};
  })).then(r => r.filter(x => x.n !== null));
}
async function deAutoridad(u){
  const a = sujetoDe(u); if (!a) return json({ error: "Autoridad no disponible" }, 400);
  const z = zonaDe(a.rol, a.zona), cargo = cargoDe(a.rol, a.g), ahora = Date.now(), desde = ahora - VENTANA_DIAS * 864e5;
  // Primero lo que trae notas; la comparación con pares va después en la cola de Google News, mientras la IA clasifica.
  const [cat, gn, rs] = await Promise.all([leerCatalogo(), leerSujeto(a).catch(() => null), leerRedes(redesDe(u))]);
  const paresP = a.nomina ? paresDe(a, desde).catch(() => []) : Promise.resolve([]);
  const errores = cat.errores.concat(gn ? [] : ["Google News"], rs.errores);
  const candidatas = candidatasPorNombre(variantesNombre(a), cat.items.concat(gn || [], rs.items), desde, ahora, institucion(a)), lote = candidatas.slice(0, MAX_IA);
  let clas = {porI: new Map(), ok: false}; try { clas = await clasificar(fichaIA(a), lote); } catch(e) { console.error("clasificar", e); }
  const notas = armar(lote, clas.porI, true), pares = await paresP;
  return json({
    autoridad: {id: a.id, nombre: a.n, cargo, zona: z.n}, generado: new Date(ahora).toISOString(), ventana_dias: VENTANA_DIAS, ia: clas.ok, ia_parcial: !clas.ok && clas.porI.size > 0,
    fuentes: { leidas: cat.total + 1 + rs.total - errores.length, total: cat.total + 1 + rs.total, con_error: errores.slice(0, 40) }, redes: rs.estado,
    candidatas: candidatas.length, google_news: statsGoogleNews(), pares, ...(DIAG.length ? {ia_diagnostico: DIAG.slice(0, 6)} : {}), notas
  }, 200, { "cache-control": clas.ok ? "public, max-age=0, s-maxage=900, stale-while-revalidate=3600" : "public, max-age=0, s-maxage=60" });
}
/* Notas clasificadas: descarta lo que la IA marcó como ajeno y agrupa por hecho. */
function armar(lote, porI, deAutoridad = false){
  const notas = [], grupos = new Map();
  lote.forEach((n, i) => {
    const c = porI.get(i);
    if (c && c.rel === false) return;
    const etiqueta = c && c.g ? "g:" + norm(c.g) : n.id, clasificada = Boolean(c && c.tono);
    notas.push({ id: n.id, m: n.m, ts: n.ts, t: n.titulo, url: n.url, tono: c && ["cri", "neu", "pos"].includes(c.tono) ? c.tono : "neu", res: c && c.res ? String(c.res).slice(0, 220) : n.titulo, x: c && c.x ? String(c.x).slice(0, 120) : "", clasificada, etiqueta, ...(fichaNota(c) ? {f: fichaNota(c)} : {}), ...(deAutoridad && n.sobre ? {sobre: n.sobre === "i" ? "institucion" : "persona"} : {}), ...(n.fuente ? {fuente: n.fuente} : {}), ...(n.via === "instagram" || n.via === "facebook" ? {via: n.via} : {}) });
  });
  // Grupo estable: el id de la nota más antigua del mismo hecho, para que "respondida" o "no corresponde" sobrevivan a una nueva lectura.
  notas.slice().sort((a, b) => a.ts - b.ts).forEach(n => { if (!grupos.has(n.etiqueta)) grupos.set(n.etiqueta, n.id); });
  notas.forEach(n => { n.g = grupos.get(n.etiqueta); delete n.etiqueta; });
  return notas;
}

export async function GET(req){
  const u = new URL(req.url); DIAG.length = 0; plazoGoogleNews(32000);  // deja tiempo a la clasificación dentro de los 60 s de la función
  if (u.searchParams.has("ping")) return json({ ok: true, ia: Boolean(process.env.ANTHROPIC_API_KEY) }, 200, { "cache-control": "no-store" });
  if (u.searchParams.has("salud")) {  // diagnóstico de fuentes: por provincia, más la región
    const qs = ["Valparaíso", "San Antonio", "Quillota", "San Felipe", "Los Andes", "La Ligua", "Quilpué", "Casablanca", "Isla de Pascua"].map(c => `"${c}" ${'(Valparaíso OR comuna OR municipalidad OR alcalde OR Chile OR "litoral central")'}`).concat(['"Región de Valparaíso"']);
    // ?salud=1&ids=5,6,23 revisa solo esos medios y no consulta Google News (para verificar un ajuste sin gastar su cuota).
    const ids = (u.searchParams.get("ids") || "").split(",").map(Number).filter(Boolean);
    return json(await saludFuentes(ids.length ? [] : qs, ids.length ? new Set(ids) : null), 200, { "cache-control": "public, max-age=0, s-maxage=" + (ids.length ? 60 : 1800) });
  }
  if (u.searchParams.has("autoridad") || u.searchParams.has("rol")) return deAutoridad(u);
  const comuna = u.searchParams.get("comuna") || "Casablanca";
  if (!COMUNAS[comuna]) return json({ error: "Comuna no disponible" }, 400);
  const ahora = Date.now(), desde = ahora - VENTANA_DIAS * 864e5;
  const alcalde = AUTORIDADES.find(x => x.rol === "alcalde" && x.zona === comuna);
  const [cat, gn, rs] = await Promise.all([leerCatalogo(), leerGoogleNews(comuna).catch(() => null), leerRedes(redesDe(u))]);
  const paresP = alcalde ? paresDe(alcalde, desde).catch(() => []) : Promise.resolve([]);
  const errores = cat.errores.concat(gn ? [] : ["Google News"], rs.errores);
  const candidatas = candidatasDe(comuna, cat.items.concat(gn || [], rs.items), desde, ahora), lote = candidatas.slice(0, MAX_IA);

  let clas = {porI: new Map(), ok: false}; try { clas = await clasificar(comuna, lote); } catch(e) { console.error("clasificar", e); }
  const notas = armar(lote, clas.porI), pares = await paresP;

  return json({
    comuna, generado: new Date(ahora).toISOString(), ventana_dias: VENTANA_DIAS, ia: clas.ok, ia_parcial: !clas.ok && clas.porI.size > 0,
    fuentes: { leidas: cat.total + 1 + rs.total - errores.length, total: cat.total + 1 + rs.total, con_error: errores.slice(0, 40) }, redes: rs.estado,
    candidatas: candidatas.length, google_news: statsGoogleNews(), alcalde: alcalde ? {nombre: alcalde.n, cargo: cargoDe("alcalde", alcalde.g)} : null, pares, ...(DIAG.length ? {ia_diagnostico: DIAG.slice(0, 6)} : {}), notas
  }, 200, { "cache-control": clas.ok ? "public, max-age=0, s-maxage=900, stale-while-revalidate=3600" : "public, max-age=0, s-maxage=60" });
}

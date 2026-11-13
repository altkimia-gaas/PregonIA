// Noticias reales para PregonIA (etapa 1, sin base de datos): lee los medios al vuelo para una comuna, clasifica con Claude Haiku
// y devuelve titular, enlace, medio, fecha y resumen propio. La respuesta queda 15 minutos en la caché de Vercel.
// La lectura y la clasificación viven en _lectura.js, compartido con la lectura programada (/api/ingesta).
import { COMUNAS, VENTANA_DIAS, MAX_IA, DIAG, norm, clasificar, json, leerCatalogo, leerGoogleNews, leerGoogleNewsConsulta, candidatasDe, candidatasPorNombre, saludFuentes } from "./_lectura.js";
import { AUTORIDADES, CARGOS, cargoDe, zonaDe, variantesNombre, provinciaDe } from "./_autoridades.js";
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

/* Autoridades: la consulta va por nombre y cargo, con palabras de contexto que descartan homónimos lejanos. */
const CONTEXTO_ROL = {
  diputado: '(diputado OR diputada OR Cámara OR Congreso OR Valparaíso OR Chile)',
  senador: '(senador OR senadora OR Senado OR Congreso OR Valparaíso OR Chile)',
  core: '(consejero OR consejera OR core OR "gobierno regional" OR Valparaíso)',
  concejal: '(concejal OR concejala OR concejo OR municipalidad OR comuna)',
  alcalde: '(alcalde OR alcaldesa OR municipalidad OR municipio OR comuna)'
};
const limpio = (s, n = 80) => String(s || "").replace(/[\u0000-\u001f"<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
function sujetoDe(u){
  const id = u.searchParams.get("autoridad");
  if (id) { const a = AUTORIDADES.find(x => x.id === id); return a ? {...a, nomina: true} : null; }
  const rol = u.searchParams.get("rol"), zona = u.searchParams.get("zona"), n = limpio(u.searchParams.get("nombre"));
  if (!CARGOS[rol] || rol === "municipio" || !zonaDe(rol, zona) || n.split(" ").length < 2) return null;
  return {id: null, rol, zona, n, c: n, p: "", g: u.searchParams.get("g") === "F" ? "F" : "M", nomina: false};
}
const consulta = a => { const z = zonaDe(a.rol, a.zona); return `(${variantesNombre(a).map(v => `"${v}"`).join(" OR ")}) ${a.rol === "concejal" || a.rol === "alcalde" ? `("${z.n}" OR ${CONTEXTO_ROL[a.rol]})` : CONTEXTO_ROL[a.rol]}`; };
/* Presencia en prensa de los pares: cuántas notas los nombran en la ventana, en cualquier medio que indexe Google News.
   Pares de una autoridad: mismo cargo y zona en la nómina. Pares de un alcalde: los alcaldes de su provincia. */
async function paresDe(a, desde){
  const mismo = a.rol === "alcalde" ? x => x.rol === "alcalde" && provinciaDe(x.zona) === provinciaDe(a.zona) : x => x.rol === a.rol && x.zona === a.zona;
  const lista = AUTORIDADES.filter(x => mismo(x) && x.id !== a.id).concat([a]);
  if (lista.length < 2) return [];
  return Promise.all(lista.map(async x => {
    let n = 0; try {
      const re = new RegExp(variantesNombre(x).map(v => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"));
      n = (await leerGoogleNewsConsulta(consulta(x), VENTANA_DIAS, false)).filter(i => Number.isFinite(i.fecha) && i.fecha >= desde && re.test(norm(i.titulo + " " + i.desc))).length;
    } catch(e) { n = null; }
    return {n_: x.n, p: x.p || (a.rol === "alcalde" ? x.zona : ""), n, yo: x === a};
  })).then(r => r.filter(x => x.n !== null));
}
async function deAutoridad(u){
  const a = sujetoDe(u); if (!a) return json({ error: "Autoridad no disponible" }, 400);
  const z = zonaDe(a.rol, a.zona), cargo = cargoDe(a.rol, a.g), ahora = Date.now(), desde = ahora - VENTANA_DIAS * 864e5;
  const [cat, gn, pares, rs] = await Promise.all([leerCatalogo(), leerGoogleNewsConsulta(consulta(a)).catch(() => null), a.nomina ? paresDe(a, desde).catch(() => []) : [], leerRedes(redesDe(u))]);
  const errores = cat.errores.concat(gn ? [] : ["Google News"], rs.errores);
  const candidatas = candidatasPorNombre(variantesNombre(a), cat.items.concat(gn || [], rs.items), desde, ahora), lote = candidatas.slice(0, MAX_IA);
  let clas = {porI: new Map(), ok: false}; try { clas = await clasificar({nombre: a.n, cargo, zona: z.n}, lote); } catch(e) { console.error("clasificar", e); }
  const notas = armar(lote, clas.porI);
  return json({
    autoridad: {id: a.id, nombre: a.n, cargo, zona: z.n}, generado: new Date(ahora).toISOString(), ventana_dias: VENTANA_DIAS, ia: clas.ok, ia_parcial: !clas.ok && clas.porI.size > 0,
    fuentes: { leidas: cat.total + 1 + rs.total - errores.length, total: cat.total + 1 + rs.total, con_error: errores.slice(0, 40) }, redes: rs.estado,
    candidatas: candidatas.length, pares, ...(DIAG.length ? {ia_diagnostico: DIAG.slice(0, 6)} : {}), notas
  }, 200, { "cache-control": clas.ok ? "public, max-age=0, s-maxage=900, stale-while-revalidate=3600" : "public, max-age=0, s-maxage=60" });
}
/* Notas clasificadas: descarta lo que la IA marcó como ajeno y agrupa por hecho. */
function armar(lote, porI){
  const notas = [], grupos = new Map();
  lote.forEach((n, i) => {
    const c = porI.get(i);
    if (c && c.rel === false) return;
    const etiqueta = c && c.g ? "g:" + norm(c.g) : n.id, clasificada = Boolean(c && c.tono);
    notas.push({ id: n.id, m: n.m, ts: n.ts, t: n.titulo, url: n.url, tono: c && ["cri", "neu", "pos"].includes(c.tono) ? c.tono : "neu", res: c && c.res ? String(c.res).slice(0, 220) : n.titulo, x: c && c.x ? String(c.x).slice(0, 120) : "", clasificada, etiqueta, ...(n.fuente ? {fuente: n.fuente} : {}), ...(n.via === "instagram" || n.via === "facebook" ? {via: n.via} : {}) });
  });
  // Grupo estable: el id de la nota más antigua del mismo hecho, para que "respondida" o "no corresponde" sobrevivan a una nueva lectura.
  notas.slice().sort((a, b) => a.ts - b.ts).forEach(n => { if (!grupos.has(n.etiqueta)) grupos.set(n.etiqueta, n.id); });
  notas.forEach(n => { n.g = grupos.get(n.etiqueta); delete n.etiqueta; });
  return notas;
}

export async function GET(req){
  const u = new URL(req.url); DIAG.length = 0;
  if (u.searchParams.has("ping")) return json({ ok: true, ia: Boolean(process.env.ANTHROPIC_API_KEY) }, 200, { "cache-control": "no-store" });
  if (u.searchParams.has("salud")) {  // diagnóstico de fuentes: por provincia, más la región
    const qs = ["Valparaíso", "San Antonio", "Quillota", "San Felipe", "Los Andes", "La Ligua", "Quilpué", "Casablanca", "Isla de Pascua"].map(c => `"${c}" ${'(Valparaíso OR comuna OR municipalidad OR alcalde OR Chile OR "litoral central")'}`).concat(['"Región de Valparaíso"']);
    return json(await saludFuentes(qs), 200, { "cache-control": "public, max-age=0, s-maxage=1800" });
  }
  if (u.searchParams.has("autoridad") || u.searchParams.has("rol")) return deAutoridad(u);
  const comuna = u.searchParams.get("comuna") || "Casablanca";
  if (!COMUNAS[comuna]) return json({ error: "Comuna no disponible" }, 400);
  const ahora = Date.now(), desde = ahora - VENTANA_DIAS * 864e5;
  const alcalde = AUTORIDADES.find(x => x.rol === "alcalde" && x.zona === comuna);
  const [cat, gn, pares, rs] = await Promise.all([leerCatalogo(), leerGoogleNews(comuna).catch(() => null), alcalde ? paresDe(alcalde, desde).catch(() => []) : [], leerRedes(redesDe(u))]);
  const errores = cat.errores.concat(gn ? [] : ["Google News"], rs.errores);
  const candidatas = candidatasDe(comuna, cat.items.concat(gn || [], rs.items), desde, ahora), lote = candidatas.slice(0, MAX_IA);

  let clas = {porI: new Map(), ok: false}; try { clas = await clasificar(comuna, lote); } catch(e) { console.error("clasificar", e); }
  const notas = armar(lote, clas.porI);

  return json({
    comuna, generado: new Date(ahora).toISOString(), ventana_dias: VENTANA_DIAS, ia: clas.ok, ia_parcial: !clas.ok && clas.porI.size > 0,
    fuentes: { leidas: cat.total + 1 + rs.total - errores.length, total: cat.total + 1 + rs.total, con_error: errores.slice(0, 40) }, redes: rs.estado,
    candidatas: candidatas.length, alcalde: alcalde ? {nombre: alcalde.n, cargo: cargoDe("alcalde", alcalde.g)} : null, pares, ...(DIAG.length ? {ia_diagnostico: DIAG.slice(0, 6)} : {}), notas
  }, 200, { "cache-control": clas.ok ? "public, max-age=0, s-maxage=900, stale-while-revalidate=3600" : "public, max-age=0, s-maxage=60" });
}

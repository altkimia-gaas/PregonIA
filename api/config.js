// Configuración pública para el navegador: la URL de Supabase y su clave publicable (pública por diseño; la seguridad la dan
// las reglas por municipio de la base). Nunca devuelve claves secretas.
// GET /api/config?cobertura entrega la cobertura pública para la página /cobertura (va aquí porque el plan de Vercel admite
// 12 funciones y ya están todas en uso).
import { CATALOGO } from "./_catalogo.js";
import { sb } from "./_servidor.js";
import { regionValida, regionDeComuna, REGIONES, REGION_DEFECTO } from "./_autoridades.js";

const resp = (cuerpo, cache) => new Response(JSON.stringify(cuerpo), {headers: {"content-type": "application/json; charset=utf-8", "cache-control": cache}});

/* Cómo se lee cada medio, en palabras de cliente. No se exponen direcciones de lectura ni observaciones internas. */
function via(metodo, estado){
  if (estado === "red" || metodo === "instagram" || metodo === "facebook") return "redes";
  if (estado === "captura_asistida") return "asistida";
  if (metodo === "google_news" || estado === "restringido") return "google";
  return "directa";
}
const RED = {instagram: "Instagram", facebook: "Facebook"};

/* Cobertura: catálogo vigente (la base, que suma las cuentas de redes inscritas; si no hay base, el catálogo compilado)
   y el resultado de la última lectura programada terminada. */
async function cobertura(region = REGION_DEFECTO){
  const hayBase = process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY;
  let medios = null, lectura = null;
  if (hayBase) {
    const [ms, ls] = await Promise.all([
      sb("medios?estado=neq.retirado&select=id,nombre,ambito,provincia,comunas,tipo,metodo,estado,ultima_lectura,error_lectura&order=id").catch(() => null),
      // La última lectura del turno de la región de la comuna consultada; sin la columna region (esquema anterior), la última de todas.
      sb(`lecturas?fin=not.is.null&fuentes_total=not.is.null&region=eq.${region}&select=fin,fuentes_ok,fuentes_total,errores&order=fin.desc&limit=1`)
        .catch(() => sb("lecturas?fin=not.is.null&fuentes_total=not.is.null&select=fin,fuentes_ok,fuentes_total,errores&order=fin.desc&limit=1")).catch(() => null)]);
    medios = ms; lectura = ls && ls[0] || null;
  }
  if (!medios) medios = CATALOGO.filter(m => m.estado !== "retirado").map(m => ({id: m.id, nombre: m.nombre, ambito: m.ambito, comunas: m.comuna, metodo: m.metodo, estado: m.estado}));
  // Fichas comunes (medios fuera del catálogo que llegan por Google News): no son un medio y no van en la lista pública.
  medios = medios.filter(m => !/^Otr[oa] (medio|fuente)/i.test(m.nombre || ""));
  // Solo los nacionales y los de la región consultada: la columna region del catálogo o, en las cuentas de redes inscritas (que no
  // la traen), la región de su comuna.
  const regionDe = new Map(CATALOGO.map(m => [m.id, m.region || ""]));
  medios = medios.filter(m => { const r = regionDe.get(m.id) || regionDeComuna(String(m.comunas || "").split(";")[0].trim()) || ""; return !r || r === region; });
  const errores = new Set((lectura && lectura.errores) || []), gnCaido = errores.has("Google News");
  const lista = medios.map(m => {
    const v = via(m.metodo, m.estado);
    // Estado de la última lectura: las redes llevan el suyo; Google News es uno solo para todos los medios que dependen de él.
    let ok = null;
    if (v === "redes") ok = m.error_lectura ? false : m.ultima_lectura ? true : null;
    else if (lectura) ok = v === "google" ? !gnCaido : v === "asistida" ? null : !errores.has(m.nombre);
    return {n: m.nombre, a: m.ambito, p: m.provincia || "", c: (m.comunas || "").split(";").map(x => x.trim()).filter(Boolean),
      t: m.tipo || "", v, ...(RED[m.metodo] ? {r: RED[m.metodo]} : {}), ...(m.estado === "requiere_ajuste" ? {aj: true} : {}), ok,
      ...(v === "redes" && m.ultima_lectura ? {u: m.ultima_lectura} : {})};
  });
  // Territorio para el filtro de la página: las provincias y comunas de las regiones abiertas, y la región de esta lista.
  const abiertas = Object.values(REGIONES).filter(r => r.activa).map(r => ({id: r.id, provincias: r.provincias}));
  return {generado: new Date().toISOString(), region, regiones: abiertas, lectura: lectura ? {fin: lectura.fin, ok: lectura.fuentes_ok, total: lectura.fuentes_total} : null, medios: lista};
}

export async function GET(req){
  const qp = new URL(req.url).searchParams;
  if (qp.has("cobertura")) {
    // ?region=II o ?comuna=Calama: la última lectura del turno de esa región (por defecto, Valparaíso).
    // Solo regiones abiertas: una región en preparación responde con la cobertura de la región por defecto.
    const pedida = regionValida(qp.get("region")) || regionDeComuna(qp.get("comuna")) || REGION_DEFECTO;
    const region = REGIONES[pedida] && REGIONES[pedida].activa ? pedida : REGION_DEFECTO;
    try { return resp(await cobertura(region), "public, max-age=0, s-maxage=600, stale-while-revalidate=1800"); }
    catch (e) { console.error("cobertura", e.message); return resp({error: "No se pudo armar la cobertura"}, "no-store"); }
  }
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_PUBLISHABLE_KEY;
  const cuerpo = url && key ? {supabase: {url, key}} : {};
  // Avisos: la llave pública de notificaciones (pública por diseño) y si el correo está configurado. Nunca la llave privada.
  cuerpo.avisos = {push: process.env.VAPID_PUBLIC_KEY || null, correo: Boolean(process.env.RESEND_API_KEY), whatsapp: Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID)};
  return resp(cuerpo, "public, max-age=120");
}

// Lectura de cuentas de Facebook e Instagram de medios locales y regionales, por la API oficial de Meta (Graph API).
// Instagram: Business Discovery lee las publicaciones públicas de cuentas profesionales (empresa o creador) de terceros.
//   Requiere META_ACCESS_TOKEN (token de usuario de larga duración o de usuario del sistema, con instagram_basic y
//   pages_read_engagement) y META_IG_USER_ID (la cuenta profesional de Instagram de ALTKimia, ligada a una página).
//   Funciona sin revisión de Meta mientras quien generó el token tenga un rol en la app.
// Facebook: leer páginas de terceros exige el permiso "Page Public Content Access", que Meta da solo tras revisar la app
//   y verificar la empresa. Se activa con META_FB_PPCA=1 cuando esté aprobado; mientras tanto, captura asistida.
// Igual que con la prensa: el texto se usa solo para clasificar; se guarda la primera frase como titular, el enlace y la fecha.
import { usuarioDe, urlDe } from "./_cuentasred.js";
export { usuarioDe, urlDe };
const VERSION = () => process.env.META_GRAPH_VERSION || "v25.0";
const MAX_CUENTAS = 60, POR_CUENTA = 30;
export const metaIG = () => Boolean(process.env.META_ACCESS_TOKEN && process.env.META_IG_USER_ID);
export const metaFB = () => Boolean(process.env.META_ACCESS_TOKEN && process.env.META_FB_PPCA === "1");

/* Titular: la primera línea o frase del texto, sin etiquetas al final, en 140 caracteres como máximo. */
function titularDe(texto){
  const linea = String(texto || "").split(/\n+/).map(l => l.trim()).find(l => l.replace(/[#@][\w.áéíóúñ]+|\p{Extended_Pictographic}|\s/giu, "").length >= 8) || "";
  const frase = (linea.match(/^.{20,}?[.!?](\s|$)/) || [linea])[0].replace(/(\s*#[\wáéíóúñ]+)+\s*$/i, "").replace(/\s+/g, " ").trim();
  return frase.length > 140 ? frase.slice(0, 138).replace(/\s+\S*$/, "") + "…" : frase;
}
function errorMeta(e, red){
  const c = e && e.code, sub = e && e.error_subcode, msg = String(e && e.message || "");
  if (c === 190) return "El token de Meta venció o fue revocado: hay que renovarlo";
  if (c === 4 || c === 17 || c === 32 || c === 613) return "Meta limitó las consultas por ahora; se reintenta en la próxima lectura";
  if (red === "facebook" && (c === 10 || c === 200 || /Public Content Access/i.test(msg))) return "Falta el permiso Page Public Content Access de Meta: usar captura asistida";
  if (red === "instagram" && (c === 110 || sub === 2207013 || /business|professional|Invalid user/i.test(msg))) return "No es una cuenta profesional de Instagram o no existe: usar captura asistida";
  if (c === 100 || c === 803) return "La cuenta no existe o no es pública";
  return "Error de Meta: " + msg.slice(0, 90);
}
async function graph(ruta, params){
  const q = new URLSearchParams({...params, access_token: process.env.META_ACCESS_TOKEN});
  const r = await fetch(`https://graph.facebook.com/${VERSION()}/${ruta}?${q}`, {signal: AbortSignal.timeout(9000)});
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw Object.assign(new Error("meta"), {meta: j.error || {message: "HTTP " + r.status}});
  return j;
}
/* Una cuenta: sus publicaciones recientes como notas candidatas (mismo formato que un feed de prensa). */
async function leerCuenta(m){
  if (m.red === "instagram") {
    const j = await graph(process.env.META_IG_USER_ID, {fields: `business_discovery.username(${m.usuario}){username,name,media.limit(${POR_CUENTA}){caption,permalink,timestamp}}`});
    const media = (j.business_discovery && j.business_discovery.media && j.business_discovery.media.data) || [];
    return media.filter(p => p.caption && p.permalink).map(p => ({titulo: titularDe(p.caption), desc: p.caption.replace(/\s+/g, " ").slice(0, 400), url: p.permalink, fecha: Date.parse(p.timestamp), m, via: "instagram"})).filter(x => x.titulo);
  }
  const j = await graph(`${m.usuario}/posts`, {fields: "message,permalink_url,created_time", limit: String(POR_CUENTA)});
  return (j.data || []).filter(p => p.message && p.permalink_url).map(p => ({titulo: titularDe(p.message), desc: p.message.replace(/\s+/g, " ").slice(0, 400), url: p.permalink_url, fecha: Date.parse(p.created_time), m, via: "facebook"})).filter(x => x.titulo);
}
/* Cuentas: [{id, nombre, ambito, comuna, red, usuario}]. Devuelve las notas, cuántas se intentaron leer y el estado de cada una.
   Las que no se pueden leer con la configuración actual quedan como pendientes, sin consultar a Meta. */
export async function leerRedes(cuentas){
  const lista = cuentas.filter(c => c && c.usuario && (c.red === "instagram" || c.red === "facebook")).slice(0, MAX_CUENTAS);
  const estado = [], items = [];
  await Promise.all(lista.map(async m => {
    const activa = m.red === "instagram" ? metaIG() : metaFB();
    if (!activa) { estado.push({id: m.id, ok: false, pendiente: true, error: m.red === "instagram" ? "Instagram aún no está conectado con Meta" : "Facebook se ingresa con captura asistida"}); return; }
    try { const its = await leerCuenta(m); items.push(...its); estado.push({id: m.id, ok: true, n: its.length}); }
    catch(e) { estado.push({id: m.id, ok: false, error: e.meta ? errorMeta(e.meta, m.red) : "No respondió: " + String(e.message || e).slice(0, 60)}); }
  }));
  return {items, total: lista.filter(m => m.red === "instagram" ? metaIG() : metaFB()).length, errores: estado.filter(s => !s.ok && !s.pendiente).map(s => (lista.find(m => m.id === s.id) || {}).nombre), estado};
}
/* Revisión al inscribir: que la cuenta exista y se pueda leer. Sin conexión con Meta responde que queda pendiente. */
export async function verificarCuenta(red, usuario){
  if (red === "instagram" ? !metaIG() : !metaFB()) return {ok: null, pendiente: true};
  try {
    if (red === "instagram") {
      const j = await graph(process.env.META_IG_USER_ID, {fields: `business_discovery.username(${usuario}){username,name,followers_count,media_count}`});
      const b = j.business_discovery || {}; return {ok: true, nombre: b.name || b.username || usuario, seguidores: b.followers_count ?? null, publicaciones: b.media_count ?? null};
    }
    const j = await graph(usuario, {fields: "name,followers_count"});
    return {ok: true, nombre: j.name || usuario, seguidores: j.followers_count ?? null};
  } catch(e) { return {ok: false, error: e.meta ? errorMeta(e.meta, red) : "Meta no respondió"}; }
}
/* Cuentas de redes del catálogo fijo (data/catalogo_medios.csv, método facebook o instagram). */
export const cuentasCatalogo = cat => cat.filter(m => (m.metodo === "instagram" || m.metodo === "facebook") && m.url && m.estado !== "retirado")
  .map(m => ({id: m.id, nombre: m.nombre, ambito: m.ambito, comuna: m.comuna || "", red: m.metodo, usuario: usuarioDe(m.metodo, m.url)})).filter(m => m.usuario);

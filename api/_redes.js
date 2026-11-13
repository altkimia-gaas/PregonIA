// Lectura de cuentas de Facebook e Instagram de medios locales y regionales, por la API oficial de Meta (Graph API).
// Instagram: Business Discovery lee las publicaciones públicas de cuentas profesionales (empresa o creador) de terceros.
//   Requiere META_ACCESS_TOKEN (token de usuario de larga duración o de usuario del sistema, con instagram_basic y
//   pages_read_engagement) y META_IG_USER_ID (la cuenta profesional de Instagram de ALTKimia, ligada a una página).
//   Funciona sin revisión de Meta mientras quien generó el token tenga un rol en la app.
// Facebook: leer páginas de terceros exige el permiso "Page Public Content Access", que Meta da solo tras revisar la app
//   y verificar la empresa. Se activa con META_FB_PPCA=1 cuando esté aprobado; mientras tanto, captura asistida.
// Opción para la demostración, sin Meta: con APIFY_TOKEN, Facebook e Instagram se leen con los lectores oficiales de Apify
//   (apify/facebook-posts-scraper y apify/instagram-post-scraper), solo páginas y cuentas públicas, sin iniciar sesión y sin
//   comentarios. Ver leerApify más abajo. Si Meta está configurado para una red, se usa Meta y no Apify.
// Igual que con la prensa: el texto se usa solo para clasificar; se guarda la primera frase como titular, el enlace y la fecha.
import { usuarioDe, urlDe } from "./_cuentasred.js";
export { usuarioDe, urlDe };
const VERSION = () => process.env.META_GRAPH_VERSION || "v25.0";
const MAX_CUENTAS = 60, POR_CUENTA = 30;
export const metaIG = () => Boolean(process.env.META_ACCESS_TOKEN && process.env.META_IG_USER_ID);
export const metaFB = () => Boolean(process.env.META_ACCESS_TOKEN && process.env.META_FB_PPCA === "1");
export const apify = () => Boolean(process.env.APIFY_TOKEN);
/* Cómo se lee cada red con la configuración actual: "meta", "apify" o null (pendiente / captura asistida). */
export const viaDe = red => (red === "instagram" ? metaIG() : metaFB()) ? "meta" : apify() ? "apify" : null;

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
/* Apify. Para pagar cada publicación una sola vez, cada pasada pide solo lo publicado desde la anterior y la lectura junta
   los resultados de las últimas pasadas (unos 7 días). Una cuenta que aún no aparece en ninguna pasada se pide con 14 días
   hacia atrás. Una pasada nueva parte solo si no hay otra corriendo y la última empezó hace más de APIFY_CADA_HORAS (6).
   La lanzan la lectura programada y «Noticias reales»; los resultados llegan en la pasada siguiente (tarda unos minutos).
   Variables: APIFY_TOKEN; opcionales APIFY_CADA_HORAS, APIFY_ACTOR_FB, APIFY_ACTOR_IG, APIFY_MAX_POR_CUENTA (10). */
const ACTOR = {facebook: () => process.env.APIFY_ACTOR_FB || "apify~facebook-posts-scraper", instagram: () => process.env.APIFY_ACTOR_IG || "apify~instagram-post-scraper"};
const PASADAS_LEIDAS = 28;
async function apifyApi(ruta, opciones = {}){
  const r = await fetch("https://api.apify.com/v2/" + ruta, {...opciones, headers: {authorization: "Bearer " + process.env.APIFY_TOKEN, "content-type": "application/json"}, signal: AbortSignal.timeout(opciones.ms || 9000)});
  if (!r.ok) throw new Error("Apify " + r.status + " " + (await r.text()).slice(0, 120));
  return r.json();
}
const clave = (red, u) => red + ":" + String(u || "").toLowerCase();
function itemAPost(red, it){
  if (!it || it.error || !it.url) return null;
  const texto = red === "instagram" ? it.caption : it.text;
  const fecha = red === "instagram" ? Date.parse(it.timestamp) : (Number.isFinite(it.timestamp) ? it.timestamp * 1000 : Date.parse(it.time));
  const u = red === "instagram" ? (it.ownerUsername || usuarioDe("instagram", it.inputUrl)) : (usuarioDe("facebook", it.inputUrl) || usuarioDe("facebook", it.facebookUrl) || it.pageName);
  return texto && u ? {u: String(u).toLowerCase(), texto, url: it.url, fecha} : null;
}
async function leerApify(red, cuentas){
  const estado = [], items = [];
  const runs = ((await apifyApi(`acts/${ACTOR[red]()}/runs?desc=1&limit=${PASADAS_LEIDAS + 6}`)).data || {}).items || [];
  const ok = runs.filter(r => r.status === "SUCCEEDED").slice(0, PASADAS_LEIDAS);
  const datos = (await Promise.all(ok.map(r => apifyApi(`datasets/${r.defaultDatasetId}/items?clean=true&limit=1000`).catch(() => [])))).flat();
  const porCuenta = new Map(), vistos = new Set();
  datos.map(it => itemAPost(red, it)).filter(Boolean).forEach(p => { if (vistos.has(p.url)) return; vistos.add(p.url); const k = clave(red, p.u); if (!porCuenta.has(k)) porCuenta.set(k, []); porCuenta.get(k).push(p); });
  // Pasada nueva, si corresponde (sin esperar a que termine).
  const corriendo = runs.some(r => ["READY", "RUNNING"].includes(r.status)), ultima = runs[0] ? Date.parse(runs[0].startedAt) : 0;
  const cada = Math.max(1, Number(process.env.APIFY_CADA_HORAS || 6)), limite = Math.max(1, Number(process.env.APIFY_MAX_POR_CUENTA || 10));
  const nuevas = cuentas.filter(m => !porCuenta.has(clave(red, m.usuario))), conocidas = cuentas.filter(m => porCuenta.has(clave(red, m.usuario)));
  let lanzada = false;
  if (!corriendo && Date.now() - ultima > cada * 36e5) {
    const entrada = (lista, desde) => red === "instagram"
      ? {username: lista.map(m => m.usuario), resultsLimit: limite, onlyPostsNewerThan: desde, skipPinnedPosts: true, dataDetailLevel: "basicData"}
      : {startUrls: lista.map(m => ({url: urlDe("facebook", m.usuario)})), resultsLimit: limite, onlyPostsNewerThan: desde, captionText: false};
    const lanzar = (lista, desde) => lista.length ? apifyApi(`acts/${ACTOR[red]()}/runs`, {method: "POST", body: JSON.stringify(entrada(lista, desde))}).then(() => { lanzada = true; }).catch(() => null) : null;
    await Promise.all([lanzar(nuevas, "14 days"), lanzar(conocidas, (cada + 2) + " hours")]);
  }
  const fallo = runs[0] && ["FAILED", "TIMED-OUT", "ABORTED"].includes(runs[0].status);
  cuentas.forEach(m => {
    const posts = porCuenta.get(clave(red, m.usuario)) || [];
    posts.forEach(p => { const titulo = titularDe(p.texto); if (titulo) items.push({titulo, desc: p.texto.replace(/\s+/g, " ").slice(0, 400), url: p.url, fecha: p.fecha, m, via: red}); });
    if (posts.length) estado.push({id: m.id, ok: true, n: posts.length, via: "apify"});
    else if (fallo) estado.push({id: m.id, ok: false, via: "apify", error: "El lector de redes falló en su última pasada; se reintenta en la próxima"});
    else if (corriendo || lanzada || !ok.length) estado.push({id: m.id, ok: false, pendiente: true, via: "apify", primera: true, error: "Primera lectura en curso: sus publicaciones aparecen en unos minutos"});
    else estado.push({id: m.id, ok: true, n: 0, via: "apify"});  // leída, sin publicaciones en los últimos días
  });
  return {items, estado};
}
/* Cuentas: [{id, nombre, ambito, comuna, red, usuario}]. Devuelve las notas, cuántas se intentaron leer y el estado de cada una.
   Cada red se lee por Meta si está configurado, si no por Apify; sin ninguno, la cuenta queda pendiente (captura asistida). */
export async function leerRedes(cuentas){
  const lista = cuentas.filter(c => c && c.usuario && (c.red === "instagram" || c.red === "facebook")).slice(0, MAX_CUENTAS);
  const estado = [], items = [];
  const porApify = {instagram: [], facebook: []};
  await Promise.all(lista.map(async m => {
    const via = viaDe(m.red);
    if (via === "apify") { porApify[m.red].push(m); return; }
    if (!via) { estado.push({id: m.id, ok: false, pendiente: true, error: m.red === "instagram" ? "Instagram aún no tiene lector conectado" : "Facebook se ingresa con captura asistida"}); return; }
    try { const its = await leerCuenta(m); items.push(...its); estado.push({id: m.id, ok: true, n: its.length, via}); }
    catch(e) { estado.push({id: m.id, ok: false, via, error: e.meta ? errorMeta(e.meta, m.red) : "No respondió: " + String(e.message || e).slice(0, 60)}); }
  }));
  await Promise.all(Object.entries(porApify).filter(([, l]) => l.length).map(async ([red, l]) => {
    try { const r = await leerApify(red, l); items.push(...r.items); estado.push(...r.estado); }
    catch(e) { l.forEach(m => estado.push({id: m.id, ok: false, via: "apify", error: "El lector de redes no respondió: " + String(e.message || e).slice(0, 80)})); }
  }));
  return {items, total: lista.filter(m => viaDe(m.red)).length, errores: estado.filter(s => !s.ok && !s.pendiente).map(s => (lista.find(m => m.id === s.id) || {}).nombre), estado};
}
/* Revisión al inscribir: que la cuenta exista y se pueda leer. Sin conexión con Meta responde que queda pendiente. */
export async function verificarCuenta(red, usuario){
  if (viaDe(red) === "apify") return {ok: null, apify: true};  // revisarla con Apify costaría una pasada: se ve en la primera lectura
  if (!viaDe(red)) return {ok: null, pendiente: true};
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

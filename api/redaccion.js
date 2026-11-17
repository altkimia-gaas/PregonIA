// «Buscar ahora» de la página /redaccion: el editor pide una detección fuera de la lectura programada.
// Solo responde a una sesión de Supabase de alguien inscrito en la tabla editores. Lee la prensa y Google News
// (no las cuentas de redes: esas las lee la lectura programada cada 30 minutos, para no pagar dos veces a Apify).
// Variables: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, ANTHROPIC_API_KEY; avisos: VAPID_*.
import { leerCatalogo, json } from "./_lectura.js";
import { detectarRedaccion } from "./_redaccion.js";

let ultima = 0; // freno simple por instancia: una búsqueda cada 2 minutos

async function sb(ruta, {method = "GET", body, prefer} = {}){
  const url = process.env.SUPABASE_URL, clave = process.env.SUPABASE_SECRET_KEY;
  const headers = {apikey: clave, "content-type": "application/json", ...(prefer ? {prefer} : {})};
  if (!String(clave).startsWith("sb_")) headers.authorization = "Bearer " + clave;
  const r = await fetch(`${url}/rest/v1/${ruta}`, {method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000)});
  if (!r.ok) throw new Error(`Supabase ${method} ${ruta.split("?")[0]}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.status === 204 || method === "DELETE" ? null : r.json().catch(() => null);
}

/* Quién llama: valida el token de la sesión con Supabase y que esté en la tabla editores. */
async function editor(req){
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim(); if (!token) return null;
  const r = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {headers: {apikey: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SECRET_KEY, authorization: "Bearer " + token}, signal: AbortSignal.timeout(8000)});
  if (!r.ok) return null; const u = await r.json().catch(() => null); if (!u || !u.id) return null;
  const e = await sb(`editores?usuario=eq.${u.id}&select=usuario`).catch(() => []);
  return e && e.length ? u : null;
}

async function manejar(req){
  const listo = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
  if (req.method === "GET") return json({ok: listo, ia: Boolean(process.env.ANTHROPIC_API_KEY)}, 200, {"cache-control": "no-store"});
  if (!listo) return json({error: "Falta configurar Supabase en el servidor"}, 503);
  const u = await editor(req); if (!u) return json({error: "Solo el editor de PregonIA puede pedir una búsqueda"}, 403);
  if (Date.now() - ultima < 120000) return json({error: "Se acaba de buscar. Intenta en un par de minutos."}, 429);
  ultima = Date.now();
  try {
    const cat = await leerCatalogo();
    const r = await detectarRedaccion(sb, cat.items, {ahora: Date.now()});
    return json({ok: true, fuentes: cat.total, errores: cat.errores.length, ...r}, 200, {"cache-control": "no-store"});
  } catch(e) { return json({ok: false, error: String(e.message || e).slice(0, 200)}, 500); }
}
export const GET = manejar, POST = manejar;

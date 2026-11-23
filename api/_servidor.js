// Ayudantes de servidor compartidos por /api/redaccion y /api/publicar: Supabase con la clave secreta y quién es el editor.
// El guion bajo evita que Vercel lo publique como ruta.

export async function sb(ruta, {method = "GET", body, prefer} = {}){
  const url = process.env.SUPABASE_URL, clave = process.env.SUPABASE_SECRET_KEY;
  const headers = {apikey: clave, "content-type": "application/json", ...(prefer ? {prefer} : {})};
  if (!String(clave).startsWith("sb_")) headers.authorization = "Bearer " + clave;  // claves antiguas (JWT de service_role)
  const r = await fetch(`${url}/rest/v1/${ruta}`, {method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000)});
  if (!r.ok) throw new Error(`Supabase ${method} ${ruta.split("?")[0]}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.status === 204 || method === "DELETE" ? null : r.json().catch(() => null);
}

/* Quién llama: valida el token de la sesión con Supabase y que esté en la tabla editores. */
export async function editor(req){
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim(); if (!token) return null;
  const r = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {headers: {apikey: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SECRET_KEY, authorization: "Bearer " + token}, signal: AbortSignal.timeout(8000)});
  if (!r.ok) return null; const u = await r.json().catch(() => null); if (!u || !u.id) return null;
  const e = await sb(`editores?usuario=eq.${u.id}&select=usuario`).catch(() => []);
  return e && e.length ? u : null;
}

export const json = (data, status = 200) => new Response(JSON.stringify(data), {status, headers: {"content-type": "application/json; charset=utf-8", "cache-control": "no-store"}});

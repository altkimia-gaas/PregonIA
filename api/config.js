// Configuración pública para el navegador: la URL de Supabase y su clave publicable (pública por diseño; la seguridad la dan
// las reglas por municipio de la base). Nunca devuelve claves secretas.
export function GET(){
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_PUBLISHABLE_KEY;
  const cuerpo = url && key ? {supabase: {url, key}} : {};
  return new Response(JSON.stringify(cuerpo), {headers: {"content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300"}});
}

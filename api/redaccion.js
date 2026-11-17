// «Buscar ahora» de la página /redaccion: el editor pide una detección fuera de la lectura programada.
// Solo responde a una sesión de Supabase de alguien inscrito en la tabla editores. Lee la prensa y Google News
// (no las cuentas de redes: esas las lee la lectura programada cada 30 minutos, para no pagar dos veces a Apify).
// Variables: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, ANTHROPIC_API_KEY; avisos: VAPID_*.
import { leerCatalogo, json } from "./_lectura.js";
import { sb, editor } from "./_servidor.js";
import { detectarRedaccion } from "./_redaccion.js";

let ultima = 0; // freno simple por instancia: una búsqueda cada 2 minutos

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

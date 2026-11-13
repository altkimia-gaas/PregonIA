// Cuentas de Facebook e Instagram de medios: qué se puede leer con la configuración actual y revisión de una cuenta al inscribirla.
// GET /api/redes?estado            → {instagram: bool, facebook: bool, via: {instagram: "meta"|"apify"|null, facebook: …}}
// GET /api/redes?red=instagram&u=x → {ok, nombre, seguidores, publicaciones} o {ok: false, error} o {pendiente: true}
// Variables: META_ACCESS_TOKEN, META_IG_USER_ID, META_FB_PPCA, META_GRAPH_VERSION (ver api/_redes.js). REDES_LIMITE: revisiones por IP cada 10 min (30).
import { viaDe, usuarioDe, verificarCuenta } from "./_redes.js";

const visitas = new Map();
const json = (data, status = 200, cache = "no-store") => new Response(JSON.stringify(data), {status, headers: {"content-type": "application/json; charset=utf-8", "cache-control": cache}});
function excedido(ip){
  const ahora = Date.now(), lista = (visitas.get(ip) || []).filter(t => ahora - t < 6e5);
  lista.push(ahora); visitas.set(ip, lista); if (visitas.size > 5000) visitas.clear();
  return lista.length > Number(process.env.REDES_LIMITE || 30);
}
export async function GET(req){
  const u = new URL(req.url);
  if (u.searchParams.has("estado")) return json({instagram: Boolean(viaDe("instagram")), facebook: Boolean(viaDe("facebook")), via: {instagram: viaDe("instagram"), facebook: viaDe("facebook")}}, 200, "public, max-age=0, s-maxage=300");
  const propio = u.origin, permitidos = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean), origen = req.headers.get("origin");
  if (origen && origen !== propio && !permitidos.includes(origen)) return json({error: "Origen no permitido"}, 403);
  if (excedido((req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "?")) return json({error: "Demasiadas revisiones; espera unos minutos"}, 429);
  const red = u.searchParams.get("red"), usuario = usuarioDe(red, u.searchParams.get("u"));
  if (!["instagram", "facebook"].includes(red) || !usuario) return json({error: "Cuenta no válida"}, 400);
  return json({usuario, ...(await verificarCuenta(red, usuario))});
}

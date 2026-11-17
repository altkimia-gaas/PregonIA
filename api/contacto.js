// Formulario de contacto de la página del servicio (/servicio).
// Guarda la solicitud en Supabase (tabla contactos, solo accesible con la clave secreta) y avisa por correo con Resend.
// Variables: SUPABASE_URL y SUPABASE_SECRET_KEY (guardar), RESEND_API_KEY y AVISOS_REMITENTE (correo),
// CONTACTO_DESTINO (por defecto soporte@altkimia.cl). Si no se logra ni guardar ni avisar, responde error
// para que la página ofrezca escribir directo al correo.
import { sb, json } from "./_servidor.js";
import { pruebaPOST } from "./_prueba.js";

const VENTANA_MS = 10 * 60 * 1000, LIMITE = 5;
const visitas = new Map(); // freno simple por IP e instancia
const INTERESES = ["Municipio", "Parlamentario", "Otra autoridad", "Comunicaciones o prensa", "Otro"];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const corto = (v, n) => String(v ?? "").trim().slice(0, n);

function excedido(ip){
  const ahora = Date.now(), lista = (visitas.get(ip) || []).filter(t => ahora - t < VENTANA_MS);
  lista.push(ahora); visitas.set(ip, lista); if (visitas.size > 5000) visitas.clear();
  return lista.length > LIMITE;
}

async function avisarCorreo(c){
  if (!process.env.RESEND_API_KEY) return false;
  const destino = process.env.CONTACTO_DESTINO || "soporte@altkimia.cl";
  const filas = [["Nombre", c.nombre], ["Cargo", c.cargo], ["Institución o comuna", c.institucion], ["Correo", c.correo], ["Celular", c.telefono], ["Interés", c.interes], ["Mensaje", c.mensaje]]
    .filter(([, v]) => v).map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#555;vertical-align:top">${k}</td><td style="padding:6px 0;white-space:pre-wrap">${esc(v)}</td></tr>`).join("");
  const r = await fetch("https://api.resend.com/emails", {method: "POST", signal: AbortSignal.timeout(10000),
    headers: {authorization: "Bearer " + process.env.RESEND_API_KEY, "content-type": "application/json"},
    body: JSON.stringify({from: process.env.AVISOS_REMITENTE || "PregonIA <pregonia@avala.altkimia.com>", to: [destino], reply_to: c.correo,
      subject: `Contacto PregonIA · ${c.institucion || c.nombre}`,
      html: `<div style="font:14px/1.5 Arial,sans-serif;color:#141414;max-width:560px"><p style="font-weight:700;margin:0 0 10px">Nueva solicitud desde pregonia.vercel.app/servicio</p><table role="presentation" cellspacing="0" cellpadding="0">${filas}</table></div>`})});
  return r.ok;
}

export async function POST(req){
  if (new URL(req.url).searchParams.has("prueba")) return pruebaPOST(req);  // inscripción de la prueba gratis
  const propio = new URL(req.url).origin, origen = req.headers.get("origin");
  if (origen && origen !== propio) return json({error: "Origen no permitido"}, 403);
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "anonimo";
  if (excedido(ip)) return json({error: "Recibimos varias solicitudes desde tu conexión. Intenta en unos minutos."}, 429);
  let d; try { d = await req.json(); } catch { return json({error: "Solicitud inválida"}, 400); }
  if (d && d.sitio) return json({ok: true}); // campo trampa: lo llenan los robots, no las personas
  const c = {nombre: corto(d?.nombre, 120), cargo: corto(d?.cargo, 120), institucion: corto(d?.institucion, 160), correo: corto(d?.correo, 160).toLowerCase(),
    telefono: corto(d?.telefono, 40), interes: INTERESES.includes(d?.interes) ? d.interes : "Otro", mensaje: corto(d?.mensaje, 2000)};
  if (!c.nombre || !c.institucion) return json({error: "Falta tu nombre o tu institución."}, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.correo)) return json({error: "Revisa el correo."}, 400);
  if (d?.consentimiento !== true) return json({error: "Necesitamos tu autorización para usar estos datos."}, 400);
  let guardado = false, correo = false;
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY) {
    try { await sb("contactos", {method: "POST", body: {...c, origen: corto(d?.origen, 60) || "servicio", version_privacidad: corto(d?.version, 20) || null}, prefer: "return=minimal"}); guardado = true; }
    catch (e) { console.error("contacto guardar", e.message); }
  }
  try { correo = await avisarCorreo(c); } catch (e) { console.error("contacto correo", e.message); }
  if (!guardado && !correo) return json({error: "No pudimos registrar tu solicitud. Escríbenos a soporte@altkimia.cl."}, 502);
  return json({ok: true});
}
export const GET = () => json({ok: true});

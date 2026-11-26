// Aprobación externa por enlace (/aprobar/<código>): página pública y sin cuenta para que quien decide lea el texto exacto y responda.
// Se sirve desde /api/contacto?aprobar=<código> (Vercel tiene el límite de funciones lleno). El código es secreto: 128 bits al azar, vence a los 7 días
// y se responde una sola vez. Nunca se muestra nada de la cuenta salvo el nombre de la institución y el texto enviado.
import { sb } from "./_servidor.js";

const ESC = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const TOKEN = /^[a-f0-9]{32}$/;
const VENTANA_MS = 10 * 60 * 1000, LIMITE = 30;
const visitas = new Map();
const excedido = ip => { const t = Date.now(), l = (visitas.get(ip) || []).filter(x => t - x < VENTANA_MS); l.push(t); visitas.set(ip, l); if (visitas.size > 5000) visitas.clear(); return l.length > LIMITE; };
const CABECERAS = {"content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow", "referrer-policy": "no-referrer",
  "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'", "x-content-type-options": "nosniff"};

const pagina = (cuerpo, status = 200) => new Response(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Aprobación de texto · PregonIA</title><style>
*{box-sizing:border-box}body{margin:0;background:#f4f5f7;color:#141414;font:16px/1.55 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}
main{max-width:640px;margin:0 auto;padding:20px 16px 40px}h1{font-size:20px;margin:0 0 4px}.sub{color:#555;margin:0 0 16px;font-size:14px}
.texto{background:#fff;border:1px solid #d9dce1;border-radius:12px;padding:16px;white-space:pre-wrap;word-wrap:break-word;font-size:16px}
label{display:block;font-weight:600;margin:16px 0 6px}input,textarea{width:100%;font:inherit;padding:10px 12px;border:1px solid #b9bec7;border-radius:10px;background:#fff}
textarea{min-height:90px}.fila{display:grid;gap:10px;margin-top:18px}button{font:inherit;font-weight:700;min-height:48px;border-radius:12px;border:0;cursor:pointer}
.ok{background:#14532d;color:#fff}.cam{background:#fff;color:#141414;border:1.5px solid #141414}.nota{font-size:13px;color:#555;margin-top:18px}
.estado{padding:14px 16px;border-radius:12px;background:#fff;border:1px solid #d9dce1;margin-bottom:16px;font-weight:600}.v{font-family:ui-monospace,Menlo,monospace}
</style></head><body><main>${cuerpo}<p class="nota">Enlace privado enviado por PregonIA. No lo reenvíes: quien lo abre puede responder en tu nombre. Responde una sola vez y vence a los 7 días.</p></main></body></html>`, {status, headers: CABECERAS});

const caso = (titulo, msg) => pagina(`<h1>${ESC(titulo)}</h1><p class="sub">${ESC(msg)}</p>`, 200);
async function buscar(token){
  const f = ((await sb(`aprobaciones?token=eq.${token}&select=titulo,texto,h,estado,revisor,comentario,resuelto,vence,municipios(nombre)`).catch(() => null)) || [])[0];
  return f || null;
}
const fecha = iso => new Date(iso).toLocaleString("es-CL", {day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "America/Santiago"});

function vista(f, token){
  const inst = f.municipios && f.municipios.nombre ? f.municipios.nombre : "tu institución";
  const cab = `<h1>${ESC(f.titulo || "Texto para aprobar")}</h1><p class="sub">${ESC(inst)} · versión <span class="v">${ESC(f.h)}</span></p>`;
  if (f.estado !== "pendiente") return pagina(`${cab}<div class="estado">${f.estado === "aprobado" ? "Ya respondiste: aprobado" : "Ya respondiste: pediste cambios"}${f.revisor ? " · " + ESC(f.revisor) : ""}${f.resuelto ? " · " + ESC(fecha(f.resuelto)) : ""}</div><div class="texto">${ESC(f.texto)}</div>${f.comentario ? `<p class="sub" style="margin-top:12px">Tu comentario: ${ESC(f.comentario)}</p>` : ""}`);
  if (new Date(f.vence) < new Date()) return caso("Este enlace venció", "Pide que te envíen uno nuevo desde PregonIA.");
  return pagina(`${cab}<div class="texto">${ESC(f.texto)}</div>
<form method="post" action="/aprobar/${token}"><label for="n">Tu nombre y cargo</label><input id="n" name="nombre" required minlength="2" maxlength="80" autocomplete="name" placeholder="Ej.: Ana Pérez, Jefa de gabinete">
<label for="c">Comentario o cambios (opcional)</label><textarea id="c" name="comentario" maxlength="500" placeholder="Si pides cambios, di qué cambiar"></textarea>
<div class="fila"><button class="ok" name="decision" value="ok">Aprobar este texto</button><button class="cam" name="decision" value="cambios">Pido cambios</button></div></form>`);
}

export async function aprobacion(req, token){
  if (!TOKEN.test(token || "")) return caso("Enlace no válido", "Revisa que el enlace esté completo o pide uno nuevo.");
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) return caso("Servicio no disponible", "Intenta de nuevo en unos minutos.");
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "anonimo";
  if (excedido(ip)) return caso("Demasiados intentos", "Espera unos minutos y vuelve a abrir el enlace.");
  if (req.method === "POST") {
    const origen = req.headers.get("origin"); if (origen && origen !== new URL(req.url).origin) return caso("Solicitud no permitida", "Abre el enlace desde tu navegador.");
    let d; try { d = new URLSearchParams(await req.text()); } catch { return caso("Solicitud inválida", "Vuelve a abrir el enlace."); }
    const decision = d.get("decision") === "ok" ? "aprobado" : d.get("decision") === "cambios" ? "cambios" : null, nombre = String(d.get("nombre") || "").trim().slice(0, 80);
    if (!decision) return caso("Falta tu respuesta", "Vuelve atrás y elige una opción.");
    if (nombre.length < 2) return caso("Falta tu nombre", "Vuelve atrás: necesitamos tu nombre y cargo para dejar constancia.");
    const comentario = String(d.get("comentario") || "").trim().slice(0, 500) || null;
    let r; try { r = await sb(`aprobaciones?token=eq.${token}&estado=eq.pendiente&vence=gt.${encodeURIComponent(new Date().toISOString())}&select=id`, {method: "PATCH", prefer: "return=representation", body: {estado: decision, revisor: nombre, comentario, resuelto: new Date().toISOString()}}); }
    catch (e) { console.error("aprobar", e.message); return caso("No pudimos guardar tu respuesta", "Intenta de nuevo en unos minutos."); }
    if (!r || !r.length) { const f = await buscar(token); return f ? vista(f, token) : caso("Enlace no válido", "Pide uno nuevo."); }  // ya respondido o vencido: muestra el estado real
  }
  const f = await buscar(token); if (!f) return caso("Enlace no válido", "Revisa que el enlace esté completo o pide uno nuevo.");
  return vista(f, token);
}

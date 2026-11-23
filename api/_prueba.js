// Prueba gratis: inscripción con verificación del correo. Se atiende en /api/contacto?prueba (el plan de Vercel admite
// 12 funciones; las dos son formularios de potenciales clientes y comparten la función).
// POST {accion: "solicitar", nombre, correo, rol, territorio, consentimiento} guarda la inscripción en Supabase (tabla pruebas)
// y envía al correo un código de 6 dígitos generado al azar (crypto.randomInt), válido 15 minutos. En la base solo queda
// el resumen del código (SHA-256 con sal), nunca el código.
// POST {accion: "verificar", id, codigo} lo compara (máximo 5 intentos) y, si coincide, marca el correo como verificado,
// avisa al equipo comercial y devuelve la vigencia de la prueba.
// Variables: SUPABASE_URL y SUPABASE_SECRET_KEY, RESEND_API_KEY (integración Resend–Vercel) y AVISOS_REMITENTE (por defecto
// pregonia@avala.altkimia.com, dominio verificado en Resend; debe ser de un dominio verificado en
// Resend: con el remitente de pruebas solo llegan correos a la cuenta dueña), CONTACTO_DESTINO, PRUEBA_HORAS (por defecto 168, 7 días).
import { randomInt, randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { sb, json } from "./_servidor.js";

const ROLES = {municipio: "Alcaldía o municipio", concejal: "Concejal o concejala", diputado: "Diputado o diputada", senador: "Senador o senadora",
  core: "Consejero o consejera regional", gobernador: "Gobernador o gobernadora regional", delegado: "Delegado o delegada presidencial"};
const VIGENCIA_MIN = 15, MAX_INTENTOS = 5, POR_CORREO = 3, VENTANA_MS = 10 * 60 * 1000, LIMITE_IP = 8;
const visitas = new Map(); // freno simple por IP e instancia
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const corto = (v, n) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, n);
const resumen = (correo, codigo, sal) => createHash("sha256").update(`${sal}:${correo}:${codigo}`).digest("hex");
// Correos de demostración comercial (PRUEBA_SIN_LIMITE, separados por coma): sin vencimiento, sin tope de envíos por correo,
// sin aviso interno al validar, fuera de la limpieza automática y sin código: entran directo y el dueño del correo recibe
// un aviso cada vez que se usa, para detectar si alguien más lo escribió.
const SIN_LIMITE = (process.env.PRUEBA_SIN_LIMITE || "avillalobos@altkimia.com").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
const sinLimite = correo => SIN_LIMITE.includes(String(correo || "").toLowerCase());
const fueraLimpieza = SIN_LIMITE.length ? `&correo=not.in.(${SIN_LIMITE.map(c => encodeURIComponent(`"${c}"`)).join(",")})` : "";
const horas = () => Math.max(1, Math.min(24 * 30, parseInt(process.env.PRUEBA_HORAS, 10) || 168));

function excedido(ip){
  const ahora = Date.now(), lista = (visitas.get(ip) || []).filter(t => ahora - t < VENTANA_MS);
  lista.push(ahora); visitas.set(ip, lista); if (visitas.size > 5000) visitas.clear();
  return lista.length > LIMITE_IP;
}

async function correo(para, asunto, html, extra = {}){
  if (!process.env.RESEND_API_KEY) return false;
  const r = await fetch("https://api.resend.com/emails", {method: "POST", signal: AbortSignal.timeout(10000),
    headers: {authorization: "Bearer " + process.env.RESEND_API_KEY, "content-type": "application/json"},
    body: JSON.stringify({from: process.env.AVISOS_REMITENTE || "PregonIA <pregonia@avala.altkimia.com>", to: [para], subject: asunto, html, ...extra})});
  if (!r.ok) console.error("prueba correo", r.status, (await r.text()).slice(0, 200));
  return r.ok;
}

const cuerpoCodigo = (nombre, codigo) => `<div style="font:15px/1.55 Arial,sans-serif;color:#141414;max-width:520px">
  <p style="font:700 22px Georgia,serif;margin:0 0 18px">Pregon<span style="color:#2B4BE0">IA</span></p>
  <p style="margin:0 0 14px">Hola ${esc(nombre.split(" ")[0])}, este es tu código para activar la prueba gratis:</p>
  <p style="font:700 34px/1 'Courier New',monospace;letter-spacing:8px;margin:0 0 14px;padding:16px 20px;border:1.5px solid #141414;border-radius:14px;display:inline-block">${codigo}</p>
  <p style="margin:0 0 8px;color:#555">Vence en ${VIGENCIA_MIN} minutos. Si no pediste este código, ignora este correo: nadie podrá usar tu dirección sin él.</p>
  <p style="margin:18px 0 0;color:#555;font-size:13px">PregonIA · ALTKimia · La prensa no espera. Tú tampoco.</p></div>`;

/* La prueba corre desde la primera verificación del correo: validarlo de nuevo en otro equipo no la reinicia. */
async function primeraVerificacion(correo){
  const [f] = await sb(`pruebas?correo=eq.${encodeURIComponent(correo)}&verificado_en=not.is.null&select=verificado_en&order=verificado_en.asc&limit=1`) || [];
  return f ? new Date(f.verificado_en).getTime() : 0;
}

async function solicitar(d){
  if (d.sitio) return json({ok: true, id: 0}); // campo trampa
  const p = {nombre: corto(d.nombre, 120), correo: corto(d.correo, 160).toLowerCase(), rol: ROLES[d.rol] ? d.rol : "", territorio: corto(d.territorio, 120)};
  if (p.nombre.length < 3 || p.nombre.split(" ").length < 2) return json({error: "Escribe tu nombre y apellido."}, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(p.correo)) return json({error: "Revisa el correo."}, 400);
  if (!p.rol) return json({error: "Elige el tipo de autoridad."}, 400);
  if (!p.territorio) return json({error: "Elige el territorio."}, 400);
  if (d.consentimiento !== true) return json({error: "Necesitamos tu autorización para usar estos datos."}, 400);
  // Plazos de conservación publicados en /legal.html: sin validar, 30 días; validadas, 12 meses.
  const atras = d => new Date(Date.now() - d * 864e5).toISOString();
  sb(`pruebas?verificado_en=is.null&creado_en=lt.${atras(30)}${fueraLimpieza}`, {method: "DELETE"}).catch(() => {});
  sb(`pruebas?creado_en=lt.${atras(365)}${fueraLimpieza}`, {method: "DELETE"}).catch(() => {});
  const demo = sinLimite(p.correo);
  const inicio = demo ? 0 : await primeraVerificacion(p.correo);
  if (inicio && inicio + horas() * 36e5 < Date.now()) return json({error: "La prueba gratis de este correo ya terminó. Agenda una demostración en www.pregonia.cl y te mostramos los planes."}, 403);
  const desde = new Date(Date.now() - VENTANA_MS).toISOString();
  const recientes = await sb(`pruebas?correo=eq.${encodeURIComponent(p.correo)}&creado_en=gte.${desde}&select=id`);
  if (!demo && (recientes || []).length >= POR_CORREO) return json({error: "Ya enviamos varios códigos a ese correo. Revisa tu bandeja (y la de spam) o intenta en 10 minutos."}, 429);
  if (demo) {
    const ahora = new Date().toISOString();
    await sb("pruebas", {method: "POST", prefer: "return=minimal", body: {...p, expira: ahora, verificado_en: ahora,
      acepta_contacto: false, version_privacidad: corto(d.version, 20) || null}});
    await correo(p.correo, "Se usó tu acceso de demostración de PregonIA", `<div style="font:14px/1.5 Arial,sans-serif;color:#141414"><p style="margin:0 0 8px">Se abrió la demostración comercial con tu correo, sin código:</p>
      <p style="margin:0">${esc(ROLES[p.rol] || p.rol)} · ${esc(p.territorio)}<br>${new Date().toLocaleString("es-CL", {timeZone: "America/Santiago"})}</p>
      <p style="margin:10px 0 0;color:#555">Si no fuiste tú, avísanos a soporte@altkimia.cl para quitar este acceso.</p></div>`).catch(() => {});
    return json({ok: true, prueba: {nombre: p.nombre, correo: p.correo, rol: p.rol, territorio: p.territorio, hasta: "2099-12-31T23:59:59.000Z", ilimitada: true}});
  }
  const codigo = String(randomInt(0, 1000000)).padStart(6, "0"), sal = randomBytes(8).toString("hex");
  const [fila] = await sb("pruebas?select=id", {method: "POST", prefer: "return=representation", body: {...p,
    codigo_hash: sal + ":" + resumen(p.correo, codigo, sal), expira: new Date(Date.now() + VIGENCIA_MIN * 60000).toISOString(),
    acepta_contacto: d.contacto === true, version_privacidad: corto(d.version, 20) || null}});
  const ok = await correo(p.correo, `${codigo} es tu código de PregonIA`, cuerpoCodigo(p.nombre, codigo)).catch(e => (console.error("prueba correo", e.message), false));
  if (!ok) {
    await sb(`pruebas?id=eq.${fila.id}`, {method: "DELETE"}).catch(() => {});
    return json({error: "No pudimos enviar el código a ese correo. Revisa la dirección o escríbenos a soporte@altkimia.cl."}, 502);
  }
  return json({ok: true, id: fila.id, minutos: VIGENCIA_MIN});
}

/* Registro de ingresos de los correos de demostración: fecha, cargo, territorio y autoridad elegida en la entrada. */
async function ingreso(d){
  const correo = corto(d.correo, 160).toLowerCase();
  if (!sinLimite(correo)) return json({ok: true});  // solo se registran los correos de demostración comercial
  const rol = Object.keys(ROLES).includes(d.rol) ? d.rol : (d.rol === "alcalde" ? "municipio" : "");
  if (!rol) return json({error: "Cargo inválido"}, 400);
  await sb("pruebas_ingresos", {method: "POST", prefer: "return=minimal", body: {correo, rol,
    territorio: corto(d.territorio, 160) || null, autoridad: corto(d.autoridad, 160) || null, cuenta: corto(d.cuenta, 200) || null}});
  return json({ok: true});
}

async function verificar(d){
  const id = parseInt(d.id, 10), codigo = String(d.codigo ?? "").replace(/\D/g, "");
  if (!id || codigo.length !== 6) return json({error: "Escribe los 6 dígitos del código."}, 400);
  const [f] = await sb(`pruebas?id=eq.${id}&select=id,nombre,correo,rol,territorio,codigo_hash,expira,intentos,verificado_en,acepta_contacto`) || [];
  if (!f) return json({error: "No encontramos esa inscripción. Pide un código nuevo."}, 404);
  const demo = sinLimite(f.correo);
  let inicio = demo ? 0 : await primeraVerificacion(f.correo);
  const hasta = () => demo ? "2099-12-31T23:59:59.000Z" : new Date((inicio || Date.now()) + horas() * 36e5).toISOString();
  const prueba = () => ({nombre: f.nombre, correo: f.correo, rol: f.rol, territorio: f.territorio, hasta: hasta(), ...(demo ? {ilimitada: true} : {})});
  if (f.verificado_en) return json({ok: true, prueba: prueba()});
  if (f.intentos >= MAX_INTENTOS) return json({error: "Superaste los intentos. Pide un código nuevo."}, 429);
  if (new Date(f.expira).getTime() < Date.now()) return json({error: "El código venció. Pide uno nuevo."}, 410);
  const [sal, guardado] = String(f.codigo_hash).split(":"), calc = resumen(f.correo, codigo, sal);
  if (!guardado || !timingSafeEqual(Buffer.from(calc), Buffer.from(guardado))) {
    const quedan = MAX_INTENTOS - f.intentos - 1;
    await sb(`pruebas?id=eq.${id}`, {method: "PATCH", body: {intentos: f.intentos + 1}, prefer: "return=minimal"});
    return json({error: quedan > 0 ? `Código incorrecto. Te quedan ${quedan} ${quedan === 1 ? "intento" : "intentos"}.` : "Superaste los intentos. Pide un código nuevo."}, 400);
  }
  f.verificado_en = new Date().toISOString();
  if (!inicio) inicio = Date.parse(f.verificado_en);
  await sb(`pruebas?id=eq.${id}`, {method: "PATCH", body: {verificado_en: f.verificado_en, codigo_hash: null, intentos: f.intentos + 1}, prefer: "return=minimal"});
  const destino = process.env.CONTACTO_DESTINO || "soporte@altkimia.cl";
  if (!demo) await correo(destino, `Prueba gratis activada · ${f.nombre}`, `<div style="font:14px/1.5 Arial,sans-serif;color:#141414"><p style="font-weight:700;margin:0 0 10px">Nueva prueba gratis con correo verificado</p>
    <p style="margin:0">${esc(f.nombre)} · ${esc(f.correo)}<br>${esc(ROLES[f.rol] || f.rol)} · ${esc(f.territorio)}<br>Vigente hasta ${new Date(hasta()).toLocaleString("es-CL", {timeZone: "America/Santiago", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit"})}<br>${f.acepta_contacto ? "Acepta recibir información comercial." : "<b>No aceptó información comercial</b>: contáctalo solo por la prueba."}</p></div>`, {reply_to: f.correo}).catch(() => {});
  return json({ok: true, prueba: prueba()});
}

export async function pruebaPOST(req){
  const propio = new URL(req.url).origin, origen = req.headers.get("origin");
  if (origen && origen !== propio) return json({error: "Origen no permitido"}, 403);
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "anonimo";
  if (excedido(ip)) return json({error: "Recibimos varias solicitudes desde tu conexión. Intenta en unos minutos."}, 429);
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) return json({error: "La inscripción no está disponible. Escríbenos a soporte@altkimia.cl."}, 503);
  let d; try { d = await req.json(); } catch { return json({error: "Solicitud inválida"}, 400); }
  try {
    if (d?.accion === "solicitar") return await solicitar(d);
    if (d?.accion === "verificar") return await verificar(d);
    if (d?.accion === "ingreso") return await ingreso(d);
    return json({error: "Acción desconocida"}, 400);
  } catch (e) {
    console.error("prueba", e.message);
    return json({error: "No pudimos completar la inscripción. Intenta de nuevo o escríbenos a soporte@altkimia.cl."}, 500);
  }
}

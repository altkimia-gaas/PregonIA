// Parte diario por WhatsApp (8:00, hora de Chile), con la API oficial de WhatsApp Business (Cloud API de Meta).
// Lo envía la lectura programada de las 8:07: una vez al día por cuenta, a cada persona que dejó su celular en la campana de avisos
// y aceptó recibirlo (avisos.whatsapp y avisos.whatsapp_ok). Meta solo permite iniciar la conversación con una plantilla aprobada.
//
// Variables (Vercel, Production): WHATSAPP_TOKEN (token de un usuario del sistema del portafolio de ALTKIMIA con
// whatsapp_business_messaging), WHATSAPP_PHONE_ID (id del número emisor), WHATSAPP_PLANTILLA (por defecto «parte_diario»),
// WHATSAPP_IDIOMA (por defecto «es»), META_GRAPH_VERSION (por defecto v25.0). Sin token o sin número, no se envía nada.
//
// Plantilla a registrar en WhatsApp Manager (categoría Utilidad, español), con tres variables de una línea cada una
// (Meta no admite saltos de línea en las variables):
//   Parte de prensa de {{1}}, últimas 24 horas: {{2}}. Lo principal: {{3}}. Detalle, plazos y respuestas en PregonIA.
//   Botón de enlace: «Abrir PregonIA» → https://pregonia.cl/?sin-portada#inicio
import { CATALOGO } from "./_catalogo.js";

const MEDIO = new Map(CATALOGO.map(m => [m.id, m]));
const NIVEL = {nacional: 2, regional: 1};
export const whatsappListo = () => Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
const una = (s, n) => String(s || "").replace(/[\n\t]+/g, " ").replace(/ {2,}/g, " ").trim().slice(0, n);
const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;
export const horaChileWa = t => Number(new Intl.DateTimeFormat("es-CL", {timeZone: "America/Santiago", hour: "numeric", hourCycle: "h23"}).format(new Date(t)));
export const fechaChile = t => new Intl.DateTimeFormat("en-CA", {timeZone: "America/Santiago"}).format(new Date(t));  // AAAA-MM-DD

/* Celular chileno a formato internacional sin «+» (lo que pide la API): 9 1234 5678 → 56912345678. */
export function normalizarCelular(x){
  const d = String(x || "").replace(/\D/g, "");
  if (/^569\d{8}$/.test(d)) return d;
  if (/^9\d{8}$/.test(d)) return "56" + d;
  return null;
}

/* Contenido del parte: los hechos con notas en las últimas 24 horas, las críticas primero y luego los de más alcance. */
export async function armarParte(sb, muni, ahora = Date.now()){
  const desde = new Date(ahora - 864e5).toISOString();
  const filas = await sb(`menciones?municipio_id=eq.${muni.id}&rel=eq.true&select=grupo,tono,resumen,notas!inner(medio_id,publicado,titulo)&notas.publicado=gte.${desde}&limit=1000`) || [];
  const hechos = new Map();
  for (const f of filas) {
    const h = hechos.get(f.grupo) || {tonos: new Set(), medios: new Set(), nivel: 0, titulo: f.notas.titulo};
    const m = MEDIO.get(f.notas.medio_id); h.tonos.add(f.tono); h.medios.add(f.notas.medio_id); h.nivel = Math.max(h.nivel, NIVEL[m && m.ambito] || 0);
    hechos.set(f.grupo, h);
  }
  const xs = [...hechos.values()], cri = xs.filter(h => h.tonos.has("cri")), pos = xs.filter(h => h.tonos.has("pos") && !h.tonos.has("cri"));
  const orden = xs.slice().sort((a, b) => (b.tonos.has("cri") - a.tonos.has("cri")) || (b.nivel - a.nivel) || (b.medios.size - a.medios.size));
  const cifras = xs.length ? `${plural(xs.length, "noticia", "noticias")}, ${plural(cri.length, "crítica", "críticas")} y ${plural(pos.length, "positiva", "positivas")}` : "sin noticias nuevas";
  const principal = orden.slice(0, 2).map(h => `${h.tonos.has("cri") ? "[crítica] " : ""}${una(h.titulo, 110)} (${plural(h.medios.size, "medio", "medios")})`).join(" / ") || "nada que atender";
  return {total: xs.length, criticas: cri.length, cifras, principal};
}

async function enviar(tel, cuenta, parte){
  const v = process.env.META_GRAPH_VERSION || "v25.0";
  const r = await fetch(`https://graph.facebook.com/${v}/${process.env.WHATSAPP_PHONE_ID}/messages`, {method: "POST", signal: AbortSignal.timeout(10000),
    headers: {authorization: "Bearer " + process.env.WHATSAPP_TOKEN, "content-type": "application/json"},
    body: JSON.stringify({messaging_product: "whatsapp", to: tel, type: "template", template: {
      name: process.env.WHATSAPP_PLANTILLA || "parte_diario", language: {code: process.env.WHATSAPP_IDIOMA || "es"},
      components: [{type: "body", parameters: [una(cuenta, 60), una(parte.cifras, 120), una(parte.principal, 300)].map(text => ({type: "text", text}))}]}})});
  if (!r.ok) console.error("whatsapp", r.status, (await r.text()).slice(0, 200));
  return r.ok;
}

/* Una vez al día por cuenta: la fila de partes_whatsapp (cuenta + fecha) se toma antes de enviar, así dos lecturas cruzadas no duplican. */
export async function parteWhatsapp(sb, muni, ahora = Date.now()){
  if (!whatsappListo()) return {omitido: "sin configurar"};
  const dest = (await sb(`avisos?municipio_id=eq.${muni.id}&whatsapp=not.is.null&whatsapp_ok=eq.true&select=whatsapp`).catch(() => [])) || [];
  const tels = [...new Set(dest.map(d => normalizarCelular(d.whatsapp)).filter(Boolean))];
  if (!tels.length) return {omitido: "sin destinatarios"};
  const tomada = await sb("partes_whatsapp?on_conflict=municipio_id,fecha", {method: "POST", prefer: "resolution=ignore-duplicates,return=representation",
    body: {municipio_id: muni.id, fecha: fechaChile(ahora)}}).catch(() => null);
  if (!tomada || !tomada.length) return {omitido: "ya enviado hoy"};
  const parte = await armarParte(sb, muni, ahora), cuenta = muni.etiqueta || muni.comuna;
  let ok = 0; for (const t of tels) if (await enviar(t, cuenta, parte).catch(() => false)) ok++;
  await sb(`partes_whatsapp?municipio_id=eq.${muni.id}&fecha=eq.${fechaChile(ahora)}`, {method: "PATCH", prefer: "return=minimal", body: {enviados: ok, noticias: parte.total, criticas: parte.criticas}}).catch(() => {});
  return {enviados: ok, de: tels.length};
}

// Avisos del servidor: después de cada lectura programada, revisa los hechos que recibieron notas nuevas,
// aplica las mismas reglas que la aplicación (api/_reglas.js) y avisa a cada persona según sus preferencias:
// notificación al celular (Web Push, aunque PregonIA esté cerrada) y correo (Resend).
// Variables: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…) para notificaciones;
// RESEND_API_KEY y AVISOS_REMITENTE («PregonIA <avisos@tu-dominio>») para correo. Sin ellas, esa vía simplemente no se usa.
import { CATALOGO } from "./_catalogo.js";
import { alertasDeHecho, pasaPreferencia } from "./_reglas.js";

const MEDIO = new Map(CATALOGO.map(m => [m.id, m]));
const NIVEL = {nacional: 2, regional: 1};
const ETIQUETA = {urgente: "Urgente", importante: "Importante", info: "Buena noticia"};
const SITIO = () => process.env.SITIO_URL || "https://pregonia.vercel.app";
const lista = xs => "(" + xs.map(x => '"' + String(x).replace(/["\\]/g, "") + '"').join(",") + ")";
const esc = s => String(s || "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"})[c]);

export const pushListo = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
export const correoListo = () => Boolean(process.env.RESEND_API_KEY);

/* Lo ya avisado de cada hecho, reconstruido desde las claves guardadas (g:cri:N, g:pos:N, g:raf). */
function vistosDe(filas){
  const v = {};
  for (const f of filas) { const [, regla, n] = f.clave.slice(f.grupo.length).split(":"); const x = v[f.grupo] ||= {};
    if (regla === "raf") x.raf = true; else if (regla === "cri" || regla === "pos") x[regla] = Math.max(x[regla] ?? -1, Number(n)); }
  return v;
}

async function enviarPush(sb, subs, alerta, comuna){
  if (!pushListo() || !subs.length) return 0;
  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:avisos@pregonia.cl", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  const carga = JSON.stringify({titulo: `${ETIQUETA[alerta.nivel]} · ${alerta.titulo}`, cuerpo: `${alerta.titular}${alerta.medio ? " — " + alerta.medio : ""}`,
    url: `/?sin-portada&alerta=${encodeURIComponent(alerta.grupo)}#inicio`, tag: alerta.clave, urgente: alerta.nivel === "urgente", comuna});
  let ok = 0;
  await Promise.all(subs.map(async s => {
    try { await webpush.sendNotification({endpoint: s.endpoint, keys: {p256dh: s.p256dh, auth: s.auth}}, carga, {TTL: 6 * 3600, urgency: alerta.nivel === "urgente" ? "high" : "normal"}); ok++; }
    catch (e) { if (e && (e.statusCode === 404 || e.statusCode === 410)) await sb(`suscripciones?endpoint=eq.${encodeURIComponent(s.endpoint)}`, {method: "DELETE"}).catch(() => {}); }
  }));
  return ok;
}

async function enviarCorreo(destino, alertas, comuna){
  if (!correoListo() || !alertas.length) return false;
  const hay = alertas.some(a => a.nivel === "urgente"), asunto = `${hay ? "Urgente · " : ""}PregonIA ${comuna}: ${alertas.length === 1 ? alertas[0].titulo.toLowerCase() : alertas.length + " avisos de prensa"}`;
  const filas = alertas.map(a => `<tr><td style="padding:12px 0;border-bottom:1px solid #E5E7EB">
    <div style="font:600 11px/1.4 Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:${a.nivel === "urgente" ? "#B42318" : a.nivel === "info" ? "#00695E" : "#1565C0"}">${ETIQUETA[a.nivel]} · ${esc(a.titulo)}</div>
    <div style="font:600 16px/1.4 Arial,sans-serif;color:#111827;margin-top:4px">${a.url ? `<a href="${esc(a.url)}" style="color:#111827">${esc(a.titular)}</a>` : esc(a.titular)}</div>
    <div style="font:13px/1.4 Arial,sans-serif;color:#56627A;margin-top:2px">${esc(a.medio)}</div></td></tr>`).join("");
  const html = `<div style="max-width:560px;margin:0 auto;padding:20px;font-family:Arial,sans-serif">
    <div style="font:700 13px Arial,sans-serif;color:#1565C0">PregonIA · Municipalidad de ${esc(comuna)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:8px">${filas}</table>
    <p style="margin:18px 0 0"><a href="${SITIO()}/?sin-portada#inicio" style="display:inline-block;background:#1565C0;color:#fff;text-decoration:none;font:600 14px Arial,sans-serif;padding:10px 16px;border-radius:6px">Abrir PregonIA</a></p>
    <p style="font:12px/1.5 Arial,sans-serif;color:#8A94A6;margin-top:18px">Recibes este correo porque tienes activados los avisos por correo en PregonIA. Puedes cambiarlo en la campana de avisos.</p></div>`;
  const r = await fetch("https://api.resend.com/emails", {method: "POST", signal: AbortSignal.timeout(10000),
    headers: {authorization: "Bearer " + process.env.RESEND_API_KEY, "content-type": "application/json"},
    body: JSON.stringify({from: process.env.AVISOS_REMITENTE || "PregonIA <onboarding@resend.dev>", to: [destino], subject: asunto, html})});
  return r.ok;
}

/* Revisa los hechos tocados en esta lectura para un municipio y avisa lo nuevo. */
export async function avisar(sb, muni, grupos, ahora = Date.now()){
  const gs = [...new Set(grupos)].filter(Boolean).slice(0, 80);
  if (!gs.length) return {alertas: 0, push: 0, correos: 0};
  const desde = new Date(ahora - 3 * 864e5).toISOString();
  const [filas, previas] = await Promise.all([
    sb(`menciones?municipio_id=eq.${muni.id}&rel=eq.true&grupo=in.${encodeURIComponent(lista(gs))}&select=grupo,tono,notas!inner(medio_id,publicado,titulo,url)&notas.publicado=gte.${desde}&limit=2000`),
    sb(`alertas?municipio_id=eq.${muni.id}&grupo=in.${encodeURIComponent(lista(gs))}&select=grupo,clave&limit=2000`)]);
  const hechos = new Map();
  for (const f of filas || []) { const n = f.notas, m = MEDIO.get(n.medio_id); const h = hechos.get(f.grupo) || {g: f.grupo, tonos: [], notas: []};
    h.tonos.push(f.tono); h.notas.push({ts: Date.parse(n.publicado), nivel: NIVEL[m && m.ambito] || 0, medio: n.medio_id, medioNombre: m ? m.nombre : "", titulo: n.titulo, url: n.url}); hechos.set(f.grupo, h); }
  const vistos = vistosDe(previas || []), nuevas = [];
  for (const h of hechos.values()) nuevas.push(...alertasDeHecho(h, ahora, vistos[h.g]).alertas);
  if (!nuevas.length) return {alertas: 0, push: 0, correos: 0};
  // Se insertan con «ignorar duplicados»: si dos lecturas se cruzan, solo una avisa.
  const creadas = await sb("alertas?on_conflict=municipio_id,clave", {method: "POST", prefer: "resolution=ignore-duplicates,return=representation",
    body: nuevas.map(a => ({municipio_id: muni.id, clave: a.clave, grupo: a.g, tipo: a.tipo, nivel: a.nivel, titulo: a.titulo.slice(0, 160), titular: a.titular.slice(0, 300), medio: a.medio, url: a.url}))}) || [];
  if (!creadas.length || (!pushListo() && !correoListo())) return {alertas: creadas.length, push: 0, correos: 0};
  const [dest, subs] = await Promise.all([sb("rpc/destinatarios_avisos", {method: "POST", body: {muni: muni.id}}), pushListo() ? sb(`suscripciones?municipio_id=eq.${muni.id}&select=endpoint,p256dh,auth,usuario`) : []]);
  let push = 0, correos = 0;
  for (const d of dest || []) {
    const pref = {nivel: d.nivel, silencio: d.silencio}, suyas = creadas.filter(a => pasaPreferencia(a, pref, ahora));
    if (!suyas.length) continue;
    const susSubs = (subs || []).filter(s => s.usuario === d.usuario);
    for (const a of suyas) push += await enviarPush(sb, susSubs, a, muni.comuna);
    if (d.por_correo && d.correo && await enviarCorreo(d.correo, suyas, muni.comuna).catch(() => false)) correos++;
  }
  return {alertas: creadas.length, push, correos};
}

// Fase 2 · Publicación en la página de Facebook de El Pregonero por la API de Meta (Graph API).
// Solo responde al editor (sesión de Supabase inscrita en la tabla editores) y solo publica lo que ya está APROBADO en la base:
// el texto se lee de la base, no del navegador, así que la aprobación manual no se puede saltar.
// Programar usa la programación nativa de Facebook (published=false + scheduled_publish_time): Meta publica sola a la hora,
// aunque nadie tenga Redacción abierta. Las imágenes (feed o láminas del carrusel) las genera el navegador y llegan en JPEG.
// Variables: META_PAGE_ID (id de la página) y META_PAGE_TOKEN (token de la página, o de un usuario del sistema con
// pages_show_list, pages_read_engagement y pages_manage_posts: con él se obtiene el de la página). Opcional: META_GRAPH_VERSION.
// Instagram, historias y reels quedan para más adelante (se publican a mano desde Redacción).
import { sb, editor, json } from "./_servidor.js";

const VERSION = () => process.env.META_GRAPH_VERSION || "v25.0";
const listo = () => Boolean(process.env.META_PAGE_ID && process.env.META_PAGE_TOKEN && process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
const MIN_PROG = 11 * 6e4, MAX_PROG = 29 * 864e5;  // Facebook exige programar entre 10 minutos y unos 30 días hacia adelante
const MAX_IMG = 900_000;                           // caracteres en base64 por imagen (unos 650 KB de JPEG)

class ErrorMeta extends Error {}
function mensajeMeta(e){
  const c = e && e.code, m = String(e && e.message || "");
  if (c === 190) return "El token de Meta venció o fue revocado: hay que generar uno nuevo y cargarlo en Vercel.";
  if (c === 10 || c === 200 || /permission/i.test(m)) return "La app de Meta no tiene permiso para publicar en la página (pages_manage_posts) o el token no es de la página.";
  if (c === 4 || c === 17 || c === 32 || c === 613) return "Meta limitó las solicitudes por ahora. Intenta en unos minutos.";
  if (c === 100 && /schedul/i.test(m)) return "Facebook rechazó la hora: debe ser entre 10 minutos y 30 días desde ahora.";
  return "Meta respondió: " + m.slice(0, 160);
}
async function graph(ruta, {method = "GET", form, token} = {}){
  const url = `https://graph.facebook.com/${VERSION()}/${ruta}`;
  let r;
  if (method === "GET" || method === "DELETE") { const q = new URLSearchParams({...(form || {}), access_token: token}); r = await fetch(`${url}?${q}`, {method, signal: AbortSignal.timeout(20000)}); }
  else { const f = form instanceof FormData ? form : new URLSearchParams(form); f.append("access_token", token); r = await fetch(url, {method, body: f, signal: AbortSignal.timeout(45000)}); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new ErrorMeta(mensajeMeta(j.error || {message: "HTTP " + r.status}));
  return j;
}
/* Token de la página: si el de Vercel es de un usuario del sistema, se cambia por el de la página (se guarda por instancia). */
let tokenPagina = null;
async function token(){
  if (tokenPagina) return tokenPagina;
  const t = process.env.META_PAGE_TOKEN.trim(), id = process.env.META_PAGE_ID.trim();
  try { const j = await graph(id, {form: {fields: "access_token"}, token: t}); tokenPagina = j.access_token || t; }
  catch(e) { tokenPagina = t; }
  return tokenPagina;
}
async function pagina(){
  const j = await graph(process.env.META_PAGE_ID.trim(), {form: {fields: "name,username,link"}, token: await token()});
  return {nombre: j.name, usuario: j.username || null, enlace: j.link || null};
}

/* Sube las imágenes sin publicar (temporales, requisito de Meta para posts programados) y crea el post con todas. */
async function publicarEnFacebook(post, imagenes, programar){
  const t = await token(), id = process.env.META_PAGE_ID.trim(), ids = [];
  for (const b64 of imagenes) {
    const f = new FormData(); f.append("published", "false"); f.append("temporary", "true");
    f.append("source", new Blob([Buffer.from(b64, "base64")], {type: "image/jpeg"}), "pieza.jpg");
    const r = await graph(`${id}/photos`, {method: "POST", form: f, token: t}); ids.push(r.id);
  }
  // Resguardo: toda publicación lleva el enlace a la nota original, aunque se haya borrado al editar.
  let message = (post.contenido && post.contenido.fb) || post.titulo || "";
  const fs = ((post.contenido && (post.contenido.fuentes && post.contenido.fuentes.length ? post.contenido.fuentes : [post.contenido.fuente])) || []).filter(f => f && f.url);
  if (fs.length && !fs.some(f => message.includes(f.url))) message += `\n\nFuente: ${fs[0].medio || ""}\nNota original: ${fs[0].url}`;
  const form = {message};
  ids.forEach((m, i) => { form[`attached_media[${i}]`] = JSON.stringify({media_fbid: m}); });
  if (programar) Object.assign(form, {published: "false", scheduled_publish_time: String(Math.floor(programar / 1000)), unpublished_content_type: "SCHEDULED"});
  const r = await graph(`${id}/feed`, {method: "POST", form, token: t});
  let enlace = null; try { enlace = (await graph(r.id, {form: {fields: "permalink_url"}, token: t})).permalink_url || null; } catch(e) {}
  return {id: r.id, enlace};
}

async function manejar(req){
  if (req.method === "GET") {
    if (!listo()) return json({ok: true, facebook: false});
    try { return json({ok: true, facebook: true, pagina: await pagina()}); }
    catch(e) { return json({ok: true, facebook: false, error: e instanceof ErrorMeta ? e.message : "No se pudo consultar la página en Meta."}); }
  }
  if (req.method !== "POST") return json({error: "Método no permitido"}, 405);
  if (!listo()) return json({error: "Falta conectar la página de Facebook (META_PAGE_ID y META_PAGE_TOKEN en Vercel)."}, 503);
  const u = await editor(req); if (!u) return json({error: "Solo el editor de El Pregonero puede publicar."}, 403);
  let cuerpo; try { cuerpo = await req.json(); } catch { return json({error: "Solicitud inválida"}, 400); }
  const accion = cuerpo && cuerpo.accion, ahora = Date.now();

  try {
    // Publicaciones programadas en Facebook cuya hora ya pasó: se confirma con Meta y se marcan como publicadas.
    if (accion === "sincronizar") {
      const pend = await sb(`redaccion_posts?estado=eq.programado&meta->fb->>estado=eq.programado&programado=lte.${new Date(ahora).toISOString()}&select=id,meta,enlaces&limit=30`) || [];
      let n = 0;
      for (const p of pend) {
        try {
          const j = await graph(p.meta.fb.id, {form: {fields: "is_published,permalink_url"}, token: await token()});
          if (!j.is_published) continue;
          const meta = {...p.meta, fb: {...p.meta.fb, estado: "publicado", enlace: j.permalink_url || p.meta.fb.enlace}};
          await sb(`redaccion_posts?id=eq.${p.id}`, {method: "PATCH", prefer: "return=minimal", body: {estado: "publicado", publicado: new Date(ahora).toISOString(), meta, enlaces: {...(p.enlaces || {}), fb: meta.fb.enlace}, actualizado: new Date(ahora).toISOString()}});
          n++;
        } catch(e) { /* se reintenta en la próxima sincronización */ }
      }
      return json({ok: true, publicadas: n});
    }

    const id = String(cuerpo.post_id || ""); if (!/^[0-9a-f-]{36}$/i.test(id)) return json({error: "Falta la publicación"}, 400);
    const [post] = await sb(`redaccion_posts?id=eq.${id}&select=*`) || [];
    if (!post) return json({error: "La publicación no existe"}, 404);
    const fbPrev = post.meta && post.meta.fb;

    if (accion === "cancelar") {
      if (fbPrev && fbPrev.estado === "programado") { try { await graph(fbPrev.id, {method: "DELETE", token: await token()}); } catch(e) { if (!/does not exist|Unsupported delete/i.test(e.message)) throw e; } }
      const meta = {...(post.meta || {})}; delete meta.fb;
      await sb(`redaccion_posts?id=eq.${id}`, {method: "PATCH", prefer: "return=minimal", body: {meta, actualizado: new Date(ahora).toISOString()}});
      return json({ok: true, cancelada: Boolean(fbPrev)});
    }

    if (accion === "publicar" || accion === "programar") {
      // La aprobación manual es la regla: lo que no está aprobado en la base no sale, diga lo que diga el navegador.
      if (!["aprobado", "programado"].includes(post.estado) || !post.aprobado) return json({error: "Solo se publica lo aprobado. Aprueba la publicación primero."}, 409);
      if (fbPrev && fbPrev.estado === "publicado") return json({error: "Ya está publicada en Facebook."}, 409);
      if (fbPrev && fbPrev.estado === "programado") return json({error: "Ya está programada en Facebook. Quítala de la agenda antes de cambiarla."}, 409);
      const imgs = Array.isArray(cuerpo.imagenes) ? cuerpo.imagenes.slice(0, 10) : [];
      if (!imgs.length || imgs.some(x => typeof x !== "string" || x.length > MAX_IMG || !/^[A-Za-z0-9+/=]+$/.test(x))) return json({error: "Faltan las imágenes o son demasiado pesadas."}, 400);
      if (!((post.contenido || {}).fb || "").trim()) return json({error: "Falta el texto de Facebook."}, 400);
      let cuando = null;
      if (accion === "programar") {
        cuando = Date.parse(cuerpo.programado || post.programado);
        if (!Number.isFinite(cuando) || cuando - ahora < MIN_PROG || cuando - ahora > MAX_PROG) return json({error: "Facebook solo programa entre 11 minutos y 29 días desde ahora."}, 400);
      }
      const r = await publicarEnFacebook(post, imgs, cuando);
      const fb = {id: r.id, enlace: r.enlace, estado: cuando ? "programado" : "publicado", programado: cuando ? new Date(cuando).toISOString() : null, imagenes: imgs.length, subido: new Date(ahora).toISOString(), por: u.id};
      const cambio = cuando
        ? {estado: "programado", programado: fb.programado, recordado: true, meta: {...(post.meta || {}), fb}}
        : {estado: "publicado", publicado: new Date(ahora).toISOString(), programado: post.programado || new Date(ahora).toISOString(), meta: {...(post.meta || {}), fb}, enlaces: {...(post.enlaces || {}), fb: r.enlace}};
      await sb(`redaccion_posts?id=eq.${id}`, {method: "PATCH", prefer: "return=minimal", body: {...cambio, actualizado: new Date(ahora).toISOString()}});
      return json({ok: true, fb, estado: cambio.estado});
    }
    return json({error: "Acción no válida"}, 400);
  } catch(e) {
    return json({error: e instanceof ErrorMeta ? e.message : "No se pudo completar: " + String(e.message || e).slice(0, 160)}, 502);
  }
}
export const GET = manejar, POST = manejar;

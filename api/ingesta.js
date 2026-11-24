// Lectura programada (etapa 2): cada 30 minutos lee los medios, guarda las notas nuevas de cada cuenta cliente y las clasifica.
// Cuentas: municipios (lo que menciona la comuna) y autoridades (lo que nombra a la persona y lo que trata de la institución que integra
// en su territorio, juzgado respecto de ella; ver _sujetos.js).
// Solo se clasifica lo nuevo (lo ya visto no se vuelve a pagar) y las notas nuevas se agrupan con los hechos de días anteriores,
// para que el historial, las respuestas y las marcas queden en el mismo hecho aunque lleguen notas días después.
// La llama el programador de Supabase (pg_cron, cada 30 min) con un pase de un solo uso; a mano o desde GitHub Actions, con Authorization: Bearer CRON_SECRET.
// Un turno por región (?region=V, ?region=II; sin parámetro, la Región de Valparaíso): cada turno lee los medios nacionales y los de
// su región, y procesa solo las cuentas de su región. Así una región que falla o se demora no frena a la otra (src/regiones.js).
// Variables: SUPABASE_URL, SUPABASE_SECRET_KEY, CRON_SECRET, ANTHROPIC_API_KEY. Para avisos: ver api/_avisos.js.
// Cuentas de Facebook e Instagram de medios: META_ACCESS_TOKEN, META_IG_USER_ID, META_FB_PPCA (ver api/_redes.js).
// Después de guardar, revisa los hechos que recibieron notas nuevas y avisa lo urgente (notificación y correo).
// Además, propone a los editores de PregonIA las noticias de alto impacto de sus territorios (api/_redaccion.js).
import { tituloFinal, COMUNAS, VENTANA_DIAS, DIAG, norm, clasificar, fichaNota, json, leerCatalogo, leerGoogleNews, candidatasDe, candidatasPorNombre, plazoGoogleNews, statsGoogleNews } from "./_lectura.js";
import { variantesNombre, regionDeComuna, regionValida, REGIONES, REGION_DEFECTO } from "./_autoridades.js";
import { sujetoDeCuenta, fichaIA, institucion, leerSujeto, regionDeAut } from "./_sujetos.js";
import { avisar } from "./_avisos.js";
import { parteWhatsapp, whatsappListo, horaChileWa } from "./_whatsapp.js";
import { leerRedes, usuarioDe } from "./_redes.js";
import { detectarRedaccion } from "./_redaccion.js";
import { leerMercadoPublico, mercadoPublicoListo } from "./_oficiales.js";

/* Cuentas de Facebook e Instagram de la base: las del catálogo fijo y las inscritas desde la aplicación. */
const cuentaDe = r => ({id: r.id, nombre: r.nombre, ambito: r.ambito, comuna: r.comunas || "", red: r.metodo, usuario: r.usuario_red || usuarioDe(r.metodo, r.url_lectura)});

const TOPE_DIARIO_IA = 1500;  // clasificaciones por día (hora de Chile) y por región; pasado el tope, los turnos se saltan hasta el día siguiente
const UMBRAL_IA_CICLO = 80;  // clasificaciones por ciclo sobre las que se marca una alerta en lecturas.detalle
const MAX_POR_COMUNA = 50;  // tope de notas nuevas que se clasifican por cuenta en cada pasada; el resto entra en la siguiente

async function sb(ruta, {method = "GET", body, prefer} = {}){
  const url = process.env.SUPABASE_URL, clave = process.env.SUPABASE_SECRET_KEY;
  const headers = {apikey: clave, "content-type": "application/json", ...(prefer ? {prefer} : {})};
  if (!String(clave).startsWith("sb_")) headers.authorization = "Bearer " + clave; // claves antiguas (JWT de service_role)
  const r = await fetch(`${url}/rest/v1/${ruta}`, {method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000)});
  if (!r.ok) throw new Error(`Supabase ${method} ${ruta.split("?")[0]}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.status === 204 ? null : r.json().catch(() => null);
}

/* Cuentas activas: municipios de las comunas conocidas y autoridades con ficha válida.
   Cada una sabe qué buscar en Google News, cómo elegir sus candidatas y a quién le habla la IA. */
async function cuentasActivas(region){
  // Si la base aún no tiene las columnas de autoridades (esquema sin actualizar), se sigue leyendo solo municipios.
  const filas = await sb("municipios?activo=eq.true&select=id,comuna,nombre,tipo,autoridad,config").catch(() => sb("municipios?activo=eq.true&select=id,comuna,nombre"));
  return filas.map(f => {
    if ((f.tipo || "municipio") === "municipio") return COMUNAS[f.comuna] && regionDeComuna(f.comuna) === region ? {...f, etiqueta: f.comuna, institucion: "Municipalidad de " + f.comuna, ia: f.comuna,
      gn: () => leerGoogleNews(f.comuna), candidatas: (items, desde, ahora) => candidatasDe(f.comuna, items, desde, ahora)} : null;
    const a = sujetoDeCuenta(f); if (!a || regionDeAut(a).id !== region) return null;
    const ficha = fichaIA(a), nombre = f.nombre || `${ficha.cargo} ${a.n}`;
    return {...f, etiqueta: nombre, institucion: nombre, ia: ficha, autoridad: true,
      gn: () => leerSujeto(a), candidatas: (items, desde, ahora) => candidatasPorNombre(variantesNombre(a), items, desde, ahora, institucion(a))};
  }).filter(Boolean);
}

async function procesarCuenta(cta, items, desde, ahora){
  const {id: municipio_id} = cta, quien = cta.autoridad ? {autoridad: cta.etiqueta} : {comuna: cta.etiqueta};
  const candidatas = cta.candidatas(items, desde, ahora);
  if (!candidatas.length) return {...quien, candidatas: 0, nuevas: 0, clasificadas: 0};
  // Lo ya registrado de ESTAS candidatas (incluye lo descartado por ajeno, para no volver a clasificarlo). Se consulta por id y en tandas:
  // antes se traía toda la ventana de la cuenta y el servidor la cortaba en 1.000 filas, con lo que las notas más antiguas de una cuenta grande
  // parecían nuevas y se reclasificaban (y se pagaban) en cada ciclo.
  const ids = [...new Set(candidatas.map(c => c.id))], registradas = [];
  for (let k = 0; k < ids.length; k += 100) {
    const lista = ids.slice(k, k + 100).map(i => '"' + String(i).replace(/"/g, "") + '"').join(",");
    registradas.push(...await sb(`menciones?municipio_id=eq.${municipio_id}&nota_id=in.(${encodeURIComponent(lista)})&select=nota_id,ia&limit=1000`));
  }
  // Hechos recientes de la cuenta (solo los últimos, ordenados), para que lo nuevo se sume al hecho que corresponde.
  const desdeIso = new Date(desde - 2 * 864e5).toISOString();
  const previas = await sb(`menciones?municipio_id=eq.${municipio_id}&rel=eq.true&clasificado=gte.${desdeIso}&order=clasificado.desc&select=nota_id,grupo,rel,ia,notas(titulo,publicado)&limit=400`);
  // Lo que la IA no alcanzó a clasificar (ia = false) vuelve a la cola en esta pasada; lo demás no se vuelve a pagar.
  const vistas = new Set(registradas.filter(p => p.ia !== false).map(p => p.nota_id));
  const nuevas = candidatas.filter(c => !vistas.has(c.id)).slice(0, MAX_POR_COMUNA);
  if (!nuevas.length) return {...quien, candidatas: candidatas.length, nuevas: 0, clasificadas: 0};
  // Hechos recientes (un titular por grupo) para que lo nuevo se sume al hecho que corresponde.
  const porGrupo = new Map();
  previas.filter(p => p.rel && p.grupo && p.notas).sort((a, b) => Date.parse(b.notas.publicado) - Date.parse(a.notas.publicado))
    .forEach(p => { if (!porGrupo.has(p.grupo)) porGrupo.set(p.grupo, {grupo: p.grupo, titulo: p.notas.titulo}); });
  const existentes = [...porGrupo.values()].slice(0, 40);

  // Aprendizaje: las correcciones de la ficha que hizo el equipo de la cuenta entran como criterios para la IA.
  const ejemplos = Object.values((cta.config && cta.config.correcciones) || {}).filter(x => x && x.t && (x.a || x.e || x.p || x.im)).sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const clas = await clasificar(cta.ia, nuevas, existentes, ejemplos);
  // Las notas se guardan después de clasificar: si el medio no trajo titular, queda el que escribió la IA y no la dirección web.
  await sb("notas?on_conflict=id", {method: "POST", prefer: "resolution=ignore-duplicates,return=minimal",
    body: nuevas.map((n, i) => ({id: n.id, medio_id: n.m, url: n.url, titulo: tituloFinal(n, clas.porI.get(i)).slice(0, 400), publicado: new Date(n.ts).toISOString(), via: ["google_news", "instagram", "facebook"].includes(n.via) ? n.via : "lectura"}))});
  // Grupo estable: el de un hecho existente, o la nota más antigua de un hecho nuevo.
  const etiquetaDe = (n, c) => c && c.grupoExistente ? "e:" + c.grupoExistente : c && c.g ? "g:" + norm(c.g) : "n:" + n.id;
  const grupoPorEtiqueta = new Map();
  nuevas.map((n, i) => ({n, c: clas.porI.get(i)})).sort((a, b) => a.n.ts - b.n.ts).forEach(({n, c}) => {
    const e = etiquetaDe(n, c); if (!grupoPorEtiqueta.has(e)) grupoPorEtiqueta.set(e, c && c.grupoExistente ? c.grupoExistente : n.id);
  });
  const filas = nuevas.map((n, i) => {
    const c = clas.porI.get(i), ok = Boolean(c && c.tono);
    return {nota_id: n.id, municipio_id, rel: c && c.rel === false ? false : true, tono: ok && ["cri", "neu", "pos"].includes(c.tono) ? c.tono : "neu",
      resumen: c && c.res ? String(c.res).slice(0, 220) : n.titulo.slice(0, 220), palabras: c && c.x ? String(c.x).slice(0, 120) : "", grupo: grupoPorEtiqueta.get(etiquetaDe(n, c)), ia: ok, ficha: fichaNota(c), ...(cta.autoridad && n.sobre ? {sobre: n.sobre === "i" ? "institucion" : "persona"} : {})};
  });
  // Lo que la IA no alcanzó a clasificar se guarda igual (neutro, con el titular) y queda marcado con ia = false para revisarlo.
  const guardar = body => sb("menciones?on_conflict=nota_id,municipio_id", {method: "POST", prefer: "resolution=merge-duplicates,return=minimal", body});
  // Esquema sin las columnas nuevas (sobre, ficha): se guarda sin ellas.
  await guardar(filas).catch(e => { if (!/sobre|ficha/.test(String(e.message))) throw e; return guardar(filas.map(({sobre, ficha, ...f}) => f)); });
  return {...quien, candidatas: candidatas.length, nuevas: nuevas.length, clasificadas: filas.filter(f => f.ia).length, descartadas: filas.filter(f => !f.rel).length, grupos: filas.filter(f => f.rel).map(f => f.grupo)};
}

/* Pase del programador de Supabase: válido si existe, tiene menos de 2 minutos y no se usó (se borra al usarlo). */
async function usarPase(pase){
  const desde = new Date(Date.now() - 120000).toISOString();
  const r = await sb(`disparos_lectura?token=eq.${pase}&creado=gte.${desde}`, {method: "DELETE", prefer: "return=representation"});
  return Array.isArray(r) && r.length === 1;
}
async function manejar(req){
  // Sin espacios ni saltos de línea en los extremos: pegar en el campo de Vercel suele agregar uno al final.
  // Dos formas de autorizar: la clave CRON_SECRET (lectura manual o GitHub Actions) o un pase de un solo uso que genera
  // el programador de Supabase (pg_cron, cada 30 min) en la tabla disparos_lectura y que vence a los 2 minutos.
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) return json({error: "Falta configurar Supabase en el servidor"}, 503);
  const secreto = (process.env.CRON_SECRET || "").trim(), pase = (req.headers.get("x-disparo") || "").trim();
  const porClave = secreto && (req.headers.get("authorization") || "").trim() === "Bearer " + secreto;
  const porPase = !porClave && /^[a-f0-9]{48}$/.test(pase) && await usarPase(pase).catch(() => false);
  if (!porClave && !porPase) return json({error: "No autorizado"}, 401);
  const region = regionValida(new URL(req.url).searchParams.get("region") || REGION_DEFECTO);
  if (!region) return json({error: "Región desconocida"}, 400);
  // Madrugada (00:00-06:59 de Chile): solo el turno de la hora en punto, no el de la media; los disparos del programador se acortan a una lectura por hora.
  // Se decide aquí y no en el cron para que siga bien con el cambio de hora. La lectura a mano (clave) no se salta.
  const hChile = Number(new Intl.DateTimeFormat("es-CL", {timeZone: "America/Santiago", hour: "2-digit", hourCycle: "h23"}).format(new Date())), minChile = new Date().getMinutes();
  if (porPase && hChile < 7 && minChile >= 30) return json({ok: true, region, omitida: "madrugada: lectura cada hora"}, 200, {"cache-control": "no-store"});
  DIAG.length = 0; plazoGoogleNews(45000);  // Google News va en cola (responde 429 si se le pide mucho a la vez); el resto de los 300 s es para clasificar
  const ahora = Date.now(), desde = ahora - VENTANA_DIAS * 864e5;
  // La columna region de lecturas (supabase/esquema.sql) separa el estado de cada turno; si aún no existe, se registra sin ella.
  const [lectura] = await sb("lecturas", {method: "POST", prefer: "return=representation", body: {inicio: new Date(ahora).toISOString(), region}})
    .catch(e => { if (!/region/.test(String(e.message))) throw e; return sb("lecturas", {method: "POST", prefer: "return=representation", body: {inicio: new Date(ahora).toISOString()}}); });
  try {
    // Tope diario de IA: si la región ya clasificó el tope hoy (hora de Chile), el turno termina sin leer ni clasificar y queda marcado.
    // Las notas pendientes no se pierden: siguen en la ventana de 14 días y entran al día siguiente. La lectura a mano con ?sintope=1 lo salta.
    if (!new URL(req.url).searchParams.has("sintope")) {
      const inicioDia = new Date(ahora - (hChile * 60 + minChile) * 60000).toISOString();
      const hoy = await sb(`lecturas?region=eq.${region}&inicio=gte.${inicioDia}&select=clasificadas&limit=1000`).catch(() => []);
      const usadas = (hoy || []).reduce((t, x) => t + (x.clasificadas || 0), 0);
      if (usadas >= TOPE_DIARIO_IA) {
        const alerta = {tipo: "tope_diario_ia", mensajes: [`la región ${region} ya clasificó ${usadas} notas hoy (tope ${TOPE_DIARIO_IA}); turno omitido`]};
        console.error("ALERTA tope diario IA", region, usadas);
        await sb(`lecturas?id=eq.${lectura.id}`, {method: "PATCH", body: {fin: new Date().toISOString(), candidatas: 0, nuevas: 0, clasificadas: 0, detalle: {alerta}}, prefer: "return=minimal"});
        return json({ok: true, lectura: lectura.id, region, omitida: "tope diario de IA", usadas}, 200, {"cache-control": "no-store"});
      }
    }
    const munis = await cuentasActivas(region);
    // Región sin ninguna cuenta activa (cliente o autoridad): no hay a quién entregarle la lectura, así que no se gastan lecturas de medios ni IA.
    // Se reanuda sola cuando se activa la primera cuenta de la región, sin tocar el programador.
    if (!munis.length) {
      // La fila de este turno se borra: una lectura vacía como "la última" mostraría 0 fuentes en el estado de la región.
      await sb(`lecturas?id=eq.${lectura.id}`, {method: "DELETE", prefer: "return=minimal"}).catch(() => null);
      return json({ok: true, lectura: lectura.id, region, omitida: "sin cuentas activas en la región"}, 200, {"cache-control": "no-store"});
    }
    // Mercado Público: cada dos horas (la primera lectura de las horas pares), solo para las comunas cliente; ver _oficiales.js.
    const horaCl = Number(new Intl.DateTimeFormat("es-CL", {timeZone: "America/Santiago", hour: "2-digit", hourCycle: "h23"}).format(new Date(ahora)));
    const mpToca = mercadoPublicoListo() && (horaCl % 2 === 0 && new Date(ahora).getMinutes() < 30 || new URL(req.url).searchParams.has("mercado"));
    const mpComunas = [...new Set(munis.filter(m => !m.autoridad).map(m => m.comuna))];
    const mpLectura = mpToca ? leerMercadoPublico(mpComunas, ahora, 90000).catch(e => ({items: [], error: String(e.message || e).slice(0, 160)})) : Promise.resolve(null);
    const [cat0, enBase, filasRedes0, mp, ...gns] = await Promise.all([leerCatalogo(region), sb("medios?select=id"),
      sb("medios?metodo=in.(instagram,facebook)&estado=neq.retirado&select=id,nombre,ambito,comunas,metodo,url_lectura,usuario_red").catch(() => []), mpLectura,
      ...munis.map(m => m.gn().catch(() => null))]);
    // Cuentas de Facebook e Instagram de medios: las de las comunas de esta región (y las que no tienen comuna, en todos los turnos).
    const filasRedes = filasRedes0.filter(r => { const c = String(r.comunas || "").split(";")[0].trim(); return !c || (regionDeComuna(c) || region) === region; });
    const rs = await leerRedes(filasRedes.map(cuentaDe));
    // Estado de cada cuenta para la vista Fuentes: cuándo se leyó y, si falló, por qué. Un error aquí no detiene la lectura.
    await Promise.all(rs.estado.filter(e => !e.pendiente).map(e => sb(`medios?id=eq.${e.id}`, {method: "PATCH", prefer: "return=minimal",
      body: e.ok ? {ultima_lectura: new Date().toISOString(), error_lectura: null} : {error_lectura: e.error}}).catch(() => null)));
    // Solo medios que ya existen en la base (clave foránea de notas): un medio nuevo del catálogo espera a que se cargue la semilla.
    const ids = new Set(enBase.map(x => x.id)), cat = {...cat0, items: cat0.items.concat(mp ? mp.items : []).filter(x => ids.has(x.m.id)).concat(rs.items), total: cat0.total + rs.total + (mp ? 1 : 0)};
    const errores = cat.errores.concat(gns.some(g => !g) ? ["Google News"] : [], rs.errores, mp && mp.error ? ["Mercado Público"] : []);
    // Redacción (cuentas propias de PregonIA): usa lo ya leído (prensa, redes y Google News de las comunas cliente), en paralelo
    // con la clasificación de las cuentas y con su propio tope de tiempo, para que nunca demore ni rompa la lectura.
    const gnPorComuna = Object.fromEntries(munis.map((m, k) => [m.autoridad ? null : m.comuna, gns[k]]).filter(([c, g]) => c && g));
    const tope = new Promise(ok => setTimeout(() => ok({error: "tiempo agotado"}), 40000));
    const [res, redaccion] = await Promise.all([
      Promise.all(munis.map((m, k) => procesarCuenta(m, cat.items.concat((gns[k] || []).filter(x => ids.has(x.m.id))), desde, ahora).catch(e => ({[m.autoridad ? "autoridad" : "comuna"]: m.etiqueta, error: String(e.message || e).slice(0, 200)})))),
      // El Pregonero cubre la Región de Valparaíso: su detección corre solo en ese turno.
      region === "V" ? Promise.race([detectarRedaccion(sb, cat0.items.concat(rs.items), {gnPorComuna, ahora}), tope]).catch(e => ({error: String(e.message || e).slice(0, 200)})) : Promise.resolve({omitida: "fuera de la Región de Valparaíso"})]);
    // Avisos: un error aquí no debe perder la lectura ya guardada.
    await Promise.all(res.map(async (r, k) => { const grupos = r.grupos || []; delete r.grupos; if (!grupos.length) return;
      try { r.avisos = await avisar(sb, munis[k], grupos, Date.now()); } catch(e) { r.avisos = {error: String(e.message || e).slice(0, 160)}; } }));
    // Parte diario por WhatsApp: lo envía la primera lectura de las 8 (8:07); la tabla partes_whatsapp evita repetirlo en la de 8:37.
    if (whatsappListo() && horaChileWa(Date.now()) === 8) await Promise.all(res.map(async (r, k) => {
      try { r.whatsapp = await parteWhatsapp(sb, munis[k], Date.now()); } catch(e) { r.whatsapp = {error: String(e.message || e).slice(0, 160)}; } }));
    const suma = k => res.reduce((s, r) => s + (r[k] || 0), 0);
    const resumen = {fin: new Date().toISOString(), fuentes_ok: cat.total + 1 - errores.length, fuentes_total: cat.total + 1, errores: errores.slice(0, 60),
      candidatas: suma("candidatas"), nuevas: suma("nuevas"), clasificadas: suma("clasificadas"), detalle: {comunas: res, ia: DIAG.slice(0, 8), google_news: statsGoogleNews(), redaccion,
      oficiales: {contraloria: cat0.items.filter(x => x.m.id === 227).length, esval: cat0.items.filter(x => x.m.id === 229).length,
        mercado_publico: mp ? {licitaciones: mp.items.length, consultas: mp.consultas, organismos: mp.organismos, error: mp.error} : (mercadoPublicoListo() ? "fuera de turno" : "sin ticket")}}};
    // Alerta de consumo de IA: un ciclo normal clasifica unas pocas notas por cuenta. Si el ciclo supera el umbral, o una cuenta llega al tope por pasada,
    // queda marcado en detalle.alerta (consultable en lecturas) y en el registro de Vercel. Así una fuga como la del 21-23 nov se ve el mismo día.
    const alertas = [];
    if (resumen.clasificadas > UMBRAL_IA_CICLO) alertas.push(`ciclo con ${resumen.clasificadas} clasificaciones (umbral ${UMBRAL_IA_CICLO})`);
    res.filter(r => (r.nuevas || 0) >= MAX_POR_COMUNA).forEach(r => alertas.push(`${r.comuna || r.autoridad} llegó al tope de ${MAX_POR_COMUNA} notas nuevas`));
    if (alertas.length) { resumen.detalle.alerta = {tipo: "consumo_ia", mensajes: alertas}; console.error("ALERTA consumo IA", region, JSON.stringify(alertas)); }
    await sb(`lecturas?id=eq.${lectura.id}`, {method: "PATCH", body: resumen, prefer: "return=minimal"});
    return json({ok: true, lectura: lectura.id, region, ...resumen}, 200, {"cache-control": "no-store"});
  } catch(e) {
    await sb(`lecturas?id=eq.${lectura.id}`, {method: "PATCH", body: {fin: new Date().toISOString(), detalle: {error: String(e.message || e).slice(0, 300)}}, prefer: "return=minimal"}).catch(() => {});
    return json({ok: false, error: String(e.message || e).slice(0, 300)}, 500);
  }
}
export const GET = manejar, POST = manejar;

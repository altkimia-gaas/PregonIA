// Fuentes oficiales donde nacen las noticias municipales, antes de que la prensa las tome (función 15 «Avisar antes de la prensa»).
// No son medios: son documentos públicos que se leen directo de cada institución y entran a la misma cola que las notas,
// marcados como «documento oficial». La ficha (src/ficha.js) los sube a «Anticipar» mientras la prensa no los haya publicado.
//   227 Contraloría: informes de auditoría e investigaciones especiales de la Contraloría Regional de Valparaíso
//       (buscador público www.contraloria.cl/apibusca, el mismo que usa su sitio).
//   228 Mercado Público: licitaciones municipales declaradas desiertas, revocadas o suspendidas (API oficial de ChileCompra;
//       requiere MERCADOPUBLICO_TICKET, que se pide con Clave Única en api.mercadopublico.cl; sin ticket no se lee).
//   229 Esval: cortes de agua activos y avisos de emergencia de la sanitaria (API pública de su oficina virtual).
// Solo se leen datos públicos; no se guarda el texto completo de los documentos, solo un titular y una bajada propios.
import { CATALOGO } from "./_catalogo.js";
import { COMUNAS_V } from "./_autoridades.js";

const UA = "PregonIA/0.1 (monitoreo de prensa municipal; +https://pregonia.cl)";
const MED = id => CATALOGO.find(m => m.id === id);
const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const limpio = s => String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const corto = (s, n) => { s = limpio(s); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; };
/* «MUNICIPALIDAD DE CASABLANCA» → «Municipalidad de Casablanca». */
const MINUS = new Set(["de", "del", "la", "las", "los", "el", "y", "en", "para", "por", "a", "al"]);
const nombrePropio = s => limpio(s).toLowerCase().split(" ").map((w, i) => i && MINUS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
const COMUNA_POR_NORM = new Map(COMUNAS_V.map(c => [norm(c), c]));

async function pedir(url, {method = "GET", body, ms = 12000, headers = {}} = {}){
  const r = await fetch(url, {method, headers: {"user-agent": UA, accept: "application/json", ...(body ? {"content-type": "application/json"} : {}), ...headers},
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(ms)});
  if (!r.ok) throw new Error(`${new URL(url).hostname} ${r.status}`);
  return r.json();
}

/* ── Contraloría ────────────────────────────────────────────────────────────────────────────────────────────────
   Las dos primeras páginas (40 informes) de la Contraloría Regional de Valparaíso, del más reciente al más antiguo por fecha del
   documento: cubren unos dos meses. La fecha que cuenta es la de publicación en el portal (fecha_indexacion); el portal reindexa
   informes antiguos, por eso se descartan los documentos de más de 120 días. Medido el 23-nov-2026: el Informe Final 514/2026
   de la Municipalidad de Casablanca (documento del 29-sep) se publicó el 18-nov. */
const CGR_TIPOS = /informe final|investigaci[oó]n especial|seguimiento/i;
async function leerContraloria(ahora){
  const m = MED(227); if (!m) return [];
  const pagina = page => pedir("https://www.contraloria.cl/apibusca/search/auditoria", {method: "POST",
    body: {search: '"Regional Valparaíso"', options: [], order: "date", date_name: "fecha_documento", source: "auditoria", page}});
  const hits = (await Promise.all([0, 1].map(p => pagina(p).catch(() => null)))).flatMap(r => (r && r.hits && r.hits.hits) || []);
  if (!hits.length) throw new Error("Contraloría sin respuesta");
  const vistos = new Set();
  return hits.map(h => h._source || {}).filter(s => {
    if (!s.pdf || vistos.has(s.pdf)) return false; vistos.add(s.pdf);
    const doc = Date.parse(s.fecha_documento), pub = Date.parse(s.fecha_indexacion);
    return s.pdf && /valpara/i.test(s.unidad_cgr || "") && CGR_TIPOS.test(s.tipo || "") && Number.isFinite(pub) && Number.isFinite(doc) && ahora - doc < 120 * 864e5;
  }).map(s => {
    const servicio = nombrePropio(s.servicio_ || s.servicio_raw || ""), num = limpio(s["número"] || s.numero || "");
    const art = /^(municipalidad|corporaci|universidad|delegaci|direcci|secretar|superintendencia|subsecretar|gobernaci|empresa)/i.test(servicio) ? "la "
      : /^(servicio|hospital|departamento|tribunal|juzgado|instituto|ministerio|gobierno|consejo|cuerpo|fondo|centro|complejo|cesfam)/i.test(servicio) ? "el " : "";
    const tipo = /investigaci/i.test(s.tipo) ? "investigación especial" : /seguimiento/i.test(s.tipo) ? "informe de seguimiento" : "informe final de auditoría";
    return {m, via: "oficial", fecha: Math.min(Date.parse(s.fecha_indexacion), ahora),
      titulo: `Contraloría publicó ${tipo}${num ? " " + num : ""} sobre ${art}${servicio}`.slice(0, 300),
      desc: corto(`${s.objetivo ? "Objetivo: " + s.objetivo + ". " : ""}${s.conclusiones ? "Conclusiones: " + s.conclusiones : ""}`, 600),
      url: s.pdf};
  });
}

/* ── Esval ──────────────────────────────────────────────────────────────────────────────────────────────────────
   Cortes activos (programados y no programados) y la barra de emergencia del sitio. Solo Esval (empresa 1, Región de Valparaíso);
   Aguas del Valle (empresa 2) es Coquimbo. Esval informa por localidad: las que no son comuna se llevan a su comuna. */
const LOC_ESVAL = {"algarrobo norte": "Algarrobo", "brisas de mirasol": "Algarrobo", "mirasol": "Algarrobo", "artificio": "La Calera",
  "cachagua": "Zapallar", "la laguna": "Zapallar", "chepical": "Petorca", "chincolco": "Petorca", "curauma": "Valparaíso", "placilla": "Valparaíso",
  "el almendral": "San Felipe", "real curimon": "San Felipe", "curimon": "San Felipe", "isla negra": "El Quisco", "punta de tralca": "El Quisco",
  "las cruces": "El Tabo", "maitencillo": "Puchuncaví", "placilla ligua": "La Ligua", "punta puyai": "Papudo", "quintay": "Casablanca",
  "renaca": "Viña del Mar", "san isidro": "Quillota", "san pedro": "Quillota", "san sebastian": "Cartagena", "llay llay": "Llaillay", "llaillay": "Llaillay"};
const comunaEsval = loc => { const k = norm(loc).replace(/\s+/g, " ").trim(); return COMUNA_POR_NORM.get(k) || LOC_ESVAL[k] || null; };
const ESVAL_CORTES = "https://www.esval.cl/personas/cortes-estado-del-servicio/";
async function leerEsval(ahora){
  const m = MED(229); if (!m) return [];
  const [cortes, barra] = await Promise.all([
    pedir("https://ov.esval.cl/api-ov/api/EstadoDeServicio/CortesActivos"),
    pedir("https://ov.esval.cl/api-framework/api/public/v1/programacion-barra/obtener-activa/context/1/sitio/publico").catch(() => null)]);
  const out = ((cortes && cortes.data) || []).filter(c => Number(c.empresaId) === 1).map(c => {
    const comuna = comunaEsval(c.localidadNombre); if (!comuna) return null;
    const loc = nombrePropio(c.localidadNombre), lugar = norm(loc) === norm(comuna) ? comuna : `${loc} (${comuna})`;
    const tipo = /no programado/i.test(c.tipoCorte || "") ? "Corte de agua no programado" : "Corte de agua programado";
    const cuando = [c.fechaInicio, c.horaInicio && c.horaTermino ? `de ${c.horaInicio} a ${c.horaTermino}` : ""].filter(Boolean).join(" ")
      + (c.fechaFin && c.fechaFin !== c.fechaInicio ? ` hasta el ${c.fechaFin}` : "");
    return {m, via: "oficial", fecha: ahora,
      titulo: `Esval: ${tipo.toLowerCase()} en ${lugar}${cuando ? " el " + cuando : ""}`.slice(0, 300),
      desc: corto([c.motivoCorte && "Motivo: " + c.motivoCorte, c.sector && "Sectores: " + c.sector, c.callesAfectadas && "Calles: " + c.callesAfectadas].filter(Boolean).join(". "), 500),
      url: `${ESVAL_CORTES}#corte-${c._id || c.sisda}`};
  }).filter(Boolean);
  // Barra de emergencia: cuando Esval la activa (cortes masivos), trae un texto libre; entra si nombra una comuna.
  const b = barra && barra.data;
  if (b && typeof b === "object") {
    const texto = limpio(b.texto || b.mensaje || b.descripcion || b.titulo || "");
    if (texto) out.push({m, via: "oficial", fecha: ahora, titulo: `Esval: aviso de emergencia — ${corto(texto, 200)}`, desc: corto(texto, 500),
      url: `${ESVAL_CORTES}#aviso-${b._id || b.id || texto.length}`});
  }
  return out;
}

/* ── Mercado Público ────────────────────────────────────────────────────────────────────────────────────────────
   API oficial de ChileCompra (10.000 consultas al día por ticket; rechaza consultas simultáneas, por eso van en fila con pausa).
   Para cada comuna cliente: su municipalidad (código de organismo, desde BuscarComprador) y sus licitaciones de hoy y ayer;
   entran las desiertas (7), revocadas (18) y suspendidas (19). Además, las desiertas, revocadas y suspendidas del día en todo
   el país cuyo código (unidad de compra, antes del primer guion) ya se vio en esa municipalidad. */
const MP = {org: null, orgTs: 0, prefijos: new Map()};
const MP_ESTADOS = {7: "declarada desierta", 18: "revocada", 19: "suspendida"};
const ddmmaaaa = ts => { const p = new Intl.DateTimeFormat("es-CL", {timeZone: "America/Santiago", day: "2-digit", month: "2-digit", year: "numeric"}).formatToParts(new Date(ts));
  const v = t => p.find(x => x.type === t).value; return v("day") + v("month") + v("year"); };
const esperar = ms => new Promise(ok => setTimeout(ok, ms));
export const mercadoPublicoListo = () => Boolean((process.env.MERCADOPUBLICO_TICKET || "").trim());
export async function leerMercadoPublico(comunas, ahora = Date.now(), plazoMs = 60000){
  const tk = (process.env.MERCADOPUBLICO_TICKET || "").trim(), m = MED(228);
  if (!tk || !m || !comunas.length) return {items: [], consultas: 0};
  const fin = Date.now() + plazoMs; let consultas = 0;
  const api = async (ruta, q = {}) => {
    if (Date.now() > fin) throw new Error("Mercado Público: plazo agotado");
    for (let intento = 0; intento < 2; intento++) {
      consultas++;
      const j = await pedir(`https://api.mercadopublico.cl/servicios/v1/publico/${ruta}?${new URLSearchParams({...q, ticket: tk})}`, {ms: 15000});
      await esperar(350);
      if (j && j.Codigo && /simult/i.test(j.Mensaje || "")) { await esperar(1500); continue; }  // «peticiones simultáneas»: se reintenta una vez
      if (j && j.Codigo && j.Mensaje) throw new Error("Mercado Público: " + String(j.Mensaje).slice(0, 120));
      return j;
    }
    throw new Error("Mercado Público: peticiones simultáneas");
  };
  // Organismos municipales de la región (una vez al día por instancia).
  if (!MP.org || ahora - MP.orgTs > 864e5) {
    const j = await api("Empresas/BuscarComprador");
    const lista = (j && (j.listaEmpresas || j.ListaEmpresas)) || [];
    MP.org = new Map();
    lista.forEach(e => { const n = norm(e.NombreEmpresa || e.nombreEmpresa).replace(/[.]/g, "").replace(/\s+/g, " ").trim();
      const k = n.match(/^(?:i |ilustre )?municipalidad de (.+)$/); const c = k && COMUNA_POR_NORM.get(k[1].replace(/^la ciudad de /, ""));
      if (c && !MP.org.has(c)) MP.org.set(c, String(e.CodigoEmpresa || e.codigoEmpresa)); });
    MP.orgTs = ahora;
  }
  const items = [], vistos = new Set();
  const agregar = (l, comuna) => {
    const est = MP_ESTADOS[Number(l.CodigoEstado)]; if (!est || vistos.has(l.CodigoExterno)) return; vistos.add(l.CodigoExterno);
    items.push({m, via: "oficial", fecha: ahora,
      titulo: `Mercado Público: licitación ${est} de la Municipalidad de ${comuna} — «${corto(l.Nombre, 140)}»`.slice(0, 300),
      desc: `Licitación ${l.CodigoExterno} de la Municipalidad de ${comuna}, ${est} en Mercado Público.${l.FechaCierre ? " Cierre de ofertas: " + String(l.FechaCierre).slice(0, 10) + "." : ""}`,
      url: `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=${encodeURIComponent(l.CodigoExterno)}`});
  };
  const dias = [ddmmaaaa(ahora), ddmmaaaa(ahora - 864e5)];
  for (const comuna of comunas) {
    const org = MP.org.get(comuna); if (!org) continue;
    for (const fecha of dias) {
      const j = await api("licitaciones.json", {fecha, CodigoOrganismo: org}).catch(() => null);
      ((j && j.Listado) || []).forEach(l => { const p = String(l.CodigoExterno || "").split("-")[0]; if (p) MP.prefijos.set(p, comuna); agregar(l, comuna); });
    }
  }
  for (const estado of ["desierta", "revocada", "suspendida"]) {
    const j = await api("licitaciones.json", {estado}).catch(() => null);
    ((j && j.Listado) || []).forEach(l => { const c = MP.prefijos.get(String(l.CodigoExterno || "").split("-")[0]); if (c && comunas.includes(c)) agregar(l, c); });
  }
  return {items, consultas, organismos: [...MP.org.keys()].filter(c => comunas.includes(c)).length};
}

/* Contraloría y Esval: dos o tres consultas por pasada, en paralelo con la lectura de medios. */
export async function leerOficiales(ahora = Date.now()){
  const fuentes = [["Contraloría", leerContraloria], ["Esval", leerEsval]], errores = [], detalle = {};
  const items = (await Promise.all(fuentes.map(([n, f]) => f(ahora).catch(e => { errores.push(n); detalle[n] = String(e.message || e).slice(0, 160); return []; })))).flat();
  return {items, total: fuentes.length, errores, detalle};
}

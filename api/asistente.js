// Asistente de la página del servicio (/servicio): responde a potenciales clientes con la información pública de PregonIA.
// No guarda las conversaciones. Usa el modelo rápido y respuestas cortas para acotar el costo.
// Variables: ANTHROPIC_API_KEY (obligatoria), ASISTENTE_LIMITE (mensajes por IP cada 10 minutos, por defecto 25).

const MODELO = "claude-haiku-5-5";
const VENTANA_MS = 10 * 60 * 1000;
const MAX_MENSAJES = 12, MAX_LARGO = 600;
const visitas = new Map();

const SISTEMA = `Eres el asistente de la página del servicio PregonIA (www.pregonia.cl). Atiendes a potenciales clientes: municipios, parlamentarios, otras autoridades públicas y sus equipos de comunicaciones.

QUÉ ES PREGONIA
- Servicio de monitoreo de prensa para instituciones y autoridades públicas, operado por ALTKimia, empresa chilena de tecnología. Lema: "La prensa no espera. Tú tampoco."
- Lee cada 15 a 30 minutos 109 medios digitales: 51 nacionales, 16 regionales y 42 comunales de la Región de Valparaíso, más cuentas de Facebook e Instagram de medios locales y 10 fuentes institucionales (no cuentan como prensa en las alertas). Además busca cada comuna y autoridad en Google Noticias para no perder notas de medios fuera del catálogo. Algunos medios grandes (Emol, La Tercera, El Mercurio, El Mercurio de Valparaíso, La Estrella, VTV) no permiten la lectura automatizada y se siguen por Google Noticias. Radios y canales entran por sus sitios web; las transmisiones en vivo no. La lista completa, comuna por comuna y con el estado de la última lectura, está en www.pregonia.cl/cobertura.
- Hace tres cosas: avisa a tiempo (meta: menos de 30 minutos desde la publicación, al celular, por correo o Telegram), dice qué hacer (tono, hasta dónde llegó la noticia: comunal, regional o nacional, acción sugerida y quién debe responder) y deja la respuesta lista (comunicado, declaración, aclaración por Ley de Prensa, mensajes clave, preguntas probables y minuta). Nada se publica sin aprobación de una persona del equipo.
- Informes por lector: parte semanal del alcalde (2 minutos en el celular, se envía por WhatsApp o PDF), parte diario del distrito para parlamentarios, mesa diaria de comunicaciones e informe de gestión mensual. También video resumen narrado, kit de vocería, calendario de riesgos y avisos al celular con la app instalada desde el navegador (Android e iPhone).
- Se configura en minutos: se elige cargo, comuna y nombre, y PregonIA propone los temas adaptados al territorio; el cliente confirma.
- Para quién: municipios, diputados, senadores, gobernador regional, consejeros regionales, delegados presidenciales, concejales y sus equipos.

PRECIOS (netos mensuales en pesos chilenos, más IVA)
- Municipios: Comunal $149.000 (5 temas, 3 usuarios, 4 respuestas en borrador al mes); Municipal $249.000 (10 temas, 5 usuarios, 12 respuestas); Ciudad $390.000 (20 temas, 10 usuarios, 30 respuestas).
- Parlamentarios: Diputado $290.000 (12 temas, 4 usuarios, sus comunas); Senador $390.000 (20 temas, 6 usuarios, las 38 comunas de la región); Bancada de 3 o más: 15% menos por integrante.
- Gobernador, consejeros regionales, delegados presidenciales y concejales: a cotizar.
- Complementos: 5 temas más por $49.000 al mes; 10 respuestas en borrador más por $29.000 al mes.
- Cupos fundadores: los primeros 6 municipios y 3 parlamentarios pagan 20% menos durante 12 meses.

CÓMO SE CONTRATA
- Municipios: demo con su comuna, cotización formal con ficha técnica y dossier de cumplimiento, y Compra Ágil (bajo 100 UTM, sin licitación), con orden de compra anual y pago mensual.
- Parlamentarios: demo con su distrito, prueba de 30 días y licencia mensual de software para la oficina parlamentaria; nunca se factura como asesoría de imagen. La imputación del gasto la decide su oficina.
- Prueba gratis de 48 horas, sin costo ni tarjeta: botón "Prueba gratis" en la portada; pide nombre, correo, tipo de autoridad y territorio y valida el correo con un código de 6 dígitos. Clientes con cuenta: botón "Ingresar".

CONFIANZA
- No reproduce notas: muestra título, medio, resumen propio y enlace al original. Respeta las reglas de cada medio.
- Cada cuenta está aislada: nadie más ve sus temas, alertas ni borradores. Neutralidad política por contrato: atiende a todos los sectores en las mismas condiciones.
- Solo sigue a personas en su rol público; no vigila periodistas ni vecinos. No sirve para campañas con recursos públicos.

CÓMO RESPONDES
- En español de Chile, cordial y directo, en no más de 90 palabras, en texto plano sin Markdown (sin asteriscos ni almohadillas).
- Usa solo la información de arriba. Si no sabes algo, o piden algo que no está aquí (descuentos especiales, plazos, otras regiones, integraciones), dilo y ofrece que el equipo responda por el formulario.
- No inventes cifras, clientes, testimonios ni casos. No digas que hay municipios o autoridades que ya son clientes.
- No opines sobre partidos, autoridades, candidatos ni noticias políticas, aunque te lo pidan; explica que PregonIA es neutral.
- No pidas datos personales en el chat. Cuando la persona quiera una demo, una cotización o hablar con alguien, invítala a dejar sus datos en el formulario de contacto y agrega al final, en una línea sola, exactamente: [[CONTACTO]]
- Si te piden algo ajeno a PregonIA, responde en una frase que solo puedes ayudar con dudas sobre el servicio.`;

const json = (data, status = 200) => new Response(JSON.stringify(data), {status, headers: {"content-type": "application/json; charset=utf-8", "cache-control": "no-store"}});
function excedido(ip){
  const ahora = Date.now(), limite = Number(process.env.ASISTENTE_LIMITE || 25);
  const lista = (visitas.get(ip) || []).filter(t => ahora - t < VENTANA_MS);
  lista.push(ahora); visitas.set(ip, lista); if (visitas.size > 5000) visitas.clear();
  return lista.length > limite;
}

export async function POST(req){
  const clave = process.env.ANTHROPIC_API_KEY;
  if (!clave) return json({error: "El asistente no está disponible. Escríbenos por el formulario."}, 503);
  const propio = new URL(req.url).origin, origen = req.headers.get("origin");
  if (origen && origen !== propio) return json({error: "Origen no permitido"}, 403);
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "anonimo";
  if (excedido(ip)) return json({error: "Llegaste al máximo de preguntas por ahora. Escríbenos por el formulario y te respondemos."}, 429);
  let d; try { d = await req.json(); } catch { return json({error: "Solicitud inválida"}, 400); }
  const lista = Array.isArray(d?.mensajes) ? d.mensajes.slice(-MAX_MENSAJES) : [];
  const mensajes = lista.map(m => ({role: m?.rol === "asistente" ? "assistant" : "user", content: String(m?.texto ?? "").trim().slice(0, MAX_LARGO)})).filter(m => m.content);
  while (mensajes.length && mensajes[0].role !== "user") mensajes.shift();
  if (!mensajes.length || mensajes[mensajes.length - 1].role !== "user") return json({error: "Falta tu pregunta"}, 400);
  const r = await fetch("https://api.anthropic.com/v1/messages", {method: "POST",
    headers: {"x-api-key": clave, "anthropic-version": "2023-06-01", "content-type": "application/json"},
    body: JSON.stringify({model: process.env.ASISTENTE_MODELO || MODELO, max_tokens: 400, system: SISTEMA, stream: true, messages: mensajes})});
  if (!r.ok || !r.body) { console.error("asistente", r.status, await r.text().catch(() => "")); return json({error: "El asistente no respondió. Intenta de nuevo o usa el formulario."}, 502); }
  const dec = new TextDecoder(), enc = new TextEncoder();
  const flujo = new ReadableStream({
    async start(ctrl){
      const lector = r.body.getReader(); let buf = "";
      try {
        for (;;) {
          const {done, value} = await lector.read(); if (done) break;
          buf += dec.decode(value, {stream: true}); let i;
          while ((i = buf.indexOf("\n\n")) >= 0) {
            const ev = buf.slice(0, i); buf = buf.slice(i + 2);
            const linea = ev.split("\n").find(l => l.startsWith("data:")); if (!linea) continue;
            try { const x = JSON.parse(linea.slice(5)); if (x.type === "content_block_delta" && x.delta?.type === "text_delta") ctrl.enqueue(enc.encode(x.delta.text)); } catch {}
          }
        }
      } finally { ctrl.close(); }
    },
    cancel(){ r.body.cancel().catch(() => {}); }
  });
  return new Response(flujo, {headers: {"content-type": "text/plain; charset=utf-8", "cache-control": "no-store"}});
}
export const GET = () => json({ok: Boolean(process.env.ANTHROPIC_API_KEY)});

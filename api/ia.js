// Función de servidor para la IA de PregonIA en Vercel (Edge).
// La clave vive solo aquí, en la variable de entorno ANTHROPIC_API_KEY; nunca llega al navegador.
// Variables opcionales: ANTHROPIC_MODEL (fuerza un modelo), ALLOWED_ORIGINS (otros dominios permitidos, separados por coma),
// IA_LIMITE (peticiones por IP cada 10 minutos, por defecto 20).
export const config = { runtime: "edge" };

const MODELOS = { quick: "claude-haiku-5-5", default: "claude-sonnet-5-5" };
const VENTANA_MS = 10 * 60 * 1000;
const MAX_CARACTERES = 16000;
const MAX_TOKENS = 1200;
const TIPOS_IMG = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMG = 2_800_000; // caracteres en base64, unos 2 MB
const SISTEMA = "Eres el asistente de PregonIA, una plataforma que monitorea la prensa para municipios chilenos. " +
  "Solo ayudas con tareas de PregonIA: redactar comunicados y respuestas institucionales a partir de noticias, " +
  "escribir la lectura del analista de un informe y responder dudas sobre el uso del sistema. " +
  "Si te piden algo ajeno a eso, responde en una frase que solo puedes ayudar con PregonIA. " +
  "Escribe siempre en español de Chile y sigue las reglas que trae cada solicitud. " +
  "Responde en texto plano, sin formato Markdown: nada de asteriscos, almohadillas ni guiones de viñeta con formato; para títulos usa una línea propia en mayúsculas.";

const visitas = new Map(); // límite simple por IP; es por instancia, así que es un freno y no una garantía

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

function excedido(ip) {
  const ahora = Date.now(), limite = Number(process.env.IA_LIMITE || 20);
  const lista = (visitas.get(ip) || []).filter(t => ahora - t < VENTANA_MS);
  lista.push(ahora); visitas.set(ip, lista);
  if (visitas.size > 5000) visitas.clear();
  return lista.length > limite;
}

export default async function handler(req) {
  const clave = process.env.ANTHROPIC_API_KEY;
  if (req.method === "GET") return json({ ok: Boolean(clave) });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  if (!clave) return json({ error: "La IA no está configurada en este servidor" }, 503);

  const propio = new URL(req.url).origin;
  const permitidos = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  const origen = req.headers.get("origin");
  if (origen && origen !== propio && !permitidos.includes(origen)) return json({ error: "Origen no permitido" }, 403);

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "anonimo";
  if (excedido(ip)) return json({ error: "Demasiadas solicitudes. Intenta en unos minutos." }, 429);

  let cuerpo;
  try { cuerpo = await req.json(); } catch { return json({ error: "Solicitud inválida" }, 400); }
  const texto = typeof cuerpo?.prompt === "string" ? cuerpo.prompt.trim() : "";
  if (!texto) return json({ error: "Falta el texto de la solicitud" }, 400);
  if (texto.length > MAX_CARACTERES) return json({ error: "La solicitud es demasiado larga" }, 413);
  const modelo = process.env.ANTHROPIC_MODEL || (cuerpo.tier === "quick" ? MODELOS.quick : MODELOS.default);
  // Capturas de pantalla (captura asistida): hasta 2 imágenes livianas, ya achicadas en el navegador.
  const imagenes = Array.isArray(cuerpo.images) ? cuerpo.images.slice(0, 2) : [];
  if (imagenes.some(i => !i || !TIPOS_IMG.includes(i.type) || typeof i.data !== "string" || i.data.length > MAX_IMG)) return json({ error: "Imagen no válida o demasiado grande" }, 413);
  const contenido = imagenes.length ? [...imagenes.map(i => ({ type: "image", source: { type: "base64", media_type: i.type, data: i.data } })), { type: "text", text: texto }] : texto;

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": clave, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: modelo, max_tokens: MAX_TOKENS, system: SISTEMA, stream: true, messages: [{ role: "user", content: contenido }] })
  });
  if (!r.ok || !r.body) {
    console.error("Anthropic", r.status, await r.text().catch(() => ""));
    return json({ error: "El servicio de IA no respondió" }, r.status === 429 ? 429 : 502);
  }

  // Convierte el flujo de eventos de la API en texto plano que el navegador va mostrando.
  const dec = new TextDecoder(), enc = new TextEncoder();
  const flujo = new ReadableStream({
    async start(ctrl) {
      const lector = r.body.getReader(); let buf = "";
      try {
        for (;;) {
          const { done, value } = await lector.read(); if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf("\n\n")) >= 0) {
            const evento = buf.slice(0, i); buf = buf.slice(i + 2);
            const linea = evento.split("\n").find(l => l.startsWith("data:")); if (!linea) continue;
            try {
              const d = JSON.parse(linea.slice(5));
              if (d.type === "content_block_delta" && d.delta?.type === "text_delta") ctrl.enqueue(enc.encode(d.delta.text));
              if (d.type === "error") console.error("Anthropic stream", d.error);
            } catch { /* evento incompleto o sin JSON */ }
          }
        }
      } finally { ctrl.close(); }
    },
    cancel() { r.body.cancel().catch(() => {}); }
  });
  return new Response(flujo, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}

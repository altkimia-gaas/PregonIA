// Función de servidor para la voz del video resumen (Vercel Edge).
// Convierte un texto corto en audio MP3 con ElevenLabs. La clave vive solo aquí, en ELEVENLABS_API_KEY.
// Variables opcionales: ELEVENLABS_VOICE_ID (por defecto "Felipe", voz chilena), ELEVENLABS_MODEL,
// ALLOWED_ORIGINS (otros dominios permitidos, separados por coma), VOZ_LIMITE (peticiones por IP cada 10 minutos, por defecto 60).
export const config = { runtime: "edge" };

const VOZ_POR_DEFECTO = "M1BTnEdXPMEslfxGUtu1"; // Felipe · español de Chile, tono neutro para narración
const MODELO_POR_DEFECTO = "eleven_multilingual_v2";
const VENTANA_MS = 10 * 60 * 1000;
const MAX_CARACTERES = 700; // una escena; el video completo son 6 a 8 escenas

const visitas = new Map();
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
function excedido(ip) {
  const ahora = Date.now(), limite = Number(process.env.VOZ_LIMITE || 60);
  const lista = (visitas.get(ip) || []).filter(t => ahora - t < VENTANA_MS);
  lista.push(ahora); visitas.set(ip, lista);
  if (visitas.size > 5000) visitas.clear();
  return lista.length > limite;
}

export default async function handler(req) {
  const clave = process.env.ELEVENLABS_API_KEY;
  if (req.method === "GET") return json({ ok: Boolean(clave) });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  if (!clave) return json({ error: "La voz no está configurada en este servidor" }, 503);

  const propio = new URL(req.url).origin;
  const permitidos = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  const origen = req.headers.get("origin");
  if (origen && origen !== propio && !permitidos.includes(origen)) return json({ error: "Origen no permitido" }, 403);

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "anonimo";
  if (excedido(ip)) return json({ error: "Demasiadas solicitudes. Intenta en unos minutos." }, 429);

  let cuerpo;
  try { cuerpo = await req.json(); } catch { return json({ error: "Solicitud inválida" }, 400); }
  const texto = typeof cuerpo?.texto === "string" ? cuerpo.texto.replace(/\s+/g, " ").trim() : "";
  if (!texto) return json({ error: "Falta el texto" }, 400);
  if (texto.length > MAX_CARACTERES) return json({ error: "El texto es demasiado largo" }, 413);

  const voz = (process.env.ELEVENLABS_VOICE_ID || VOZ_POR_DEFECTO).trim();
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voz)}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": clave, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({
      text: texto,
      model_id: process.env.ELEVENLABS_MODEL || MODELO_POR_DEFECTO,
      voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.1, use_speaker_boost: true, speed: Number(process.env.ELEVENLABS_SPEED || 1.06) }
    })
  });
  if (!r.ok || !r.body) {
    const detalle = await r.text().catch(() => "");
    console.error("ElevenLabs", r.status, detalle.slice(0, 400));
    const msg = r.status === 401 ? "La clave de ElevenLabs no es válida o no tiene permiso de texto a voz"
      : r.status === 429 ? "ElevenLabs está ocupado o se agotó el saldo del plan"
      : /quota|credits/i.test(detalle) ? "Se agotaron los caracteres del plan de ElevenLabs"
      : "El servicio de voz no respondió";
    return json({ error: msg }, r.status === 429 ? 429 : 502);
  }
  return new Response(r.body, { headers: { "content-type": "audio/mpeg", "cache-control": "no-store" } });
}

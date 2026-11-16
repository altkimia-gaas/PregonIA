// Autoridades como sujeto de lectura: la consulta a Google News y la ficha de la persona.
// Lo comparten las noticias al vuelo (/api/noticias, etapa 1) y la lectura programada del piloto (/api/ingesta, etapa 2),
// para que una autoridad se lea igual en la demostración con noticias reales y en su cuenta del piloto.
import { AUTORIDADES, CARGOS, cargoDe, zonaDe, variantesNombre } from "./_autoridades.js";

/* La consulta va por nombre y cargo, con palabras de contexto que descartan homónimos lejanos. */
export const CONTEXTO_ROL = {
  diputado: '(diputado OR diputada OR Cámara OR Congreso OR Valparaíso OR Chile)',
  senador: '(senador OR senadora OR Senado OR Congreso OR Valparaíso OR Chile)',
  core: '(consejero OR consejera OR core OR "gobierno regional" OR Valparaíso)',
  concejal: '(concejal OR concejala OR concejo OR municipalidad OR comuna)',
  alcalde: '(alcalde OR alcaldesa OR municipalidad OR municipio OR comuna)',
  gobernador: '(gobernador OR gobernadora OR "gobierno regional" OR Valparaíso)',
  delegado: '(delegado OR delegada OR "delegación presidencial" OR Valparaíso OR provincia)'
};
export const limpio = (s, n = 80) => String(s || "").replace(/[\u0000-\u001f"<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
export const consulta = a => { const z = zonaDe(a.rol, a.zona); return `(${variantesNombre(a).map(v => `"${v}"`).join(" OR ")}) ${a.rol === "concejal" || a.rol === "alcalde" ? `("${z.n}" OR ${CONTEXTO_ROL[a.rol]})` : CONTEXTO_ROL[a.rol]}`; };

/* Persona a partir de un id de la nómina, o de cargo, zona y nombre. Devuelve null si los datos no alcanzan para leer bien. */
export function sujeto({id, rol, zona, nombre, g, partido} = {}){
  if (id) { const a = AUTORIDADES.find(x => x.id === id); if (a) return {...a, nomina: true}; }
  const n = limpio(nombre);
  if (!CARGOS[rol] || rol === "municipio" || !zonaDe(rol, zona) || n.split(" ").length < 2) return null;
  return {id: null, rol, zona, n, c: n, p: limpio(partido, 60), g: g === "F" ? "F" : "M", nomina: false};
}
/* Cuenta de autoridad del piloto (fila de la tabla municipios con tipo distinto de municipio). */
export const sujetoDeCuenta = fila => fila && fila.tipo && fila.tipo !== "municipio" && fila.autoridad
  ? sujeto({...fila.autoridad, rol: fila.tipo}) : null;
/* Lo que necesita la IA para juzgar relevancia y tono respecto de la persona. */
export const fichaIA = a => ({nombre: a.n, cargo: cargoDe(a.rol, a.g), zona: zonaDe(a.rol, a.zona).n});

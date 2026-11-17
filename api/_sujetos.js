// Autoridades como sujeto de lectura: la consulta a Google News y la ficha de la persona.
// Lo comparten las noticias al vuelo (/api/noticias, etapa 1) y la lectura programada del piloto (/api/ingesta, etapa 2),
// para que una autoridad se lea igual en la demostración con noticias reales y en su cuenta del piloto.
// Las mismas reglas para todos los cargos: un alcalde se sigue por su comuna y su municipio; cualquier autoridad, por su nombre
// y por la institución que integra en su territorio (ver institucion()).
import { AUTORIDADES, CARGOS, cargoDe, zonaDe, variantesNombre } from "./_autoridades.js";
import { COMUNAS, norm, leerGoogleNewsConsulta } from "./_lectura.js";

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
const ors = xs => xs.map(x => `"${x}"`).join(" OR ");
/* Territorio que acompaña al nombre en la consulta, como la comuna del alcalde: comuna, provincia o circunscripción provincial. */
const territorioCorto = a => { const z = zonaDe(a.rol, a.zona); if (!z) return "";
  if (a.rol === "alcalde" || a.rol === "concejal") return z.n;
  if (a.rol === "delegado" && a.zona !== "REG") return z.n.replace(/^Provincia de /, "").replace(/ de Aconcagua$/, "");
  if (a.rol === "core" && !/^V\d/.test(z.id)) return z.n.replace(/ de Aconcagua$/, "");
  return ""; };
export const consulta = a => { const t = territorioCorto(a); return `(${ors(variantesNombre(a))}) ${t ? `("${t}" OR ${CONTEXTO_ROL[a.rol]})` : CONTEXTO_ROL[a.rol]}`; };
/* Solo los nombres: se usa si Google News rechaza la consulta completa. */
const consultaSimple = a => `(${ors(variantesNombre(a))})`;

/* La institución que la autoridad integra en su territorio, como el municipio para un alcalde:
   q es la consulta a Google News; organo y territorio, los términos que debe traer una nota del catálogo para contar;
   desc, cómo se le nombra a la IA. */
const REGION = ["region de valparaiso", "valparaiso"];
const formas = cs => cs.flatMap(c => COMUNAS[c] || [norm(c)]);
export function institucion(a){
  const z = zonaDe(a.rol, a.zona); if (!z) return null;
  const cs = z.comunas;
  switch (a.rol) {
    case "alcalde": return {q: `(${ors(["Municipalidad de " + z.n, "municipio de " + z.n, "alcalde de " + z.n, "alcaldesa de " + z.n])})`,
      organo: ["municipalidad", "municipio", "alcalde", "alcaldesa"], territorio: formas(cs), desc: "la Municipalidad de " + z.n};
    case "concejal": return {q: `(${ors(["concejo municipal de " + z.n, "concejales de " + z.n, "concejal de " + z.n, "concejala de " + z.n])})`,
      organo: ["concejo municipal", "concejal", "concejala", "concejales", "concejalas"], territorio: formas(cs), desc: "el Concejo Municipal de " + z.n};
    case "core": return {q: `("consejo regional" OR "consejeros regionales" OR "consejero regional" OR "consejera regional" OR "core") (${ors(cs.concat("Región de Valparaíso"))})`,
      organo: ["consejo regional", "consejeros regionales", "consejeras regionales", "consejero regional", "consejera regional"], territorio: formas(cs).concat(REGION),
      desc: "el Consejo Regional de Valparaíso o los consejeros de " + z.n};
    case "gobernador": return {q: `("gobierno regional" OR "gobernador regional" OR "gobernadora regional") ("Valparaíso")`,
      organo: ["gobierno regional", "gobernador regional", "gobernadora regional", "gore"], territorio: REGION, desc: "el Gobierno Regional de Valparaíso"};
    case "delegado": {
      const organo = ["delegacion presidencial", "delegado presidencial", "delegada presidencial"];
      if (a.zona === "REG") return {q: `("delegación presidencial" OR "delegado presidencial" OR "delegada presidencial") ("Región de Valparaíso" OR "Valparaíso")`,
        organo, territorio: REGION, desc: "la Delegación Presidencial Regional de Valparaíso"};
      const pv = z.n.replace(/^Provincia de /, "");
      return {q: `("delegación presidencial" OR "delegado presidencial" OR "delegada presidencial" OR "delegación provincial") (${ors([...new Set([pv.replace(/ de Aconcagua$/, "")].concat(cs))])})`,
        organo: organo.concat("delegacion provincial"), territorio: formas(cs).concat(norm(pv), norm(pv.replace(/ de Aconcagua$/, ""))), desc: "la Delegación Presidencial de la " + z.n};
    }
    case "diputado": return {q: `("${z.n}") (diputado OR diputada OR diputados OR diputadas)`,
      organo: ["diputado", "diputada", "diputados", "diputadas"], territorio: [norm(z.n)], desc: "los diputados del " + z.n + " de la Región de Valparaíso"};
    case "senador": return {q: `("senador por Valparaíso" OR "senadora por Valparaíso" OR "senadores por Valparaíso" OR "senadores de la Región de Valparaíso" OR "circunscripción 6")`,
      organo: ["senador", "senadora", "senadores", "senadoras"], territorio: ["por valparaiso", "region de valparaiso", "circunscripcion 6"], desc: "los senadores por la Región de Valparaíso"};
    default: return null;
  }
}

/* Google News de una autoridad: lo que la nombra (q "nombre") y lo que trata de su institución (q "inst").
   Si la consulta por nombre falla, se reintenta solo con los nombres. Falla únicamente si no se pudo leer nada. */
export async function leerSujeto(a, dias){
  const inst = institucion(a), marca = q => its => its.map(x => ({...x, q}));
  const [rn, ri] = await Promise.allSettled([
    leerGoogleNewsConsulta(consulta(a), dias).catch(() => leerGoogleNewsConsulta(consultaSimple(a), dias)).then(marca("nombre")),
    inst ? leerGoogleNewsConsulta(inst.q, dias).then(marca("inst")) : Promise.resolve([])]);
  if (rn.status === "rejected" && ri.status === "rejected") throw rn.reason;
  return (rn.value || []).concat(ri.value || []);
}

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
/* Lo que necesita la IA para juzgar relevancia y tono respecto de la persona y de su institución. */
export const fichaIA = a => ({nombre: a.n, cargo: cargoDe(a.rol, a.g), zona: zonaDe(a.rol, a.zona).n, institucion: (institucion(a) || {}).desc || ""});

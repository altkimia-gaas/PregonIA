// Autoridades como sujeto de lectura: la consulta a Google News y la ficha de la persona.
// Lo comparten las noticias al vuelo (/api/noticias, etapa 1) y la lectura programada del piloto (/api/ingesta, etapa 2),
// para que una autoridad se lea igual en la demostración con noticias reales y en su cuenta del piloto.
// Las mismas reglas para todos los cargos: un alcalde se sigue por su comuna y su municipio; cualquier autoridad, por su nombre
// y por la institución que integra en su territorio (ver institucion()).
import { AUTORIDADES, CARGOS, REGIONES, REGION_DEFECTO, regionDeComuna, cargoDe, zonaDe, variantesNombre } from "./_autoridades.js";
import { COMUNAS, norm, leerGoogleNewsConsulta } from "./_lectura.js";

/* Región de una autoridad: la de las comunas de su zona (src/regiones.js). */
export const regionDeAut = a => { const z = zonaDe(a.rol, a.zona); return REGIONES[(z && regionDeComuna(z.comunas[0])) || REGION_DEFECTO]; };
const esRegional = id => /(^|-)REG$/.test(id || "");
/* La consulta va por nombre y cargo, con palabras de contexto que descartan homónimos lejanos (el nombre corto de su región). */
const contextoRol = (rol, r) => ({
  diputado: `(diputado OR diputada OR Cámara OR Congreso OR ${r.corto} OR Chile)`,
  senador: `(senador OR senadora OR Senado OR Congreso OR ${r.corto} OR Chile)`,
  core: `(consejero OR consejera OR core OR "gobierno regional" OR ${r.corto})`,
  concejal: '(concejal OR concejala OR concejo OR municipalidad OR comuna)',
  alcalde: '(alcalde OR alcaldesa OR municipalidad OR municipio OR comuna)',
  gobernador: `(gobernador OR gobernadora OR "gobierno regional" OR ${r.corto})`,
  delegado: `(delegado OR delegada OR "delegación presidencial" OR ${r.corto} OR provincia)`
})[rol];
export const CONTEXTO_ROL = Object.fromEntries(Object.keys(CARGOS).map(rol => [rol, contextoRol(rol, REGIONES[REGION_DEFECTO])]));
export const limpio = (s, n = 80) => String(s || "").replace(/[\u0000-\u001f"<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const ors = xs => xs.map(x => `"${x}"`).join(" OR ");
/* Territorio que acompaña al nombre en la consulta, como la comuna del alcalde: comuna, provincia o circunscripción provincial. */
const territorioCorto = a => { const z = zonaDe(a.rol, a.zona); if (!z) return "";
  if (a.rol === "alcalde" || a.rol === "concejal") return z.n;
  if (a.rol === "delegado" && !esRegional(a.zona)) return z.n.replace(/^Provincia de /, "").replace(/ de Aconcagua$/, "");
  if (a.rol === "core" && !/^V\d/.test(z.id)) return z.n.replace(/ de Aconcagua$/, "");
  return ""; };
export const consulta = a => { const t = territorioCorto(a), ctx = contextoRol(a.rol, regionDeAut(a)); return `(${ors(variantesNombre(a))}) ${t ? `("${t}" OR ${ctx})` : ctx}`; };
/* Solo los nombres: se usa si Google News rechaza la consulta completa. */
const consultaSimple = a => `(${ors(variantesNombre(a))})`;

/* La institución que la autoridad integra en su territorio, como el municipio para un alcalde:
   q es la consulta a Google News; organo y territorio, los términos que debe traer una nota del catálogo para contar;
   desc, cómo se le nombra a la IA. */
const formas = cs => cs.flatMap(c => COMUNAS[c] || [norm(c)]);
export function institucion(a){
  const z = zonaDe(a.rol, a.zona); if (!z) return null;
  const cs = z.comunas, r = regionDeAut(a), REGION = [norm(r.nombre), norm(r.corto)];
  switch (a.rol) {
    case "alcalde": return {q: `(${ors(["Municipalidad de " + z.n, "municipio de " + z.n, "alcalde de " + z.n, "alcaldesa de " + z.n])})`,
      organo: ["municipalidad", "municipio", "alcalde", "alcaldesa"], territorio: formas(cs), desc: "la Municipalidad de " + z.n};
    case "concejal": return {q: `(${ors(["concejo municipal de " + z.n, "concejales de " + z.n, "concejal de " + z.n, "concejala de " + z.n])})`,
      organo: ["concejo municipal", "concejal", "concejala", "concejales", "concejalas"], territorio: formas(cs), desc: "el Concejo Municipal de " + z.n};
    case "core": return {q: `("consejo regional" OR "consejeros regionales" OR "consejero regional" OR "consejera regional" OR "core") (${ors(cs.concat(r.nombre))})`,
      organo: ["consejo regional", "consejeros regionales", "consejeras regionales", "consejero regional", "consejera regional"], territorio: formas(cs).concat(REGION),
      desc: `el Consejo Regional de ${r.corto} o los consejeros de ${z.n}`};
    case "gobernador": return {q: `("gobierno regional" OR "gobernador regional" OR "gobernadora regional") ("${r.corto}")`,
      organo: ["gobierno regional", "gobernador regional", "gobernadora regional", "gore"], territorio: REGION, desc: "el Gobierno Regional de " + r.corto};
    case "delegado": {
      const organo = ["delegacion presidencial", "delegado presidencial", "delegada presidencial"];
      if (esRegional(a.zona)) return {q: `("delegación presidencial" OR "delegado presidencial" OR "delegada presidencial") ("${r.nombre}" OR "${r.corto}")`,
        organo, territorio: REGION, desc: "la Delegación Presidencial Regional de " + r.corto};
      const pv = z.n.replace(/^Provincia de /, "");
      return {q: `("delegación presidencial" OR "delegado presidencial" OR "delegada presidencial" OR "delegación provincial") (${ors([...new Set([pv.replace(/ de Aconcagua$/, "")].concat(cs))])})`,
        organo: organo.concat("delegacion provincial"), territorio: formas(cs).concat(norm(pv), norm(pv.replace(/ de Aconcagua$/, ""))), desc: "la Delegación Presidencial de la " + z.n};
    }
    case "diputado": return {q: `("${z.n}") (diputado OR diputada OR diputados OR diputadas)`,
      organo: ["diputado", "diputada", "diputados", "diputadas"], territorio: [norm(z.n)], desc: "los diputados del " + z.n + " de la " + r.nombre};
    case "senador": { const sp = r.senado.por, c = r.senado.circ;
      return {q: `("senador por ${sp}" OR "senadora por ${sp}" OR "senadores por ${sp}" OR "senadores de la ${r.nombre}" OR "circunscripción ${c}")`,
        organo: ["senador", "senadora", "senadores", "senadoras"], territorio: ["por " + norm(sp), norm(r.nombre), "circunscripcion " + c], desc: "los senadores por la " + r.nombre}; }
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
export const fichaIA = a => ({nombre: a.n, cargo: cargoDe(a.rol, a.g), zona: zonaDe(a.rol, a.zona).n, region: regionDeAut(a).nombre, institucion: (institucion(a) || {}).desc || ""});

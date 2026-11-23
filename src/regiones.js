/* Regiones de PregonIA: todo lo que cambia de una región a otra vive aquí (territorio, cómo buscarla en Google News, homónimos,
   instituciones). La lectura programada corre un turno por región (api/ingesta?region=V) y cada turno lee solo su catálogo
   regional y comunal, sus cuentas y sus fuentes oficiales; los medios nacionales los leen todos.
   Una región «activa: false» está en preparación: su territorio existe para probarla, pero la aplicación no la ofrece y el
   programador no la lee. Para abrir una región: catálogo de medios (columna region en data/catalogo_medios.csv), nómina de
   autoridades (src/autoridades.js), activa: true y su turno en supabase/programador.sql.
   scripts/build.py pone este archivo antes de autoridades.js en la aplicación y en api/_autoridades.js. */
const REGIONES = {
  V: {id: "V", activa: true, nombre: "Región de Valparaíso", corto: "Valparaíso", romano: "V", minuto: 7,
    provincias: {
      "Valparaíso": ["Valparaíso", "Viña del Mar", "Concón", "Quintero", "Puchuncaví", "Casablanca", "Juan Fernández"],
      "Marga Marga": ["Quilpué", "Villa Alemana", "Limache", "Olmué"],
      "Quillota": ["Quillota", "La Calera", "La Cruz", "Hijuelas", "Nogales"],
      "San Antonio": ["San Antonio", "Cartagena", "El Tabo", "El Quisco", "Algarrobo", "Santo Domingo"],
      "San Felipe de Aconcagua": ["San Felipe", "Llaillay", "Putaendo", "Santa María", "Catemu", "Panquehue"],
      "Los Andes": ["Los Andes", "Calle Larga", "Rinconada", "San Esteban"],
      "Petorca": ["La Ligua", "Petorca", "Cabildo", "Papudo", "Zapallar"],
      "Isla de Pascua": ["Isla de Pascua"]},
    // Otras formas en que la prensa escribe una comuna.
    alias: {"Llaillay": ["llay-llay", "llay llay"], "Isla de Pascua": ["rapa nui"]},
    // Frases que contienen el nombre de una comuna sin hablar de ella.
    quitar: ["ascensor santo domingo", "calle santo domingo", "region de valparaiso", "cordillera de los andes", "universidad de los andes", "federico santa maria", "universidad santa maria", "cruz roja"],
    // Palabras que en Google News acotan la búsqueda a la comuna chilena (Casablanca de Marruecos, Cartagena de Colombia, San Antonio de Texas).
    contexto: '(Valparaíso OR comuna OR municipalidad OR alcalde OR Chile OR "litoral central")',
    excluir: ["marruecos", "marroqui", "rabat", "wydad", "raja casablanca", "colombia", "cartagena de indias", "texas", "spurs", "ibiza", "murcia", "san antonio de padua", "san antonio abad", "tachira"],
    // Por comuna: lo que la saca (excluir) o lo que debe traer la nota para contar (requiere), cuando el nombre es una palabra común.
    comuna: {},
    // Un medio que Google News encuentra fuera del catálogo es de la región si su nombre o dominio calza con esto.
    medioRegional: "valpara|vina del mar|aconcagua|litoral|quinta region|v region|san antonio|quillota|quilpue|villa alemana|casablanca|limache|la ligua|petorca|los andes|san felipe|rapa nui|con ?con|quintero|puchuncavi|cartagena|algarrobo|el quisco|el tabo|la calera",
    contraloria: "Regional Valparaíso",
    senado: {circ: 6, por: "Valparaíso"},
    sanitaria: "Esval"},
  II: {id: "II", activa: false, nombre: "Región de Antofagasta", corto: "Antofagasta", romano: "II", minuto: 17,
    provincias: {
      "Antofagasta": ["Antofagasta", "Mejillones", "Sierra Gorda", "Taltal"],
      "El Loa": ["Calama", "Ollagüe", "San Pedro de Atacama"],
      "Tocopilla": ["Tocopilla", "María Elena"]},
    alias: {"Ollagüe": ["ollague"]},
    quitar: ["region de antofagasta", "universidad de antofagasta", "deportes antofagasta", "clinica antofagasta", "hospital regional de antofagasta", "antofagasta minerals", "antofagasta plc", "ferrocarril de antofagasta", "aguas antofagasta", "gobierno regional de antofagasta", "delegacion presidencial regional de antofagasta"],
    contexto: '(Antofagasta OR comuna OR municipalidad OR alcalde OR Chile OR "Región de Antofagasta")',
    excluir: ["antofagasta de la sierra", "catamarca", "queretaro", "sierra gorda de queretaro"],
    comuna: {
      // «Mejillones» también es un marisco; «María Elena», un nombre de persona: la nota debe traer algo del territorio.
      "Mejillones": {requiere: ["antofagasta", "comuna de mejillones", "municipalidad de mejillones", "bahia de mejillones", "puerto de mejillones", "alcalde de mejillones", "alcaldesa de mejillones", "angamos", "puerto angamos"]},
      "María Elena": {requiere: ["comuna de maria elena", "municipalidad de maria elena", "alcalde de maria elena", "alcaldesa de maria elena", "oficina maria elena", "tocopilla", "antofagasta", "quillagua", "pedro de valdivia"]},
      "Sierra Gorda": {requiere: ["antofagasta", "comuna de sierra gorda", "municipalidad de sierra gorda", "baquedano", "minera sierra gorda", "sierra gorda scm"]}},
    medioRegional: "antofagasta|calama|tocopilla|taltal|mejillones|el loa|loa|san pedro de atacama|segunda region|ii region|norte grande",
    contraloria: "Regional Antofagasta",
    senado: {circ: 3, por: "Antofagasta"},
    sanitaria: "Aguas Antofagasta"}
};
const REGION_DEFECTO = "V";
const normReg = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const COMUNAS_DE = id => Object.values((REGIONES[id] || {}).provincias || {}).flat().sort((a, b) => a.localeCompare(b, "es"));
const REGION_DE_COMUNA = new Map(Object.values(REGIONES).flatMap(r => COMUNAS_DE(r.id).map(c => [normReg(c), r.id])));
/* Región de una comuna (por su nombre, con o sin tildes); null si no es de ninguna región configurada. */
const regionDeComuna = c => REGION_DE_COMUNA.get(normReg(c)) || null;
const regionesActivas = () => Object.values(REGIONES).filter(r => r.activa);
const regionValida = id => REGIONES[id] ? id : null;

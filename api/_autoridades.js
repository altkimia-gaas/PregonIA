// Generado por scripts/build.py desde src/regiones.js y src/autoridades.js. No editar a mano.
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

/* Autoridades electas de la Región de Valparaíso: zonas electorales y nómina vigente.
   Lo usan la aplicación (entrada por rol, zona y nombre) y el servidor (lectura de noticias por autoridad):
   scripts/build.py copia este archivo a api/_autoridades.js.
   Nómina al inicio de cada período; verificar cambios posteriores (reemplazos, renuncias) antes de usarla con un cliente.
   Fuentes: diputados 2026-2030 (Mala Espina Check, 17 nov 2025, distritos 6 y 7); senadores 2026-2034 (Meganoticias y T13, 11 mar 2026);
   consejeros regionales 2025-2029 (Radio Universidad de Valparaíso, enero 2025); alcaldes 2024-2028 (resultados oficiales publicados por RedGol, oct 2024;
   Nogales verificada con TuOpinas, oct 2026); gobernador regional 2025-2029 (elección del 24 nov 2024, Ex-Ante); delegado presidencial regional
   (Diario Oficial, decreto publicado el 24 jul 2026) y delegados provinciales (nómina del Gobierno, 13 mar 2026, 24horas y G5noticias).
   De los alcaldes y delegados provinciales no se registra partido: la ficha muestra solo el cargo.
   Los delegados son de exclusiva confianza del Presidente: revisar la nómina ante cualquier cambio de gabinete. */
const NOMINA_CORTE = "11 de noviembre de 2026";
/* Provincias y comunas de cada región: src/regiones.js. Esta nómina es la de la Región de Valparaíso (región V). */
const PROVINCIAS = REGIONES.V.provincias;
const COMUNAS_V = COMUNAS_DE("V");
const D6 = ["Cabildo", "Calle Larga", "Catemu", "Hijuelas", "La Calera", "La Cruz", "La Ligua", "Limache", "Llaillay", "Los Andes", "Nogales", "Olmué", "Panquehue", "Papudo", "Petorca", "Puchuncaví", "Putaendo", "Quillota", "Quilpué", "Quintero", "Rinconada", "San Esteban", "San Felipe", "Santa María", "Villa Alemana", "Zapallar"];
const D7 = ["Algarrobo", "Cartagena", "Casablanca", "Concón", "El Quisco", "El Tabo", "Isla de Pascua", "Juan Fernández", "San Antonio", "Santo Domingo", "Valparaíso", "Viña del Mar"];
/* Roles: cómo se nombra el cargo (femenino y masculino), qué zona lo define y su órgano. */
const CARGOS = {
  municipio: {n: "Municipio", f: "Municipio", m: "Municipio", zona: "Comuna", organo: "Municipalidad"},
  diputado: {n: "Diputado o diputada", f: "Diputada", m: "Diputado", zona: "Distrito", organo: "Cámara de Diputadas y Diputados"},
  senador: {n: "Senador o senadora", f: "Senadora", m: "Senador", zona: "Circunscripción", organo: "Senado"},
  core: {n: "Consejero o consejera regional", f: "Consejera regional", m: "Consejero regional", zona: "Circunscripción provincial", organo: "Consejo Regional de Valparaíso"},
  alcalde: {n: "Alcalde o alcaldesa", f: "Alcaldesa", m: "Alcalde", zona: "Comuna", organo: "Municipalidad"},
  concejal: {n: "Concejal o concejala", f: "Concejala", m: "Concejal", zona: "Comuna", organo: "Concejo Municipal"},
  gobernador: {n: "Gobernador o gobernadora regional", f: "Gobernadora regional", m: "Gobernador regional", zona: "Región", organo: "Gobierno Regional de Valparaíso"},
  delegado: {n: "Delegado o delegada presidencial", f: "Delegada presidencial", m: "Delegado presidencial", zona: "Región o provincia", organo: "Delegación Presidencial"}
};
const ZONAS = {
  diputado: [{id: "D6", n: "Distrito 6", comunas: D6}, {id: "D7", n: "Distrito 7", comunas: D7}],
  senador: [{id: "C6", n: "Circunscripción 6 · Región de Valparaíso", comunas: COMUNAS_V}],
  core: [
    {id: "V1N", n: "Valparaíso I Norte", comunas: ["Viña del Mar", "Concón", "Quintero", "Puchuncaví"]},
    {id: "V2S", n: "Valparaíso II Sur", comunas: ["Valparaíso", "Casablanca", "Juan Fernández"]},
    {id: "MM", n: "Marga Marga", comunas: PROVINCIAS["Marga Marga"]},
    {id: "QUI", n: "Quillota", comunas: PROVINCIAS["Quillota"]},
    {id: "SA", n: "San Antonio", comunas: PROVINCIAS["San Antonio"]},
    {id: "SF", n: "San Felipe de Aconcagua", comunas: PROVINCIAS["San Felipe de Aconcagua"]},
    {id: "LA", n: "Los Andes", comunas: PROVINCIAS["Los Andes"]},
    {id: "PET", n: "Petorca", comunas: PROVINCIAS["Petorca"]},
    {id: "IP", n: "Isla de Pascua", comunas: PROVINCIAS["Isla de Pascua"]}
  ],
  concejal: COMUNAS_V.map(c => ({id: c, n: c, comunas: [c]})),
  alcalde: COMUNAS_V.map(c => ({id: c, n: c, comunas: [c]})),
  gobernador: [{id: "REG", n: "Región de Valparaíso", comunas: COMUNAS_V}],
  // La delegación regional cubre la región y gobierna directamente la provincia de Valparaíso; las otras siete tienen delegación provincial.
  // Los ids de provincia son los mismos de las circunscripciones del consejo regional, que coinciden con las provincias.
  delegado: [{id: "REG", n: "Delegación regional · Región de Valparaíso", comunas: COMUNAS_V}].concat(
    [["MM", "Marga Marga"], ["QUI", "Quillota"], ["SA", "San Antonio"], ["SF", "San Felipe de Aconcagua"], ["LA", "Los Andes"], ["PET", "Petorca"], ["IP", "Isla de Pascua"]]
      .map(([id, pv]) => ({id, n: "Provincia de " + pv, comunas: PROVINCIAS[pv]})))
};
/* Región de Antofagasta (II), en preparación. Sus zonas y su nómina se suman a ZONAS y AUTORIDADES en el servidor siempre
   (para probarla con la clave del programador) y en la aplicación solo cuando la región está activa (src/regiones.js), para que
   la entrada por rol y zona no la ofrezca antes de tiempo. Ids de zona propios: D3, C3, ANT, LOA, TOC e II-REG (la delegación
   regional gobierna en forma directa la provincia de Antofagasta, por eso no hay delegación provincial de Antofagasta). */
const COMUNAS_II = COMUNAS_DE("II"), PROV_II = REGIONES.II.provincias;
const ZONAS_II = {
  diputado: [{id: "D3", n: "Distrito 3", comunas: COMUNAS_II}],
  senador: [{id: "C3", n: "Circunscripción 3 · Región de Antofagasta", comunas: COMUNAS_II}],
  core: [{id: "ANT", n: "Antofagasta", comunas: PROV_II["Antofagasta"]}, {id: "LOA", n: "El Loa", comunas: PROV_II["El Loa"]}, {id: "TOC", n: "Tocopilla", comunas: PROV_II["Tocopilla"]}],
  concejal: COMUNAS_II.map(c => ({id: c, n: c, comunas: [c]})),
  alcalde: COMUNAS_II.map(c => ({id: c, n: c, comunas: [c]})),
  gobernador: [{id: "II-REG", n: "Región de Antofagasta", comunas: COMUNAS_II}],
  delegado: [{id: "II-REG", n: "Delegación regional · Región de Antofagasta", comunas: COMUNAS_II},
    {id: "LOA", n: "Provincia de El Loa", comunas: PROV_II["El Loa"]}, {id: "TOC", n: "Provincia de Tocopilla", comunas: PROV_II["Tocopilla"]}]
};
const ACTIVA_AQUI = id => !!(REGIONES[id] && REGIONES[id].activa) || typeof window === "undefined";
if (ACTIVA_AQUI("II")) Object.entries(ZONAS_II).forEach(([rol, zs]) => { ZONAS[rol] = (ZONAS[rol] || []).concat(zs); });
const provinciaDe = c => { for (const r of Object.values(REGIONES)) { const k = Object.keys(r.provincias).find(pv => r.provincias[pv].includes(c)); if (k) return k; } return ""; };
/* n: nombre con que se le conoce; c: nombre completo; p: partido o pacto al momento de la elección; g: F o M. */
const nuevaAut = (rol, zona, n, c, p, g) => ({id: rol.slice(0, 3) + "-" + n.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-"), rol, zona, n, c, p, g});
const AUTORIDADES = [
  nuevaAut("diputado", "D6", "Francisca Bello", "Francisca Bello Campos", "FA", "F"),
  nuevaAut("diputado", "D6", "Nelson Venegas", "Nelson Venegas Salazar", "PS", "M"),
  nuevaAut("diputado", "D6", "Sofía González", "Sofía González Cortés", "PC", "F"),
  nuevaAut("diputado", "D6", "Cristian Mella", "Cristian Mella Andaur", "DC", "M"),
  nuevaAut("diputado", "D6", "Javier Olivares", "Javier Olivares Avedaño", "PDG", "M"),
  nuevaAut("diputado", "D6", "Luis Pardo", "Luis Pardo Sainz", "RN", "M"),
  nuevaAut("diputado", "D6", "Chiara Barchiesi", "Chiara Barchiesi Chávez", "Republicanos", "F"),
  nuevaAut("diputado", "D6", "Benjamín Lorca", "Benjamín Lorca Inzunza", "Republicanos", "M"),
  nuevaAut("diputado", "D7", "Jorge Brito", "Jorge Brito Hasbún", "FA", "M"),
  nuevaAut("diputado", "D7", "Jaime Bassa", "Jaime Bassa Mercado", "FA", "M"),
  nuevaAut("diputado", "D7", "Luis Cuello", "Luis Cuello Peña y Lillo", "PC", "M"),
  nuevaAut("diputado", "D7", "Juan Marcelo Valenzuela", "Juan Marcelo Valenzuela", "PDG", "M"),
  nuevaAut("diputado", "D7", "Andrés Celis", "Andrés Celis Montt", "RN", "M"),
  nuevaAut("diputado", "D7", "Hotuiti Teao", "Hotuiti Teao Drago", "Ind.-UDI", "M"),
  nuevaAut("diputado", "D7", "Luis Sánchez", "Luis Sánchez Ossa", "Republicanos", "M"),
  nuevaAut("diputado", "D7", "Sebastián Zamora", "Sebastián Zamora Soto", "Ind.-Republicanos", "M"),
  nuevaAut("senador", "C6", "Karol Cariola", "Karol Cariola Oliva", "PC", "F"),
  nuevaAut("senador", "C6", "Andrés Longton", "Andrés Longton Herrera", "RN", "M"),
  nuevaAut("senador", "C6", "Arturo Squella", "Arturo Squella Ovalle", "Republicanos", "M"),
  nuevaAut("senador", "C6", "Diego Ibáñez", "Diego Ibáñez Cotroneo", "FA", "M"),
  nuevaAut("senador", "C6", "Camila Flores", "Camila Flores Oporto", "RN", "F"),
  nuevaAut("core", "V1N", "Catalina Thauby", "Catalina María Thauby Krebs", "Republicanos", "F"),
  nuevaAut("core", "V1N", "Javier Venegas", "Javier Ignacio Venegas Muñoz", "Republicanos", "M"),
  nuevaAut("core", "V1N", "Osvaldo Urrutia", "Osvaldo Urrutia Soto", "UDI", "M"),
  nuevaAut("core", "V1N", "Marcela Varas", "Marcela Alicia Varas Fuentes", "PPD", "F"),
  nuevaAut("core", "V1N", "Tania Valenzuela", "Tania Estefanía Valenzuela Rossi", "FA", "F"),
  nuevaAut("core", "V2S", "José Luis Miranda", "José Luis Miranda Muñoz", "Republicanos", "M"),
  nuevaAut("core", "V2S", "Paulina Yáñez", "Paulina Yáñez Gula", "Republicanos", "F"),
  nuevaAut("core", "V2S", "Omar Valdivia", "Omar Gabriel Valdivia Álvarez", "PPD", "M"),
  nuevaAut("core", "V2S", "Paula Rosso", "Paula Rosso Montenegro", "FA", "F"),
  nuevaAut("core", "MM", "Cristián Fuentes", "Cristián Humberto Fuentes Duque", "Republicanos", "M"),
  nuevaAut("core", "MM", "Elsa Bueno", "Elsa Graciela Bueno Cortés", "Republicanos", "F"),
  nuevaAut("core", "MM", "Emmanuel Olfos", "Emmanuel José Olfos Vargas", "Ind.-RN", "M"),
  nuevaAut("core", "MM", "María Elena Rubilar", "María Elena Rubilar Muñoz", "FA", "F"),
  nuevaAut("core", "QUI", "Felipe Córdoba", "Felipe Ignacio Sebastián Córdoba Araya", "Republicanos", "M"),
  nuevaAut("core", "QUI", "Lautaro Correa", "Lautaro Correa Castillo", "PS", "M"),
  nuevaAut("core", "QUI", "Giselle Ahumada", "Giselle Makarena Ahumada Espina", "Ind.-PC", "F"),
  nuevaAut("core", "SA", "Mauricio López", "Mauricio Alejandro López Castillo", "Republicanos", "M"),
  nuevaAut("core", "SA", "Paola Zamorano", "Paola Emilia Zamorano Arratia", "RN", "F"),
  nuevaAut("core", "SA", "Romy Farías", "Romy Jesús Farías Caballero", "DC", "F"),
  nuevaAut("core", "SF", "Fernando Astorga", "Fernando Marcelo Astorga Terraza", "Republicanos", "M"),
  nuevaAut("core", "SF", "Rodolfo Silva", "Rodolfo Ignacio Silva González", "Ind.-RN", "M"),
  nuevaAut("core", "SF", "Maricel Martínez", "Maricel Alejandra Martínez Vicencio", "PPD", "F"),
  nuevaAut("core", "LA", "Edith Quiroz", "Edith Clarisa de las Nieves Quiroz Ortiz", "RN", "F"),
  nuevaAut("core", "LA", "María Victoria Rodríguez", "María Victoria Rodríguez Herrera", "Ind.-FRVS", "F"),
  nuevaAut("core", "PET", "Cristián Pinilla", "Cristián René Pinilla Ibacache", "Republicanos", "M"),
  nuevaAut("core", "PET", "Juan Bautista Ibacache", "Juan Bautista Ibacache Ibacache", "RN", "M"),
  nuevaAut("core", "IP", "Sabrina Tuki", "Sabrina Tuki Pont", "Ind.-Evópoli", "F"),
  nuevaAut("core", "IP", "Francisco Haoa", "Francisco Haoa Hotus", "Ind.-PS", "M"),
  /* Alcaldes 2024-2028: la zona es la comuna. */
  nuevaAut("alcalde", "Algarrobo", "Marcos González", "Marcos González", "", "M"),
  nuevaAut("alcalde", "Cabildo", "Víctor Donoso", "Víctor Donoso Oyanedel", "", "M"),
  nuevaAut("alcalde", "Calle Larga", "Dina González", "Dina González Alfaro", "", "F"),
  nuevaAut("alcalde", "Cartagena", "Lidia Silva", "Lidia Silva", "", "F"),
  nuevaAut("alcalde", "Casablanca", "Rodrigo Martínez", "Rodrigo Martínez", "", "M"),
  nuevaAut("alcalde", "Catemu", "Rodrigo Díaz", "Rodrigo Díaz Brito", "", "M"),
  nuevaAut("alcalde", "Concón", "Freddy Ramírez", "Freddy Ramírez", "", "M"),
  nuevaAut("alcalde", "El Quisco", "José Jofré", "José Jofré", "", "M"),
  nuevaAut("alcalde", "El Tabo", "Alfonso Muñoz", "Alfonso Muñoz", "", "M"),
  nuevaAut("alcalde", "Hijuelas", "Verónica Rossat", "Verónica Rossat Arriagada", "", "F"),
  nuevaAut("alcalde", "Isla de Pascua", "Elizabeth Arévalo", "Elizabeth Arévalo Pakarati", "", "F"),
  nuevaAut("alcalde", "Juan Fernández", "Pablo Manríquez", "Pablo Manríquez", "", "M"),
  nuevaAut("alcalde", "La Calera", "Johnny Piraino", "Johnny Piraino Meneses", "", "M"),
  nuevaAut("alcalde", "La Cruz", "Filomena Navia", "Filomena Navia Hevia", "", "F"),
  nuevaAut("alcalde", "La Ligua", "Patricio Pallares", "Patricio Pallares Valenzuela", "", "M"),
  nuevaAut("alcalde", "Limache", "Luciano Valenzuela", "Luciano Valenzuela Romero", "", "M"),
  nuevaAut("alcalde", "Llaillay", "Edgardo González", "Edgardo González Arancibia", "", "M"),
  nuevaAut("alcalde", "Los Andes", "Manuel Rivera", "Manuel Rivera Martínez", "", "M"),
  nuevaAut("alcalde", "Nogales", "Leslie Pacheco", "Leslie Pacheco Ramírez", "", "F"),
  nuevaAut("alcalde", "Olmué", "Jorge Jil", "Jorge Jil Herrera", "", "M"),
  nuevaAut("alcalde", "Panquehue", "Gonzalo Vergara", "Gonzalo Vergara", "", "M"),
  nuevaAut("alcalde", "Papudo", "Claudia Adasme", "Claudia Adasme", "", "F"),
  nuevaAut("alcalde", "Petorca", "Gustavo Henríquez", "Gustavo Henríquez", "", "M"),
  nuevaAut("alcalde", "Puchuncaví", "Marcos Morales", "Marcos Morales Ureta", "", "M"),
  nuevaAut("alcalde", "Putaendo", "Mauricio Quiroz", "Mauricio Quiroz Chamorro", "", "M"),
  nuevaAut("alcalde", "Quillota", "Luis Mella", "Luis Mella", "", "M"),
  nuevaAut("alcalde", "Quilpué", "Carolina Corti", "Carolina Corti Badía", "", "F"),
  nuevaAut("alcalde", "Quintero", "Rolando Silva", "Rolando Silva", "", "M"),
  nuevaAut("alcalde", "Rinconada", "Juan Galdames", "Juan Galdames", "", "M"),
  nuevaAut("alcalde", "San Antonio", "Omar Vera", "Omar Vera Castro", "", "M"),
  nuevaAut("alcalde", "San Esteban", "Christian Ortega", "Christian Ortega", "", "M"),
  nuevaAut("alcalde", "San Felipe", "Carmen Castillo", "Carmen Castillo", "", "F"),
  nuevaAut("alcalde", "Santa María", "Claudio Zurita", "Claudio Zurita", "", "M"),
  nuevaAut("alcalde", "Santo Domingo", "Fernando Rodríguez", "Fernando Rodríguez Larraín", "", "M"),
  nuevaAut("alcalde", "Valparaíso", "Camila Nieto", "Camila Nieto Hernández", "", "F"),
  nuevaAut("alcalde", "Villa Alemana", "Nelson Estay", "Nelson Estay", "", "M"),
  nuevaAut("alcalde", "Viña del Mar", "Macarena Ripamonti", "Macarena Ripamonti", "", "F"),
  nuevaAut("alcalde", "Zapallar", "Gustavo Alessandri", "Gustavo Alessandri", "", "M"),
  nuevaAut("gobernador", "REG", "Rodrigo Mundaca", "Rodrigo Mundaca Cabrera", "Ind.-FA", "M"),
  nuevaAut("delegado", "REG", "Manuel Millones", "Manuel Millones Chirino", "Ind.-Republicanos", "M"),
  nuevaAut("delegado", "MM", "Gonzalo Azancot", "Gonzalo Azancot", "", "M"),
  nuevaAut("delegado", "QUI", "Pilar Cuevas", "Pilar Cuevas", "", "F"),
  nuevaAut("delegado", "SA", "Soledad Loyola", "Soledad Loyola", "", "F"),
  nuevaAut("delegado", "SF", "Sebastián Caldera", "Sebastián Caldera", "", "M"),
  nuevaAut("delegado", "LA", "Ricardo Figueroa", "Ricardo Figueroa", "", "M"),
  nuevaAut("delegado", "PET", "Andrés Soza", "Andrés Soza", "", "M"),
  nuevaAut("delegado", "IP", "Mai Teao", "Mai Teao", "", "M")
];
/* Nómina de la Región de Antofagasta al 23 de noviembre de 2026. Fuentes: diputados 2026-2030 del distrito 3 (camara.cl,
   fichas de Videla, Ossandón, Hernando, Arqueros y Araya); senadores 2022-2030 de la circunscripción 3 (senado.cl; Paulina Núñez
   preside el Senado desde el 11 mar 2026); gobernador 2025-2029 (segunda vuelta del 24 nov 2024, 24horas); delegada presidencial
   regional (nómina del 7 feb 2026, Emol y 24horas; energia.gob.cl, abr 2026) y delegados provinciales (13 mar 2026, Emol, 24horas,
   interior.gob.cl; Diario Oficial del 24 sep 2026); alcaldes 2024-2028 (Emol, oct 2024; reunión con el Presidente, Subdere, 2 oct 2026;
   Ollagüe según el reporte comunal 2026 de la BCN); consejo regional 2025-2029 (Wikipedia «Regional Council of Antofagasta»; el Gobierno Regional
   no publica la nómina en una página que se pueda consultar, confirmarla con el cliente antes de venderle). De alcaldes y delegados provinciales no se registra partido. */
const AUTORIDADES_II = [
  nuevaAut("diputado", "D3", "Sebastián Videla", "Sebastián Videla Castillo", "Ind.-PL", "M"),
  nuevaAut("diputado", "D3", "Fabián Ossandón", "Fabián Ossandón Briceño", "PDG", "M"),
  nuevaAut("diputado", "D3", "Marcela Hernando", "Marcela Hernando Pérez", "PR", "F"),
  nuevaAut("diputado", "D3", "Carlo Arqueros", "Carlo Arqueros Pizarro", "Republicanos", "M"),
  nuevaAut("diputado", "D3", "Jaime Araya", "Jaime Araya Guerrero", "Ind.-PPD", "M"),
  nuevaAut("senador", "C3", "Paulina Núñez", "Paulina Núñez Urrutia", "RN", "F"),
  nuevaAut("senador", "C3", "Pedro Araya", "Pedro Araya Guerrero", "PPD", "M"),
  nuevaAut("senador", "C3", "Esteban Velásquez", "Esteban Velásquez Núñez", "FRVS", "M"),
  nuevaAut("core", "ANT", "Alejandro Cifuentes", "Alejandro Cifuentes Mancilla", "Republicanos", "M"),
  nuevaAut("core", "ANT", "Duzanka Flores", "Duzanka Flores Rojas", "PSC", "F"),
  nuevaAut("core", "ANT", "Andrea Merino", "Andrea Merino Díaz", "PS", "F"),
  nuevaAut("core", "ANT", "Paula Celis", "Paula Celis Sierralta", "PDG", "F"),
  nuevaAut("core", "ANT", "Gonzalo Santolaya", "Gonzalo Santolaya Goicovic", "UDI", "M"),
  nuevaAut("core", "ANT", "Paula Orellana", "Paula Orellana Uribe", "FA", "F"),
  nuevaAut("core", "ANT", "Yasna Meneses", "Yasna Meneses González", "Republicanos", "F"),
  nuevaAut("core", "ANT", "Víctor Guzmán", "Víctor Guzmán Rojas", "PC", "M"),
  nuevaAut("core", "LOA", "Sandra Berna", "Sandra Berna Martínez", "DC", "F"),
  nuevaAut("core", "LOA", "Emilio Mavrakis", "Emilio Mavrakis Assad", "Republicanos", "M"),
  nuevaAut("core", "LOA", "Jorge Berna", "Jorge Berna Mendoza", "PDG", "M"),
  nuevaAut("core", "LOA", "Dinka López", "Dinka López Durán", "FRVS", "F"),
  nuevaAut("core", "LOA", "Luis Payero", "Luis Payero Cruz", "PS", "M"),
  nuevaAut("core", "TOC", "Humberto Fuentes", "Humberto Fuentes Lagos", "Ind.-FRVS", "M"),
  nuevaAut("core", "TOC", "Gustavo Carrasco", "Gustavo Carrasco Ortiz", "PPD", "M"),
  nuevaAut("core", "TOC", "Patricio Tapia", "Patricio Tapia Julio", "DC", "M"),
  nuevaAut("alcalde", "Antofagasta", "Sacha Razmilic", "Sacha Razmilic Burgos", "", "M"),
  nuevaAut("alcalde", "Calama", "Eliecer Chamorro", "Eliecer Chamorro Vargas", "", "M"),
  nuevaAut("alcalde", "Mejillones", "Marcelino Carvajal", "Marcelino Carvajal Ferreira", "", "M"),
  nuevaAut("alcalde", "Sierra Gorda", "Adriana Rivera", "Adriana Rivera Vega", "", "F"),
  nuevaAut("alcalde", "Taltal", "Mario Acuña", "Mario Acuña Villalobos", "", "M"),
  nuevaAut("alcalde", "Ollagüe", "Jhean Ramírez", "Jhean Ramírez Domínguez", "", "M"),
  nuevaAut("alcalde", "San Pedro de Atacama", "Justo Zuleta", "Justo Zuleta Santander", "", "M"),
  nuevaAut("alcalde", "Tocopilla", "Ljubica Kurtovic", "Ljubica Kurtovic Cortés", "", "F"),
  nuevaAut("alcalde", "María Elena", "Viviana Cuello", "Viviana Cuello Rivera", "", "F"),
  nuevaAut("gobernador", "II-REG", "Ricardo Díaz", "Ricardo Díaz Cortés", "Ind.", "M"),
  nuevaAut("delegado", "II-REG", "Katherine López", "Katherine López Rivera", "UDI", "F"),
  nuevaAut("delegado", "LOA", "Cristián Ramírez", "Cristián Ramírez", "", "M"),
  nuevaAut("delegado", "TOC", "Daniela Vecchiola", "Daniela Vecchiola Riquelme", "", "F")
];
if (ACTIVA_AQUI("II")) AUTORIDADES.push(...AUTORIDADES_II);
const zonaDe = (rol, id) => (ZONAS[rol] || []).find(z => z.id === id) || null;
/* Región de una zona y zonas de una región, para los cargos cuyo territorio depende de la región (senado, gobierno y delegaciones). */
const comunasDeProvincia = pv => { for (const r of Object.values(REGIONES)) if (r.provincias[pv]) return r.provincias[pv]; return []; };
const regionDeZona = (rol, id) => { const z = zonaDe(rol, id); return z ? regionDeComuna(z.comunas[0]) : null; };
const zonasDeRegion = (rol, reg) => (ZONAS[rol] || []).filter(z => regionDeComuna(z.comunas[0]) === reg);
const esZonaRegional = id => /(^|-)REG$/.test(id);
/* Nombre del órgano con su región: «Consejo Regional de Antofagasta» para un consejero de la II. */
const organoDe = (rol, reg) => ((CARGOS[rol] || {}).organo || "").replace(/ de Valparaíso$/, " de " + (REGIONES[reg] || REGIONES[REGION_DEFECTO]).corto);
const cargoDe = (rol, g) => CARGOS[rol] ? (g === "F" ? CARGOS[rol].f : CARGOS[rol].m) : "";
/* Formas en que la prensa nombra a una autoridad: nombre conocido, nombre completo y cargo + primer apellido. */
function variantesNombre(a){
  const sin = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const partes = a.n.split(" "), ap = partes[partes.length - 1], cargo = sin(cargoDe(a.rol, a.g));
  const out = new Set([sin(a.n), sin(a.c)]);
  out.add(cargo + " " + sin(ap));
  // Primer nombre y primer apellido: la prensa suele omitir el segundo nombre («Juan Ibacache» por «Juan Bautista Ibacache»).
  const pn = sin(a.c || a.n).split(" ")[0]; if (pn && partes.length > 1) out.add(pn + " " + sin(ap));
  if (a.rol === "core") { out.add("core " + sin(ap)); out.add((a.g === "F" ? "consejera " : "consejero ") + sin(ap)); }  // «consejero Urrutia», sin «regional»
  // La prensa abrevia: «gobernador Mundaca», «delegado Millones», «delegada presidencial provincial Loyola».
  if (a.rol === "gobernador") out.add((a.g === "F" ? "gobernadora " : "gobernador ") + sin(ap));
  if (a.rol === "delegado") { const d = a.g === "F" ? "delegada " : "delegado "; out.add(d + sin(ap)); if (!esZonaRegional(a.zona)) out.add(d + "presidencial provincial " + sin(ap)); else out.add(d + "presidencial regional " + sin(ap)); }
  return [...out].filter(x => x.split(" ").length >= 2);
}
export { REGIONES, REGION_DEFECTO, COMUNAS_DE, regionDeComuna, regionesActivas, regionValida, NOMINA_CORTE, PROVINCIAS, COMUNAS_V, CARGOS, ZONAS, AUTORIDADES, zonaDe, cargoDe, variantesNombre, provinciaDe };

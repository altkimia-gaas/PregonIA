/* Autoridades electas de la Región de Valparaíso: zonas electorales y nómina vigente.
   Lo usan la aplicación (entrada por rol, zona y nombre) y el servidor (lectura de noticias por autoridad):
   scripts/build.py copia este archivo a api/_autoridades.js.
   Nómina al inicio de cada período; verificar cambios posteriores (reemplazos, renuncias) antes de usarla con un cliente.
   Fuentes: diputados 2026-2030 (Mala Espina Check, 17 nov 2025, distritos 6 y 7); senadores 2026-2034 (Meganoticias y T13, 11 mar 2026);
   consejeros regionales 2025-2029 (Radio Universidad de Valparaíso, enero 2025). */
const NOMINA_CORTE = "11 de noviembre de 2026";
const PROVINCIAS = {
  "Valparaíso": ["Valparaíso", "Viña del Mar", "Concón", "Quintero", "Puchuncaví", "Casablanca", "Juan Fernández"],
  "Marga Marga": ["Quilpué", "Villa Alemana", "Limache", "Olmué"],
  "Quillota": ["Quillota", "La Calera", "La Cruz", "Hijuelas", "Nogales"],
  "San Antonio": ["San Antonio", "Cartagena", "El Tabo", "El Quisco", "Algarrobo", "Santo Domingo"],
  "San Felipe de Aconcagua": ["San Felipe", "Llaillay", "Putaendo", "Santa María", "Catemu", "Panquehue"],
  "Los Andes": ["Los Andes", "Calle Larga", "Rinconada", "San Esteban"],
  "Petorca": ["La Ligua", "Petorca", "Cabildo", "Papudo", "Zapallar"],
  "Isla de Pascua": ["Isla de Pascua"]
};
const COMUNAS_V = Object.values(PROVINCIAS).flat().sort((a, b) => a.localeCompare(b, "es"));
const D6 = ["Cabildo", "Calle Larga", "Catemu", "Hijuelas", "La Calera", "La Cruz", "La Ligua", "Limache", "Llaillay", "Los Andes", "Nogales", "Olmué", "Panquehue", "Papudo", "Petorca", "Puchuncaví", "Putaendo", "Quillota", "Quilpué", "Quintero", "Rinconada", "San Esteban", "San Felipe", "Santa María", "Villa Alemana", "Zapallar"];
const D7 = ["Algarrobo", "Cartagena", "Casablanca", "Concón", "El Quisco", "El Tabo", "Isla de Pascua", "Juan Fernández", "San Antonio", "Santo Domingo", "Valparaíso", "Viña del Mar"];
/* Roles: cómo se nombra el cargo (femenino y masculino), qué zona lo define y su órgano. */
const CARGOS = {
  municipio: {n: "Municipio", f: "Municipio", m: "Municipio", zona: "Comuna", organo: "Municipalidad"},
  diputado: {n: "Diputado o diputada", f: "Diputada", m: "Diputado", zona: "Distrito", organo: "Cámara de Diputadas y Diputados"},
  senador: {n: "Senador o senadora", f: "Senadora", m: "Senador", zona: "Circunscripción", organo: "Senado"},
  core: {n: "Consejero o consejera regional", f: "Consejera regional", m: "Consejero regional", zona: "Circunscripción provincial", organo: "Consejo Regional de Valparaíso"},
  concejal: {n: "Concejal o concejala", f: "Concejala", m: "Concejal", zona: "Comuna", organo: "Concejo Municipal"}
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
  concejal: COMUNAS_V.map(c => ({id: c, n: c, comunas: [c]}))
};
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
  nuevaAut("core", "IP", "Francisco Haoa", "Francisco Haoa Hotus", "Ind.-PS", "M")
];
const zonaDe = (rol, id) => (ZONAS[rol] || []).find(z => z.id === id) || null;
const cargoDe = (rol, g) => CARGOS[rol] ? (g === "F" ? CARGOS[rol].f : CARGOS[rol].m) : "";
/* Formas en que la prensa nombra a una autoridad: nombre conocido, nombre completo y cargo + primer apellido. */
function variantesNombre(a){
  const sin = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const partes = a.n.split(" "), ap = partes[partes.length - 1], cargo = sin(cargoDe(a.rol, a.g));
  const out = new Set([sin(a.n), sin(a.c)]);
  out.add(cargo + " " + sin(ap));
  if (a.rol === "core") out.add("core " + sin(ap));
  return [...out].filter(x => x.split(" ").length >= 2);
}

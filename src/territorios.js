/* Temas adaptados al territorio y al cargo.
   Las ocho temáticas de sensibilidad son las mismas para todas las cuentas (agua, emergencias, seguridad, salud, educación,
   tránsito, aseo y turismo/economía), pero cada cuenta las ve con el nombre, las palabras y los dolores de su territorio,
   y con la lente de su cargo: el municipio y el concejo miran la gestión local; el consejo regional, la inversión regional;
   diputados y senadores, la agenda legislativa y la red pública de su distrito o circunscripción.
   TERR: perfil de cada una de las 38 comunas. p: identidad; l: localidades y sectores (sirven de contexto); x: homónimos a excluir;
   s: temas sensibles por defecto; e: foco de cada eje [nombre del tema, palabras propias del territorio].
   TERR_ZONA: nombre de cada eje para distritos, circunscripciones y circunscripciones provinciales del consejo regional.
   Se carga después de autoridades.js y antes de app.js. */
const TV = 2;  // versión de los temas: las cuentas guardadas con una versión anterior se adaptan al abrirse

const TERR = {
  "Algarrobo": {p: "Balneario náutico con humedales y segunda vivienda", l: ["Mirasol", "El Yeco", "Las Cadenas", "San Alfonso del Mar", "Canelo", "Canelillo"], x: [], s: ["aseo", "agua", "turismo"], e: {
    agua: ["Agua: abastecimiento en temporada", ["corte de agua", "Esval", "agua potable", "camión aljibe"]],
    emergencias: ["Marejadas e incendios forestales", ["marejada", "incendio forestal", "Conaf", "Senapred"]],
    aseo: ["Medio ambiente: humedales y borde costero", ["humedal", "humedales", "Islote Pájaros Niños", "pingüinos", "borde costero", "contaminación"]],
    turismo: ["Turismo náutico y segunda vivienda", ["Cofradía Náutica", "náutico", "segunda vivienda", "veraneantes", "turistas"]]}},
  "Cabildo": {p: "Comuna agrícola y minera del valle de La Ligua", l: ["Alicahue"], x: ["cabildo abierto", "cabildo ciudadano", "cabildos", "Tenerife", "Canarias"], s: ["agua", "aseo", "salud"], e: {
    agua: ["Agua: sequía, APR y riego", ["APR", "agua potable rural", "camión aljibe", "riego", "pozos", "decreto de escasez"]],
    aseo: ["Medio ambiente: minería y relaves", ["minería", "relave", "relaves", "Cerro Negro", "contaminación"]],
    salud: ["Salud rural: Cesfam y postas", ["posta", "Cesfam", "ronda médica", "traslado"]],
    turismo: ["Agro, minería y empleo", ["agricultura", "minería", "empleo", "temporeros", "pirquineros"]]}},
  "Calle Larga": {p: "Comuna rural agrícola del valle de Los Andes", l: ["Pocuro"], x: [], s: ["agua", "seguridad", "turismo"], e: {
    agua: ["Agua: APR, riego y sequía", ["APR", "agua potable rural", "riego", "canal", "sequía"]],
    seguridad: ["Seguridad rural", ["abigeato", "robo en parcelas", "robo", "Carabineros"]],
    turismo: ["Agricultura, uva y empleo", ["uva", "agricultura", "temporeros", "empleo"]]}},
  "Cartagena": {p: "Balneario popular con el patrimonio de Huidobro", l: ["Playa Grande", "Playa Chica", "San Sebastián", "Costa Azul", "Lo Abarca", "El Turco", "Lo Zárate"], x: ["Cartagena de Indias", "Colombia", "Murcia"], s: ["seguridad", "aseo", "turismo"], e: {
    agua: ["Agua: cortes en temporada y APR", ["corte de agua", "Esval", "APR", "agua potable"]],
    emergencias: ["Marejadas e incendios en quebradas", ["marejada", "quebrada", "incendio forestal", "Senapred"]],
    seguridad: ["Seguridad en temporada y balnearios", ["balneario", "asalto", "delincuencia", "comercio ambulante"]],
    transito: ["Accesos, Ruta 78 y transporte", ["Ruta 78", "congestión", "micro", "transporte"]],
    aseo: ["Aseo: basura en playas y quebradas", ["playas", "quebrada", "microbasural", "recolección"]],
    turismo: ["Turismo popular, temporada y patrimonio", ["Playa Grande", "veraneantes", "turistas", "Huidobro", "patrimonio", "comercio"]]}},
  "Casablanca": {p: "Valle vitivinícola y nudo logístico de la Ruta 68", l: ["Lo Ovalle", "Los Maitenes", "Lagunillas", "Quintay", "Tapihue", "La Vinilla", "Lo Vásquez", "Las Dichas", "Lo Orozco"], x: ["Marruecos", "película", "Bogart"], s: ["agua", "emergencias", "seguridad"], e: {
    agua: ["Agua: sequía, APR y riego del valle", ["APR", "camión aljibe", "riego", "pozo", "embalse", "Lo Orozco"]],
    emergencias: ["Incendios forestales y de interfaz", ["incendio forestal", "interfaz", "Conaf", "brigadistas"]],
    seguridad: ["Seguridad rural y en la Ruta 68", ["abigeato", "robo en parcelas", "Ruta 68", "portonazo"]],
    salud: ["Salud: Hospital San José y Cesfam", ["Hospital San José", "posta rural", "SAPU", "CESFAM"]],
    transito: ["Ruta 68, accesos y transporte rural", ["peaje", "Lo Vásquez", "camiones", "transporte rural"]],
    turismo: ["Enoturismo, Vendimia y Quintay", ["enoturismo", "viñas", "ruta del vino", "Quintay", "vino"]]}},
  "Catemu": {p: "Comuna agrícola junto a la fundición Chagres", l: ["Chagres", "Ñilhue", "El Cobre"], x: [], s: ["aseo", "agua", "salud"], e: {
    agua: ["Agua: APR y sequía rural", ["APR", "agua potable rural", "camión aljibe", "riego", "sequía"]],
    aseo: ["Medio ambiente: fundición Chagres", ["Chagres", "fundición", "Anglo American", "emisiones", "contaminación"]],
    turismo: ["Agricultura y empleo", ["agricultura", "temporeros", "empleo", "uva"]]}},
  "Concón": {p: "Ciudad costera de rápido crecimiento inmobiliario, junto a la refinería", l: ["Higuerillas", "Montemar", "Costa de Montemar", "Bosques de Montemar", "Las Gaviotas", "Concón Bajo"], x: [], s: ["emergencias", "aseo", "transito"], e: {
    agua: ["Agua: suministro y crecimiento urbano", ["Esval", "corte de agua", "factibilidad"]],
    emergencias: ["Socavones, dunas e incendios", ["socavón", "socavones", "dunas", "colapso", "evacuación"]],
    seguridad: ["Seguridad en barrios y borde costero", ["borde costero", "robo", "portonazo"]],
    transito: ["Accesos, ruta costera y congestión", ["ruta costera", "Avenida Borgoño", "Camino Internacional", "acceso", "tacos"]],
    aseo: ["Medio ambiente: refinería y dunas", ["ENAP", "refinería", "emanaciones", "contaminación", "dunas", "Santuario de la Naturaleza"]],
    turismo: ["Turismo, gastronomía y playas", ["gastronomía", "Caleta Higuerillas", "turistas", "playas"]]}},
  "El Quisco": {p: "Balneario del litoral de los poetas, hogar de Isla Negra", l: ["Isla Negra", "Punta de Tralca", "El Totoral", "Pinomar"], x: [], s: ["agua", "turismo", "seguridad"], e: {
    agua: ["Agua: abastecimiento en temporada", ["corte de agua", "Esval", "agua potable"]],
    emergencias: ["Marejadas e incendios forestales", ["marejada", "incendio forestal", "Senapred"]],
    turismo: ["Turismo, Isla Negra y temporada", ["Isla Negra", "Neruda", "caleta", "turistas", "segunda vivienda"]]}},
  "El Tabo": {p: "Balneario de segunda vivienda en el litoral de los poetas", l: ["Las Cruces", "Playas Blancas", "San Carlos", "Chépica"], x: [], s: ["agua", "emergencias", "turismo"], e: {
    agua: ["Agua: abastecimiento en temporada", ["corte de agua", "APR", "Esval", "agua potable", "camión aljibe"]],
    emergencias: ["Marejadas, incendios y bosque", ["marejada", "incendio forestal", "Conaf"]],
    aseo: ["Aseo y residuos en temporada", ["recolección", "microbasural", "temporada"]],
    turismo: ["Temporada, segunda vivienda y turismo", ["segunda vivienda", "veraneantes", "turistas", "Las Cruces"]]}},
  "Hijuelas": {p: "Capital de las flores, comuna rural del valle del Aconcagua", l: ["Ocoa", "Romeral", "La Sombra", "Petorquita"], x: [], s: ["agua", "emergencias", "transito"], e: {
    agua: ["Agua: APR y riego de flores", ["APR", "agua potable rural", "riego", "floricultores", "camión aljibe"]],
    emergencias: ["Incendios forestales en La Campana", ["incendio forestal", "La Campana", "Conaf", "Ocoa"]],
    transito: ["Ruta 5 y caminos rurales", ["Ruta 5", "caminos rurales", "pasarela", "accidente"]],
    turismo: ["Flores, agricultura y turismo rural", ["flores", "floricultores", "agricultura", "turismo rural", "Palmas de Ocoa"]]}},
  "Isla de Pascua": {p: "Territorio especial Rapa Nui, entre el turismo y el Parque Nacional", l: ["Rapa Nui", "Hanga Roa", "Anakena", "Rano Raraku", "Mataveri"], x: ["Pascua de Resurrección", "Semana Santa"], s: ["transito", "turismo", "aseo"], e: {
    agua: ["Agua y energía en Rapa Nui", ["agua potable", "energía", "SASIPA", "corte de luz", "diésel"]],
    emergencias: ["Incendios en el Parque y emergencias", ["incendio", "Rano Raraku", "moai", "tsunami"]],
    seguridad: ["Seguridad y ley de residencia", ["ley de residencia", "control migratorio", "Carabineros", "robo"]],
    salud: ["Salud: Hospital Hanga Roa y traslados", ["Hospital Hanga Roa", "traslado", "evacuación aeromédica"]],
    educacion: ["Educación e idioma rapa nui", ["Aldea Educativa", "lengua rapa nui", "escuela", "liceo"]],
    transito: ["Conectividad aérea y abastecimiento", ["vuelos", "LATAM", "aeropuerto", "Mataveri", "conectividad", "barco", "abastecimiento"]],
    aseo: ["Residuos y conservación de la isla", ["residuos", "reciclaje", "vertedero", "conservación"]],
    turismo: ["Turismo, Parque Nacional y Ma'u Henua", ["Parque Nacional Rapa Nui", "Ma'u Henua", "Tapati", "moai", "turistas"]]}},
  "Juan Fernández": {p: "Archipiélago de pesca de langosta y conservación", l: ["Robinson Crusoe", "San Juan Bautista", "Alejandro Selkirk", "archipiélago"], x: [], s: ["transito", "turismo", "salud"], e: {
    agua: ["Agua y energía en la isla", ["agua potable", "energía", "generador", "diésel", "corte de luz"]],
    emergencias: ["Tsunami, temporales y emergencias", ["tsunami", "alerta", "temporal", "marejada", "evacuación", "SHOA"]],
    salud: ["Salud: posta y evacuaciones aeromédicas", ["posta", "evacuación aeromédica", "traslado", "médico"]],
    transito: ["Conectividad aérea y marítima", ["vuelos", "avión", "barcaza", "Armada", "conectividad", "aeródromo", "subsidio"]],
    aseo: ["Residuos y conservación de la isla", ["residuos", "reciclaje", "especies invasoras", "conservación", "Parque Nacional"]],
    turismo: ["Langosta, pesca y turismo insular", ["langosta", "pesca", "pescadores", "Área Marina Protegida", "turistas"]]}},
  "La Calera": {p: "Ciudad industrial del cemento y nudo vial y ferroviario", l: ["Artificio", "Pachacama"], x: ["Cundinamarca"], s: ["aseo", "seguridad", "transito"], e: {
    seguridad: ["Seguridad en barrios y comercio", ["delincuencia", "balacera", "narcotráfico", "comercio"]],
    salud: ["Salud: Hospital Mario Sánchez y Cesfam", ["Hospital Mario Sánchez", "SAPU", "lista de espera"]],
    transito: ["Ruta 5, camiones y tren", ["Ruta 5", "camiones", "tren", "EFE", "Ruta 60"]],
    aseo: ["Medio ambiente: cementera y polvo", ["Cementos Melón", "cementera", "polvo", "material particulado", "contaminación"]],
    turismo: ["Empleo, industria y comercio", ["empleo", "industria", "comercio", "cesantía", "emprendedores"]]}},
  "La Cruz": {p: "Comuna agrícola de paltas en rápida urbanización", l: ["Pocochay"], x: ["Cruz Roja", "Santa Cruz", "Vera Cruz"], s: ["agua", "transito", "seguridad"], e: {
    agua: ["Agua: paltos, pozos y sequía", ["paltos", "riego", "pozos", "agricultores", "APR"]],
    transito: ["Crecimiento urbano y congestión", ["congestión", "loteos", "condominios", "Ruta 60"]],
    turismo: ["Agricultura de exportación y empleo", ["paltas", "exportación", "agricultura", "temporeros", "empleo"]]}},
  "La Ligua": {p: "Capital provincial de tejidos y dulces, golpeada por la sequía", l: ["Valle Hermoso", "La Chimba", "Pullally", "Longotoma", "Los Molles", "Pichicuy"], x: [], s: ["agua", "salud", "turismo"], e: {
    agua: ["Agua: crisis hídrica y APR", ["crisis hídrica", "APR", "camión aljibe", "camiones aljibe", "decreto de escasez", "paltos", "pozos", "río La Ligua"]],
    salud: ["Salud: Hospital de La Ligua y Cesfam", ["Hospital de La Ligua", "SAPU", "lista de espera", "Biprovincial"]],
    transito: ["Ruta 5 Norte y caminos", ["Ruta 5", "caminos rurales", "accidente", "peaje"]],
    turismo: ["Tejidos, dulces y comercio", ["tejidos", "dulces", "comercio", "artesanos", "Los Molles"]]}},
  "Limache": {p: "Ciudad agrícola del tomate limachino, entre valle y cerro", l: ["San Francisco de Limache", "Limache Viejo", "Lliu Lliu", "Tabolango"], x: [], s: ["agua", "emergencias", "transito"], e: {
    agua: ["Agua: sequía, estero y riego", ["estero Limache", "riego", "agricultores", "APR", "pozo"]],
    emergencias: ["Incendios forestales y de interfaz", ["incendio forestal", "interfaz", "Conaf", "megaincendio"]],
    transito: ["Tren a Valparaíso y rutas", ["Merval", "tren", "EFE", "extensión del tren", "Ruta 62"]],
    turismo: ["Agricultura, tomate y comercio", ["tomate limachino", "agricultores", "feria", "comercio", "agricultura"]]}},
  "Llaillay": {p: "Nudo vial y ferroviario agrícola, la ciudad del viento", l: ["Llay Llay", "Las Vegas"], x: [], s: ["agua", "transito", "seguridad"], e: {
    agua: ["Agua: APR, riego y sequía", ["APR", "agua potable rural", "riego", "canal", "camión aljibe"]],
    transito: ["Ruta 5, enlaces y tren", ["Ruta 5", "enlace", "camiones", "tren", "EFE", "accidente"]],
    turismo: ["Agricultura y empleo", ["agricultura", "temporeros", "empleo", "comercio"]]}},
  "Los Andes": {p: "Ciudad cordillerana del paso a Argentina y la minería del cobre", l: ["Río Blanco", "Saladillo", "Portillo", "Guardia Vieja"], x: ["cordillera de los Andes", "Universidad de los Andes", "Clínica Universidad de los Andes"], s: ["transito", "aseo", "seguridad"], e: {
    agua: ["Agua: sequía, glaciares y río Aconcagua", ["río Aconcagua", "glaciares", "APR", "riego"]],
    emergencias: ["Aluviones, nevazones e incendios", ["aluvión", "alud", "nevazón", "temporal", "incendio forestal"]],
    seguridad: ["Seguridad y control fronterizo", ["control fronterizo", "contrabando", "narcotráfico", "Aduanas", "PDI"]],
    salud: ["Salud: Hospital San Juan de Dios y Cesfam", ["Hospital San Juan de Dios", "SAPU", "lista de espera"]],
    transito: ["Paso Cristo Redentor y camiones", ["Cristo Redentor", "Los Libertadores", "paso fronterizo", "camiones", "Ruta 60", "cierre del paso", "Caracoles"]],
    aseo: ["Medio ambiente: minería Andina y glaciares", ["Codelco Andina", "Andina", "relaves", "minería", "glaciares", "contaminación"]],
    turismo: ["Minería, comercio y turismo de montaña", ["minería", "Codelco", "empleo", "Portillo", "nieve", "comercio"]]}},
  "Nogales": {p: "Comuna minera y agrícola, junto a El Soldado", l: ["El Melón", "El Carmen"], x: ["Arizona", "Sonora", "México"], s: ["aseo", "agua", "salud"], e: {
    agua: ["Agua: sequía y uso minero", ["APR", "agua potable", "minera", "pozos"]],
    aseo: ["Medio ambiente: relaves de El Soldado", ["El Soldado", "relave", "relaves", "Anglo American", "polvo", "contaminación"]],
    turismo: ["Minería, empleo y agricultura", ["minería", "empleo", "Anglo American", "agricultura", "comercio"]]}},
  "Olmué": {p: "Comuna rural y turística a los pies de La Campana", l: ["Granizo", "Quebrada Alvarado", "Lo Narváez", "La Dormida"], x: [], s: ["agua", "emergencias", "turismo"], e: {
    agua: ["Agua: APR y escasez rural", ["APR", "agua potable rural", "camión aljibe", "escasez hídrica", "pozo"]],
    emergencias: ["Incendios en La Campana e interfaz", ["incendio forestal", "Parque Nacional La Campana", "Conaf", "brigadistas", "interfaz"]],
    transito: ["Cuesta La Dormida y caminos", ["La Dormida", "Cuesta La Dormida", "caminos rurales", "ruta"]],
    turismo: ["Festival del Huaso y turismo rural", ["Festival del Huaso", "huaso", "turismo rural", "La Campana", "cabañas"]]}},
  "Panquehue": {p: "Comuna rural y vitivinícola del Aconcagua", l: [], x: [], s: ["agua", "turismo", "transito"], e: {
    agua: ["Agua: APR y riego de viñedos", ["APR", "agua potable rural", "riego", "viñedos", "sequía"]],
    turismo: ["Vino, agricultura y turismo rural", ["vino", "viña", "viñedos", "agricultura", "turismo rural", "enoturismo"]]}},
  "Papudo": {p: "Balneario de temporada del litoral norte", l: [], x: [], s: ["agua", "turismo", "aseo"], e: {
    agua: ["Agua: abastecimiento en temporada", ["corte de agua", "agua potable", "camión aljibe", "sequía"]],
    emergencias: ["Marejadas e incendios", ["marejada", "incendio forestal", "Senapred"]],
    turismo: ["Turismo y temporada de verano", ["segunda vivienda", "veraneantes", "turistas", "playa"]]}},
  "Petorca": {p: "Comuna rural del interior, emblema de la crisis hídrica", l: ["Chincolco", "Hierro Viejo", "Pedegua", "El Sobrante"], x: [], s: ["agua", "salud", "turismo"], e: {
    agua: ["Agua: crisis hídrica, APR y paltos", ["crisis hídrica", "APR", "camión aljibe", "camiones aljibe", "decreto de escasez", "paltos", "derechos de agua", "pozos", "río Petorca"]],
    emergencias: ["Incendios y emergencias rurales", ["incendio forestal", "Conaf", "temporal"]],
    salud: ["Salud rural: postas y traslados", ["posta", "Hospital de Petorca", "traslado", "ronda médica"]],
    transito: ["Caminos rurales y conectividad", ["caminos rurales", "ruta", "conectividad", "transporte rural"]],
    turismo: ["Agricultura, empleo y pequeña minería", ["agricultura", "pequeña minería", "empleo", "temporeros", "pirquineros"]]}},
  "Puchuncaví": {p: "Comuna costera y rural con el polo industrial de Ventanas", l: ["Ventanas", "Maitencillo", "Horcón", "La Greda", "Campiche", "Pucalán", "La Laguna"], x: [], s: ["aseo", "salud", "agua"], e: {
    agua: ["Agua: APR y sequía rural", ["APR", "agua potable rural", "camión aljibe", "escasez hídrica"]],
    emergencias: ["Episodios ambientales e incendios", ["intoxicación", "emergencia ambiental", "episodio crítico", "incendio forestal"]],
    salud: ["Salud: metales pesados y atención primaria", ["metales pesados", "intoxicación", "posta", "Cesfam"]],
    educacion: ["Educación: escuelas y suspensión de clases", ["La Greda", "suspensión de clases", "escuela"]],
    transito: ["Rutas costeras y caminos rurales", ["F-30-E", "caminos rurales", "ruta"]],
    aseo: ["Zona de sacrificio y fundición Ventanas", ["zona de sacrificio", "contaminación", "Codelco Ventanas", "fundición", "termoeléctrica", "plan de descontaminación", "emanaciones"]],
    turismo: ["Maitencillo, Horcón y caletas", ["Maitencillo", "Horcón", "caleta", "turistas", "pesca artesanal"]]}},
  "Putaendo": {p: "Comuna agrícola y patrimonial frente al proyecto minero Vizcachitas", l: ["Rinconada de Silva", "Las Coimas", "Quebrada Herrera", "Granallas"], x: [], s: ["agua", "aseo", "turismo"], e: {
    agua: ["Agua: sequía, río Putaendo y APR", ["río Putaendo", "embalse Chacrillas", "APR", "riego", "camión aljibe"]],
    aseo: ["Medio ambiente: Vizcachitas y río Rocín", ["Vizcachitas", "Los Andes Copper", "minería", "río Rocín", "evaluación ambiental"]],
    turismo: ["Patrimonio, agricultura y turismo", ["patrimonio", "Cruce de los Andes", "turismo", "agricultura"]]}},
  "Quillota": {p: "Capital provincial agrícola de paltas y chirimoyas", l: ["Boco", "San Pedro de Quillota", "Pocochay", "Manzanar"], x: [], s: ["agua", "salud", "seguridad"], e: {
    agua: ["Agua: paltos, riego y río Aconcagua", ["río Aconcagua", "riego", "paltos", "agricultores", "pozos", "Junta de Vigilancia"]],
    salud: ["Salud: Hospital Biprovincial y Cesfam", ["Hospital Biprovincial", "Biprovincial", "SAPU", "lista de espera"]],
    transito: ["Ruta 60, accesos y transporte", ["Ruta 60", "Ruta 5", "congestión", "micro"]],
    turismo: ["Agricultura, paltas y comercio", ["paltas", "chirimoya", "agricultura", "temporeros", "exportación", "comercio"]]}},
  "Quilpué": {p: "Ciudad residencial del Gran Valparaíso, afectada por el megaincendio de 2024", l: ["El Belloto", "Belloto Norte", "Paso Hondo", "Colliguay"], x: [], s: ["emergencias", "seguridad", "transito"], e: {
    agua: ["Agua: suministro y sectores altos", ["Esval", "corte de agua", "Colliguay"]],
    emergencias: ["Incendios y reconstrucción", ["megaincendio", "incendio forestal", "reconstrucción", "damnificados", "Conaf", "interfaz"]],
    salud: ["Salud: Hospital de Quilpué y Cesfam", ["Hospital de Quilpué", "SAPU", "SAR"]],
    transito: ["Tren, Troncal Sur y congestión", ["Merval", "tren", "EFE", "Troncal Sur", "congestión", "micro"]],
    turismo: ["Comercio y economía local", ["comercio", "emprendedores", "feria", "empleo"]]}},
  "Quintero": {p: "Bahía industrial y caleta, zona de sacrificio ambiental", l: ["Loncura", "Ventanas", "Ritoque", "Bahía de Quintero", "Valle Alegre"], x: ["Juan Fernando Quintero"], s: ["aseo", "salud", "agua"], e: {
    agua: ["Agua: suministro y sequía en la bahía", ["Esval", "corte de agua", "agua potable"]],
    emergencias: ["Intoxicaciones, varamientos y emergencias", ["intoxicación", "intoxicados", "varamiento", "derrame", "emergencia ambiental", "alerta ambiental"]],
    salud: ["Salud: intoxicaciones y atención", ["intoxicación", "Hospital de Quintero", "metales pesados", "SAPU"]],
    educacion: ["Educación: escuelas y suspensión de clases", ["suspensión de clases", "escuela", "liceo"]],
    aseo: ["Zona de sacrificio y contaminación", ["zona de sacrificio", "contaminación", "dióxido de azufre", "Ventanas", "termoeléctrica", "plan de descontaminación", "emanaciones", "GNL"]],
    turismo: ["Pesca artesanal, caletas y turismo", ["pesca artesanal", "caleta", "pescadores", "turistas"]]}},
  "Rinconada": {p: "Comuna rural agrícola del valle de Los Andes", l: [], x: ["Rinconada de Maipú", "Rinconada de Silva"], s: ["agua", "seguridad", "turismo"], e: {
    agua: ["Agua: APR, riego y sequía", ["APR", "agua potable rural", "riego", "canal", "sequía"]],
    seguridad: ["Seguridad rural", ["abigeato", "robo en parcelas", "robo", "Carabineros"]],
    turismo: ["Agricultura, uva y empleo", ["uva", "agricultura", "temporeros", "empleo"]]}},
  "San Antonio": {p: "Principal puerto de Chile, con el Puerto Exterior en marcha", l: ["Llolleo", "Barrancas", "Tejas Verdes", "Lo Gallardo", "Cuncumén"], x: ["Texas", "Spurs", "NBA", "San Antonio de Padua"], s: ["seguridad", "turismo", "transito"], e: {
    emergencias: ["Marejadas, incendios y emergencias", ["marejada", "incendio forestal", "tsunami", "temporal"]],
    seguridad: ["Seguridad y narcotráfico en el puerto", ["narcotráfico", "balacera", "homicidio", "droga", "contenedores", "PDI"]],
    salud: ["Salud: Hospital Claudio Vicuña y Cesfam", ["Hospital Claudio Vicuña", "SAPU", "SAR", "lista de espera"]],
    transito: ["Camiones, Ruta 78 y accesos al puerto", ["camiones", "Ruta 78", "acceso al puerto", "congestión"]],
    turismo: ["Puerto, empleo y comercio", ["Puerto Exterior", "puerto", "portuarios", "empleo", "cesantía", "comercio"]]}},
  "San Esteban": {p: "Comuna rural y cordillerana, entre agricultura y minería", l: ["Lo Calvo", "Río Colorado"], x: [], s: ["agua", "aseo", "turismo"], e: {
    agua: ["Agua: APR, riego y sequía", ["APR", "agua potable rural", "riego", "canal", "sequía"]],
    aseo: ["Medio ambiente: minería y glaciares", ["minería", "Andina", "glaciares", "relaves", "contaminación"]],
    turismo: ["Agricultura, minería y empleo", ["agricultura", "minería", "empleo", "temporeros"]]}},
  "San Felipe": {p: "Capital provincial agrícola del valle de Aconcagua", l: ["Curimón", "El Almendral", "Algarrobal"], x: ["Venezuela", "Yaracuy", "Baja California"], s: ["agua", "salud", "seguridad"], e: {
    agua: ["Agua: sequía, río Aconcagua y APR", ["río Aconcagua", "riego", "APR", "agricultores", "Junta de Vigilancia", "camión aljibe"]],
    salud: ["Salud: Hospital San Camilo y Cesfam", ["Hospital San Camilo", "SAPU", "lista de espera", "Servicio de Salud Aconcagua"]],
    transito: ["Ruta 60, accesos y transporte", ["Ruta 60", "congestión", "micro", "camiones"]],
    turismo: ["Agricultura, uva y comercio", ["uva", "agricultura", "temporeros", "exportación", "comercio", "nueces"]]}},
  "Santa María": {p: "Comuna rural de uva y frutales en el valle de Aconcagua", l: ["Jahuel", "Santa Filomena"], x: ["Federico Santa María", "Universidad Santa María", "USM", "Clínica Santa María"], s: ["agua", "transito", "salud"], e: {
    agua: ["Agua: APR y riego de frutales", ["APR", "agua potable rural", "riego", "canal", "sequía"]],
    transito: ["Caminos rurales y transporte", ["caminos rurales", "transporte rural", "micro", "accidente"]],
    turismo: ["Agricultura, uva y turismo termal", ["uva", "agricultura", "temporeros", "Termas de Jahuel"]]}},
  "Santo Domingo": {p: "Comuna costera residencial y agrícola en la desembocadura del Maipo", l: ["Rocas de Santo Domingo", "Bucalemu", "San Enrique", "El Convento"], x: ["República Dominicana", "dominicano", "dominicana", "Ecuador"], s: ["agua", "aseo", "emergencias"], e: {
    agua: ["Agua: sequía y riego agrícola", ["APR", "riego", "agricultores", "pozos"]],
    emergencias: ["Incendios forestales y marejadas", ["incendio forestal", "marejada", "Conaf"]],
    aseo: ["Medio ambiente: humedal del Maipo", ["humedal", "desembocadura", "río Maipo", "santuario", "aves", "contaminación"]],
    turismo: ["Turismo, segunda vivienda y agro", ["segunda vivienda", "turistas", "agricultura", "Rocas de Santo Domingo"]]}},
  "Valparaíso": {p: "Capital regional, puerto y ciudad patrimonial", l: ["Playa Ancha", "Placilla", "Laguna Verde", "Rodelillo", "Cerro Barón", "Cerro Alegre", "Cerro Concepción", "Almendral"], x: [], s: ["emergencias", "seguridad", "aseo"], e: {
    agua: ["Agua: cortes y redes en los cerros", ["Esval", "corte de agua", "matriz", "rotura", "cerros"]],
    emergencias: ["Incendios en cerros e interfaz", ["incendio forestal", "interfaz", "quebrada", "cortafuego", "Conaf", "temporal"]],
    seguridad: ["Seguridad en el plan y los cerros", ["comercio ambulante", "comercio ilegal", "balacera", "narcotráfico", "asalto", "turbazo"]],
    salud: ["Salud: Hospital Van Buren y Cesfam", ["Hospital Carlos Van Buren", "Van Buren", "SAPU", "SAR", "lista de espera"]],
    educacion: ["Educación: liceos y escuelas públicas", ["liceo emblemático", "toma", "SLEP"]],
    transito: ["Ascensores, micros y conectividad", ["ascensor", "ascensores", "trolebús", "Merval", "tren", "Avenida Argentina", "micro"]],
    aseo: ["Aseo: basura y microbasurales en cerros", ["microbasural", "recolección", "relleno sanitario", "El Molle", "limpieza", "cerros"]],
    turismo: ["Turismo, patrimonio y cruceros", ["patrimonio", "Unesco", "cruceros", "Año Nuevo en el Mar", "turistas", "Barrio Puerto"]]}},
  "Villa Alemana": {p: "Ciudad residencial del Gran Valparaíso", l: ["Peñablanca"], x: [], s: ["seguridad", "emergencias", "transito"], e: {
    emergencias: ["Incendios de interfaz", ["incendio forestal", "interfaz", "Conaf", "quebrada"]],
    salud: ["Salud: Cesfam y hospital provincial", ["Hospital Marga Marga", "SAPU", "SAR", "hospital"]],
    transito: ["Tren, Troncal Sur y congestión", ["Merval", "tren", "EFE", "Troncal Sur", "congestión", "micro"]],
    turismo: ["Comercio y economía local", ["comercio", "emprendedores", "feria", "empleo"]]}},
  "Viña del Mar": {p: "Ciudad jardín turística, en reconstrucción tras el megaincendio de 2024", l: ["Reñaca", "Miraflores", "Achupallas", "Nueva Aurora", "Santa Inés", "Gómez Carreño", "Chorrillos", "El Olivar", "Villa Independencia", "Recreo"], x: [], s: ["emergencias", "seguridad", "turismo"], e: {
    agua: ["Agua: suministro en sectores altos", ["Esval", "corte de agua", "matriz"]],
    emergencias: ["Incendios y reconstrucción post 2024", ["megaincendio", "incendio forestal", "reconstrucción", "Serviu", "damnificados", "Conaf", "quebrada"]],
    seguridad: ["Seguridad: comercio ambulante y delitos", ["comercio ambulante", "delincuencia", "balacera", "asalto", "cámaras", "narcotráfico"]],
    salud: ["Salud: Hospital Fricke y Cesfam", ["Hospital Gustavo Fricke", "Fricke", "SAPU", "SAR", "lista de espera"]],
    educacion: ["Educación: colegios de la Corporación", ["Corporación Municipal", "matrícula"]],
    transito: ["Congestión y transporte público", ["Merval", "tren", "Avenida Libertad", "Avenida España", "troncal", "Agua Santa", "ciclovía"]],
    aseo: ["Aseo, campamentos y estero Marga Marga", ["microbasural", "estero Marga Marga", "campamento", "recolección"]],
    turismo: ["Turismo: Festival y temporada de playas", ["Festival de Viña", "playas", "Reñaca", "turistas", "ocupación hotelera", "casino"]]}},
  "Zapallar": {p: "Balneario residencial con Cachagua y el Catapilco rural", l: ["Cachagua", "Catapilco", "Isla Cachagua"], x: [], s: ["agua", "turismo", "aseo"], e: {
    agua: ["Agua: Catapilco, APR y temporada", ["APR", "Catapilco", "camión aljibe", "corte de agua"]],
    aseo: ["Medio ambiente: Isla Cachagua y costa", ["Isla Cachagua", "pingüinos", "humedal", "borde costero"]],
    turismo: ["Turismo, temporada y segunda vivienda", ["segunda vivienda", "veraneantes", "turistas", "Cachagua"]]}}
};

/* Respaldo por tipo de territorio: un eje sin foco propio de la comuna toma el de su tipo, nunca el nombre genérico. */
const TIPO_COMUNA = {
  rural: ["Cabildo", "Calle Larga", "Casablanca", "Catemu", "Hijuelas", "La Cruz", "Llaillay", "Nogales", "Olmué", "Panquehue", "Petorca", "Putaendo", "Rinconada", "San Esteban", "Santa María"],
  ciudad: ["La Calera", "La Ligua", "Limache", "Los Andes", "Quillota", "San Felipe"],
  metropolitana: ["Concón", "Quilpué", "Valparaíso", "Villa Alemana", "Viña del Mar"],
  litoral: ["Algarrobo", "Cartagena", "El Quisco", "El Tabo", "Papudo", "Puchuncaví", "Quintero", "San Antonio", "Santo Domingo", "Zapallar"],
  isla: ["Isla de Pascua", "Juan Fernández"]
};
const tipoDe = c => Object.keys(TIPO_COMUNA).find(k => TIPO_COMUNA[k].includes(c)) || "";
const TIPO_FOCO = {
  rural: {agua: ["Agua: APR y sequía rural", ["APR", "agua potable rural", "camión aljibe", "riego", "pozos"]], emergencias: ["Incendios forestales y emergencias rurales", ["incendio forestal", "Conaf", "brigadistas", "temporal"]],
    seguridad: ["Seguridad rural", ["abigeato", "robo en parcelas", "Carabineros", "robo"]], salud: ["Salud rural: Cesfam y postas", ["posta", "posta rural", "ronda médica", "traslado"]],
    educacion: ["Educación: escuelas rurales y transporte", ["escuela rural", "transporte escolar", "liceo"]], transito: ["Caminos rurales y transporte", ["caminos rurales", "transporte rural", "pavimentación", "ruta"]],
    aseo: ["Aseo: microbasurales y residuos rurales", ["microbasural", "quema", "residuos", "recolección"]], turismo: ["Agricultura, empleo y turismo rural", ["agricultura", "temporeros", "empleo", "turismo rural"]]},
  ciudad: {agua: ["Agua: sequía y abastecimiento urbano", ["Esval", "corte de agua", "agua potable", "APR"]], emergencias: ["Incendios y emergencias", ["incendio forestal", "interfaz", "temporal"]],
    seguridad: ["Seguridad en el centro y los barrios", ["delincuencia", "comercio ambulante", "robo", "portonazo", "cámaras"]], salud: ["Salud: hospital y atención primaria", ["hospital", "SAPU", "SAR", "lista de espera"]],
    educacion: ["Educación pública: escuelas y liceos", ["liceo", "escuela", "matrícula", "SLEP"]], transito: ["Tránsito, congestión y transporte", ["congestión", "micro", "transporte", "semáforos"]],
    aseo: ["Aseo, residuos y microbasurales", ["microbasural", "recolección", "relleno sanitario", "reciclaje"]], turismo: ["Comercio, empleo y economía local", ["comercio", "empleo", "emprendedores", "feria"]]},
  metropolitana: {agua: ["Agua: suministro y sectores altos", ["Esval", "corte de agua", "matriz"]], emergencias: ["Incendios de interfaz y temporales", ["incendio forestal", "interfaz", "quebrada", "temporal"]],
    seguridad: ["Seguridad en barrios y sectores altos", ["delincuencia", "balacera", "portonazo", "narcotráfico", "cámaras"]], salud: ["Salud: Cesfam, SAR y hospitales", ["SAPU", "SAR", "hospital", "lista de espera"]],
    educacion: ["Educación pública: escuelas y liceos", ["liceo", "escuela", "matrícula", "SLEP"]], transito: ["Congestión y transporte metropolitano", ["congestión", "Merval", "tren", "micro", "troncal"]],
    aseo: ["Aseo, campamentos y microbasurales", ["microbasural", "campamento", "recolección", "reciclaje"]], turismo: ["Comercio, empleo y economía local", ["comercio", "empleo", "emprendedores", "feria"]]},
  litoral: {agua: ["Agua: abastecimiento en temporada", ["corte de agua", "Esval", "agua potable", "camión aljibe"]], emergencias: ["Marejadas e incendios forestales", ["marejada", "incendio forestal", "tsunami", "Conaf"]],
    seguridad: ["Seguridad en temporada y balnearios", ["balneario", "robo en casas", "segunda vivienda", "temporada"]], salud: ["Salud: atención primaria y temporada", ["SAPU", "posta", "temporada"]],
    educacion: ["Educación municipal: escuelas y liceos", ["escuela", "liceo", "matrícula"]], transito: ["Accesos al litoral y congestión en verano", ["congestión", "acceso", "ruta costera", "temporada"]],
    aseo: ["Aseo: basura en playas y temporada", ["playas", "recolección", "microbasural", "temporada"]], turismo: ["Turismo y temporada de verano", ["turistas", "veraneantes", "segunda vivienda", "temporada"]]},
  isla: {seguridad: ["Seguridad en la isla", ["Carabineros", "robo"]], educacion: ["Educación: escuela y becas al continente", ["escuela", "liceo", "becas", "continente"]]}
};
const focoDe = (c, k) => (TERR[c] && TERR[c].e[k]) || (TIPO_FOCO[tipoDe(c)] || {})[k] || null;

/* Zonas de diputados, senadores y consejo regional: el foco de cada eje para el conjunto del territorio. */
const TERR_ZONA = {
  D6: {p: "Interior de la región: Aconcagua, Marga Marga, Quillota, Petorca y la bahía de Quintero", e: {agua: "Agua: crisis hídrica de Petorca y Aconcagua", emergencias: "Incendios forestales y de interfaz", seguridad: "Seguridad en Marga Marga y el interior", salud: "Salud: Biprovincial y hospitales del interior", educacion: "Educación pública y escuelas rurales", transito: "Conectividad: Ruta 5, Ruta 60 y tren", aseo: "Medio ambiente: Quintero-Puchuncaví y minería", turismo: "Agro, minería y empleo del interior"}},
  D7: {p: "Costa de la región: Valparaíso, Viña del Mar, el litoral central y las islas", e: {agua: "Agua: abastecimiento costero y APR", emergencias: "Megaincendio, reconstrucción y marejadas", seguridad: "Seguridad en Valparaíso, Viña y el puerto", salud: "Salud: Van Buren, Fricke y Claudio Vicuña", educacion: "Educación pública y liceos emblemáticos", transito: "Conectividad: puertos, Ruta 68 y Merval", aseo: "Medio ambiente: humedales, dunas y residuos", turismo: "Turismo, puertos y economía costera"}},
  C6: {p: "Toda la Región de Valparaíso: 38 comunas, del valle al litoral y las islas", e: {agua: "Agua: sequía regional y crisis de Petorca", emergencias: "Incendios forestales y reconstrucción", seguridad: "Seguridad y crimen organizado en la región", salud: "Salud: hospitales y listas de espera", educacion: "Educación pública y universidades regionales", transito: "Conectividad: puertos, rutas y tren regional", aseo: "Medio ambiente: zonas de sacrificio y residuos", turismo: "Desarrollo productivo: puertos, agro y turismo"}},
  V1N: {p: "Viña del Mar, Concón y la bahía de Quintero-Puchuncaví", e: {agua: "Agua: suministro costero y APR rurales", emergencias: "Incendios, reconstrucción y socavones", seguridad: "Seguridad en Viña y el borde costero", salud: "Salud: Fricke y salud ambiental de la bahía", educacion: "Educación pública en Viña y la bahía", transito: "Conectividad: Viña, Concón y ruta costera", aseo: "Medio ambiente: bahía de Quintero y dunas", turismo: "Turismo costero y pesca artesanal"}},
  V2S: {p: "Valparaíso, el valle de Casablanca y Juan Fernández", e: {agua: "Agua: cerros de Valparaíso y valle de Casablanca", emergencias: "Incendios en cerros e interfaz rural", seguridad: "Seguridad en Valparaíso y la Ruta 68", salud: "Salud: Van Buren, Casablanca y Juan Fernández", educacion: "Educación pública y liceos de Valparaíso", transito: "Conectividad: Ruta 68, ascensores e islas", aseo: "Residuos: El Molle y microbasurales", turismo: "Patrimonio, cruceros y enoturismo"}},
  MM: {p: "Provincia de Marga Marga: ciudades residenciales y valle de La Campana", e: {agua: "Agua: sequía, APR y estero Limache", emergencias: "Incendios y reconstrucción en Marga Marga", seguridad: "Seguridad en Quilpué y Villa Alemana", salud: "Salud: hospital provincial y Cesfam", educacion: "Educación pública en Marga Marga", transito: "Conectividad: Merval, Troncal Sur y La Dormida", aseo: "Medio ambiente y residuos en Marga Marga", turismo: "Agro, Festival del Huaso y comercio local"}},
  QUI: {p: "Provincia de Quillota: paltos, flores, cemento y minería", e: {agua: "Agua: paltos, riego y río Aconcagua", emergencias: "Incendios forestales e interfaz", seguridad: "Seguridad en la provincia de Quillota", salud: "Salud: Hospital Biprovincial y Mario Sánchez", educacion: "Educación pública en la provincia", transito: "Conectividad: Ruta 5, Ruta 60 y tren", aseo: "Medio ambiente: cementera y relaves", turismo: "Agro exportador, flores y minería"}},
  SA: {p: "Provincia de San Antonio: el puerto y el litoral de los poetas", e: {agua: "Agua: abastecimiento del litoral en temporada", emergencias: "Marejadas, incendios y emergencias costeras", seguridad: "Seguridad: narcotráfico, puerto y temporada", salud: "Salud: Hospital Claudio Vicuña y Cesfam", educacion: "Educación pública en el litoral", transito: "Conectividad: Ruta 78, camiones y puerto", aseo: "Medio ambiente: humedales y residuos del litoral", turismo: "Puerto Exterior, empleo y temporada"}},
  SF: {p: "Provincia de San Felipe de Aconcagua: valle agrícola, fundición y minería", e: {agua: "Agua: sequía y río Aconcagua", emergencias: "Incendios y emergencias rurales", seguridad: "Seguridad rural en Aconcagua", salud: "Salud: Hospital San Camilo y red Aconcagua", educacion: "Educación pública rural", transito: "Conectividad: Ruta 5, Ruta 60 y caminos", aseo: "Medio ambiente: Chagres y Vizcachitas", turismo: "Agro, uva y vino del Aconcagua"}},
  LA: {p: "Provincia de Los Andes: paso fronterizo, cobre y valle agrícola", e: {agua: "Agua: sequía, glaciares y riego", emergencias: "Aluviones, nevazones e incendios", seguridad: "Seguridad y control fronterizo", salud: "Salud: Hospital San Juan de Dios de Los Andes", educacion: "Educación pública en Los Andes", transito: "Paso Cristo Redentor y camiones", aseo: "Medio ambiente: minería Andina y glaciares", turismo: "Minería, comercio y turismo de montaña"}},
  PET: {p: "Provincia de Petorca: crisis hídrica, tejidos y balnearios del norte", e: {agua: "Agua: crisis hídrica y APR de Petorca", emergencias: "Incendios y emergencias rurales", seguridad: "Seguridad rural y en la Ruta 5 Norte", salud: "Salud: Biprovincial y hospitales de Petorca", educacion: "Educación pública y escuelas rurales", transito: "Conectividad: Ruta 5 Norte y caminos", aseo: "Medio ambiente: minería y borde costero", turismo: "Agro, tejidos y turismo de playa"}},
  IP: {p: "Rapa Nui, territorio especial", e: {}}
};

/* Lente del cargo: nombre genérico del eje y palabras propias de su trabajo. */
const LENTE = {
  local: {n: {}, t: {}},
  reg: {n: {salud: "Salud y red hospitalaria", educacion: "Educación pública", transito: "Conectividad y transporte", aseo: "Medio ambiente y residuos", turismo: "Desarrollo productivo y turismo"},
    t: {agua: ["APR", "DGA", "embalse", "desalinizadora"], emergencias: ["Senapred", "Conaf", "reconstrucción"], seguridad: ["televigilancia", "crimen organizado"], salud: ["hospital", "lista de espera", "Servicio de Salud"],
      educacion: ["SLEP", "universidad", "becas"], transito: ["MOP", "ruta", "tren", "EFE", "conectividad"], aseo: ["medio ambiente", "contaminación", "relleno sanitario"], turismo: ["fomento productivo", "Corfo", "Sercotec", "pymes", "agricultura"]}},
  nac: {n: {salud: "Salud y listas de espera", educacion: "Educación pública", transito: "Conectividad y transporte", aseo: "Medio ambiente", turismo: "Economía, empleo y turismo"},
    t: {agua: ["Código de Aguas", "DGA", "derechos de agua", "desalinizadora", "servicios sanitarios rurales", "APR"], emergencias: ["Senapred", "Conaf", "ley de incendios", "reconstrucción", "damnificados"],
      seguridad: ["crimen organizado", "narcotráfico", "PDI", "Fiscalía", "agenda de seguridad"], salud: ["hospital", "lista de espera", "Fonasa", "Minsal", "Servicio de Salud", "GES"],
      educacion: ["SLEP", "Mineduc", "universidad", "CAE", "FES"], transito: ["MOP", "concesión", "autopista", "EFE", "tren", "puerto", "conectividad"],
      aseo: ["medio ambiente", "contaminación", "evaluación ambiental", "relleno sanitario", "zona de sacrificio"], turismo: ["empleo", "inversión", "pymes", "agricultura", "minería"]}}
};
const lenteDe = rol => rol === "diputado" || rol === "senador" ? "nac" : rol === "core" ? "reg" : "local";
const unicos = a => { const v = new Set(); return a.filter(x => { const k = norm(x); if (!x || v.has(k)) return false; v.add(k); return true; }); };
const lugaresDe = cs => unicos(cs.flatMap(c => (TERR[c] && TERR[c].l) || []));
/* Contexto del tema de la comuna: palabras de gestión local más sus localidades; homónimos propios de cada comuna. */
const ctxComuna = c => unicos(CTX.concat(lugaresDe([c])));
const excComuna = c => unicos((EXC[c] || []).concat((TERR[c] && TERR[c].x) || []));
/* Temas sensibles por defecto: los que más se repiten en las comunas del territorio. */
function sensDe(cs){
  const cnt = {}; cs.forEach(c => ((TERR[c] && TERR[c].s) || []).forEach((k, i) => { cnt[k] = (cnt[k] || 0) + 3 - i; }));
  const r = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a] || Object.keys(SENS).indexOf(a) - Object.keys(SENS).indexOf(b)).slice(0, 3);
  return r.length ? r : ["agua", "emergencias", "seguridad"];
}
function perfilTerritorial(p){
  if (p.tipo !== "Autoridad") return (TERR[p.comuna] && TERR[p.comuna].p) || "";
  if (p.comunas.length === 1) return (TERR[p.comunas[0]] && TERR[p.comunas[0]].p) || "";
  return (TERR_ZONA[p.zona] && TERR_ZONA[p.zona].p) || "";
}
/* Los ocho ejes de una cuenta: nombre, palabras y contexto adaptados a su territorio y su cargo. */
function ejesDe(p){
  const aut = p.tipo === "Autoridad", lente = lenteDe(aut ? p.rol : "municipio"), cs = aut ? p.comunas : [p.comuna];
  const zona = cs.length > 1 && TERR_ZONA[p.zona] ? TERR_ZONA[p.zona].e : {}, L = LENTE[lente];
  const ctx = aut ? unicos(cs.concat(cs.length <= 12 ? lugaresDe(cs) : [], p.variantes || [])) : unicos([p.comuna].concat(lugaresDe([p.comuna])));
  const out = {};
  Object.entries(SENS).forEach(([k, s]) => {
    const focos = cs.map(c => focoDe(c, k)).filter(Boolean);
    // Palabras del territorio, primero las que comparten más comunas.
    const peso = new Map(); focos.forEach(f => f[1].forEach((t, i) => { const q = norm(t), x = peso.get(q) || {t, n: 0, i}; x.n++; peso.set(q, x); }));
    const locales = [...peso.values()].sort((a, b) => b.n - a.n || a.i - b.i).map(x => x.t).slice(0, 30);
    const n = zona[k] || (cs.length === 1 && focos[0] ? focos[0][0] : null) || L.n[k] || s.n;
    out[k] = {n, t: unicos(locales.concat(s.t, L.t[k] || [])), ctx};
  });
  return out;
}
/* Cuentas guardadas antes de esta versión: renombra los ejes que el usuario no cambió, suma las palabras del territorio
   y, si la cuenta no pasó por el asistente, toma las sensibilidades propias del territorio. No borra nada de lo editado. */
function adaptarCuenta(c){
  if (!c || !c.perfil || c.tv === TV) return false;
  const p = c.perfil, aut = p.tipo === "Autoridad", cs = aut ? p.comunas : [p.comuna];
  if (!cs || !cs.length || (!aut && !TERR[p.comuna])) { c.tv = TV; return false; }
  const viejas = !p.sens || !p.sens.length || p.sens.join() === "agua,emergencias,seguridad";
  if (!c.caracterizada && viejas) p.sens = sensDe(cs);
  const ej = ejesDe(p);
  (c.temas || []).concat(c.sugeridos || []).forEach(t => {
    if (t.sens && ej[t.sens]) {
      const e = ej[t.sens];
      if (t.nombre === SENS[t.sens].n) t.nombre = e.n;
      t.terminos = unicos((t.terminos || []).concat(e.t));
      t.contexto = unicos((t.contexto || []).concat(e.ctx));
      if (!c.caracterizada) t.origen = p.sens.includes(t.sens) ? "Sensibilidad" : "Descubrimiento";
    } else if (!aut && t.origen === "Núcleo" && t.nombre === p.comuna + " (comuna)") {
      t.contexto = unicos((t.contexto || []).concat(lugaresDe([p.comuna])));
      t.exclusiones = unicos((t.exclusiones || []).concat(excComuna(p.comuna)));
    }
  });
  c.tv = TV; return true;
}

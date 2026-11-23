/* Clasificación de las noticias, en tres capas que no consumen el cupo de temas del plan:
   1. Categoría: un set fijo por tipo de autoridad. Cada noticia cae en la categoría con más palabras calzadas
      (las del titular pesan el triple). Los temas del plan pasan a ser seguimientos finos dentro de una categoría.
   2. Enfoque: cómo trata la nota el asunto (gestión, reclamo, emergencia, probidad, política, judicial u opinión).
   3. Papel: qué lugar ocupa la autoridad en la nota (protagonista, fuente citada, mencionada o solo su territorio).
   r: responsables que se proponen en «Qué hacer». Las palabras se comparan sin tildes ni mayúsculas, desde el inicio de palabra. */
const CT = (k, n, t, r, w = 1) => ({k, n, t, r, w});
/* Para cargos que no administran servicios locales: lo que pasa en su territorio y no toca su función. Pesa la mitad,
   para que solo se lleve las noticias que no calzan con una categoría propia del cargo. */
const LOCAL = r => CT("local", "Vida local en el territorio", ["turismo", "temporada", "playa", "feria", "fiesta", "costumbrista", "cultura", "patrimonio", "deporte", "plaza", "calles", "veredas", "vecinos", "cesfam", "colegio", "basura", "microbasural", "humedal", "comercio", "obras", "salvavidas", "municipalidad", "municipio", "concejo"], r, 0.5);
const CATS = {
  municipio: [
    CT("agua", "Agua y servicios básicos", ["agua potable", "corte de agua", "cortes de agua", "apr", "aljibe", "sequia", "escasez hidrica", "hidric", "alcantarillado", "sanitaria", "esval", "aguas antofagasta", "pozo", "caudal", "riego", "estero", "agua"], ["Operaciones"]),
    CT("emergencias", "Emergencias y protección civil", ["incendio", "emergencia", "senapred", "bomberos", "brigadas", "marejada", "temporal", "evacuacion", "albergue", "damnificad", "alerta roja", "conaf", "socavon"], ["Emergencias"]),
    CT("seguridad", "Seguridad pública", ["seguridad", "robo", "delincuen", "delito", "carabineros", "patrullaje", "televigilancia", "camaras", "luminarias", "homicidio", "balacera", "detenid", "pdi", "portonazo"], ["Seguridad pública"]),
    CT("salud", "Salud primaria", ["cesfam", "consultorio", "posta", "sapu", "farmacia", "hospital", "vacunacion", "horas medicas", "salud"], ["Salud municipal"]),
    CT("educacion", "Educación", ["colegio", "escuela", "liceo", "educacion", "daem", "slep", "matricula", "jardin infantil", "transporte escolar", "profesores", "apoderados"], ["Educación"]),
    CT("obras", "Obras, vialidad y tránsito", ["obras", "pavimentacion", "veredas", "bache", "calles", "ruta", "transito", "congestion", "semaforo", "permiso de edificacion", "plan regulador", "polideportivo", "construccion", "transporte", "locomocion", "buses", "ciclovia", "puente", "plaza"], ["Obras", "Secplan", "Tránsito"]),
    CT("ambiente", "Medio ambiente y aseo", ["basura", "residuos", "reciclaje", "microbasural", "aseo", "recoleccion", "humedal", "medio ambiente", "contaminacion", "areas verdes", "arbolado", "tenencia responsable"], ["Medio ambiente y aseo"]),
    CT("economia", "Desarrollo económico y turismo", ["turismo", "turistas", "feria", "patente", "comercio", "comerciantes", "empleo", "omil", "emprendedor", "pymes", "vendimia", "vino", "vina", "temporada", "fiesta", "costumbrista", "logistic", "puerto", "inversion", "gremios", "agricultor", "visitantes"], ["Fomento productivo"]),
    CT("social", "Vivienda y comunidad", ["vivienda", "subsidio", "campamento", "comite de vivienda", "junta de vecinos", "juntas de vecinos", "organizaciones", "fondos", "adulto mayor", "adultos mayores", "discapacidad", "deporte", "cultura", "biblioteca", "talleres", "dideco", "registro social"], ["Dideco"]),
    CT("gestion", "Gestión, presupuesto y probidad", ["presupuesto", "licitacion", "trato directo", "contraloria", "sumario", "deuda", "sueldos", "funcionarios", "auditoria", "irregularidad", "probidad", "finanzas", "cuenta publica", "contrato"], ["Administración municipal", "Control", "Jurídico"]),
    CT("politica", "Concejo y relación política", ["concejo", "concejal", "concejala", "concejales", "oposicion", "candidat", "eleccion", "partido"], ["Alcaldía", "Secretaría municipal"])
  ],
  concejal: [
    CT("votaciones", "Votaciones y acuerdos del concejo", ["sesion", "concejo", "aprob", "rechaz", "votacion", "acuerdo", "modificacion presupuestaria"], ["Concejal o concejala", "Prensa"]),
    CT("fiscalizacion", "Fiscalización y probidad municipal", ["denuncia", "contraloria", "sumario", "licitacion", "trato directo", "irregular", "fiscaliz", "oficio", "auditoria", "probidad"], ["Concejal o concejala", "Prensa"]),
    CT("presupuesto", "Presupuesto municipal", ["presupuesto", "deficit", "subvencion", "deuda", "finanzas", "gasto"], ["Concejal o concejala"]),
    CT("ordenanzas", "Ordenanzas y normas locales", ["ordenanza", "plan regulador", "patente", "alcoholes", "reglamento", "normativa"], ["Concejal o concejala"]),
    CT("servicios", "Servicios y obras municipales", ["aseo", "basura", "alumbrado", "luminarias", "areas verdes", "transito", "veredas", "calles", "bache", "pavimentacion", "recoleccion", "agua", "apr", "obras", "polideportivo", "plaza", "proyecto"], ["Equipo territorial"]),
    CT("seguridad", "Seguridad del barrio", ["seguridad", "robo", "delincuen", "camaras", "carabineros", "patrullaje", "delito"], ["Equipo territorial"]),
    CT("saludedu", "Salud y educación municipal", ["cesfam", "salud", "colegio", "escuela", "liceo", "slep", "daem", "educacion"], ["Equipo territorial"]),
    CT("comunidad", "Organizaciones y comunidad", ["junta de vecinos", "juntas de vecinos", "organizaciones", "club", "fondeve", "adulto mayor", "deporte", "cultura"], ["Equipo territorial"]),
    CT("economia", "Comercio, turismo y empleo local", ["comercio", "comerciantes", "feria", "turismo", "temporada", "empleo", "fiesta", "vendimia", "puerto", "logistic"], ["Equipo territorial"]),
    CT("emergencias", "Emergencias en la comuna", ["incendio", "emergencia", "temporal", "marejada", "bomberos", "senapred", "damnificad"], ["Equipo territorial", "Prensa"]),
    CT("politica", "Relación con el alcalde y política local", ["alcalde", "alcaldesa", "oposicion", "oficialismo", "bancada", "partido", "candidat", "eleccion"], ["Concejal o concejala", "Prensa"])
  ],
  core: [
    CT("inversion", "Inversión regional y FNDR", ["fndr", "fril", "inversion regional", "cartera", "financiamiento", "glosa", "presupuesto regional", "recursos regionales", "gobierno regional destina", "fondos regionales"], ["Consejero o consejera", "Equipo territorial"]),
    CT("sesiones", "Sesiones y comisiones del consejo", ["consejo regional", "pleno", "sesion", "comision", "votacion", "aprob", "rechaz", "consejeros"], ["Consejero o consejera"]),
    CT("gobernacion", "Relación con la Gobernación", ["gobernador", "gobernadora", "gobierno regional", "gore", "ejecutivo regional"], ["Consejero o consejera", "Prensa"]),
    CT("probidad", "Probidad y transferencias", ["caso convenios", "convenios con fundaciones", "fundaciones", "transferencias directas", "contraloria", "rendicion de cuentas", "sumario", "irregular", "probidad"], ["Consejero o consejera", "Prensa"]),
    CT("conectividad", "Conectividad y transporte", ["tren", "efe", "merval", "ruta", "mop", "transporte", "conectividad", "buses", "camino", "aeropuerto"], ["Equipo territorial"]),
    CT("agua", "Agua y crisis hídrica", ["apr", "embalse", "desalinizadora", "sequia", "dga", "riego", "hidric", "agua"], ["Equipo territorial"]),
    CT("emergencias", "Emergencias y reconstrucción", ["incendio", "reconstruccion", "senapred", "emergencia", "damnificad", "marejada"], ["Equipo territorial", "Prensa"]),
    CT("productivo", "Desarrollo productivo", ["fomento", "pyme", "agricola", "agro", "pesca", "pescadores", "turismo", "puerto", "corfo", "sercotec", "empleo", "innovacion"], ["Equipo territorial"]),
    CT("ambiente", "Medio ambiente y ordenamiento", ["quintero", "puchuncavi", "contaminacion", "borde costero", "medio ambiente", "ordenamiento territorial", "humedal", "zona de sacrificio"], ["Equipo territorial"]),
    CT("seguridad", "Seguridad regional", ["seguridad", "televigilancia", "drones", "carabineros", "pdi", "delincuen"], ["Equipo territorial"]),
    LOCAL(["Equipo territorial"])
  ],
  diputado: [
    CT("leyes", "Proyectos de ley propios", ["proyecto de ley", "mocion", "boletin", "indicacion", "legisl", "tramitacion", "ley"], ["Equipo legislativo", "Prensa"]),
    CT("votaciones", "Votaciones en Sala y comisiones", ["voto", "votacion", "aprob", "rechaz", "sala", "comision", "camara"], ["Equipo legislativo"]),
    CT("fiscalizacion", "Fiscalización", ["comision investigadora", "oficio", "interpelacion", "acusacion constitucional", "fiscaliz", "requerimiento"], ["Equipo legislativo", "Prensa"]),
    CT("distrito", "Gestión en el distrito", ["visito", "visita", "recorrio", "se reunio", "reunion con", "gestiones", "gestiono", "en terreno", "audiencia"], ["Equipo territorial"]),
    CT("emergencias", "Emergencias y reconstrucción", ["incendio", "reconstruccion", "damnificad", "emergencia", "senapred", "marejada", "temporal"], ["Equipo territorial", "Prensa"]),
    CT("seguridad", "Seguridad y crimen organizado", ["seguridad", "crimen organizado", "narcotrafico", "delincuen", "fiscalia", "pdi", "carabineros", "homicid"], ["Equipo legislativo", "Prensa"]),
    CT("salud", "Salud", ["salud", "lista de espera", "listas de espera", "hospital", "fonasa", "cesfam", "isapre"], ["Equipo legislativo"]),
    CT("educacion", "Educación", ["educacion", "slep", "cae", "fes", "universidad", "colegio", "liceo", "profesores"], ["Equipo legislativo"]),
    CT("economia", "Economía, empleo y costo de la vida", ["empleo", "economia", "inflacion", "costo de la vida", "pyme", "impuesto", "combustible", "salario", "pensiones", "cesantia"], ["Equipo legislativo"]),
    CT("ambiente", "Agua, energía y medio ambiente", ["codigo de aguas", "desalin", "sequia", "energia", "medio ambiente", "quintero", "puchuncavi", "contaminacion", "zona de sacrificio", "apr", "agua"], ["Equipo legislativo", "Equipo territorial"]),
    CT("probidad", "Probidad y ética", ["comision de etica", "lobby", "patrimonio", "conflicto de interes", "probidad", "desafuero"], ["Jefatura de prensa", "Asesoría jurídica"]),
    CT("politica", "Partido, bancada y relación con el Gobierno", ["partido", "bancada", "oficialismo", "oposicion", "gobierno", "ministro", "ministra", "presidente", "encuesta", "candidat", "eleccion"], ["Jefatura de prensa"]),
    LOCAL(["Equipo territorial"])
  ],
  senador: [
    CT("leyes", "Proyectos de ley propios", ["proyecto de ley", "mocion", "boletin", "indicacion", "legisl", "tramitacion", "ley"], ["Equipo legislativo", "Prensa"]),
    CT("votaciones", "Votaciones en Sala y comisiones", ["voto", "votacion", "aprob", "rechaz", "sala", "comision", "senado"], ["Equipo legislativo"]),
    CT("fiscalizacion", "Fiscalización", ["oficio", "fiscaliz", "requerimiento", "comision investigadora"], ["Equipo legislativo", "Prensa"]),
    CT("acusaciones", "Acusaciones constitucionales", ["acusacion constitucional", "jurado", "libelo"], ["Equipo legislativo", "Jefatura de prensa"]),
    CT("nombramientos", "Nombramientos", ["nombramiento", "fiscal nacional", "corte suprema", "banco central", "ratific"], ["Equipo legislativo"]),
    CT("region", "Región de Valparaíso", ["puerto", "ruta 68", "tren", "logistic", "borde costero", "megapuerto", "puerto exterior"], ["Equipo territorial"]),
    CT("emergencias", "Emergencias y reconstrucción", ["incendio", "reconstruccion", "damnificad", "emergencia", "senapred", "marejada", "temporal"], ["Equipo territorial", "Prensa"]),
    CT("seguridad", "Seguridad y crimen organizado", ["seguridad", "crimen organizado", "narcotrafico", "delincuen", "fiscalia", "pdi", "carabineros", "homicid"], ["Equipo legislativo", "Prensa"]),
    CT("salud", "Salud", ["salud", "lista de espera", "listas de espera", "hospital", "fonasa", "isapre"], ["Equipo legislativo"]),
    CT("educacion", "Educación", ["educacion", "slep", "cae", "fes", "universidad", "profesores"], ["Equipo legislativo"]),
    CT("economia", "Economía, empleo y costo de la vida", ["empleo", "economia", "inflacion", "costo de la vida", "pyme", "impuesto", "combustible", "salario", "pensiones"], ["Equipo legislativo"]),
    CT("ambiente", "Agua, energía y medio ambiente", ["codigo de aguas", "desalin", "sequia", "energia", "medio ambiente", "quintero", "puchuncavi", "contaminacion", "agua"], ["Equipo legislativo"]),
    CT("probidad", "Probidad y ética", ["comision de etica", "lobby", "patrimonio", "conflicto de interes", "probidad", "desafuero"], ["Jefatura de prensa", "Asesoría jurídica"]),
    CT("politica", "Partido, bancada y relación con el Gobierno", ["partido", "bancada", "oficialismo", "oposicion", "gobierno", "ministro", "ministra", "presidente", "encuesta", "candidat", "eleccion"], ["Jefatura de prensa"]),
    LOCAL(["Equipo territorial"])
  ],
  gobernador: [
    CT("inversion", "Inversión regional y presupuesto", ["fndr", "fril", "presupuesto regional", "ejecucion presupuestaria", "cartera", "inversion regional", "licitacion", "financiamiento", "recursos regionales", "gobierno regional destina", "fondos regionales"], ["Administración regional", "Presupuesto"]),
    CT("consejo", "Relación con el Consejo Regional", ["consejo regional", "consejeros", "consejeras", "core", "sesion", "pleno", "aprob", "rechaz", "votacion"], ["Gobernación", "Administración regional"]),
    CT("probidad", "Probidad y transferencias", ["caso convenios", "convenios con fundaciones", "fundaciones", "transferencias directas", "contraloria", "rendicion de cuentas", "sumario", "irregular", "probidad", "allanamiento", "querella"], ["Jurídica", "Control"]),
    CT("transporte", "Transporte y conectividad", ["transporte", "tren", "merval", "efe", "ruta", "buses", "conectividad", "aeropuerto", "camino"], ["División de Infraestructura y Transporte"]),
    CT("agua", "Agua y crisis hídrica", ["apr", "embalse", "desalinizadora", "sequia", "riego", "hidric", "agua"], ["Infraestructura", "Fomento"]),
    CT("productivo", "Desarrollo productivo e innovación", ["fomento", "pyme", "agro", "agricola", "pesca", "turismo", "corfo", "sercotec", "empleo", "innovacion", "capacitacion", "puerto", "inversiones", "logistic"], ["División de Fomento e Industria"]),
    CT("social", "Desarrollo social", ["programa social", "vivienda", "campamento", "adultos mayores", "adulto mayor", "salud", "hospital", "deporte", "cultura"], ["División de Desarrollo Social"]),
    CT("territorio", "Ordenamiento territorial y medio ambiente", ["ordenamiento territorial", "estrategia regional", "borde costero", "quintero", "puchuncavi", "medio ambiente", "contaminacion", "humedal"], ["División de Planificación"]),
    CT("emergencias", "Emergencias y reconstrucción", ["incendio", "reconstruccion", "damnificad", "emergencia", "senapred", "marejada"], ["Administración regional", "Prensa"]),
    CT("descentralizacion", "Descentralización", ["descentraliz", "traspaso de competencias", "competencias", "rentas regionales", "autonomia regional", "regiones mas fuertes"], ["Gobernación", "Prensa"]),
    CT("gobierno", "Relación con el Gobierno y la Delegación", ["delegado presidencial", "delegada presidencial", "delegacion", "gobierno", "ministro", "ministra", "presidente", "la moneda"], ["Gobernación", "Prensa"]),
    CT("municipios", "Relación con los municipios", ["alcaldes", "alcaldesas", "municipios", "asociacion de municipios", "asociacion de municipalidades", "sedes comunitarias", "convenio con el municipio"], ["Administración regional"]),
    CT("seguridad", "Seguridad", ["seguridad", "televigilancia", "drones", "carabineros", "pdi", "delincuen"], ["Administración regional"]),
    LOCAL(["Administración regional"])
  ],
  delegado: [
    CT("seguridad", "Seguridad pública", ["seguridad", "delincuen", "homicid", "crimen organizado", "carabineros", "pdi", "fiscalia", "querella", "robo", "balacera", "narco"], ["Seguridad pública de la Delegación"]),
    CT("orden", "Orden público y manifestaciones", ["marcha", "protesta", "desordenes", "barricada", "manifestacion", "incidentes", "encapuchados"], ["Seguridad pública", "Delegación"]),
    CT("emergencias", "Emergencias y gestión de riesgo", ["incendio", "temporal", "marejada", "senapred", "alerta roja", "evacuacion", "emergencia", "damnificad", "comite de gestion", "cogrid", "lluvias"], ["Gestión de emergencias"]),
    CT("tomas", "Tomas y campamentos", ["toma de terreno", "tomas", "desalojo", "campamento", "ocupacion ilegal"], ["Delegación", "Jurídica"]),
    CT("conflictos", "Conflictos sociales y laborales", ["paro", "portuarios", "pescadores", "camioneros", "huelga", "mesa de dialogo", "movilizacion"], ["Delegación", "Coordinación"]),
    CT("servicios", "Coordinación de servicios públicos", ["seremi", "servicios publicos", "comite regional", "coordinacion", "gabinete regional"], ["Coordinación de servicios"]),
    CT("migracion", "Migración", ["migrante", "migracion", "expulsion", "frontera", "regularizacion", "extranjeros"], ["Extranjería y migración"]),
    CT("programas", "Programas del Gobierno", ["beneficio", "bono", "subsidio", "pgu", "programa del gobierno", "ayuda del gobierno"], ["Coordinación", "Prensa"]),
    CT("voceria", "Vocería del Gobierno en la región", ["anuncio", "gobierno", "ministro", "ministra", "presidente", "visita presidencial", "ejecutivo"], ["Delegación", "Prensa"]),
    CT("relacion", "Relación con el gobernador y los alcaldes", ["gobernador", "gobernadora", "alcaldes", "alcaldesas", "gobierno regional"], ["Delegación", "Prensa"]),
    CT("probidad", "Probidad y gestión", ["contraloria", "sumario", "contratacion", "nombramiento", "irregular", "probidad"], ["Jurídica"]),
    CT("provincias", "Delegaciones provinciales", ["delegado provincial", "delegada provincial", "delegacion provincial", "delegaciones provinciales", "delegado presidencial provincial", "delegada presidencial provincial"], ["Coordinación provincial"]),
    LOCAL(["Coordinación de servicios"])
  ]
};
CATS.alcalde = CATS.municipio;
const CAT_OTROS = {k: "otros", n: "Otros asuntos", t: [], r: []};
const catRe = k => k.length <= 3 ? termRe(k) : kwRe(k);
const rolDe = (c = cuenta()) => c && c.perfil && c.perfil.tipo === "Autoridad" ? c.perfil.rol : "municipio";
/* Región de la cuenta: la categoría «region» y algunas palabras cambian por región; Valparaíso usa el set de siempre. */
const CAT_REGION = {
  II: {region: CT("region", "Región de Antofagasta", ["mineria", "minera", "cobre", "litio", "codelco", "puerto de antofagasta", "desalin", "hidrogeno verde", "logistic", "borde costero"], ["Equipo territorial"]),
    extra: {agua: ["desaladora", "rio loa"], ambiente: ["tocopilla", "mejillones", "calama", "material particulado", "descarbonizacion", "termoelectrica", "relave", "litio"]}}
};
const CATS_REG = {};
function catsRol(rol, reg){
  const base = CATS[rol] || CATS.municipio, cr = CAT_REGION[reg]; if (!cr) return base;
  const k = rol + "|" + reg;
  return CATS_REG[k] || (CATS_REG[k] = base.map(x => x.k === "region" ? cr.region : cr.extra[x.k] ? {...x, t: x.t.concat(cr.extra[x.k])} : x));
}
const regDe = c => typeof regionCuenta === "function" && c ? regionCuenta(c).id : REGION_DEFECTO;
const catsDe = (c = cuenta()) => catsRol(rolDe(c), regDe(c));
/* Categoría de una noticia: la de más palabras calzadas, contando triple las del titular; empate, la primera del set.
   Sin ninguna palabra, «Otros asuntos». Se guarda por cargo en la noticia agrupada, porque se pide muchas veces por dibujo. */
function categoriaDe(m, c = cuenta()){
  const reg = regDe(c), rol = rolDe(c), ck = reg === REGION_DEFECTO ? rol : rol + "|" + reg; m._cat = m._cat || {}; if (m._cat[ck]) return m._cat[ck];
  const tit = m.notas.map(n => n.ht || norm(n.t)).join(" | "), hay = m.notas.map(n => n.hay).join(" | ");
  let best = null, bs = 0;
  catsRol(rol, reg).forEach(x => { const s = x.w * x.t.reduce((a, k) => { const re = catRe(k); return a + (re.test(tit) ? 3 : re.test(hay) ? 1 : 0); }, 0); if (s > bs) { bs = s; best = x; } });
  return (m._cat[ck] = best || CAT_OTROS);
}

/* Enfoque: el primero que calza en este orden. La opinión se reconoce por el titular; lo demás, por el texto completo. */
const ENF_NOTA = [
  {k: "opinion", n: "Opinión", t: ["columna", "opinion", "carta al director", "editorial"], tit: true},
  {k: "emergencia", n: "Emergencia", t: ["incendio", "emergencia", "temporal", "marejada", "evacuacion", "alerta roja", "senapred", "damnificad", "aluvion"]},
  {k: "probidad", n: "Probidad o denuncia", t: ["contraloria", "sumario", "irregular", "probidad", "malversacion", "fraude", "conflicto de interes", "auditoria", "trato directo", "allanamiento", "comision de etica"]},
  {k: "judicial", n: "Judicial o policial", t: ["tribunal", "formaliz", "querella", "detenid", "juicio", "corte de apelaciones", "recurso de proteccion", "imputad", "fiscalia"]},
  {k: "conflicto", n: "Reclamo o conflicto", t: ["reclam", "denuncia", "protesta", "paro", "critic", "molestia", "rechazo", "acusan", "exigen", "emplaza", "paraliz", "corte de agua", "cortes de agua", "advierten", "piden"]},
  {k: "politica", n: "Político o electoral", t: ["candidat", "eleccion", "partido", "encuesta", "oposicion", "oficialismo", "bancada", "primarias", "campana electoral", "campana presidencial"]},
  {k: "gestion", n: "Gestión o anuncio", t: []}
];
function enfoqueDe(m){
  if (m._enf) return m._enf;
  const tit = m.notas.map(n => n.ht || norm(n.t)).join(" | "), hay = m.notas.map(n => n.hay).join(" | ");
  return (m._enf = ENF_NOTA.find(e => !e.t.length || e.t.some(k => catRe(k).test(e.tit ? tit : hay))));
}

/* Papel de la cuenta en la nota. Protagonista: la nombra el titular. Fuente citada: la nombra el texto junto a un verbo de declaración.
   Mencionada: la nombra solo el texto. Solo su territorio: la noticia ocurre en su zona pero no la nombra. */
const PAPELES = {prot: "Protagonista", fuente: "Fuente citada", menc: "Mencionada", terr: "Solo su territorio"};
const VERBOS_DECL = ["dijo", "señalo", "afirmo", "sostuvo", "indico", "explico", "aseguro", "declaro", "planteo", "advirtio", "comento", "anuncio", "valoro", "destaco", "cuestiono", "critico", "pidio", "respondio"].map(norm);
function papelDe(m){
  if (m._pap) return m._pap;
  const propias = [...m.temas.values()].filter(x => x.tema.persona || (x.tema.origen === "Núcleo" && !/\((comuna|territorio)\)$/.test(x.tema.nombre)));
  let k = "terr";
  if (propias.some(x => x.enTitulo)) k = "prot";
  else if (propias.length) k = m.notas.some(n => VERBOS_DECL.some(v => termRe(v).test(n.hay))) ? "fuente" : "menc";
  return (m._pap = {k, n: PAPELES[k]});
}

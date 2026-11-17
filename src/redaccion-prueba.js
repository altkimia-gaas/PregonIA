/* Redacción · datos de prueba. Solo se usan en el computador de desarrollo (localhost), sin base de datos.
   Noticias, medios, personas y cifras son FICTICIOS: sirven para probar el puntaje, la redacción y las piezas.
   Las autoridades de prueba no existen; la nómina real de src/autoridades.js no se mezcla con noticias inventadas. */
const RD_PRUEBA_AUT = [
  {n: "Andrea Lagos", c: "Andrea Lagos Fuenzalida", rol: "alcalde", zona: "Ficticia", g: "F"},
  {n: "Tomás Vera", c: "Tomás Vera Ibarra", rol: "diputado", zona: "Ficticia", g: "M"}
];
const RD_PRUEBA_NOTAS = (() => {
  const h = x => Date.now() - x * 36e5, u = k => "https://ejemplo.invalid/nota-" + k;
  const N = (k, medio, ambito, horas, titulo, desc, comunas, extra = {}) => ({id: "p" + k, medio, ambito, titulo, desc, url: u(k), ts: h(horas), via: "lectura", comunas, ...extra});
  return [
    N(1, "El Observador Costero", "regional", 1.5, "Corte de agua afectará a cuatro sectores de Casablanca durante 18 horas", "La sanitaria informó trabajos en la matriz principal; habrá camiones aljibe en tres puntos de la comuna.", ["Casablanca"]),
    N(2, "Radio Litoral", "local", 2, "Casablanca: anuncian corte de agua de 18 horas por obras en matriz", "Vecinos de cuatro sectores quedarán sin suministro; la alcaldesa Andrea Lagos pidió acumular agua.", ["Casablanca"]),
    N(3, "@noticiaslitoral (Instagram)", "local", 2.5, "Atención Casablanca: corte de agua de 18 horas en cuatro sectores", "Publicación con los sectores y puntos de camiones aljibe.", ["Casablanca"], {via: "instagram", int: {l: 640, c: 85, s: 0}}),
    N(4, "Diario Nacional", "nacional", 3, "Sanitaria programa corte de agua en Casablanca por obras de mejoramiento", "El corte se extenderá por 18 horas y afectará a cuatro sectores, según la empresa.", ["Casablanca"]),
    N(5, "Portal Quinta Región", "regional", 5, "Consejo regional aprueba 4.200 millones para nuevo centro de salud en San Antonio", "El proyecto contempla un CESFAM con capacidad para 30 mil inscritos; la obra comenzaría en 2027.", ["San Antonio"]),
    N(6, "El Observador Costero", "regional", 6, "Aprueban recursos para CESFAM en San Antonio: inversión de 4.200 millones", "El diputado Tomás Vera valoró la votación del consejo regional.", ["San Antonio"]),
    N(7, "Radio Litoral", "local", 9, "Feria costumbrista reunirá a 40 emprendedores en la plaza de Algarrobo", "La actividad se realizará el fin de semana con entrada liberada.", ["Algarrobo"]),
    N(8, "Diario Nacional", "nacional", 4, "Incendio forestal obliga a evacuar sector rural de Quilpué; Senapred declara alerta roja", "Bomberos y brigadas trabajan en el control del fuego; hay 12 viviendas evacuadas.", ["Quilpué"]),
    N(9, "Portal Quinta Región", "regional", 3.5, "Alerta roja en Quilpué por incendio forestal: evacúan 12 viviendas", "Senapred mantiene la alerta y pide evitar el sector.", ["Quilpué"]),
    N(10, "Página Vecinal Quilpué (Facebook)", "local", 3.8, "Incendio en sector rural de Quilpué: vecinos reportan humo y evacuación", "Publicación de vecinos con fotos del humo.", ["Quilpué"], {via: "facebook", int: {l: 1200, c: 310, s: 450}}),
    N(11, "Radio Litoral", "local", 20, "Liceo de El Quisco gana concurso regional de robótica escolar", "El equipo representará a la región en la final nacional.", ["El Quisco"]),
    N(12, "Portal Quinta Región", "regional", 7, "Gobierno regional de Valparaíso licita estudio de plataforma logística para el puerto", "La licitación busca evaluar alternativas de ubicación y el impacto vial en la región.", ["Región"]),
    N(13, "Radio Litoral", "local", 26, "Municipio de San Antonio inicia operativo de limpieza de playas", "La jornada contará con voluntarios y equipos municipales.", ["San Antonio"])
  ];
})();

/* Calendario de riesgos: fechas que se repiten cada año y en las que ciertos temas suelen estallar (o abrir una oportunidad).
   Sirve para preparar datos, vocería y mensajes antes, no durante. Cada cuenta puede sumar fechas propias y ocultar las que no le aplican.
   Las fechas son ventanas aproximadas; cada cuenta las ajusta a su realidad.
   Cada fecha se lee con la lente del cargo (la misma de territorios.js, pero más fina):
     local    municipio y alcalde: ejecutan y responden por la gestión.
     concejal concejo municipal: fiscaliza y vota (presupuesto, PADEM); no ejecuta.
     reg      gobernador y consejo regional: inversión regional.
     delegado delegación presidencial: coordina al Estado en emergencias y seguridad.
     nac      diputados y senadores: agenda legislativa y gestiones por el territorio.
   cargos: grupos a los que aplica la fecha (sin el campo, a todos). por: nombre, «que» y «prep» propios de un grupo. */
const COSTA = ["Casablanca","Algarrobo","El Quisco","El Tabo","Cartagena","San Antonio"];
const GRUPO_ROL = {municipio: "local", alcalde: "local", concejal: "concejal", core: "reg", gobernador: "reg", delegado: "delegado", diputado: "nac", senador: "nac"};
const grupoCuenta = (c = cuenta()) => GRUPO_ROL[esAut(c) ? c.perfil.rol : "municipio"] || "local";
const HITOS = [
  {id:"estival", nombre:"Temporada estival", desde:[12,15], hasta:[3,1], tipo:"riesgo", comunas:COSTA,
    kw:["playa","turista","turismo","basura","residuos","agua","aljibe","transito","taco","estacionamiento","salvavidas","ahog","ruido","ocupacion"],
    que:"Reclamos por basura, agua y tránsito; accidentes en playas. La ocupación turística suele ser la noticia positiva.",
    prep:["Cifras de refuerzo de aseo, salvavidas y fiscalización listas antes del inicio","Mensaje de bienvenida con servicios y teléfonos útiles para visitantes","Protocolo y vocero definidos ante un accidente en playa","Balance de la temporada preparado para la primera semana de marzo"],
    por:{
      concejal:{que:"Llegan reclamos de vecinos y turistas por basura, agua y tránsito; se pregunta qué fiscaliza el concejo.",
        prep:["Pedir en sesión el plan de aseo, agua y tránsito de la temporada","Canal para recibir reclamos de vecinos y derivarlos al municipio","Balance propio de la temporada para marzo"]},
      reg:{nombre:"Temporada estival en el litoral", que:"Agua, conectividad y seguridad en el litoral ponen a prueba la inversión regional.",
        prep:["Datos de inversión regional en el litoral: agua, caminos y seguridad","Postura sobre los problemas que se repiten cada verano"]},
      delegado:{nombre:"Temporada estival en el litoral", que:"Seguridad, tránsito y emergencias en playas; se pregunta por la coordinación del Estado.",
        prep:["Plan de seguridad y control carretero coordinado con Carabineros","Vocería única ante emergencias en playas","Balance de seguridad de la temporada para marzo"]},
      nac:{nombre:"Temporada estival en el litoral", que:"Agua, tránsito y seguridad en las comunas costeras; se pide postura a las autoridades del territorio.",
        prep:["Datos de agua potable rural y conectividad vial del litoral","Postura sobre los problemas que se repiten cada verano"]}}},
  {id:"incendios", nombre:"Temporada de incendios forestales", desde:[12,1], hasta:[4,30], tipo:"riesgo", comunas:"*",
    kw:["incendio","forestal","conaf","senapred","bomberos","evacua","quema","humo","brigada"],
    que:"Un incendio cerca de zonas pobladas lleva la comuna a la prensa nacional en pocas horas.",
    prep:["Datos de cortafuegos, brigadas y puntos de encuentro verificados","Canal único de información a vecinos acordado con Senapred y Conaf","Plantilla de declaración de emergencia y vocero designado","Lista de teléfonos de emergencia publicada en redes municipales"],
    por:{
      concejal:{que:"Se preguntará si el plan comunal de emergencia está al día y si los vecinos lo conocen.",
        prep:["Pedir en sesión el estado del plan de emergencia y de las brigadas","Difundir teléfonos de emergencia y puntos de encuentro en sus redes","Postura preparada por si un incendio afecta a la comuna"]},
      reg:{que:"Un incendio grave abre la pregunta por la prevención y por los recursos regionales para la reconstrucción.",
        prep:["Cifras de inversión regional en prevención y brigadas","Postura sobre recursos para emergencia y reconstrucción","Vocería coordinada con Senapred si hay emergencia"]},
      delegado:{que:"La Delegación coordina la respuesta del Estado; cada incendio pone a prueba esa coordinación ante la prensa.",
        prep:["Protocolo de vocería única con Senapred, Conaf y municipios","Plantilla de declaración de emergencia y de alerta","Cifras de brigadas, aeronaves y recursos disponibles","Lista de teléfonos de emergencia para difundir"]},
      nac:{que:"Se pedirá postura sobre prevención y recursos para el territorio, sin competir con la autoridad a cargo de la emergencia.",
        prep:["Postura breve sobre recursos de prevención para el territorio","Presencia y vocería coordinadas si hay emergencia, sin competir con la autoridad a cargo","Seguimiento de las leyes y recursos para incendios en el Congreso"]}}},
  {id:"anonuevo", nombre:"Año Nuevo en la costa", desde:[12,28], hasta:[1,2], tipo:"riesgo", comunas:COSTA, cargos:["local","concejal","delegado"],
    kw:["ano nuevo","fuegos artificiales","pirotecnia","aglomeracion","carabineros","transito","fiesta"],
    que:"Aglomeraciones, tránsito colapsado y hechos de seguridad marcan el balance del 1 de enero.",
    prep:["Plan de seguridad y tránsito comunicado con una semana de anticipación","Balance de la noche listo para la mañana del 1 de enero"],
    por:{
      concejal:{prep:["Pedir el plan de seguridad y tránsito antes de la fecha","Difundir el plan entre los vecinos"]},
      delegado:{que:"Seguridad y tránsito marcan el balance; se pregunta por la coordinación con Carabineros.",
        prep:["Plan de seguridad coordinado con Carabineros y municipios","Balance de seguridad listo para la mañana del 1 de enero"]}}},
  {id:"escolar", nombre:"Inicio del año escolar", desde:[2,20], hasta:[3,31], tipo:"riesgo", comunas:"*", cargos:["local","concejal"],
    kw:["colegio","escuela","liceo","transporte escolar","matricula","daem","slep","profesor","infraestructura escolar"],
    que:"Reclamos por transporte escolar, falta de matrícula o colegios con obras pendientes.",
    prep:["Estado de obras y mantención de establecimientos con fechas","Cifras de matrícula y transporte escolar disponibles"],
    por:{concejal:{que:"Los reclamos por transporte escolar, matrícula u obras pendientes llegan al concejo.",
      prep:["Pedir el estado de obras y de transporte escolar antes del inicio","Canal para recibir reclamos de apoderados"]}}},
  {id:"vendimia", nombre:"Fiesta de la Vendimia", desde:[3,1], hasta:[4,15], tipo:"oportunidad", comunas:["Casablanca"], cargos:["local","concejal","reg","nac"],
    kw:["vendimia","vino","vina","enoturismo","cosecha","turismo"],
    que:"Vitrina regional para el turismo y el comercio local del valle.",
    prep:["Invitación a medios regionales con dos semanas de anticipación","Cifras de visitantes y ventas del comercio local para el balance"],
    por:{
      concejal:{prep:["Difundir el programa en sus redes","Sumarse a la actividad con el comercio local"]},
      reg:{que:"Vitrina para el turismo y la economía del valle; espacio para mostrar el apoyo regional al sector.",
        prep:["Cifras de apoyo regional al turismo y al vino del valle","Confirmar presencia y mensaje con los productores"]},
      nac:{que:"Vitrina para el turismo y la economía del valle; espacio para mostrar gestiones por el sector.",
        prep:["Iniciativas de apoyo al turismo y al sector vitivinícola, con su estado","Confirmar presencia y mensaje con los productores"]}}},
  {id:"cuenta", nombre:"Cuenta pública del alcalde", desde:[4,1], hasta:[4,30], tipo:"oportunidad", comunas:"*", cargos:["local","concejal"],
    kw:["cuenta publica","balance","gestion"],
    que:"La prensa contrasta lo anunciado con los reclamos del año.",
    prep:["Informe anual de cobertura por tema (Reportes · Informe de gestión)","Tres logros con cifra y un desafío reconocido","Respuestas preparadas para los dos temas más críticos del año"],
    por:{concejal:{que:"El alcalde rinde cuentas ante el concejo; la prensa busca la mirada de los concejales.",
      prep:["Contraste entre lo anunciado y lo pendiente, con datos","Postura sobre los dos temas más críticos del año"]}}},
  {id:"invierno", nombre:"Campaña de invierno en salud", desde:[4,15], hasta:[8,31], tipo:"riesgo", comunas:"*", cargos:["local","concejal","reg","nac"],
    kw:["cesfam","salud","urgencia","sapu","sar","vacuna","influenza","virus","consultorio","espera"],
    que:"Esperas en urgencias y falta de horas en los Cesfam son el reclamo más repetido.",
    prep:["Horarios de urgencia y vacunación publicados y actualizados","Datos de atenciones y refuerzos para responder reclamos por esperas"],
    por:{
      concejal:{que:"Las esperas en Cesfam y urgencias son el reclamo más repetido; se pregunta qué fiscaliza el concejo.",
        prep:["Pedir en sesión el plan de invierno de la salud municipal","Canal para derivar reclamos de vecinos por esperas"]},
      reg:{que:"Camas, urgencias y listas de espera de la red asistencial de la región.",
        prep:["Datos de inversión regional en salud: hospitales, Cesfam y equipamiento","Postura sobre la presión en urgencias de la región"]},
      nac:{que:"Listas de espera y urgencias saturadas en la red del territorio; se pide postura y gestiones.",
        prep:["Datos de la red de salud del territorio: hospitales y listas de espera","Gestiones ante el Minsal o el Servicio de Salud, con fecha y resultado"]}}},
  {id:"frontales", nombre:"Lluvias, temporales y marejadas", desde:[5,1], hasta:[8,31], tipo:"riesgo", comunas:"*",
    kw:["lluvia","temporal","anega","inunda","corte de luz","sin luz","arbol caido","marejada","borde costero","viento"],
    que:"Calles anegadas, cortes de luz y marejadas en el borde costero; se pregunta por la respuesta municipal.",
    prep:["Puntos críticos de anegamiento y cuadrillas disponibles","Coordinación con la empresa eléctrica y Senapred para avisos","Albergues y ayuda disponible con dirección y teléfono"],
    por:{
      concejal:{que:"Calles anegadas y cortes de luz; se pregunta por la respuesta municipal y por lo que fiscaliza el concejo.",
        prep:["Pedir el catastro de puntos críticos y cuadrillas","Difundir avisos y teléfonos útiles en sus redes"]},
      reg:{que:"Temporales y marejadas ponen a prueba la inversión regional en aguas lluvia y borde costero.",
        prep:["Datos de inversión regional en aguas lluvia y borde costero","Postura sobre recursos para emergencias y reconstrucción"]},
      delegado:{que:"La Delegación coordina alertas y la respuesta del Estado ante temporales y marejadas.",
        prep:["Protocolo de alertas y vocería única con Senapred","Coordinación con la empresa eléctrica para informar cortes","Albergues y ayuda disponible por comuna"]},
      nac:{que:"Calles anegadas, cortes de luz y marejadas en el territorio; se pide postura sobre obras y recursos.",
        prep:["Postura sobre obras de aguas lluvia y borde costero en el territorio","Presencia y vocería coordinadas si hay emergencia"]}}},
  {id:"cuentapres", nombre:"Cuenta Pública presidencial", desde:[5,20], hasta:[6,5], tipo:"oportunidad", comunas:"*", cargos:["reg","delegado","nac"],
    kw:["cuenta publica","presidente","presidenta","anuncio"],
    que:"Los anuncios se leen en clave regional: qué llega al territorio y qué quedó fuera.",
    prep:["Lectura de los anuncios con impacto en el territorio, el mismo día","Postura sobre lo que falta para el territorio"],
    por:{delegado:{prep:["Bajada regional de los anuncios con cifras y plazos","Vocería coordinada con las seremías"]}}},
  {id:"patrimonio", nombre:"Día del Patrimonio", desde:[5,20], hasta:[5,31], tipo:"oportunidad", comunas:"*", cargos:["local","concejal"],
    kw:["patrimonio","historia","museo","recorrido"],
    que:"Espacio para mostrar la identidad de la comuna con cobertura positiva.",
    prep:["Programa de recorridos y espacios abiertos difundido dos semanas antes"],
    por:{concejal:{prep:["Difundir el programa en sus redes y sumarse a un recorrido"]}}},
  {id:"sanpedro", nombre:"Fiesta de San Pedro", desde:[6,25], hasta:[6,30], tipo:"oportunidad", comunas:COSTA, cargos:["local","concejal"],
    kw:["san pedro","pescador","caleta","procesion"],
    que:"Celebraciones en caletas con cobertura regional; buena vitrina para la pesca artesanal.",
    prep:["Programa e invitación a medios con los pescadores de la caleta"],
    por:{concejal:{prep:["Acompañar la celebración con los pescadores y difundirla"]}}},
  {id:"patrias", nombre:"Fiestas Patrias", desde:[9,10], hasta:[9,21], tipo:"riesgo", comunas:"*", cargos:["local","concejal","delegado"],
    kw:["fonda","ramada","fiestas patrias","dieciocho","alcohol","accidente","transito","seguridad"],
    que:"Fiscalización de fondas, accidentes de tránsito y seguridad marcan el balance.",
    prep:["Permisos y fiscalización de fondas informados con anticipación","Balance de seguridad y tránsito listo el 20 de septiembre"],
    por:{
      concejal:{prep:["Pedir el plan de fiscalización de fondas y tránsito","Difundir medidas de seguridad entre los vecinos"]},
      delegado:{que:"Accidentes de tránsito y seguridad marcan el balance; la Delegación coordina los controles.",
        prep:["Plan de controles carreteros coordinado con Carabineros","Balance de seguridad y tránsito listo el 20 de septiembre"]}}},
  {id:"padem", nombre:"PADEM y cierre de cursos", desde:[9,1], hasta:[11,30], tipo:"riesgo", comunas:"*", cargos:["local","concejal"],
    kw:["padem","cierre","fusion","curso","escuela","profesores","apoderados"],
    que:"El cierre o fusión de cursos moviliza a apoderados y profesores.",
    prep:["Explicación simple de los cambios del PADEM con cifras","Reunión con apoderados antes de que la noticia salga en medios"],
    por:{concejal:{que:"El concejo vota el PADEM; los apoderados buscan a los concejales antes de la votación.",
      prep:["Reunirse con los centros de padres de los cursos afectados","Pedir las cifras de matrícula y costos que justifican los cambios","Postura pública antes de la votación"]}}},
  {id:"presupuesto", nombre:"Presupuesto municipal en el concejo", desde:[10,1], hasta:[12,15], tipo:"riesgo", comunas:"*", cargos:["local","concejal"],
    kw:["presupuesto","recorte","deficit","deuda municipal"],
    que:"Críticas de concejales por recortes o prioridades del presupuesto.",
    prep:["Explicación de las prioridades del presupuesto en una página","Respuesta preparada para críticas por recortes"],
    por:{concejal:{nombre:"Votación del presupuesto municipal", que:"El concejo vota el presupuesto; su postura sobre recortes y prioridades será noticia.",
      prep:["Revisar las partidas de las comisiones que integra","Postura pública antes de la votación","Respuesta preparada si vota en contra o pide cambios"]}}},
  {id:"leypresupuestos", nombre:"Ley de Presupuestos en el Congreso", desde:[10,1], hasta:[11,30], tipo:"oportunidad", comunas:"*", cargos:["reg","nac"],
    kw:["ley de presupuestos","presupuesto de la nacion","presupuesto fiscal","partida presupuestaria","glosa"],
    que:"La discusión de partidas define qué recursos llegan al territorio; lo aprobado y lo recortado es noticia regional.",
    prep:["Lista de recursos para el territorio que defendió en la discusión, con montos","Mensaje para medios regionales el día del despacho","Respuesta preparada si una partida del territorio sufre recortes"],
    por:{reg:{nombre:"Ley de Presupuestos y recursos para la región", que:"Del presupuesto nacional depende el marco de inversión regional del año siguiente.",
      prep:["Cifras del marco de inversión regional comparadas con el año anterior","Postura sobre lo que la región pidió y no obtuvo"]}}}
];
const MES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const fechaHito = ([m, d]) => d + " " + MES[m - 1];
const fechaDe = t => { const d = new Date(t); return d.getDate() + " " + MES[d.getMonth()]; };
/* La fecha con el nombre, el texto y la preparación del cargo de la cuenta. */
function hitoPara(h, g){ const v = (h.por || {})[g]; return v ? {...h, ...v} : h; }
function hitosDe(c = cuenta()){
  const g = grupoCuenta(c), oc = new Set(c.ocultos || []);
  return HITOS.filter(h => (h.comunas === "*" || territorio(c).some(x => h.comunas.includes(x))) && (!h.cargos || h.cargos.includes(g)) && !oc.has(h.id))
    .map(h => hitoPara(h, g)).concat((c.hitos || []).map(h => ({...h, propio: true})));
}
/* Fechas del cargo que la cuenta ocultó porque no le aplican (por ejemplo, PADEM en una comuna cuya educación ya está en un SLEP). */
function hitosOcultos(c = cuenta()){ const oc = new Set(c.ocultos || []), g = grupoCuenta(c); return HITOS.filter(h => oc.has(h.id)).map(h => hitoPara(h, g)); }
/* La próxima vez que ocurre (o la actual, si está en curso). */
function ocurrencia(h, ahora = NOW){
  const vuelta = h.hasta[0] < h.desde[0] || (h.hasta[0] === h.desde[0] && h.hasta[1] < h.desde[1]), y = new Date(ahora).getFullYear();
  for (const a of [y - 1, y, y + 1]) {
    const ini = new Date(a, h.desde[0] - 1, h.desde[1]).getTime(), fin = new Date(a + (vuelta ? 1 : 0), h.hasta[0] - 1, h.hasta[1], 23, 59).getTime();
    if (fin >= ahora) return {ini, fin, anio: a, curso: ini <= ahora, dias: Math.max(0, Math.ceil((ini - ahora) / DAY)), quedan: Math.ceil((fin - ahora) / DAY)};
  }
}
/* Calza al inicio de palabra («curso» no calza en «recursos»; «anega» sí en «anegamiento»). */
const kwCache = new Map();
const kwRe = k => { const n = norm(k); if (!kwCache.has(n)) kwCache.set(n, new RegExp("(^|[^a-z0-9])" + n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))); return kwCache.get(n); };
const hitoMenciones = (h, ms) => ms.filter(m => m.notas.some(n => h.kw.some(k => kwRe(k).test(n.hay))));
const prepClave = (h, o) => h.id + ":" + o.anio;
function prepHechas(h, o, c = cuenta()){ return ((c.prep || {})[prepClave(h, o)] || []).filter(i => i < h.prep.length); }
function cuandoHito(o){ return o.curso ? (o.quedan <= 1 ? "Termina hoy" : `En curso · quedan ${o.quedan} días`) : o.dias === 1 ? "Mañana" : `En ${o.dias} días`; }
/* Cuándo, con fecha: «Empieza el 1 dic (en 15 días)», «Ya empezó · termina el 30 nov (quedan 15 días)». */
function cuandoLargo(o){
  if (o.curso) return o.quedan <= 1 ? "Ya empezó · termina hoy" : `Ya empezó · termina el ${fechaDe(o.fin)} (quedan ${o.quedan} días)`;
  return o.dias <= 1 ? `Empieza mañana, ${fechaDe(o.ini)}` : `Empieza el ${fechaDe(o.ini)} (en ${o.dias} días)`;
}
/* Urgencia de una fecha: cruza el plazo, lo que ya publicó la prensa (y si hay críticas) y lo que falta preparar.
   ya: la fecha está cerca (21 días) y ya hay críticas o varias notas, o quedan días contados. semana: la fecha está cerca o ya hay notas.
   tiempo: hay margen. listo: la preparación está completa. */
const URG = {ya: [0, "Actuar ya"], semana: [1, "Esta semana"], tiempo: [2, "A tiempo"], listo: [3, "Preparación lista"]};
function urgenciaHito(h, o, ms, c = cuenta()){
  const rel = hitoMenciones(h, ms), n = rel.length, nCri = rel.filter(m => m.tono === "cri").length, hechas = prepHechas(h, o, c).length, total = h.prep.length, pend = total - hechas;
  const cerca = o.curso ? o.quedan <= 21 : o.dias <= 21, encima = o.curso ? o.quedan <= 7 : o.dias <= 7;
  const k = total && !pend ? "listo" : encima || (cerca && (nCri || n >= 3)) ? "ya" : n || cerca ? "semana" : "tiempo";
  return {k, orden: URG[k][0], t: URG[k][1], n, nCri, hechas, total, pend, sig: h.prep.find((_, i) => !prepHechas(h, o, c).includes(i)) || ""};
}
/* Por qué importa, en una frase. */
function porqueHito(h, u){
  const notas = u.n ? `${plural(u.n, "nota", "notas")} este mes${u.nCri ? `, ${plural(u.nCri, "crítica", "críticas")}` : ""}` : "";
  if (u.k === "listo") return u.n ? `Preparación completa. ${notas.charAt(0).toUpperCase() + notas.slice(1)}.` : "Preparación completa. Aún no hay notas del tema.";
  if (u.n && !u.hechas) return `La prensa ya habla del tema: ${notas}, y la preparación aún no parte.`;
  if (u.n) return notas.charAt(0).toUpperCase() + notas.slice(1) + ".";
  return h.tipo === "oportunidad" ? "Aún no hay notas. Buen momento para proponer la noticia a los medios." : "Aún no hay notas. Es el momento de preparar la versión propia antes de que llegue a la prensa.";
}
function hitosOrdenados(c = cuenta()){ return hitosDe(c).map(h => ({h, o: ocurrencia(h)})).filter(x => x.o).sort((a, b) => (b.o.curso - a.o.curso) || a.o.ini - b.o.ini); }
/* Para la portada: lo que está en curso o empieza en los próximos 45 días, primero lo que más urge. */
function hitosUrgentes(c = cuenta(), ms = menciones(c, 30), max = 3){
  return hitosOrdenados(c).filter(x => x.o.curso || x.o.dias <= 45).map(x => ({...x, u: urgenciaHito(x.h, x.o, ms, c)}))
    .sort((a, b) => a.u.orden - b.u.orden || (a.o.curso ? a.o.quedan : a.o.dias) - (b.o.curso ? b.o.quedan : b.o.dias) || b.u.nCri - a.u.nCri || b.u.n - a.u.n).slice(0, max);
}

/* Portada: lo que está en curso y lo que viene en los próximos 45 días. */
function calendarioInicio(){
  const c = cuenta(), ms = menciones(c, 30), xs = hitosOrdenados(c).filter(x => x.o.curso || x.o.dias <= 45).slice(0, 3);
  if (!xs.length) return "";
  return `<section aria-labelledby="calT">
    <h3 class="dg-sec" id="calT">En el calendario</h3>
    <div class="cal-ini">${xs.map(({h, o}) => { const n = hitoMenciones(h, ms).length, hechas = prepHechas(h, o, c).length;
      return `<article class="cal-c ${h.tipo}">
        <p class="cal-when"><span class="pill ${h.tipo === "riesgo" ? "t-cri" : "t-pos"}">${h.tipo === "riesgo" ? "Riesgo" : "Oportunidad"}</span><span>${cuandoHito(o)}</span></p>
        <h4>${esc(h.nombre)}</h4>
        <p class="cal-que">${esc(h.que || "")}</p>
        <p class="cal-meta">${n ? `<b>${plural(n, "noticia reciente toca", "noticias recientes tocan")} el tema</b>` : "Sin noticias del tema este mes"}${h.prep.length ? ` · preparación ${hechas} de ${h.prep.length}` : ""}</p>
        <div class="cal-acts"><button class="btn sm" data-act="vocero" data-h="${esc(h.id)}">${ri("mic")} Kit de vocería</button><button class="btn ghost sm" data-act="cal-ver" data-h="${esc(h.id)}">Ver preparación</button></div>
      </article>`; }).join("")}</div>
  </section>`;
}

/* Reportes · Calendario de riesgos */
let calForm = false;
function repCalendario(){
  const c = cuenta(), ms = menciones(c, 30), xs = hitosOrdenados(c);
  const grupos = [["En curso", xs.filter(x => x.o.curso)], ["Próximos 60 días", xs.filter(x => !x.o.curso && x.o.dias <= 60)], ["Más adelante", xs.filter(x => !x.o.curso && x.o.dias > 60)]];
  const item = ({h, o}) => { const rel = hitoMenciones(h, ms), hechas = prepHechas(h, o, c), abierto = tState.calOpen === h.id || o.curso;
    return `<details class="cal-i ${h.tipo}" id="hito-${esc(h.id)}" ${abierto ? "open" : ""}>
      <summary><span class="cal-dot" aria-hidden="true"></span><span class="cal-n"><b>${esc(h.nombre)}</b><small>${fechaHito(h.desde)} al ${fechaHito(h.hasta)} · ${h.tipo === "riesgo" ? "Riesgo" : "Oportunidad"}${h.propio ? " · fecha propia" : ""}</small></span><span class="cal-w">${cuandoHito(o)}</span></summary>
      <div class="cal-b">
        ${h.que ? `<p>${esc(h.que)}</p>` : ""}
        ${h.prep.length ? `<fieldset class="cal-prep"><legend>Preparación ${o.anio === new Date(o.ini).getFullYear() ? o.anio : ""} · ${hechas.length} de ${h.prep.length}</legend>${h.prep.map((p, i) => `<label><input type="checkbox" data-act="cal-prep" data-h="${esc(h.id)}" data-i="${i}" ${hechas.includes(i) ? "checked" : ""}> ${esc(p)}</label>`).join("")}</fieldset>` : ""}
        ${rel.length ? `<div class="cal-rel"><p class="hint" style="margin:0 0 6px">${plural(rel.length, "noticia de los últimos 30 días toca", "noticias de los últimos 30 días tocan")} el tema:</p><ul>${rel.slice(0, 3).map(m => `<li>${pillTono(m.tono)} ${esc(m.lead.t)} <span class="muted">· ${esc(MED[m.lead.m].n)}</span></li>`).join("")}</ul></div>` : ""}
        <div class="cal-acts"><button class="btn sm" data-act="vocero" data-h="${esc(h.id)}">${ri("mic")} Kit de vocería</button><button class="btn ghost sm" data-act="cal-com" data-h="${esc(h.id)}">Preparar comunicado</button>${h.propio ? `<button class="btn ghost sm" data-act="cal-del" data-h="${esc(h.id)}">Quitar fecha</button>` : `<button class="btn ghost sm" data-act="cal-ocultar" data-h="${esc(h.id)}">No aplica aquí</button>`}</div>
      </div></details>`; };
  const ocultos = hitosOcultos(c);
  return `<div class="rhead"><h3>${esc(S.org)} · calendario de riesgos</h3><span class="per">${ri("cal")} Próximos 12 meses</span></div>
  <p class="note" style="margin:0 0 14px">Fechas que se repiten cada año y en las que ciertos temas suelen llegar a la prensa, con las tareas que corresponden a ${esAut(c) ? "este cargo" : "un municipio"}. Prepara los datos y la vocería antes; marca lo que ya está listo. Si una fecha no aplica aquí, ocúltala.</p>
  ${grupos.filter(([, l]) => l.length).map(([t, l]) => `<h4 class="cal-g">${t}</h4><div class="cal-l">${l.map(item).join("")}</div>`).join("")}
  ${ocultos.length ? `<p class="hint cal-ocu">${plural(ocultos.length, "fecha oculta porque no aplica", "fechas ocultas porque no aplican")}: ${ocultos.map(h => esc(h.nombre)).join(", ")}. <button class="ini-link" data-act="cal-restaurar">Mostrarlas de nuevo</button></p>` : ""}
  <div class="card cal-nueva" style="margin-top:16px">${calForm ? `<form id="calForm" class="cal-f" novalidate>
      <h3 style="margin:0">Agregar una fecha propia</h3>
      <label class="cap-l">Nombre<input id="calN" required maxlength="60" placeholder="Por ejemplo: Aniversario de la comuna"></label>
      <div class="cap-row"><label class="cap-l">Desde<input id="calD" type="date" required></label><label class="cap-l">Hasta<input id="calH" type="date" required></label></div>
      <div class="cap-row"><label class="cap-l">Tipo<select id="calT2"><option value="riesgo">Riesgo</option><option value="oportunidad">Oportunidad</option></select></label><label class="cap-l">Palabras clave<input id="calK" placeholder="aniversario, desfile, fiesta"></label></div>
      <label class="cap-l">Qué preparar <span class="opc">una tarea por línea, opcional</span><textarea id="calP" rows="3"></textarea></label>
      <p class="cap-err" id="calErr" role="alert" hidden></p>
      <div class="cap-acts"><button class="btn alt" type="submit">Agregar</button><button class="btn" type="button" data-act="cal-form">Cancelar</button></div>
    </form>` : `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><p class="muted" style="margin:0">¿Falta una fecha de ${esc(S.org)}? Aniversario, fiestas locales, sesiones clave del concejo.</p><button class="btn sm" data-act="cal-form">Agregar fecha propia</button></div>`}</div>`;
}
function calGuardar(e){
  e.preventDefault();
  const n = $("#calN").value.trim(), d = $("#calD").value, hh = $("#calH").value, err = $("#calErr");
  if (!n || !d || !hh) { err.textContent = "Completa el nombre y las dos fechas."; err.hidden = false; (!n ? $("#calN") : !d ? $("#calD") : $("#calH")).focus(); return; }
  const md = s => [Number(s.slice(5, 7)), Number(s.slice(8, 10))], c = cuenta();
  const kw = $("#calK").value.split(",").map(x => norm(x.trim())).filter(Boolean);
  const h = {id: "p" + uid(), nombre: n.slice(0, 60), desde: md(d), hasta: md(hh), tipo: $("#calT2").value, kw: kw.length ? kw : [norm(n)], que: "", prep: $("#calP").value.split("\n").map(x => x.trim()).filter(Boolean).slice(0, 8)};
  (c.hitos ||= []).push(h); save(); calForm = false; tState.calOpen = h.id; render();
  toast(`Agregaste «${h.nombre}» al calendario.`, () => { c.hitos = c.hitos.filter(x => x.id !== h.id); save(); render(); });
}
document.addEventListener("submit", e => { if (e.target.id === "calForm") calGuardar(e); });
document.addEventListener("change", e => {
  const b = e.target.closest('[data-act="cal-prep"]'); if (!b) return;
  const c = cuenta(), h = hitosDe(c).find(x => x.id === b.dataset.h); if (!h) return;
  const o = ocurrencia(h), k = prepClave(h, o), i = Number(b.dataset.i), l = new Set((c.prep ||= {})[k] || []);
  b.checked ? l.add(i) : l.delete(i); c.prep[k] = [...l].sort((x, y) => x - y); save();
  const lg = b.closest("fieldset").querySelector("legend"); if (lg) lg.textContent = lg.textContent.replace(/\d+ de (\d+)$/, `${c.prep[k].length} de $1`);
});
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return; const a = b.dataset.act;
  if (a === "cal-ver") { e.preventDefault(); tState.rep = "calendario"; tState.calOpen = b.dataset.h; if (route() === "reportes") render(true); else location.hash = "reportes"; setTimeout(() => document.getElementById("hito-" + b.dataset.h)?.scrollIntoView({block: "start", behavior: "smooth"}), 60); }
  if (a === "cal-form") { calForm = !calForm; render(); if (calForm) setTimeout(() => $("#calN")?.focus(), 0); }
  if (a === "cal-del") { const c = cuenta(), h = (c.hitos || []).find(x => x.id === b.dataset.h); if (!h) return; c.hitos = c.hitos.filter(x => x !== h); save(); render(); toast(`Quitaste «${h.nombre}».`, () => { c.hitos.push(h); save(); render(); }); }
  if (a === "goto-cal") { e.preventDefault(); tState.rep = "calendario"; tState.calOpen = null; if (route() === "reportes") render(true); else location.hash = "reportes"; }
  if (a === "cal-ocultar") { const c = cuenta(), h = hitosDe(c).find(x => x.id === b.dataset.h); if (!h || h.propio) return; (c.ocultos ||= []).push(h.id); save(); render(); toast(`Ocultaste «${h.nombre}».`, () => { c.ocultos = c.ocultos.filter(x => x !== h.id); save(); render(); }); }
  if (a === "cal-restaurar") { const c = cuenta(), antes = (c.ocultos || []).slice(); c.ocultos = []; save(); render(); toast("Las fechas ocultas volvieron al calendario.", () => { c.ocultos = antes; save(); render(); }); }
  if (a === "cal-com") { const h = hitosDe().find(x => x.id === b.dataset.h); tState.draft = null; tState.from = "reportes"; tState.pieza = "comunicado"; tState.enf = h && h.tipo === "oportunidad" ? "anunciar" : "contextualizar"; location.hash = "comunicados"; }
});

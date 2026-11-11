/* Calendario de riesgos: fechas que se repiten cada año y en las que ciertos temas suelen estallar (o abrir una oportunidad).
   Sirve para preparar datos, vocería y mensajes antes, no durante. Cada municipio puede sumar fechas propias.
   Las fechas son ventanas aproximadas; cada municipio las ajusta a su realidad. */
const COSTA = ["Casablanca","Algarrobo","El Quisco","El Tabo","Cartagena","San Antonio"];
const HITOS = [
  {id:"estival", nombre:"Temporada estival", desde:[12,15], hasta:[3,1], tipo:"riesgo", comunas:COSTA,
    kw:["playa","turista","turismo","basura","residuos","agua","aljibe","transito","taco","estacionamiento","salvavidas","ahog","ruido","ocupacion"],
    que:"Reclamos por basura, agua y tránsito; accidentes en playas. La ocupación turística suele ser la noticia positiva.",
    prep:["Cifras de refuerzo de aseo, salvavidas y fiscalización listas antes del inicio","Mensaje de bienvenida con servicios y teléfonos útiles para visitantes","Protocolo y vocero definidos ante un accidente en playa","Balance de la temporada preparado para la primera semana de marzo"]},
  {id:"incendios", nombre:"Temporada de incendios forestales", desde:[12,1], hasta:[4,30], tipo:"riesgo", comunas:"*",
    kw:["incendio","forestal","conaf","senapred","bomberos","evacua","quema","humo","brigada"],
    que:"Un incendio cerca de zonas pobladas lleva la comuna a la prensa nacional en pocas horas.",
    prep:["Datos de cortafuegos, brigadas y puntos de encuentro verificados","Canal único de información a vecinos acordado con Senapred y Conaf","Plantilla de declaración de emergencia y vocero designado","Lista de teléfonos de emergencia publicada en redes municipales"]},
  {id:"anonuevo", nombre:"Año Nuevo en la costa", desde:[12,28], hasta:[1,2], tipo:"riesgo", comunas:COSTA,
    kw:["ano nuevo","fuegos artificiales","pirotecnia","aglomeracion","carabineros","transito","fiesta"],
    que:"Aglomeraciones, tránsito colapsado y hechos de seguridad marcan el balance del 1 de enero.",
    prep:["Plan de seguridad y tránsito comunicado con una semana de anticipación","Balance de la noche listo para la mañana del 1 de enero"]},
  {id:"escolar", nombre:"Inicio del año escolar", desde:[2,20], hasta:[3,31], tipo:"riesgo", comunas:"*",
    kw:["colegio","escuela","liceo","transporte escolar","matricula","daem","slep","profesor","infraestructura escolar"],
    que:"Reclamos por transporte escolar, falta de matrícula o colegios con obras pendientes.",
    prep:["Estado de obras y mantención de establecimientos con fechas","Cifras de matrícula y transporte escolar disponibles"]},
  {id:"vendimia", nombre:"Fiesta de la Vendimia", desde:[3,1], hasta:[4,15], tipo:"oportunidad", comunas:["Casablanca"],
    kw:["vendimia","vino","vina","enoturismo","cosecha","turismo"],
    que:"Vitrina regional para el turismo y el comercio local del valle.",
    prep:["Invitación a medios regionales con dos semanas de anticipación","Cifras de visitantes y ventas del comercio local para el balance"]},
  {id:"cuenta", nombre:"Cuenta pública del alcalde", desde:[4,1], hasta:[4,30], tipo:"oportunidad", comunas:"*",
    kw:["cuenta publica","balance","gestion"],
    que:"La prensa contrasta lo anunciado con los reclamos del año.",
    prep:["Informe anual de cobertura por tema (Reportes · Informe de gestión)","Tres logros con cifra y un desafío reconocido","Respuestas preparadas para los dos temas más críticos del año"]},
  {id:"invierno", nombre:"Campaña de invierno en salud", desde:[4,15], hasta:[8,31], tipo:"riesgo", comunas:"*",
    kw:["cesfam","salud","urgencia","sapu","sar","vacuna","influenza","virus","consultorio","espera"],
    que:"Esperas en urgencias y falta de horas en los Cesfam son el reclamo más repetido.",
    prep:["Horarios de urgencia y vacunación publicados y actualizados","Datos de atenciones y refuerzos para responder reclamos por esperas"]},
  {id:"frontales", nombre:"Lluvias, temporales y marejadas", desde:[5,1], hasta:[8,31], tipo:"riesgo", comunas:"*",
    kw:["lluvia","temporal","anega","inunda","corte de luz","sin luz","arbol caido","marejada","borde costero","viento"],
    que:"Calles anegadas, cortes de luz y marejadas en el borde costero; se pregunta por la respuesta municipal.",
    prep:["Puntos críticos de anegamiento y cuadrillas disponibles","Coordinación con la empresa eléctrica y Senapred para avisos","Albergues y ayuda disponible con dirección y teléfono"]},
  {id:"patrimonio", nombre:"Día del Patrimonio", desde:[5,20], hasta:[5,31], tipo:"oportunidad", comunas:"*",
    kw:["patrimonio","historia","museo","recorrido"],
    que:"Espacio para mostrar la identidad de la comuna con cobertura positiva.",
    prep:["Programa de recorridos y espacios abiertos difundido dos semanas antes"]},
  {id:"sanpedro", nombre:"Fiesta de San Pedro", desde:[6,25], hasta:[6,30], tipo:"oportunidad", comunas:COSTA,
    kw:["san pedro","pescador","caleta","procesion"],
    que:"Celebraciones en caletas con cobertura regional; buena vitrina para la pesca artesanal.",
    prep:["Programa e invitación a medios con los pescadores de la caleta"]},
  {id:"patrias", nombre:"Fiestas Patrias", desde:[9,10], hasta:[9,21], tipo:"riesgo", comunas:"*",
    kw:["fonda","ramada","fiestas patrias","dieciocho","alcohol","accidente","transito","seguridad"],
    que:"Fiscalización de fondas, accidentes de tránsito y seguridad marcan el balance.",
    prep:["Permisos y fiscalización de fondas informados con anticipación","Balance de seguridad y tránsito listo el 20 de septiembre"]},
  {id:"padem", nombre:"PADEM y cierre de cursos", desde:[9,1], hasta:[11,30], tipo:"riesgo", comunas:"*",
    kw:["padem","cierre","fusion","curso","escuela","profesores","apoderados"],
    que:"El cierre o fusión de cursos moviliza a apoderados y profesores.",
    prep:["Explicación simple de los cambios del PADEM con cifras","Reunión con apoderados antes de que la noticia salga en medios"]},
  {id:"presupuesto", nombre:"Presupuesto municipal en el concejo", desde:[10,1], hasta:[12,15], tipo:"riesgo", comunas:"*",
    kw:["presupuesto","recorte","deficit","deuda municipal"],
    que:"Críticas de concejales por recortes o prioridades del presupuesto.",
    prep:["Explicación de las prioridades del presupuesto en una página","Respuesta preparada para críticas por recortes"]}
];
const MES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const fechaHito = ([m, d]) => d + " " + MES[m - 1];
function hitosDe(c = cuenta()){ return HITOS.filter(h => h.comunas === "*" || h.comunas.includes(S.org)).concat((c.hitos || []).map(h => ({...h, propio: true}))); }
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
function hitosOrdenados(c = cuenta()){ return hitosDe(c).map(h => ({h, o: ocurrencia(h)})).filter(x => x.o).sort((a, b) => (b.o.curso - a.o.curso) || a.o.ini - b.o.ini); }

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
        <div class="cal-acts"><button class="btn sm" data-act="vocero" data-h="${esc(h.id)}">${ri("mic")} Kit de vocería</button><button class="btn ghost sm" data-act="cal-com" data-h="${esc(h.id)}">Preparar comunicado</button>${h.propio ? `<button class="btn ghost sm" data-act="cal-del" data-h="${esc(h.id)}">Quitar fecha</button>` : ""}</div>
      </div></details>`; };
  return `<div class="rhead"><h3>${esc(S.org)} · calendario de riesgos</h3><span class="per">${ri("cal")} Próximos 12 meses</span></div>
  <p class="note" style="margin:0 0 14px">Fechas que se repiten cada año y en las que ciertos temas suelen llegar a la prensa. Prepara los datos y la vocería antes; marca lo que ya está listo.</p>
  ${grupos.filter(([, l]) => l.length).map(([t, l]) => `<h4 class="cal-g">${t}</h4><div class="cal-l">${l.map(item).join("")}</div>`).join("")}
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
  if (a === "cal-com") { const h = hitosDe().find(x => x.id === b.dataset.h); tState.draft = null; tState.from = "reportes"; tState.pieza = "comunicado"; tState.enf = h && h.tipo === "oportunidad" ? "anunciar" : "contextualizar"; location.hash = "comunicados"; }
});

/* Kit de vocería exprés: «Me llaman de la radio». En segundos, una hoja para el vocero con lo que pasó, qué hacer,
   tres mensajes con su dato de respaldo, frases a evitar y cinco preguntas probables con su respuesta.
   La parte que no necesita IA aparece al instante; los mensajes los redacta la IA solo con datos del municipio y de la noticia. */
const VOC = {sel: "", libre: "", kits: {}, cargando: false, ctl: null, aviso: "", snap: {}};
function vocOpciones(){
  const c = cuenta(), pend = pendientes(c), sem = menciones(c, 7).filter(m => !pend.includes(m)).sort((a, b) => riesgo(b) - riesgo(a)).slice(0, 10);
  const hs = hitosOrdenados(c).filter(x => x.o.curso || x.o.dias <= 60);
  return {pend, sem, hs};
}
function vocContexto(){
  const [t, id] = [VOC.sel.slice(0, 1), VOC.sel.slice(2)];
  // Copia de la noticia: si las noticias se recargan con el kit abierto, el kit no pierde el tema elegido.
  if (t === "g") { const m = menciones(cuenta(), 30).find(x => x.g === id) || VOC.snap[id]; if (m) { VOC.snap[id] = m; return {tipo: "g", m, tema: m.lead.t}; } }
  if (t === "h") { const h = hitosDe().find(x => x.id === id); if (h) return {tipo: "h", h, o: ocurrencia(h), tema: h.nombre}; }
  return {tipo: "libre", tema: VOC.libre.trim()};
}
const vocClave = x => x.tipo === "libre" ? "l:" + norm(x.tema) : VOC.sel;
/* Datos del municipio: primero las líneas que tocan el tema. */
function vocDatos(x){
  const lineas = (cuenta().base || (esAut() ? baseAutoridad(cuenta().perfil) : baseConocimiento())).split("\n").map(l => l.trim()).filter(l => l && !/^\[completar\]/i.test(l));
  const kw = x.tipo === "g" ? norm(x.m.notas.map(n => n.hay).join(" ")).split(/\s+/).filter(w => w.length > 4) : x.tipo === "h" ? x.h.kw.map(norm) : norm(x.tema).split(/\s+/).filter(w => w.length > 3);
  const toca = l => kw.some(k => kwRe(k).test(norm(l)));
  const rel = lineas.filter(toca);
  return {rel, resto: lineas.filter(l => !toca(l)).slice(0, Math.max(0, 5 - rel.length))};
}
function vocPlantilla(x){
  return {plantilla: true,
    mensajes: [{idea: x.tipo === "h" ? `Qué tiene preparado el municipio para ${x.tema.toLowerCase()}.` : "Qué hizo o hará el municipio frente a lo informado.", dato: "[completar: medida concreta con fecha]"},
      {idea: "Reconocer la preocupación de los vecinos y a quiénes afecta.", dato: "[completar: cuántos vecinos o sectores]"},
      {idea: "Dar un canal concreto de ayuda o información.", dato: "[completar: teléfono, lugar u horario]"}],
    evitar: ["Culpar a otras instituciones o a los vecinos.", "Comprometer plazos o cifras que no estén confirmados.", "Opinar sobre temas que no son de competencia municipal."],
    preguntas: [{p: "¿Desde cuándo sabe el municipio de esta situación?", r: "[completar: fecha y cómo se supo]"}, {p: "¿Qué medidas concretas se tomaron?", r: "[completar: medidas con fecha]"}, {p: "¿Cuándo se va a resolver?", r: "Dar solo un plazo confirmado por la dirección a cargo."}, {p: "¿Quién es el responsable?", r: "[completar: dirección municipal a cargo]"}, {p: "¿Qué pueden hacer hoy los vecinos afectados?", r: "[completar: canal de atención]"}]};
}
function vocPrompt(x){
  const d = vocDatos(x), c = cuenta();
  const tema = x.tipo === "g"
    ? `NOTICIA: ${x.m.lead.t}. Resumen: ${x.m.lead.res}. Medio: ${MED[x.m.lead.m].n}. La publicaron ${x.m.notas.length} medio(s); ${llego(escalera(x.m.notas)).toLowerCase()}. Tono: ${tonoLbl[x.m.tono]}.${respondida(x.m.g) ? " El municipio ya aprobó una respuesta: " + ((S.comunicados.find(y => y.org === S.org && y.g === x.m.g) || {}).texto || "").slice(0, 600) : ""}`
    : x.tipo === "h" ? `FECHA DEL CALENDARIO: ${x.h.nombre} (${fechaHito(x.h.desde)} al ${fechaHito(x.h.hasta)}). Qué suele pasar: ${x.h.que || "sin descripción"}. Preparación prevista: ${x.h.prep.join("; ") || "ninguna"}. Noticias recientes del tema: ${hitoMenciones(x.h, menciones(c, 30)).slice(0, 4).map(m => m.lead.t).join(" | ") || "ninguna"}.`
    : `TEMA: ${x.tema}. Noticias recientes de la comuna: ${menciones(c, 7).slice(0, 5).map(m => m.lead.t).join(" | ") || "ninguna"}.`;
  return `Eres el asesor de vocería de PregonIA para ${esAut() ? "el equipo de " + inst() : inst()}, Chile. El vocero va a una entrevista de radio en minutos y necesita una hoja breve para responder sobre este tema.

${tema}

${datosLbl()} (los únicos que puedes usar como cifras o hechos):
${[...d.rel, ...d.resto].join("\n") || "(no hay datos cargados)"}

Reglas obligatorias:
1. Usa solo hechos de la noticia o de los DATOS DEL MUNICIPIO. Si falta un dato, escribe [completar: qué dato]. No inventes cifras, fechas, nombres ni compromisos. Los datos marcados [Ejemplo] son ficticios: puedes usarlos, pero mantén la marca [Ejemplo].
2. Frases cortas para decir en voz alta, de máximo 25 palabras, en español de Chile, tono institucional y cercano.
3. ${esAut() ? "Tono propio del cargo, sin ataques personales ni descalificaciones a otras autoridades o partidos." : "Sin promoción personal ni partidaria de ninguna autoridad."}

Devuelve solo un objeto JSON con:
- "mensajes": exactamente 3 objetos {"idea": lo que hay que decir, "dato": la cifra o hecho que lo respalda o [completar: …]}.
- "evitar": 3 frases o actitudes que el vocero no debe decir sobre este tema.
- "preguntas": exactamente 5 objetos {"p": pregunta probable del periodista, "r": respuesta sugerida en una o dos frases}.`;
}
function vocValido(j){
  const s = v => typeof v === "string" && v.trim();
  if (!j || !Array.isArray(j.mensajes) || !Array.isArray(j.preguntas)) return null;
  const mensajes = j.mensajes.filter(m => m && s(m.idea)).slice(0, 3).map(m => ({idea: String(m.idea).slice(0, 260), dato: s(m.dato) ? String(m.dato).slice(0, 220) : "[completar: dato de respaldo]"}));
  const preguntas = j.preguntas.filter(q => q && s(q.p)).slice(0, 5).map(q => ({p: String(q.p).slice(0, 200), r: s(q.r) ? String(q.r).slice(0, 320) : "[completar]"}));
  const evitar = (Array.isArray(j.evitar) ? j.evitar : []).filter(s).slice(0, 4).map(v => String(v).slice(0, 200));
  return mensajes.length && preguntas.length ? {mensajes, preguntas, evitar} : null;
}
async function vocGenerar(forzar){
  const x = vocContexto(); if (x.tipo === "libre" && x.tema.length < 3) return;
  const k = vocClave(x); if (VOC.kits[k] && !forzar) return vocPintar();
  const sample = await samplePromise;
  if (!sample) { VOC.kits[k] = vocPlantilla(x); VOC.aviso = "La IA no está disponible en esta vista: usamos una plantilla con lo que hay que completar."; return vocPintar(); }
  VOC.ctl?.abort(); VOC.ctl = new AbortController(); VOC.cargando = true; VOC.aviso = ""; vocPintar();
  try {
    const {text} = await sample(vocPrompt(x), {signal: VOC.ctl.signal, cache: false});
    const j = vocValido(JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)));
    if (!j) throw {code: "formato"};
    VOC.kits[k] = j;
  } catch(err) {
    if (err && err.code === "cancelled") { VOC.aviso = "Detuviste la preparación."; }
    else { VOC.kits[k] = vocPlantilla(x); VOC.aviso = err && err.code === "rate_limited" ? "Llegaste al límite de uso de la IA por ahora: te dejamos una plantilla." : "La IA no respondió a tiempo: te dejamos una plantilla con lo que hay que completar."; }
  } finally { VOC.cargando = false; if (vocContexto().tipo === x.tipo && vocClave(vocContexto()) === k) vocPintar(); }
}
function vocSaber(x){
  if (x.tipo === "g") { const m = x.m, e = escalera(m.notas), a = accion(m), com = respondida(m.g) && S.comunicados.find(y => y.org === S.org && y.g === m.g);
    return `<ul class="voc-hechos">
      <li><b>${esc(m.lead.t)}</b><span>${esc(medioN(m.lead))} · ${ago(m.lead.ts)}${m.notas.length > 1 ? ` · en ${m.notas.length} medios` : ""}</span></li>
      <li><span class="voc-k">Hasta dónde llegó</span>${esc(llego(e))}${ruta(e) ? ` <span class="muted">(${esc(ruta(e))})</span>` : ""}</li>
      <li><span class="voc-k">Qué hacer</span>${esc(a.a)}</li>
      <li><span class="voc-k">Quiénes</span>${esc(a.r)}</li>
      ${com ? `<li><span class="voc-k">Ya respondimos</span><span class="voc-cita">${esc(com.texto.slice(0, 320))}${com.texto.length > 320 ? "…" : ""}</span></li>` : ""}</ul>`; }
  if (x.tipo === "h") { const hechas = prepHechas(x.h, x.o), rel = hitoMenciones(x.h, menciones(cuenta(), 30));
    return `<ul class="voc-hechos">
      <li><b>${esc(x.h.nombre)}</b><span>${fechaHito(x.h.desde)} al ${fechaHito(x.h.hasta)} · ${cuandoHito(x.o)}</span></li>
      ${x.h.que ? `<li><span class="voc-k">Qué suele pasar</span>${esc(x.h.que)}</li>` : ""}
      ${x.h.prep.length ? `<li><span class="voc-k">Preparación</span>${hechas.length} de ${x.h.prep.length} listas${hechas.length < x.h.prep.length ? ` · falta: ${esc(x.h.prep.filter((_, i) => !hechas.includes(i))[0])}` : ""}</li>` : ""}
      <li><span class="voc-k">En la prensa</span>${rel.length ? `${plural(rel.length, "noticia reciente", "noticias recientes")}: ${esc(rel[0].lead.t)}` : "Sin noticias del tema este mes"}</li></ul>`; }
  return `<p class="muted" style="margin:0">Tema libre: la IA prepara mensajes generales. Si es una noticia publicada, búscala en la lista para que use sus datos.</p>`;
}
function vocKitHtml(x){
  const k = VOC.kits[vocClave(x)];
  if (VOC.cargando) return `<div class="voc-load" role="status"><span class="voc-spin" aria-hidden="true"></span>Preparando mensajes y preguntas… <button class="btn ghost sm" type="button" data-act="voc-stop">Detener</button></div>`;
  if (!k) return x.tipo === "libre" ? `<p class="hint" style="margin:0">Escribe el tema y presiona «Preparar».</p>` : "";
  return `${VOC.aviso ? `<p class="note" style="margin:0">${esc(VOC.aviso)}</p>` : ""}
    <section class="voc-s"><h3>Tres mensajes</h3><ol class="voc-msj">${k.mensajes.map(m => `<li><p>${esc(m.idea)}</p><p class="voc-dato"><span>Dato</span>${esc(m.dato)}</p></li>`).join("")}</ol></section>
    ${k.evitar.length ? `<section class="voc-s"><h3>Evita decir</h3><ul class="voc-ev">${k.evitar.map(v => `<li>${esc(v)}</li>`).join("")}</ul></section>` : ""}
    <section class="voc-s"><h3>Preguntas probables</h3><ol class="voc-pq">${k.preguntas.map(q => `<li><p class="q">${esc(q.p)}</p><p>${esc(q.r)}</p></li>`).join("")}</ol></section>`;
}
function vocCuerpo(){
  const x = vocContexto(), d = x.tipo === "libre" && !x.tema ? null : vocDatos(x), {pend, sem, hs} = vocOpciones();
  const op = (v, t) => `<option value="${esc(v)}" ${VOC.sel === v ? "selected" : ""}>${esc(t.length > 90 ? t.slice(0, 88) + "…" : t)}</option>`;
  return `<div class="voc-sel">
      <label class="cap-l">¿Sobre qué te van a preguntar?<select id="vocSel">
        ${pend.length ? `<optgroup label="Críticas sin responder">${pend.map(m => op("g:" + m.g, m.lead.t)).join("")}</optgroup>` : ""}
        ${sem.length ? `<optgroup label="Noticias de la semana">${sem.map(m => op("g:" + m.g, m.lead.t)).join("")}</optgroup>` : ""}
        ${hs.length ? `<optgroup label="Calendario">${hs.map(({h}) => op("h:" + h.id, h.nombre)).join("")}</optgroup>` : ""}
        ${VOC.sel.startsWith("g:") && ![...pend, ...sem].some(m => "g:" + m.g === VOC.sel) && x.m ? op(VOC.sel, x.m.lead.t) : ""}
        <option value="libre" ${VOC.sel === "libre" ? "selected" : ""}>Otro tema…</option></select></label>
      ${VOC.sel === "libre" ? `<form class="voc-libre" id="vocLibre"><input id="vocTema" class="field" value="${esc(VOC.libre)}" placeholder="Por ejemplo: cortes de agua en Los Maitenes" aria-label="Tema"><button class="btn alt" type="submit">Preparar</button></form>` : ""}
    </div>
    <div class="voc-g">
      <div class="voc-col">
        <section class="voc-s"><h3>Lo que se sabe</h3>${vocSaber(x)}</section>
        ${d ? `<section class="voc-s"><h3>Datos que puedes citar</h3>${d.rel.length || d.resto.length ? `<ul class="voc-datos">${[...d.rel, ...d.resto].map(l => `<li class="${/\[ejemplo\]/i.test(l) ? "ej" : ""}">${esc(l.replace(/^\[ejemplo\]\s*/i, ""))}${/\[ejemplo\]/i.test(l) ? ' <span class="pill">Ficticio</span>' : ""}</li>`).join("")}</ul>${d.rel.length ? "" : `<p class="hint" style="margin:6px 0 0">Ninguno toca este tema directamente.</p>`}` : `<p class="muted" style="margin:0">No hay datos cargados.</p>`}<p class="hint" style="margin:6px 0 0">Se editan en Comunicados · Datos del municipio.</p></section>` : ""}
      </div>
      <div class="voc-col" id="vocKit" aria-live="polite">${vocKitHtml(x)}</div>
    </div>`;
}
function vocPintar(){
  const b = $("#vocBody"); if (!b) return;
  const foco = document.activeElement && document.activeElement.id;
  b.innerHTML = vocCuerpo();
  const listo = !!VOC.kits[vocClave(vocContexto())] && !VOC.cargando;
  document.querySelectorAll("#vocFoot [data-need]").forEach(el => el.disabled = !listo);
  const x = vocContexto(), dec = $("#vocDecl"); if (dec) dec.textContent = x.tipo === "g" ? (respondida(x.m.g) ? "Ver respuesta" : "Preparar declaración") : "Preparar comunicado";
  if (foco && document.getElementById(foco)) document.getElementById(foco).focus();
}
function vocAbrir(sel){
  const {pend, sem, hs} = vocOpciones();
  VOC.sel = sel || (pend[0] ? "g:" + pend[0].g : sem[0] ? "g:" + sem[0].g : hs[0] ? "h:" + hs[0].h.id : "libre");
  VOC.aviso = "";
  const ov = document.createElement("div"); ov.className = "vid-back"; ov.id = "vocBack";
  ov.innerHTML = `<section class="vid voc" role="dialog" aria-modal="true" aria-labelledby="vocT">
    <header class="vid-h"><div><h2 id="vocT">Kit de vocería</h2><p>Para una entrevista en minutos: qué pasó, qué decir, qué evitar y qué te van a preguntar.</p></div><button class="btn ghost" type="button" data-act="voc-close" aria-label="Cerrar"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>
    <div class="voc-b" id="vocBody"></div>
    <footer class="voc-f" id="vocFoot">${shareBar("vocero", {id: "shareVoc"})}<div class="voc-f2"><button class="btn sm" type="button" data-act="voc-copy" data-need>Copiar</button><button class="btn sm" type="button" data-act="voc-regen" data-need>Rehacer</button><button class="btn sm" type="button" data-act="voc-decl" id="vocDecl">Preparar declaración</button></div><p class="hint">Borrador para el vocero: valida cifras y citas antes de usarlo.</p></footer>
  </section>`;
  document.body.appendChild(ov); document.body.classList.add("vid-on");
  vocAbrir.origen = document.activeElement;
  document.querySelectorAll("#shareVoc button").forEach(el => el.setAttribute("data-need", ""));
  vocPintar(); $("#vocSel")?.focus();
  if (VOC.sel !== "libre") vocGenerar();
}
function vocCerrar(){ VOC.ctl?.abort(); $("#vocBack")?.remove(); document.body.classList.remove("vid-on"); const o = vocAbrir.origen; if (o && o.isConnected) o.focus(); }
function vocTexto(){
  const x = vocContexto(), k = VOC.kits[vocClave(x)]; if (!k) return "";
  const d = vocDatos(x), L = [`*Kit de vocería · ${inst()}*`, `Tema: ${x.tema}`];
  if (x.tipo === "g") { const a = accion(x.m); L.push(`Medio: ${MED[x.m.lead.m].n}${x.m.notas.length > 1 ? ` y ${x.m.notas.length - 1} más` : ""} · ${llego(escalera(x.m.notas))}`, x.m.lead.url || "", "", "*Lo que pasó*", x.m.lead.res, "", "*Qué hacer*", a.a + " (" + a.r + ")"); }
  if (x.tipo === "h") L.push(`${fechaHito(x.h.desde)} al ${fechaHito(x.h.hasta)}`, "", "*Qué suele pasar*", x.h.que || "");
  L.push("", "*Tres mensajes*"); k.mensajes.forEach((m, i) => L.push(`${i + 1}. ${m.idea}`, `   Dato: ${m.dato}`));
  if (k.evitar.length) { L.push("", "*Evita decir*"); k.evitar.forEach(v => L.push("- " + v)); }
  L.push("", "*Preguntas probables*"); k.preguntas.forEach((q, i) => L.push(`${i + 1}. ${q.p}`, `   ${q.r}`));
  const ds = [...d.rel, ...d.resto]; if (ds.length) { L.push("", "*Datos que puedes citar*"); ds.forEach(l => L.push("- " + l)); }
  L.push("", "Borrador preparado con PregonIA. Validar cifras y citas antes de usarlo.");
  return L.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");
}
function vocDoc(){ const t = vocTexto(); if (!t) return null; return {titulo: "Kit de vocería", sub: vocContexto().tema, texto: t, cuerpo: t.split("\n").slice(2).join("\n"), borrador: true}; }
document.addEventListener("click", async e => {
  if (e.target.id === "vocBack") return vocCerrar();
  const b = e.target.closest("[data-act]"); if (!b) return; const a = b.dataset.act;
  if (a === "vocero") { e.preventDefault(); vocAbrir(b.dataset.g ? "g:" + b.dataset.g : b.dataset.h ? "h:" + b.dataset.h : ""); }
  if (a === "voc-close") vocCerrar();
  if (a === "voc-stop") VOC.ctl?.abort();
  if (a === "voc-regen") vocGenerar(true);
  if (a === "voc-copy") { const t = plano(vocTexto()); try { await navigator.clipboard.writeText(t); toast("Kit copiado."); } catch(err) { toast("No se pudo copiar: usa Compartir."); } }
  if (a === "voc-decl") { const x = vocContexto(); vocCerrar(); tState.from = route() === "comunicados" ? null : route(); tState.draft = x.tipo === "g" ? x.m.g : null; tState.pieza = x.tipo === "g" ? (respondida(x.m.g) ? null : "declaracion") : "comunicado"; tState.enf = x.tipo === "h" && x.h.tipo === "oportunidad" ? "anunciar" : null; if (route() === "comunicados") render(true); else location.hash = "comunicados"; }
});
document.addEventListener("change", e => { if (e.target.id === "vocSel") { VOC.sel = e.target.value; VOC.aviso = ""; vocPintar(); if (VOC.sel === "libre") $("#vocTema")?.focus(); else vocGenerar(); } });
document.addEventListener("submit", e => { if (e.target.id === "vocLibre") { e.preventDefault(); VOC.libre = $("#vocTema").value; vocGenerar(); } });
document.addEventListener("keydown", e => {
  if (!$("#vocBack")) return;
  if (e.key === "Escape" && !$("#shrPop")) { e.preventDefault(); vocCerrar(); return; }
  if (e.key === "Tab") { const f = [...document.querySelectorAll("#vocBack select, #vocBack input, #vocBack button:not(:disabled), #vocBack a[href]")].filter(x => x.offsetParent); if (!f.length) return; const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
});


/* Captura asistida: publicaciones de Facebook (u otras redes) que el equipo agrega a mano.
   PregonIA no lee Facebook por su cuenta: la persona pega el enlace y el texto, la IA lo analiza como cualquier mención
   y se guarda solo un titular y un resumen propios, más las palabras necesarias para asignarle tema. */
S.capturas ||= []; S.fbPaginas ||= [];
const FB_ID0 = 5000;
function registrarPagina(p){ MED[p.id] = {id: p.id, n: p.n, a: p.a, c: p.c || "", t: "Facebook", l: "C", m: "facebook", e: "listo", o: "Página de Facebook agregada a mano"}; }
S.fbPaginas.forEach(registrarPagina);
let NOTAS_BASE = NOTAS_DEMO;
function capANota(c){ return {...c, b: "", hay: c.hay || norm(c.t + " " + c.res + " " + c.x), ht: norm(c.t), captura: true}; }
function refrescarNotas(base){
  if (base) NOTAS_BASE = base;
  const caps = S.capturas.filter(c => c.org === S.org).map(capANota);
  NOTAS.splice(0, NOTAS.length, ...NOTAS_BASE, ...caps);
}
$("#org").addEventListener("change", () => { refrescarNotas(); render(); });
refrescarNotas(); render();

const ahoraLocal = () => { const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); };
function capAbrir(){
  const nombres = [...new Set([...S.fbPaginas.filter(p => !p.c || p.c === S.org).map(p => p.n), ...CATALOG.filter(m => m.a === "local" && (m.c || "").split(";").includes(S.org)).sort((x, y) => (y.m === "facebook") - (x.m === "facebook")).map(m => m.n)])];
  const ov = document.createElement("div"); ov.className = "vid-back"; ov.id = "capBack";
  ov.innerHTML = `<section class="vid cap" role="dialog" aria-modal="true" aria-labelledby="capT">
    <header class="vid-h"><div><h2 id="capT">Agregar publicación</h2><p>Para medios que publican en Facebook u otras redes. PregonIA la analiza como cualquier noticia de ${esc(S.org)}.</p></div><button class="btn ghost" type="button" data-act="cap-close" aria-label="Cerrar"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>
    <form class="cap-f" id="capForm" novalidate>
      <div class="cap-row">
        <label class="cap-l">Página o medio<input id="capMedio" list="capMedios" required autocomplete="off" placeholder="Por ejemplo: Casablanca Informa"><datalist id="capMedios">${nombres.map(n => `<option value="${esc(n)}">`).join("")}</datalist></label>
        <label class="cap-l">Alcance de la página<select id="capAmb"><option value="local">Comunal</option><option value="regional">Regional</option><option value="nacional">Nacional</option></select></label>
      </div>
      <div class="cap-row">
        <label class="cap-l">Enlace a la publicación <span class="opc">opcional</span><input id="capUrl" type="url" inputmode="url" placeholder="https://www.facebook.com/…"></label>
        <label class="cap-l">Publicada el<input id="capFecha" type="datetime-local" value="${ahoraLocal()}" max="${ahoraLocal()}"></label>
      </div>
      <label class="cap-l">Texto de la publicación<textarea id="capTexto" rows="6" required placeholder="Pega aquí el texto del post."></textarea><small>Se usa solo para analizarla. PregonIA guarda un titular y un resumen propios, no el texto.</small></label>
      <p class="cap-err" id="capErr" role="alert" hidden></p>
      <div class="cap-acts"><button class="btn alt" type="submit" id="capOk">Analizar y agregar</button><button class="btn" type="button" data-act="cap-close">Cancelar</button></div>
    </form></section>`;
  document.body.appendChild(ov); document.body.classList.add("vid-on");
  capAbrir.origen = document.activeElement; $("#capMedio").focus();
}
function capCerrar(){ $("#capBack")?.remove(); document.body.classList.remove("vid-on"); const o = capAbrir.origen; if (o && o.isConnected) o.focus(); }

async function capAnalizar(texto, medio){
  const recientes = menciones(cuenta(), 14).slice(0, 25), sample = await samplePromise;
  if (!sample) return null;
  const p = `Eres analista de prensa de PregonIA para la Municipalidad de ${S.org}, Región de Valparaíso, Chile. Analiza esta publicación de la página "${medio}" en Facebook:

"""${texto.slice(0, 3000)}"""

Noticias ya registradas esta semana (código | titular):
${recientes.map(m => `${m.g} | ${m.lead.t}`).join("\n") || "(ninguna)"}

Devuelve solo un objeto JSON con:
- "titular": un titular propio, informativo, de máximo 14 palabras, sin copiar frases de la publicación.
- "res": un resumen propio de una frase, de máximo 22 palabras.
- "tono": "cri" si es negativa o riesgosa para la gestión o la imagen del municipio o la comuna (reclamos, emergencias, conflictos, críticas), "pos" si la favorece, "neu" si es informativa.
- "x": entre 3 y 8 palabras clave en minúsculas separadas por espacios (temas, lugares, instituciones).
- "g": el código de la noticia ya registrada que cuenta el mismo hecho, o "nuevo" si ninguna.
- "rel": true si trata de ${S.org} o de su municipio; false si no.`;
  const {text} = await sample(p, {modelTier: "quick", cache: false});
  const j = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  if (!j || typeof j !== "object") throw new Error("json");
  return j;
}
async function capGuardar(e){
  e.preventDefault();
  const medio = $("#capMedio").value.trim(), texto = $("#capTexto").value.trim(), url = $("#capUrl").value.trim(), amb = $("#capAmb").value;
  const fecha = new Date($("#capFecha").value).getTime(), err = $("#capErr"), btn = $("#capOk");
  const falta = !medio ? ["#capMedio", "Indica la página o el medio."] : texto.length < 20 ? ["#capTexto", "Pega el texto de la publicación (al menos una frase)."] : url && !/^https?:\/\/\S+$/i.test(url) ? ["#capUrl", "El enlace debe empezar con https://"] : null;
  if (falta) { err.textContent = falta[1]; err.hidden = false; $(falta[0]).focus(); return; }
  err.hidden = true; btn.disabled = true; btn.textContent = "Analizando…";
  // Medio: si coincide con uno del catálogo se usa ese (publica también en Facebook); si no, se registra la página.
  let m = CATALOG.find(x => norm(x.n) === norm(medio)), via = "facebook";
  if (!m) { let p = S.fbPaginas.find(x => norm(x.n) === norm(medio)); if (!p) { p = {id: FB_ID0 + S.fbPaginas.length + 1, n: medio, a: amb, c: amb === "local" ? S.org : ""}; S.fbPaginas.push(p); registrarPagina(p); } else if (p.a !== amb) { p.a = amb; registrarPagina(p); } m = MED[p.id]; }
  let r = null, sinIA = false;
  try { r = await capAnalizar(texto, medio); } catch(er) { r = null; }
  if (!r) sinIA = true;
  const primera = texto.split(/(?<=[.!?])\s+/)[0].slice(0, 110);
  const tono = r && ["cri", "neu", "pos"].includes(r.tono) ? r.tono : "neu";
  const ids = new Set(menciones(cuenta(), 14).map(x => x.g));
  const id = "fb" + uid(), g = r && r.g && r.g !== "nuevo" && ids.has(String(r.g)) ? String(r.g) : id;
  const t = r && r.titular ? String(r.titular).slice(0, 140) : primera;
  const res = r && r.res ? String(r.res).slice(0, 220) : primera;
  const x = r && r.x ? String(r.x).slice(0, 120) : "";
  const c = {id, org: S.org, m: m.id, via, ts: Math.min(Number.isFinite(fecha) ? fecha : Date.now(), Date.now()), t, res, x, tono, g, url,
    hay: norm(t + " " + res + " " + x + " " + texto.slice(0, 600) + " " + S.org + " comuna")};
  S.capturas.push(c); save(); refrescarNotas(); capCerrar();
  tState.tono = "todos"; tState.dias = "30"; tState.tema = "todos"; tState.q = "";
  if (route() !== "menciones") location.hash = "menciones"; else render(true);
  const unida = g !== id ? " Se sumó a una noticia que ya publicaron otros medios." : "";
  toast(sinIA ? "Agregada sin análisis de IA: revisa el tono y el resumen." : `Agregada como ${({cri: "crítica", neu: "neutra", pos: "positiva"})[tono]}.${unida}${r && r.rel === false ? ` Ojo: la IA cree que no trata de ${S.org}.` : ""}`, () => { S.capturas = S.capturas.filter(z => z.id !== id); save(); refrescarNotas(); render(); });
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return; const a = b.dataset.act;
  if (a === "cap-open") capAbrir();
  if (a === "cap-close") capCerrar();
  if (a === "cap-del") { const g = b.dataset.g, quitadas = S.capturas.filter(z => z.g === g && z.org === S.org); S.capturas = S.capturas.filter(z => !(z.g === g && z.org === S.org)); save(); refrescarNotas(); render(); toast(quitadas.length === 1 ? "Quitaste la publicación que agregaste." : `Quitaste ${quitadas.length} publicaciones que agregaste.`, () => { S.capturas.push(...quitadas); save(); refrescarNotas(); render(); }); }
});
document.addEventListener("click", e => { if (e.target.id === "capBack") capCerrar(); });
document.addEventListener("submit", e => { if (e.target.id === "capForm") capGuardar(e); });
document.addEventListener("keydown", e => {
  if (!$("#capBack")) return;
  if (e.key === "Escape") { e.preventDefault(); capCerrar(); return; }
  if (e.key === "Tab") { const f = [...document.querySelectorAll("#capBack input, #capBack select, #capBack textarea, #capBack button:not(:disabled)")].filter(x => x.offsetParent); if (!f.length) return; const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
});

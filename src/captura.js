
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
function capAbrir(pre = {}){
  const nombres = [...new Set([...S.fbPaginas.filter(p => !p.c || p.c === S.org).map(p => p.n), ...CATALOG.filter(m => (m.a === "local" && (m.c || "").split(";").some(x => territorio().includes(x))) || (esRed(m) && m.a !== "local")).sort((x, y) => esRed(y) - esRed(x)).map(m => m.n)])];
  const ov = document.createElement("div"); ov.className = "vid-back"; ov.id = "capBack";
  ov.innerHTML = `<section class="vid cap" role="dialog" aria-modal="true" aria-labelledby="capT">
    <header class="vid-h"><div><h2 id="capT">Agregar publicación</h2><p>${pre.compartida ? "Llegó desde Compartir. Revisa los datos y agrégala." : `Para medios que publican en Facebook, grupos vecinales u otras redes. PregonIA la analiza como cualquier noticia de ${esc(S.org)}.`}</p></div><button class="btn ghost" type="button" data-act="cap-close" aria-label="Cerrar"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>
    <form class="cap-f" id="capForm" novalidate>
      <div class="cap-row">
        <label class="cap-l">Página o medio<input id="capMedio" list="capMedios" required autocomplete="off" placeholder="Por ejemplo: Casablanca Informa"><datalist id="capMedios">${nombres.map(n => `<option value="${esc(n)}">`).join("")}</datalist></label>
        <label class="cap-l">Alcance de la página<select id="capAmb"><option value="local">Comunal</option><option value="regional">Regional</option><option value="nacional">Nacional</option></select></label>
      </div>
      <div class="cap-row">
        <label class="cap-l">Enlace a la publicación <span class="opc">opcional</span><input id="capUrl" type="url" inputmode="url" placeholder="https://www.facebook.com/… o instagram.com/…"></label>
        <label class="cap-l">Publicada el<input id="capFecha" type="datetime-local" value="${ahoraLocal()}" max="${ahoraLocal()}"></label>
      </div>
      <div class="cap-l"><span class="cap-lh"><label for="capTexto">Texto de la publicación</label><button class="btn ghost sm" type="button" data-act="cap-pegar">Pegar</button></span><textarea id="capTexto" rows="5" placeholder="Pega aquí el texto del post."></textarea><small>Se usa solo para analizarla. PregonIA guarda un titular y un resumen propios, no el texto.</small></div>
      <div class="cap-l"><span class="cap-lh"><label for="capImg">Captura de pantalla <span class="opc">si no puedes copiar el texto</span></label></span><input id="capImg" type="file" accept="image/*"><div class="cap-prev" id="capPrev" hidden><img alt="Captura adjunta"><button class="btn ghost sm" type="button" data-act="cap-img-del">Quitar captura</button></div><small>La IA la lee para analizarla; la imagen no se guarda.</small></div>
      ${typeof instalarHtml === "function" ? instalarHtml() : ""}
      <p class="cap-err" id="capErr" role="alert" hidden></p>
      <div class="cap-acts"><button class="btn alt" type="submit" id="capOk">Analizar y agregar</button><button class="btn" type="button" data-act="cap-close">Cancelar</button></div>
    </form></section>`;
  document.body.appendChild(ov); document.body.classList.add("vid-on");
  capAbrir.origen = document.activeElement;
  if (pre.medio) $("#capMedio").value = pre.medio;
  if (pre.url) $("#capUrl").value = pre.url;
  if (pre.texto) $("#capTexto").value = pre.texto;
  if (pre.imagen) capPonerImg(pre.imagen);
  if (pre.aviso) { const er = $("#capErr"); er.textContent = pre.aviso; er.hidden = false; er.classList.add("info"); }
  (pre.medio ? (pre.texto || pre.imagen ? $("#capOk") : $("#capTexto")) : $("#capMedio")).focus();
}
let capImgBlob = null;
/* Achica la captura (máximo 1600 px por lado) para que viaje liviana a la IA. */
async function achicar(f){
  try {
    const bmp = await createImageBitmap(f), k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)), cv = document.createElement("canvas");
    cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k); cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
    return await new Promise(ok => cv.toBlob(b => ok(b || f), "image/jpeg", 0.82));
  } catch(e) { return f; }
}
async function capPonerImg(f){
  if (!f || !/^image\//.test(f.type)) return;
  capImgBlob = await achicar(f);
  const pv = $("#capPrev"); if (!pv) return;
  const img = pv.querySelector("img"); if (img.src) URL.revokeObjectURL(img.src); img.src = URL.createObjectURL(capImgBlob); pv.hidden = false;
}
function capQuitarImg(){ capImgBlob = null; const pv = $("#capPrev"); if (pv) { const img = pv.querySelector("img"); if (img.src) URL.revokeObjectURL(img.src); img.removeAttribute("src"); pv.hidden = true; } const i = $("#capImg"); if (i) i.value = ""; }
/* Separa el primer enlace del resto del texto compartido. */
function separarEnlace(t){ const m = (t || "").match(/https?:\/\/\S+/); return m ? {url: m[0].replace(/[).,;]+$/, ""), texto: t.replace(m[0], "").trim()} : {url: "", texto: (t || "").trim()}; }
function capCerrar(){ capQuitarImg(); $("#capBack")?.remove(); document.body.classList.remove("vid-on"); const o = capAbrir.origen; if (o && o.isConnected) o.focus(); }

async function capAnalizar(texto, medio, img){
  const recientes = menciones(cuenta(), 14).slice(0, 25), sample = await samplePromise;
  if (!sample) return null;
  if (img) { const puede = typeof sample.limits === "function" ? !!(await sample.limits().catch(() => ({}))).images : !!sample.imagenes; if (!puede) { if (texto.length < 20) throw {code: "sin_imagen"}; img = null; } }
  const p = `Eres analista de prensa de PregonIA para ${esAut() ? "el equipo de " + inst() + " (" + cuenta().perfil.zonaNombre + ")" : inst()}, Región de Valparaíso, Chile. Analiza esta publicación ${medio ? `de la página "${medio}"` : "de una página"} en Facebook o redes sociales.${img ? " La publicación viene en la captura de pantalla adjunta: lee su texto (y la página que la publicó, si se ve)." : ""}

"""${texto.slice(0, 3000) || "(sin texto pegado: usa la captura)"}"""

Noticias ya registradas esta semana (código | titular):
${recientes.map(m => `${m.g} | ${m.lead.t}`).join("\n") || "(ninguna)"}

Devuelve solo un objeto JSON con:
- "titular": un titular propio, informativo, de máximo 14 palabras, sin copiar frases de la publicación.
- "res": un resumen propio de una frase, de máximo 22 palabras.
- "tono": "cri" si es negativa o riesgosa para ${esAut() ? "la imagen o el trabajo de la autoridad, o un problema en su territorio" : "la gestión o la imagen del municipio o la comuna"} (reclamos, emergencias, conflictos, críticas), "pos" si la favorece, "neu" si es informativa.
- "x": entre 3 y 8 palabras clave en minúsculas separadas por espacios (temas, lugares, instituciones).
- "g": el código de la noticia ya registrada que cuenta el mismo hecho, o "nuevo" si ninguna.
- "rel": true si ${esAut() ? `nombra a ${cuenta().perfil.nombre} o trata de un hecho en su territorio (${cuenta().perfil.zonaNombre})` : `trata de ${S.org} o de su municipio`}; false si no.${img ? `
- "medio": el nombre de la página o medio que la publicó según la captura, o "" si no se ve.
- "legible": false si la captura no permite leer la publicación.` : ""}`;
  const {text} = await sample(p, img ? {modelTier: "quick", cache: false, images: [img]} : {modelTier: "quick", cache: false});
  const j = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  if (!j || typeof j !== "object") throw new Error("json");
  return j;
}
async function capGuardar(e){
  e.preventDefault();
  const medio = $("#capMedio").value.trim(), texto = $("#capTexto").value.trim(), url = $("#capUrl").value.trim(), amb = $("#capAmb").value;
  const fecha = new Date($("#capFecha").value).getTime(), err = $("#capErr"), btn = $("#capOk");
  const img = capImgBlob;
  const falta = !medio && !img ? ["#capMedio", "Indica la página o el medio."] : texto.length < 20 && !img ? ["#capTexto", url ? "Facebook compartió solo el enlace: pega el texto de la publicación o adjunta una captura." : "Pega el texto de la publicación (al menos una frase) o adjunta una captura."] : url && !/^https?:\/\/\S+$/i.test(url) ? ["#capUrl", "El enlace debe empezar con https://"] : null;
  if (falta) { err.textContent = falta[1]; err.classList.remove("info"); err.hidden = false; $(falta[0]).focus(); return; }
  err.hidden = true; btn.disabled = true; btn.textContent = "Analizando…";
  let r = null, sinIA = false;
  try { r = await capAnalizar(texto, medio, img); } catch(er) { r = null; if (er && er.code === "sin_imagen") { err.textContent = "En esta vista la IA no puede leer imágenes: pega el texto de la publicación."; err.hidden = false; btn.disabled = false; btn.textContent = "Analizar y agregar"; $("#capTexto").focus(); return; } }
  if (img && (!r || r.legible === false) && texto.length < 20) { err.textContent = r ? "No se alcanza a leer la captura: prueba con una más nítida o pega el texto." : "No se pudo analizar la captura ahora: pega el texto de la publicación."; err.hidden = false; btn.disabled = false; btn.textContent = "Analizar y agregar"; return; }
  const medioF = medio || (r && typeof r.medio === "string" && r.medio.trim()) || "Publicación en redes";
  // Medio: si coincide con uno del catálogo se usa ese (publica también en Facebook); si no, se registra la página.
  let m = CATALOG.find(x => norm(x.n) === norm(medioF)), via = m && m.m === "instagram" || /instagram\.com\//i.test(url) ? "instagram" : "facebook";
  if (!m) { let p = S.fbPaginas.find(x => norm(x.n) === norm(medioF)); if (!p) { p = {id: FB_ID0 + S.fbPaginas.length + 1, n: medioF, a: amb, c: amb === "local" ? S.org : ""}; S.fbPaginas.push(p); registrarPagina(p); } else if (p.a !== amb) { p.a = amb; registrarPagina(p); } m = MED[p.id]; }
  if (!r) sinIA = true;
  const primera = (texto || (r && r.titular) || "Publicación en redes").split(/(?<=[.!?])\s+/)[0].slice(0, 110);
  const tono = r && ["cri", "neu", "pos"].includes(r.tono) ? r.tono : "neu";
  const ids = new Set(menciones(cuenta(), 14).map(x => x.g));
  const id = "fb" + uid(), g = r && r.g && r.g !== "nuevo" && ids.has(String(r.g)) ? String(r.g) : id;
  const t = r && r.titular ? String(r.titular).slice(0, 140) : primera;
  const res = r && r.res ? String(r.res).slice(0, 220) : primera;
  const x = r && r.x ? String(r.x).slice(0, 120) : "";
  const c = {id, org: S.org, m: m.id, via, ts: Math.min(Number.isFinite(fecha) ? fecha : Date.now(), Date.now()), t, res, x, tono, g, url,
    hay: norm(t + " " + res + " " + x + " " + texto.slice(0, 600) + " " + (esAut() ? cuenta().perfil.variantes[0] : S.org + " comuna"))};
  capImgBlob = null;
  S.capturas.push(c); save(); refrescarNotas(); capCerrar();
  tState.tono = "todos"; tState.dias = "30"; tState.tema = "todos"; tState.q = "";
  if (route() !== "menciones") location.hash = "menciones"; else render(true);
  const unida = g !== id ? " Se sumó a una noticia que ya publicaron otros medios." : "";
  toast(sinIA ? "Agregada sin análisis de IA: revisa el tono y el resumen." : `Agregada como ${({cri: "crítica", neu: "neutra", pos: "positiva"})[tono]}.${unida}${r && r.rel === false ? ` Ojo: la IA cree que no trata de ${S.org}.` : ""}`, () => { S.capturas = S.capturas.filter(z => z.id !== id); save(); refrescarNotas(); render(); });
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return; const a = b.dataset.act;
  if (a === "cap-open") capAbrir();
  if (a === "cap-img-del") capQuitarImg();
  if (a === "cap-pegar") { (async () => { try { const t = (await navigator.clipboard.readText()).trim(); if (!t) return toast("El portapapeles está vacío."); const {url, texto} = separarEnlace(t); if (url && !$("#capUrl").value) $("#capUrl").value = url; if (texto) $("#capTexto").value = texto; (texto ? $("#capTexto") : $("#capTexto")).focus(); if (url && !texto) toast("Pegaste solo un enlace: agrega el texto o una captura."); } catch(er) { $("#capTexto").focus(); toast("Pega con el teclado o manteniendo presionado el cuadro de texto."); } })(); }
  if (a === "cap-close") capCerrar();
  if (a === "cap-del") { const g = b.dataset.g, quitadas = S.capturas.filter(z => z.g === g && z.org === S.org); S.capturas = S.capturas.filter(z => !(z.g === g && z.org === S.org)); save(); refrescarNotas(); render(); toast(quitadas.length === 1 ? "Quitaste la publicación que agregaste." : `Quitaste ${quitadas.length} publicaciones que agregaste.`, () => { S.capturas.push(...quitadas); save(); refrescarNotas(); render(); }); }
});
document.addEventListener("click", e => { if (e.target.id === "capBack") capCerrar(); });
document.addEventListener("submit", e => { if (e.target.id === "capForm") capGuardar(e); });
document.addEventListener("change", e => { if (e.target.id === "capImg" && e.target.files[0]) capPonerImg(e.target.files[0]); });
document.addEventListener("keydown", e => {
  if (!$("#capBack")) return;
  if (e.key === "Escape") { e.preventDefault(); capCerrar(); return; }
  if (e.key === "Tab") { const f = [...document.querySelectorAll("#capBack input, #capBack select, #capBack textarea, #capBack button:not(:disabled)")].filter(x => x.offsetParent); if (!f.length) return; const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
});

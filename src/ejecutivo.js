/* Informe ejecutivo: tres horizontes separados (24 horas, 7 días y 30 días), cada uno comparado con el período anterior de igual largo,
   con foco en emergencias (lo que hay que atender) y oportunidades (lo que conviene difundir).
   Se lee en un minuto en el celular y se comparte como un PDF compacto con el formato de PregonIA (Edición): páginas del tamaño
   de la pantalla de un teléfono, dibujadas en canvas en el navegador. Se envía por WhatsApp o correo, se descarga, o se copia como texto.
   Cada asunto aparece una sola vez: en el horizonte más corto donde corresponde. Para una autoridad cuenta solo lo que la nombra. */
const EJ_H = [
  {dias: 1, n: "24 horas", t: "Últimas 24 horas", ant: "24 h anteriores", tag: "Hoy"},
  {dias: 7, n: "7 días", t: "Últimos 7 días", ant: "7 días anteriores", tag: "Esta semana"},
  {dias: 30, n: "30 días", t: "Últimos 30 días", ant: "30 días anteriores", tag: "Este mes"}];
const EJ_MAX = 3;  // emergencias y oportunidades por horizonte

/* Emergencia: un hecho grave, o una crítica que nadie ha atendido. Oportunidad: una buena noticia que aún no se difunde. */
const ejEmergencia = m => (m.grave || m.tono === "cri") && !atendida(m.g);
const ejOportunidad = m => m.tono === "pos" && !respondida(m.g);
const ejPrioOport = (a, b) => escalera(b.notas).max - escalera(a.notas).max || b.notas.length - a.notas.length || b.last - a.last;

/* Días que cubren los datos cargados: el piloto trae 62; «Noticias reales» lo que lee al vuelo (14); la demostración, su corpus.
   Un período anterior sin noticias es un dato (cero); uno que los datos no alcanzan a cubrir, no se compara. */
function ejCobertura(){
  if (typeof PILOTO !== "undefined" && PILOTO.activo) return 62;
  if (MODO.tipo === "real" && MODO.info) return MODO.info.ventana_dias || 14;
  return NOTAS.length ? Math.ceil((NOW - Math.min(...NOTAS.map(n => n.ts))) / DAY) : 0;
}
function ejecData(){
  const c = cuenta(), todas = sobreCuenta(menciones(c, 60), c), mostradas = new Set(), cob = ejCobertura();
  const hs = EJ_H.map(h => {
    const cur = todas.filter(m => NOW - m.last < h.dias * DAY), ant = todas.filter(m => NOW - m.last >= h.dias * DAY && NOW - m.last < 2 * h.dias * DAY);
    const M = metricas(cur), Ma = metricas(ant), v = veredicto(M), va = veredicto(Ma);
    const niv = [0, 1, 2].map(i => cur.filter(m => escalera(m.notas).max === i).length);
    const cris = cur.filter(m => exigeRespuesta(m, c)), resp = cris.filter(m => atendida(m.g)).length;
    // Las de un horizonte más corto ya se mostraron: aquí van las siguientes, para que nada se repita y nada se pierda.
    const libres = cur.filter(m => !mostradas.has(m.g));
    const emerg = libres.filter(ejEmergencia).sort((a, b) => riesgo(b) - riesgo(a)).slice(0, EJ_MAX);
    const oport = libres.filter(ejOportunidad).sort(ejPrioOport).slice(0, EJ_MAX);
    emerg.concat(oport).forEach(m => mostradas.add(m.g));
    return {...h, cur, M, Ma, v, va, hayAnt: cob >= 2 * h.dias - 0.5, niv, criTot: cris.length, resp, graves: cur.filter(m => m.grave).length,
      emergTot: cur.filter(ejEmergencia).length, oportTot: cur.filter(ejOportunidad).length, emergLib: libres.filter(ejEmergencia).length, oportLib: libres.filter(ejOportunidad).length, emerg, oport};
  });
  // Qué cambió en la semana: temas (categorías del cargo) que suben en críticas o en positivas frente a la semana anterior.
  const cuenta7 = (ms, t) => { const r = {}; ms.forEach(m => { if (m.tono !== t) return; const k = categoriaDe(m).n; r[k] = (r[k] || 0) + 1; }); return r; };
  const s7 = todas.filter(m => NOW - m.last < 7 * DAY), a7 = todas.filter(m => NOW - m.last >= 7 * DAY && NOW - m.last < 14 * DAY);
  const suben = t => { const a = cuenta7(s7, t), b = cuenta7(a7, t); return Object.keys(a).map(k => ({k, n: a[k], d: a[k] - (b[k] || 0)})).filter(x => x.d > 0 && x.k !== CAT_OTROS.n).sort((x, y) => y.d - x.d || y.n - x.n).slice(0, 3); };
  const [h1, h7, h30] = hs, abiertas = h30.emergTot, buenas = h30.oportTot;
  const sint = !h30.M.vol ? `Ningún medio publicó sobre ${inst()} en los últimos 30 días.`
    : `${h7.M.vol ? `Semana ${h7.v.n.toLowerCase()}` : "Semana sin noticias"}${h7.hayAnt && h7.va.i >= 0 && h7.M.vol ? (h7.v.i < h7.va.i ? ", mejor que la anterior" : h7.v.i > h7.va.i ? ", peor que la anterior" : ", igual que la anterior") : ""}; `
      + `${h1.M.vol ? plural(h1.M.vol, "noticia", "noticias") + " en 24 horas" : "nada nuevo en 24 horas"}. `
      + `${abiertas ? plural(abiertas, "emergencia abierta", "emergencias abiertas") : "Sin emergencias abiertas"} y ${buenas ? plural(buenas, "oportunidad", "oportunidades") + " para difundir" : "ninguna oportunidad pendiente"} en 30 días.`;
  return {hs, sint, abiertas, buenas, criTot: h30.criTot, resp: h30.resp, subenCri: suben("cri"), subenPos: suben("pos"), m30: h30.cur, fecha: (f => f.charAt(0).toUpperCase() + f.slice(1))(fechaLarga(NOW))};
}

/* Comparación del balance del tono (positivas − críticas, de −100 a 100): ahora y el período anterior, en barras que parten del centro. */
function ejBalance(h){
  const W = 240, H = 64, cx = W / 2, sx = v => Math.max(-1, Math.min(1, v / 100)) * (W / 2 - 30);
  const barra = (v, y, col, vacio) => vacio ? `<text x="${cx + 6}" y="${y + 11}" class="ej-sd">${vacio}</text>`
    : `${Math.abs(sx(v)) >= 3 ? `<rect x="${Math.min(cx, cx + sx(v))}" y="${y}" width="${Math.abs(sx(v))}" height="14" rx="3" fill="${col}"/>` : ""}<text x="${v >= 0 ? cx + Math.max(0, sx(v)) + 5 : cx + sx(v) - 5}" y="${y + 11}" text-anchor="${v >= 0 ? "start" : "end"}" class="ej-nv">${signo(v)}</text>`;
  return `<p class="ej-bt">Balance del tono</p><svg class="ej-bal" viewBox="0 0 ${W} ${H}" role="img" aria-label="Balance del tono, de −100 a +100: ahora ${h.M.vol ? signo(h.M.neto) : "sin noticias"}; ${h.ant} ${!h.hayAnt ? "sin datos" : h.Ma.vol ? signo(h.Ma.neto) : "sin noticias"}">
    <line x1="${cx}" x2="${cx}" y1="0" y2="${H - 16}" stroke="var(--ink)" stroke-width="1.5"/>
    ${barra(h.M.neto, 4, "var(--ink)", h.M.vol ? "" : "sin noticias")}${barra(h.Ma.neto, 24, "var(--track)", !h.hayAnt ? "sin datos" : h.Ma.vol ? "" : "sin noticias")}
    <text x="2" y="${H - 2}" class="ej-ax">En contra</text><text x="${W - 2}" y="${H - 2}" text-anchor="end" class="ej-ax">A favor</text></svg>
    <div class="ej-bal-l"><span><i class="ahora"></i>Ahora</span><span><i class="antes"></i>${esc(h.ant)}</span></div>`;
}
const ejDelta = (a, b, hay) => !hay ? `<span class="ej-dl">sin datos para comparar</span>` : `<span class="ej-dl ${a > b ? "up" : a < b ? "down" : ""}">${ri(a > b ? "up" : a < b ? "down" : "flat")}${a === b ? "igual" : signo(a - b)}</span>`;
function ejHorizonte(h){
  return `<div class="ej-col">
    <p class="ej-k">${h.n}</p>
    <p class="ej-vol"><b>${h.M.vol}</b><span>${h.M.vol === 1 ? "noticia" : "noticias"}</span>${ejDelta(h.M.vol, h.Ma.vol, h.hayAnt)}</p>
    <p class="ej-ver ${h.v.k}">${h.M.vol ? h.v.n : "Sin noticias"}</p>
    ${h.M.vol ? segbar([{l: "Positivas", v: h.M.pos, c: "var(--pos)"}, {l: "Neutras", v: h.M.neu, c: "var(--neu)"}, {l: "Críticas", v: h.M.cri, c: "var(--cri)"}]) : `<div class="segbar"></div>`}
    <p class="ej-cnt">${h.M.vol ? conteo(h.M) : "—"}</p>
    ${ejBalance(h)}
    <dl class="ej-dat"><div><dt>Nacional · regional · comunal</dt><dd class="mono">${h.niv[2]} · ${h.niv[1]} · ${h.niv[0]}</dd></div><div><dt>Críticas atendidas</dt><dd class="mono ${h.criTot && h.resp < h.criTot ? "c" : ""}">${h.criTot ? `${h.resp} de ${h.criTot}` : "—"}</dd></div>${h.graves ? `<div><dt>Hechos graves</dt><dd class="mono c">${h.graves}</dd></div>` : ""}</dl>
  </div>`;
}
function ejItem(m, tipo){
  const e = escalera(m.notas), ac = accion(m);
  return `<li class="${tipo === "e" ? "cri" : "pos"}"><span class="n">${ri(tipo === "e" ? "cri" : "pos")}</span><div class="bd"><span class="kick">${esc(categoriaDe(m).n)} · ${m.grave ? "Hecho grave" : tonoLbl[m.tono]}</span><b class="t">${esc(m.lead.res)}</b><span class="sub">${enMedios(m)} · ${ago(m.last)}</span><div class="lleg">${escHtml(e)}</div><p class="acc"><b>Qué hacer</b>${ac.a}</p>${PILOTO.activo && !PILOTO.editor ? "" : `<button class="btn sm" style="justify-self:start" data-act="responder" data-g="${m.g}" data-from="reportes">${tipo === "e" ? "Preparar respuesta" : "Preparar comunicado"}</button>`}</div></li>`;
}
function ejSeccion(h){
  const lista = (xs, t, vacio) => xs.length ? `<ol class="asuntos">${xs.map(m => ejItem(m, t)).join("")}</ol>` : `<p class="empty">${vacio}</p>`;
  const masE = h.emergLib - h.emerg.length, masO = h.oportLib - h.oport.length;
  return `<section class="ej-h"><header class="ej-hh"><h4>${h.t}</h4><span>${h.M.vol ? `${plural(h.M.vol, "noticia", "noticias")} · ${h.v.n.toLowerCase()}` : "sin noticias"}</span></header>
    <div class="ej-eo">
      <div><p class="ej-sub cri">${ri("cri")} Emergencias</p>${lista(h.emerg, "e", h.emergTot ? "Las de este período ya aparecen arriba." : "Nada que atender en este período.")}${masE > 0 && h.emerg.length ? `<p class="hint">y ${plural(masE, "otra", "otras")} en Menciones.</p>` : ""}</div>
      <div><p class="ej-sub pos">${ri("pos")} Oportunidades</p>${lista(h.oport, "o", h.oportTot ? "Las de este período ya aparecen arriba." : "Sin buenas noticias pendientes de difusión.")}${masO > 0 && h.oport.length ? `<p class="hint">y ${plural(masO, "otra", "otras")} en Menciones.</p>` : ""}</div>
    </div></section>`;
}
function repEjecutivo(){
  const d = ejecData();
  if (!d.m30.length) return `<div class="allgood">${ri("ok")} Ningún medio publicó sobre ${esc(inst())} en los últimos 30 días.</div>`;
  const cambio = (xs, cls, vacio) => xs.length ? `<ul class="ej-cam">${xs.map(x => `<li><span>${esc(x.k)}</span><b class="mono ${cls}">+${x.d}</b><small>${plural(x.n, "nota", "notas")} esta semana</small></li>`).join("")}</ul>` : `<p class="empty">${vacio}</p>`;
  return `<div class="rhead"><h3>${esc(inst())} · informe ejecutivo</h3><span class="per">${ri("cal")} ${esc(d.fecha)}</span></div>
  <div class="parte ej">
    <section class="ej-sint"><span class="kick">En una línea</span><p>${esc(d.sint)}</p>
      <div class="ej-chips"><span class="ej-chip cri">${ri("cri")}<b>${d.abiertas}</b> ${d.abiertas === 1 ? "emergencia abierta" : "emergencias abiertas"}</span><span class="ej-chip pos">${ri("pos")}<b>${d.buenas}</b> ${d.buenas === 1 ? "oportunidad" : "oportunidades"}</span><span class="ej-chip">${ri("ok")}<b>${d.criTot ? d.resp + "/" + d.criTot : "—"}</b> críticas atendidas en 30 días</span></div></section>
    <section><h4>Los tres horizontes, comparados con su período anterior</h4><div class="ej-cols">${d.hs.map(ejHorizonte).join("")}</div>
      <p class="hint" style="margin:10px 0 0">Balance del tono: positivas menos críticas, sobre el total, de −100 (todo en contra) a +100 (todo a favor). La barra negra es el período actual; la gris, el anterior de igual largo.</p></section>
    <section><h4>Pulso de 30 días</h4>${chartPulso(d.m30, 30)}<p class="ej-ley"><span><i style="background:var(--pos)"></i>Positivas</span><span><i style="background:var(--neu)"></i>Neutras</span><span><i style="background:var(--cri)"></i>Críticas</span></p></section>
    <section><h4>Qué cambió esta semana frente a la anterior</h4><div class="ej-eo">
      <div><p class="ej-sub cri">${ri("up")} Temas que suben en críticas</p>${cambio(d.subenCri, "c", "Ningún tema sube en críticas.")}</div>
      <div><p class="ej-sub pos">${ri("up")} Temas que suben en positivas</p>${cambio(d.subenPos, "p", "Ningún tema sube en positivas.")}</div></div></section>
    ${d.hs.map(ejSeccion).join("")}
    <div class="acts ej-acts" role="group" aria-label="Compartir el informe en PDF"><button class="btn b-wa" type="button" data-act="share" data-via="wa" data-src="ejec"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${SH_ICO.wa}</svg>WhatsApp</button><button class="btn alt" type="button" data-act="share" data-via="pdf" data-src="ejec"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/></svg>Descargar PDF</button><button class="btn" type="button" data-act="share" data-via="mail" data-src="ejec" aria-haspopup="menu" aria-expanded="false"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${SH_ICO.mail}</svg>Correo</button><button class="btn" type="button" data-act="ej-copiar">Copiar texto</button></div>
    <p class="hint" style="margin:0">Un PDF de pocas páginas con el formato de PregonIA, del tamaño de la pantalla del celular: se lee en WhatsApp sin hacer zoom.</p>
  </div>
  ${muestra(d.hs[2].M.vol)}`;
}

/* Texto para WhatsApp (negritas con asteriscos) y para el PDF. */
function ejecTexto(){
  const d = ejecData(), L = [`*PregonIA · Informe ejecutivo · ${inst()}*`, d.fecha, "", `*En una línea:* ${d.sint}`, ""];
  const fl = (h, a, b) => !h.hayAnt ? "sin datos para comparar" : (a === b ? "igual" : (a > b ? "▲ " : "▼ ") + signo(a - b)) + " vs. " + h.ant;
  d.hs.forEach(h => L.push(`*${h.n}:* ${plural(h.M.vol, "noticia", "noticias")} (${fl(h, h.M.vol, h.Ma.vol)}) · ${h.M.vol ? h.v.n.toLowerCase() : "sin noticias"}${h.M.vol ? " · " + conteo(h.M) : ""}${h.criTot ? ` · críticas atendidas ${h.resp} de ${h.criTot}` : ""}`));
  const items = (t, k) => { const xs = d.hs.flatMap(h => h[k].map(m => ({h, m}))); if (!xs.length) return; L.push("", `*${t}*`); xs.forEach(({h, m}, i) => L.push(`${i + 1}. [${h.tag}] ${m.lead.res} (${llego(escalera(m.notas)).toLowerCase()})`, `   Qué hacer: ${accion(m).a}`)); };
  items("Emergencias", "emerg"); items("Oportunidades", "oport");
  if (d.subenCri.length || d.subenPos.length) { L.push("", "*Qué cambió esta semana*"); if (d.subenCri.length) L.push("Suben en críticas: " + d.subenCri.map(x => `${x.k} (+${x.d})`).join(", ")); if (d.subenPos.length) L.push("Suben en positivas: " + d.subenPos.map(x => `${x.k} (+${x.d})`).join(", ")); }
  L.push("", MODO.tipo !== "demo" || (typeof PILOTO !== "undefined" && PILOTO.activo) ? "Noticias reales de medios digitales · PregonIA" : "Demostración con noticias ficticias · PregonIA");
  return L.join("\n");
}

/* Imagen para WhatsApp con el formato Edición de PregonIA, en páginas verticales de teléfono (1080 × 1920 como máximo):
   WhatsApp achica las imágenes muy largas hasta que no se leen, así que el informe se reparte en varias que se envían juntas.
   Cada bloque se mide primero en un lienzo de prueba y, si no cabe en la página, pasa entero a la siguiente. */
const EJ_W = 1080, EJ_HMAX = 1920, EJ_X = 64, EJ_PIE = 110;
async function ejecPaginas(){
  await Promise.all(['400 40px Inter', '500 40px Inter', '600 40px Inter', '700 40px Inter', '600 60px "Source Serif 4"', '700 60px "Source Serif 4"'].map(f => document.fonts.load(f).catch(() => {})));
  vpaleta();
  const d = ejecData(), C = VC, W = EJ_W, X = EJ_X, AN = W - 2 * X;
  const col = k => k === "pos" ? C.pos : k === "cri" ? C.cri : C.neu;
  const T = (ctx, txt, x, y, o) => vtexto(ctx, txt, x, y, {maxW: AN, ...o});
  const regla = (ctx, y, g = 1.5, a = 1) => { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = C.rule; ctx.fillRect(X, y, AN, g); ctx.restore(); };
  const titulo = (ctx, y, txt, c = C.muted) => { T(ctx, txt.toUpperCase(), X, y + 34, {px: 24, w: 700, color: c, ls: 4}); if (c === C.muted) regla(ctx, y + 56); else { ctx.fillStyle = c; ctx.fillRect(X, y + 54, AN, 4); } return y + 70; };
  const B = [];  // bloques: (ctx, y) => y siguiente
  // 1. Cabezal de diario, en una línea y fichas
  B.push((ctx, y) => {
    y += 60; T(ctx, d.fecha, X, y, {px: 26, color: C.muted}); T(ctx, "Informe ejecutivo de prensa", W - X, y, {px: 26, color: C.muted, align: "right"});
    regla(ctx, y + 22, 1.5, .25); y += 140; vlogo(ctx, W / 2, y, 108, 1);
    y += 32; regla(ctx, y); regla(ctx, y + 8, 5); y += 74;
    T(ctx, "INFORME EJECUTIVO", W / 2, y, {px: 26, w: 700, color: C.blue, align: "center", ls: 5});
    y = T(ctx, inst(), W / 2, y + 66, {px: 58, w: 700, fam: VF.h, align: "center", max: 2, lh: 66, ls: -1});
    y = T(ctx, "24 horas · 7 días · 30 días, cada uno frente a su período anterior", W / 2, y + 2, {px: 28, color: C.muted, align: "center"});
    const y0 = y + 24; y = T(ctx, d.sint, X + 30, y0 + 46, {px: 36, w: 600, fam: VF.h, lh: 48, maxW: AN - 30});
    ctx.fillStyle = C.rule; ctx.fillRect(X, y0 + 8, 6, y - y0 - 22); y += 18;
    const chips = [[String(d.abiertas), d.abiertas === 1 ? "emergencia abierta" : "emergencias abiertas", C.cri], [String(d.buenas), d.buenas === 1 ? "oportunidad" : "oportunidades", C.pos], [d.criTot ? d.resp + "/" + d.criTot : "—", "críticas atendidas", C.text]], cw = (AN - 36) / 3;
    chips.forEach(([n, l, c], i) => { const x = X + i * (cw + 18); ctx.strokeStyle = c === C.text ? C.line : c; ctx.lineWidth = 2.5; vrr(ctx, x, y, cw, 128, 16); ctx.stroke();
      T(ctx, n, x + 24, y + 66, {px: 52, w: 700, fam: VF.h, color: c}); T(ctx, l, x + 24, y + 106, {px: 24, color: C.muted, maxW: cw - 40, max: 1}); });
    return y + 128;
  });
  // 2. Los tres horizontes
  d.hs.forEach((h, i) => B.push((ctx, y) => {
    if (i === 0) y = titulo(ctx, y + 30, "Los tres horizontes");
    const top = y, cA = X, cB = X + 300, cC = X + 640, bxW = W - X - cC, mid = cC + bxW / 2;
    T(ctx, h.n.toUpperCase(), cA, top + 46, {px: 24, w: 700, color: C.blue, ls: 3});
    T(ctx, String(h.M.vol), cA, top + 128, {px: 82, w: 700, fam: VF.h}); vfont(ctx, 700, 82, VF.h); const wn = ctx.measureText(String(h.M.vol)).width;
    T(ctx, h.M.vol === 1 ? "noticia" : "noticias", cA + wn + 12, top + 124, {px: 26, color: C.muted});
    const dv = h.M.vol - h.Ma.vol;
    T(ctx, !h.hayAnt ? "sin datos para comparar" : dv === 0 ? "igual que " + h.ant : `${dv > 0 ? "▲" : "▼"} ${signo(dv)} vs. ${h.ant}`, cA, top + 168, {px: 22, color: C.muted, maxW: 240});
    T(ctx, h.M.vol ? h.v.n : "Sin noticias", cB, top + 72, {px: 40, w: 700, fam: VF.h, color: h.M.vol ? col(h.v.k) : C.muted, maxW: 320, max: 1});
    const bw = 300, tot = Math.max(1, h.M.vol); let bx = cB; ctx.fillStyle = C.track; vrr(ctx, cB, top + 96, bw, 18, 9); ctx.fill();
    [["pos", h.M.pos], ["neu", h.M.neu], ["cri", h.M.cri]].forEach(([k, n]) => { if (!n) return; const w = bw * n / tot; ctx.fillStyle = col(k); vrr(ctx, bx, top + 96, Math.max(6, w - 3), 18, 9); ctx.fill(); bx += w; });
    T(ctx, h.M.vol ? `${h.M.pos} pos · ${h.M.neu} neu · ${h.M.cri} crít` : "—", cB, top + 152, {px: 22, color: C.muted, maxW: 320});
    T(ctx, `Nacional ${h.niv[2]} · Regional ${h.niv[1]} · Comunal ${h.niv[0]}`, cB, top + 184, {px: 22, color: C.muted, maxW: 330});
    const e = v => Math.max(-1, Math.min(1, v / 100)) * (bxW / 2 - 44);
    T(ctx, "Balance del tono", cC, top + 46, {px: 22, w: 600, color: C.muted}); ctx.fillStyle = C.rule; ctx.fillRect(mid - 1, top + 62, 2, 76);
    const bar = (v, yy, c, vacio, lbl) => { T(ctx, lbl, cC, yy + 18, {px: 18, color: C.muted});
      if (vacio) { T(ctx, vacio, mid + 10, yy + 18, {px: 18, color: C.muted}); return; }
      if (Math.abs(e(v)) >= 4) { ctx.fillStyle = c; vrr(ctx, Math.min(mid, mid + e(v)), yy, Math.abs(e(v)), 22, 6); ctx.fill(); }
      T(ctx, signo(v), v >= 0 ? mid + Math.max(0, e(v)) + 8 : mid + e(v) - 8, yy + 19, {px: 20, w: 700, color: C.text, align: v >= 0 ? "left" : "right"}); };
    bar(h.M.neto, top + 70, C.text, h.M.vol ? "" : "sin noticias", "ahora"); bar(h.Ma.neto, top + 106, C.progBg, !h.hayAnt ? "sin datos" : h.Ma.vol ? "" : "sin noticias", "antes");
    T(ctx, "en contra", cC, top + 168, {px: 18, color: C.muted}); T(ctx, "a favor", W - X, top + 168, {px: 18, color: C.muted, align: "right"});
    T(ctx, h.criTot ? `Críticas atendidas ${h.resp} de ${h.criTot}` : "Sin críticas que exijan respuesta", cC, top + 198, {px: 20, w: 600, color: h.criTot && h.resp < h.criTot ? C.cri : C.muted, maxW: bxW});
    regla(ctx, top + 226, 1.5, .2); return top + 236;
  }));
  // 3. Pulso de 30 días
  B.push((ctx, y) => {
    y = titulo(ctx, y + 30, "Pulso de 30 días") + 24;
    const dias = Array.from({length: 30}, () => ({pos: 0, neu: 0, cri: 0})), hoy0 = new Date(NOW).setHours(0, 0, 0, 0);
    d.m30.forEach(m => { const k = Math.round((hoy0 - new Date(m.last).setHours(0, 0, 0, 0)) / DAY); dias[29 - Math.min(29, Math.max(0, k))][m.tono]++; });
    const mx = Math.max(1, ...dias.map(x => x.pos + x.neu + x.cri)), CH = 180, slot = AN / 30, bW = slot - 8;
    dias.forEach((x, i) => { let acc = 0; const bx = X + i * slot + 4; [["pos", C.pos], ["neu", C.neu], ["cri", C.cri]].forEach(([k, c]) => { if (!x[k]) return; const hh = CH * x[k] / mx; ctx.fillStyle = c; ctx.fillRect(bx, y + CH - acc - hh, bW, Math.max(2, hh - 2)); acc += hh; });
      if (!(x.pos + x.neu + x.cri)) { ctx.fillStyle = C.track; ctx.fillRect(bx, y + CH - 3, bW, 3); } });
    y += CH + 32; const et = k => { const f = new Date(NOW - k * DAY); return `${f.getDate()}/${f.getMonth() + 1}`; };
    T(ctx, et(29), X, y, {px: 20, color: C.muted}); T(ctx, et(15), W / 2, y, {px: 20, color: C.muted, align: "center"}); T(ctx, "hoy", W - X, y, {px: 20, color: C.muted, align: "right"});
    y += 36; let lx = X; [["Positivas", C.pos], ["Neutras", C.neu], ["Críticas", C.cri]].forEach(([l, c]) => { ctx.fillStyle = c; vrr(ctx, lx, y - 16, 18, 18, 4); ctx.fill(); T(ctx, l, lx + 28, y, {px: 22, color: C.muted}); vfont(ctx, 400, 22, VF.b); lx += 28 + ctx.measureText(l).width + 34; });
    return y + 10;
  });
  // 4. Qué cambió esta semana
  if (d.subenCri.length || d.subenPos.length) B.push((ctx, y) => {
    y = titulo(ctx, y + 30, "Qué cambió esta semana");
    const fila = (x, c, t, xs) => { let yy = y + 40; T(ctx, t, x, yy, {px: 22, w: 700, color: c, maxW: AN / 2 - 20}); yy += 12;
      (xs.length ? xs : [null]).forEach(z => { if (!z) { yy = T(ctx, "Ningún tema", x, yy + 36, {px: 26, color: C.muted}); return; } T(ctx, "+" + z.d, x + AN / 2 - 30, yy + 38, {px: 32, w: 700, fam: VF.h, color: c, align: "right"}); yy = T(ctx, z.k, x, yy + 36, {px: 26, w: 600, maxW: AN / 2 - 100, max: 2, lh: 32}); });
      return yy; };
    return Math.max(fila(X, C.cri, "SUBEN EN CRÍTICAS", d.subenCri), fila(X + AN / 2 + 10, C.pos, "SUBEN EN POSITIVAS", d.subenPos)) + 6;
  });
  // 5. Emergencias y oportunidades: el título va pegado a su primer asunto
  const asunto = (h, m, c, conTitulo, tt) => (ctx, y) => {
    if (conTitulo) y = titulo(ctx, y + 40, tt, c);
    const top = y + 22; vfont(ctx, 700, 20, VF.b); const tw = ctx.measureText(h.tag.toUpperCase()).width + 30;
    ctx.fillStyle = c; vrr(ctx, X + 22, top, tw, 34, 17); ctx.fill(); T(ctx, h.tag.toUpperCase(), X + 37, top + 24, {px: 20, w: 700, color: "#FFFFFF", ls: 1});
    T(ctx, categoriaDe(m).n + " · " + (m.grave ? "Hecho grave" : tonoLbl[m.tono]), X + 22 + tw + 14, top + 24, {px: 22, w: 600, color: C.muted, maxW: AN - tw - 40, max: 1});
    let yy = T(ctx, m.lead.res, X + 22, top + 82, {px: 36, w: 600, fam: VF.h, lh: 46, maxW: AN - 22, max: 3});
    yy = T(ctx, `${nomMedio(m.lead)}${new Set(m.notas.map(n => n.m)).size > 1 ? " y otros" : ""} · ${llego(escalera(m.notas))} · ${ago(m.last)}`, X + 22, yy + 2, {px: 22, color: C.muted, maxW: AN - 22, max: 2, lh: 30});
    yy = T(ctx, "Qué hacer: " + accion(m).a, X + 22, yy + 8, {px: 25, w: 500, lh: 34, maxW: AN - 22, max: 3});
    ctx.fillStyle = c; ctx.fillRect(X, top, 6, yy - top - 20); regla(ctx, yy + 6, 1.5, .15); return yy + 8;
  };
  [["emerg", "Emergencias · atender", C.cri, "Ninguna emergencia abierta."], ["oport", "Oportunidades · difundir", C.pos, "Ninguna buena noticia pendiente de difusión."]].forEach(([k, tt, c, vacio]) => {
    const xs = d.hs.flatMap(h => h[k].map(m => ({h, m}))).slice(0, 5);
    if (!xs.length) B.push((ctx, y) => T(ctx, vacio, X, titulo(ctx, y + 40, tt, c) + 46, {px: 30, color: C.muted}));
    xs.forEach(({h, m}, i) => B.push(asunto(h, m, c, i === 0, tt)));
  });
  // Armado: cada bloque se mide en un lienzo de prueba; si no cabe, abre página nueva con un cabezal corto.
  const prueba = document.createElement("canvas"); prueba.width = W; prueba.height = 3000; const pctx = prueba.getContext("2d");
  const paginas = []; let pag = null;
  const nueva = () => { const cv = document.createElement("canvas"); cv.width = W; cv.height = EJ_HMAX; const ctx = cv.getContext("2d"); ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, EJ_HMAX);
    let y = 0; if (paginas.length) { y = 64; vfont(ctx, 700, 34, VF.h); ctx.textAlign = "left"; ctx.fillStyle = C.text; ctx.fillText("Pregon", X, y); ctx.fillStyle = C.blue; ctx.fillText("IA", X + ctx.measureText("Pregon").width, y);
      T(ctx, "Informe ejecutivo · " + inst(), W - X, y - 2, {px: 22, color: C.muted, align: "right", maxW: AN - 220, max: 1}); regla(ctx, y + 22); y += 24; }
    pag = {cv, ctx, y}; paginas.push(pag); };
  nueva();
  B.forEach(f => { const alto = f(pctx, 0); pctx.clearRect(0, 0, W, 3000); if (pag.y + alto > EJ_HMAX - EJ_PIE && pag.y > 120) nueva(); pag.y = f(pag.ctx, pag.y); });
  // Pie con número de página; cada página se recorta a su contenido (mínimo 1350 de alto, el formato 4:5).
  const nota = MODO.tipo !== "demo" || (typeof PILOTO !== "undefined" && PILOTO.activo) ? "Noticias reales de medios digitales · resúmenes propios · uso interno" : "Demostración con noticias ficticias";
  return paginas.map((p, i) => {
    const alto = Math.min(EJ_HMAX, Math.max(1350, Math.ceil(p.y + EJ_PIE))), ctx = p.ctx, y = alto - 56;
    ctx.fillStyle = C.bg; ctx.fillRect(0, p.y + 10, W, EJ_HMAX); regla(ctx, y - 40);
    T(ctx, nota, X, y, {px: 20, color: C.muted, maxW: AN - 200, max: 1}); T(ctx, `PregonIA · ${i + 1} de ${paginas.length}`, W - X, y, {px: 20, w: 600, color: C.muted, align: "right"});
    const out = document.createElement("canvas"); out.width = W; out.height = alto; out.getContext("2d").drawImage(p.cv, 0, 0);
    return out;
  });
}
async function ejecImagenes(){ return Promise.all((await ejecPaginas()).map(cv => new Promise(ok => cv.toBlob(ok, "image/png")))); }
/* PDF compacto: las mismas páginas, en JPEG, una por hoja del tamaño de la pantalla de un teléfono. Es lo que se comparte, como el video. */
async function ejecPDF(){
  const [pags, {jsPDF}] = await Promise.all([ejecPaginas(), cargarJsPDF()]), A = 540, alto = cv => cv.height * A / cv.width;
  const doc = new jsPDF({unit: "pt", format: [A, alto(pags[0])], orientation: "portrait", compress: true});
  doc.setProperties({title: "Informe ejecutivo · " + inst(), subject: "PregonIA · " + fechaLarga(NOW), creator: "PregonIA"});
  pags.forEach((cv, i) => { if (i) doc.addPage([A, alto(cv)], "portrait"); doc.addImage(cv.toDataURL("image/jpeg", 0.86), "JPEG", 0, 0, A, alto(cv), undefined, "FAST"); });
  return doc.output("blob");
}
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return; const a = b.dataset.act;
  if (a === "ej-copiar") { try { await navigator.clipboard.writeText(ejecTexto()); toast("Texto copiado: pégalo en WhatsApp o en un correo."); } catch(er) { toast("No se pudo copiar el texto."); } }
});

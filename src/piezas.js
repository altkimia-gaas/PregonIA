/* Redacción · piezas para las redes de El Pregonero, el medio informativo de ALTKimia (marca distinta del servicio PregonIA),
   dibujadas en canvas con su identidad: logo B «Las ondas» (P blanca con dos ondas coral), cobalto #1F4FD8, coral #FF6B4A,
   azul noche #0E1A3A y Space Grotesk («el» regular, «pregonero» en negrita). El texto largo va en Inter.
   Formatos: feed 4:5 (1080 × 1350), historia 9:16 (1080 × 1920), carrusel 4:5 y reel 9:16 con voz sintética y música.
   Reglas que vienen de la línea editorial y del checklist legal:
   - Sin fotos de los medios ni imágenes realistas hechas con IA: solo texto, datos y marca (derechos de autor y credibilidad).
   - Cada pieza cita la fuente y lleva la mención de IA (control 32). Los medios se nombran, nunca se usan sus logos (control 25).
   - El coral es solo gráfico (ondas, viñetas, barras): sobre cobalto no alcanza contraste para texto (control 26).
   - La música la compone el propio navegador (acordes sintetizados): no hay pistas de terceros que licenciar (control 29).
   Todo se genera en el navegador; nada se sube a un servidor en la fase 1. */
const PZ = {W: 1080, FEED: 1350, HIST: 1920, FPS: 30, OUT: [720, 1280]};
const PZC = {bg: "#1F4FD8", ink: "#FFFFFF", soft: "rgba(255,255,255,.82)", muted: "rgba(255,255,255,.72)", coral: "#FF6B4A", noche: "#0E1A3A", papel: "#FFFFFF", tinta: "#0E1A3A", gris: "#4A5470", track: "rgba(255,255,255,.22)", anillo: "rgba(255,255,255,.07)"};
const PZF = {h: '"Space Grotesk", Inter, system-ui, sans-serif', b: 'Inter, system-ui, sans-serif'};
const PZ_MARGEN = 84;
const PZ_MARCA = "El Pregonero";

function pzFuente(ctx, w, px, fam){ ctx.font = `${w} ${px}px ${fam}`; }
function pzEsp(ctx, v){ if ("letterSpacing" in ctx) ctx.letterSpacing = v + "px"; }
function pzLineas(ctx, txt, maxW){
  const out = []; for (const par of String(txt || "").split("\n")) { let l = ""; for (const w of par.split(/\s+/).filter(Boolean)) { const p = l ? l + " " + w : w; if (ctx.measureText(p).width > maxW && l) { out.push(l); l = w; } else l = p; } out.push(l); }
  return out.filter((l, i, a) => l || i < a.length - 1);
}
/* Texto con ajuste de línea; devuelve la y de la línea siguiente. a: opacidad (para las animaciones del reel). */
function pzTexto(ctx, txt, x, y, o = {}){
  const {px = 40, w = 400, fam = PZF.b, color = PZC.ink, maxW = PZ.W - 2 * PZ_MARGEN, lh = px * 1.24, a = 1, max = 99, align = "left", ls = 0} = o;
  pzFuente(ctx, w, px, fam); pzEsp(ctx, ls); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = "alphabetic";
  let L = pzLineas(ctx, txt, maxW); if (L.length > max) { L = L.slice(0, max); L[max - 1] = L[max - 1].replace(/\s*\S*$/, "") + "…"; }
  if (a > 0) { ctx.save(); ctx.globalAlpha *= Math.min(1, a); const dy = (1 - Math.min(1, a)) * 24; L.forEach((l, i) => ctx.fillText(l, x, y + dy + i * lh)); ctx.restore(); }
  pzEsp(ctx, 0); return y + L.length * lh;
}
/* Tamaño de letra más grande (entre max y min) con el que el texto cabe en maxLineas. */
function pzAjustar(ctx, txt, {w = 700, fam = PZF.h, max = 88, min = 50, maxW = PZ.W - 2 * PZ_MARGEN, maxLineas = 5}){
  for (let px = max; px >= min; px -= 2) { pzFuente(ctx, w, px, fam); if (pzLineas(ctx, txt, maxW).length <= maxLineas) return px; }
  return min;
}
function pzRR(ctx, x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

/* Símbolo: P con dos ondas. Geometría tomada del archivo de perfil (lienzo de 1080): la P mide 433 de alto.
   (x, y) es la esquina superior izquierda del asta; alto: altura de la P en píxeles; ondas: 0 a 1 (animación). */
function pzSimbolo(ctx, x, y, alto, {a = 1, ondas = 1, color = PZC.ink} = {}){
  const s = alto / 433, X = v => x + (v - 290) * s, Y = v => y + (v - 323) * s, R = v => v * s;
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = color;
  ctx.beginPath();
  // Contorno: asta con esquinas redondeadas y panza semicircular (centro 470, 491.5; radio 168.5).
  ctx.moveTo(X(306), Y(323)); ctx.lineTo(X(470), Y(323)); ctx.arc(X(470), Y(491.5), R(168.5), -Math.PI / 2, Math.PI / 2); ctx.lineTo(X(387), Y(660));
  ctx.lineTo(X(387), Y(740)); ctx.arcTo(X(387), Y(756), X(371), Y(756), R(16)); ctx.lineTo(X(306), Y(756)); ctx.arcTo(X(290), Y(756), X(290), Y(740), R(16));
  ctx.lineTo(X(290), Y(339)); ctx.arcTo(X(290), Y(323), X(306), Y(323), R(16)); ctx.closePath();
  // Hueco de la panza (centro 470, 491; radio 72).
  ctx.moveTo(X(387), Y(419)); ctx.lineTo(X(470), Y(419)); ctx.arc(X(470), Y(491), R(72), -Math.PI / 2, Math.PI / 2); ctx.lineTo(X(387), Y(563)); ctx.closePath();
  ctx.fill("evenodd");
  // Ondas coral, con remate redondo.
  ctx.strokeStyle = PZC.coral; ctx.lineCap = "round"; ctx.lineWidth = R(38);
  [[228, 0.61], [301, 0.52]].forEach(([r, ang], i) => { const v = Math.min(1, Math.max(0, ondas * 2 - i)); if (v <= 0) return;
    ctx.save(); ctx.globalAlpha *= v; ctx.beginPath(); ctx.arc(X(470), Y(491.5), R(r), -ang * v, ang * v); ctx.stroke(); ctx.restore(); });
  ctx.restore();
  return {ancho: R(771 + 19 - 290)};
}
/* Logo horizontal: símbolo + «el pregonero». alto = altura de la P. Devuelve el ancho total. */
function pzLogo(ctx, x, y, alto, {a = 1, ondas = 1, align = "left", color = PZC.ink} = {}){
  const px = alto * 0.78, gap = alto * 0.42;
  pzFuente(ctx, 400, px, PZF.h); const wEl = ctx.measureText("el ").width; pzFuente(ctx, 700, px, PZF.h); const wPr = ctx.measureText("pregonero").width;
  const wSim = alto / 433 * 500, total = wSim + gap + wEl + wPr;
  const x0 = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  pzSimbolo(ctx, x0, y, alto, {a, ondas, color});
  const base = y + alto * 0.74; ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = color; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  pzEsp(ctx, -px * 0.02); pzFuente(ctx, 400, px, PZF.h); ctx.fillText("el ", x0 + wSim + gap, base); pzFuente(ctx, 700, px, PZF.h); ctx.fillText("pregonero", x0 + wSim + gap + wEl, base); pzEsp(ctx, 0);
  ctx.restore(); return total;
}
/* Fondo cobalto con los anillos de la portada (ondas que se expanden). fase: desplazamiento para animarlos en el reel. */
function pzFondo(ctx, H, {fase = 0, lado = "der"} = {}){
  ctx.fillStyle = PZC.bg; ctx.fillRect(0, 0, PZ.W, H);
  const cx = lado === "der" ? PZ.W + 120 : -120, cy = H * 0.5;
  ctx.save(); ctx.strokeStyle = PZC.anillo; ctx.lineWidth = 34;
  for (let k = 0; k < 4; k++) { const r = 260 + k * 150 + (fase % 1) * 150; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
}
const pzFecha = ts => new Date(ts || Date.now()).toLocaleDateString("es-CL", {day: "numeric", month: "long", year: "numeric"});
/* Cabezal: logo y fecha, con un filete fino. */
function pzCabezal(ctx, c, y){
  pzLogo(ctx, PZ_MARGEN, y, 58);
  pzTexto(ctx, pzFecha(c.fechaPieza), PZ.W - PZ_MARGEN, y + 42, {px: 26, w: 500, color: PZC.muted, align: "right"});
  ctx.fillStyle = PZC.track; ctx.fillRect(PZ_MARGEN, y + 92, PZ.W - 2 * PZ_MARGEN, 2);
  return y + 92;
}
/* Antetítulo en píldora coral con texto azul noche (contraste alto). */
function pzKicker(ctx, txt, y, a = 1){
  const t = String(txt || "").toUpperCase(); if (!t) return y;
  pzFuente(ctx, 700, 26, PZF.h); pzEsp(ctx, 3); const w = Math.min(PZ.W - 2 * PZ_MARGEN, ctx.measureText(t).width + 44); pzEsp(ctx, 0);
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = PZC.coral; pzRR(ctx, PZ_MARGEN, y - 38, w, 54, 27); ctx.fill(); ctx.restore();
  pzTexto(ctx, t, PZ_MARGEN + 22, y - 2, {px: 26, w: 700, fam: PZF.h, color: PZC.noche, ls: 3, a, max: 1, maxW: w - 30});
  return y + 30;
}
/* Pie: fuente y mención de IA. */
function pzPie(ctx, c, H, a = 1){
  const y = H - 140; ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = PZC.track; ctx.fillRect(PZ_MARGEN, y, PZ.W - 2 * PZ_MARGEN, 2); ctx.restore();
  pzTexto(ctx, "Fuente: " + pzFuentes(c), PZ_MARGEN, y + 52, {px: 28, w: 600, a, max: 1});
  pzTexto(ctx, c.etiquetaIA || "Resumen elaborado con apoyo de IA y revisado por el equipo de " + PZ_MARCA, PZ_MARGEN, y + 94, {px: 23, w: 400, color: PZC.muted, a, max: 1});
}
const pzFuentes = c => { const ms = [...new Set((c.fuentes && c.fuentes.length ? c.fuentes : [c.fuente || {}]).map(f => f.medio).filter(Boolean))]; return ms.length ? (ms.length > 2 ? ms.slice(0, 2).join(", ") + " y otros" : ms.join(" y ")) : "[completar fuente]"; };
function pzDatos(ctx, datos, y, o = {}){
  const {px = 34, gap = 22, a = 1, max = 3, color = PZC.ink} = o;
  (datos || []).filter(Boolean).slice(0, max).forEach(d => {
    ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = PZC.coral; ctx.beginPath(); ctx.arc(PZ_MARGEN + 8, y - px * 0.36, 8, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    y = pzTexto(ctx, d, PZ_MARGEN + 36, y, {px, w: 500, a, color, maxW: PZ.W - 2 * PZ_MARGEN - 36, max: 3}) + gap;
  });
  return y;
}

/* Feed 4:5 */
function pzFeed(ctx, c){
  const H = PZ.FEED; pzFondo(ctx, H);
  let y = pzCabezal(ctx, c, 84) + 100;
  y = pzKicker(ctx, c.kicker, y) + 24;
  const px = pzAjustar(ctx, c.titular, {max: 84, min: 54, maxLineas: 5});
  y = pzTexto(ctx, c.titular || "[titular]", PZ_MARGEN, y + px * 0.6, {px, w: 700, fam: PZF.h, lh: px * 1.08, ls: -px * 0.02, max: 5}) + 14;
  if (c.bajada) y = pzTexto(ctx, c.bajada, PZ_MARGEN, y + 22, {px: 34, w: 400, color: PZC.soft, max: 4, lh: 46}) + 26;
  const restante = H - 180 - y, datos = (c.datos || []).filter(Boolean);
  if (datos.length && restante > 160) pzDatos(ctx, datos, y + 34, {px: 31, max: restante > 330 ? 3 : 2, gap: 16});
  pzPie(ctx, c, H);
}
/* Historia 9:16: el contenido evita los 250 px de arriba y los 300 de abajo, donde Instagram pone su interfaz. */
function pzHistoria(ctx, c){
  const H = PZ.HIST; pzFondo(ctx, H);
  let y = pzCabezal(ctx, c, 280) + 130;
  y = pzKicker(ctx, c.kicker, y) + 30;
  const t = (c.historia && c.historia.t) || c.titular, px = pzAjustar(ctx, t, {max: 96, min: 60, maxLineas: 6});
  y = pzTexto(ctx, t || "[titular]", PZ_MARGEN, y + px * 0.6, {px, w: 700, fam: PZF.h, lh: px * 1.08, ls: -px * 0.02, max: 6}) + 30;
  const x = (c.historia && c.historia.x) || c.bajada;
  if (x) y = pzTexto(ctx, x, PZ_MARGEN, y + 20, {px: 40, w: 400, color: PZC.soft, max: 5, lh: 54}) + 30;
  // Llamado a ver el detalle en el feed: píldora blanca con texto cobalto.
  const ty = Math.min(Math.max(y + 60, 1240), 1440); pzFuente(ctx, 700, 34, PZF.h); const lbl = "El detalle, en nuestra publicación", w = ctx.measureText(lbl).width + 80;
  ctx.fillStyle = PZC.papel; pzRR(ctx, PZ_MARGEN, ty, w, 84, 42); ctx.fill(); pzTexto(ctx, lbl, PZ_MARGEN + 40, ty + 54, {px: 34, w: 700, fam: PZF.h, color: PZC.bg});
  ctx.fillStyle = PZC.track; ctx.fillRect(PZ_MARGEN, 1540, PZ.W - 2 * PZ_MARGEN, 2);
  pzTexto(ctx, "Fuente: " + pzFuentes(c), PZ_MARGEN, 1590, {px: 28, w: 600, max: 1});
  pzTexto(ctx, c.etiquetaIA || "Resumen elaborado con apoyo de IA y revisado por el equipo de " + PZ_MARCA, PZ_MARGEN, 1630, {px: 23, w: 400, color: PZC.muted, max: 2});
}
/* Carrusel: portada y cierre en cobalto; las láminas del medio en papel blanco, para dar ritmo y leer mejor el texto largo. */
function pzLaminas(c){ return [{k: "portada"}, ...((c.slides || []).filter(s => s && (s.t || s.x)).slice(0, 4).map(s => ({k: "punto", ...s}))), {k: "cierre"}]; }
function pzPuntos(ctx, n, i, H, claro){ for (let k = 0; k < n; k++) { ctx.fillStyle = k === i ? (claro ? PZC.bg : PZC.ink) : (claro ? "#D6DCEB" : PZC.track); pzRR(ctx, PZ.W - PZ_MARGEN - (n - k) * 30 + 12, H - 76, 18, 18, 9); ctx.fill(); } }
function pzLamina(ctx, c, i){
  const H = PZ.FEED, L = pzLaminas(c), s = L[i] || L[0], n = L.length;
  if (s.k === "punto") {
    ctx.fillStyle = PZC.papel; ctx.fillRect(0, 0, PZ.W, H);
    ctx.fillStyle = PZC.bg; ctx.fillRect(0, 0, PZ.W, 18);
    pzSimbolo(ctx, PZ_MARGEN, 84, 58, {color: PZC.bg});
    pzTexto(ctx, `${i} / ${n - 2}`, PZ.W - PZ_MARGEN, 128, {px: 30, w: 700, fam: PZF.h, color: PZC.bg, align: "right"});
    const px = pzAjustar(ctx, s.t || "", {max: 76, min: 50, maxLineas: 3});
    ctx.fillStyle = PZC.coral; ctx.fillRect(PZ_MARGEN, 300, 120, 10);
    let y = pzTexto(ctx, s.t || "", PZ_MARGEN, 360 + px * 0.6, {px, w: 700, fam: PZF.h, color: PZC.tinta, lh: px * 1.08, ls: -px * 0.02, max: 3}) + 20;
    pzTexto(ctx, s.x || "", PZ_MARGEN, y + 30, {px: 38, w: 400, color: PZC.gris, lh: 54, max: 9});
    pzPuntos(ctx, n, i, H, true); return;
  }
  pzFondo(ctx, H, {lado: s.k === "cierre" ? "izq" : "der"});
  let y = pzCabezal(ctx, c, 84) + 100;
  if (s.k === "portada") {
    y = pzKicker(ctx, c.kicker, y) + 24;
    const px = pzAjustar(ctx, c.titular, {max: 92, min: 58, maxLineas: 6});
    y = pzTexto(ctx, c.titular || "[titular]", PZ_MARGEN, y + px * 0.6, {px, w: 700, fam: PZF.h, lh: px * 1.08, ls: -px * 0.02, max: 6});
    if (c.bajada) pzTexto(ctx, c.bajada, PZ_MARGEN, y + 50, {px: 34, w: 400, color: PZC.soft, max: 3, lh: 46});
    pzTexto(ctx, "Desliza  →", PZ_MARGEN, H - 60, {px: 30, w: 700, fam: PZF.h});
  } else {
    pzTexto(ctx, "FUENTES", PZ_MARGEN, y, {px: 26, w: 700, fam: PZF.h, ls: 4, color: PZC.muted}); y += 30;
    const fs = (c.fuentes && c.fuentes.length ? c.fuentes : [c.fuente || {}]).filter(f => f.medio).slice(0, 5);
    fs.forEach(f => { y = pzTexto(ctx, f.medio, PZ_MARGEN, y + 24, {px: 40, w: 700, fam: PZF.h, max: 1}); if (f.fecha) y = pzTexto(ctx, pzFecha(f.fecha), PZ_MARGEN, y + 2, {px: 26, w: 400, color: PZC.muted}); y += 8; });
    if (!fs.length) y = pzTexto(ctx, "[completar fuente]", PZ_MARGEN, y + 24, {px: 40, w: 700, fam: PZF.h});
    y = Math.max(y + 70, 860);
    pzLogo(ctx, PZ_MARGEN, y - 60, 72);
    pzTexto(ctx, "Noticias de la Región de Valparaíso, comuna por comuna. Hechos con fuente, sin opinión.", PZ_MARGEN, y + 70, {px: 30, w: 400, color: PZC.soft, max: 3});
    pzTexto(ctx, c.etiquetaIA || "Resumen elaborado con apoyo de IA y revisado por el equipo de " + PZ_MARCA, PZ_MARGEN, H - 120, {px: 24, w: 400, color: PZC.muted, max: 2, maxW: PZ.W - 2 * PZ_MARGEN - 200});
  }
  pzPuntos(ctx, n, i, H, false);
}

/* Reel 9:16: escenas (portada, un dato por escena, cierre) sincronizadas con la voz de cada escena. */
const PZ_VOZ_INI = 0.35, PZ_VOZ_COLA = 0.7;
function pzEscenas(c){
  const g = c.guion || {}, datos = (c.datos || []).filter(Boolean).slice(0, 3);
  const S = [{k: "intro", dur: 4.4, txt: g.intro || c.titular}];
  datos.forEach((d, i) => S.push({k: "dato", dur: 4.6, i, de: datos.length, d, txt: (g.datos && g.datos[i]) || d}));
  S.push({k: "cierre", dur: 4.6, txt: g.cierre || `Fuente: ${pzFuentes(c)}. Esto fue El Pregonero.`});
  return S;
}
function pzRetimar(plan){ let t = 0; plan.escenas.forEach(s => { s.base ??= s.dur; s.dur = s.voz ? Math.max(s.base, PZ_VOZ_INI + s.voz.duration + PZ_VOZ_COLA) : s.base; s.t0 = t; t += s.dur; }); plan.total = t; return plan; }
const pzEase = x => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const pzIn = (l, t0, d = 0.6) => pzEase((l - t0) / d);
function pzReelCuadro(ctx, plan, t){
  const c = plan.c, H = PZ.HIST, k = ctx.canvas.width / PZ.W; ctx.setTransform(k, 0, 0, k, 0, 0); ctx.globalAlpha = 1;
  const s = plan.escenas.find(x => t < x.t0 + x.dur) || plan.escenas[plan.escenas.length - 1], l = Math.min(t - s.t0, s.dur);
  pzFondo(ctx, H, {fase: t / 4, lado: s.k === "cierre" ? "izq" : "der"});
  // Progreso arriba, como en las historias.
  const n = plan.escenas.length, gap = 10, w = (PZ.W - 2 * 60 - gap * (n - 1)) / n;
  plan.escenas.forEach((x, i) => { const p = Math.min(1, Math.max(0, (t - x.t0) / x.dur)); ctx.fillStyle = PZC.track; pzRR(ctx, 60 + i * (w + gap), 60, w, 8, 4); ctx.fill(); if (p > 0) { ctx.fillStyle = PZC.ink; pzRR(ctx, 60 + i * (w + gap), 60, Math.max(8, w * p), 8, 4); ctx.fill(); } });
  ctx.save(); ctx.globalAlpha = Math.min(1, (s.dur - l) / 0.35 + (s.k === "cierre" ? 1 : 0));
  if (s.k === "intro") {
    pzLogo(ctx, PZ.W / 2, 420, 96, {a: pzIn(l, 0), ondas: pzIn(l, 0.1, 1), align: "center"});
    pzKicker(ctx, c.kicker, 740, pzIn(l, 0.4));
    const px = pzAjustar(ctx, c.titular, {max: 100, min: 64, maxLineas: 6});
    const y = pzTexto(ctx, c.titular, PZ_MARGEN, 820 + px * 0.6, {px, w: 700, fam: PZF.h, lh: px * 1.08, ls: -px * 0.02, a: pzIn(l, 0.65, 0.8), max: 6});
    if (c.bajada) pzTexto(ctx, c.bajada, PZ_MARGEN, y + 50, {px: 40, w: 400, color: PZC.soft, lh: 54, a: pzIn(l, 1.4), max: 4});
  } else if (s.k === "dato") {
    pzLogo(ctx, PZ_MARGEN, 150, 54, {ondas: 0.5 + 0.5 * Math.abs(Math.sin(t * 2))});
    pzKicker(ctx, c.kicker, 580, pzIn(l, 0));
    pzTexto(ctx, `${s.i + 1} de ${s.de}`, PZ_MARGEN, 690, {px: 34, w: 700, fam: PZF.h, color: PZC.muted, a: pzIn(l, 0.15)});
    ctx.save(); ctx.globalAlpha *= pzIn(l, 0.2); ctx.fillStyle = PZC.coral; ctx.fillRect(PZ_MARGEN, 750, 180 * pzIn(l, 0.2, 0.8), 12); ctx.restore();
    const px = pzAjustar(ctx, s.d, {max: 84, min: 54, maxLineas: 7});
    pzTexto(ctx, s.d, PZ_MARGEN, 860 + px * 0.6, {px, w: 700, fam: PZF.h, lh: px * 1.1, ls: -px * 0.015, a: pzIn(l, 0.35, 0.8), max: 7});
  } else {
    pzTexto(ctx, "FUENTE", PZ_MARGEN, 560, {px: 30, w: 700, fam: PZF.h, ls: 4, color: PZC.muted, a: pzIn(l, 0)});
    let y = pzTexto(ctx, pzFuentes(c), PZ_MARGEN, 660, {px: 70, w: 700, fam: PZF.h, lh: 80, a: pzIn(l, 0.2), max: 3});
    if (c.fuente && c.fuente.fecha) pzTexto(ctx, pzFecha(c.fuente.fecha), PZ_MARGEN, y + 10, {px: 36, w: 500, color: PZC.muted, a: pzIn(l, 0.4)});
    pzLogo(ctx, PZ.W / 2, 1120, 120, {a: pzIn(l, 0.8), ondas: pzIn(l, 0.9, 1.2), align: "center"});
    pzTexto(ctx, "Noticias de la Región de Valparaíso, comuna por comuna", PZ.W / 2, 1360, {px: 34, w: 400, fam: PZF.h, color: PZC.soft, a: pzIn(l, 1.1), align: "center", maxW: PZ.W - 160, max: 2});
    pzTexto(ctx, "Guion con apoyo de IA, revisado por el equipo · Voz sintética", PZ.W / 2, 1520, {px: 28, w: 500, color: PZC.muted, a: pzIn(l, 1.3), align: "center", maxW: PZ.W - 160, max: 2});
  }
  ctx.restore();
}

/* Música propia: acordes suaves sintetizados (La menor, Fa, Do, Sol), con entrada y salida, bajo la voz. */
async function pzMusica(total, SR = 48000){
  const oc = new OfflineAudioContext(1, Math.ceil(total * SR), SR), maestro = oc.createGain(); maestro.gain.value = 1; maestro.connect(oc.destination);
  const filtro = oc.createBiquadFilter(); filtro.type = "lowpass"; filtro.frequency.value = 1400; filtro.connect(maestro);
  const ACORDES = [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]], DUR = 2.4;
  for (let t = 0, k = 0; t < total; t += DUR, k++) {
    ACORDES[k % 4].forEach((f, j) => {
      const o = oc.createOscillator(), g = oc.createGain(); o.type = j === 0 ? "triangle" : "sine"; o.frequency.value = f; o.detune.value = (j - 1) * 4;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.5); g.gain.setValueAtTime(0.05, t + DUR - 0.4); g.gain.linearRampToValueAtTime(0, t + DUR + 0.2);
      o.connect(g); g.connect(filtro); o.start(t); o.stop(Math.min(total, t + DUR + 0.25));
    });
    // Pulso suave en cada tiempo.
    for (let b = 0; b < 4; b++) { const tb = t + b * DUR / 4; if (tb >= total) break; const o = oc.createOscillator(), g = oc.createGain(); o.type = "sine"; o.frequency.value = ACORDES[k % 4][0] / 2;
      g.gain.setValueAtTime(0.0001, tb); g.gain.exponentialRampToValueAtTime(0.07, tb + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, tb + 0.35); o.connect(g); g.connect(filtro); o.start(tb); o.stop(tb + 0.4); }
  }
  maestro.gain.setValueAtTime(0, 0); maestro.gain.linearRampToValueAtTime(1, 1.2); maestro.gain.setValueAtTime(1, Math.max(1.2, total - 1.5)); maestro.gain.linearRampToValueAtTime(0, total);
  return await oc.startRendering();
}
/* Mezcla: la voz de cada escena en su tiempo y la música baja (más baja aún mientras se habla). */
async function pzMezcla(plan, conMusica = true){
  const SR = 48000, oc = new OfflineAudioContext(1, Math.ceil(plan.total * SR), SR);
  if (conMusica) { const m = await pzMusica(plan.total, SR), src = oc.createBufferSource(), g = oc.createGain(); src.buffer = m; g.gain.value = 0.55;
    plan.escenas.forEach(s => { if (!s.voz) return; const a = s.t0 + PZ_VOZ_INI, b = a + s.voz.duration; g.gain.setValueAtTime(0.55, Math.max(0, a - 0.25)); g.gain.linearRampToValueAtTime(0.22, a); g.gain.setValueAtTime(0.22, b); g.gain.linearRampToValueAtTime(0.55, b + 0.4); });
    src.connect(g); g.connect(oc.destination); src.start(0); }
  plan.escenas.forEach(s => { if (!s.voz) return; const src = oc.createBufferSource(); src.buffer = s.voz; src.connect(oc.destination); src.start(s.t0 + PZ_VOZ_INI); });
  return await oc.startRendering();
}

/* Exportación a MP4 en el navegador (WebCodecs + mp4-muxer), como el video resumen del parte. */
function pzScript(url, global){
  pzScript.p ||= {};
  return pzScript.p[url] ||= new Promise((ok, no) => { if (window[global]) return ok(window[global]); const s = document.createElement("script"); s.src = url;
    s.onload = () => window[global] ? ok(window[global]) : no(new Error(global)); s.onerror = () => { delete pzScript.p[url]; s.remove(); no(new Error(global)); }; document.head.appendChild(s); });
}
async function pzMP4(plan, audio, onProg = () => {}, signal){
  if (!window.VideoEncoder || !window.VideoFrame) return null;
  const [w, h] = PZ.OUT, base = {width: w, height: h, bitrate: 3_500_000, framerate: PZ.FPS, avc: {format: "avc"}};
  let cfg = null;
  for (const codec of ["avc1.640028", "avc1.4d0028", "avc1.42e028", "avc1.42001f"]) { try { const c = {...base, codec}; if ((await VideoEncoder.isConfigSupported(c)).supported) { cfg = c; break; } } catch(e) {} }
  if (!cfg) return null;
  const Mx = await pzScript("https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.1/build/mp4-muxer.js", "Mp4Muxer").catch(() => null); if (!Mx) return null;
  let acfg = null;
  if (audio && window.AudioEncoder) for (const [codec, mx] of [["mp4a.40.2", "aac"], ["opus", "opus"]]) { try { const c = {codec, sampleRate: 48000, numberOfChannels: 1, bitrate: 128000}; if ((await AudioEncoder.isConfigSupported(c)).supported) { acfg = {c, mx}; break; } } catch(e) {} }
  const muxer = new Mx.Muxer({target: new Mx.ArrayBufferTarget(), video: {codec: "avc", width: w, height: h, frameRate: PZ.FPS}, ...(acfg ? {audio: {codec: acfg.mx, numberOfChannels: 1, sampleRate: 48000}} : {}), fastStart: "in-memory"});
  plan.audioCodec = acfg ? acfg.mx : null;
  if (acfg) {
    let fallo = null; const aenc = new AudioEncoder({output: (ch, m) => muxer.addAudioChunk(ch, m), error: e => { fallo = e; }}); aenc.configure(acfg.c);
    const pcm = audio.getChannelData(0), PASO = 4800;
    for (let i = 0; i < pcm.length; i += PASO) { const tr = pcm.slice(i, Math.min(pcm.length, i + PASO)); const ad = new AudioData({format: "f32-planar", sampleRate: 48000, numberOfFrames: tr.length, numberOfChannels: 1, timestamp: Math.round(i / 48000 * 1e6), data: tr}); aenc.encode(ad); ad.close(); while (aenc.encodeQueueSize > 20) await new Promise(r => setTimeout(r, 2)); }
    await aenc.flush(); aenc.close(); if (fallo) throw fallo;
  }
  let fallo = null; const enc = new VideoEncoder({output: (ch, m) => muxer.addVideoChunk(ch, m), error: e => { fallo = e; }}); enc.configure(cfg);
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const ctx = cv.getContext("2d"), n = Math.ceil(plan.total * PZ.FPS);
  try {
    for (let f = 0; f < n; f++) {
      if (signal && signal.aborted) throw {code: "cancelled"}; if (fallo) throw fallo;
      pzReelCuadro(ctx, plan, f / PZ.FPS);
      const vf = new VideoFrame(cv, {timestamp: Math.round(f * 1e6 / PZ.FPS), duration: Math.round(1e6 / PZ.FPS)}); enc.encode(vf, {keyFrame: f % (PZ.FPS * 2) === 0}); vf.close();
      while (enc.encodeQueueSize > 6) await new Promise(r => setTimeout(r, 4));
      if (f % 6 === 0) { onProg(f / n); await new Promise(r => setTimeout(r, 0)); }
    }
    await enc.flush(); if (fallo) throw fallo; muxer.finalize();
  } finally { if (enc.state !== "closed") enc.close(); }
  onProg(1); return new Blob([muxer.target.buffer], {type: "video/mp4"});
}
/* Respaldo para navegadores sin WebCodecs: graba en tiempo real. */
async function pzGrabado(plan, audio, onProg = () => {}, signal){
  if (!window.MediaRecorder) return null;
  const mime = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find(t => MediaRecorder.isTypeSupported(t)); if (!mime) return null;
  const [w, h] = PZ.OUT, cv = document.createElement("canvas"); cv.width = w; cv.height = h; const ctx = cv.getContext("2d"); pzReelCuadro(ctx, plan, 0);
  const pista = cv.captureStream(PZ.FPS); let ac = null, src = null;
  if (audio) { try { ac = new AudioContext(); const d = ac.createMediaStreamDestination(); src = ac.createBufferSource(); src.buffer = audio; src.connect(d); d.stream.getAudioTracks().forEach(t => pista.addTrack(t)); } catch(e) { ac = null; } }
  const rec = new MediaRecorder(pista, {mimeType: mime, videoBitsPerSecond: 3_500_000}), partes = []; rec.ondataavailable = e => { if (e.data && e.data.size) partes.push(e.data); };
  const fin = new Promise(r => rec.onstop = r); rec.start(500); if (src) { await ac.resume().catch(() => {}); src.start(); }
  const t0 = performance.now();
  await new Promise(ok => { const loop = () => { const t = (performance.now() - t0) / 1000; if ((signal && signal.aborted) || t >= plan.total) return ok(); pzReelCuadro(ctx, plan, t); onProg(t / plan.total); requestAnimationFrame(loop); }; loop(); });
  rec.stop(); await fin; if (ac) ac.close().catch(() => {}); if (signal && signal.aborted) throw {code: "cancelled"};
  return new Blob(partes, {type: mime.split(";")[0]});
}
/* Imagen PNG de un formato. */
function pzPNG(dibujar, alto){ const cv = document.createElement("canvas"); cv.width = PZ.W; cv.height = alto; dibujar(cv.getContext("2d")); return new Promise(ok => cv.toBlob(ok, "image/png")); }
const PZ_FUENTES = ['400 40px Inter', '500 40px Inter', '600 40px Inter', '700 40px Inter', '400 60px "Space Grotesk"', '700 60px "Space Grotesk"'];
const pzFuentesListas = () => Promise.all(PZ_FUENTES.map(f => document.fonts.load(f).catch(() => {})));

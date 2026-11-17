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
/* Identidad «El bando» (17 de noviembre de 2026): las piezas se leen como un boletín impreso y no como publicidad.
   Papel blanco como base, mancheta cobalto arriba con trama de imprenta, filetes de periódico en azul noche,
   antetítulo con cuadrado coral, datos numerados 01·02·03 y pie en azul noche con la fuente.
   Mismos colores de la marca; cambian las proporciones (dominan el papel y la tinta) y desaparecen los anillos. */
const PZ_LINEA = "rgba(14,26,58,.14)";
/* Trama de imprenta: puntos que crecen hacia un lado. dir 1: crecen hacia la derecha; -1: hacia la izquierda. */
function pzTrama(ctx, x, y, w, h, {color = "rgba(255,255,255,.16)", paso = 24, dir = 1, fase = 0} = {}){
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.fillStyle = color;
  const off = (fase % 1) * paso;
  for (let px = x - paso + off; px < x + w + paso; px += paso) {
    const t = Math.min(1, Math.max(0, (px - x) / w)), r = (dir > 0 ? t : 1 - t) * paso * 0.42;
    if (r < 0.6) continue;
    for (let py = y + paso / 2, fila = 0; py < y + h + paso; py += paso, fila++) { ctx.beginPath(); ctx.arc(px + (fila % 2) * paso / 2, py, r, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}
/* Fondo: papel blanco (o azul noche para cierres). */
function pzFondo(ctx, H, {tono = "papel"} = {}){ ctx.fillStyle = tono === "noche" ? PZC.noche : PZC.papel; ctx.fillRect(0, 0, PZ.W, H); }
const pzFecha = ts => new Date(ts || Date.now()).toLocaleDateString("es-CL", {day: "numeric", month: "long", year: "numeric"});
/* Mancheta: banda cobalto con trama, logo blanco, región y fecha; debajo, doble filete de periódico. Devuelve la y bajo los filetes. */
function pzMancheta(ctx, c, {alto = 210, yLogo = 76, logo = 58, fase = 0, a = 1, derecha = true} = {}){
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = PZC.bg; ctx.fillRect(0, 0, PZ.W, alto);
  pzTrama(ctx, PZ.W * 0.5, 0, PZ.W * 0.5, alto, {fase});
  ctx.restore();
  pzLogo(ctx, PZ_MARGEN, yLogo, logo, {a});
  if (derecha) {
    pzTexto(ctx, "REGIÓN DE VALPARAÍSO", PZ.W - PZ_MARGEN, yLogo + logo * 0.42, {px: 22, w: 700, fam: PZF.h, ls: 3, align: "right", a});
    pzTexto(ctx, pzFecha(c.fechaPieza), PZ.W - PZ_MARGEN, yLogo + logo * 0.42 + 36, {px: 24, w: 500, color: PZC.soft, align: "right", a});
  }
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = PZC.noche; ctx.fillRect(PZ_MARGEN, alto + 24, PZ.W - 2 * PZ_MARGEN, 6); ctx.fillRect(PZ_MARGEN, alto + 36, PZ.W - 2 * PZ_MARGEN, 2); ctx.restore();
  return alto + 38;
}
function pzCabezal(ctx, c, y){ return pzMancheta(ctx, c); }
/* Antetítulo: cuadrado coral y texto azul noche en versalitas espaciadas (como la data de un despacho). */
function pzKicker(ctx, txt, y, a = 1, {color = PZC.noche} = {}){
  const t = String(txt || "").toUpperCase(); if (!t) return y;
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = PZC.coral; ctx.fillRect(PZ_MARGEN, y - 22, 22, 22); ctx.restore();
  pzTexto(ctx, t, PZ_MARGEN + 40, y, {px: 26, w: 700, fam: PZF.h, color, ls: 4, a, max: 1, maxW: PZ.W - 2 * PZ_MARGEN - 40});
  return y + 22;
}
/* Pie: banda azul noche con la fuente y la mención de IA. */
function pzPie(ctx, c, H, a = 1, alto = 150){
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = PZC.noche; ctx.fillRect(0, H - alto, PZ.W, alto); ctx.fillStyle = PZC.coral; ctx.fillRect(PZ_MARGEN, H - alto, 96, 6); ctx.restore();
  pzTexto(ctx, pzFuenteLinea(c), PZ_MARGEN, H - alto + 66, {px: 28, w: 600, a, max: 1});
  pzTexto(ctx, c.etiquetaIA || "Resumen elaborado con apoyo de IA y revisado por el equipo de " + PZ_MARCA, PZ_MARGEN, H - alto + 106, {px: 22, w: 400, color: PZC.muted, a, max: 1});
}
const pzDominio = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch(e) { return ""; } };
/* Línea de fuente de la pieza: con un solo medio agrega su dominio, para que se sepa dónde está la nota original. */
const pzFuenteLinea = c => { const fs = (c.fuentes && c.fuentes.length ? c.fuentes : [c.fuente || {}]).filter(f => f && f.medio), d = fs.length === 1 ? pzDominio(fs[0].url) : ""; return "Fuente: " + pzFuentes(c) + (d && rdSinTildes(d) !== rdSinTildes(fs[0].medio) ? " · " + d : ""); };
const rdSinTildes = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, "");
const pzFuentes = c => { const ms = [...new Set((c.fuentes && c.fuentes.length ? c.fuentes : [c.fuente || {}]).map(f => f.medio).filter(Boolean))]; return ms.length ? (ms.length > 2 ? ms.slice(0, 2).join(", ") + " y otros" : ms.join(" y ")) : "[completar fuente]"; };
/* Datos numerados 01, 02, 03 con filetes finos entre ellos. */
function pzDatos(ctx, datos, y, o = {}){
  const {px = 31, gap = 20, a = 1, max = 3, color = PZC.tinta} = o, L = (datos || []).filter(Boolean).slice(0, max);
  L.forEach((d, i) => {
    ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = PZ_LINEA; ctx.fillRect(PZ_MARGEN, y - px - 14, PZ.W - 2 * PZ_MARGEN, 2); ctx.restore();
    pzTexto(ctx, String(i + 1).padStart(2, "0"), PZ_MARGEN, y + 4, {px: px + 6, w: 700, fam: PZF.h, color: PZC.bg, a});
    y = pzTexto(ctx, d, PZ_MARGEN + 74, y, {px, w: 500, a, color, maxW: PZ.W - 2 * PZ_MARGEN - 74, max: 3, lh: px * 1.3}) + gap + 14;
  });
  return y;
}
function pzTitular(ctx, t, y, {max = 78, min = 52, lineas = 5, color = PZC.tinta, a = 1} = {}){
  const px = pzAjustar(ctx, t, {max, min, maxLineas: lineas});
  y = pzTexto(ctx, t || "[titular]", PZ_MARGEN, y + px * 0.82, {px, w: 700, fam: PZF.h, color, lh: px * 1.06, ls: -px * 0.025, max: lineas, a});
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = PZC.coral; ctx.fillRect(PZ_MARGEN, y - px * 0.06 + 10, 96, 8); ctx.restore();
  return y + 24;
}
/* Feed 4:5 */
function pzFeed(ctx, c){
  const H = PZ.FEED; pzFondo(ctx, H);
  let y = pzMancheta(ctx, c) + 74;
  y = pzKicker(ctx, c.kicker, y) + 14;
  y = pzTitular(ctx, c.titular, y);
  if (c.bajada) y = pzTexto(ctx, c.bajada, PZ_MARGEN, y + 40, {px: 32, w: 400, color: PZC.gris, max: 4, lh: 44}) + 10;
  // Entran tantos datos como quepan completos sobre el pie (se mide antes de dibujar).
  const datos = (c.datos || []).filter(Boolean), tope = H - 150 - 30, alto = d => { pzFuente(ctx, 500, 31, PZF.b); return Math.min(3, pzLineas(ctx, d, PZ.W - 2 * PZ_MARGEN - 74).length) * 31 * 1.3 + 34; };
  let caben = 0, yy = y + 62; for (const d of datos.slice(0, 3)) { if (yy + alto(d) - 31 > tope) break; yy += alto(d); caben++; }
  if (caben) pzDatos(ctx, datos, y + 62, {max: caben});
  pzPie(ctx, c, H);
}
/* Historia 9:16: el contenido evita los 250 px de arriba y los 300 de abajo, donde Instagram pone su interfaz. */
function pzHistoria(ctx, c){
  const H = PZ.HIST; pzFondo(ctx, H);
  let y = pzMancheta(ctx, c, {alto: 420, yLogo: 290, logo: 64}) + 100;
  y = pzKicker(ctx, c.kicker, y) + 16;
  const t = (c.historia && c.historia.t) || c.titular;
  y = pzTitular(ctx, t, y, {max: 96, min: 60, lineas: 6});
  const x = (c.historia && c.historia.x) || c.bajada;
  if (x) y = pzTexto(ctx, x, PZ_MARGEN, y + 46, {px: 40, w: 400, color: PZC.gris, max: 5, lh: 54}) + 20;
  // Llamado a ver el detalle en el feed: rótulo azul noche, de esquinas rectas.
  const ty = Math.min(Math.max(y + 50, 1180), 1380); pzFuente(ctx, 700, 32, PZF.h); const lbl = "El detalle, en nuestra publicación  →", w = ctx.measureText(lbl).width + 72;
  ctx.fillStyle = PZC.noche; pzRR(ctx, PZ_MARGEN, ty, w, 84, 6); ctx.fill(); pzTexto(ctx, lbl, PZ_MARGEN + 36, ty + 54, {px: 32, w: 700, fam: PZF.h});
  pzPie(ctx, c, H, 1, 420);
}
/* Carrusel: portada como la del feed, láminas de lectura en papel y cierre en azul noche con las fuentes. */
function pzLaminas(c){ return [{k: "portada"}, ...((c.slides || []).filter(s => s && (s.t || s.x)).slice(0, 4).map(s => ({k: "punto", ...s}))), {k: "cierre"}]; }
function pzPuntos(ctx, n, i, y, claro){ for (let k = 0; k < n; k++) { ctx.fillStyle = k === i ? (claro ? PZC.bg : PZC.ink) : (claro ? "#D6DCEB" : PZC.track); ctx.fillRect(PZ.W - PZ_MARGEN - (n - k) * 30 + 12, y, 18, 18); } }
function pzLamina(ctx, c, i){
  const H = PZ.FEED, L = pzLaminas(c), s = L[i] || L[0], n = L.length;
  if (s.k === "punto") {
    pzFondo(ctx, H);
    ctx.fillStyle = PZC.bg; ctx.fillRect(0, 0, PZ.W, 150); pzTrama(ctx, PZ.W * 0.55, 0, PZ.W * 0.45, 150);
    pzLogo(ctx, PZ_MARGEN, 48, 52);
    ctx.fillStyle = PZC.noche; ctx.fillRect(PZ_MARGEN, 174, PZ.W - 2 * PZ_MARGEN, 6); ctx.fillRect(PZ_MARGEN, 186, PZ.W - 2 * PZ_MARGEN, 2);
    pzTexto(ctx, String(i).padStart(2, "0"), PZ_MARGEN, 400, {px: 180, w: 700, fam: PZF.h, color: PZC.bg, ls: -6});
    pzTexto(ctx, `de ${String(n - 2).padStart(2, "0")}`, PZ_MARGEN + 236, 400, {px: 34, w: 500, fam: PZF.h, color: PZC.gris});
    const y = pzTitular(ctx, s.t || "", 450, {max: 72, min: 48, lineas: 3});
    pzTexto(ctx, s.x || "", PZ_MARGEN, y + 50, {px: 36, w: 400, color: PZC.gris, lh: 52, max: 9});
    ctx.fillStyle = PZ_LINEA; ctx.fillRect(PZ_MARGEN, H - 110, PZ.W - 2 * PZ_MARGEN, 2);
    pzTexto(ctx, PZ_MARCA, PZ_MARGEN, H - 58, {px: 24, w: 700, fam: PZF.h, color: PZC.noche});
    pzPuntos(ctx, n, i, H - 76, true); return;
  }
  if (s.k === "portada") {
    pzFondo(ctx, H);
    let y = pzMancheta(ctx, c) + 74;
    y = pzKicker(ctx, c.kicker, y) + 14;
    y = pzTitular(ctx, c.titular, y, {max: 92, min: 58, lineas: 6});
    if (c.bajada) pzTexto(ctx, c.bajada, PZ_MARGEN, y + 40, {px: 32, w: 400, color: PZC.gris, max: 3, lh: 44});
    ctx.fillStyle = PZC.noche; ctx.fillRect(0, H - 130, PZ.W, 130); ctx.fillStyle = PZC.coral; ctx.fillRect(PZ_MARGEN, H - 130, 96, 6);
    pzTexto(ctx, "Desliza  →", PZ_MARGEN, H - 52, {px: 30, w: 700, fam: PZF.h});
    pzPuntos(ctx, n, i, H - 76, false); return;
  }
  pzFondo(ctx, H, {tono: "noche"}); pzTrama(ctx, PZ.W * 0.5, 0, PZ.W * 0.5, 240, {color: "rgba(31,79,216,.6)"});
  pzLogo(ctx, PZ_MARGEN, 96, 58);
  let y = 300;
  pzTexto(ctx, "FUENTES", PZ_MARGEN, y, {px: 26, w: 700, fam: PZF.h, ls: 4, color: PZC.muted}); y += 30;
  const fs = (c.fuentes && c.fuentes.length ? c.fuentes : [c.fuente || {}]).filter(f => f.medio).slice(0, 5);
  fs.forEach(f => { ctx.fillStyle = PZC.coral; ctx.fillRect(PZ_MARGEN, y + 12, 22, 22); y = pzTexto(ctx, f.medio, PZ_MARGEN + 40, y + 34, {px: 40, w: 700, fam: PZF.h, max: 1}); const sub = [pzDominio(f.url), f.fecha ? pzFecha(f.fecha) : ""].filter(Boolean).join(" · "); if (sub) y = pzTexto(ctx, sub, PZ_MARGEN + 40, y + 2, {px: 26, w: 400, color: PZC.muted, max: 1}); y += 14; });
  if (!fs.length) y = pzTexto(ctx, "[completar fuente]", PZ_MARGEN, y + 24, {px: 40, w: 700, fam: PZF.h});
  pzTexto(ctx, "Noticias de la Región de Valparaíso, comuna por comuna. Hechos con fuente, sin opinión.", PZ_MARGEN, Math.max(y + 80, 820), {px: 30, w: 400, color: PZC.soft, max: 3});
  pzTexto(ctx, c.etiquetaIA || "Resumen elaborado con apoyo de IA y revisado por el equipo de " + PZ_MARCA, PZ_MARGEN, H - 110, {px: 24, w: 400, color: PZC.muted, max: 2, maxW: PZ.W - 2 * PZ_MARGEN - 200});
  pzPuntos(ctx, n, i, H - 76, false);
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
  const cierre = s.k === "cierre";
  pzFondo(ctx, H, {tono: cierre ? "noche" : "papel"});
  if (!cierre) { ctx.fillStyle = PZC.bg; ctx.fillRect(0, 0, PZ.W, s.k === "intro" ? 460 : 340); pzTrama(ctx, PZ.W * 0.45, 0, PZ.W * 0.55, s.k === "intro" ? 460 : 340, {fase: t / 3}); }
  else pzTrama(ctx, PZ.W * 0.45, 0, PZ.W * 0.55, 420, {color: "rgba(31,79,216,.6)", fase: t / 3});
  // Progreso arriba, como en las historias.
  const n = plan.escenas.length, gap = 10, w = (PZ.W - 2 * 60 - gap * (n - 1)) / n;
  plan.escenas.forEach((x, i) => { const p = Math.min(1, Math.max(0, (t - x.t0) / x.dur)); ctx.fillStyle = PZC.track; ctx.fillRect(60 + i * (w + gap), 60, w, 8); if (p > 0) { ctx.fillStyle = PZC.ink; ctx.fillRect(60 + i * (w + gap), 60, Math.max(8, w * p), 8); } });
  ctx.save(); ctx.globalAlpha = Math.min(1, (s.dur - l) / 0.35 + (cierre ? 1 : 0));
  const filetes = (y, a) => { ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = PZC.noche; ctx.fillRect(PZ_MARGEN, y, (PZ.W - 2 * PZ_MARGEN) * a, 6); ctx.fillRect(PZ_MARGEN, y + 12, (PZ.W - 2 * PZ_MARGEN) * a, 2); ctx.restore(); };
  if (s.k === "intro") {
    pzLogo(ctx, PZ_MARGEN, 290, 72, {a: pzIn(l, 0), ondas: pzIn(l, 0.1, 1)});
    filetes(484, pzIn(l, 0.2, 0.8));
    pzKicker(ctx, c.kicker, 640, pzIn(l, 0.4));
    const y = pzTitular(ctx, c.titular, 680, {max: 100, min: 64, lineas: 6, a: pzIn(l, 0.65, 0.8)});
    if (c.bajada) pzTexto(ctx, c.bajada, PZ_MARGEN, y + 50, {px: 40, w: 400, color: PZC.gris, lh: 54, a: pzIn(l, 1.4), max: 4});
  } else if (s.k === "dato") {
    pzLogo(ctx, PZ_MARGEN, 200, 56, {ondas: 0.5 + 0.5 * Math.abs(Math.sin(t * 2))});
    filetes(364, 1);
    pzKicker(ctx, c.kicker, 520, pzIn(l, 0));
    pzTexto(ctx, String(s.i + 1).padStart(2, "0"), PZ_MARGEN, 800, {px: 260, w: 700, fam: PZF.h, color: PZC.bg, ls: -8, a: pzIn(l, 0.1)});
    pzTexto(ctx, `de ${String(s.de).padStart(2, "0")}`, PZ_MARGEN + 350, 800, {px: 40, w: 500, fam: PZF.h, color: PZC.gris, a: pzIn(l, 0.2)});
    ctx.save(); ctx.globalAlpha *= pzIn(l, 0.2); ctx.fillStyle = PZC.coral; ctx.fillRect(PZ_MARGEN, 860, 160 * pzIn(l, 0.2, 0.8), 12); ctx.restore();
    const px = pzAjustar(ctx, s.d, {max: 80, min: 52, maxLineas: 7});
    pzTexto(ctx, s.d, PZ_MARGEN, 960 + px * 0.6, {px, w: 700, fam: PZF.h, color: PZC.tinta, lh: px * 1.1, ls: -px * 0.015, a: pzIn(l, 0.35, 0.8), max: 7});
  } else {
    pzTexto(ctx, "FUENTE", PZ_MARGEN, 560, {px: 30, w: 700, fam: PZF.h, ls: 4, color: PZC.muted, a: pzIn(l, 0)});
    ctx.save(); ctx.globalAlpha *= pzIn(l, 0.1); ctx.fillStyle = PZC.coral; ctx.fillRect(PZ_MARGEN, 600, 96, 8); ctx.restore();
    let y = pzTexto(ctx, pzFuentes(c), PZ_MARGEN, 700, {px: 70, w: 700, fam: PZF.h, lh: 80, a: pzIn(l, 0.2), max: 3});
    const f0 = (c.fuentes && c.fuentes[0]) || c.fuente || {}, sub = [c.fuentes && c.fuentes.length > 1 ? "" : pzDominio(f0.url), f0.fecha ? pzFecha(f0.fecha) : ""].filter(Boolean).join(" · ");
    if (sub) pzTexto(ctx, sub, PZ_MARGEN, y + 10, {px: 36, w: 500, color: PZC.muted, a: pzIn(l, 0.4)});
    pzLogo(ctx, PZ.W / 2, 1060, 110, {a: pzIn(l, 0.8), ondas: pzIn(l, 0.9, 1.2), align: "center"});
    pzTexto(ctx, "Noticias de la Región de Valparaíso, comuna por comuna", PZ.W / 2, 1290, {px: 34, w: 400, fam: PZF.h, color: PZC.soft, a: pzIn(l, 1.1), align: "center", maxW: PZ.W - 160, max: 2});
    pzTexto(ctx, "Guion con apoyo de IA, revisado por el equipo · Voz sintética", PZ.W / 2, 1460, {px: 28, w: 500, color: PZC.muted, a: pzIn(l, 1.3), align: "center", maxW: PZ.W - 160, max: 2});
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

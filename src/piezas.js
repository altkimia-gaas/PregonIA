/* Redacción · piezas para las redes de PregonIA, dibujadas en canvas con la identidad Edición
   (papel blanco, filete negro, titulares en Source Serif 4, interfaz en Inter, azul #2B4BE0 solo como acento).
   Formatos: feed 4:5 (1080 × 1350), historia 9:16 (1080 × 1920), carrusel 4:5 y reel 9:16 con voz sintética y música.
   Reglas que vienen de la línea editorial y del checklist legal:
   - Sin fotos de los medios ni imágenes realistas hechas con IA: solo texto, datos y marca (derechos de autor y credibilidad).
   - Cada pieza cita la fuente y lleva la mención de IA (control 32). Los medios se nombran, nunca se usan sus logos (control 25).
   - La música la compone el propio navegador (acordes sintetizados): no hay pistas de terceros que licenciar (control 29).
   Todo se genera en el navegador; nada se sube a un servidor en la fase 1. */
const PZ = {W: 1080, FEED: 1350, HIST: 1920, FPS: 30, OUT: [720, 1280]};
const PZC = {bg: "#FFFFFF", ink: "#141414", muted: "#555555", line: "#141414", soft: "#F5F5F2", track: "#E6E6E1", blue: "#2B4BE0", amber: "#9A5B00", blueSoft: "#EEF1FD"};
const PZF = {h: '"Source Serif 4", Newsreader, Georgia, serif', b: 'Inter, system-ui, sans-serif'};
const PZ_MARGEN = 84;

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
/* Marca: tres barras azules y «PregonIA» en serif (IA en azul). */
function pzLogo(ctx, x, y, px, a = 1, align = "left"){
  pzFuente(ctx, 700, px, PZF.h); pzEsp(ctx, -px * 0.03);
  const s = px * 0.78, w1 = ctx.measureText("Pregon").width, w2 = ctx.measureText("IA").width, total = s * 1.55 + px * 0.18 + w1 + w2;
  let x0 = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = PZC.blue;
  [0.42, 0.7, 1].forEach((h, i) => { pzRR(ctx, x0 + i * s * 0.55, y - s * h, s * 0.38, s * h, s * 0.07); ctx.fill(); });
  x0 += s * 1.55 + px * 0.18; ctx.textAlign = "left"; ctx.fillStyle = PZC.ink; ctx.fillText("Pregon", x0, y); ctx.fillStyle = PZC.blue; ctx.fillText("IA", x0 + w1, y);
  ctx.restore(); pzEsp(ctx, 0); return total;
}
const pzFecha = ts => new Date(ts || Date.now()).toLocaleDateString("es-CL", {day: "numeric", month: "long", year: "numeric"});
const pzColor = c => /emergenc|catástrofe|incendio|evacua/i.test(c.kicker || "") ? PZC.amber : PZC.blue;
/* Cabezal de diario: marca, fecha y doble filete. */
function pzCabezal(ctx, c, y){
  pzLogo(ctx, PZ_MARGEN, y, 46);
  pzTexto(ctx, pzFecha(c.fechaPieza), PZ.W - PZ_MARGEN, y - 4, {px: 26, w: 500, color: PZC.muted, align: "right"});
  ctx.fillStyle = PZC.line; ctx.fillRect(PZ_MARGEN, y + 30, PZ.W - 2 * PZ_MARGEN, 6); ctx.fillRect(PZ_MARGEN, y + 44, PZ.W - 2 * PZ_MARGEN, 2);
  return y + 44;
}
function pzKicker(ctx, txt, y, color, a = 1){ return pzTexto(ctx, String(txt || "").toUpperCase(), PZ_MARGEN, y, {px: 28, w: 700, color, ls: 4, a, max: 2}); }
/* Pie: fuente y mención de IA. */
function pzPie(ctx, c, H, a = 1){
  const y = H - 132; ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = PZC.line; ctx.fillRect(PZ_MARGEN, y, PZ.W - 2 * PZ_MARGEN, 2); ctx.restore();
  pzTexto(ctx, "Fuente: " + pzFuentes(c), PZ_MARGEN, y + 50, {px: 28, w: 600, a, max: 1});
  pzTexto(ctx, c.etiquetaIA || "Resumen elaborado con apoyo de IA y revisado por el equipo de PregonIA", PZ_MARGEN, y + 92, {px: 23, w: 400, color: PZC.muted, a, max: 1});
}
const pzFuentes = c => { const ms = [...new Set((c.fuentes && c.fuentes.length ? c.fuentes : [c.fuente || {}]).map(f => f.medio).filter(Boolean))]; return ms.length ? (ms.length > 2 ? ms.slice(0, 2).join(", ") + " y otros" : ms.join(" y ")) : "[completar fuente]"; };
function pzDatos(ctx, datos, y, o = {}){
  const {px = 34, gap = 22, a = 1, max = 3, color = PZC.blue} = o;
  (datos || []).filter(Boolean).slice(0, max).forEach(d => {
    ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = color; ctx.fillRect(PZ_MARGEN, y - px * 0.62, 14, 14); ctx.restore();
    y = pzTexto(ctx, d, PZ_MARGEN + 36, y, {px, w: 500, a, maxW: PZ.W - 2 * PZ_MARGEN - 36, max: 3}) + gap;
  });
  return y;
}

/* Feed 4:5 */
function pzFeed(ctx, c){
  const H = PZ.FEED; ctx.fillStyle = PZC.bg; ctx.fillRect(0, 0, PZ.W, H);
  let y = pzCabezal(ctx, c, 112) + 92;
  y = pzKicker(ctx, c.kicker, y, pzColor(c)) + 18;
  const px = pzAjustar(ctx, c.titular, {max: 84, min: 54, maxLineas: 5});
  y = pzTexto(ctx, c.titular || "[titular]", PZ_MARGEN, y + px * 0.55, {px, w: 700, fam: PZF.h, lh: px * 1.1, ls: -px * 0.015, max: 5}) + 14;
  if (c.bajada) y = pzTexto(ctx, c.bajada, PZ_MARGEN, y + 20, {px: 34, w: 400, color: "#2A2A2A", max: 4, lh: 46}) + 26;
  const restante = H - 170 - y, datos = (c.datos || []).filter(Boolean);
  if (datos.length && restante > 160) pzDatos(ctx, datos, y + 34, {px: 31, max: restante > 330 ? 3 : 2, gap: 16});
  pzPie(ctx, c, H);
}
/* Historia 9:16: deja libres los 250 px de arriba y los 300 de abajo, donde Instagram pone su interfaz. */
function pzHistoria(ctx, c){
  const H = PZ.HIST; ctx.fillStyle = PZC.bg; ctx.fillRect(0, 0, PZ.W, H);
  let y = pzCabezal(ctx, c, 340) + 120;
  y = pzKicker(ctx, c.kicker, y, pzColor(c)) + 24;
  const t = (c.historia && c.historia.t) || c.titular, px = pzAjustar(ctx, t, {max: 96, min: 60, maxLineas: 6});
  y = pzTexto(ctx, t || "[titular]", PZ_MARGEN, y + px * 0.55, {px, w: 700, fam: PZF.h, lh: px * 1.1, ls: -px * 0.015, max: 6}) + 30;
  const x = (c.historia && c.historia.x) || c.bajada;
  if (x) y = pzTexto(ctx, x, PZ_MARGEN, y + 20, {px: 40, w: 400, color: "#2A2A2A", max: 5, lh: 54}) + 30;
  // Llamado a ver el detalle en el feed.
  const ty = Math.min(Math.max(y + 60, 1240), 1440); pzFuente(ctx, 700, 34, PZF.b); const lbl = "El detalle, en nuestra publicación", w = ctx.measureText(lbl).width + 80;
  ctx.fillStyle = PZC.blue; pzRR(ctx, PZ_MARGEN, ty, w, 84, 42); ctx.fill(); pzTexto(ctx, lbl, PZ_MARGEN + 40, ty + 54, {px: 34, w: 700, color: "#FFFFFF"});
  ctx.fillStyle = PZC.line; ctx.fillRect(PZ_MARGEN, 1540, PZ.W - 2 * PZ_MARGEN, 2);
  pzTexto(ctx, "Fuente: " + pzFuentes(c), PZ_MARGEN, 1590, {px: 28, w: 600, max: 1});
  pzTexto(ctx, c.etiquetaIA || "Resumen elaborado con apoyo de IA y revisado por el equipo de PregonIA", PZ_MARGEN, 1630, {px: 23, w: 400, color: PZC.muted, max: 2});
}
/* Carrusel: portada, una lámina por punto y cierre con fuentes. */
function pzLaminas(c){ return [{k: "portada"}, ...((c.slides || []).filter(s => s && (s.t || s.x)).slice(0, 4).map(s => ({k: "punto", ...s}))), {k: "cierre"}]; }
function pzLamina(ctx, c, i){
  const H = PZ.FEED, L = pzLaminas(c), s = L[i] || L[0], n = L.length; ctx.fillStyle = PZC.bg; ctx.fillRect(0, 0, PZ.W, H);
  let y = pzCabezal(ctx, c, 112) + 92;
  // Posición en el carrusel.
  for (let k = 0; k < n; k++) { ctx.fillStyle = k === i ? PZC.ink : PZC.track; pzRR(ctx, PZ.W - PZ_MARGEN - (n - k) * 30 + 12, H - 76, k === i ? 18 : 18, 18, 9); ctx.fill(); }
  if (s.k === "portada") {
    y = pzKicker(ctx, c.kicker, y, pzColor(c)) + 18;
    const px = pzAjustar(ctx, c.titular, {max: 92, min: 58, maxLineas: 6});
    y = pzTexto(ctx, c.titular || "[titular]", PZ_MARGEN, y + px * 0.55, {px, w: 700, fam: PZF.h, lh: px * 1.1, ls: -px * 0.015, max: 6});
    if (c.bajada) pzTexto(ctx, c.bajada, PZ_MARGEN, y + 50, {px: 34, w: 400, color: "#2A2A2A", max: 3, lh: 46});
    pzTexto(ctx, "Desliza  →", PZ_MARGEN, H - 60, {px: 30, w: 700, color: PZC.blue});
    return;
  }
  if (s.k === "cierre") {
    y = pzKicker(ctx, "Fuentes", y, PZC.blue) + 30;
    const fs = (c.fuentes && c.fuentes.length ? c.fuentes : [c.fuente || {}]).filter(f => f.medio).slice(0, 5);
    fs.forEach(f => { y = pzTexto(ctx, f.medio, PZ_MARGEN, y + 20, {px: 40, w: 600, fam: PZF.h, max: 1}); if (f.fecha) y = pzTexto(ctx, pzFecha(f.fecha), PZ_MARGEN, y + 2, {px: 26, w: 400, color: PZC.muted}); y += 10; });
    if (!fs.length) y = pzTexto(ctx, "[completar fuente]", PZ_MARGEN, y + 20, {px: 40, w: 600, fam: PZF.h});
    y = Math.max(y + 60, 860);
    pzLogo(ctx, PZ_MARGEN, y, 64);
    pzTexto(ctx, "Medio informativo digital de la Región de Valparaíso. Hechos atribuidos a su fuente, sin opinión.", PZ_MARGEN, y + 70, {px: 30, w: 400, color: PZC.muted, max: 3});
    pzTexto(ctx, c.etiquetaIA || "Resumen elaborado con apoyo de IA y revisado por el equipo de PregonIA", PZ_MARGEN, H - 120, {px: 24, w: 400, color: PZC.muted, max: 2, maxW: PZ.W - 2 * PZ_MARGEN - 200});
    return;
  }
  pzTexto(ctx, `${i} / ${n - 2}`, PZ_MARGEN, y + 60, {px: 30, w: 700, color: PZC.blue});
  const px = pzAjustar(ctx, s.t || "", {max: 76, min: 50, maxLineas: 3});
  y = pzTexto(ctx, s.t || "", PZ_MARGEN, y + 120 + px * 0.4, {px, w: 700, fam: PZF.h, lh: px * 1.1, max: 3}) + 20;
  pzTexto(ctx, s.x || "", PZ_MARGEN, y + 30, {px: 38, w: 400, color: "#2A2A2A", lh: 54, max: 9});
}

/* Reel 9:16: escenas (portada, un dato por escena, cierre) sincronizadas con la voz de cada escena. */
const PZ_VOZ_INI = 0.35, PZ_VOZ_COLA = 0.7;
function pzEscenas(c){
  const g = c.guion || {}, datos = (c.datos || []).filter(Boolean).slice(0, 3);
  const S = [{k: "intro", dur: 4, txt: g.intro || c.titular}];
  datos.forEach((d, i) => S.push({k: "dato", dur: 4.6, i, de: datos.length, d, txt: (g.datos && g.datos[i]) || d}));
  S.push({k: "cierre", dur: 4.2, txt: g.cierre || `Fuente: ${pzFuentes(c)}. Esto fue PregonIA.`});
  return S;
}
function pzRetimar(plan){ let t = 0; plan.escenas.forEach(s => { s.base ??= s.dur; s.dur = s.voz ? Math.max(s.base, PZ_VOZ_INI + s.voz.duration + PZ_VOZ_COLA) : s.base; s.t0 = t; t += s.dur; }); plan.total = t; return plan; }
const pzEase = x => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const pzIn = (l, t0, d = 0.6) => pzEase((l - t0) / d);
function pzReelCuadro(ctx, plan, t){
  const c = plan.c, H = PZ.HIST, k = ctx.canvas.width / PZ.W; ctx.setTransform(k, 0, 0, k, 0, 0); ctx.globalAlpha = 1;
  ctx.fillStyle = PZC.bg; ctx.fillRect(0, 0, PZ.W, H);
  const s = plan.escenas.find(x => t < x.t0 + x.dur) || plan.escenas[plan.escenas.length - 1], l = Math.min(t - s.t0, s.dur);
  // Progreso arriba, como en las historias.
  const n = plan.escenas.length, gap = 10, w = (PZ.W - 2 * 60 - gap * (n - 1)) / n;
  plan.escenas.forEach((x, i) => { const p = Math.min(1, Math.max(0, (t - x.t0) / x.dur)); ctx.fillStyle = PZC.track; pzRR(ctx, 60 + i * (w + gap), 60, w, 8, 4); ctx.fill(); if (p > 0) { ctx.fillStyle = PZC.ink; pzRR(ctx, 60 + i * (w + gap), 60, Math.max(8, w * p), 8, 4); ctx.fill(); } });
  ctx.save(); ctx.globalAlpha = Math.min(1, (s.dur - l) / 0.35 + (s.k === "cierre" ? 1 : 0));
  const col = pzColor(c);
  if (s.k === "intro") {
    pzLogo(ctx, PZ.W / 2, 330, 62, pzIn(l, 0), "center");
    pzKicker(ctx, c.kicker, 560, col, pzIn(l, 0.3));
    const px = pzAjustar(ctx, c.titular, {max: 100, min: 64, maxLineas: 6});
    const y = pzTexto(ctx, c.titular, PZ_MARGEN, 640 + px * 0.6, {px, w: 700, fam: PZF.h, lh: px * 1.1, ls: -px * 0.015, a: pzIn(l, 0.55, 0.8), max: 6});
    if (c.bajada) pzTexto(ctx, c.bajada, PZ_MARGEN, y + 50, {px: 40, w: 400, color: "#2A2A2A", lh: 54, a: pzIn(l, 1.3), max: 4});
  } else if (s.k === "dato") {
    pzLogo(ctx, PZ_MARGEN, 190, 40);
    pzKicker(ctx, c.kicker, 420, col, pzIn(l, 0));
    pzTexto(ctx, `${s.i + 1} de ${s.de}`, PZ_MARGEN, 520, {px: 34, w: 700, color: PZC.muted, a: pzIn(l, 0.15)});
    ctx.save(); ctx.globalAlpha *= pzIn(l, 0.2); ctx.fillStyle = col; ctx.fillRect(PZ_MARGEN, 600, 160 * pzIn(l, 0.2, 0.8), 10); ctx.restore();
    const px = pzAjustar(ctx, s.d, {max: 82, min: 54, maxLineas: 7});
    pzTexto(ctx, s.d, PZ_MARGEN, 700 + px * 0.6, {px, w: 700, fam: PZF.h, lh: px * 1.14, a: pzIn(l, 0.35, 0.8), max: 7});
  } else {
    pzKicker(ctx, "Fuente", 520, PZC.blue, pzIn(l, 0));
    let y = pzTexto(ctx, pzFuentes(c), PZ_MARGEN, 640, {px: 70, w: 700, fam: PZF.h, lh: 80, a: pzIn(l, 0.2), max: 3});
    if (c.fuente && c.fuente.fecha) pzTexto(ctx, pzFecha(c.fuente.fecha), PZ_MARGEN, y + 10, {px: 36, w: 500, color: PZC.muted, a: pzIn(l, 0.4)});
    pzLogo(ctx, PZ.W / 2, 1180, 96, pzIn(l, 0.8), "center");
    pzTexto(ctx, "Medio informativo digital · Región de Valparaíso", PZ.W / 2, 1270, {px: 34, w: 500, color: PZC.muted, a: pzIn(l, 1), align: "center"});
    pzTexto(ctx, "Guion con apoyo de IA, revisado por el equipo · Voz sintética", PZ.W / 2, 1470, {px: 28, w: 500, color: PZC.muted, a: pzIn(l, 1.2), align: "center", maxW: PZ.W - 160, max: 2});
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
const PZ_FUENTES = ['400 40px Inter', '500 40px Inter', '600 40px Inter', '700 40px Inter', '700 60px "Source Serif 4"', '600 60px "Source Serif 4"'];
const pzFuentesListas = () => Promise.all(PZ_FUENTES.map(f => document.fonts.load(f).catch(() => {})));


/* Video resumen del parte del alcalde.
   Escenas dibujadas en canvas a partir de parteData(); se exporta a MP4 con WebCodecs + mp4-muxer
   (más rápido que tiempo real) y, si el navegador no lo permite, se graba con MediaRecorder. Todo en el navegador. */
const VW = 1080, VH = 1920, VFPS = 30, VOUT = [720, 1280];
const VC = {bg:"#080B12", card:"#111827", line:"#1E2D4A", text:"#F0F4FF", muted:"#8B9DC3", blue:"#2196F3", cri:"#EF6A50", pos:"#2BB3A3", neu:"#A3AEBB"};
const VF = {h:'"Space Grotesk", "Public Sans", system-ui, sans-serif', b:'"Public Sans", system-ui, sans-serif', n:'Newsreader, Georgia, serif'};
const vtono = t => VC[t] || VC.neu;
const vease = x => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const vin = (l, t0, d = 0.6) => vease((l - t0) / d);

function cargarScript(url, global){
  cargarScript.p ||= {};
  return cargarScript.p[url] ||= new Promise((ok, no) => {
    if (window[global]) return ok(window[global]);
    const s = document.createElement("script"); s.src = url;
    s.onload = () => window[global] ? ok(window[global]) : no(new Error(global));
    s.onerror = () => { delete cargarScript.p[url]; s.remove(); no(new Error(global)); };
    document.head.appendChild(s);
  });
}
const cargarMuxer = () => cargarScript("https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.1/build/mp4-muxer.js", "Mp4Muxer");

/* Guion: qué escenas lleva el video y cuánto dura cada una. */
function videoPlan(){
  const d = parteData(), temasMap = new Map();
  d.sem.forEach(m => { const k = temaDe(m), x = temasMap.get(k) || {n: 0, pos: 0, neu: 0, cri: 0, noticias: 0}; x.n += m.notas.length; x[m.tono] += m.notas.length; x.noticias++; temasMap.set(k, x); });
  const temas = [...temasMap].map(([nombre, x]) => ({nombre: nombre === "General" ? "Otros temas" : nombre, otros: nombre === "General", ...x})).sort((a, b) => a.otros - b.otros || b.n - a.n).slice(0, 5);
  const ficha = m => { const ids = [...new Set(m.notas.map(n => n.m))]; return {m, e: escalera(m.notas), ac: accion(m), tema: temaDe(m), medios: ids.map(i => MED[i].n), pubs: m.notas.length}; };
  const S0 = [{k: "intro", dur: 3.6}, {k: "veredicto", dur: 6.2}];
  if (temas.length) S0.push({k: "temas", dur: 4.2 + temas.length * 0.5, temas});
  d.asuntos.forEach((m, i) => S0.push({k: "asunto", dur: 9.5, f: ficha(m), i, de: d.asuntos.length}));
  if (!d.asuntos.length) S0.push({k: "calma", dur: 4.5});
  if (d.buena) S0.push({k: "buena", dur: 8, f: ficha(d.buena)});
  S0.push({k: "cierre", dur: 5.5});
  let t = 0; S0.forEach(s => { s.t0 = t; t += s.dur; });
  return {d, scenes: S0, total: t, org: S.org, per: d.per, sig: d.asuntos[0] ? ficha(d.asuntos[0]) : null};
}

/* Primitivas de dibujo */
function vfont(ctx, w, px, fam){ ctx.font = `${w} ${px}px ${fam}`; }
function vspacing(ctx, v){ if ("letterSpacing" in ctx) ctx.letterSpacing = v + "px"; }
function vlineas(ctx, txt, maxW){
  const out = []; for (const par of String(txt).split("\n")) { let l = ""; for (const w of par.split(/\s+/).filter(Boolean)) { const p = l ? l + " " + w : w; if (ctx.measureText(p).width > maxW && l) { out.push(l); l = w; } else l = p; } out.push(l); }
  return out;
}
function vtexto(ctx, txt, x, y, o){
  const {px = 40, w = 400, fam = VF.b, color = VC.text, maxW = VW - 180, lh = px * 1.25, a = 1, max = 99, align = "left", ls = 0} = o || {};
  vfont(ctx, w, px, fam); vspacing(ctx, ls); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = "alphabetic";
  let L = vlineas(ctx, txt, maxW); if (L.length > max) { L = L.slice(0, max); L[max - 1] = L[max - 1].replace(/\s*\S*$/, "") + "…"; }
  if (a <= 0) { vspacing(ctx, 0); return y + (L.length - 1) * lh + lh; }
  ctx.save(); ctx.globalAlpha *= a; const dy = (1 - a) * 26;
  L.forEach((l, i) => ctx.fillText(l, x, y + dy + i * lh)); ctx.restore(); vspacing(ctx, 0);
  return y + (L.length - 1) * lh + lh;
}
function vrr(ctx, x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function vmarca(ctx, x, yBase, s, a){ ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = VC.blue; [0.42, 0.7, 1].forEach((h, i) => { vrr(ctx, x + i * s * 0.55, yBase - s * h, s * 0.38, s * h, s * 0.07); ctx.fill(); }); ctx.restore(); return x + s * 1.55; }
function vlogo(ctx, cx, y, px, a){
  vfont(ctx, 700, px, VF.h); vspacing(ctx, -px * 0.03); const w1 = ctx.measureText("Pregon").width, w2 = ctx.measureText("IA").width, s = px * 0.78, total = s * 1.55 + px * 0.18 + w1 + w2;
  let x = cx - total / 2; x = vmarca(ctx, x, y, s, a) + px * 0.18;
  ctx.save(); ctx.globalAlpha *= a; ctx.textAlign = "left"; ctx.fillStyle = VC.text; ctx.fillText("Pregon", x, y); ctx.fillStyle = VC.blue; ctx.fillText("IA", x + w1, y); ctx.restore(); vspacing(ctx, 0);
}
let vgrid = null;
function vfondo(ctx){
  ctx.fillStyle = VC.bg; ctx.fillRect(0, 0, VW, VH);
  if (!vgrid) { vgrid = document.createElement("canvas"); vgrid.width = VW; vgrid.height = VH; const g = vgrid.getContext("2d"); g.fillStyle = "rgba(33,150,243,.16)"; for (let y = 30; y < VH; y += 60) for (let x = 30; x < VW; x += 60) { g.beginPath(); g.arc(x, y, 2.2, 0, 7); g.fill(); } }
  ctx.drawImage(vgrid, 0, 0);
  const gr = ctx.createRadialGradient(VW * 0.15, VH * 0.05, 40, VW * 0.15, VH * 0.05, VH * 0.75); gr.addColorStop(0, "rgba(33,150,243,.20)"); gr.addColorStop(1, "rgba(8,11,18,0)"); ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH);
}
function vprogreso(ctx, plan, t){
  const n = plan.scenes.length, x0 = 60, W = VW - 120, gap = 10, w = (W - gap * (n - 1)) / n;
  plan.scenes.forEach((s, i) => { const p = Math.min(1, Math.max(0, (t - s.t0) / s.dur)); const x = x0 + i * (w + gap); ctx.fillStyle = "rgba(240,244,255,.22)"; vrr(ctx, x, 60, w, 8, 4); ctx.fill(); if (p > 0) { ctx.fillStyle = "rgba(240,244,255,.92)"; vrr(ctx, x, 60, Math.max(8, w * p), 8, 4); ctx.fill(); } });
}
function vcabecera(ctx, plan){
  vfont(ctx, 700, 40, VF.h); ctx.textAlign = "left"; ctx.fillStyle = VC.text; ctx.fillText("Pregon", 60, 140); const w = ctx.measureText("Pregon").width; ctx.fillStyle = VC.blue; ctx.fillText("IA", 60 + w, 140);
  vfont(ctx, 500, 30, VF.b); ctx.textAlign = "right"; ctx.fillStyle = VC.muted; ctx.fillText(plan.org + " · " + plan.per, VW - 60, 138);
}
function vpie(ctx){ vfont(ctx, 400, 26, VF.b); ctx.textAlign = "center"; ctx.fillStyle = "rgba(139,157,195,.8)"; ctx.fillText("PregonIA · Prototipo con noticias ficticias", VW / 2, VH - 60); }
function vkicker(ctx, txt, y, color, a){ return vtexto(ctx, txt.toUpperCase(), 90, y, {px: 32, w: 700, fam: VF.h, color, a, ls: 5}); }

/* Escenas */
const VESC = {
  intro(ctx, s, l, plan){
    vlogo(ctx, VW / 2, 860, 150, vin(l, 0.1, 0.8));
    vtexto(ctx, "Parte semanal del alcalde", VW / 2, 1000, {px: 50, w: 500, fam: VF.h, color: VC.muted, a: vin(l, 0.5), align: "center"});
    vtexto(ctx, "Municipalidad de " + plan.org, VW / 2, 1090, {px: 62, w: 700, fam: VF.h, a: vin(l, 0.75), align: "center"});
    vtexto(ctx, plan.per, VW / 2, 1175, {px: 42, w: 500, color: VC.blue, a: vin(l, 1), align: "center"});
  },
  veredicto(ctx, s, l, plan){
    const {M, v, comp} = plan.d;
    vkicker(ctx, "Cómo te trató la prensa", 330, VC.blue, vin(l, 0));
    vfont(ctx, 700, 150, VF.h); const px = Math.min(150, 150 * (VW - 180) / Math.max(1, ctx.measureText(v.n).width));
    vtexto(ctx, v.n, 90, 500, {px, w: 700, fam: VF.h, color: vtono(v.k), a: vin(l, 0.25, 0.7), ls: -px * 0.03});
    vtexto(ctx, plural(M.vol, "noticia", "noticias") + " en la semana", 90, 600, {px: 46, w: 500, a: vin(l, 0.5)});
    const g = vin(l, 0.8, 1.4), W = VW - 180; let x = 90; const tot = Math.max(1, M.vol);
    ctx.fillStyle = "rgba(240,244,255,.08)"; vrr(ctx, 90, 680, W, 72, 14); ctx.fill();
    [["pos", M.pos], ["neu", M.neu], ["cri", M.cri]].forEach(([k, n]) => { if (!n) return; const w = (W * n / tot) * g; if (w > 2) { ctx.fillStyle = vtono(k); vrr(ctx, x, 680, Math.max(4, w - 6), 72, 12); ctx.fill(); } x += W * n / tot * g; });
    [["pos", M.pos, "positiva", "positivas"], ["neu", M.neu, "neutra", "neutras"], ["cri", M.cri, "crítica", "críticas"]].forEach(([k, n, a1, a2], i) => {
      const a = vin(l, 1.4 + i * 0.25), y = 880 + i * 92; ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = vtono(k); ctx.beginPath(); ctx.arc(110, y - 15, 16, 0, 7); ctx.fill(); ctx.restore();
      vtexto(ctx, `${Math.round(n * Math.min(1, a))} ${n === 1 ? a1 : a2}`, 150, y, {px: 48, w: 600, a});
    });
    vtexto(ctx, comp, 90, 1230, {px: 42, w: 400, color: VC.muted, a: vin(l, 2.3), max: 3});
  },
  temas(ctx, s, l){
    vkicker(ctx, "De qué se habló", 330, VC.blue, vin(l, 0));
    vtexto(ctx, "Temas de la semana", 90, 440, {px: 76, w: 700, fam: VF.h, a: vin(l, 0.2), ls: -2});
    const max = Math.max(...s.temas.map(x => x.n)), W = VW - 180;
    s.temas.forEach((x, i) => {
      const y = 600 + i * 210, a = vin(l, 0.5 + i * 0.35), g = vin(l, 0.7 + i * 0.35, 1);
      vtexto(ctx, x.nombre, 90, y, {px: 46, w: 700, a, maxW: W, max: 1});
      const bw = W * x.n / max * g; let bx = 90;
      ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = "rgba(240,244,255,.07)"; vrr(ctx, 90, y + 34, W, 38, 10); ctx.fill();
      ["pos", "neu", "cri"].forEach(k => { if (!x[k]) return; const w = bw * x[k] / x.n; if (w > 2) { ctx.fillStyle = vtono(k); vrr(ctx, bx, y + 34, Math.max(4, w - 4), 38, 9); ctx.fill(); } bx += w; });
      ctx.restore();
      vtexto(ctx, plural(x.n, "publicación", "publicaciones") + " · " + plural(x.noticias, "noticia", "noticias") + (x.cri ? ` · ${x.cri} ${x.cri === 1 ? "crítica" : "críticas"}` : ""), 90, y + 120, {px: 32, w: 500, color: VC.muted, a});
    });
    vtexto(ctx, "Una noticia suma una publicación por cada medio que la publicó.", 90, 1700, {px: 30, w: 400, color: VC.muted, a: vin(l, 1.4)});
  },
  ficha(ctx, s, l, kicker, color){
    const {m, e, ac, tema, medios, pubs} = s.f, W = VW - 180;
    vkicker(ctx, kicker, 320, color, vin(l, 0));
    // etiqueta de tema y tono
    const ta = vin(l, 0.2), etq = `${tema} · ${tonoLbl[m.tono]}`; vfont(ctx, 700, 34, VF.b); const ew = ctx.measureText(etq).width + 56;
    ctx.save(); ctx.globalAlpha *= ta; ctx.fillStyle = color + "33"; vrr(ctx, 90, 360, ew, 64, 32); ctx.fill(); ctx.restore();
    vtexto(ctx, etq, 118, 404, {px: 34, w: 700, color, a: ta});
    let y = vtexto(ctx, m.lead.res, 90, 530, {px: 68, w: 600, fam: VF.n, lh: 82, a: vin(l, 0.45, 0.8), max: 4});
    // dónde se publicó
    y = vtexto(ctx, `Publicado en ${plural(medios.length, "medio", "medios")} · ${plural(pubs, "publicación", "publicaciones")}`, 90, y + 30, {px: 36, w: 500, color: VC.muted, a: vin(l, 1)});
    const ca = vin(l, 1.2); let cx = 90, cy = y - 8; vfont(ctx, 600, 32, VF.b);
    const chips = medios.slice(0, 4).concat(medios.length > 4 ? [`+${medios.length - 4} más`] : []);
    ctx.save(); ctx.globalAlpha *= ca;
    chips.forEach(c => { const w = ctx.measureText(c).width + 44; if (cx + w > VW - 90) { cx = 90; cy += 74; } ctx.fillStyle = "rgba(240,244,255,.08)"; vrr(ctx, cx, cy, w, 58, 29); ctx.fill(); ctx.strokeStyle = VC.line; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = VC.text; ctx.textAlign = "left"; ctx.fillText(c, cx + 22, cy + 40); cx += w + 14; });
    ctx.restore(); y = cy + 130;
    // hasta dónde llegó
    vkicker(ctx, "Hasta dónde llegó", y, VC.muted, vin(l, 1.6)); y += 30;
    e.r.forEach((x, i) => {
      const colW = W / 3, bx = 90 + i * colW, h = [44, 78, 112][i], on = i <= e.max, g = vin(l, 1.9 + i * 0.35, 0.5), base = y + 120;
      ctx.save(); ctx.globalAlpha *= vin(l, 1.7); ctx.fillStyle = "rgba(240,244,255,.10)"; vrr(ctx, bx, base - h, 64, h, 10); ctx.fill();
      if (on && g > 0) { ctx.fillStyle = color; vrr(ctx, bx, base - h * g, 64, h * g, 10); ctx.fill(); } ctx.restore();
      vtexto(ctx, x.l, bx + 84, base - 44, {px: 34, w: 700, a: vin(l, 1.8 + i * 0.35), color: on ? VC.text : VC.muted});
      vtexto(ctx, x.n ? plural(x.n, "nota", "notas") : "sin notas", bx + 84, base - 2, {px: 28, w: 400, color: VC.muted, a: vin(l, 1.8 + i * 0.35)});
    });
    y = vtexto(ctx, llego(e), 90, y + 200, {px: 44, w: 700, fam: VF.h, color, a: vin(l, 2.9)});
    // qué hacer
    const aa = vin(l, 3.3, 0.7); vfont(ctx, 500, 42, VF.b); const L = vlineas(ctx, ac.a, W - 80).slice(0, 4); vfont(ctx, 700, 34, VF.b); const Lr = vlineas(ctx, "Responsable: " + ac.r, W - 80).slice(0, 2), hCard = 124 + L.length * 54 + 24 + (Lr.length - 1) * 43 + 52, top = Math.min(y + 10, VH - 150 - hCard);
    ctx.save(); ctx.globalAlpha *= aa; ctx.fillStyle = VC.card; vrr(ctx, 90, top, W, hCard, 26); ctx.fill(); ctx.strokeStyle = VC.line; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = color; vrr(ctx, 90, top, 10, hCard, 5); ctx.fill(); ctx.restore();
    vtexto(ctx, "QUÉ HACER", 140, top + 66, {px: 30, w: 700, fam: VF.h, color: VC.blue, a: aa, ls: 5});
    const y2 = vtexto(ctx, L.join("\n"), 140, top + 124, {px: 42, w: 500, lh: 54, a: aa, maxW: W - 80});
    vtexto(ctx, "Responsable: " + ac.r, 140, y2 + 24, {px: 34, w: 700, color: VC.muted, a: vin(l, 3.8), maxW: W - 80, max: 2});
  },
  asunto(ctx, s, l){ VESC.ficha(ctx, s, l, `Lo que se puede complicar · ${s.i + 1} de ${s.de}`, vtono(s.f.m.tono)); },
  buena(ctx, s, l){ VESC.ficha(ctx, s, l, "Para aprovechar", VC.pos); },
  calma(ctx, s, l){
    vkicker(ctx, "Lo que se puede complicar", 330, VC.pos, vin(l, 0));
    vtexto(ctx, "Ningún asunto de riesgo esta semana.", 90, 760, {px: 92, w: 700, fam: VF.h, lh: 104, a: vin(l, 0.3, 0.8), ls: -2});
    vtexto(ctx, "PregonIA sigue revisando los medios todos los días y avisa si algo cambia.", 90, 1130, {px: 44, w: 400, color: VC.muted, a: vin(l, 1)});
  },
  cierre(ctx, s, l, plan){
    vkicker(ctx, "Próximo paso", 330, VC.blue, vin(l, 0));
    const sig = plan.sig, txt = sig ? sig.ac.a : "Mantener el monitoreo y aprovechar la buena noticia en la próxima vocería.";
    let y = vtexto(ctx, txt, 90, 470, {px: 72, w: 700, fam: VF.h, lh: 86, a: vin(l, 0.25, 0.8), ls: -1.5, max: 6});
    if (sig) vtexto(ctx, "Responsable: " + sig.ac.r, 90, y + 30, {px: 42, w: 600, color: VC.muted, a: vin(l, 0.8), max: 2});
    vlogo(ctx, VW / 2, 1500, 96, vin(l, 1.4));
    vtexto(ctx, "Escucha la plaza. Decide a tiempo.", VW / 2, 1590, {px: 38, w: 500, color: VC.blue, a: vin(l, 1.7), align: "center"});
    vtexto(ctx, "Un producto de ALTKimia", VW / 2, 1660, {px: 32, w: 500, color: VC.muted, a: vin(l, 1.9), align: "center"});
  }
};
function vdibujar(ctx, t, plan){
  const k = ctx.canvas.width / VW; ctx.setTransform(k, 0, 0, k, 0, 0); ctx.globalAlpha = 1;
  vfondo(ctx);
  const s = plan.scenes.find(x => t < x.t0 + x.dur) || plan.scenes[plan.scenes.length - 1], l = Math.min(t - s.t0, s.dur);
  vprogreso(ctx, plan, t);
  if (s.k !== "intro") vcabecera(ctx, plan);
  ctx.save(); ctx.globalAlpha = Math.min(1, (s.dur - l) / 0.35 + (s.k === "cierre" ? 1 : 0)); VESC[s.k](ctx, s, l, plan); ctx.restore();
  vpie(ctx);
}

/* Exportación */
async function videoMP4(plan, onProg, signal){
  if (!window.VideoEncoder || !window.VideoFrame) return null;
  const [w, h] = VOUT, base = {width: w, height: h, bitrate: 3_500_000, framerate: VFPS, avc: {format: "avc"}};
  let cfg = null;
  for (const codec of ["avc1.640028", "avc1.4d0028", "avc1.42e028", "avc1.42001f"]) { try { const c = {...base, codec}; if ((await VideoEncoder.isConfigSupported(c)).supported) { cfg = c; break; } } catch(e) {} }
  if (!cfg) return null;
  let Mx; try { Mx = await cargarMuxer(); } catch(e) { return null; }
  const muxer = new Mx.Muxer({target: new Mx.ArrayBufferTarget(), video: {codec: "avc", width: w, height: h, frameRate: VFPS}, fastStart: "in-memory"});
  let fallo = null; const enc = new VideoEncoder({output: (c, m) => muxer.addVideoChunk(c, m), error: e => { fallo = e; }});
  enc.configure(cfg);
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const ctx = cv.getContext("2d");
  const n = Math.ceil(plan.total * VFPS);
  try {
    for (let f = 0; f < n; f++) {
      if (signal && signal.aborted) throw {code: "cancelled"};
      if (fallo) throw fallo;
      vdibujar(ctx, f / VFPS, plan);
      const vf = new VideoFrame(cv, {timestamp: Math.round(f * 1e6 / VFPS), duration: Math.round(1e6 / VFPS)});
      enc.encode(vf, {keyFrame: f % (VFPS * 2) === 0}); vf.close();
      while (enc.encodeQueueSize > 6) await new Promise(r => setTimeout(r, 4));
      if (f % 6 === 0) { onProg(f / n); await new Promise(r => setTimeout(r, 0)); }
    }
    await enc.flush(); if (fallo) throw fallo; muxer.finalize();
  } finally { if (enc.state !== "closed") enc.close(); }
  onProg(1);
  return new Blob([muxer.target.buffer], {type: "video/mp4"});
}
async function videoGrabado(plan, onProg, signal){
  if (!window.MediaRecorder) return null;
  const tipos = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"], mime = tipos.find(t => MediaRecorder.isTypeSupported(t));
  if (!mime) return null;
  const [w, h] = VOUT, cv = document.createElement("canvas"); cv.width = w; cv.height = h; const ctx = cv.getContext("2d"); vdibujar(ctx, 0, plan);
  const rec = new MediaRecorder(cv.captureStream(VFPS), {mimeType: mime, videoBitsPerSecond: 3_500_000}), partes = [];
  rec.ondataavailable = e => { if (e.data && e.data.size) partes.push(e.data); };
  const fin = new Promise(r => rec.onstop = r); rec.start(500);
  const t0 = performance.now();
  await new Promise(ok => { const loop = () => { const t = (performance.now() - t0) / 1000; if ((signal && signal.aborted) || t >= plan.total) return ok(); vdibujar(ctx, t, plan); onProg(t / plan.total); requestAnimationFrame(loop); }; loop(); });
  rec.stop(); await fin;
  if (signal && signal.aborted) throw {code: "cancelled"};
  return new Blob(partes, {type: mime.split(";")[0]});
}

/* Ventana del video */
let VID = null;
function videoAbrir(){
  const plan = videoPlan();
  const ov = document.createElement("div"); ov.className = "vid-back"; ov.id = "vidBack";
  ov.innerHTML = `<section class="vid" role="dialog" aria-modal="true" aria-labelledby="vidT">
    <header class="vid-h"><div><h2 id="vidT">Video resumen</h2><p>Parte semanal · ${esc(plan.org)} · ${esc(plan.per)}</p></div><button class="btn ghost" type="button" data-act="vid-close" aria-label="Cerrar"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>
    <div class="vid-b">
      <div class="vid-stage"><canvas id="vidCv" width="${VOUT[0]}" height="${VOUT[1]}" role="img" aria-label="Vista previa del video: resultado de la semana, temas, asuntos que se pueden complicar con qué hacer, y la buena noticia."></canvas></div>
      <div class="vid-side">
        <p class="vid-meta">${Math.round(plan.total)} segundos · vertical, para ver en el celular · ${plan.scenes.length} escenas armadas con el análisis de temas y publicaciones de la semana.</p>
        <div class="vid-ctrl"><button class="btn" type="button" data-act="vid-play" id="vidPlay">Pausa</button><button class="btn" type="button" data-act="vid-replay">Desde el inicio</button></div>
        <button class="btn alt" type="button" data-act="vid-make" id="vidMake">Preparar video MP4</button>
        <div class="vid-prog" id="vidProg" hidden><span class="bar"><i style="width:0%"></i></span><span class="mono" id="vidPct">0%</span><button class="btn sm" type="button" data-act="vid-stop">Cancelar</button></div>
        <div class="vid-out" id="vidOut" hidden><button class="btn b-wa" type="button" data-act="vid-wa"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${SH_ICO.wa}</svg>WhatsApp</button><button class="btn alt" type="button" data-act="vid-dl"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/></svg>Descargar</button></div>
        <p class="note" id="vidNote">Uso interno del alcalde y su equipo. Es un prototipo con noticias ficticias; no usa fotos ni logos de los medios.</p>
      </div>
    </div></section>`;
  document.body.appendChild(ov); document.body.classList.add("vid-on");
  const cv = $("#vidCv"), ctx = cv.getContext("2d"), quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  VID = {plan, ctx, t: quieto ? 2 : 0, play: !quieto, last: null, raf: 0, blob: null, ctl: null, origen: document.activeElement};
  const fuentes = ['700 80px "Space Grotesk"', '500 40px "Space Grotesk"', '400 40px "Public Sans"', '500 40px "Public Sans"', '600 40px "Public Sans"', '700 40px "Public Sans"', '600 60px Newsreader'];
  Promise.all(fuentes.map(f => document.fonts.load(f).catch(() => {}))).then(() => { vgrid = null; });
  const loop = now => { if (!VID) return; if (VID.play) { if (VID.last != null) VID.t += (now - VID.last) / 1000; if (VID.t > plan.total + 1) VID.t = 0; } VID.last = now; vdibujar(ctx, Math.min(VID.t, plan.total - 0.001), plan); VID.raf = requestAnimationFrame(loop); };
  VID.raf = requestAnimationFrame(loop);
  $("#vidPlay").textContent = VID.play ? "Pausa" : "Reproducir";
  ov.querySelector('[data-act="vid-close"]').focus();
}
function videoCerrar(){
  if (!VID) return; cancelAnimationFrame(VID.raf); VID.ctl?.abort(); const o = VID.origen; VID = null;
  $("#vidBack")?.remove(); document.body.classList.remove("vid-on"); if (o && o.isConnected) o.focus();
}
const videoNombre = () => `PregonIA-Video-parte-semanal-${slug(S.org)}-${hoyISO()}.${VID && VID.blob && /webm/.test(VID.blob.type) ? "webm" : "mp4"}`;
async function videoPreparar(){
  const btn = $("#vidMake"), prog = $("#vidProg"), bar = prog.querySelector("i"), pct = $("#vidPct"), note = $("#vidNote");
  btn.hidden = true; prog.hidden = false; $("#vidOut").hidden = true;
  const ctl = VID.ctl = new AbortController(), plan = VID.plan;
  const avance = p => { bar.style.width = Math.round(p * 100) + "%"; pct.textContent = Math.round(p * 100) + "%"; };
  try { await Promise.all(['700 80px "Space Grotesk"', '600 60px Newsreader', '500 40px "Public Sans"'].map(f => document.fonts.load(f).catch(() => {}))); } catch(e) {}
  let blob = null;
  try {
    blob = await videoMP4(plan, avance, ctl.signal);
    if (!blob) { note.textContent = "Este navegador graba el video en tiempo real: deja esta ventana abierta unos " + Math.round(plan.total) + " segundos."; blob = await videoGrabado(plan, avance, ctl.signal); }
    if (!blob) throw {code: "unsupported"};
  } catch(err) {
    if (!VID) return;
    prog.hidden = true; btn.hidden = false;
    note.textContent = err && err.code === "cancelled" ? "Preparación cancelada." : err && err.code === "unsupported" ? "Este navegador no permite crear videos. Prueba con Chrome, Edge o Safari actualizados." : "No se pudo preparar el video. Intenta de nuevo.";
    return;
  }
  if (!VID) return;
  VID.blob = blob; VID.ctl = null; prog.hidden = true; $("#vidOut").hidden = false; btn.hidden = false; btn.textContent = "Preparar de nuevo";
  note.textContent = `Listo: ${(blob.size / 1048576).toFixed(1)} MB${/webm/.test(blob.type) ? " en formato WebM (en iPhone puede no reproducirse; Chrome o Edge generan MP4)" : " en MP4"}. Envíalo por WhatsApp o descárgalo.`;
  $("#vidOut button").focus();
}
async function videoWhatsApp(){
  if (!VID || !VID.blob) return;
  const f = new File([VID.blob], videoNombre(), {type: VID.blob.type}), titulo = "Video del parte semanal · Municipalidad de " + S.org;
  if (navigator.canShare && movil() && navigator.canShare({files: [f]})) {
    try { await navigator.share({files: [f], title: titulo, text: titulo}); return; }
    catch(err) { if (err && err.name === "AbortError") return; if (err && err.name === "NotAllowedError") { toast("El video está listo: toca WhatsApp otra vez."); return; } }
  }
  abrirEnlace("https://wa.me/?text=" + encodeURIComponent(`*${titulo}*\nTe envío el video resumen de la semana.`), true);
  await guardarArchivo(f.name, VID.blob, true);
  toast("Abrimos WhatsApp y guardamos el video: en el chat, adjúntalo con el clip o arrástralo.");
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return; const a = b.dataset.act;
  if (a === "vid-open") videoAbrir();
  if (!VID) return;
  if (a === "vid-close") videoCerrar();
  if (a === "vid-play") { VID.play = !VID.play; VID.last = null; b.textContent = VID.play ? "Pausa" : "Reproducir"; }
  if (a === "vid-replay") { VID.t = 0; VID.play = true; VID.last = null; $("#vidPlay").textContent = "Pausa"; }
  if (a === "vid-make") videoPreparar();
  if (a === "vid-stop") VID.ctl?.abort();
  if (a === "vid-wa") videoWhatsApp();
  if (a === "vid-dl") guardarArchivo(videoNombre(), VID.blob);
});
document.addEventListener("click", e => { if (VID && e.target.id === "vidBack") videoCerrar(); });
document.addEventListener("keydown", e => {
  if (!VID) return;
  if (e.key === "Escape") { e.preventDefault(); videoCerrar(); return; }
  if (e.key === "Tab") { const f = [...document.querySelectorAll("#vidBack button:not([hidden]):not(:disabled)")].filter(x => x.offsetParent); if (!f.length) return; const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
});

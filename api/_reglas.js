// Generado por scripts/build.py desde src/reglas.js. No editar a mano.
/* Reglas de alerta de PregonIA. Las comparten la aplicación (avisos en el navegador) y la lectura programada del servidor
   (notificaciones con la aplicación cerrada y correo): scripts/build.py copia este archivo a api/_reglas.js.
   Un «hecho» es una noticia con todas sus notas: {g, tonos: [...], notas: [{ts, nivel (0 comunal, 1 regional, 2 nacional), medio, titulo, url}]}.
   «visto» guarda lo ya avisado de ese hecho, para avisar una sola vez por nivel: {cri: nivel, pos: nivel, raf: true}. */
const NIVEL_AVISO = {urgente: 3, importante: 2, info: 1};
const PREF_MINIMO = {urgente: 3, importante: 2, todo: 1, nada: 99};
const PRENSA_TXT = ["prensa comunal", "prensa regional", "prensa nacional"];
const VENTANA_AVISO = 48 * 36e5;   // solo se avisa de hechos con notas de las últimas 48 horas
const RAFAGA = {medios: 3, horas: 6}; // tema en alza: 3 medios distintos en 6 horas
const tonoHecho = tonos => tonos.includes("cri") ? "cri" : tonos.includes("pos") ? "pos" : "neu";
/* Ráfaga: cuántos medios distintos publicaron dentro de 6 horas y en cuánto tiempo lo hicieron (el lapso más corto en que se juntó
   ese número de medios), para avisar con una frase concreta: «3 medios en 1 h 40 min». */
function rafagaDe(notas){ return rafagaInfo(notas).k; }
function rafagaInfo(notas){
  let mejor = {k: 0, ms: 0};
  notas.forEach((a, i) => {
    const vistos = new Set();
    for (const b of notas.slice(i)) {
      if (b.ts - a.ts > RAFAGA.horas * 36e5) break;
      vistos.add(b.medio);
      if (vistos.size > mejor.k || (vistos.size === mejor.k && b.ts - a.ts < mejor.ms)) mejor = {k: vistos.size, ms: b.ts - a.ts};
    }
  });
  return mejor;
}
function lapsoTxt(ms){
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return min + " min";
  const h = Math.floor(min / 60), r = min % 60;
  return r && h < 3 ? `${h} h ${r} min` : `${Math.round(min / 60)} ${Math.round(min / 60) === 1 ? "hora" : "horas"}`;
}
function alertasDeHecho(h, ahora, visto = {}){
  const notas = h.notas.slice().sort((a, b) => a.ts - b.ts), nuevo = {...visto}, out = [];
  if (!notas.length || ahora - notas[notas.length - 1].ts > VENTANA_AVISO) return {alertas: out, visto: nuevo};
  const tono = tonoHecho(h.tonos || notas.map(n => n.tono)), max = Math.max(...notas.map(n => n.nivel || 0));
  const principal = notas.filter(n => (n.nivel || 0) === max).pop(), medios = new Set(notas.map(n => n.medio)).size;
  const base = {g: h.g, ts: notas[notas.length - 1].ts, titular: principal.titulo || "", medio: principal.medioNombre || "", url: principal.url || "", medios, nivelPrensa: max};
  if (tono === "cri" && max > (visto.cri ?? -1)) {
    const escala = visto.cri !== undefined;
    out.push({...base, clave: h.g + ":cri:" + max, tipo: escala ? "escala" : "critica", nivel: max ? "urgente" : "importante",
      titulo: escala ? `Escaló a ${PRENSA_TXT[max]}` : max ? `Noticia crítica en ${PRENSA_TXT[max]}` : "Nueva noticia crítica"});
    nuevo.cri = max;
  }
  const ri = rafagaInfo(notas), raf = ri.k;
  if (tono !== "pos" && raf >= RAFAGA.medios && !visto.raf) {
    nuevo.raf = true;
    const frase = `${raf} medios en ${lapsoTxt(ri.ms)}`;
    if (out.length) out[0].titulo += ` · ${frase}`;
    // Un tema neutro que crece es información, no una urgencia: va como «info» y, con la preferencia por defecto, no suena.
    // Solo lo crítico que crece llega como urgente.
    else out.push({...base, clave: h.g + ":raf", tipo: "rafaga", nivel: tono === "cri" ? "urgente" : "info", titulo: tono === "cri" ? `Crítica en alza: ${frase}` : `Tema en alza: ${frase}`});
  }
  if (tono === "pos" && max >= 1 && max > (visto.pos ?? 0)) {
    out.push({...base, clave: h.g + ":pos:" + max, tipo: "positiva", nivel: "info", titulo: `Buena noticia en ${PRENSA_TXT[max]}`});
    nuevo.pos = max;
  }
  return {alertas: out, visto: nuevo};
}
/* Hora en Chile continental, para el silencio nocturno (23:00 a 7:00). */
function horaChile(ahora){ return Number(new Intl.DateTimeFormat("es-CL", {timeZone: "America/Santiago", hour: "numeric", hourCycle: "h23"}).format(new Date(ahora))); }
function pasaPreferencia(alerta, pref, ahora){
  if (!pref || (NIVEL_AVISO[alerta.nivel] || 0) < (PREF_MINIMO[pref.nivel] ?? 2)) return false;
  if (pref.silencio !== false && alerta.nivel !== "urgente") { const h = horaChile(ahora); if (h >= 23 || h < 7) return false; }
  return true;
}
export { NIVEL_AVISO, PREF_MINIMO, tonoHecho, rafagaDe, alertasDeHecho, horaChile, pasaPreferencia };

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
function rafagaDe(notas){
  let mejor = 0;
  notas.forEach((a, i) => { const k = new Set(notas.slice(i).filter(b => b.ts - a.ts <= RAFAGA.horas * 36e5).map(b => b.medio)).size; if (k > mejor) mejor = k; });
  return mejor;
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
  const raf = rafagaDe(notas);
  if (tono !== "pos" && raf >= RAFAGA.medios && !visto.raf) {
    nuevo.raf = true;
    if (out.length) out[0].titulo += ` · ${raf} medios en ${RAFAGA.horas} horas`;
    else out.push({...base, clave: h.g + ":raf", tipo: "rafaga", nivel: tono === "cri" ? "urgente" : "importante", titulo: `Tema en alza: ${raf} medios en ${RAFAGA.horas} horas`});
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

#!/usr/bin/env python3
"""Arma index.html autónomo desde src/ y data/catalogo_medios.csv.

Uso: python3 scripts/build.py
Orden del script embebido: base.js (constantes y catálogo) → corpus.js (noticias ficticias) → calendario.js (fechas de riesgo; antes de app.js porque la portada lo usa al primer dibujo) → app.js (aplicación) → captura.js → vocero.js (kit de vocería) → compartir.js (app instalable y Compartir) → reglas.js + alertas.js (avisos) → piloto.js → video.js.
"""
import base64, csv, json, pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SRC, DATA = RAIZ / "src", RAIZ / "data"

def catalogo():
    filas = csv.DictReader(open(DATA / "catalogo_medios.csv", encoding="utf-8"))
    return [{"id": int(f["id"]), "n": f["nombre"], "a": f["ambito"], "c": f["comuna"], "t": f["tipo"],
             "l": f["nivel"], "m": f["metodo"], "e": f["estado"], "o": f["observacion"], "u": f["url_lectura"]} for f in filas]

def main():
    leer = lambda n: (SRC / n).read_text(encoding="utf-8")
    # Reglas de alerta: el mismo archivo va en la aplicación y en el servidor (api/_reglas.js), para que avisen lo mismo.
    (RAIZ / "api" / "_reglas.js").write_text("// Generado por scripts/build.py desde src/reglas.js. No editar a mano.\n" + leer("reglas.js") +
        "export { NIVEL_AVISO, PREF_MINIMO, tonoHecho, rafagaDe, alertasDeHecho, horaChile, pasaPreferencia };\n", encoding="utf-8")
    js = leer("base.js") + "\n" + leer("corpus.js").rstrip("\n") + "\n" + leer("calendario.js") + "\n" + leer("app.js") + "\n" + leer("captura.js") + "\n" + leer("vocero.js") + "\n" + leer("compartir.js") + "\n" + leer("reglas.js") + "\n" + leer("alertas.js") + "\n" + leer("piloto.js") + "\n" + leer("video.js")
    js = js.replace("/*CATALOG*/", json.dumps(catalogo(), ensure_ascii=False, separators=(",", ":")), 1)
    foto = "data:image/jpeg;base64," + base64.b64encode((RAIZ / "assets" / "portada.jpg").read_bytes()).decode()
    cuerpo = leer("shell.html").replace("assets/portada.jpg", foto) + "<script>\n" + js + "\n</script>\n"
    # Documento completo para Vercel o GitHub Pages: sin charset ni viewport el celular lo mostraría como escritorio.
    cabeza = ('<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
              '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
              '<meta name="description" content="PregonIA: qué dice la prensa de tu comuna, hasta dónde ha llegado y qué responder.">\n'
              '<link rel="manifest" href="/manifest.json">\n<meta name="theme-color" content="#080B12">\n'
              '<link rel="icon" type="image/png" sizes="192x192" href="/icono-192.png">\n<link rel="apple-touch-icon" href="/icono-180.png">\n'
              '<meta name="apple-mobile-web-app-title" content="PregonIA">\n'
              '</head>\n<body>\n')
    html = cabeza + cuerpo + "</body>\n</html>\n"
    (RAIZ / "index.html").write_text(html, encoding="utf-8")
    # Catálogo para la función de noticias reales (api/noticias.js); el guion bajo evita que Vercel lo publique como ruta.
    filas = [{"id": int(f["id"]), "nombre": f["nombre"], "ambito": f["ambito"], "comuna": f["comuna"], "metodo": f["metodo"], "url": f["url_lectura"], "estado": f["estado"]}
             for f in csv.DictReader(open(DATA / "catalogo_medios.csv", encoding="utf-8"))]
    # Semilla del catálogo para la base de datos del piloto (supabase/semilla.sql).
    q = lambda v: "null" if v in ("", None) else "'" + str(v).replace("'", "''") + "'"
    vals = [f"({int(f['id'])}, {q(f['nombre'])}, {q(f['ambito'])}, {q(f['provincia'])}, {q(f['comuna'])}, {q(f['tipo'])}, {q(f['nivel'])}, {q(f['metodo'])}, {q(f['url_lectura'])}, {q(f['estado'])}, {q(f['observacion'])})"
            for f in csv.DictReader(open(DATA / "catalogo_medios.csv", encoding="utf-8"))]
    (RAIZ / "supabase" / "semilla.sql").write_text("-- Generado por scripts/build.py desde data/catalogo_medios.csv. Se ejecuta después de esquema.sql.\n"
        "insert into medios (id, nombre, ambito, provincia, comunas, tipo, nivel, metodo, url_lectura, estado, observacion) values\n" + ",\n".join(vals) +
        "\non conflict (id) do update set nombre = excluded.nombre, ambito = excluded.ambito, provincia = excluded.provincia, comunas = excluded.comunas, tipo = excluded.tipo,"
        " nivel = excluded.nivel, metodo = excluded.metodo, url_lectura = excluded.url_lectura, estado = excluded.estado, observacion = excluded.observacion;\n", encoding="utf-8")
    (RAIZ / "api" / "_catalogo.js").write_text("// Generado por scripts/build.py desde data/catalogo_medios.csv. No editar a mano.\nexport const CATALOGO = " + json.dumps(filas, ensure_ascii=False, indent=0) + ";\n", encoding="utf-8")
    # Versión para publicar como artifact en claude.ai, que pone su propio esqueleto.
    (RAIZ / "artifact.html").write_text(cuerpo, encoding="utf-8")
    print(f"index.html listo ({len(html.encode('utf-8')) // 1024} KB)")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Arma index.html autónomo desde src/ y data/catalogo_medios.csv.

Uso: python3 scripts/build.py
Orden del script embebido: base.js (constantes y catálogo) → corpus.js (noticias ficticias) → app.js (aplicación).
"""
import base64, csv, json, pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SRC, DATA = RAIZ / "src", RAIZ / "data"

def catalogo():
    filas = csv.DictReader(open(DATA / "catalogo_medios.csv", encoding="utf-8"))
    return [{"id": int(f["id"]), "n": f["nombre"], "a": f["ambito"], "c": f["comuna"], "t": f["tipo"],
             "l": f["nivel"], "m": f["metodo"], "e": f["estado"], "o": f["observacion"]} for f in filas]

def main():
    leer = lambda n: (SRC / n).read_text(encoding="utf-8")
    js = leer("base.js") + "\n" + leer("corpus.js").rstrip("\n") + "\n" + leer("app.js")
    js = js.replace("/*CATALOG*/", json.dumps(catalogo(), ensure_ascii=False, separators=(",", ":")), 1)
    foto = "data:image/jpeg;base64," + base64.b64encode((RAIZ / "assets" / "portada.jpg").read_bytes()).decode()
    html = leer("shell.html").replace("assets/portada.jpg", foto) + "<script>\n" + js + "\n</script>\n"
    (RAIZ / "index.html").write_text(html, encoding="utf-8")
    print(f"index.html listo ({len(html.encode('utf-8')) // 1024} KB)")

if __name__ == "__main__":
    main()

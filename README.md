# PregonIA · escucha la plaza, decide a tiempo

Monitoreo de noticias sobre municipios y actores públicos en 100 medios digitales chilenos (50 nacionales y 50 de la Región de Valparaíso), con lectura de tono, alcance territorial (comunal, regional, nacional), informes por lector y redacción asistida de respuestas.

Producto de ALTKimia. Piloto: Casablanca, Algarrobo, El Quisco, El Tabo, Cartagena y San Antonio.
Versión de demostración: el catálogo de medios es real; las noticias, cifras y fechas son ficticias.

## Qué incluye el prototipo
- **Inicio:** portada de diario digital del día (lo último, indicadores, para revisar hoy, por tema, medios que más hablan).
- **Menciones:** cada noticia una vez aunque la publiquen varios medios; filtros por tono, período, tema y palabra; "¿Por qué aparece?" y "No corresponde".
- **Reportes por lector:** parte semanal del alcalde (copiable a WhatsApp), mesa diaria de comunicaciones, informe de gestión mensual y episodio crítico. Cada asunto muestra hasta dónde llegó: prensa comunal, regional o nacional.
- **Comunicados:** seis piezas (comunicado, declaración, aclaración Ley 19.733, mensajes clave, preguntas probables, minuta) con datos del municipio; nada se publica sin aprobación.
- **Ajustes:** temas, asistente de caracterización y estado de las 100 fuentes.
- **Ayuda:** guía de cinco pasos, preguntas frecuentes con buscador y ayuda contextual por pantalla.

Los datos de la demo se guardan en el navegador (localStorage, clave `pregonia-demo-v2`).

## Estructura
- `index.html` versión autónoma lista para publicar (se abre con doble clic; JS y CSS embebidos).
- `src/shell.html` estilos (sistema de diseño "sala de situación", modo claro y oscuro) y estructura de la página.
- `src/base.js` constantes, planes y utilidades; recibe el catálogo de medios al compilar.
- `src/corpus.js` noticias ficticias de la demo.
- `src/app.js` motor de calce, métricas, vistas, informes, comunicados y ayuda.
- `data/catalogo_medios.csv` los 100 medios con método de lectura, URL y estado (listo, requiere_ajuste, restringido).
- `docs/especificacion.md` especificación funcional del MVP.
- `scripts/build.py` arma `index.html` desde `src/` y `data/`.

## Uso
```
python3 scripts/build.py      # regenera index.html
python3 -m http.server 8000   # vista local en http://localhost:8000
```
Para publicar en Vercel o GitHub Pages basta servir `index.html` desde la raíz; no requiere compilación en el servidor.

## IA
La redacción de comunicados, la lectura del analista y "Pregúntale a PregonIA" usan Claude cuando la página se abre como artifact en claude.ai. Fuera de ahí (por ejemplo en Vercel) el prototipo usa plantillas y lo indica en pantalla. En producción la IA va detrás de una API propia, con la clave solo en el servidor.

## Próximos pasos para producción
1. Ingesta real en cascada (RSS, sitemap de noticias, portada, Google News) respetando robots.txt; texto retenido 30 días.
2. Base de datos con aislamiento por organización (RLS) y autenticación con roles y MFA.
3. Clasificación de tono y resumen propio con evaluación sobre 300 menciones etiquetadas.
4. Alertas por Telegram, correo y WhatsApp Business; PDF del informe de gestión.
5. Ver el plan completo y los requisitos en `docs/especificacion.md`.

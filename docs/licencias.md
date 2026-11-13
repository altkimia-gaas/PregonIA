# Licencias de terceros · PregonIA

Inventario de activos y código de terceros que usa la aplicación (control 29 y 30 del checklist legal). Actualizar cada vez que se agregue una biblioteca, fuente o imagen.

## Bibliotecas de código

| Componente | Versión | Uso | Licencia | Origen |
|---|---|---|---|---|
| web-push | 3.6.7 | Notificaciones Web Push desde el servidor | MPL-2.0 | npm |
| @supabase/supabase-js | 2.45.4 | Cliente de base de datos y sesión (piloto) | MIT | cdn.jsdelivr.net |
| jsPDF | 2.5.1 | Exportar informes a PDF | MIT | cdnjs.cloudflare.com |
| mp4-muxer | 5.2.1 | Armar el video resumen en MP4 | MIT | cdn.jsdelivr.net |

MPL-2.0 (web-push) es copyleft por archivo: solo obliga a publicar cambios hechos a los archivos de esa biblioteca. Se usa sin modificar.
No hay dependencias con licencia GPL o AGPL.

## Tipografías

| Fuente | Licencia | Origen |
|---|---|---|
| Inter | SIL Open Font License 1.1 | Google Fonts |
| DM Mono | SIL Open Font License 1.1 | Google Fonts |
| Newsreader | SIL Open Font License 1.1 | Google Fonts |

Recomendación: alojarlas en el propio dominio para que el navegador no envíe la IP del usuario a Google al abrir la aplicación.

## Imágenes

| Activo | Origen | Derechos |
|---|---|---|
| assets/portada.jpg | Punto de prensa, generada con IA en Canva (13-nov-2026), indicado en la portada | Uso comercial según los términos de Canva para contenido generado con IA |
| icono-*.png | Diseño propio de ALTKimia | Propios |

## Datos

| Activo | Origen | Nota |
|---|---|---|
| data/catalogo_medios.csv | Elaboración propia (nombres y URL públicas de medios) | Solo identifica medios; no contiene contenido de terceros |
| Nómina de autoridades (src/autoridades.js) | Fuentes públicas oficiales | Contiene afiliación política: ver docs/CUMPLIMIENTO.md |

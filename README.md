# PregonIA · escucha la plaza, decide a tiempo

Monitoreo de noticias sobre municipios y actores públicos en más de 100 medios digitales chilenos (nacionales, regionales y comunales de la Región de Valparaíso), con lectura de tono, alcance territorial (comunal, regional, nacional), informes por lector y redacción asistida de respuestas.

Demo publicada: https://pregonia.vercel.app

Producto de ALTKimia. Piloto: Casablanca, Algarrobo, El Quisco, El Tabo, Cartagena y San Antonio.
Versión de demostración: el catálogo de medios es real; las noticias, cifras y fechas son ficticias.

## Qué incluye el prototipo
- **Portada:** logo, propuesta de valor y botón Empezar sobre una foto de un periodista en terreno (imagen ilustrativa generada con IA). Aparece cada vez que se abre o recarga la aplicación, con `#portada` y al tocar el logo; "Empezar" lleva a la sección de la dirección o a Inicio. Para abrir sin portada: `?sin-portada`.
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
- `src/territorios.js` perfil de las 38 comunas y de cada distrito, circunscripción y circunscripción provincial: las ocho temáticas (agua, emergencias, seguridad, salud, educación, tránsito, aseo y economía) con el nombre, las palabras y los dolores de cada territorio, y la lente del cargo (municipio y concejo, consejo regional, parlamentarios). Las cuentas guardadas con la versión anterior se adaptan solas al abrirse, sin perder lo editado.
- `assets/portada.jpg` foto de la portada; se embebe en `index.html` al compilar.
- `data/catalogo_medios.csv` los medios con método de lectura, URL y estado (listo, requiere_ajuste, restringido).
- `docs/especificacion.md` especificación funcional del MVP.
- `api/ia.js` función de servidor (Vercel Edge) que conecta la IA con la clave en el servidor.
- `api/voz.js` función de servidor que graba la voz del video resumen con ElevenLabs.
- `src/video.js` video resumen del parte del alcalde: escenas en canvas, guion, voz y exportación a MP4 en el navegador.
- `scripts/build.py` arma `index.html` desde `src/`, `assets/` y `data/`.

## Uso
```
python3 scripts/build.py      # regenera index.html
python3 -m http.server 8000   # vista local en http://localhost:8000
```
Para publicar en Vercel o GitHub Pages basta servir `index.html` desde la raíz; no requiere compilación en el servidor.

## IA
La redacción de comunicados, la lectura del analista y "Pregúntale a PregonIA" usan Claude:
- **En claude.ai** (artifact): con la cuenta de quien abre la página.
- **En Vercel:** por la función `api/ia.js`, que llama a la API de Anthropic con la clave guardada en el servidor. El navegador nunca ve la clave.

Configuración en Vercel (Settings › Environment Variables), luego Redeploy:
- `ANTHROPIC_API_KEY` (obligatoria): clave de la consola de Anthropic. Conviene fijar un límite de gasto mensual en la consola.
- `ANTHROPIC_MODEL` (opcional): fuerza un modelo; por defecto Claude Sonnet 5.5 para redactar y Claude Haiku 5.5 para la ayuda.
- `ALLOWED_ORIGINS` (opcional): otros dominios autorizados, separados por coma (por ejemplo, un dominio propio).
- `IA_LIMITE` (opcional): solicitudes por IP cada 10 minutos (por defecto 20).

Voz del video resumen (opcional; sin ella el video sale sin narración):

- `ELEVENLABS_API_KEY`: clave de ElevenLabs con permiso de texto a voz.
- `ELEVENLABS_VOICE_ID` (opcional): voz a usar. Por defecto, Felipe (español de Chile).
- `ELEVENLABS_MODEL` (opcional): por defecto `eleven_multilingual_v2`.
- `ELEVENLABS_SPEED` (opcional): velocidad de lectura, de 0,7 a 1,2 (por defecto 1,06).
- `VOZ_LIMITE` (opcional): grabaciones por IP cada 10 minutos (por defecto 60). Un video usa de 6 a 8.

La función solo acepta pedidos desde el propio sitio, limita el largo del texto y las respuestas, y se niega a tareas ajenas a PregonIA. Sin la clave, la aplicación usa plantillas y lo indica en pantalla.

## Próximos pasos para producción
1. Ingesta real en cascada (RSS, sitemap de noticias, portada, Google News) respetando robots.txt; texto retenido 30 días.
2. Base de datos con aislamiento por organización (RLS) y autenticación con roles y MFA.
3. Clasificación de tono y resumen propio con evaluación sobre 300 menciones etiquetadas.
4. Alertas por Telegram, correo y WhatsApp Business; PDF del informe de gestión.
5. Ver el plan completo y los requisitos en `docs/especificacion.md`.


## Piloto con base de datos (etapa 2)

Con sesión iniciada, la aplicación trabaja con datos compartidos por municipio: noticias leídas cada 30 minutos, temas, marcas,
respuestas aprobadas y publicaciones agregadas a mano. Sin sesión sigue siendo la demostración.

Piezas:

- `supabase/esquema.sql`: tablas, reglas por municipio y rol (Row Level Security) y registro automático de actividad.
- `supabase/semilla.sql`: catálogo de medios (lo genera `scripts/build.py`).
- `supabase/alta_usuario.sql`: plantilla para asignar municipio y rol a una persona invitada.
- `api/ingesta.js`: lectura programada; guarda solo notas nuevas, clasifica solo lo nuevo y agrupa con hechos de días anteriores.
- `api/_lectura.js`: lectura y clasificación compartidas con `api/noticias.js`.
- `api/config.js`: entrega al navegador la URL y la clave publicable de Supabase (públicas por diseño).
- `src/piloto.js`: ingreso, carga desde la base y sincronización de cambios.
- `.github/workflows/lectura.yml`: llama a `/api/ingesta` cada 30 minutos.

Puesta en marcha:

1. Crear el proyecto en Supabase (región São Paulo) y ejecutar en SQL Editor `supabase/esquema.sql` y luego `supabase/semilla.sql`.
2. En Supabase › Authentication › URL Configuration, dejar `https://pregonia.vercel.app` como Site URL.
3. En Vercel, variables `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` y `CRON_SECRET` (una contraseña larga inventada).
4. En GitHub › Settings › Secrets and variables › Actions, el secreto `CRON_SECRET` con el mismo valor.
5. Invitar a cada persona en Supabase › Authentication › Users y asignarle municipio y rol con `supabase/alta_usuario.sql`.

Roles: `admin` y `comunicaciones` editan; `alcalde`, `directivo` y `lector` solo leen. Cada persona ve solo su municipio.

## Avisos (alertas)

PregonIA avisa de noticias críticas nuevas, de las que escalan a prensa regional o nacional y de los temas que crecen rápido (3 medios en 6 horas). Las reglas están en `src/reglas.js`; `scripts/build.py` las copia a `api/_reglas.js` para que la aplicación y el servidor avisen exactamente lo mismo.

- **En la aplicación:** campana en el encabezado, con la lista por municipio y las preferencias de cada persona (solo lo urgente, lo crítico, todo o nada; silencio nocturno).
- **En el navegador:** notificación mientras PregonIA esté abierta o instalada. No requiere configuración.
- **Con la aplicación cerrada (piloto):** la lectura programada evalúa las reglas y envía notificaciones (Web Push) y correos. Para activarlo:
  1. Correr de nuevo `supabase/esquema.sql` (agrega las tablas `alertas`, `avisos` y `suscripciones` y la función `destinatarios_avisos`, que solo puede usar el servidor).
  2. Abrir `https://pregonia.vercel.app/llaves-avisos.html`, generar las llaves y crear en Vercel `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT`. Las llaves se generan en el navegador; la privada va solo en Vercel.
  3. Correo (opcional): cuenta en Resend con el dominio verificado, y en Vercel `RESEND_API_KEY` y `AVISOS_REMITENTE` (por ejemplo `PregonIA <avisos@altkimia.com>`).
  4. Volver a desplegar. Cada persona activa los avisos en la campana de su celular.


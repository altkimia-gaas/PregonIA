# PregonIA · la prensa no espera, tú tampoco

Monitoreo de noticias sobre municipios y actores públicos en más de 100 medios digitales chilenos (nacionales, regionales y comunales de la Región de Valparaíso), con lectura de tono, alcance territorial (comunal, regional, nacional), informes por lector y redacción asistida de respuestas.

Demo publicada: https://pregonia.vercel.app

Producto de ALTKimia. Piloto: Casablanca, Algarrobo, El Quisco, El Tabo, Cartagena y San Antonio.
Versión de demostración: el catálogo de medios es real; las noticias, cifras y fechas son ficticias.

## Qué incluye el prototipo
- **Portada:** como la de un diario: cabezal con la fecha, nombre y lema, doble filete, titular con la propuesta de valor, botones «Ver demostración» e «Ingresar» (con sesión, «Entrar a mi edición»), la miniatura de la edición del día y tres columnas (Lee, Mide, Responde). Sin sesión la miniatura es siempre de "Comuna de Ejemplo", con datos de ejemplo; con sesión del piloto es la de la institución de esa persona, nunca la de otra. Aparece cada vez que se abre o recarga la aplicación, con `#portada` y al tocar el logo; la entrada lleva a la sección de la dirección o a Inicio. Para abrir sin portada: `?sin-portada`.
- **Entrada (¿Para quién es PregonIA?):** en pasos: cargo, comuna, persona y revisión. Siempre se pide la comuna y de ella se deducen el distrito, la circunscripción o la circunscripción provincial del consejo regional. También se puede buscar directo por nombre en toda la nómina. En el teléfono es una decisión por pantalla, a pantalla completa; desde 760 px suma un riel con los pasos. La contraseña de la demo se pide en la revisión.
- **Inicio:** portada que responde cuatro preguntas, con período a elegir (24 horas, Semana o 30 días) comparado con el período anterior: cómo estamos (veredicto en una frase y cuatro cifras: noticias, tono, hasta dónde llegó y el alcalde o el territorio en la prensa), qué hacer hoy (críticas por responder, con un «dato para la respuesta» cuando hay una nota positiva del mismo asunto, y notas positivas para aprovechar), qué está cambiando (temas con tendencia y asuntos sin tema que se pueden seguir con un toque), qué viene en el calendario y quién marca la agenda. Cada noticia aparece una sola vez; el gráfico por día está en Reportes.
- **Menciones:** cada noticia una vez aunque la publiquen varios medios; filtros por tono, período, tema y palabra; "¿Por qué aparece?" y "No corresponde".
- **Reportes por lector:** parte semanal del alcalde (copiable a WhatsApp), mesa diaria de comunicaciones, informe de gestión mensual y episodio crítico. Cada asunto muestra hasta dónde llegó: prensa comunal, regional o nacional.
- **Comunicados:** seis piezas (comunicado, declaración, aclaración Ley 19.733, mensajes clave, preguntas probables, minuta) con datos del municipio; nada se publica sin aprobación.
- **Ajustes:** temas, asistente de caracterización y estado de las 100 fuentes.
- **Ayuda:** guía de cinco pasos, preguntas frecuentes con buscador y ayuda contextual por pantalla.

Los datos de la demo se guardan en el navegador (localStorage, clave `pregonia-demo-v2`).

## Diseño (Edición)
Lenguaje de diario: papel blanco, filete negro, titulares de prensa en serif (Source Serif 4) y la interfaz en Inter. El azul (#2B4BE0) queda solo para lo que se toca. Semáforo de tono: verde favorable, gris neutro y rojo crítico; el ámbar se reserva para "Hecho grave". Texto base de 16 px, mínimo 13 px, tamaños en rem.
- **Claro u oscuro:** sigue la configuración del teléfono; el botón de tema la fija (clave `pregonia-modo` en el navegador).
- **Video resumen:** sale siempre en claro, para que todos reciban la misma pieza.
- **Pantalla de lectura:** siete diarios en blanco y negro en órbita; el que se lee, con anillo azul.

## Estructura
- `index.html` versión autónoma lista para publicar (se abre con doble clic; JS y CSS embebidos).
- `src/shell.html` estilos (diseño "Edición", en versión clara y oscura) y estructura de la página.
- `src/base.js` constantes, planes y utilidades; recibe el catálogo de medios al compilar.
- `src/corpus.js` noticias ficticias de la demo.
- `src/app.js` motor de calce, métricas, vistas, informes, comunicados y ayuda.
- `src/territorios.js` perfil de las 38 comunas y de cada distrito, circunscripción y circunscripción provincial: las ocho temáticas (agua, emergencias, seguridad, salud, educación, tránsito, aseo y economía) con el nombre, las palabras y los dolores de cada territorio, y la lente del cargo (municipio y concejo, consejo regional, parlamentarios). Las cuentas guardadas con la versión anterior se adaptan solas al abrirse, sin perder lo editado.
- `data/catalogo_medios.csv` los medios con método de lectura, URL y estado (listo, requiere_ajuste, restringido).
- `docs/especificacion.md` especificación funcional del MVP.
- `api/ia.js` función de servidor (Vercel Edge) que conecta la IA con la clave en el servidor.
- `api/voz.js` función de servidor que graba la voz del video resumen con ElevenLabs.
- `src/video.js` video resumen del parte del alcalde: escenas en canvas, guion, voz y exportación a MP4 en el navegador.
- `src/redes.js` cuentas de Facebook e Instagram de medios: inscripción desde Ajustes › Fuentes, estado de lectura y retiro. `api/_redes.js` las lee por la API de Meta; `src/cuentasred.js` (copiado a `api/_cuentasred.js`) reconoce el usuario a partir del enlace.
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
- `ELEVENLABS_VOICE_FALLBACK` (opcional): voz estándar que se usa si el plan de ElevenLabs no permite la elegida (el plan gratuito no permite voces de la biblioteca por API, como Felipe). Por defecto, George (`JBFqnCBsd6RMkjVDRZzb`), que lee en español con el modelo multilingüe. El video avisa cuando se usó.
- `ELEVENLABS_MODEL` (opcional): por defecto `eleven_multilingual_v2`.
- `ELEVENLABS_SPEED` (opcional): velocidad de lectura, de 0,7 a 1,2 (por defecto 1,06).
- `VOZ_LIMITE` (opcional): grabaciones por IP cada 10 minutos (por defecto 60). Un video usa de 6 a 8.

Estado en producción (15 nov 2026): `ELEVENLABS_API_KEY` configurada como variable secreta de Production, con una clave de ElevenLabs llamada «PregonIA voz», sin vencimiento y con acceso solo a «De texto a voz» (la única API que usa `api/voz.js`). Las variables se aplican en la publicación siguiente: tras crear o cambiar una, hay que volver a publicar (Redeploy en Vercel o un cambio en `main`). Para comprobarla: `GET /api/voz` responde `{"ok": true}` y en el video resumen el recuadro «Voz» deja activo «Agregar voz». Si la clave se rota, se crea una nueva en ElevenLabs (Desarrolladores › Claves de API), se reemplaza el valor en Vercel y se borra la anterior.

La función solo acepta pedidos desde el propio sitio, limita el largo del texto y las respuestas, y se niega a tareas ajenas a PregonIA. Sin la clave, la aplicación usa plantillas y lo indica en pantalla.

## Próximos pasos para producción
1. Ingesta real en cascada (RSS, sitemap de noticias, portada, Google News) respetando robots.txt; texto retenido 30 días.
2. Base de datos con aislamiento por organización (RLS) y autenticación con roles y MFA.
3. Clasificación de tono y resumen propio con evaluación sobre 300 menciones etiquetadas.
4. Alertas por Telegram, correo y WhatsApp Business; PDF del informe de gestión.
5. Ver el plan completo y los requisitos en `docs/especificacion.md`.


## Piloto con base de datos (etapa 2)

Con sesión iniciada, la aplicación trabaja con datos compartidos por institución cliente, sea un municipio o una autoridad
(diputado, senador, consejero regional, concejal, gobernador o delegado): noticias leídas cada 30 minutos, temas, marcas,
respuestas aprobadas y publicaciones agregadas a mano. Sin sesión sigue siendo la demostración.

La portada ofrece dos puertas: «Ver demostración» (aviso legal y elección de autoridad o municipio) e «Ingresar» (equipos con invitación),
más el enlace «Solicita un piloto» a soporte@altkimia.cl. Con sesión iniciada queda una sola: «Entrar a mi edición», directo a su institución.

Piezas:

- `supabase/esquema.sql`: tablas, reglas por municipio y rol (Row Level Security) y registro automático de actividad.
- `supabase/semilla.sql`: catálogo de medios (lo genera `scripts/build.py`).
- `supabase/alta_usuario.sql`: plantilla para crear la cuenta de una autoridad y asignar institución y rol a una persona invitada.
- `api/ingesta.js`: lectura programada; guarda solo notas nuevas, clasifica solo lo nuevo y agrupa con hechos de días anteriores.
- `api/_lectura.js`: lectura y clasificación compartidas con `api/noticias.js`.
- `api/_sujetos.js`: consulta a Google News y ficha de una autoridad, compartidas por `api/noticias.js` y `api/ingesta.js`.
- `api/config.js`: entrega al navegador la URL y la clave publicable de Supabase (públicas por diseño).
- `src/piloto.js`: ingreso, carga desde la base y sincronización de cambios.
- `.github/workflows/lectura.yml`: llama a `/api/ingesta` cada 30 minutos.

Puesta en marcha:

1. Crear el proyecto en Supabase (región São Paulo) y ejecutar en SQL Editor `supabase/esquema.sql` y luego `supabase/semilla.sql`.
2. En Supabase › Authentication › URL Configuration, dejar `https://pregonia.vercel.app` como Site URL.
3. En Vercel, variables `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` y `CRON_SECRET` (una contraseña larga inventada).
4. En GitHub › Settings › Secrets and variables › Actions, el secreto `CRON_SECRET` con el mismo valor.
5. Invitar a cada persona en Supabase › Authentication › Users y asignarle municipio y rol con `supabase/alta_usuario.sql`.

Roles: `admin` y `comunicaciones` editan; `alcalde`, `autoridad`, `directivo` y `lector` solo leen. Cada persona ve solo su institución.

### Autoridades en el piloto

La tabla `municipios` guarda también cuentas de autoridad: `tipo` es el cargo y `autoridad` describe a la persona
(`zona`, `nombre`, `g` y, si está en la nómina de `src/autoridades.js`, su `id`). La lectura programada busca lo que la nombra
(Google News por nombre y cargo, más los medios del catálogo) y la IA juzga relevancia y tono respecto de la persona, igual que
«Noticias reales» en la demostración. Los avisos llegan con el nombre de la autoridad.

Para activarlo en una base existente:

1. Correr de nuevo `supabase/esquema.sql` (agrega `tipo` y `autoridad` a `municipios`, deja la comuna opcional para autoridades y suma el rol `autoridad`).
   Mientras no se corra, la aplicación y la lectura programada siguen funcionando solo con municipios.
2. Crear la cuenta de la autoridad y asignar a su equipo con el bloque B de `supabase/alta_usuario.sql`.

## Avisos (alertas)

PregonIA avisa de noticias críticas nuevas, de las que escalan a prensa regional o nacional y de los temas que crecen rápido (3 medios en 6 horas). Las reglas están en `src/reglas.js`; `scripts/build.py` las copia a `api/_reglas.js` para que la aplicación y el servidor avisen exactamente lo mismo.

- **En la aplicación:** campana en el encabezado, con la lista por municipio y las preferencias de cada persona (solo lo urgente, lo crítico, todo o nada; silencio nocturno).
- **En el navegador:** notificación mientras PregonIA esté abierta o instalada. No requiere configuración.
- **Con la aplicación cerrada (piloto):** la lectura programada evalúa las reglas y envía notificaciones (Web Push) y correos. Para activarlo:
  1. Correr de nuevo `supabase/esquema.sql` (agrega las tablas `alertas`, `avisos` y `suscripciones` y la función `destinatarios_avisos`, que solo puede usar el servidor).
  2. Abrir `https://pregonia.vercel.app/llaves-avisos.html`, generar las llaves y crear en Vercel `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT`. Las llaves se generan en el navegador; la privada va solo en Vercel.
  3. Correo (opcional): cuenta en Resend con el dominio verificado, y en Vercel `RESEND_API_KEY` y `AVISOS_REMITENTE` (por ejemplo `PregonIA <avisos@altkimia.com>`).
  4. Volver a desplegar. Cada persona activa los avisos en la campana de su celular.

### App en el celular

PregonIA se instala como app (PWA) desde el navegador, sin pasar por App Store ni Google Play:

- **Android (Chrome):** la campana de avisos ofrece «Instalar PregonIA» cuando el navegador lo permite; también desde el menú ⋮ › Instalar app.
- **iPhone (Safari):** Compartir › «Agregar a inicio». En iPhone los avisos con la app cerrada solo llegan con PregonIA instalada así. Como Apple no permite un botón «Instalar», la app muestra una guía paso a paso: sola al entrar al piloto (si la persona elige «Ahora no», vuelve a los 3 días), desde la campana («Ver cómo instalarla») y con el enlace `https://pregonia.vercel.app/?instalar`, pensado para enviarlo por WhatsApp a una autoridad. Si se abre dentro de Facebook, Instagram u otra app, la guía pide primero abrirla en Safari.
- **Atajos:** manteniendo presionado el ícono aparecen «Avisos» (abre la campana) y «Menciones» (en Android).
- **Sin señal:** `sw.js` muestra `offline.html` en vez del error del navegador. La aplicación no se guarda en caché: con conexión siempre se carga la versión vigente.



## Cuentas de Facebook e Instagram de medios

Un editor inscribe la cuenta en **Ajustes › Fuentes › Inscribir cuenta de red social** (red, enlace o @usuario, nombre del medio, alcance y comuna). Queda en el listado de fuentes de todas las cuentas de PregonIA y en la lista de Agregar publicación. En el piloto se guarda en la base (`inscribir_red`, ids desde 10000); en la demostración, en el navegador. Solo quien la inscribió (su municipio) puede retirarla; al retirarla deja de leerse y sus notas se conservan.

Cómo se procesan:

- **Instagram (lectura automática).** La lectura programada y «Noticias reales» leen las últimas 30 publicaciones de cada cuenta con la API oficial de Meta (Business Discovery) y las clasifican igual que una nota de prensa: relevancia para la comuna, tono, resumen propio y hecho al que pertenecen. Se guarda la primera frase como titular, el enlace y la fecha; el texto se usa solo para clasificar. Solo funciona con cuentas profesionales (empresa o creador), que es lo habitual en medios; si una cuenta es personal, Fuentes lo indica y queda para captura asistida.
- **Facebook (captura asistida por ahora).** Meta solo permite leer páginas de terceros con el permiso *Page Public Content Access*, que aprueba tras revisar la app y verificar la empresa. El lector ya está hecho: se activa con `META_FB_PPCA=1` cuando Meta lo apruebe. Mientras tanto, las publicaciones se agregan con Agregar publicación.

### Opción rápida para la demostración: Apify (sin Meta)

Con un token de Apify, Facebook e Instagram se leen solos, sin app de Meta ni revisión. Se usan los lectores oficiales de Apify (`apify/facebook-posts-scraper` y `apify/instagram-post-scraper`): solo páginas y cuentas públicas, sin iniciar sesión, sin comentarios.

Cómo se controla el gasto (Apify cobra por publicación entregada, no por pasada ni por cuenta revisada; plan gratuito: Facebook US$5 por mil más US$2 por mil del filtro de fecha, Instagram US$1,70 por mil, US$0,001 por pasada):

- Cada pasada pide exactamente lo publicado desde el inicio de la anterior (con 15 minutos de margen): ninguna publicación se paga dos veces.
- Una cuenta recibe su lectura de 14 días hacia atrás una sola vez, apenas se inscribe. Una cuenta que solo publica imágenes no se vuelve a pedir.
- La pasada de lo nuevo corre cada 4 horas (`APIFY_CADA_HORAS`). Como se paga por publicación, una frecuencia más alta mejora la frescura casi sin costo.
- Tope de gasto: con `APIFY_PRESUPUESTO_USD` (4,5 por defecto, bajo los US$5 gratis del mes) no se lanzan pasadas nuevas cuando el gasto del mes lo alcanza; Fuentes lo indica y se sigue mostrando lo ya leído.
- `APIFY_MAX_POR_CUENTA` (30 por defecto) es solo un resguardo por cuenta y pasada: con la ventana exacta no encarece.

1. Crear una cuenta en apify.com (con la de ALTKimia).
2. En Apify › Settings › Billing, fijar un **límite de gasto mensual** (por ejemplo, US$20).
3. Copiar el token en Apify › Settings › API & Integrations.
4. En Vercel (Settings › Environment Variables): `APIFY_TOKEN` con ese token. Opcionales: `APIFY_CADA_HORAS` (por defecto 4), `APIFY_MAX_POR_CUENTA` (por defecto 30) y `APIFY_PRESUPUESTO_USD` (por defecto 4,5). Luego Redeploy.

Costo de referencia (plan gratuito, nov 2026): las 8 cuentas del litoral publican unas 40 veces al día (la mayoría en Facebook, que cuesta cuatro veces más que Instagram), unos US$5 a 6 al mes; Canal 2 en Facebook es cerca de la mitad del gasto. Es una solución para la demostración: Meta bloquea estos lectores de vez en cuando (Fuentes lo muestra como «No se pudo leer») y antes del primer contrato pagado conviene pasar a la vía oficial. Si Meta queda configurado para una red, esa red se lee por Meta y deja de usar Apify.

Conectar Meta (una vez, en la cuenta de ALTKimia):

1. Tener una cuenta de Instagram **profesional** de ALTKimia o PregonIA, ligada a una página de Facebook.
2. En developers.facebook.com, crear una app de tipo Empresa y agregarle el producto «API de Instagram con inicio de sesión con Facebook».
3. Generar un token con los permisos `instagram_basic`, `pages_show_list` y `pages_read_engagement`. Para que no venza, crearlo para un **usuario del sistema** en el Business Manager; un token de usuario normal dura 60 días.
4. Obtener el id de la cuenta de Instagram: `GET /me/accounts?fields=instagram_business_account` con ese token.
5. En Vercel (Settings › Environment Variables), y luego Redeploy:
   - `META_ACCESS_TOKEN`: el token.
   - `META_IG_USER_ID`: el id de la cuenta profesional de Instagram.
   - `META_FB_PPCA` (opcional): `1` solo cuando Meta apruebe Page Public Content Access.
   - `META_GRAPH_VERSION` (opcional): por defecto `v25.0`.

Mientras quien generó el token tenga un rol en la app, no hace falta pasar por la revisión de Meta para Instagram. Si el token vence, Fuentes muestra «No se pudo leer» con el motivo.

En la base del piloto: volver a ejecutar `supabase/esquema.sql` (agrega las columnas de cuentas de redes, las funciones `inscribir_red` y `retirar_red` y el origen `instagram`/`facebook` de las notas) y luego `supabase/semilla.sql`.

## Redacción: cuentas propias de PregonIA en Facebook e Instagram

Espacio privado del editor, en `https://pregonia.vercel.app/redaccion` (no aparece en la aplicación de los clientes ni en buscadores).

- **Propuestas:** la lectura programada (cada 30 minutos) junta las noticias de las últimas 48 horas de las comunas elegidas en Ajustes, más las regionales y nacionales que afectan a la región, las agrupa por hecho y les da un **puntaje de impacto** de 0 a 100: repercusión en medios (35), interacción en redes de las cuentas de medios (20), autoridades de la nómina (15), temas críticos y gravedad (20) y recencia (10). Es por palabras y conteos (`src/impacto.js`, el mismo en el servidor como `api/_impacto.js`). Claude Haiku escribe un titular y un resumen neutrales solo para lo que llega a 30 puntos (máximo 12 hechos por pasada).
- **Redacción:** desde una propuesta, Claude Sonnet redacta con reglas de neutralidad estricta los textos de Facebook (con enlace) e Instagram (sin enlaces, con hashtags), la pieza gráfica, la historia, el carrusel y el guion del reel. Sin IA disponible, deja una plantilla.
- **Revisión automática:** fuente citada en ambos textos, palabras valorativas, exclamaciones, partidos, cifras que no están en las fuentes, frases copiadas de los medios, mención de IA y texto alternativo. Lo marcado en rojo impide aprobar.
- **Piezas:** feed 4:5 e historia 9:16 siempre; carrusel y reel a pedido (`src/piezas.js`). Todo en el navegador, con la identidad Edición, sin fotos de medios ni imágenes generadas. El reel lleva voz sintética por escena (`/api/voz`, ElevenLabs) y música compuesta por el navegador; se exporta a MP4.
- **Aprobación y agenda:** siempre manual, con confirmación de verificación y neutralidad (más una de revisión reforzada si la noticia toca términos declarados en Ajustes). Si se edita algo aprobado, vuelve a borrador. Calendario de 7 días con horarios sugeridos según la meta diaria.
- **Avisos al celular:** push cuando una propuesta supera el umbral (silencio de 23:00 a 7:00 salvo 90+), resumen de la mañana y aviso a la hora de publicar lo programado.
- **Fase 1:** se publica a mano (descargar o compartir la pieza y copiar el texto) y se marca como publicada con sus enlaces. **Fase 2:** publicación automática por la API de Meta.

Puesta en marcha:

1. Supabase › SQL Editor: correr `supabase/esquema.sql` completo (agrega `editores`, `redaccion_*`, reglas y el registro editorial).
2. Habilitar al editor con el bloque C de `supabase/alta_usuario.sql` (su usuario debe existir en Authentication › Users).
3. Publicar en Vercel. Las variables ya existentes bastan (`ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `VAPID_*`, Supabase).
4. Entrar a `/redaccion`, elegir territorios en Ajustes y activar los avisos en el celular (en iPhone, instalarla antes en la pantalla de inicio).

Prueba local sin base de datos: `python3 scripts/build.py && python3 -m http.server 8000` y abrir `http://localhost:8000/redaccion.html`: entra en **modo prueba** con noticias, medios y personas ficticias guardadas en el navegador.

Costo variable estimado (validar con los precios vigentes): la detección agrega una llamada corta a Haiku por pasada solo cuando hay hechos nuevos sobre 30 puntos; cada redacción es una llamada a Sonnet; la voz solo se graba en los reels que se piden (ElevenLabs cobra por caracteres; para uso comercial en redes se necesita un plan pagado). El render de imágenes y videos es en el navegador, sin costo de servidor.

# PregonIA — Especificación funcional del MVP

Nov 3, 2026 · @Antonio Villalobos

## Resumen ejecutivo

El MVP es una plataforma SaaS que detecta, clasifica y alerta menciones de municipios y actores políticos en medios digitales chilenos, en menos de 30 minutos desde su publicación y sin reproducir contenido periodístico. Nombre: PregonIA ("Escucha la plaza. Decide a tiempo."), evolución del prototipo SENTINEL. Lo opera ALTkimia y se desarrolla con asistencia de IA sobre ese prototipo.

**Para quién.** Municipios (alcalde, equipo de comunicaciones, administración municipal) y actores políticos territoriales (alcaldes, concejales, diputados, candidatos). El piloto se hace con seis municipios: Casablanca, Algarrobo, El Quisco, El Tabo, Cartagena y San Antonio.

**Propuesta de valor.** Enterarse primero, entender rápido y responder bien: alerta inmediata ante menciones críticas, resumen diario para la autoridad e informe mensual para rendición de cuentas.

**Diferenciación.** Frente a los servicios de clipping tradicionales compite en tres frentes: cumplimiento legal demostrable (índice con enlace, no reproducción), inteligencia en lugar de recortes (tono, resumen, acción sugerida) y precio de SaaS accesible para municipios medianos y pequeños.

**Alcance del MVP.** 100 medios digitales, 50 nacionales y 50 de la Región de Valparaíso, plantillas municipal y política, alertas por correo y WhatsApp o Telegram, y piloto de 8 semanas con al menos dos municipios pagando al cierre.

## Problema y oportunidad

Las autoridades locales se enteran tarde y por canales informales de lo que publican los medios sobre ellas: un reenvío por WhatsApp, horas después, cuando la nota ya escaló. Los equipos de comunicaciones municipales suelen ser de una a tres personas, sin herramientas, revisando portales a mano.

**El mercado existe y se compra por licitación.** Hay contratos públicos vigentes de monitoreo, como el de Subtel por $15.708.000 o el de Sernatur por $6.283.200 a 24 meses ([PortalChile](https://www.portalchile.org/empresa/news-executive-channel-sa-76130246)). Operadores como Litoralpress ganan licitaciones en 2026 ([BidsFactory](https://bidsfactory.com/en/tenders/servicio-de-monitoreo-de-medios-chile_mercadopublico-752-6-LE26)), y Chileclipping es otro referente del sector.

**La ventana: el clipping tradicional está bajo presión legal.** En 2026 la ANP pidió al gobierno exigir acreditación de licencias como requisito de admisibilidad en licitaciones de monitoreo ([Chócale](https://chocale.cl/2026/04/anp-se-reune-con-ministra-sedini-y-le-plantea-criticas-al-clipping-y-a-deuda-del-servel-con-la-prensa/)), y ChileCompra dejó sin efecto una licitación del Ministerio de Minería por falta de requisitos de derechos de autor ([The Clinic](https://www.theclinic.cl/2026/04/29/reclamo-de-la-anp-logra-suspender-licitacion-del-ministerio-de-mineria-por-uso-de-clipping-sin-licencias/)). Un proveedor que no reproduce contenido y lo documenta tiene una ventaja comercial directa ante compradores públicos.

**El segmento desatendido.** Los incumbentes apuntan a ministerios y grandes empresas. Municipios medianos y pequeños, concejales y candidatos no pueden pagar una agencia, pero sí una suscripción.

## Usuarios y roles

El MVP atiende cuatro personas; la autoridad consume, el equipo de comunicaciones opera.

| Persona | Qué necesita | Cómo usa la plataforma | Frecuencia |
| --- | --- | --- | --- |
| Autoridad (alcalde, concejal, diputado) | Saber qué se dice de él antes que nadie | Lee alertas en el celular y el resumen diario | Varias veces al día, 2 minutos |
| Encargado de comunicaciones | Detectar, priorizar y responder | Revisa el feed, etiqueta, ajusta temas, exporta reportes | Diaria, 30 a 60 minutos |
| Equipo técnico o directivo municipal | Seguir temas de su área (obras, salud, seguridad) | Recibe resumen filtrado por tema | Semanal |
| Administrador de cuenta | Gestionar usuarios, temas y facturación | Configuración | Mensual |

**Matriz de permisos**

| Acción | Administrador | Editor | Lector |
| --- | --- | --- | --- |
| Crear y editar temas | Sí | Sí | No |
| Ver feed y menciones | Sí | Sí | Sí |
| Etiquetar y marcar relevancia | Sí | Sí | No |
| Configurar alertas propias | Sí | Sí | Sí |
| Exportar reportes | Sí | Sí | Sí |
| Gestionar usuarios y medios | Sí | No | No |

Cada organización es un espacio aislado. Un usuario puede pertenecer a varias organizaciones (por ejemplo, un asesor que atiende a un alcalde y a dos concejales), pero nunca ve datos cruzados entre ellas.

## Alcance del MVP

El MVP cubre solo medios digitales escritos y los dos segmentos ancla; todo lo demás queda fuera de forma explícita para proteger el plazo.

**Entra**

- 100 medios digitales: 50 nacionales y 50 de la Región de Valparaíso, entre regionales y locales por comuna (ver las pestañas de medios).
- Ingesta en cascada: RSS, sitemap de noticias, lectura de portada o sección, y Google News como red de seguridad.
- Temas configurables con términos, variantes, contexto requerido y exclusiones, más vista previa sobre los últimos 30 días.
- Plantillas municipal y política.
- Deduplicación de notas replicadas entre medios.
- Clasificación con IA de relevancia, tono y resumen propio de una línea.
- Feed web, alertas inmediatas (WhatsApp o Telegram), resumen diario por correo, informe mensual en PDF, informe de crisis y panel de métricas.
  - Caracterización del cliente con temas base sugeridos.
  - Módulo de borradores de comunicados con aprobación humana.
- Multi-organización con roles y panel de salud de fuentes.

**Queda fuera**

- Redes sociales (X, Instagram, TikTok, Facebook): APIs caras o restringidas, y otro régimen de datos personales.
- Radio y televisión: requiere transcripción y otro modelo de costos.
- Prensa impresa y contenido tras muro de pago completo.
- Plantillas para empresas e instituciones educativas (segunda ola).
- App móvil nativa: el MVP es web responsiva más alertas a mensajería.
- Análisis predictivo o de redes de influencia.

## Requisitos funcionales

Doce módulos y 52 requisitos; los marcados como imprescindibles definen el MVP, los deseables entran si el plazo lo permite.

| ID | Módulo | Requisito | Prioridad |
| --- | --- | --- | --- |
| RF-01 | Fuentes | Registrar un medio con nombre, URL, tipo (nacional, regional, comunal), región y comuna | Imprescindible |
| RF-02 | Fuentes | Definir el método de lectura por medio: RSS, sitemap, portada o sección, Google News | Imprescindible |
| RF-03 | Fuentes | Definir frecuencia de lectura por medio (15, 30 o 60 minutos) | Imprescindible |
| RF-04 | Fuentes | Panel de salud: última lectura exitosa, notas por día, errores, alerta si un medio deja de entregar notas por más de 24 horas | Imprescindible |
| RF-05 | Fuentes | Respetar robots.txt y marcar los medios que excluyen lectura automatizada | Imprescindible |
| RF-06 | Temas | Crear un tema con términos principales, variantes y alias | Imprescindible |
| RF-07 | Temas | Definir términos de contexto requerido (al menos uno debe aparecer) y exclusiones | Imprescindible |
| RF-08 | Temas | Marcar combinaciones críticas que disparan alerta inmediata | Imprescindible |
| RF-09 | Temas | Vista previa en vivo: qué notas de los últimos 30 días habría capturado y descartado la regla | Imprescindible |
| RF-10 | Temas | Crear un tema desde plantilla, con variantes y exclusiones sugeridas | Imprescindible |
| RF-11 | Temas | Sugerir variantes y exclusiones con IA a partir de falsos positivos marcados | Deseable |
| RF-12 | Ingesta | Extraer título, bajada, fecha, autor, sección, URL canónica y texto para análisis interno | Imprescindible |
| RF-13 | Ingesta | Normalizar texto: minúsculas, sin tildes, sin código HTML | Imprescindible |
| RF-14 | Ingesta | Descartar notas con fecha anterior a 72 horas en la primera lectura de un medio nuevo | Deseable |
| RF-15 | Deduplicación | Agrupar la misma noticia publicada en varios medios por URL canónica y similitud de texto | Imprescindible |
| RF-16 | Deduplicación | Mostrar la noticia agrupada con la lista de medios que la publicaron (alcance) | Imprescindible |
| RF-17 | Matching | Calzar notas contra todos los temas activos con búsqueda de texto en español | Imprescindible |
| RF-18 | Matching | Registrar qué términos dispararon cada calce (trazabilidad) | Imprescindible |
| RF-19 | Clasificación | Confirmar relevancia con IA solo sobre notas ya calzadas | Imprescindible |
| RF-20 | Clasificación | Clasificar tono: positivo, neutro, crítico | Imprescindible |
| RF-21 | Clasificación | Generar un resumen propio de una línea, sin copiar frases del original | Imprescindible |
| RF-22 | Clasificación | Sugerir una acción: informativo, monitorear, responder | Deseable |
| RF-23 | Feed | Listar menciones agrupadas por noticia, con filtros por tema, tono, medio y fecha | Imprescindible |
| RF-24 | Feed | Mostrar título, medio, fecha, tono, resumen propio y enlace al original | Imprescindible |
| RF-25 | Feed | Marcar una mención como relevante o falso positivo, y etiquetarla | Imprescindible |
| RF-26 | Feed | Búsqueda libre sobre el histórico de menciones | Deseable |
| RF-27 | Alertas | Alerta inmediata por WhatsApp o Telegram ante combinaciones críticas o tono crítico | Imprescindible |
| RF-28 | Alertas | Resumen diario por correo a hora configurable | Imprescindible |
| RF-29 | Alertas | Silenciar alertas por horario o por tema | Deseable |
| RF-30 | Reportes | Informes por lector: parte semanal del alcalde (copiable a WhatsApp), mesa diaria de comunicaciones e informe de gestión mensual en PDF | Imprescindible |
| RF-31 | Reportes | Exportar menciones a CSV | Imprescindible |
| RF-32 | Administración | Crear organizaciones, invitar usuarios y asignar roles | Imprescindible |
| RF-33 | Administración | Registro de auditoría de cambios en temas, medios y usuarios | Imprescindible |
| RF-34 | Administración | Límites por plan: temas incluidos, paquetes adicionales, usuarios y tope de menciones, con aviso al acercarse al tope | Imprescindible |
| RF-35 | Caracterización | Formulario de caracterización por tipo de cliente, completable en menos de 10 minutos | Imprescindible |
| RF-36 | Caracterización | Precarga de autoridades vigentes y datos públicos del territorio, con confirmación del usuario | Imprescindible |
| RF-37 | Caracterización | Descubrimiento: análisis del histórico acumulado y de Google News para detectar temas recurrentes del cliente | Imprescindible |
| RF-38 | Caracterización | Motor de sugerencia: arma la base según el plan (núcleo más mayor puntaje) y ordena los candidatos para paquete adicional | Imprescindible |
| RF-39 | Caracterización | Cada tema sugerido llega con variantes, contexto, exclusiones y nivel de alerta, editables antes de activar | Imprescindible |
| RF-40 | Caracterización | Recaracterización trimestral o ante cambio de autoridad, con propuesta de altas y bajas de temas | Deseable |
| RF-41 | Reportes | Informe de crisis automático ante alerta crítica y bajo demanda | Imprescindible |
| RF-42 | Reportes | Panel web con las métricas cuantitativas y su evolución | Imprescindible |
| RF-43 | Reportes | Análisis cualitativo con IA: encuadres, actores, argumentos y territorio, validable por el cliente | Imprescindible |
| RF-44 | Reportes | Informe semanal de tendencias | Deseable |
| RF-45 | Reportes | Comparativo con pares a partir de menciones públicas | Deseable |
| RF-46 | Reportes | Informe de impacto: recogida de mensajes, cambio de tono, duración de crisis y cobertura obtenida | Deseable |
| RF-47 | Comunicados | Generar borrador desde una mención, un informe de crisis o un tema emergente | Imprescindible |
| RF-48 | Comunicados | Seis piezas: comunicado, declaración, aclaración o rectificación, mensajes clave, preguntas anticipadas y minuta | Imprescindible |
| RF-49 | Comunicados | Base de conocimiento del cliente como única fuente de datos y citas | Imprescindible |
| RF-50 | Comunicados | Aprobación humana obligatoria y registro de versiones | Imprescindible |
| RF-51 | Comunicados | Seguimiento de recogida de cada pieza en los medios monitoreados | Deseable |
| RF-52 | Comunicados | Advertencia de contenido promocional o electoral en cuentas municipales | Imprescindible |

## Plantillas de monitoreo

Las plantillas definen la estructura de los temas por tipo de cliente; la caracterización (sección siguiente) los llena con los datos del cliente, completa la base y propone los adicionales.

**Plantilla municipal.** El usuario ingresa comuna, nombre del alcalde y región. El sistema crea cinco temas:

| Tema | Términos base | Contexto requerido | Exclusiones sugeridas | Alerta inmediata si aparece |
| --- | --- | --- | --- | --- |
| Municipio | Municipalidad de {comuna}, municipio de {comuna} | — | — | Contraloría, sumario, querella, formalización |
| Autoridad | {alcalde}, alcalde de {comuna} | — | Homónimos detectados en la vista previa | Tono crítico |
| Comuna | {comuna} | municipio, alcalde, concejo, vecinos, {región} | Lugares homónimos de otros países, obras culturales con el mismo nombre | Emergencia, incendio, accidente grave |
| Concejo municipal | concejo municipal de {comuna}, concejal + {comuna} | — | — | Ninguna por defecto |
| Proyectos y servicios | Nombres de programas, obras y licitaciones que el usuario agrega | {comuna} | — | Paralización, demanda, reclamo |

Ejemplo de exclusión necesaria: para Casablanca, la plantilla sugiere excluir Marruecos, la película y los hoteles homónimos, y exige contexto comunal o regional.

**Plantilla política.** El usuario ingresa nombre, cargo, territorio y hasta cinco temas de agenda. El sistema crea:

| Tema | Términos base | Alerta inmediata si aparece |
| --- | --- | --- |
| Nombre propio | Nombre completo, apellidos, cargo + apellido | Tono crítico, investigación, denuncia |
| Territorio | Comuna o distrito + temas de agenda | Ninguna por defecto |
| Agenda | Hasta cinco temas que el usuario prioriza (seguridad, agua, vivienda) | Ninguna por defecto |
| Otros actores | Hasta cinco figuras públicas que el usuario quiere seguir, solo en su rol público | Ninguna por defecto |

El tema de otros actores exige aceptar la política de uso (ver cumplimiento legal) y queda limitado a personas con cargo o candidatura pública.

## Caracterización del cliente y temas base sugeridos

Los temas base no se configuran desde cero: el sistema los propone a partir de un perfil del cliente que se completa en menos de 10 minutos, y el cliente solo confirma o ajusta. La misma lógica propone los temas del paquete adicional, así que la venta incremental nace del propio diagnóstico.

&#91;embedded content: Caracterización y sugerencia de temas · 6 pasos\]

El flujo se repite cada tres meses, o antes si cambia la autoridad o aparece un tema emergente con volumen alto.

### Modelo de caracterización

| Dimensión | Qué se captura | Cómo se obtiene | Obligatoria |
| --- | --- | --- | --- |
| Tipo de cliente | Municipio, autoridad electa, candidato, partido o coalición; en la segunda ola, empresa e institución educativa | El usuario elige | Sí |
| Identidad | Nombre oficial, siglas, alias y nombres de uso común | Usuario y precarga | Sí |
| Territorio | Comuna, provincia, región, localidades y sectores | Precarga desde la comuna elegida; el usuario agrega localidades | Sí |
| Personas clave | Autoridad principal y hasta 4 voceros o directivos, con su cargo | Precarga de autoridades vigentes; el usuario confirma | Sí |
| Agenda | Proyectos, programas, obras y licitaciones con nombre propio | Usuario y descubrimiento | Al menos uno |
| Sensibilidades | Riesgos conocidos: causas judiciales, sumarios, conflictos laborales, emergencias recurrentes, servicios críticos | Catálogo por tipo de cliente y texto libre | Recomendada |
| Entorno | Pares, adversarios o competidores, solo figuras públicas en su rol público | Usuario | Opcional |
| Prioridades | Medios o tipos de medio más importantes, horario de alertas | Usuario | Opcional |

### Cómo se arma la base

1. **El núcleo entra siempre.** Cada tipo de cliente tiene temas fijos (tabla siguiente) que ocupan los primeros cupos del plan.
2. **Los cupos restantes se llenan por puntaje.** Cada candidato de la agenda, las sensibilidades y el descubrimiento recibe un puntaje que suma volumen de menciones en el período analizado, riesgo (sensibilidad declarada o tono crítico detectado) y prioridad declarada por el cliente.
3. **Los siguientes cinco candidatos quedan como sugeridos.** Se ofrecen como paquete adicional, mostrando cuántas menciones habrían generado.
4. **Cada tema llega armado.** Variantes, contexto requerido, exclusiones por homónimos detectados y nivel de alerta, todo editable antes de activar.
5. **El descubrimiento tiene un límite técnico.** Los feeds solo entregan las notas recientes, así que el MVP usa el histórico acumulado desde que parte la ingesta más una búsqueda en Google News por el nombre del cliente. Por eso la ingesta debe partir en la semana 1, aunque el piloto parta en la semana 4.

### Núcleo por tipo de cliente

| Tipo de cliente | Núcleo fijo | Candidatos típicos para completar la base |
| --- | --- | --- |
| Municipio | Institución, autoridad, comuna | Concejo municipal, proyecto emblemático, salud y educación municipal, seguridad, agua y emergencias |
| Autoridad electa | Nombre propio, cargo y territorio | Agenda de gestión o legislativa, partido o coalición propia, adversarios declarados |
| Candidato | Nombre propio, candidatura y territorio | Temas de campaña, adversarios, fiscalización del Servel |
| Empresa (segunda ola) | Marca, ejecutivo principal | Productos, regulador, competidores, conflictos laborales |
| Institución educativa (segunda ola) | Institución, rector | Acreditación, carreras, conflictos estudiantiles |

### Ejemplo ilustrativo: Municipalidad de Casablanca, plan Comunal

| # | Tema propuesto | Origen |
| --- | --- | --- |
| 1 | Municipalidad de Casablanca | Núcleo |
| 2 | Alcalde (nombre, apellidos y cargo) | Núcleo |
| 3 | Casablanca, con exclusiones de Marruecos, la película y hoteles homónimos | Núcleo |
| 4 | Concejo municipal | Mayor puntaje entre candidatos |
| 5 | Polideportivo municipal | Agenda y sensibilidad declaradas |

Sugeridos para el primer paquete adicional: plataforma logística y antepuerto, agua y sequía en la cuenca, Ruta 68, salud municipal y seguridad comunal. El orden real lo define el puntaje del descubrimiento.

La caracterización se rige por el capítulo de cumplimiento: solo personas en su rol público, y la precarga y el descubrimiento proponen, pero nada se activa sin la confirmación del cliente.

## Reportes y métricas

Los reportes se ordenan por lector, no por tipo de medio. Cada informe tiene un destinatario, una pregunta que responder y un tiempo de lectura; lo que no ayuda a esa persona a decidir queda fuera. En el piloto municipal los lectores son el alcalde, el encargado de comunicaciones y el equipo directivo. En empresas y campañas políticas la estructura es la misma: gerente general o candidato, comunicaciones o jefe de campaña, y directorio o comando.

### Set de reportes

| Reporte | Lector | Cuándo y cuánto | Qué responde | Qué incluye | Plan |
| --- | --- | --- | --- | --- | --- |
| Parte del alcalde | Alcalde | Lunes 8:00, semanal · 2 minutos en el celular | ¿Cómo me trató la prensa, qué se puede complicar y qué hago? | Veredicto de la semana contra la anterior; hasta tres asuntos ordenados por riesgo, cada uno con hasta dónde llegó, acción recomendada y área responsable; una buena noticia para aprovechar. Se copia como texto para WhatsApp | Todos |
| Mesa de comunicaciones | Encargado(a) de comunicaciones | Diaria, 8:30 · 10 a 15 minutos | ¿Qué respondo hoy, qué está escalando y qué difundo? | Críticas sin respuesta aprobada, con acción sugerida y botón para preparar la respuesta; temas que pasaron de la prensa comunal a la regional o nacional, con su recorrido y horas; buenas noticias aún no difundidas; medios que cubren la comuna, comunales primero | Todos |
| Informe de gestión | Alcalde y equipo directivo | Primer lunes del mes · 15 minutos en reunión de equipo | ¿Cómo se percibe la gestión por tema y cómo estamos frente a las comunas vecinas? | Hallazgos principales, tono de la cobertura y su variación, tono y alcance territorial por tema, noticias por día, comparación interna con las comunas vecinas, lectura del analista con IA y respaldo con todas las notas enlazadas | Todos |
| Episodio crítico | Alcalde y comunicaciones | Se activa solo ante una noticia crítica · 5 minutos | ¿Cómo se propagó y qué hacemos ahora? | Medios en 24 horas, hasta dónde llegó, curva de propagación, cronología y estado de la respuesta | Todos |
| Informe de impacto | Comunicaciones | Mensual y por campaña | ¿Las acciones de comunicación movieron la cobertura? | Cobertura antes y después de cada comunicado aprobado | Regional o Político |
| Informe anual | Alcalde y equipo directivo | Anual | Insumo de prensa para la cuenta pública | Evolución del año por tema de gestión | Complemento |

La comparación con las comunas vecinas va dentro del informe de gestión y es de uso interno: usa solo menciones públicas de cada comuna en los medios monitoreados, nunca la configuración ni los datos de otras cuentas. Los informes tratan de temas de gestión y servicios, no de la figura de la autoridad, para que no puedan leerse como promoción personal pagada con recursos municipales.

### Nivel territorial: hasta dónde llegó

Comunal, regional y nacional no son tres informes distintos sino un dato de cada asunto y de cada tema: el nivel de prensa más alto que alcanzó y el orden en que lo hizo. Un tema que nace en un medio comunal y aparece horas después en uno regional es la señal de riesgo más valiosa del producto, y cada lector la usa distinto: al alcalde le avisa que el tema ya salió de la comuna, a comunicaciones le dice que todavía puede contenerlo con una respuesta directa y al equipo directivo le muestra qué temas de gestión trascienden.

La acción recomendada sigue reglas simples y revisables: crítica en prensa nacional, vocería del alcalde el mismo día; crítica en prensa regional, declaración institucional antes de que llegue a lo nacional; crítica solo comunal, respuesta en el medio y contacto con los vecinos afectados. El área responsable se asigna por las palabras de la noticia (emergencias, operaciones, salud, obras, entre otras) y el municipio puede corregir ese mapa.

### Métricas cuantitativas

| Métrica | Cómo se calcula | Para qué sirve |
| --- | --- | --- |
| Volumen de menciones | Menciones por noticia agrupada, no por nota replicada | Presencia real, sin inflar por réplicas de agencia |
| Alcance ponderado | Menciones por el peso del medio (nivel A = 3, B = 2, C = 1) | Distinguir una nota en un medio nacional de una en un blog comunal |
| Distribución de tono | Porcentaje positivo, neutro y crítico | Lectura rápida del clima |
| Tono de la cobertura | Veredicto en cinco niveles, mostrado junto a los conteos de positivas, neutras y críticas. Se decide con (positivas − críticas) / total: muy favorable desde +40, favorable desde +10, equilibrada entre −9 y +9, desfavorable hasta −39 y muy desfavorable bajo −40. El índice no se muestra al usuario | Se entiende sin explicación y permite decir si el tono mejoró o empeoró respecto del período anterior |
| Participación en la conversación | Menciones del cliente / menciones del conjunto de pares | Peso frente a comunas o actores comparables |
| Velocidad de propagación | Medios que recogen una noticia en sus primeras 24 horas | Detectar a tiempo lo que escala |
| Temas emergentes | Crecimiento semanal de un tema sobre su promedio de cuatro semanas | Anticipar crisis y oportunidades |
| Tiempo de respuesta | Horas entre una alerta crítica y la respuesta pública del cliente | Medir la capacidad de reacción |
| Hasta dónde llegó | Nivel de prensa más alto alcanzado (comunal, regional o nacional) y si subió de nivel con el tiempo, según la hora de la primera nota en cada nivel | Ordenar asuntos por riesgo y actuar mientras el tema sigue en la prensa comunal |

### Análisis cualitativo

- **Encuadres dominantes:** cómo se cuenta la historia (gestión, conflicto, abandono, logro), detectado por IA y validado por el equipo del cliente.
- **Actores y voceros:** quiénes hablan del cliente, quiénes lo critican y quiénes lo defienden.
- **Argumentos:** los principales argumentos de críticos y defensores, en resumen propio.
- **Territorio:** sectores y localidades que más aparecen, útil para la gestión en terreno.
- **Lectura del analista:** un párrafo de interpretación con recomendaciones; en el MVP lo redacta la IA y lo valida el cliente.

Todo el análisis se expresa en resumen propio y con enlace al original, sin reproducir fragmentos de las notas.

### Impacto

El impacto se mide por resultados, siguiendo los Principios de Barcelona de AMEC, y no con el valor publicitario equivalente, que esos principios rechazan porque no mide efectos.

- **Recogida de mensajes:** porcentaje de las notas posteriores a un comunicado que incluye los mensajes clave del cliente.
- **Cambio de tono:** nivel del tono de la cobertura siete días antes y siete días después de una intervención (por ejemplo, de desfavorable a equilibrada).
- **Duración de una crisis:** días hasta volver al volumen base del tema.
- **Cobertura obtenida:** medios que publicaron un comunicado, ponderados por nivel.

El informe dice explícitamente que coincidencia no es causalidad: muestra lo que cambió después de una acción, no prueba que la acción lo causó.

## Módulo de comunicados

El módulo convierte un resultado (una mención crítica, una crisis o un logro que nadie cubrió) en un borrador de comunicación listo para revisar, y después mide si funcionó. Nada se publica ni se envía sin aprobación humana.

### Qué genera

| Pieza | Cuándo se usa | Contenido |
| --- | --- | --- |
| Comunicado de prensa | Anuncio, logro o respuesta institucional | Titular, bajada, cuerpo, datos de respaldo y contacto de prensa |
| Declaración breve | Respuesta rápida a un periodista o en redes | Dos a cuatro frases con el mensaje central |
| Solicitud de aclaración o rectificación | Nota con información errónea sobre el cliente | Carta al director del medio, conforme al derecho de aclaración y rectificación de la Ley 19.733 |
| Mensajes clave | Preparar al vocero | Tres mensajes, datos de respaldo y frases a evitar |
| Preguntas anticipadas | Entrevista o punto de prensa | Preguntas probables con respuestas sugeridas |
| Minuta para la autoridad | Antes de una decisión o reunión | Situación, cobertura, riesgos y opciones en una página |

### Cómo funciona

1. **Origen:** el usuario pulsa "Responder" en una mención, en un informe de crisis o en un tema emergente.
2. **Contexto automático:** el sistema reúne las menciones relacionadas, el tono, los actores, los medios y lo que el cliente ya dijo antes.
3. **Base de conocimiento del cliente:** cifras oficiales, documentos, guía de estilo y voceros autorizados que el cliente carga; el borrador solo usa datos de esa base y de las menciones.
4. **Borrador con enfoques alternativos:** aclarar, contextualizar, responder con datos, o reconocer y corregir.
5. **Revisión y aprobación:** edición en línea, aprobación por un usuario con rol de editor y registro de versiones.
6. **Salida:** copiar o exportar a Word; en el MVP el envío lo hace el cliente desde sus propios canales.
7. **Seguimiento:** la plataforma detecta qué medios recogieron la pieza y alimenta el informe de impacto.

### Reglas del módulo

- **No inventa datos ni citas.** Cada cifra lleva su fuente en la base del cliente, y las citas quedan marcadas como propuestas hasta que el vocero las valida.
- **No reproduce texto de las notas.** Las referencia y enlaza.
- **No suplanta a nadie.** No genera contenido a nombre de terceros, comentarios falsos ni cuentas simuladas.
- **Separa comunicación institucional de propaganda.** En cuentas municipales advierte cuando un borrador promueve a una persona o a un partido, y endurece la advertencia en período electoral. Estas reglas deben validarse con el abogado del capítulo de cumplimiento.

### En los planes

El plan Comunal incluye 4 borradores al mes y el Regional o Político 12. Los paquetes de 10 borradores adicionales se venden como complemento a $29.000 al mes (hipótesis a validar en el piloto).

## Sistema de diseño

La interfaz se diseña como una sala de situación: superficies tranquilas, jerarquía clara y el color reservado para lo que exige acción. El objetivo es que el alcalde distinga en segundos qué está bien, qué requiere atención y qué es crítico, y que el equipo de comunicaciones trabaje horas en ella sin fatiga. El prototipo publicado es la referencia visual.

### Principios

- El color significa riesgo. Los colores de tono no se usan para decorar; todo lo demás es azul pizarra y grises.
- Nada se comunica solo con color: cada tono lleva ícono y etiqueta, para personas con daltonismo, impresión en blanco y negro y proyección.
- Lo que dijo el medio se distingue de lo que concluye PregonIA: titulares y resúmenes de prensa en serif; análisis e interfaz en sans.
- Cada cifra va con su gráfico y cada gráfico con su cifra.
- Sobriedad institucional: sin gráfica de gobierno ni de partido, sin fotos de autoridades.

### Paleta

| Rol | Claro | Oscuro | Uso |
| --- | --- | --- | --- |
| Fondo | #F3F5F8 | #0B131D | Lienzo de la aplicación |
| Superficie | #FFFFFF | #121D2A | Tarjetas, tablas y paneles |
| Texto | #132235 | #E5ECF4 | Texto principal |
| Texto secundario | #5B6A7C | #97A6B8 | Etiquetas y metadatos |
| Líneas | #DAE1E9 | #243548 | Bordes y divisores |
| Barra superior | #0F2236 | #070E17 | Identidad y estado del monitoreo |
| Acento institucional | #1E4D8C | #7FAAE0 | Acciones principales, navegación activa y señal de alcance |
| Crítico | #C8412C | #E0604A | Noticias críticas y riesgo alto |
| Favorable | #00897B | #20A493 | Noticias positivas y oportunidades |
| Neutro | #A3AEBB | #5F6E80 | Noticias neutras y punto medio de las escalas |
| Aviso | #A8650F | #E9A44C | Límites del plan, muestras pequeñas y avisos del sistema |
| Niveles de medio | #8FA6C4 · #5476A0 · #1F3A5F | #3F5878 · #6F93C0 · #A9C6EA | Comunal, regional y nacional en gráficos: un solo tono, de claro a oscuro |

La combinación crítico, neutro y favorable y la rampa de niveles se validaron para los tres tipos de daltonismo y para contraste contra la superficie, en ambos modos. Por eso favorable es verde azulado y no verde puro.

### Tipografía

- Public Sans: interfaz, análisis y cifras con números tabulares. Fue diseñada para servicios digitales de gobierno y es legible en tamaños pequeños.
- Newsreader: titulares y resúmenes de prensa, y la pregunta que responde cada informe.
- IBM Plex Mono: ejes de gráficos, fechas y conteos en tablas.
- Escala: 40 para el veredicto, 26 para títulos de vista, 20 para el encabezado de informe, 17 a 19 para titulares de prensa, 14,5 para texto, 12,5 para metadatos y 11 para etiquetas en mayúscula.

### Componentes propios

- Señal de alcance: tres barras crecientes (comunal, regional, nacional) rellenas hasta el nivel más alto que alcanzó la noticia, con la frase "Llegó a prensa regional". Es también el símbolo del logo.
- Veredicto de tono: la palabra (de muy favorable a muy desfavorable) en su color, los conteos y una escala de cinco tramos con el tramo activo marcado.
- Tarjeta de asunto: filete izquierdo según el tono, número de prioridad, tema y tono, resumen propio en serif, medios y antigüedad, señal de alcance, recuadro "Qué hacer" y "Responsable".
- Franja del lector: Para, Cuándo, Lectura y Responde, al inicio de cada informe.
- Barra de estado: "Monitoreando 100 medios · actualizado hh:mm" con indicador vivo; si una fuente falla, el indicador pasa a aviso.
- Barra de tono divergente por tema: críticas a la izquierda, positivas a la derecha y neutras repartidas al centro.

### Comportamiento

- Modo claro y oscuro desde el inicio, cada uno con su paleta, no una inversión automática.
- El parte del alcalde se diseña primero para el celular; la mesa de comunicaciones y el informe de gestión, primero para el escritorio. En el celular la navegación pasa a una barra inferior con cinco destinos.
- Animación mínima: solo el indicador vivo, que se desactiva si el usuario pide menos movimiento.
- El PDF del informe de gestión usa la misma paleta y tipografías, y se lee en blanco y negro gracias a íconos y etiquetas.

## Modelo de precios

Cada cliente contrata una campaña base con un número fijo de temas y suma temas adicionales en paquetes; la cantidad de temas define el precio mensual. Los montos son hipótesis a validar en el piloto.

**La unidad de cobro es el tema, no la palabra.** Un tema es una cosa que se monitorea (una persona, una institución, un proyecto o un asunto) con su nombre, hasta 5 variantes y sus exclusiones. Cobrar por palabra invita a amontonar sinónimos en un solo término o a reclamar por variantes que cuentan doble.

| Plan | Precio mensual (CLP, hipótesis) | Temas incluidos | Cobertura | Usuarios | Tope de menciones al mes | Para quién |
| --- | --- | --- | --- | --- | --- | --- |
| Comunal | $149.000 | 5 | Nacional + región del cliente | 3 | 1.500 | Municipio pequeño o mediano, concejal |
| Regional o Político | $249.000 | 10 | Nacional + región del cliente | 5 | 4.000 | Municipio grande, alcalde, diputado, candidato |
| Paquete adicional | $49.000 | +5 | — | — | +750 | Cualquier plan |

**Complementos aparte**

- Alertas por WhatsApp: es el único costo variable relevante por mensaje; Telegram y correo van incluidos.
- Usuarios adicionales.
- Región adicional.

**Uso razonable.** El tope de menciones no busca cobrar más, sino evitar que un tema mal configurado ("Chile", "seguridad") dispare el costo de clasificación con IA. Al acercarse al tope, la plataforma avisa y sugiere ajustar exclusiones antes de ofrecer un paquete.

**Diseñado para la Compra Ágil.** El plan Regional anual suma cerca de $3 millones, y aun con dos paquetes adicionales queda bajo el tope de 100 UTM de la [Compra Ágil](https://www.chilecompra.cl/2024/12/mas-participacion-de-las-empresas-de-menor-tamano-compra-agil-aumentara-de-30-a-100-utm-a-partir-del-12-de-diciembre/), vigente desde diciembre de 2024 para empresas de menor tamaño. Un municipio puede contratar sin licitación y en días. Como referencia de techo, el contrato de monitoreo de Sernatur equivale a unos $262.000 al mes.

**El equilibrio de la base.** Con 5 temas, un municipio cubre lo esencial: institución, alcalde, comuna, concejo y un proyecto. El primer proyecto conflictivo nuevo es el que lleva al siguiente paquete. Una base más generosa mata la venta de adicionales; una más corta hace sentir que el producto viene recortado.

## Cumplimiento legal

El producto es un índice con inteligencia, no un clipping: detecta, clasifica, resume con palabras propias y envía al lector al medio. Este principio se diseña en el código, no solo en los términos de uso. Todo lo que sigue debe validarse con un abogado especialista en propiedad intelectual y datos personales antes del primer contrato.

**Propiedad intelectual (Ley 17.336)**

- El usuario nunca ve el texto completo de una nota: ve título, medio, fecha, resumen propio de una línea y enlace al original.
- El texto completo se usa solo para análisis interno y se elimina a los 30 días; se conservan metadatos, resumen propio y clasificación.
- El resumen se genera con instrucciones de no reproducir frases y se valida automáticamente contra el original: si comparte una secuencia de más de ocho palabras seguidas, se regenera.
- Los informes PDF citan y enlazan; no incluyen capturas ni recortes de las notas.
- Se respeta robots.txt, no se eluden muros de pago y cualquier medio puede pedir su exclusión por un canal publicado.
- Opción estratégica a evaluar: acuerdo de licencia o de colaboración con la ANP, que convertiría el cumplimiento en barrera de entrada.

**Datos personales (Ley 21.719)**

- Solo se monitorean personas en su rol público: autoridades, funcionarios con cargo directivo y candidatos. No se crean perfiles de ciudadanos privados, periodistas individuales ni dirigentes vecinales.
- Minimización: se guarda el nombre detectado y el contexto de la mención, nada más.
- Canal para ejercer derechos de acceso, rectificación, supresión y oposición.
- Contrato de encargo de tratamiento con cada cliente, que define finalidad y prohibiciones.
- Designación de responsable de protección de datos dentro de la sociedad operadora, antes de la entrada en vigencia de la ley.

**Política de uso**

- Prohibido usar la plataforma para hostigar, perfilar o vigilar a personas privadas.
- Cada organización es un espacio aislado; el personal del operador accede a datos de un cliente solo con registro de auditoría y por soporte solicitado.
- Neutralidad política: la plataforma atiende a actores de cualquier sector en las mismas condiciones, y no comparte información entre cuentas.

**Dossier de cumplimiento para licitaciones.** Documento de dos páginas que acredita los puntos anteriores, con arquitectura de datos, política de retención y canal de exclusión para medios. Se adjunta a toda oferta pública.

## Arquitectura técnica y modelo de datos

Todo el procesamiento ocurre en el servidor; el navegador solo muestra resultados y las claves de API nunca salen del backend. El LLM interviene solo después del matching, lo que mantiene el costo de IA proporcional a las menciones y no al volumen de noticias.

&#91;embedded content: Flujo de procesamiento · 6 etapas\]

**Stack**

| Capa | Tecnología | Por qué |
| --- | --- | --- |
| Base de datos | Supabase (Postgres) con búsqueda de texto en español y extensión unaccent | Matching rápido sin servicio adicional, autenticación y seguridad por fila incluidas |
| Worker de ingesta | Python programado cada 15 minutos (cron de Supabase o GitHub Actions) | Ecosistema maduro para RSS, sitemaps y extracción de texto |
| Clasificación | Groq (LLaMA) con respaldo en un segundo proveedor | Continuidad del prototipo, costo bajo, latencia baja |
| Frontend | Next.js en Vercel | Despliegue ya conocido en el prototipo |
| Alertas | Correo transaccional, Telegram Bot API, WhatsApp Business API | Telegram para el piloto por costo cero; WhatsApp al pasar a producción |
| Reportes | Generación de PDF en servidor | Entregable mensual sin intervención manual |

**Modelo de datos**

| Entidad | Campos principales | Relaciones |
| --- | --- | --- |
| organizacion | id, nombre, tipo (municipio, político), plan | Tiene usuarios, temas y medios activos |
| usuario | id, correo, teléfono, canal de alerta preferido | Pertenece a una o más organizaciones con un rol |
| medio | id, nombre, url, tipo, región, comuna, método de lectura, frecuencia, estado de salud | Catálogo común a todas las organizaciones |
| nota | id, medio, url canónica, título, bajada, fecha, texto interno, fecha de eliminación del texto | Pertenece a un medio y a un grupo de noticia |
| grupo\_noticia | id, nota principal, cantidad de medios | Agrupa notas duplicadas |
| tema | id, organización, términos, variantes, contexto, exclusiones, reglas críticas, plantilla de origen, origen del tema (núcleo, agenda, sensibilidad, descubrimiento o manual), puntaje | Pertenece a una organización |
| mencion | id, tema, grupo de noticia, términos disparadores, relevancia, tono, resumen, acción, etiqueta del usuario | Une tema y grupo de noticia |
| alerta | id, mención, usuario, canal, fecha de envío, leída | Registro de cada envío |
| auditoria | id, usuario, acción, entidad, fecha | Trazabilidad de cambios |
| perfil\_cliente | id, organización, tipo de cliente, identidad, territorio, personas clave, agenda, sensibilidades, entorno, prioridades, fecha de última caracterización | Uno por organización; origina los temas sugeridos |

## Requisitos no funcionales

| Atributo | Meta del MVP |
| --- | --- |
| Latencia | Alerta crítica en menos de 30 minutos desde la publicación, en el 90% de los casos |
| Disponibilidad | 99% mensual del feed y del envío de alertas |
| Seguridad | Aislamiento por fila entre organizaciones, claves en el servidor, doble factor para administradores |
| Retención | Texto completo de notas eliminado a los 30 días; menciones y metadatos conservados 24 meses |
| Escalabilidad | 100 medios y 20 organizaciones sin cambios de arquitectura; hasta 300 medios con más workers |
| Costo variable | Costo de IA y alertas por organización bajo el 15% del precio de su plan |
| Usabilidad | Una organización nueva configurada con plantilla en menos de 10 minutos |
| Móvil | Feed y alertas legibles en un celular sin instalar nada |
| Idioma | Interfaz en español de Chile; matching tolerante a tildes y variantes |

## KPIs y criterios de éxito del piloto

El piloto se da por exitoso si, al cierre del piloto (semana 11 del proyecto), se cumplen las metas de precisión y cobertura y al menos dos de los seis municipios firman un plan pagado.

| KPI | Cómo se mide | Meta al cierre del piloto |
| --- | --- | --- |
| Cobertura | Medios leídos sin error en el día / medios activos | 95% o más |
| Precisión | Menciones marcadas relevantes / menciones mostradas | 85% o más |
| Exhaustividad | Notas relevantes detectadas / notas relevantes encontradas en revisión manual semanal de una muestra | 90% o más |
| Latencia | Minutos entre publicación y alerta, percentil 90 | Menos de 30 |
| Uso | Alertas abiertas / alertas enviadas | 60% o más |
| Adopción | Usuarios activos semanales / usuarios invitados | 70% o más |
| Conversión | Organizaciones del piloto que firman plan pagado | Al menos 2 de 6 |
| Valor percibido | Casos en que el cliente se enteró por la plataforma antes que por otro canal, registrados en entrevista semanal | 3 o más casos documentados |

## Roadmap de implementación

Once semanas en cuatro fases; el piloto arranca en la semana 4 con el núcleo funcionando y cada fase se cierra con un hito que decide si se avanza.

&#91;embedded content: Roadmap · 4 fases, 4 hitos de decisión\]

Si el hito de precisión no se cumple en la semana 6, la fase de producto se posterga y se dedican dos semanas a ajustar reglas y plantillas: un producto ruidoso con más funciones no se vende.

## Riesgos y mitigaciones

Los dos riesgos que pueden matar el producto son el legal y la pérdida de confianza por ruido; el resto es operativo.

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Reclamo de un medio o de la ANP por uso de contenido | Alto | Diseño sin reproducción, retención de 30 días, canal de exclusión, dossier de cumplimiento, validación legal previa |
| Precisión bajo 80%: el usuario deja de confiar | Alto | Vista previa de reglas, plantillas con exclusiones, marcado de falsos positivos que alimenta ajustes, revisión semanal en el piloto |
| Medios que cambian su estructura y rompen la lectura | Medio | Cascada de métodos, panel de salud con alerta a las 24 horas, Google News como respaldo |
| Filtración entre cuentas de actores rivales | Alto | Seguridad por fila en base de datos, pruebas automáticas de aislamiento, auditoría de accesos |
| Percepción de sesgo por el vínculo político del fundador | Medio | Marca y sociedad operadora separadas, política de neutralidad publicada |
| Dependencia de un solo proveedor de IA | Medio | Capa de abstracción y proveedor de respaldo configurado |
| Costo de WhatsApp Business al escalar | Bajo | Telegram en el piloto, WhatsApp solo para alertas críticas en planes pagados |
| Dispersión del roadmap por pedidos de cada cliente | Medio | Regla: nada entra al núcleo si no sirve al menos a dos segmentos |

## Decisiones abiertas

- [x] Nombre: PregonIA, con la bajada "La prensa no espera. Tú tampoco." (antes "Escucha la plaza. Decide a tiempo.", cambiada el 13-nov-2026) Pendiente: revisar la marca en INAPI (clases 9, 35, 38 y 42), inscribir pregonia.cl en NIC Chile y solicitar la marca mixta a nombre de ALTkimia.
- [x] Sociedad operadora: ALTkimia.
- [x] Listado de medios: todos los verificados, 50 nacionales y 50 de la Región de Valparaíso.
- [x] Piloto con seis municipios: Casablanca, Algarrobo, El Quisco, El Tabo, Cartagena y San Antonio.
- [x] Planes valorizados por temas, según el modelo de precios; montos a validar en el piloto.
- [ ] Acercamiento a la ANP: antes del lanzamiento o después de tener casos.
- [ ] Abogado de propiedad intelectual y datos personales para validar el capítulo de cumplimiento.
- [x] Equipo de desarrollo: desarrollo asistido con IA sobre el prototipo actual.

# Cumplimiento legal y confianza · PregonIA

Auditoría del código contra los 35 controles del prompt maestro de lanzamiento (versión noviembre 2026, normativa chilena).
Fecha: 13-nov-2026 · Rama: `cumplimiento-legal`

Estados: **Implementado** (se resolvió en esta rama) · **Cumple** (ya estaba bien) · **Parcial** · **Pendiente** · **No aplica hoy** (el código no tiene esa función; si se agrega, el control se activa).

## Diferencias entre el perfil declarado y el código

| Rasgo declarado | Lo que muestra el código |
|---|---|
| Cobros o suscripción | No hay pagos en línea. La app muestra planes con precio mensual (`src/base.js`), pero el cobro se acuerda por contrato con cada municipio |
| Correos de marketing | Solo correos de aviso (transaccionales) vía Resend, con preferencias por persona |
| Analítica y píxeles | No hay analítica ni píxeles. Sí carga Google Fonts y bibliotecas desde CDN |
| Reseñas y logos | No hay reseñas ni logos de clientes en la app. El README público nombra seis comunas como piloto |
| Venta al sector público | Sí: municipios, concejos y autoridades |

Si se agregan pagos en línea, analítica, píxeles o correos comerciales, se activan los controles 8–11 y 14–17.

## Estado por control

| N° | Control | Estado | Evidencia o acción |
|---|---|---|---|
| 1 | Política de privacidad | Implementado | `legal.html#privacidad`, vigente desde el 13-nov-2026 (revisada) |
| 2 | Plazo de retención | Parcial | Plazos fijados en la política (cuentas: contrato + 90 días; actividad: 12 meses; noticias: 24 meses). Falta borrado automático programado (función SQL + llamada diaria desde `api/ingesta.js`) |
| 3 | Descargar y borrar datos | Pendiente | Hoy se atiende por correo y desde Supabase. Falta "Exportar datos del municipio" (JSON) y flujo de baja de cuenta |
| 4 | Minimización | Cumple | No se guarda el texto de los medios (`notas`), la imagen de las capturas no se almacena, perfiles con datos mínimos |
| 5 | Datos de menores | No aplica | Usuarios son funcionarios municipales |
| 6 | Registro de aceptación | Implementado | Tabla `aceptaciones` y función `aceptar_documentos()` en `supabase/esquema.sql`. **Correr de nuevo esquema.sql en Supabase** |
| 7 | No entrenar IA sin permiso | Cumple | PregonIA no entrena modelos. Verificar cláusula de no entrenamiento en contratos de Anthropic y ElevenLabs |
| 8 | Banner de cookies | No aplica hoy | Sin cookies de analítica ni publicidad |
| 9 | Bloquear rastreadores | No aplica hoy | Sin rastreadores. Recomendado: alojar las fuentes en el propio dominio |
| 10 | Enlace de baja | Cumple | Avisos con preferencias (urgente, crítico, todo, nada) en la campana |
| 11 | Permiso aparte para marketing | No aplica hoy | Sin correos comerciales |
| 12 | Casilla de términos sin marcar | Implementado | Diálogo "Antes de continuar" en `src/piloto.js`, casilla desmarcada y obligatoria |
| 13 | Términos y condiciones | Implementado | `legal.html#terminos` |
| 14 | Política de reembolsos | No aplica hoy | Sin cobro en línea; debe quedar en el contrato |
| 15 | Cancelar tan fácil como suscribirse | No aplica hoy | En el contrato: término por el mismo medio de contratación |
| 16 | Aviso de renovación automática | No aplica hoy | En el contrato, si hay renovación automática |
| 17 | Sin cargos ocultos | Revisar | La barra superior muestra "Plan Comunal · $149.000/mes" (`src/base.js`, PLANES) sin decir si incluye IVA. Definir y mostrar "IVA incluido" o "+ IVA"; lo mismo en propuestas comerciales |
| 18 | Datos de contacto de la empresa | Implementado | `legal.html#quien`: ALTKIMIA Consultoría y Tecnología SpA, RUT 77.508.685-8, Padre Mariano 391 of. 704, Providencia. Contacto: soporte@altkimia.cl |
| 19 | Sin cuentas regresivas falsas | Cumple | No hay |
| 20 | Sin patrones engañosos | Cumple | Revisado: sin casillas premarcadas ni "confirmshaming"; nada se publica sin aprobación |
| 21 | Sin reseñas falsas | Cumple | No hay reseñas |
| 22 | Sin promesas no demostrables | Cumple | "Más de 100 medios" coincide con el catálogo (127 filas) |
| 23 | No declarar certificaciones | Cumple | No declara sellos |
| 24 | Disponibilidad realista | Implementado | Términos 3.5: sin nivel garantizado durante el piloto |
| 25 | Logos y nombres de clientes con permiso | Revisar | El README (repo público) nombra Casablanca, Algarrobo, El Quisco, El Tabo, Cartagena y San Antonio como piloto. Confirmar autorización escrita de cada municipio o cambiar a "comunas de la Región de Valparaíso" |
| 26 | Contraste | Implementado | Contador de la navegación (blanco sobre rojo 3,5:1 → 4,9:1) y color de aviso en modo claro (4,1:1 → 5,3:1). Resto de pares de texto ≥ 4,5:1 |
| 27 | Texto alternativo | Cumple | Única `<img>` con alt; la portada es fondo decorativo |
| 28 | Navegación con teclado | Cumple | Enlace "Ir al contenido", foco visible, atajos, diálogos con Escape. No se hizo prueba completa con lector de pantalla |
| 29 | Licencias de activos | Implementado | `docs/licencias.md`. Verificar términos de la herramienta que generó la portada |
| 30 | Licencias open source | Cumple | MIT y MPL-2.0 sin modificar; sin GPL/AGPL |
| 31 | Canal de derechos de autor | Implementado | `legal.html#medios`: retiro de fuentes y reclamos a soporte@altkimia.cl, respuesta en 5 días hábiles |
| 32 | Etiquetar contenido IA | Implementado | Borradores, PDF, kit de vocería, respuestas de la ayuda y cierre del video con voz sintética |
| 33 | Auditar SDKs | Cumple | Sin SDK de terceros en el navegador salvo supabase-js, jsPDF y mp4-muxer; inventario en `docs/licencias.md` |
| 34 | Acuerdos de tratamiento con proveedores | Pendiente | Firmar o aceptar DPA de Supabase, Vercel, Anthropic, ElevenLabs, Resend, Meta, Apify, GitHub. Y DPA de ALTKimia hacia cada municipio |
| 35 | Publicar proveedores y país | Implementado | `legal.html#proveedores` |

## Hallazgos fuera de la lista

1. **Dato sensible en la nómina de autoridades.** `src/autoridades.js` guarda la afiliación política de cada autoridad. Bajo la Ley 21.719 las opiniones políticas son datos sensibles. Es información pública de cargos electos, pero conviene que un abogado confirme la base de licitud o dejar de guardar el partido si no es necesario para el calce.
2. **Lectura de redes con Apify.** El propio README advierte que es una solución de demostración y que Meta bloquea estos lectores. Antes del primer contrato pagado, pasar a la API oficial de Meta.
3. **Repositorio público.** El repo es público: no subir nunca datos reales de municipios, claves ni nombres de funcionarios.

## Pasos manuales para activar lo de esta rama

1. Supabase › SQL Editor: correr `supabase/esquema.sql` completo (agrega `aceptaciones` y `aceptar_documentos`). Sin esto, el ingreso funciona igual y la consola avisa que falta la tabla.
2. Al cambiar los documentos, subir `LEGAL_VERSION` en `src/piloto.js` para que todos acepten la nueva versión.

## Módulo Redacción (cuentas propias de PregonIA en Facebook e Instagram) · 16-nov-2026

Rama `redaccion-fase-1`. Filtro de los 35 controles solo para lo nuevo: PregonIA publica a nombre de un medio, reutiliza información de noticias de terceros, genera texto, piezas y voz con IA y, en la fase 2, publicará por la API de Meta. El módulo es de uso exclusivo del editor (tabla `editores`); no trata datos de clientes.

| N° | Control | Aplica | Cómo queda en el módulo |
|---|---|---|---|
| 1, 35 | Privacidad y proveedores | Condicional | Sin datos personales nuevos de usuarios (solo el editor). Las noticias nombran a autoridades públicas en su cargo. En la fase 2, sumar Meta como destino de publicación en `legal.html#proveedores` |
| 4 | Minimización | Aplica | De cada nota se guarda titular, enlace, medio, fecha e interacción pública; no el texto del medio |
| 6 | Registro de aceptación | Aplica (registro editorial) | Cada cambio de estado de una publicación queda en `actividad` (trigger `registrar_redaccion`) y la aprobación guarda quién, cuándo, qué advertencias había y qué confirmó (`aprobado`, `aprobado_por`, `revision`) |
| 13 | Términos | Aplica | Borrador de línea editorial de El Pregonero en `el-pregonero.html` (/el-pregonero): propiedad, neutralidad, fuentes, IA, conflictos de interés, correcciones y datos personales; `legal.html#editorial` remite a ella. Pendiente: editor responsable y su declaración de relaciones; revisión de abogado |
| 20 | Sin patrones engañosos | Aplica | Revisión automática bloquea o advierte: palabras valorativas, exclamaciones, mayúsculas sostenidas |
| 22 | Sin promesas no demostrables | Aplica | Advertencia de cifras que no están en las fuentes; el prompt prohíbe agregar datos |
| 25 | Logos de terceros | Aplica | Las piezas nombran a los medios como fuente; nunca usan sus logos ni fotos |
| 26–28 | Accesibilidad | Aplica | Panel con contraste AA, foco visible, teclado y diálogos con Escape; cada publicación lleva texto alternativo para Instagram |
| 29 | Licencias | Aplica | Fuentes Inter y Source Serif 4 (OFL). Música compuesta por el propio navegador (sin pistas de terceros). **Voz ElevenLabs: el uso comercial en redes exige un plan pagado (el gratuito pide atribución y no permite uso comercial)** |
| 31 | Derechos de autor | Aplica | Resúmenes propios; la revisión detecta frases de 8 palabras copiadas de los medios; sin fotos de los medios; canal de reclamos ya existe (`legal.html#medios`) |
| 32 | Etiquetar IA | Aplica | Mención de IA en cada texto y pieza; el reel dice «voz sintética». En la fase 2, activar la etiqueta «Información de IA» de Meta al publicar reels con voz sintética |
| 34 | Acuerdos con proveedores | Aplica | Sin proveedores nuevos en la fase 1 (Anthropic, ElevenLabs, Supabase, Vercel). Fase 2: términos de la plataforma de Meta para publicar |
| 2, 3, 5, 7–12, 14–19, 21, 23, 24, 30, 33 | Resto | No aplica | Sin registro de terceros, cobros, cookies, correos comerciales, reseñas, certificaciones ni SDK nuevos en el navegador |

Hallazgos del módulo:

1. **Credibilidad y conflicto de interés.** El editor declaró relación con la Municipalidad de Casablanca. Mitigación en el producto: revisión reforzada configurable (términos en Ajustes) con confirmación adicional al aprobar. Mitigación de fondo: transparentar en la biografía de las cuentas quién opera PregonIA y su editor responsable.
2. **Ley 19.733 (prensa).** Si PregonIA se presenta como medio, revisar con abogado si le aplican las obligaciones de un medio de comunicación social (director responsable, derecho de aclaración y rectificación). El borrador editorial ya ofrece un canal de correcciones.
3. **Períodos electorales (Ley 18.700).** La línea neutral no es propaganda, pero en campaña conviene revisar con abogado el tratamiento de candidaturas y la publicidad pagada en redes.
4. **Datos sensibles.** El prompt evita mencionar partidos salvo que sean el centro del hecho, y la revisión lo advierte.

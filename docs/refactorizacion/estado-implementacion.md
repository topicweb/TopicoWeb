# Estado de implementación

Autorización: usuario aprobó implementar el plan el 16/11/2026, usar Luna para tareas delimitadas, commits locales por fase y continuidad entre sesiones. No pedir otra autorización para trabajo ya autorizado. Costes de infraestructura y despliegues sin validar siguen fuera del alcance automático.

## Punto de partida

- Base original: d58d869. Documentos de auditoría/plan estaban sin seguimiento y se incorporan al historial.
- El plan conserva criterios de aceptación: implementación local no equivale a cierre en staging ni despliegue.
- Node v20.19.0 y PostgreSQL 17.11 instalados. En el sandbox no están disponibles por PATH; ejecución fuera de sandbox con permisos de herramienta.
- Supabase: proyecto TopicoWeb; ninguna rama staging disponible. Metadatos de políticas/triggers reconsultados y coinciden con auditoría. Sin escrituras remotas.
- Base sintética temporal: localhost:55439, cluster en TEMP/topico-refactor-pg-20261116. Nunca apuntar fixture/tests al proyecto remoto.
- Vitest excluye src/test/e2e/**: el archivo simularAtencion es operativo, no una suite unitaria. Las tres suites reales se ejecutan separadas de Supabase.
- Fixture supabase/tests/fixtures/schema.sql contiene columnas/enums/restricciones de catálogo, sin filas reales. Auth es simulado; no reproduce GoTrue/PostgREST ni todos los triggers.

## Fases

| Fase | Estado | Cierre pendiente |
|---|---|---|
| 0 | Supabase local con Auth/PostgREST disponible y probado | Configuración cloud y smoke de la aplicación |
| 1 | Parte local implementada y verificada | SQL coordinado con fase 2; staging y despliegue pendientes |
| 2 | Migración verificada en PostgreSQL y Supabase local Auth/API | Smoke cliente y despliegue; producción sin cambios |
| 3 | Parche instalado y validado localmente | Prueba PWA instalada y despliegue Netlify |
| 4a | Implementada y verificada localmente; decisión online confirmada | Prueba interactiva y despliegue |
| 4b | Implementada y verificada localmente | Smoke interactivo y despliegue coordinado SQL/aplicación |
| 5–9 | Pendientes; fuera del alcance de esta sesión | Retomar en otro chat por indicación del usuario |

## Regla de continuidad

Leer este archivo, plan-refactorizacion.md y git log. Verificar git status antes de tocar nada. Registrar aquí pruebas efectivamente ejecutadas, límites y siguiente acción; no asumir pruebas históricas como actuales. Los commits locales se identifican por fase en el mensaje (consultar git log para hashes).

No ejecutar supabase db push ni apply_migration sobre producción durante preparación. No crear staging de pago. No desactivar RLS como rollback. No borrar pendientes de Dexie ni limpiar directorios arbitrarios.

## Registro 16/11/2026 — fase 1 local

- Luna implementó validación de perfil activo/no eliminado en autoservicio y administración, schemas de edición y validación de rol en actualización administrativa. El agente principal revisó el diff y ejecutó pruebas.
- Compatibilidad: el formulario puede seguir enviando rol/activo/business_id al editarse a sí mismo; esos campos se ignoran y nunca se persisten por autoservicio.
- TypeScript sin emisión: correcto. Vitest: 66/66, tres suites (usuarios 23, stock 32, reportes 11).
- No resuelve por sí solo S02: el cierre de escritura directa requiere migración fase 2. No desplegar dando por corregida la seguridad remota.
- Build en curso al registrar este commit; no se afirma cierre de smoke PWA/Auth.

## Registro 16/11/2026 — fases 1/2 SQL local

- Build con Next 16.1.6 y cambios fase 1: correcto, 11 páginas generadas. No equivale a smoke de navegador.
- Migración 20261116000100_secure_tenant_access.sql: cierra escritura directa de perfiles; reemplaza políticas abiertas; mínimo SELECT/INSERT/UPDATE clínico por institución activa del perfil; sin DELETE/TRUNCATE; instituciones/programas de lectura. No cambia restricciones de FK/stock (fase 7).
- Contrato preservado: personal y admin activos pueden operar datos clínicos de su institución; perfiles solo se escriben mediante acciones administrativas/propias verificadas con service_role. Desactivados conservan lectura exclusiva de su perfil para bootstrap.
- Fixture incluye políticas legacy abiertas y grant de columna: se comprobó su retirada. Luna creó matriz; principal corrigió/revisó y ejecutó PostgreSQL 17.11.
- Runner: `powershell -NoProfile -ExecutionPolicy Bypass -File supabase/tests/run-local.ps1`. Host fijo 127.0.0.1, puerto 55439. Base con nombre sintético aleatorio retirada al finalizar.
- Dos ejecuciones completas correctas: aislamiento bidireccional de siete tablas; INSERT/UPDATE/upsert propio y rechazo cruzado en cuatro; traslado tenant denegado; perfil/anon/DELETE/TRUNCATE; inactivo/eliminado/sin perfil; service_role preservado. Migración repetida correctamente.
- No se aplicó en Supabase. Pendiente staging real con Auth y PostgREST; ausencia de staging comunicada mediante pregunta asíncrona.
- Para reversión operativa futura: mantener nuevas políticas y revocar temporalmente INSERT/UPDATE clínicos de authenticated, preservando pendientes; reparar y revalidar antes de reabrir. Nunca volver a grants/políticas abiertas ni desactivar RLS. Revertir commit local solo antes de despliegue.

## Registro 16/11/2026 — límite de la sesión y siguiente acción

- Commits de fase: 89bc76e (preparación), 5090d3a (fase 1 local), 3217bb7 (fase 2 local, SQL + matriz). Consultar git log por si otro agente añadió commits posteriormente.
- Fase 3: versión estable Next 16.4.6 comprobada en GitHub oficial y npm; React/react-dom 19.2.9 disponible y compatible con peerDependencies. Objetivo también server-only 0.0.1 y eslint-config-next 16.4.6. Referencia: https://github.com/vercel/next.js/releases/tag/v16.4.6 .
- Dos intentos de instalación sufrieron TLS EPROTO/BAD_RECORD_MAC/ECONNRESET y descarga detenida. Se detuvieron únicamente procesos de esos instaladores. No se desactivó TLS. Se recuperó instalación original usando lockfile congelado, caché offline e ignore-scripts. No añadir import server-only hasta instalarlo correctamente.
- No hay autorización para un coste de staging. La consulta asíncrona pide elegir proyecto existente, gratuito o trabajo local; no asumir respuesta por silencio. No desplegar SQL sobre producción saltando pruebas Auth/API.
- Fases 4–9 no iniciadas. No mezclar cambios nuevos con una fase pendiente de validación; conservar todos los criterios originales del plan.
- Próximo agente: comprobar entorno y pruebas; completar instalación fase 3 con red estable, luego staging real de fases 1/2 y smoke. Revisar antes de aplicar que private.current_business_id no colisione con funciones preexistentes, grants service_role y esquema actual. El fixture simula Auth, no API real.
- Riesgos pendientes de fase 4: carrera entre lectura del estado de perfil y UPDATE service_role; fallo Auth/email antes de escribir perfil. No se dan por resueltos ni se alteró el flujo de email en fase 1.
- Verificación final tras recuperación: Node 20.19.0; next 16.1.6, react/react-dom 19.2.3; TypeScript correcto; Vitest 66/66; build webpack/PWA correcto con las 11 páginas. package.json, pnpm-lock.yaml y pnpm-workspace.yaml sin diferencias respecto a inicio.
- PostgreSQL temporal detenido correctamente. No se borró su directorio; sus datos son únicamente sintéticos. Para repetir tests, iniciar ese cluster en el puerto 55439 antes de ejecutar run-local.ps1; el runner crea y retira su propia base aleatoria.
- No se realizaron pruebas manuales de PWA/Auth ni escrituras remotas. Estado seguro para retomar: cambios de aplicación y SQL guardados en commits; fase 3 no quedó parcialmente aplicada.

## Continuación — staging gratuito local

- Usuario informa que no dispone de branches cloud por plan gratuito. Se inició Docker Desktop y Supabase local aislado en TEMP/topico-refactor-stack-20261116, sin crear proyectos ni costes cloud.
- Stack real local: PostgreSQL + Auth + PostgREST + Kong + correo sintético. Esquema público sin filas y migración RLS aplicados solo ahí. No se conectó al proyecto remoto.
- Luna preparó el test API; principal revisó y corrigió uso de apikey, pruebas sobre filas realmente existentes, cleanup, timeout y redirects. Wrapper PowerShell captura las claves locales en memoria sin imprimirlas.
- Prueba `supabase/tests/run-auth-api-local.ps1`: correcta. Creación/login de cuatro usuarios, instituciones/perfiles A/B, aislamiento, intento de escalar rol/tenant/estado (403 y fila intacta), insert/upsert propio, escritura cruzada (403), update ajeno sin filas y sin cambios, inactivo solo perfil propio. Cleanup correcto.
- No equivale a prueba de cookies SSR/Server Actions/PWA ni de configuración Auth cloud. No se despliega producción todavía. Ver staging-local.md para reproducir y detener servicios.
- Fase 3 reanudada: lockfile resuelto para Next16.4.6/React19.2.9/server-only/eslint-config-next16.4.6; descarga previa a instalación en curso. Se detectó peer preexistente Supabase SSR0.12.4 requiere JS^2.111.0 frente a2.93.3 actual; registrar para validar Auth sin actualizar adicionalmente a ciegas.

## Fase 3 — parche completado localmente

- Instalados y fijados Next16.4.6, React/react-dom19.2.9, eslint-config-next16.4.6 y server-only0.0.1. admin.ts importa server-only. Sin migración automática de middleware ni actualizaciones generales ajenas.
- Descargas recuperadas con registro HTTPS Yarn y verificación de integridad de pnpm; tarball oficial Next comprobado además por SHA512 de npm. No se desactivó TLS ni se añadieron rutas file: al manifest.
- Se regeneraron tipos de rutas, retirando únicamente .next/types y .next/dev/types obsoletos. No se cambió tsconfig para ocultar errores.
- TypeScript correcto, Vitest66/66 y build webpack/PWA correcto (11 páginas). Lint del módulo admin correcto. Avisos middleware deprecado, Browserslist y serialización de caché sin fallo funcional de build.
- Prueba local ampliada del SDK instalado: browser cookie jar, server getUser, refreshSession, nueva lectura de cookies y signOut correctos. Esto cubre métodos actuales pese al aviso peer preexistente SSR/JS; no certifica APIs nuevas de SSR ni elimina el aviso.
- Sin cambios remotos. Criterios PWA instalada y Netlify permanecen pendientes; no confundir build con prueba interactiva de navegación offline.
- Smoke del build servido en localhost: landing, login, manifest y service worker HTTP200; servidor temporal detenido al terminar.

## Subfase 4a — filas confirmadas y errores visibles

- Cambios preparados en acciones, hook y página de usuarios. UPDATE y desactivación devuelven fila canónica normalizada; ausencia de fila/error rechaza. Autoservicio aplica filtros activo/no eliminado; administración conserva filtro tenant en escritura.
- Dexie se modifica después del éxito remoto, usando exclusivamente la fila devuelta. No se guardan localmente campos privilegiados que autoservicio ignora. Fallos remotos y de caché se propagan. La página deja el error al modal para conservar el formulario; evita toast de éxito ante rechazo.
- Decisión confirmada por el usuario: crear, editar y desactivar usuarios requiere conexión. La lectura offline se conserva. No implementar una cola offline de administración de usuarios. Los guards existentes rechazan la operación antes de llamar acciones o modificar Dexie; los rechazos remotos tampoco generan éxito local.
- Luna implementó hook/tests; principal implementó acciones/página, revisó mocks y corrigió compatibilidad de tests. TypeScript correcto, 78/78 tests (acciones28, hook7, stock32, reportes11), build webpack/PWA correcto; lint de archivos modificados correcto tras corregir any/unused. No hay pruebas interactivas de modal ni Server Actions por HTTP en esta subfase.
- Fase 4 no está cerrada: aún quedan email propio con confirmación, recuperación de cuenta Auth sin perfil y fallo parcial de email Auth/perfil. No se modificaron esos flujos ni se activó handle_new_user.
- Continuar desde este checkpoint en Git; no aplicar migración remota ni publicar la aplicación sin verificar los criterios pendientes.
- Al terminar se detuvo el stack Docker de pruebas conservando volúmenes. Reiniciar con el comando de staging-local.md antes de repetir la matriz Auth/API. Docker Desktop puede permanecer abierto; no se detuvieron otros servicios.

## Decisión de producto — administración de usuarios online

- El usuario eligió explícitamente la opción recomendada: solo con conexión. Queda resuelto el pendiente de decisión de 4a; no hace falta nueva autorización para ese comportamiento.
- El código de 0222d07 ya implementa esa opción y sus pruebas offline/errores. En este checkpoint se registra la elección, sin cambiar código ni dependencias y sin repetir pruebas históricas como nuevas.
- Siguiente implementación: subfase 4b (confirmación de email propio y recuperación de fallos Auth/perfiles). La fase 4 completa y la validación/despliegue remotos siguen pendientes.

## Cierre de fase 4 — implementación local completa

Este registro sustituye el estado pendiente de 4b de los registros históricos anteriores. Por instrucción explícita del usuario se completa únicamente fase 4 y se detiene el trabajo; fases 5–9 se harán en otro chat/sesión.

- Alta: schema validado, UUID estable para reintento del mismo formulario abierto y contexto confiable app_metadata. Nueva migración 20261116000200_atomic_user_profiles.sql crea perfil dentro de transacción Auth, comprobando actor administrador activo e institución. Incluye disparo de INSERT y cambio de contexto porque GoTrue escribe app_metadata después del INSERT. No se activa handle_new_user ni se usa user_metadata para autorizar.
- Recuperación: un duplicado solo devuelve el alta previamente confirmada de la misma solicitud/actor/tenant/contexto; no sobrescribe contraseña/perfil ni adopta cuentas ajenas. Cambio/cierre de formulario descarta UUID; el alta ya existente debe consultarse. Huérfanos históricos sin marcador requieren diagnóstico/reparación dirigidos; no se borran automáticamente.
- Email propio usa sesión y confirmación Auth, conserva email canónico y comunica pendiente. Reintento con new_email pendiente no reenvía correo. Espejo Auth→perfil transaccional y guard de correo de perfil impiden divergencia nueva incluso en fallo parcial; actualización diferida de Dexie al recibir evento Auth. Divergencia antigua se repara solo desde identidad Auth comprobada.
- Email administrativo conserva confirmación administrativa autorizada. Nombre/rol/estado son una operación posterior: error se propaga y se reintenta; no se afirma atomicidad global del formulario. Guard evita sobrescritura de email obsoleto. RPC de preparación falla cerrado antes de nuevas mutaciones Auth si faltan triggers/migración.
- Luna implementó parte UI/tipos y realizó revisión delimitada; principal revisó/corrigió acciones/SQL, escribió la matriz real local y ejecutó las verificaciones. Revisión final señaló posible doble inserción: se comprobó WHEN sobre el marcador y se añadió prueba real de app_metadata sin cambio de marcador, correcta; no se añadió upsert que adoptara perfiles.

### Verificación final ejecutada

- Vitest: 93/93 (acciones43, hook7, stock32, reportes11). TypeScript sin emisión correcto.
- Build Next16.4.6 webpack/PWA correcto, 11 páginas; sin instalaciones ni cambios de dependencias en esta fase. Avisos anteriores de middleware/Browserslist sin fallo de build.
- Lint de acciones/tests/hook/schemas/tipos/página correcto. AuthProvider y UserModal conservan cuatro errores React previos, comprobados contra HEAD; sin errores nuevos ni reglas desactivadas. No declarar lint global limpio.
- Matriz real local user-consistency-local.mjs: correcta. Fallos CHECK inyectados de INSERT perfil y espejo de email revierten Auth; reintento correcto, sin huérfano. Guard de email obsoleto, duplicados, marcador confiable, permisos RPC, confirmación doble de correo propio y limpieza comprobados.
- Matriz real local auth-api-local.mjs repetida tras migración: correcta, aislamiento RLS, escalada bloqueada, inactivo limitado, insert/upsert propio, escritura cruzada rechazada y cookies SDK/getUser/refresh/signOut correctos.
- Migración final probada solo en stack sintético Docker; copia final conservada en su directorio temporal. Ninguna migración, política, fila ni configuración remota alterada. Stack de pruebas detenido correctamente al cierre, conservando sus volúmenes.

### Despliegue y próxima sesión

No se desplegó. No publicar solo las nuevas acciones: revisar catálogo/triggers/configuración Auth, aplicar primero migración fase 2 y después fase 4b, verificar cuatro triggers y RPC exclusivo service_role, luego aplicación. Aprobación operativa de despliegue pendiente; no usar db push contra producción de forma automática.

Pendientes de aceptación de despliegue: smoke crear/editar/desactivar mediante UI/Server Actions, errores y reintento conservando formulario, caída de caché/red, confirmación por redirección real, sesión expirada y lectura PWA offline. Las pruebas API directas no los sustituyen. No confundir fase 4 terminada localmente con solución desplegada ni con auditoría de datos históricos.

Rollback: antes de publicar, revertir commit local; después, suspender mutaciones de cuentas y coordinar cliente/acciones. Preferir corrección hacia delante manteniendo espejo/guard; no retirar triggers con acciones nuevas activas ni desactivar RLS. Preservar Auth, perfiles, pendientes y marcadores; sin rollback destructivo automático.

Siguiente agente: leer este registro y plan, consultar git log y git status. Fase 4 local cerrada; no reimplementarla ni asumir validación cloud. Fases 5–9 permanecen sin iniciar y fuera del alcance actual. Reanudar solo según instrucciones de la próxima sesión.

## Fase 5 — segregación de sincronización implementada localmente

- Contexto explícito userId/businessId/deviceId autorizado contra getUser y perfil remoto activo/no eliminado antes de peticiones. Auth invalida la generación al cambiar sesión y antes del logout; respuestas antiguas no escriben caché, cursores ni ACK. Hidratación de perfil descarta identidades/épocas anteriores. Se eliminan colas y timers de reconexión que retenían sesiones; el único timer inicial del hook se limpia al desmontar/cambiar contexto.
- PUSH filtra institución en todas las lecturas de pendientes, también después de reconciliar DNI y de reintentar conflictos únicos. Nunca reasigna business_id. Reconciliación modifica solo atenciones de esa institución; validación de medicamentos de movimientos también queda acotada al tenant. Los disparadores clínicos capturan el contexto vigente con requestPush; no envían nada sin sesión autorizada.
- Instituciones solo PULL con id propio. Mapa cerrado de siete tablas y capacidades de escritura/timestamps: movimientos conserva actualizado_at y omite creado_at. No se habilita su cursor incremental, paginación ni ACK por versión (fase 6). Se retira resolveConflict sin consumidores y sin contrato seguro.
- Dexie v3 añade sync_context_metadata con clave por dispositivo/institución/usuario. Conserva sync_metadata legacy y todas las tablas/pendientes, sin borrar ni adoptar cursores de identidad desconocida. SyncMonitor cuenta pendientes de la institución actual.
- SQL separado 20261117000100_institution_timestamp_contract.sql retira únicamente trigger_instituciones_actualizado_at. MCP confirmó por lectura el trigger y función incompatibles actuales; no ejecutó escrituras cloud. MCP disponible es cloud y no admite el Docker local: las verificaciones locales usan CLI/Docker.
- Luna preparó/amplió nueve tests del servicio; principal implementó, revisó y validó integración. Vitest 102/102; TypeScript y lint de archivos revisados correctos. Build webpack/PWA correcto; avisos de middleware/Browserslist y diferencias de mayúsculas del directorio Windows. La matriz Auth/RLS real local pasó con cleanup; prueba institution-contract-local.sql pasó en transacción ROLLBACK con trigger histórico recreado porque el fixture no lo incluye.
- Límites de aceptación: tests de sync usan mocks, no certifican dos pestañas reales, migración de IndexedDB instalada ni UI/PWA A→logout→B. El proveedor de navegación no ofrece navegadores en esta sesión. Esas comprobaciones manuales quedan pendientes antes de desplegar; no afirmar aceptación operativa completa. No hubo cambios de producción ni instalación de dependencias.
- Reversión: detener sincronización y conservar IndexedDB/colas. No resetear la BD. Usar cliente compatible con v3; no volver a un cliente v2 que no pueda abrirla. Mantener grants/RLS y no reponer trigger incompatible. Fase 6 no iniciada.

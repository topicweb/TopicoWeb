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
| 5 | Implementada y verificada localmente; commit 033e9cc | PWA instalada, upgrade Dexie y dos pestañas |
| 6 | Implementada y verificada localmente; commit 35e0f7e | PWA/multiventana y despliegue coordinado |
| 7 | Implementada y verificada localmente en esta continuación | Smoke UI/PWA, preparación de corte y despliegue |
| 8 | Implementada y validada localmente, con subpasos separados | Netlify, actualización de SW instalado y corte legacy antes de desplegar |
| 9 | Pendiente | Fuera del alcance solicitado en esta continuación |

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

## Fase 6 — fiabilidad de sincronización implementada localmente

- PULL paginado con keyset `(actualizado_at,id)` y páginas de 200; instituciones usa su id. Se pide página vacía final para no asumir el límite efectivo de PostgREST. Pendientes y fallidos locales se conservan dentro de transacciones; respuestas anteriores no sustituyen versiones confirmadas más recientes, con comparación a microsegundos.
- Dexie v4 agrega sync_table_metadata por dispositivo/institución/usuario/tabla. Conserva tablas y metadata v1–v3, sin adoptar el cursor global. Cada cursor avanza solo después de persistir todas las páginas de esa tabla; ante fallo se conserva la frontera previa. La repetición inclusiva de frontera es idempotente. Cursores concurrentes no retroceden.
- Nueva migración 20261117000200_sync_boundaries.sql: timestamp asignado por servidor para seis tablas; rellena únicamente actualizado_at nulo y fija NOT NULL. Movimientos mantiene ausencia de creado_at y ahora participa en incremental por actualizado_at. Instituciones no recibe columnas nuevas.
- RPC topico_sync_boundary exclusivo authenticated con perfil activo. Una barrera advisory exclusiva espera a escritores previos; los triggers mantienen lock compartido hasta COMMIT. Watermark privado y reloj servidor fijan el límite; los nuevos writes quedan después de la frontera incluso si había timestamps históricos futuros. SELECT FOR SHARE del watermark evita usar una versión antigua bajo aislamiento con snapshot. La función trigger final se ordena después de triggers históricos de timestamp. No cambia grants/RLS de tablas.
- PUSH en lotes de 100, elimina timestamps de actualización del dispositivo y pide ids/timestamps realmente devueltos. ACK transaccional solo si la fila actual coincide con toda la versión enviada; una edición durante envío sigue pending. ACK incompleto/error marca failed solo snapshots todavía coincidentes. Se preservan tombstones deleted_at en payload. Se retira cooldown global que impedía reintento manual inmediato.
- Reconciliación DNI transaccional en pacientes+atenciones, idempotente si ya terminó; rechaza edición concurrente o colisión con otro pendiente local. Conserva valores pendientes aunque su reloj sea anterior; preserva referencias de otras instituciones. Fallo antes de commit revierte toda sustitución de IDs. Conflicto único durante envío reconcilia y pide repetir, sin ACK de IDs sustituidos.
- withSupabaseRetry trata tanto errores lanzados como `{error,status}` retornados. Solo reintenta red/408/429/5xx y errores transitorios SQL definidos; permisos y validación fallan directamente. No registra cuerpos ni mensajes sensibles. Luna implementó retry y sus pruebas; principal implementó/revisó sync, SQL, monitor y matrices.
- Monitor muestra pendientes/fallidos y error seguro del contexto actual, captura rechazos y permite reencolar failed del tenant actual. Full sync envía primero cambios locales y después descarga. Sin resolveConflict ni cambios de integridad/autoridad de stock (fase 7).

### Verificación ejecutada de fase 6

- Vitest 122/122: 18 sync, 11 retry y 93 suites previas. Incluye 425 filas empatadas, fallo de página, persistencia local rechazada, cursor por tabla, replay sin duplicados, pending/failed preservados, ACK editado/tardío, timestamp canónico y microsegundos, rollback de reconciliación y recuperación explícita.
- TypeScript y lint de archivos de fase 6 correctos; build Next webpack/PWA correcto. Avisos preexistentes de framework/caché/Browserslist sin fallo funcional.
- Matriz real local sync-api-local.mjs incluye Auth/RLS previo, 425 filas por API, cuatro páginas, reloj cliente futuro ignorado, escritura posterior recuperada, frontera denegada anon/inactivo y transacción PostgreSQL lenta que la frontera espera. Limpieza de filas/cuentas sintéticas comprobada. Reproducción en staging-local.md.
- MCP solo lectura confirmó timestamps y triggers del catálogo cloud; Docker/CLI ejecutó SQL y API locales. Se aplicó el borrador al stack sintético y se validaron después los ajustes finales de función/backfill/NOT NULL en ese mismo stack. No se aplicó SQL ni se modificaron datos/configuración de producción.
- Límites: las transacciones Dexie de la suite usan mocks con rollback; quedan pendientes browser/PWA real, dos pestañas y upgrade de IndexedDB instalada (v3→v4), también pendientes desde fase 5. No certificar esos criterios ni despliegue por pasar pruebas API/unitarias.

### Despliegue y reversión de fase 6

Aplicar primero migraciones 1–5 y luego 20261117000200_sync_boundaries.sql, verificando triggers finales, NOT NULL, permisos RPC y pruebas de staging antes de publicar cliente. Inspeccionar cantidad de nulos y duración de transacciones antes del cambio. La frontera consulta máximos de seis tablas y coordina escritores: comprobar latencia bajo carga real antes de despliegue. No volver a usar timestamps del dispositivo ni cursor global. Para revertir, pausar sync conservando IndexedDB, pending/failed y versiones; restaurar un cliente compatible con v4. No resetear Dexie ni retirar la barrera con el cliente incremental activo. El esquema no incorpora rollback destructivo automático.

Por instrucción del usuario, detener después del commit local de fase 6. Fase 7 no iniciada.

Verificación adicional final: user-consistency-local.mjs correcto tras los nuevos triggers; aprovisionamiento/rollback Auth, guard/espejo de email y confirmación doble siguen pasando, con cleanup. Build definitivo y lint de hook/monitor correctos tras estabilizar contexto y estado de carga.

## Fase 7 — integridad y stock remoto implementados localmente

La instrucción actual autoriza continuar hasta fase 7 y guardar commits locales. Al iniciar, HEAD era 35e0f7e, árbol limpio y fases 5/6 ya implementadas/commitadas; no se duplicaron. Se usaron subagentes Luna para validaciones/repositorios y matriz API, con diseño, integración y revisión del agente principal.

- Contrato conservado: cantidades enteras positivas hasta 2.147.483.647 en todas las medidas, coherente con UI y columnas integer existentes. No se introducen fracciones, conversiones ni reinterpretación de PORCENTAJE. Stock mínimo entero no negativo; medicamentos nuevos del cliente comienzan en cero y las existencias entran mediante eventos. Cambiar de medida con saldo/historia se rechaza.
- Migración `20261117000300_stock_integrity.sql`: referencias compuestas `(business_id,id)` para programa de paciente, paciente/perfil de atención, medicamento/atención de movimiento. CHECK de cantidades/tipo/saldos. Toda inconsistencia provoca rollback del cambio, sin reparar o eliminar datos a ciegas.
- Autoridad única del cliente: se retiran grants INSERT/UPDATE de stock_actual y PUSH omite ese campo. AFTER INSERT de movimiento bloquea el medicamento con NO KEY UPDATE y aplica delta, valida medida/saldo/overflow e inserta efecto privado en la misma transacción. UPDATE idéntico por UUID permite replay sin efecto; modificar un evento confirmado se rechaza. Se conserva RLS y no se concede DELETE.
- Apertura: captura protegida por locks de escritores, sin recalcular historial previo. `private.stock_opening_balances` conserva los saldos preexistentes; `private.stock_applied_events` registra deltas nuevos. Medicamentos nuevos creados por cliente tienen apertura cero. Se probó historia previa de 99 con apertura 12: permanece 12, nuevo egreso 2 deja 10, reconstruible desde apertura y efecto nuevo.
- Reconciliación: snapshot MVCC único devuelve saldos e IDs pendientes ya aplicados. El cliente conserva metadata local y suma únicamente eventos pending aún no aplicados; failed sigue visible/reintentable y usa saldo confirmado. Respuestas de sesión anterior o con edición concurrente no se aplican. PUSH comprueba RPC antes de cualquier escritura si falta el esquema. Sin cambios de versión Dexie ni cursores.
- Validación local adicional en transacciones Dexie: paciente/perfil/medicamento/atención pertenecen al mismo tenant; cantidad/tipo/overflow; whitelist al actualizar atención e inventario. No se cambia autoridad de roles ni administración Auth.

### Evidencia actual

- MCP solo lectura reconsultó columnas integer, FK simples y triggers de timestamp actuales. Auditoría agregada: cero stock inválido, cantidades/tipo inválidos, cinco clases de referencias entre tenants y medida de movimiento distinta del medicamento. Estos agregados no prueban que el saldo histórico coincida con toda la historia y no autorizan recalcularlo. Sin datos clínicos ni claves en salida; sin escrituras cloud.
- Migración final aplicada correctamente en base sintética temporal de Docker mediante `run-stock-migration-local.ps1`, con apertura/historia/reconstrucción y grants comprobados; base retirada al finalizar. La variante aplicada al stack Auth real difiere solo en la incorporación final del lock explícito al inicio, que sí ejecutó el runner de migración final.
- Matriz `stock-api-local.mjs` con Auth/PostgREST reales: alta de medicamento a cero, stock absoluto rechazado, cinco referencias cruzadas rechazadas, filas ajenas invisibles/saldo intacto, cero/negativo/fracción/nulos rechazados, replay sin duplicar, evento inmutable, medida protegida, dos egresos concurrentes de 7 sobre saldo 10 (uno acepta, otro revierte; saldo 3), entradas concurrentes sumadas, rollback de lote sin eventos ni saldo parcial, snapshot aislado y anon/inactivo denegados. Dos ejecuciones correctas (segunda con controles ampliados), limpieza de cuentas y tenants sintéticos correcta.
- Matrices `user-consistency-local.mjs` y `sync-api-local.mjs` repetidas correctamente tras fase 7; incluyen Auth/RLS/SDK previo, confirmación de email, 425 filas paginadas y frontera que espera escritor lento. Cleanup correcto.
- TypeScript correcto; Vitest 133/133, siete suites. Lint de todos los archivos TypeScript modificados correcto. Build webpack/PWA correcto, 11 páginas; avisos de middleware/Browserslist/caché y diferencias de mayúsculas de rutas Windows, sin fallo de build. No se instalaron dependencias.

### Límites, despliegue y reversión

Implementación local terminada; no se desplegó ni se modificó producción. Pendiente smoke de aplicación mediante UI/PWA offline, dos pestañas y dispositivos reales, así como los upgrades Dexie instalados pendientes de fases 5/6. Concurrencia real se probó con dos peticiones API simultáneas, no con dos interfaces PWA. La atención y sus eventos siguen siendo filas sincronizadas por separado: un evento rechazado permanece failed; no se promete atomicidad remota de todo el formulario de atención.

Antes de publicar: auditar agregados otra vez, revisar tiempos/bloqueos y coordinar todos los clientes. Pausar escritores antiguos; resolver o aislar con evidencia sus colas legacy. Un evento pendiente anterior al corte puede estar ya reflejado en el saldo absoluto antiguo: no se puede decidir por fecha si aplicarlo; no enviarlo automáticamente sobre la apertura. Conservar pendiente/UUID hasta reconciliación dirigida. Sin corte comprobado no autorizar despliegue. Aplicar migraciones previas y después fase 7 antes del cliente nuevo; versiones antiguas que envíen saldo absoluto serán rechazadas.

Reversión antes de despliegue: revertir commit local. Después: pausar sync/escrituras afectadas, conservar IndexedDB, colas, apertura, efectos e IDs; corregir hacia delante con cliente compatible. No retirar trigger mientras existan clientes de eventos, reabrir stock absoluto ni recalcular/borrar historia. El test de lote confirma rollback transaccional de efecto/saldo, sin rollback operativo destructivo automático. No se avanzó a fases 8/9.

Stack Supabase local detenido correctamente al finalizar, conservando volúmenes y sin detener otros servicios. No se hizo push Git ni despliegue.

## Fase 8a — permisos de funciones

Continuación autorizada de fase 8 desde 1e07003, con Luna como apoyo. Se reconsultaron por MCP las seis funciones públicas legacy, sus definiciones, propietarios, ACL y dependencias: cuatro sin consumidores/dependencias de catálogo; moddatetime y update_actualizado_at_column sí tienen triggers. Producción permanece sin cambios.

- `20261117000400_function_permissions.sql` fija search_path vacío y revoca EXECUTE público/anon/authenticated/service_role a helpers sin RPC legítimo y funciones trigger. No los elimina ni activa handle_new_user. Los triggers siguen funcionando sin permiso de invocación directa.
- get_my_role conserva su tipo de retorno cualificado (enum real o tipo del fixture), solo authenticated puede invocarlo y devuelve únicamente rol del perfil propio activo/no eliminado. No se modifica el contrato de las funciones de fases 2/4/6/7.
- No hay llamadas del cliente a validate_password_strength ni envío de contraseña a ese RPC. Se mantienen las validaciones locales/Auth existentes. La [protección de contraseñas filtradas de Supabase](https://supabase.com/docs/guides/auth/password-security) requiere Pro o superior; no se contrató ni modificó configuración cloud.
- Matriz real local function-permissions-local.mjs y aserciones SQL correctas: ACL/search_path, helper activo, inactivo/eliminado sin rol, password RPC denegado a anon/authenticated y triggers ejecutados por authenticated pese a la revocación directa. Migración repetida correctamente en el stack sintético. Las funciones ausentes del fixture se crean solo como equivalentes sintéticos antes del test, sin reemplazar las ya existentes.
- Repetidas correctamente las matrices de consistencia Auth y stock después del recorte; limpieza sintética correcta. SQL de producción no aplicado. Reversión operativa: conservar permisos mínimos y corregir por función; no restaurar EXECUTE público indiscriminado ni conectar triggers históricos.

Los subpasos de sesión/caché, logger y HTTP/PWA se registran por separado al cerrar su validación.

## Fase 8b — logs por eventos y campos permitidos

- Logger con lista cerrada de eventos, áreas, operaciones y directivas CSP. Solo acepta contadores enteros no negativos y estado online booleano. No emite message/code/error, nombres, correos, IDs, tokens, URLs ni cuerpos recibidos, tampoco en desarrollo. Una validación runtime descarta eventos desconocidos y campos extra aunque un caller eluda TypeScript.
- Migrados consumidores de logs de Auth, red, sincronización, dispositivo, SW, repositorios y hooks clínicos. Los errores siguen propagándose a sus consumidores; se reduce únicamente su salida en consola. El simulador operativo y seed sin consumidor no se ejecutaron ni se retiraron.
- Tres pruebas de logger correctas con errores, DNI, correo, tokens y campos adicionales sintéticos; no se imprimen. Los informes CSP se observan en producción como conteos por directiva cerrada mediante warn, sin conservar URLs ni contenido del informe.

## Fase 8c — sesión, credenciales y caché por cuenta

- Caché `TopicoDatabase:account:<UUID>` independiente para cada cuenta. Auth valida identidad/perfil online antes de exponer contexto; offline utiliza exclusivamente el perfil previamente preparado de esa misma cuenta. Solo una identidad puede abrirse en cada documento. Logout/cambio de cuenta bloquea y cierra los handles, invalida sync y fuerza documento nuevo; respuestas antiguas no escriben en la siguiente cuenta. Back/BFCache y la señal entre pestañas también bloquean el documento anterior.
- Se conservan datos confirmados y pendientes al salir, por la política conservadora propuesta durante esta continuación. No hay reset, clear ni borrado de IndexedDB. La base global anterior queda intacta, sin copiar automáticamente filas o cursores de autoría desconocida. Un aviso muestra el número de pendientes legacy de la institución validada y solicita revisión: el corte de stock de fase 7 impide adoptar/reenviar eventos antiguos a ciegas.
- Migración legacy de credenciales comprueba getSession/setSession/getUser y coincidencia de identidad. Retira el residuo también cuando ya existe sesión válida. Error, identidad distinta, credencial corrupta o primera preparación offline conservan la credencial; no se promete migración exitosa. Solo el logout explícito elimina credenciales locales aunque no haya red. Logout offline no espera una llamada imposible; el cierre remoto no puede certificarse sin conectividad.
- El perfil se procesa fuera del callback síncrono de Auth; timers se cancelan al desmontar. Contextos de usuario/tenant y perfil reactivo se comprueban antes de habilitar sync. Fallos transitorios no provocan borrado de credenciales. NetworkProvider usa el estado externo de red sin actualización de estado durante el montaje del efecto.
- Cache Storage: se retiran solo respuestas privadas de buckets runtime conocidos y precache del scope raíz, conservando assets públicos y cachés ajenas. No se añaden contraseñas, PIN ni autoridad al deviceId. Las bases por cuenta aíslan el acceso normal de la aplicación; no se implementa cifrado ni protección frente a código arbitrario del mismo origen o herramientas del sistema.
- `scripts/privacy-browser-local.mjs`: 11 comprobaciones reales en Chrome, sin Supabase: A→cierre→B, regreso a A, dos pestañas aisladas, handles antiguos bloqueados, pending/synced conservados, legacy intacta/no adoptada, upgrade Dexie v1→v4 conservando pending, limpieza Cache Storage sin destruir assets/caché ajena. Perfil de Chrome sintético retenido en TEMP; procesos propios cerrados.
- Once pruebas de AuthProvider más siete de migración legacy y pruebas de limpieza comprueban activación, perfil propio offline, segunda cuenta sin perfil, red transitoria, cambio durante petición, logout, storage y BFCache. No se borran tablas al rechazar una sesión. La primera preparación de una instalación actualizada requiere conexión; los pendientes legacy siguen conservados para recuperación dirigida autorizada.

Reversión: conservar bases por cuenta y global legacy, cerrar sync y usar cliente compatible. No volver al cliente que reutiliza la base global entre cuentas ni resetear IndexedDB para volver atrás. Logout bloquea el acceso de la app y conserva trabajo; la sesión offline exige una sesión SDK disponible y perfil propio ya preparado, no acceso indefinido sin autenticación.

## Fase 8d — guardia HTTP, cabeceras y PWA

- Middleware protege únicamente `/dashboard` y descendientes mediante getUser, sin sustituir RLS. Rechazos/configuración inválida redirigen a login local. Conserva todas las escrituras de cookies, incluso varios setAll y la posterior redirección. Dashboard/login/Auth/API llevan no-store; páginas públicas no exigen sesión.
- Cabeceras nosniff, no-referrer y SAMEORIGIN. CSP únicamente Report-Only, sin nonce reutilizado ni cambio a render dinámico general; compatible con inline de Next/estilos y PDF blob. Eval solo se admite en la política de desarrollo. No hay enforcement, HSTS/preload ni activación por fecha. La adopción futura de CSP estricta/nonces requiere nueva revisión de SSR, caché y PDF.
- Receptor `/api/csp-report`: máximo 16 KiB reales del stream, 20 reportes por petición, content-type/envelope validado, 204 sin eco. No registra URL, muestra de script, referrer ni cuerpo; solo evento y conteos por directiva cerrada. Se prueba con información sintética sensible y cuerpos inválidos/excesivos.
- Workbox reemplaza sus reglas predeterminadas: solo assets públicos locales específicos, sin query; todo lo demás NetworkOnly. Precache excluye HTML/RSC; únicamente `/offline` es el shell fijo sin datos de sesión. No se cachean login, dashboard autenticado, Auth ni API. Los callbacks son autocontenidos porque Workbox los serializa. El shell recupera la ruta clínica conocida y usa el guard/contexto de la cuenta antes de renderizar datos de Dexie. Netlify aplica caché inmutable solo a assets con hash de `_next/static`, evitando que `/*.js` vuelva inmutable `sw.js`.

### Verificación actual de fase 8

- TypeScript correcto; suite final 167/167, 15 archivos. Lint de módulos nuevos/seguridad correcto; tres warnings previos de dependencias useMemo en hooks clínicos, sin errores en los archivos modificados. No se declara lint global limpio: otros componentes fuera de fase conservan deuda histórica.
- Build webpack/PWA correcto, incluyendo shell offline y receptor CSP dinámico. Se ejecutó build con variables exclusivamente locales para las pruebas PWA, sin tocar `.env.local`; al finalizar se regenera el build con la configuración habitual. Sin instalaciones ni cambios de dependencias. Avisos de middleware/Edge Runtime/Browserslist/caché no impidieron build.
- `pwa-session-local.mjs` ejecutó Chrome real y aplicación de producción contra Supabase local: guardia HTTP 307/no-store, cabeceras Report-Only y recepción real CSP 204; login A, PULL de paciente sintético, lectura UI y recarga completamente offline por SW; logout offline inmediato sin borrar pending; login B sin datos ni pending de A; regreso a A conserva su fila. Inspección de todas las claves de Cache Storage: ningún HTML privado, RSC, Auth/API ni URL cross-origin. Dominios cloud bloqueados en el navegador y SDK/server configurados con loopback exclusivamente.
- Todos los usuarios/instituciones/pacientes del último recorrido fueron retirados y se comprobó ausencia de instituciones sintéticas. Se corrigió una carrera inicial de limpieza deteniendo y esperando Chrome/Next antes de eliminar fixtures. Dos restos de intentos previos se retiraron mediante SQL local dirigido, comprobando que no tenían perfiles ni pacientes ajenos al test. No quedaron esos restos sintéticos.
- Matrices locales de funciones, Auth/consistencia y stock correctas, con cleanup; triggers probados bajo authenticated. Once comprobaciones reales de IndexedDB/Cache Storage adicionales y pruebas de Auth de señales entre pestañas/BFCache. La PWA de extremo a extremo se probó con un navegador/cuenta activa a la vez; las dos pestañas del harness prueban bases aisladas, no un despliegue multiventana completo con SDK.

### Despliegue, límites y cierre

Producción no modificada: MCP fue solo lectura. Commits separados: 8a funciones (`2ae0361`), 8b logger (`d7a269c`), 8c sesión/caché (`20f9149`) y 8d HTTP/PWA (consultar git log). No hay push ni publicación automática. Fase 9 no iniciada.

Antes de desplegar: respetar el corte de colas/stock de fase 7, revisar catálogo/grants actuales, respaldos, aplicar migraciones previas y fase 8a coordinadas con cliente. Primera preparación por cuenta online. Conservar la base global anterior y asignar pendientes legacy solo mediante revisión dirigida autorizada, nunca por inferencia de fecha ni como parte del login. Verificar Netlify efectivo, actualización sobre SW previamente instalado, dos pestañas con SDK, expiración real prolongada, redirecciones/email/PDF y navegadores/dispositivos de producción. Los tests locales no certifican esos entornos ni configuración Auth cloud; la protección de contraseñas filtradas sigue limitada por el plan gratuito.

Revertir cabeceras/política de observación por separado si hay incompatibilidad, sin borrar Cache Storage indiscriminadamente ni IndexedDB. Mantener separación por cuenta y colas al revertir cliente; no restaurar permisos públicos de funciones ni políticas RLS abiertas. La nueva CSP no se aplica como bloqueo: cualquier endurecimiento futuro requiere observación y aceptación independientes.

Comprobación final: matriz sync-api-local repetida correctamente tras fase 8 (Auth/cookies, RLS, 425 filas y frontera concurrente), cero instituciones residuales del smoke PWA y stack Supabase local detenido conservando volúmenes. Build habitual restaurado, runners propios cerrados y fuentes sin dependencias nuevas. No se hizo push Git ni despliegue.

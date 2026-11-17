# Plan de refactorización validado — TópicoWeb

Fecha: 16/11/2026. Base: auditoría local previa y verificación MCP de metadatos remotos. Evidencia y límites: [auditoria-tecnica.md](auditoria-tecnica.md). Los IDs S/P/L remiten a ese documento.

## Contrato de ejecución para el siguiente agente

Este documento no autoriza implementar. Obtener autorización explícita para la fase correspondiente. Ejecutar una fase por vez, con cambio pequeño y revisable. No convertir ejemplos del plan histórico en SQL de producción.

La aplicación funciona: conservar sus flujos normales. No reescribir, sustituir persistencia ni añadir frameworks. No instalar paquetes para auditar. Antes de implementar, comprobar HEAD, estado de trabajo y metadatos remotos otra vez: la evidencia es una fotografía, no una garantía perpetua. No sobrescribir cambios del usuario.

Preparar staging con datos y cuentas sintéticos. No copiar datos clínicos ni credenciales. No ejecutar simuladores con escritura o limpieza contra producción. Para pruebas autorizadas, identificar y aislar los clientes remotos antes de ejecutar suites.

Seguridad no se comprueba solo por HTTP 200 o ausencia de errores: verificar filas afectadas en staging, denegaciones y que ninguna operación cruzada cambie datos. Una lectura filtrada por RLS puede devolver cero filas sin error.

## Decisiones sobre el plan GLM R1–R19

| Propuesta | Decisión final |
|---|---|
| R1 | Corrección local conservada. No reintroducir fallback ni tres días de observación con permisos abiertos. Comprobar versión desplegada. |
| R2 | Prioridad CRÍTICA confirmada: RLS activo pero expresiones incorrectas. Reemplazar políticas/grants inseguros, no limitarse a añadir políticas permisivas. |
| R3 | Guardia de servidor limitada a dashboard y descendientes, conservando renovación de cookies. No usarla como sustituto de RLS. |
| R4 | Filtrar institución propia; seed sin llamadas puede retirarse al final. |
| R5 | Descartar sobrescribir business_id de todos los pending: filtrar/validar, preservar registros ajenos sin enviarlos ni reasignarlos. |
| R6 | IDOR de acción corregido localmente; mantener pruebas. No confundirlo con la escalada directa S02 que sigue abierta. |
| R7 | server-only aceptado para futura implementación con dependencia declarada y prueba de build. Sin fuga de clave demostrada. |
| R8 | Política compartida existente conservada. Completar esquema de entradas y contrastar Auth; no imponer requisitos nuevos indiscriminados. |
| R9 | Eliminación del tenant del payload conservada; no protege las actualizaciones REST directas de perfiles. |
| R10 | Logs por lista de campos/eventos permitidos. message/code puede contener datos sensibles; no es sanitización suficiente. |
| R11 | Cabeceras graduales, CSP observable antes de enforcement. Corregir ejemplo incompleto, nonces/caché e instrumentación de reportes. No activar por calendario ni HSTS preload automático. |
| R12 | Retirar credenciales residuales con comprobación del resultado, incluyendo usuarios que ya tienen sesión. No borrar antes de migración válida. |
| R13 | Mantener deviceId como identificador local sin autoridad. Descartar cookie HttpOnly como mejora necesaria. |
| R14 | Mapa cerrado de tablas y capacidades por columna; evitar Record<string,...> que sigue aceptando nombres arbitrarios. |
| R15 | Migrar console activos después del diseño del logger; código muerto se retira aparte. |
| R16 | Escritura cruzada de instituciones NO está autorizada por las políticas actuales. No añadir INSERT/UPDATE sin funcionalidad legítima; preferir excluir del PUSH si solo se lee. |
| R17 | Reabrir recuperación de fallos Auth/perfiles y confirmación de email propio. Función de alta existe pero no está conectada. |
| R18 | Reabrir: enum no se valida al editar. SQL enum limita valores, no autoriza al actor; proteger rol/tenant/activo en base de datos. |
| R19 | Retención/aislamiento de caché es relevante en equipos compartidos. Descartar limpieza incondicional, pérdida de pending y PIN como barrera suficiente. |

Quedan descartados: rollback que deshabilita RLS; cambios de índice masivos por unused_index; helper de tenant que ignore activo/deleted_at; activar handle_new_user sin rediseño; RPC transaccional genérica sin contrato de stock; snapshots de filas pg_policies presentados como migración ejecutable.

## Orden de trabajo

0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9. Las fases 1 y 2 deben desplegarse coordinadas para no dejar una política de tenant basada en un perfil que el propio usuario pueda modificar. La actualización de framework (fase 3) puede prepararse independientemente después de la línea base.

### Fase 0 — Línea base reproducible y preparación

1. **Prioridad/objetivo:** ALTO; preservar comportamiento y obtener evidencia de despliegue y configuración pendiente.
2. **Problema/evidencia:** auditoría S01–S10, resultados históricos de pruebas y falta de configuración Auth/API completa.
3. **Archivos/componentes:** configuración de pruebas, documentación, entorno de staging; metadatos Supabase.
4. **Cambios:** preparar matriz de permisos y funcionalidades; exportar DDL de políticas, grants, funciones y restricciones sin datos; identificar versión desplegada y configuración Auth/API mediante canal de lectura autorizado. No tocar producción.
5. **Dependencias:** entorno Node funcional, staging y autorización de implementación; no crear recursos con coste sin autorización correspondiente.
6. **Riesgos:** ejecutar simuladores que importan clientes reales o asumir que el schema histórico es vigente.
7. **Pruebas:** TypeScript, suites unitarias aisladas y build en entorno de validación; smoke de todas las funcionalidades de la matriz final.
8. **Aceptación:** resultados actuales reproducibles, destinos remotos identificados, baseline seguro de permisos y contrato admin/personal explícito.
9. **Reversión:** no requiere cambios operativos. Conservar evidencia separada de migraciones aplicables.

### Fase 1 — Bloquear escalada por perfil propio

1. **Prioridad/objetivo:** CRÍTICO; impedir modificar rol, tenant y estado por autoservicio directo.
2. **Problema/evidencia:** S02, S04, L07–L09; grants UPDATE de tabla y políticas por id sin columnas.
3. **Archivos/componentes:** futuras migraciones de perfiles/grants; users.ts, validation.ts y users.test.ts; AuthProvider solo si requiere compatibilidad.
4. **Cambios:** consolidar UPDATE; escoger la solución mínima: restringir columnas o cerrar escritura directa y conservar acciones existentes. Eliminar grants amplios que anulen restricciones de columna. Validar actor activo/no eliminado y entradas por operación; tenant/rol/activo solo por administración verificada. Comprobar defaults de menor privilegio y nulabilidad sin cambios a ciegas.
5. **Dependencias:** fase 0; coordinación con fase 2. No confiar en user_metadata para privilegios.
6. **Riesgos:** bloquear edición propia legítima, reactivación administrativa o último administrador. Definir esas reglas explícitamente.
7. **Pruebas:** modificar directamente rol/tenant/activo/id como personal, inactivo y admin; acciones self/admin; comprobar ausencia de escrituras ante rechazo.
8. **Aceptación:** usuario no puede elevarse, trasladarse ni reactivarse; administración autorizada y edición propia permitida funcionan.
9. **Reversión:** restaurar permisos mínimos ensayados, sin reabrir UPDATE irrestricto. Si falla, pausar edición de usuarios y conservar lectura/operación clínica segura.

### Fase 2 — Aislamiento por tenant y permisos mínimos

1. **Prioridad/objetivo:** CRÍTICO; cerrar lectura/escritura/borrado cruzados.
2. **Problema/evidencia:** S01, S03–S04 y política DELETE imposible de perfiles.
3. **Archivos/componentes:** migraciones de políticas/grants de siete tablas; syncService.ts para contrato de instituciones.
4. **Cambios:** reemplazar políticas abiertas en una transición transaccional revisada; contexto de tenant deriva del perfil servidor protegido en fase 1. Comprobar activo/deleted_at. SELECT/INSERT/UPDATE con USING/WITH CHECK y rol authenticated explícito; permisos según matriz. No permitir DELETE físico si no existe funcionalidad legítima. Perfil propio de bootstrap debe permitir detectar desactivación sin exponer otros tenants. Mantener instituciones de solo lectura si ese es el contrato; no añadir permisos por exigencia del PUSH.
5. **Dependencias:** fases 0–1, prueba de compatibilidad con cliente vigente. Si requiere helper definer, propietario controlado, nombres cualificados, search_path fijo y EXECUTE mínimo.
6. **Riesgos:** RLS recursivo, bootstrap bloqueado, upsert denegado o silenciosamente vacío. Políticas permisivas antiguas se combinan por OR: inventariar y reemplazar, no sumar.
7. **Pruebas:** dos tenants, anon/personal/admin/inactivo/eliminado; acceso por UUID, filtros manipulados, INSERT/UPDATE/upsert/DELETE; login y todos los flujos offline→online.
8. **Aceptación:** cero acceso cruzado, cero cambios privilegiados indebidos y flujo legítimo completo desde cliente actual.
9. **Reversión:** SQL seguro de restauración ensayado, manteniendo RLS. No restaurar políticas abiertas; pausar operación afectada si no hay alternativa segura. Eliminar cachés ajenos según fase 8 sin perder pending.

### Fase 3 — Actualización de seguridad y frontera de servidor

1. **Prioridad/objetivo:** ALTO; cerrar avisos aplicables del framework y proteger importaciones administrativas.
2. **Problema/evidencia:** L01 y L15.
3. **Archivos/componentes:** package.json, pnpm-lock.yaml, admin.ts; configuración Next/PWA solo por compatibilidad demostrada.
4. **Cambios:** comprobar avisos oficiales actuales y elegir versión mantenida que los corrija; alinear paquetes asociados. Añadir server-only correctamente declarado. No actualizar todas las dependencias por conveniencia.
5. **Dependencias:** fase 0; independiente de cambios SQL tras línea base.
6. **Riesgos:** middleware/proxy, Netlify, compilación y actualización del SW.
7. **Pruebas:** TypeScript, unitarias, build, acciones, login/renovación, PDF, PWA instalada/offline y despliegue de prueba.
8. **Aceptación:** versión desplegada comprobada, avisos aplicables corregidos y regresión completa aprobada.
9. **Reversión:** artefacto compatible previo identificado; no volver silenciosamente a versión vulnerable. Si fuera imprescindible, limitar exposición y registrar riesgo.

### Fase 4 — Usuarios, Auth y fallos parciales

1. **Prioridad/objetivo:** ALTO; eliminar falsos éxitos y divergencias de identidad.
2. **Problema/evidencia:** L06–L09, S07: no hay trigger Auth de alta/email; handle_new_user no debe activarse tal cual.
3. **Archivos/componentes:** users.ts, useUsuarios.ts, UserModal.tsx, dashboard/users/page.tsx, validation.ts, users.test.ts.
4. **Cambios:** devolver/aplicar estado confirmado remoto; propagar rechazos y restaurar caché si hubo actualización optimista. Definir edición de usuarios online, coherente con exclusión de perfiles del PUSH; no suprimir una edición offline usada sin decisión explícita. Separar email propio con confirmación de cambio administrativo. Recuperación idempotente ante creación Auth sin perfil y email actualizado sin espejo; no borrar cuentas automáticamente. Evaluar confirmar fila afectada, no solo ausencia de error.
5. **Dependencias:** fases 0–2 y configuración Auth conocida.
6. **Riesgos:** cambio de email pendiente, cuenta incompleta, recuperación que sobreescriba edición concurrente.
7. **Pruebas:** fallos inyectados entre pasos Auth/DB, duplicados, reintento y reconciliación; errores de UI no producen toast de éxito.
8. **Aceptación:** resultado mostrado coincide con persistencia; todo fallo parcial tiene recuperación probada; crear/editar/desactivar siguen funcionando.
9. **Reversión:** cliente/acciones compatibles y procedimiento de reparación dirigido; no reactivar trigger histórico ni eliminar cuentas para volver atrás.

### Fase 5 — Segregación de sincronización y contratos de tablas

1. **Prioridad/objetivo:** ALTO; enviar exclusivamente trabajo de la sesión/institución correcta.
2. **Problema/evidencia:** L04, L14; movimientos tiene actualizado_at; instituciones no admite escrituras y su trigger es incompatible.
3. **Archivos/componentes:** syncService.ts, useBidirectionalSync.ts, AuthProvider.tsx, SyncMonitor.tsx, db.ts y tipos locales.
4. **Cambios:** contexto explícito y validado de sincronización; filtrar pending también después de reconciliación; cancelar tareas/timers al cambiar sesión y descartar respuestas obsoletas. Filtrar institución propia. Excluir instituciones del PUSH si no hay caso legítimo; corregir trigger incompatible en cambio SQL separado, sin inventar actualizado_at por uniformidad. Mapa cerrado con capacidades por columna; metadata por dispositivo/tenant con migración Dexie conservadora.
5. **Dependencias:** fases 1–2; no cambiar cursores a la vez que se decide la estrategia de datos pendientes.
6. **Riesgos:** reasignación de registros de otra cuenta, migración local destructiva, respuestas tardías en nueva sesión.
7. **Pruebas:** A→logout→B, regreso a A, dos pestañas, cambio durante petición, pendientes mixtos y actualización de base Dexie instalada.
8. **Aceptación:** ningún registro ajeno se envía o cambia de tenant; pendientes previos preservados; instituciones sigue visible correctamente.
9. **Reversión:** detener sync conservando tablas/colas; revertir solo a cliente compatible con versión local. Nunca resetear IndexedDB como rollback.

### Fase 6 — Fiabilidad del PULL, PUSH y recuperación

1. **Prioridad/objetivo:** ALTO; ningún cambio confirmado o pendiente desaparece silenciosamente.
2. **Problema/evidencia:** L02–L05, L13, P06.
3. **Archivos/componentes:** syncService.ts, retry.ts, SyncMonitor.tsx, metadatos Dexie y pruebas de sync.
4. **Cambios:** subpasos independientes: proteger pending ante PULL; paginar con orden estable; cursor por tabla tras todas las páginas y persistencia local correcta; límites temporales/versión de servidor; ACK de la versión enviada; reconciliación DNI en transacción; tratar errores retornados y reintentar solo fallos transitorios; mostrar failed y errores del tenant actual. No integrar resolveConflict sin consumidor ni garantías. Una vez fiables los cursores, habilitar incremental de movimientos por actualizado_at conservando ausencia de creado_at.
5. **Dependencias:** fase 5 y contrato real de timestamps.
6. **Riesgos:** omisiones en frontera temporal, IDs reemplazados, duplicados y conflictos antes ocultos.
7. **Pruebas:** más de una página, empate de timestamps, reloj desfasado, fallo en tabla/página, edición durante envío, desconexión, reinicio en reconciliación y reintento idempotente.
8. **Aceptación:** conjunto completo, cursor sin saltos, pendientes conservados, ACK obsoleto no oculta cambios y failed recuperable/visible.
9. **Reversión:** pausar sync, preservar datos/versiones y restaurar estrategia compatible. No PULL completo indiscriminado sobre pendientes.

### Fase 7 — Integridad referencial y stock remoto

1. **Prioridad/objetivo:** ALTO; relaciones del mismo tenant y cantidades coherentes sin pérdida concurrente.
2. **Problema/evidencia:** S05, S10; FK simples, sin checks de stock/cantidad, sin triggers remotos de stock.
3. **Archivos/componentes:** futuras restricciones de BD; repositorios de atenciones/movimientos, stock/validation.ts, stock/operations.ts, tipos y syncService.ts.
4. **Cambios:** primero decidir contrato de cantidades por medida y auditar inconsistencias existentes con salidas agregadas autorizadas. Incorporar protección de tenant en referencias. Definir una única autoridad para saldo/movimientos; si pruebas confirman pérdida concurrente, implementar la operación transaccional/idempotente mínima. No añadir trigger de stock manteniendo a la vez actualización absoluta cliente. Cambiar integer a decimal solo si producto lo requiere y con compatibilidad.
5. **Dependencias:** fases 0–2 y 5–6; decisión de producto para fracciones y operaciones históricas.
6. **Riesgos:** validación bloqueada por datos previos, doble descuento, redondeo o rechazo de pendientes antiguos.
7. **Pruebas:** relaciones cruzadas, cantidad cero/negativa/fraccionaria, dos dispositivos, mismo movimiento repetido, fallo entre saldo y movimiento y atención sin dispensaciones.
8. **Aceptación:** ninguna FK entre tenants, saldo reproducible y un solo efecto por operación; historial y stock local/remoto reconciliables.
9. **Reversión:** clientes compatibles y reglas seguras anteriores, preservando movimientos y claves idempotentes; no recalcular ni borrar historia sin procedimiento aprobado.

### Fase 8 — Sesión, privacidad, funciones y cabeceras

1. **Prioridad/objetivo:** ALTO para aislamiento compartido; MEDIO para endurecimiento.
2. **Problema/evidencia:** S06–S08, L07, L10–L12.
3. **Archivos/componentes:** AuthProvider.tsx, middleware.ts, logger.ts, next.config.ts, netlify.toml, funciones/permisos de BD y configuración Auth.
4. **Cambios:** commits separados: restringir EXECUTE y search_path según uso legítimo; retirar funciones inactivas solo tras dependencias; no enviar contraseñas a RPC de validación. Evaluar protección de contraseñas filtradas según disponibilidad. Guardia explícita dashboard preservando cookies. Migración legacy con resultado validado. Aislamiento/retención por cuenta, revisión Cache Storage y exclusiones de Auth/API sin destruir pending. Logs por campos permitidos. Cabeceras básicas y CSP report-only con recepción segura de reportes antes de aplicar; nonces compatibles con caché y PDF. No HSTS preload automático.
5. **Dependencias:** fases 0–2,4–6 y decisión de dispositivos compartidos; configuración Auth no inferida del SQL.
6. **Riesgos:** pérdida de trabajo al salir, bloqueo offline/hidratación/PDF, exposición mediante reportes CSP o permisos recortados incorrectamente.
7. **Pruebas:** acceso RPC permitido/denegado, logout con pendientes, Back, segunda cuenta offline, Cache Storage, renovación de cookies y arranque PWA; logs con datos sintéticos sensibles.
8. **Aceptación:** aislamiento entre sesiones, pendientes recuperables, errores sin datos personales y funciones existentes completas bajo cabeceras efectivas.
9. **Reversión:** revertir cada medida por separado; conservar datos y contemplar persistencia de HSTS/SW. Restaurar solo permisos mínimos necesarios.

### Fase 9 — Rendimiento medido y limpieza opcional

1. **Prioridad/objetivo:** MEDIO/BAJO; simplificar solo con beneficio comprobado.
2. **Problema/evidencia:** P01–P05, L15 y triggers duplicados en perfiles.
3. **Archivos/componentes:** índices/políticas/triggers, syncService.ts, useSimpleSync.ts, seedData.ts y documentación obsoleta.
4. **Cambios:** evaluar initplans después de corregir permisos; medir índices business_id/actualizado_at con volumen representativo. Retirar candidatos redundantes sin eliminar índices únicos. No borrar los 20 unused en bloque. Consolidar triggers de timestamp tras revisar dependencias. Retirar código sin consumidores y comentarios falsos; conservar arquitectura funcional.
5. **Dependencias:** fases 1–2,5–7; workload y objetivos de tiempo/consumo acordados.
6. **Riesgos:** regresión en escrituras, mantenimiento de FK o consultas poco frecuentes. Las tablas pequeñas no justifican optimización especulativa.
7. **Pruebas:** planes y tiempos bajo authenticated con RLS; descarga incremental y carga sintética; comparar latencia/consumo antes/después. Sin EXPLAIN ANALYZE en producción sin autorización específica.
8. **Aceptación:** mejora medida sin regresión ni pérdida de restricciones; eliminación solo con consumidores y dependencias comprobados.
9. **Reversión:** recrear definición exacta del índice no único o trigger retirado, con estrategia de bloqueos ensayada; revertir limpieza por commit.

## Matriz transversal de aceptación

- Acceso: anon, personal, admin, inactivo/eliminado, dos tenants, UUID conocido, rol/tenant manipulados y upsert de fila existente.
- Sesión: login, expiración/renovación, logout, dos pestañas, cambio de cuenta durante petición y dispositivo compartido.
- Datos: pacientes/programas, DNI duplicado, desactivación, atenciones con/sin dispensación, stock por medida, entradas/salidas y vencimientos.
- Sincronización: offline→online, manual, segundo dispositivo, múltiples páginas, fallo de red/tabla, failed, reinicio y concurrencia.
- Reportes: PDF, previsualización, filtros, mes/año, enero y gracia de días 1–3; probar con zona America/Lima.
- Compatibilidad: cliente instalado antes del cambio, migración Dexie, SW previo/nuevo, Netlify y assets.

Cada entrega registra: diff pequeño, evidencia de pruebas actuales, límites, versión de cliente/esquema, aceptación y rollback probado. Los tests mockeados de usuarios y validaciones de stock no certifican RLS, concurrencia ni despliegue. No marcar una fase terminada por falta de tiempo o por pasar solo unitarias. Las comprobaciones pendientes de auditoria-tecnica.md permanecen pendientes hasta obtener evidencia.

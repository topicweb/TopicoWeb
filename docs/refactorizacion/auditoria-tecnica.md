# Auditoría técnica independiente — TópicoWeb

Fecha: 16/11/2026. Base local: `d58d869`. Plan contrastado: `doc/PLAN_CORRECTIVO_SEGURIDAD.md`, leído íntegramente en la revisión anterior. Continuación: auditoría remota de seguridad, RLS y rendimiento mediante MCP. Este documento conserva los hallazgos locales anteriores y actualiza únicamente los que la evidencia remota permite resolver.

## Alcance y garantías

- MCP comprobado mediante listado de proyectos, consultas de catálogo y advisors. Proyecto TopicoWeb; coincidencia con la URL configurada localmente comprobada sin imprimirla ni revelar credenciales.
- Consultas de solo lectura sobre políticas, columnas, restricciones, funciones, triggers, grants, roles, índices y estadísticas agregadas. Logs limitados a conteos por fuente durante la ventana predeterminada de 24 horas.
- No se consultaron filas de pacientes, perfiles ni usuarios Auth. No se leyeron contraseñas, tokens ni secretos. No se ejecutaron funciones de aplicación ni pruebas de explotación.
- No se ejecutaron DDL, migraciones, escrituras remotas, ANALYZE ni EXPLAIN ANALYZE. Se obtuvo un EXPLAIN sin ejecución con UUID sintético.
- Hubo errores intermitentes de transporte; seguridad, estado RLS y EXPLAIN se obtuvieron en reintentos. La búsqueda documental MCP falló; no se usa como evidencia.
- No se ejecutaron tests ni build. El intento anterior de TypeScript falló porque `node` no estaba en PATH. Los resultados históricos del plan no constituyen validación actual.
- No se modificó código. Solo se crean los dos documentos solicitados en esta carpeta.

## Arquitectura y funcionalidades que deben conservarse

Next.js 16.1.6 App Router, React 19.2.3, TypeScript estricto, Supabase JS 2.93.3/SSR 0.12.4, Dexie 4.2.1, PWA, Netlify y PDF con jsPDF. Versiones contrastadas con package.json, lockfile y paquete local de Next.

UI → hooks/repositorios → Dexie → pendientes → SyncService → Supabase. El PULL alimenta consultas reactivas locales. Auth utiliza cookies y validación servidor mediante getUser; el perfil local alimenta rol e institución para UX. La administración utiliza Server Actions con service role, que omite RLS. Las transacciones clínicas locales agrupan atención, movimientos y saldo de medicamento; esto no equivale a atomicidad remota.

Conservar: pacientes y programas, atenciones con/sin dispensaciones, inventario por unidades/volumen/peso, vencimientos, movimientos, gestión de usuarios, login/renovación/logout, PWA instalada, trabajo offline/reconexión, filtros y PDF mensual con gracia de tres días. No se justifica una reescritura ni sustituir Dexie o Supabase.

## Hallazgos remotos confirmados

Las conclusiones siguientes derivan de catálogos y definiciones, no de acceder a registros ajenos ni efectuar escrituras.

| ID | Severidad | Evidencia y consecuencia |
|---|---|---|
| S01 | CRÍTICO | RLS está habilitado en las siete tablas públicas. En atenciones, medicamentos, movimientos_stock, pacientes y programas_estudio la única política es PERMISSIVE FOR ALL, rol PUBLIC, con condición `auth.uid() IS NOT NULL AND business_id IS NOT NULL` (auth.uid mediante subconsulta). No compara el tenant del actor. Grants SELECT/INSERT/UPDATE/DELETE a authenticated: la configuración autoriza lectura y operaciones cruzadas con business_id no nulo, incluido borrado físico sujeto a FK. No se exige perfil activo ni rol. |
| S02 | CRÍTICO | Perfiles tiene dos políticas UPDATE propias: `auth.uid() = id`, sin restricción de columnas. authenticated tiene UPDATE de tabla. Los triggers solo actualizan timestamps. El usuario puede modificar su propio rol, business_id y activo conservando id. La comprobación administrativa posterior lee esos campos y permite una cadena de escalada. No se ejecutó esa cadena. |
| S03 | ALTO | `Perfiles lectura`: SELECT si auth.uid no es nulo, sin tenant. `Lectura instituciones`: SELECT para authenticated USING true. La configuración permite leer perfiles e instituciones ajenos; la descarga local de instituciones sin filtro amplía la retención. |
| S04 | ALTO | Grants de las siete tablas a anon y authenticated incluyen SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER y TRUNCATE. RLS filtra operaciones de fila, pero no TRUNCATE. No se encontró RPC que exponga TRUNCATE: no afirmar borrado anónimo por REST. Reducir privilegios innecesarios según canal de acceso. |
| S05 | ALTO | FK de pacientes→programas, atenciones→pacientes/perfiles y movimientos→medicamentos/atenciones comprueban solo UUID. No hay FK compuesta ni trigger de tenant para esas relaciones. Incluso después de corregir RLS, la integridad entre instituciones requiere protección adicional. |
| S06 | MEDIO | get_my_role es SECURITY DEFINER, propietario postgres, EXECUTE para PUBLIC/anon/authenticated y sin search_path fijado. moddatetime y update_actualizado_at_column tampoco fijan search_path, pero son invoker. anon/authenticated no tienen CREATE en public. Existe superficie innecesaria; no se demostró secuestro de objetos. |
| S07 | ALTO potencial; función inactiva | handle_new_user usa primera institución sin orden y acepta rol admin desde raw_user_meta_data. Existe como SECURITY DEFINER, pero NO hay trigger no interno de auth que la invoque. No afirmar escalada por signup activa. Conectarla sin rediseño sería inseguro. validate_user_business_id tampoco está conectada, solo comprueba no nulo y retorna false en ramas de una función trigger; no aporta aislamiento. |
| S08 | MEDIO | Advisor: protección de contraseñas filtradas deshabilitada. La configuración restante de Auth no está expuesta mediante las herramientas disponibles; signup público, confirmación, MFA, límites y expiraciones siguen pendientes. |
| S09 | ALTO | instituciones carece de actualizado_at, pero tiene trigger BEFORE UPDATE que asigna NEW.actualizado_at. El UPDATE presenta incompatibilidad estructural. Además no existe política INSERT/UPDATE para clientes: PUSH de instituciones no es un flujo autorizado actualmente. No añadir permisos solo para hacer funcionar una ruta sin consumidor legítimo. |
| S10 | ALTO | No hay triggers de stock en las tablas inspeccionadas. stock_actual y cantidad son integer; no existen CHECK de cantidad positiva ni saldo no negativo. La validación local admite positivos fraccionarios. El contrato decimal/unidades y la concurrencia remota requieren prueba antes de cambiar tipos. |

Detalles de permisos: anon/authenticated no son superusuarios, no tienen BYPASSRLS ni login SQL; service_role tiene BYPASSRLS; authenticator tiene login sin BYPASSRLS. FORCE RLS es false: esto no constituye por sí mismo un fallo. No hay vistas/materializadas públicas. No se inspeccionaron todas las membresías, esquemas de extensiones, buckets o funciones Edge; quedan fuera de la certificación.

La política DELETE de perfiles contiene `p2.id <> p2.id`, condición imposible. No habilita un borrado real por esa política. No debe corregirse para permitir hard delete: la funcionalidad vigente es desactivación mediante acción administrativa.

Los únicos ocho triggers no internos encontrados en public/auth actualizan timestamps. En perfiles hay dos BEFORE UPDATE equivalentes (moddatetime y update_actualizado_at_column). Ambos están habilitados. No hay trigger Auth de alta ni sincronización de email; la creación depende del upsert explícito de la Server Action. La existencia de funciones trigger no demuestra que se ejecuten. Los advisors reportan EXECUTE de cuatro SECURITY DEFINER para anon y authenticated; las funciones que retornan trigger no son RPC ordinarias utilizables fuera de contexto trigger. No equiparar el aviso a una explotación confirmada.

## Consistencia entre esquema y sincronización

- movimientos_stock SÍ tiene actualizado_at y trigger para actualizarlo; no tiene creado_at. `src/core/db/sync/syncService.ts:47-48,148,313` agrupa ambos timestamps como ausentes. Esto impide PULL incremental de movimientos y elimina actualizado_at al enviar. Corregir con capacidades por columna, después de resolver cursores y protección de pendientes.
- Atenciones, medicamentos, pacientes, perfiles y programas tienen creado_at y actualizado_at. El comentario de resolveConflict que afirma ausencia de actualizado_at es obsoleto; comparar creado_at no representa ediciones.
- Unicidad real: pacientes(business_id,dni), programas(business_id,nombre), perfiles(email), instituciones(ruc). perfiles.id referencia auth.users con ON DELETE CASCADE. No proponer duplicar estas restricciones.
- Perfiles.rol tiene default admin, admite NULL y usa enum. Esto no valida la intención del actor; los valores válidos también pueden constituir escalada. Cambiar a default de menor privilegio requiere comprobar altas legítimas.
- No hay trigger que conserve Auth/email al modificar perfiles directamente. Las escrituras directas permitidas agravan la divergencia identificada en el código.

## Rendimiento: mediciones y límites

| ID | Estado | Evidencia y decisión |
|---|---|---|
| P01 | Confirmado, MEDIO | Advisor auth_rls_initplan en Gestion propio perfil: auth.uid directo por fila. Consolidar políticas al corregir autorización; evaluar initplan después, sin conservar una política insegura por optimización. |
| P02 | Confirmado, MEDIO | Dos políticas UPDATE permisivas equivalentes en perfiles. Advisor presenta cinco hallazgos por roles; no son cinco tablas afectadas. Consolidar y probar permisos. |
| P03 | Confirmado, BAJO | Índices idx_pacientes_business_dni y pacientes_business_id_dni_key repiten claves; idx_perfiles_email y perfiles_email_key también. Candidatos a retirar los no únicos tras revisar definición, dependencias y planes. Preservar índices de restricciones. |
| P04 | Aviso, BAJO | Advisor enumera 20 índices sin uso observado. No demuestra inutilidad; la carga y volumen son pequeños. No eliminarlos en bloque. |
| P05 | Riesgo de crecimiento, MEDIO | Hay índices por business_id pero no compuestos business_id/actualizado_at en tablas auditadas. EXPLAIN sin ANALYZE de pacientes con tenant sintético usa idx_pacientes_business_id y filtra actualizado_at. No es prueba de lentitud: se hizo con rol de auditoría, sin coste RLS real ni ejecución. Evaluar índices con volumen sintético representativo y rol authenticated. |
| P06 | Confirmado en código, ALTO para integridad | PULL sin paginación ni confirmación de conjunto completo; movimientos se descarga completo. Coste crece y un límite API puede truncar resultados. No se obtuvo el límite max_rows configurado. |

pg_stat_user_tables informó estimaciones entre 1 y 19 filas por tabla; los valores son aproximaciones del catálogo, no conteos de pacientes ni evidencia de capacidad bajo carga. El catálogo registra stats_reset 02/10/2026. No hay mediciones de p95/p99 ni análisis de consultas reales. Los conteos de logs por fuente solo verifican disponibilidad, no ausencia de incidentes o errores. No se extrajeron textos SQL ni payloads de logs porque podrían contener datos personales.

Referencias de los advisors:

- https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan
- https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies
- https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index

## Hallazgos locales anteriores conservados

| ID | Severidad | Evidencia local y situación |
|---|---|---|
| L01 | ALTO | Next 16.1.6 y Server Actions: aviso GHSA-p3m5-59mp-jv5r aplicable a esa combinación. Verificar versión desplegada y parche vigente antes de implementar. No se repitió auditoría de dependencias en esta continuación. |
| L02 | ALTO | syncService.ts:177-194: PULL normaliza como synced y bulkPut puede sobrescribir pending. |
| L03 | ALTO | syncService.ts:160-204: continue ante error seguido de avance global de cursor; hora del cliente al finalizar introduce ventana y desfase. |
| L04 | ALTO | syncService.ts:364-429: selección global de pending, también tras reconciliación; sin contexto de sesión/tenant. La falta de aislamiento remoto ahora queda confirmada por S01. |
| L05 | ALTO, riesgo de concurrencia | syncService.ts:335-355: ACK por ID sin verificar versión enviada puede ocultar ediciones durante la petición. |
| L06 | ALTO | useUsuarios.ts:54-95: caché previo a confirmación; update captura rechazo y no lo propaga; perfiles queda fuera del PUSH. Falso éxito y pendientes sin vía de entrega. |
| L07 | ALTO | users.ts:152-190: autoservicio sin comprobar perfil activo/eliminado y actualización administrativa de email confirmada automáticamente. |
| L08 | ALTO | users.ts:80-125,163-239: Auth y perfiles en operaciones separadas, sin recuperación de fallos parciales. La ausencia de trigger remoto mantiene el hallazgo. |
| L09 | MEDIO | users.ts:73 aplica RolSchema al crear; línea 233 copia rol sin validarlo al editar. R18 no está totalmente cerrado. |
| L10 | ALTO en equipo compartido | AuthProvider.tsx:96 no aísla/limpia Dexie; next.config.ts usa caché PWA predeterminada con regla cross-origin NetworkFirst del paquete. Exposición efectiva vía Cache Storage pendiente de prueba; no borrar trabajo pendiente. |
| L11 | MEDIO | AuthProvider.tsx:41-68 conserva credencial legacy, no comprueba error de setSession y retorna antes de limpiar si ya hay sesión. |
| L12 | MEDIO | logger.ts:30-38 imprime errores crudos; reducir a message/code no garantiza ausencia de datos personales. No se observó filtración real. |
| L13 | MEDIO | Reconciliación DNI de syncService.ts:236-300 no agrupa cambio de referencias e identidad en transacción. retry.ts solo reintenta throws, no respuestas PostgREST con error. |
| L14 | MEDIO | db.ts:25,52: sync_metadata tiene PK deviceId; un tenant reemplaza metadatos de otro. SyncMonitor cuenta pending global, no failed. |
| L15 | BAJO/MEDIO | useSimpleSync y seedDatabase sin llamadas activas; resolveConflict sin consumidor encontrado, compara creado_at e ignora error al confirmar synced. No presentar estos caminos como fallos activos del flujo principal. admin.ts carece de server-only, sin fuga de clave demostrada. |

Avisos oficiales consultados en el análisis anterior: https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r y https://nextjs.org/blog/nextjs-security-update-october-14-2026 . El vector crítico use cache/typed arrays no se encontró en el proyecto; no se afirma explotación local de ese vector.

## Qué queda pendiente

1. Pruebas de autorización con dos tenants sintéticos y roles reales en staging, incluidas modificación propia de rol/tenant, inactivos, lectura por UUID, borrado y upsert. No probar escribiendo producción.
2. Configuración completa Auth y API: signup, confirmación, MFA, redirecciones, expiración, rate limits y max_rows. Las herramientas disponibles no proporcionan esos controles; no se accedió a secretos para obtenerlos.
3. Tests actuales, build, versión efectivamente desplegada, cabeceras y política efectiva del service worker en navegador.
4. Concurrencia, fallos parciales, recuperación y rendimiento con volumen representativo. No hay SLA definido ni carga suficiente para afirmar lentitud.
5. Consistencia de filas existentes antes de añadir FK/checks: auditoría posterior con resultados agregados, sin exportar datos personales; no se realizó por la restricción de no consultar filas de negocio.
6. Revisión de superficies fuera de public/auth: Storage, Edge Functions, extensiones y membresías completas si forman parte del despliegue.

Conclusión: la aplicación puede funcionar correctamente en sus flujos normales y aun tener permisos remotos demasiado amplios. La prioridad cambia a autorización de perfiles y aislamiento RLS; limpieza e índices quedan después. No hay evidencia de incidente ni justificación de reescritura. La ausencia de hallazgos de aislamiento en advisors no invalida S01/S02: esos avisores no verifican la intención de negocio.

## Actualización de implementación — cierre local de fase 4

Los hallazgos y las referencias anteriores describen la revisión inicial; se conservan como evidencia histórica. El código ha cambiado en los commits de fases 1–4. Esta actualización no certifica corrección del despliegue remoto: no se ejecutaron escrituras ni migraciones sobre Supabase cloud.

| Hallazgo inicial | Evidencia y estado local actual |
|---|---|
| L06, falsos éxitos/caché anticipada | users.ts devuelve filas confirmadas; useUsuarios.ts persiste esas filas tras éxito remoto y propaga errores. La decisión online conserva lectura offline y rechaza mutaciones sin conexión. Cubierto por pruebas de acciones y hook. |
| L07, identidad propia y perfil inactivo | Validación activo/no eliminado en autoservicio; email propio mediante cliente de sesión, sin confirmación administrativa. Devuelve emailConfirmationPending y conserva email anterior hasta confirmar. El flujo administrativo conserva su autorización y semántica. |
| L08, Auth/perfiles en operaciones separadas | Nueva migración 20261116000200_atomic_user_profiles.sql: aprovisionamiento con contexto app_metadata validado dentro de transacción Auth; espejo de email y guard de correo canónico. Fallos reales del perfil revierten alta/cambio Auth en el stack local. No modifica automáticamente huérfanos históricos. |
| L09, validación de rol | Schemas de alta/edición restringen rol; no se permite traslado de institución ni campos privilegiados propios. Tests de autorización conservados. |

Comprobaciones realizadas en esta fase:

- 93 pruebas unitarias correctas: acciones de usuarios 43, hook 7, stock 32 y reportes 11; TypeScript sin emisión y build Next webpack/PWA correctos, 11 páginas generadas. Avisos de middleware obsoleto y Browserslist conservados.
- Supabase local con GoTrue/PostgREST: altas con contexto confiable, rechazo de actor no administrador/tenant incorrecto/nombre inválido, mismo email reutilizable tras rollback y fallo CHECK real del INSERT perfil sin cuenta Auth huérfana.
- Fallo CHECK real del espejo de email: conserva correo anterior tanto en Auth como en perfiles; reintento posterior correcto. Guard rechaza escritura obsoleta de email incluso con service_role. Duplicado Auth rechazado.
- Email propio pendiente sin modificar perfil; ambos enlaces de confirmación recibidos y consumidos exclusivamente en correo sintético local; email final idéntico en Auth y perfil. Metadata editable por usuario no eleva privilegios. Marcador de aprovisionamiento sin cambios no reinserta perfil al actualizar app_metadata.
- RPC de preparación accesible por service_role, denegado para anon y authenticated. Contexto de reintento verificado en tests de acciones; no se recuperan cuentas con otro actor/tenant/UUID de solicitud. UI conserva UUID solo en memoria para el mismo formulario abierto; no persiste contraseñas en metadata/almacenamiento.
- Matriz local anterior de RLS/Auth repetida correctamente después de la nueva migración, incluidas cookies SDK, getUser, refreshSession y signOut. Todas las filas/correos generados se retiraron; comprobación de limpieza correcta.
- Lint correcto en acciones/tests/hook/schemas/tipos/página. AuthProvider.tsx conserva tres errores previos de reglas React (set-state-in-effect y refs); UserModal.tsx conserva uno previo de set-state-in-effect. Comparación contra HEAD anterior confirma los mismos cuatro errores, sin errores nuevos ni supresión de reglas. No se incluye su refactorización en fase 4.

Límites pendientes: smoke de UI/Server Actions reales, carreras de navegador, redirección de confirmación desplegada, email/SMTP/rate limits cloud, PWA instalada y caché de dispositivo existente. El test local no copia toda la configuración ni todos los triggers remotos. Debe revisarse la compatibilidad del catálogo antes de aplicar SQL. Los demás hallazgos de sincronización, integridad y privacidad siguen abiertos para fases 5–9; no se hicieron cambios de esas fases ni pruebas de carga nuevas.

La atomicidad probada comprende alta Auth/perfil y email Auth/perfil. Nombre/rol/estado se guardan en una petición posterior; si falla, la acción informa error y permite reintento, sin asegurar rollback global del formulario. Los huérfanos antiguos sin procedencia verificable necesitan reparación manual dirigida; nunca se adopta una cuenta por coincidir únicamente el email.

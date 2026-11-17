# Publicación Supabase y Netlify — 17/11/2026

Autorización expresa del usuario: aplicar migraciones y publicar; los datos y dispositivos previos son exclusivamente de prueba. Se conserva acceso administrativo, cuentas, institución y dos programas de estudio.

## Supabase

Proyecto correcto: `lyskgesbczpuihadaxbw` (TopicoWeb). Respaldo de siete tablas públicas guardado fuera del repositorio, cifrado con DPAPI CurrentUser y verificado mediante descifrado. Archivo: `%LOCALAPPDATA%/TopicoWeb/private-backups/pre-release-20261117-045226-public.dpapi`. Requiere el mismo usuario de Windows para recuperarlo. No es un dump completo de PostgreSQL/Auth/Storage ni un respaldo externo de desastre; no se eliminaron identidades Auth.

Se eliminaron únicamente registros de prueba: 19 movimientos, 12 atenciones, 9 pacientes y 3 medicamentos. Transacción con locks y comprobación de cantidades contra el respaldo; permanecen 5 perfiles, 1 institución y 2 programas. IndexedDB de dispositivos anteriores no se borra remotamente ni se adopta automáticamente. Para comenzar limpio en ellos, usar un perfil de navegador nuevo o limpiar el almacenamiento de ese sitio de prueba antes de ingresar a la versión nueva.

Aplicadas por MCP, con éxito comprobado, las siete migraciones de fases 1/2, 4, 5, 6, 7, 8 y 9. Los fallos de transporte se comprobaron antes de reintentar; no se interpretaron como éxito. Historial remoto alineado con los ocho identificadores de archivos del repositorio, conservando statements/nombres; la migración antigua de diagnóstico se contrastó y es equivalente. Esta reparación de metadata evita reejecución accidental por discrepancias de timestamps del MCP. No hubo rollback que deshabilitara RLS ni permisos abiertos.

`supabase/tests/production-readiness.sql` pasó remotamente: siete tablas con RLS, anon sin lectura, perfiles sin escritura privilegiada directa, saldo absoluto denegado, RPCs/grants correctos, cuatro triggers Auth/perfiles, seis timestamps NOT NULL, cinco FK por tenant y ambos índices UNIQUE conservados. Actor administrador verificado, contexto inexistente sin filas, RPCs de frontera y stock operativos. Comprobaciones en transacción ROLLBACK, sin fixtures persistentes ni cambios en datos.

Advisor de seguridad: únicamente avisos por dos SECURITY DEFINER accesibles intencionalmente a authenticated (`get_my_role` y `topico_sync_boundary`, con contexto protegido/search_path fijo) y protección de contraseñas filtradas desactivada, limitada por plan gratuito. No se retiraron RPCs legítimos para silenciar avisos.

## Netlify

Cuenta CLI verificada: `topicwebtopico@gmail.com`. Sitio existente `topicoweb`, ID `e474b58b-2137-42de-88e4-8a477efeecd1`, URL `https://topicoweb.netlify.app`, repositorio `topicweb/TopicoWeb`, rama `main`.

Las tres variables Supabase coinciden con el proyecto local correcto y están presentes en scopes builds/functions. No se imprimieron ni subieron sus valores. Node configurado en versión 22 tanto en Netlify como en `netlify.toml`, compatible con el requisito Node >=22.13 del CLI 27 instalado.

Publicación confirmada: deploy `6afbe59d82a3d71f5338e0a6`, estado ready, commit `bd2c36cfa68508105b516c2d7cf0ed52c792aa91`, publicado el 17/11/2026 a las 05:28:37 UTC (00:28:37 America/Lima). Un build de producción disparado explícitamente; los pushes preparatorios usaron `[skip netlify]`. No se programan builds adicionales ni se presume saldo de créditos sin consultarlo. El usuario pidió conservar los créditos: el cierre documental también omite despliegue. Los commits posteriores solo añaden documentación/herramientas de comprobación y no cambian la aplicación publicada.

HTTP real: login/offline/SW/manifest 200, dashboard sin sesión 307 hacia login con no-store, CSP Report-Only y nosniff efectivos, receptor CSP 204 sin cuerpo. `sw.js` revalidable, sin caché inmutable.

Prueba real en Chrome contra la URL pública (`scripts/production-session-smoke.mjs --confirm-production-smoke`): login y dashboard, PULL/paciente propio visible, acceso administrador, alta de usuario personal mediante UI/Server Action, correspondencia Auth/perfil confirmada, PWA controlada por SW, recarga offline, logout offline y Cache Storage sin respuestas privadas. Cuenta/tenant/paciente sintéticos aislados y contraseña aleatoria no registrada. El primer intento no esperó suficiente a la hidratación y su limpieza se interrumpió; se retiró el residuo por UUID exacto y se reforzó el harness con espera de recursos, reintentos transitorios y diagnóstico sin secretos. La segunda ejecución pasó completa y retiró todos sus fixtures; no se cambió código de la aplicación por el fallo del harness.

Comprobación final MCP: 1 institución, 5 perfiles, 2 programas y cero pacientes/atenciones/medicamentos/movimientos; cero cuentas Auth con el prefijo exclusivo del smoke. Administrador original activo y correo confirmado; contraseña conservada. No se imprimen credenciales en logs ni se incluyen datos del respaldo en Git.

No se modificaron contraseñas, planes, facturación ni se contrataron servicios. Configuración SMTP y pruebas de correo real no certificadas por el MCP disponible. El smoke publicado no sustituye pruebas prolongadas, PDF/correo real ni actualización manual en todos los dispositivos. Las bases locales de los dispositivos previos siguen fuera del control de Supabase: al ser pruebas descartables, limpiar datos del sitio de prueba antes de comenzar operación real; conservar cuentas/contraseñas del servidor. No restaurar pendientes antiguos de stock automáticamente.

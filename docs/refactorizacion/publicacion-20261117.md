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

Las tres variables Supabase coinciden con el proyecto local correcto y están presentes en scopes builds/functions. No se imprimieron ni subieron sus valores. Node preparado en versión 22 tanto en Netlify como en `netlify.toml`, compatible con el requisito Node >=22.13 del CLI 27 instalado. Publicación remota pendiente al crear este registro; se completará después de confirmar el build y verificar HTTP.

No se modificaron contraseñas, planes, facturación ni se contrataron servicios. Configuración SMTP y pruebas de correo real no certificadas por el MCP disponible. Las pruebas previas de UI/PWA fueron locales; las verificaciones HTTP posteriores no sustituyen una sesión manual completa en todos los dispositivos.

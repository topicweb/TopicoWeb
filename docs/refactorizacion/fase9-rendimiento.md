# Fase 9 — medición y limpieza conservadora

Fecha: 16/11/2026, America/Lima. HEAD inicial `039a7cf`, árbol limpio. Autorización: implementar fase 9, delegar a Luna, validar y guardar commit local. Sin despliegue ni EXPLAIN ANALYZE en producción.

## Decisiones

- P01/P02: fase 2 ya reemplaza políticas y usa `(SELECT auth.uid())` / `(SELECT private.current_business_id())`. Los planes ejecutados bajo authenticated muestran InitPlan con una ejecución por sentencia. No se cambian permisos de nuevo.
- P03: MCP de solo lectura reconsultó `idx_pacientes_business_dni` y `idx_perfiles_email`; repiten las claves de `pacientes_business_id_dni_key` y `perfiles_email_key`. La migración `20261117000500_remove_duplicate_indexes.sql` retira exclusivamente los dos no únicos, con guardas de tabla, columnas, método, opclasses, collation, orden, cardinalidad, expresiones/predicado, validez y dependencias. Conserva restricciones e índices UNIQUE. Una definición inesperada aborta toda la transacción; candidatos ya ausentes se omiten por idempotencia. DROP RESTRICT impide eliminar dependencias adicionales.
- P04: se conservan todos los demás índices, incluidos los marcados unused.
- P05: se mide pacientes con el índice experimental `(business_id,actualizado_at,id)`. Mejora la lectura sintética, pero ocupa 6.021.120 bytes adicionales y su coste de escritura no está acotado suficientemente. No se incorpora ni se extrapola a otras tablas. Falta acordar workload y objetivos operativos reales.
- Triggers: MCP confirmó ocho triggers legacy, incluidos dos de timestamp en perfiles. El fixture no reproduce todas sus asociaciones; su consolidación opcional se difiere hasta disponer de fixture completo y beneficio medido. No cambia la autoridad `zzzz_topico_sync_stamp`, su barrera ni las funciones.
- L15: Luna comprobó consumidores y retiró `useSimpleSync.ts` y `seedData.ts` (358 líneas). Principal revisó el diff y repitió búsqueda global: solo quedan menciones históricas. `syncService.ts`, persistencia, colas y arquitectura activa no cambian. Los planes antiguos de `doc/` se marcan como históricos, conservando evidencia.

## Medición reproducible

`supabase/tests/run-performance-local.ps1` crea una base aleatoria dentro del contenedor local fijo, carga fixture sintético y fases 2/6/7, y la elimina en `finally`. No lee `.env.local`, no admite destino remoto ni usa datos/claves cloud. La consulta MCP solo obtiene metadatos; no se ejecuta escritura ni ANALYZE remoto.

Se recrean los índices de pacientes observados, además del índice UNIQUE por tenant de fase 7. Se generan 100.000 pacientes entre diez instituciones (10.000 por tenant), actor personal y timestamps distribuidos. Se mide la página incremental de 200 filas, OR keyset y UPDATE de 200 filas con triggers y RLS activos. Para simular historia se deshabilita el trigger de timestamps solo en el fixture, y se habilita antes de medir escrituras. RLS permanece activo.

Cada consulta ejecuta dos calentamientos y siete mediciones EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON). Resultados completos: [fase9-medicion-local.jsonl](fase9-medicion-local.jsonl). Son mediciones PostgreSQL local con caché caliente: no incluyen red, PostgREST, descarga completa ni UI. Los UPDATE repetidos generan versiones muertas y ruido; no permiten afirmar un porcentaje estable del coste de escritura. Dos ejecuciones exploratorias previas también mostraron variabilidad.

| Mediana local, ms | Antes | Con índice experimental |
| --- | ---: | ---: |
| Página incremental | 2,262 | 0,178 |
| Página con keyset | 2,491 | 0,130 |
| UPDATE de 200 filas | 9,654 | 10,209 |

El índice experimental se retira antes del ensayo de migración real. Los dos duplicados ocupaban 7.364.608 bytes (7,02 MiB) en el fixture; tras retirarlos, cero bytes para esas dos estructuras. Consulta tenant/DNI: 0,052 ms antes y 0,049 ms después. Esa diferencia pequeña no demuestra mejora de latencia: se acepta el ahorro de almacenamiento/mantenimiento conservando resultados y restricciones, sin prometer tiempos operativos.

Se verifican los 200 IDs de la página, 10.000 filas propias/cero ajenas, consulta DNI, ausencia de ambos índices, catálogo de restricciones idéntico y rechazo real de DNI/email duplicados. Se ejecutan rollback con definiciones exactas y reaplicación, repitiendo comprobaciones. Finalmente se cambia deliberadamente la definición de un candidato: la migración lo rechaza y conserva ambos índices. Base temporal retirada correctamente.

## Despliegue y reversión

Migración probada solo en bases temporales; no se aplica al stack Auth persistente ni a producción. Antes de desplegar, revisar otra vez catálogo, dependencias, tamaño/carga y ventana de mantenimiento; aplicar fases previas coordinadas. ACCESS EXCLUSIVE sobre pacientes/perfiles impide deriva entre comprobación y DROP. `lock_timeout=5s` aborta si no obtiene locks; no limita la duración total. El ensayo local no certifica bloqueo/duración con tráfico real.

Rollback ensayado: `supabase/tests/rollback-duplicate-indexes-local.sql` recrea exactamente ambos índices no únicos en transacción. Para tablas grandes, preparar CREATE INDEX CONCURRENTLY fuera de transacción y comprobar validez; no ejecutar automáticamente el archivo local en producción. La limpieza se revierte por commit, sin borrar IndexedDB, colas ni datos. No se retiran restricciones ni índices únicos.

## Validación y aceptación

Vitest 167/167, TypeScript sin emisión y build Next 16.4.6 webpack/PWA correctos. Avisos anteriores de middleware/Edge Runtime, Browserslist y caché webpack permanecen; no se instalaron dependencias. Medición final, rollback y rechazo de deriva pasan.

Fase 9 local cerrada con evaluación documentada y retirada limitada justificada. Índice compuesto, otros índices y triggers quedan como optimizaciones opcionales condicionadas a evidencia/objetivos. No se certifican rendimiento cloud, despliegue ni pendientes UI/PWA/legacy de fases anteriores. No se repitieron matrices Auth/UI sin cambios en sus flujos.

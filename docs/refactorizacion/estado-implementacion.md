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
| 0 | Preparación local y herramientas disponibles | Build/smoke, configuración Auth/API y staging real |
| 1 | En implementación local | Pruebas y validación remota coordinada con fase 2 |
| 2 | Migración preparada; aplicada solo a PostgreSQL sintético | Matriz SQL, staging Auth/API; no desplegada |
| 3 | Pendiente | Actualización framework/versiones y build |
| 4–9 | Pendientes | Según plan, sin cambios aún |

## Regla de continuidad

Leer este archivo, plan-refactorizacion.md y git log. Verificar git status antes de tocar nada. Registrar aquí pruebas efectivamente ejecutadas, límites y siguiente acción; no asumir pruebas históricas como actuales. Los commits locales se identifican por fase en el mensaje (consultar git log para hashes).

No ejecutar supabase db push ni apply_migration sobre producción durante preparación. No crear staging de pago. No desactivar RLS como rollback. No borrar pendientes de Dexie ni limpiar directorios arbitrarios.

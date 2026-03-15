import { useLiveQuery } from 'dexie-react-hooks';
import { EntityTable } from 'dexie';
import { useAuth } from '@/core/providers/AuthProvider';

/**
 * Contrato mínimo que deben cumplir las entidades para ser usadas con este hook.
 * Estos campos son gestionados e inyectados automáticamente por `useDexieCrud`.
 */
export interface DexieCrudEntity {
  id: string;
  business_id: string;
  creado_at: string;
  activo: number; // 0 | 1 para indexación
}

/**
 * Hook genérico para operaciones CRUD en Dexie con soporte SaaS (multi-tenant).
 *
 * Reglas de oro que implementa automáticamente:
 * 1. Filtrado por `business_id` en toda consulta (multi-tenancy).
 * 2. Inyección de `sync_status: 'pending'` en create/update (offline-first).
 * 3. Soft-delete (`activo: false`) en lugar de eliminar físicamente.
 *
 * @param table Instancia de la tabla de Dexie (ej: db.pacientes)
 */
export function useDexieCrud<T extends DexieCrudEntity>(
  table: EntityTable<T, "id">
) {
  const { businessId } = useAuth();

  // Regla de Oro #1: Filtrado obligatorio por business_id — nunca mezclar tenants
  const data = useLiveQuery<T[] | undefined>(async () => {
    if (!businessId || typeof businessId !== 'string') return [];
    
    // Consulta balanceada: Filtramos por business_id (índice robusto) 
    // y aplicamos el filtro de 'activo' en memoria para evitar errores de DataError
    // con booleanos en índices compuestos en algunos navegadores.
    const results = await table
      .where('business_id')
      .equals(businessId)
      .filter((item: T) => item.activo === 1)
      .toArray();
    return results as T[];
  }, [businessId]);

  // ── CREATE ────────────────────────────────────────────────────────────────
  // Inyecta automáticamente: id, business_id, creado_at, activo,
  // actualizado_at y sync_status para que el SyncService lo suba a Supabase.
  const create = async (
    item: Omit<T, 'id' | 'business_id' | 'creado_at' | 'activo' | 'actualizado_at' | 'sync_status'>
  ) => {
    if (!businessId) throw new Error('Business ID no encontrado. Usuario no autenticado.');

    const now = new Date().toISOString();
    // Usamos `unknown as T` para evitar el error de narrowing de TypeScript con genéricos.
    const newItem = {
      ...item,
      id: crypto.randomUUID(),
      business_id: businessId,
      creado_at: now,
      actualizado_at: now,
      activo: 1,
      sync_status: 'pending' as const,
    } as unknown as T;

    await table.add(newItem);
    return newItem.id;
  };

  // ── UPDATE ────────────────────────────────────────────────────────────────
  // Verifica que el registro pertenece al tenant actual antes de modificar.
  // Inyecta `actualizado_at` y `sync_status` para activar el flujo de sync.
  const update = async (
    id: string,
    changes: Partial<Omit<T, 'id' | 'business_id'>>
  ) => {
    // casteamos string a any para saltar el tipo IDType<T, "id"> estricto
    const item = await table.get(id as any);
    if (!item || item.business_id !== businessId) return;

    const patch = {
      ...changes,
      actualizado_at: new Date().toISOString(),
      sync_status: 'pending' as const,
    } as unknown as Partial<T>;

    await table.update(id as any, patch as Parameters<typeof table.update>[1]);
  };

  // ── SOFT DELETE ───────────────────────────────────────────────────────────
  // No elimina físicamente; el SyncService propagará el soft-delete a Supabase.
  const remove = async (id: string) => {
    const item = await table.get(id as any);
    if (!item || item.business_id !== businessId) return;

    const patch = {
      activo: 0,
      actualizado_at: new Date().toISOString(),
      sync_status: 'pending' as const,
    } as unknown as Partial<T>;

    await table.update(id as any, patch as Parameters<typeof table.update>[1]);
  };

  return {
    data: data ?? [],
    create,
    update,
    remove,
    isLoading: data === undefined && !!businessId,
  };
}
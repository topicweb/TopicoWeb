import type { Perfil } from '@/features/usuarios/types';

/** Normaliza activo desde Supabase (boolean) o Dexie (0/1). */
export function isPerfilActivo(activo: unknown): boolean {
  return activo === 1 || activo === true;
}

/** Perfil utilizable para la app (activo y no eliminado). */
export function isPerfilValido(perfil: Pick<Perfil, 'activo' | 'deleted_at'> | null | undefined): boolean {
  if (!perfil) return false;
  return isPerfilActivo(perfil.activo) && !perfil.deleted_at;
}

/** Convierte fila de Supabase al formato Dexie (activo 0/1). */
export function normalizePerfilFromSupabase(row: Record<string, unknown>): Perfil {
  return {
    ...(row as unknown as Perfil),
    activo: isPerfilActivo(row.activo) ? 1 : 0,
    sync_status: 'synced',
  };
}

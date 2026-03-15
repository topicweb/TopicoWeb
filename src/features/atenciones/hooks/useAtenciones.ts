/**
 * @module features/atenciones/hooks/useAtenciones
 *
 * Hook central del módulo Atenciones.
 * Reemplaza DexieAtencionRepository — toda la lógica vive aquí,
 * siguiendo el patrón canónico useDexieCrud.
 */
import { useDexieCrud } from '@/shared/hooks/use-dexie-crud';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/core/providers/AuthProvider';
import { Atencion, AtencionFormData, SignosVitales } from '../types';
import { MovimientoStock } from '@/features/inventario/types';
import { db } from '@/core/db';
import { updateMedicamentoStock } from '@/core/db/dexie/logic/stock';

// ── Tipos de apoyo ─────────────────────────────────────────────────────────

/** Atención enriquecida con nombres para mostrar en la UI. */
export interface AtencionConDetalles extends Atencion {
  pacienteNombre: string;
  staffNombre: string;
}

/** Signos vitales por defecto (todos vacíos = no registrado). */
export const SIGNOS_VITALES_VACIO: SignosVitales = {
  temp: '',
  presion: '',
  saturacion: '',
};

// ── Hook ───────────────────────────────────────────────────────────────────

export function useAtenciones() {
  const { businessId, user } = useAuth();

  // ── 1. CRUD genérico → multi-tenancy y sync_status automáticos ──────────
  const {
    data: atenciones,
    update: actualizarAtencion,
    isLoading,
  } = useDexieCrud<Atencion>(db.atenciones);

  // ── 2. Vista enriquecida para la UI (join manual en Dexie) ──────────────
  const atencionesConDetalles = useLiveQuery(async () => {
    if (!businessId) return [];

    const recents = await db.atenciones
      .where('business_id')
      .equals(businessId)
      .reverse()
      .limit(50)
      .toArray();

    return Promise.all(
      recents.map(async (a): Promise<AtencionConDetalles> => {
        const paciente = await db.pacientes.get(a.paciente_id);
        const staff = await db.perfiles.get(a.perfil_id);
        return {
          ...a,
          pacienteNombre: paciente
            ? `${paciente.nombres} ${paciente.apellidos}`
            : 'Desconocido',
          staffNombre: staff?.nombre ?? 'Desconocido',
        };
      })
    );
  }, [businessId]) ?? [];

  // ── 3. Lógica de negocio ────────────────────────────────────────────────

  /**
   * Registra una consulta médica de forma atómica:
   * 1. Crea la atención.
   * 2. Crea los movimientos de stock (SALIDA) para cada medicamento dispensado.
   * 3. Actualiza el stock_actual de cada medicamento.
   *
   * Si cualquier paso falla, toda la transacción se revierte.
   */
  const registrarAtencion = async (
    datos: AtencionFormData,
    medicamentos: { medId: string; cantidad: number }[] = []
  ): Promise<string> => {
    if (!businessId) throw new Error('Usuario no autenticado');
    if (!user?.id) throw new Error('Perfil de usuario no disponible');

    const now = new Date().toISOString();
    const atencionId = crypto.randomUUID();

    await db.transaction(
      'rw',
      db.atenciones,
      db.movimientos_stock,
      db.medicamentos,
      async () => {
        // 1. Crear la Atención
        const atencion: Atencion = {
          ...datos,
          id: atencionId,
          business_id: businessId,
          perfil_id: user.id,            // Inyectado desde AuthContext
          creado_at: now,
          actualizado_at: now,
          sync_status: 'pending',
          activo: 1,
          signos_vitales: datos.signos_vitales ?? SIGNOS_VITALES_VACIO,
        };
        await db.atenciones.add(atencion);

        // 2. Crear Movimientos de SALIDA y actualizar stock por cada medicamento
        for (const item of medicamentos) {
          const movimiento: MovimientoStock = {
            id: crypto.randomUUID(),
            business_id: businessId,
            medicamento_id: item.medId,
            atencion_id: atencionId,
            tipo: 'SALIDA',
            cantidad: item.cantidad,
            fecha_movimiento: now,
            creado_at: now,
            actualizado_at: now,
            sync_status: 'pending',
          };
          await db.movimientos_stock.add(movimiento);
          await updateMedicamentoStock(item.medId, item.cantidad, 'SALIDA', now);
        }
      }
    );

    return atencionId;
  };

  // ── 4. Helpers de analítica ─────────────────────────────────────────────

  /**
   * Estadísticas de atenciones de los últimos 7 días para el dashboard.
   * Filtra por business_id usando el índice compuesto de Dexie.
   */
  const getStatsLast7Days = async (): Promise<{ date: string; count: number }[]> => {
    const stats: { date: string; count: number }[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      if (!businessId) {
        stats.push({ date: dateStr, count: 0 });
        continue;
      }

      const count = await db.atenciones
        .where('business_id').equals(businessId)
        .and(a => a.fecha_atencion.startsWith(dateStr))
        .count();

      stats.push({ date: dateStr, count });
    }
    return stats;
  };

  return {
    // Data
    atenciones,
    atencionesConDetalles,
    isLoading,

    // Operaciones
    registrarAtencion,
    actualizarAtencion,

    // Analítica
    getStatsLast7Days,
  };
}
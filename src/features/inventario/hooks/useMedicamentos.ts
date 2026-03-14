/**
 * @module features/inventario/hooks/useMedicamentos
 *
 * Hook central del módulo Inventario.
 * Reemplaza DexieMedicamentoRepository — toda la lógica vive aquí,
 * siguiendo el patrón canónico useDexieCrud.
 */
import { useDexieCrud } from '@/shared/hooks/use-dexie-crud';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/core/providers/AuthProvider';
import { Medicamento, MedicamentoFormData, MovimientoStock, MovimientoFormData } from '../types';
import { db } from '@/core/db';
import { updateMedicamentoStock } from '@/core/db/dexie/logic/stock';

export function useMedicamentos() {
  const { businessId } = useAuth();

  // ── 1. CRUD genérico → multi-tenancy y sync_status automáticos ──────────
  const {
    data: medicamentos,
    create: baseCrarMedicamento,
    update: actualizarMedicamento,
    remove: eliminarMedicamento,
    isLoading,
  } = useDexieCrud<Medicamento>(db.medicamentos);

  // ── 2. Movimientos de stock (solo lectura reactiva del tenant) ───────────
  const movimientos = useLiveQuery<MovimientoStock[] | undefined>(async () => {
    if (!businessId) return [];
    return await db.movimientos_stock
      .where('business_id')
      .equals(businessId)
      .reverse()
      .toArray();
  }, [businessId]) ?? [];

  // ── 3. Lógica de negocio específica ────────────────────────────────────

  const crearMedicamento = (datos: MedicamentoFormData) =>
    baseCrarMedicamento(datos);

  /**
   * Registra una entrada o salida de stock en una transacción atómica.
   * - Crea el MovimientoStock con sync_status 'pending'.
   * - Actualiza stock_actual del medicamento afectado.
   */
  const registrarMovimiento = async (datos: MovimientoFormData) => {
    if (!businessId) throw new Error('Usuario no autenticado');

    const now = new Date().toISOString();
    const movimientoId = crypto.randomUUID();

    await db.transaction('rw', db.movimientos_stock, db.medicamentos, async () => {
      // 1. Registrar el movimiento
      const movimiento: MovimientoStock = {
        ...datos,
        id: movimientoId,
        business_id: businessId,
        creado_at: now,
        actualizado_at: now,
        sync_status: 'pending',
      };
      await db.movimientos_stock.add(movimiento);

      // 2. Actualizar stock_actual del medicamento (lógica centralizada)
      await updateMedicamentoStock(datos.medicamento_id, datos.cantidad, datos.tipo, now);
    });

    return movimientoId;
  };

  // ── 4. Helpers de consulta ──────────────────────────────────────────────

  /** Devuelve medicamentos cuyo stock_actual está por debajo del mínimo. */
  const medicamentosBajoStock = medicamentos.filter(
    (m) => m.stock_actual <= m.stock_minimo
  );

  return {
    // Data
    medicamentos,
    movimientos,
    medicamentosBajoStock,
    isLoading,

    // Operaciones
    crearMedicamento,
    actualizarMedicamento,
    eliminarMedicamento,
    registrarMovimiento,
  };
}

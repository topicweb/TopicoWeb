import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/core/db';
import { useAuth } from '@/core/providers/AuthProvider';
import { useNetwork } from '@/core/providers/NetworkProvider';
import { syncService } from '@/core/db/sync';
import { MAX_CANTIDAD_STOCK, validarTipoMedida } from '@/core/db/dexie/logic/stock';
import { logger } from '@/core/utils/logger';
import type { Medicamento, MedicamentoFormData, MovimientoStock } from '../types';

const validarStockMinimo = (stockMinimo: number): void => {
  if (!Number.isInteger(stockMinimo) || stockMinimo < 0 || stockMinimo > MAX_CANTIDAD_STOCK) {
    throw new Error(`El stock mínimo debe ser un entero entre 0 y ${MAX_CANTIDAD_STOCK}`);
  }
};

interface UseMedicamentosReturn {
  medicamentos: Medicamento[];
  movimientos: MovimientoStock[];
  medicamentosBajoStock: Medicamento[];
  loading: boolean;
  crearMedicamento: (datos: MedicamentoFormData) => Promise<string>;
  actualizarMedicamento: (id: string, cambios: Partial<Medicamento>) => Promise<void>;
  eliminarMedicamento: (id: string) => Promise<void>;
}

export function useMedicamentos(): UseMedicamentosReturn {
  const { businessId } = useAuth();
  const { isOnline } = useNetwork();

  const medicamentos = useLiveQuery<Medicamento[]>(
    async () => {
      if (!businessId) return [];
      return db.medicamentos
        .where('business_id')
        .equals(businessId)
        .filter((m) => m.activo === 1)
        .toArray();
    },
    [businessId]
  ) ?? [];

  const movimientos = useLiveQuery<MovimientoStock[]>(
    async () => {
      if (!businessId) return [];
      return db.movimientos_stock
        .where('business_id')
        .equals(businessId)
        .reverse()
        .toArray();
    },
    [businessId]
  ) ?? [];

  const loading = medicamentos === undefined;

  const medicamentosBajoStock = medicamentos.filter((m) => m.stock_actual <= m.stock_minimo);

  const assertBusinessId = (): string => {
    if (!businessId) throw new Error('Usuario no autenticado');
    return businessId;
  };

  const crearMedicamento = async (datos: MedicamentoFormData): Promise<string> => {
    const bid = assertBusinessId();
    if (datos.stock_actual !== 0) {
      throw new Error('El stock inicial debe ser 0; registra las existencias mediante un movimiento');
    }
    validarStockMinimo(datos.stock_minimo);
    validarTipoMedida(datos.tipo_medida);
    const now = new Date().toISOString();

    const medicamento: Medicamento = {
      ...datos,
      id: crypto.randomUUID(),
      business_id: bid,
      creado_at: now,
      actualizado_at: now,
      activo: 1,
      sync_status: 'pending',
    };

    await db.medicamentos.add(medicamento);
    if (isOnline) {
      syncService.requestPush().catch((error) => logger.error('[useMedicamentos] Error en sync:', error));
    }
    return medicamento.id;
  };

  const actualizarMedicamento = async (id: string, cambios: Partial<Medicamento>): Promise<void> => {
    const bid = assertBusinessId();
    await db.transaction('rw', [db.medicamentos, db.movimientos_stock], async () => {
      const med = await db.medicamentos.get(id);
      if (!med || med.business_id !== bid) {
        throw new Error('Medicamento no encontrado o sin permisos');
      }
      if (cambios.id !== undefined && cambios.id !== id) {
        throw new Error('No se puede cambiar el ID del medicamento');
      }
      if (cambios.business_id !== undefined && cambios.business_id !== bid) {
        throw new Error('No se puede cambiar el negocio del medicamento');
      }
      if (cambios.stock_actual !== undefined && cambios.stock_actual !== med.stock_actual) {
        throw new Error('El stock solo se modifica mediante movimientos');
      }
      if (cambios.stock_minimo !== undefined) validarStockMinimo(cambios.stock_minimo);

      const cambiosPermitidos: Partial<Medicamento> = {};
      const camposPermitidos = [
        'nombre', 'descripcion', 'unidad_medida', 'tipo_medida', 'presentacion',
        'anaquel', 'stock_minimo', 'imagen_url', 'activo',
      ] as const;
      for (const campo of camposPermitidos) {
        if (cambios[campo] !== undefined) cambiosPermitidos[campo] = cambios[campo] as never;
      }

      if (cambios.tipo_medida !== undefined) {
        validarTipoMedida(cambios.tipo_medida);
        if (cambios.tipo_medida !== med.tipo_medida) {
          const movimientosCount = await db.movimientos_stock.where('medicamento_id').equals(id).count();
          if ((med.stock_actual ?? 0) !== 0 || movimientosCount > 0) {
            throw new Error('No se puede cambiar la medida de un medicamento con stock o movimientos');
          }
        }
      }

      await db.medicamentos.update(id, {
        ...cambiosPermitidos,
        actualizado_at: new Date().toISOString(),
        sync_status: 'pending',
      });
    });
    if (isOnline) {
      syncService.requestPush().catch((error) => logger.error('[useMedicamentos] Error en sync:', error));
    }
  };

  const eliminarMedicamento = async (id: string): Promise<void> => {
    const med = await db.medicamentos.get(id);
    if (!med || med.business_id !== businessId) {
      throw new Error('Medicamento no encontrado o sin permisos');
    }

    await db.medicamentos.update(id, {
      activo: 0,
      actualizado_at: new Date().toISOString(),
      sync_status: 'pending',
    });
    if (isOnline) {
      syncService.requestPush().catch((error) => logger.error('[useMedicamentos] Error en sync:', error));
    }
  };


  return {
    medicamentos,
    movimientos,
    medicamentosBajoStock,
    loading,
    crearMedicamento,
    actualizarMedicamento,
    eliminarMedicamento,
  };
}

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/core/db';
import { useAuth } from '@/core/providers/AuthProvider';
import { useNetwork } from '@/core/providers/NetworkProvider';
import { syncService } from '@/core/db/sync';
import { updateMedicamentoStock } from '@/core/db/dexie/logic/stock';
import { logger } from '@/core/utils/logger';
import type { Medicamento, MedicamentoFormData, MovimientoStock } from '../types';

interface UseMedicamentosReturn {
  medicamentos: Medicamento[];
  movimientos: MovimientoStock[];
  medicamentosBajoStock: Medicamento[];
  loading: boolean;
  crearMedicamento: (datos: MedicamentoFormData) => Promise<string>;
  actualizarMedicamento: (id: string, cambios: Partial<Medicamento>) => Promise<void>;
  eliminarMedicamento: (id: string) => Promise<void>;
}

export function useMedicamentos() {
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
      syncService.pushToSupabase().catch((error) => logger.error('[useMedicamentos] Error en sync:', error));
    }
    return medicamento.id;
  };

  const actualizarMedicamento = async (id: string, cambios: Partial<Medicamento>): Promise<void> => {
    const med = await db.medicamentos.get(id);
    if (!med || med.business_id !== businessId) {
      throw new Error('Medicamento no encontrado o sin permisos');
    }

    await db.medicamentos.update(id, {
      ...cambios,
      actualizado_at: new Date().toISOString(),
      sync_status: 'pending',
    });
    if (isOnline) {
      syncService.pushToSupabase().catch((error) => logger.error('[useMedicamentos] Error en sync:', error));
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
      syncService.pushToSupabase().catch((error) => logger.error('[useMedicamentos] Error en sync:', error));
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

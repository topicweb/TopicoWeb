import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/core/providers/AuthProvider';
import { db } from '@/core/db';
import { updateMedicamentoStock } from '@/core/db/dexie/logic/stock';
import type { Medicamento, MedicamentoFormData, MovimientoStock, MovimientoFormData } from '../types';

interface UseMedicamentosReturn {
  medicamentos: Medicamento[];
  movimientos: MovimientoStock[];
  medicamentosBajoStock: Medicamento[];
  loading: boolean;
  crearMedicamento: (datos: MedicamentoFormData) => Promise<string>;
  actualizarMedicamento: (id: string, cambios: Partial<Medicamento>) => Promise<void>;
  eliminarMedicamento: (id: string) => Promise<void>;
  registrarMovimiento: (datos: MovimientoFormData) => Promise<string>;
}

export function useMedicamentos(): UseMedicamentosReturn {
  const { businessId } = useAuth();

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
  };

  const registrarMovimiento = async (datos: MovimientoFormData): Promise<string> => {
    const bid = assertBusinessId();
    const now = new Date().toISOString();
    const movimientoId = crypto.randomUUID();

    await db.transaction('rw', db.movimientos_stock, db.medicamentos, async () => {
      const movimiento: MovimientoStock = {
        ...datos,
        id: movimientoId,
        business_id: bid,
        creado_at: now,
        actualizado_at: now,
        sync_status: 'pending',
      };
      await db.movimientos_stock.add(movimiento);
      await updateMedicamentoStock(datos.medicamento_id, datos.cantidad, datos.tipo, now, datos.tipo_medida);
    });

    return movimientoId;
  };

  return {
    medicamentos,
    movimientos,
    medicamentosBajoStock,
    loading,
    crearMedicamento,
    actualizarMedicamento,
    eliminarMedicamento,
    registrarMovimiento,
  };
}

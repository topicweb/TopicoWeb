import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StockError } from './errors';
import { updateMedicamentoStock } from './operations';
import type { Medicamento } from '@/features/inventario/types';

const mocks = vi.hoisted(() => ({
  medicamento: null as Record<string, unknown> | null,
  get: vi.fn(async () => mocks.medicamento),
  update: vi.fn(async (_id: string, changes: Record<string, unknown>) => {
    if (mocks.medicamento) mocks.medicamento = { ...mocks.medicamento, ...changes };
    return 1;
  }),
}));

vi.mock('@/core/db/dexie/db', () => ({
  db: { medicamentos: { get: mocks.get, update: mocks.update } },
}));

function medicamento(stockActual: number): Medicamento {
  return {
    id: 'med-test',
    business_id: 'biz-a',
    nombre: 'Medicamento de prueba',
    unidad_medida: 'unidad',
    tipo_medida: 'UNIDAD',
    stock_actual: stockActual,
    stock_minimo: 0,
    creado_at: new Date().toISOString(),
    actualizado_at: new Date().toISOString(),
    sync_status: 'synced',
    activo: 1,
  };
}

function asRecord(med: Medicamento): Record<string, unknown> {
  return { ...med };
}

beforeEach(() => {
  mocks.medicamento = asRecord(medicamento(5));
  mocks.get.mockClear();
  mocks.update.mockClear();
});

describe('updateMedicamentoStock', () => {
  it('rechaza movimiento inválido y mantiene el stock', async () => {
    await expect(updateMedicamentoStock('med-test', 1, 'AJUSTE' as never, new Date().toISOString()))
      .rejects.toMatchObject({ code: 'TIPO_MOVIMIENTO_INVALIDO' });
    expect(mocks.medicamento?.stock_actual).toBe(5);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('rechaza medicamentos de otro negocio cuando se pasa businessId', async () => {
    await expect(updateMedicamentoStock('med-test', 1, 'ENTRADA', new Date().toISOString(), undefined, undefined, 'biz-b'))
      .rejects.toMatchObject({ code: 'TENANT_INVALIDO' });
    expect(mocks.medicamento?.stock_actual).toBe(5);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('rechaza entradas que exceden el máximo SQL sin modificar el stock', async () => {
    mocks.medicamento = asRecord(medicamento(2_147_483_647));
    const result = await updateMedicamentoStock(
      'med-test', 1, 'ENTRADA', new Date().toISOString(), undefined, undefined, 'biz-a'
    ).catch((error: unknown) => error);

    expect(result).toBeInstanceOf(StockError);
    expect(result).toMatchObject({ code: 'STOCK_EXCEDIDO' });
    expect(mocks.medicamento?.stock_actual).toBe(2_147_483_647);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('resta una salida validada sin clamp', async () => {
    await updateMedicamentoStock('med-test', 3, 'SALIDA', new Date().toISOString(), undefined, undefined, 'biz-a');
    expect(mocks.medicamento?.stock_actual).toBe(2);
    expect(mocks.update).toHaveBeenCalledOnce();
  });
});

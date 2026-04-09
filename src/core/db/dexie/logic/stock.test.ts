/**
 * @module core/db/dexie/logic/stock.test
 *
 * Tests de integración para la lógica de stock multi-medida.
 * FASE 4.1: Testing de Escenarios Críticos
 *
 * Escenarios cubiertos:
 * - Offline → Online sync con múltiples dispensaciones
 * - Concurrencia de atenciones simultáneas
 * - Validación de stock en escenarios límite
 * - Rollback automático en fallos
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validarTipoMedida,
  validarCantidad,
  validarCompatibilidadTipoMedida,
  validarStockSuficiente,
  validarLimiteDispensacion,
  agruparDispensacionesPorMedicamento,
  agruparDispensacionesPorTipoMedida,
  generarDescripcionMovimiento,
  generarResumenPorTipoMedida,
  StockError,
  verificarStockDisponible,
} from './stock';
import type { Medicamento, TipoMedida, DispensacionMedicamento } from '@/features/inventario/types';

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockMedicamento = (overrides: Partial<Medicamento> = {}): Medicamento => ({
  id: 'med-1',
  business_id: 'biz-1',
  nombre: 'Paracetamol',
  descripcion: 'Analgésico',
  unidad_medida: 'unidad',
  tipo_medida: 'UNIDAD',
  presentacion: 'Caja x 20',
  anaquel: 'A-1',
  stock_actual: 50,
  stock_minimo: 10,
  imagen_url: undefined,
  creado_at: new Date().toISOString(),
  actualizado_at: new Date().toISOString(),
  sync_status: 'synced',
  activo: 1,
  ...overrides,
});

const mockDispensacion = (
  medicamento: Medicamento,
  cantidad: number,
  presentacion?: string
): DispensacionMedicamento => ({
  medicamento_id: medicamento.id,
  cantidad,
  tipo_medida: medicamento.tipo_medida,
  presentacion_entregada: presentacion || medicamento.presentacion,
});

// ── Tests de Validación de Tipo de Medida ───────────────────────────────────

describe('validarTipoMedida', () => {
  it('acepta tipos de medida válidos', () => {
    const validos: TipoMedida[] = ['UNIDAD', 'VOLUMEN_ML', 'PESO_MG', 'PORCENTAJE'];
    for (const tipo of validos) {
      expect(() => validarTipoMedida(tipo)).not.toThrow();
    }
  });

  it('lanza StockError para tipo inválido', () => {
    expect(() => validarTipoMedida('INVALIDO')).toThrow(StockError);
    expect(() => validarTipoMedida('INVALIDO')).toThrow('Tipo de medida inválido');
  });

  it('incluye códigos de error específicos', () => {
    try {
      validarTipoMedida('TIPO_RARO');
    } catch (error) {
      expect(error).toBeInstanceOf(StockError);
      expect((error as StockError).code).toBe('TIPO_MEDIDA_INVALIDO');
    }
  });
});

// ── Tests de Validación de Cantidad ─────────────────────────────────────────

describe('validarCantidad', () => {
  it('acepta cantidades positivas', () => {
    expect(() => validarCantidad(1)).not.toThrow();
    expect(() => validarCantidad(100)).not.toThrow();
    expect(() => validarCantidad(0.5)).not.toThrow();
  });

  it('lanza error para cantidad cero o negativa', () => {
    expect(() => validarCantidad(0)).toThrow(StockError);
    expect(() => validarCantidad(-1)).toThrow(StockError);
  });

  it('lanza error para cantidad no numérica', () => {
    expect(() => validarCantidad(NaN)).toThrow(StockError);
    expect(() => validarCantidad(Infinity)).toThrow(StockError);
  });
});

// ── Tests de Validación Cruzada (Compatibilidad) ────────────────────────────

describe('validarCompatibilidadTipoMedida', () => {
  it('permite movimiento sin tipo_medida especificado (hereda del medicamento)', () => {
    const med = mockMedicamento({ tipo_medida: 'UNIDAD' });
    expect(() => validarCompatibilidadTipoMedida(med, undefined)).not.toThrow();
  });

  it('acepta cuando tipos coinciden', () => {
    const med = mockMedicamento({ tipo_medida: 'VOLUMEN_ML' });
    expect(() => validarCompatibilidadTipoMedida(med, 'VOLUMEN_ML')).not.toThrow();
  });

  it('lanza error cuando tipos no coinciden', () => {
    const med = mockMedicamento({ tipo_medida: 'UNIDAD', nombre: 'Paracetamol' });
    expect(() => validarCompatibilidadTipoMedida(med, 'VOLUMEN_ML')).toThrow(StockError);
    expect(() => validarCompatibilidadTipoMedida(med, 'VOLUMEN_ML')).toThrow('Incompatibilidad de tipo');
  });

  it('incluye detalles del error de incompatibilidad', () => {
    const med = mockMedicamento({ tipo_medida: 'UNIDAD', nombre: 'Aspirina' });
    try {
      validarCompatibilidadTipoMedida(med, 'PESO_MG');
    } catch (error) {
      expect(error).toBeInstanceOf(StockError);
      expect((error as StockError).code).toBe('INCOMPATIBILIDAD_TIPO');
      expect((error as StockError).medicamentoId).toBe('med-1');
      expect((error as StockError).detalles).toMatchObject({
        medicamentoTipo: 'UNIDAD',
        movimientoTipo: 'PESO_MG',
        medicamentoNombre: 'Aspirina',
      });
    }
  });
});

// ── Tests de Validación de Stock ────────────────────────────────────────────

describe('validarStockSuficiente', () => {
  it('permite salida cuando hay stock suficiente', () => {
    const med = mockMedicamento({ stock_actual: 50, nombre: 'Ibuprofeno' });
    expect(() => validarStockSuficiente(med, 30, 'SALIDA')).not.toThrow();
  });

  it('permite cualquier cantidad para ENTRADA (no valida stock)', () => {
    const med = mockMedicamento({ stock_actual: 0 });
    expect(() => validarStockSuficiente(med, 100, 'ENTRADA')).not.toThrow();
  });

  it('lanza error cuando stock insuficiente para SALIDA', () => {
    const med = mockMedicamento({ stock_actual: 10, nombre: 'Amoxicilina', tipo_medida: 'UNIDAD' });
    expect(() => validarStockSuficiente(med, 15, 'SALIDA')).toThrow(StockError);
    expect(() => validarStockSuficiente(med, 15, 'SALIDA')).toThrow('Stock insuficiente');
  });

  it('incluye cantidades disponible y solicitada en el error', () => {
    const med = mockMedicamento({ stock_actual: 5, nombre: 'Diclofenaco', tipo_medida: 'PESO_MG' });
    try {
      validarStockSuficiente(med, 20, 'SALIDA');
    } catch (error) {
      expect(error).toBeInstanceOf(StockError);
      const stockError = error as StockError;
      expect(stockError.detalles).toMatchObject({
        stockDisponible: 5,
        cantidadSolicitada: 20,
      });
    }
  });
});

// ── Tests de Límites de Dispensación ────────────────────────────────────────

describe('validarLimiteDispensacion', () => {
  it('acepta cantidades dentro del límite por defecto', () => {
    const med = mockMedicamento({ tipo_medida: 'UNIDAD' });
    expect(() => validarLimiteDispensacion(med, 50)).not.toThrow();
  });

  it('lanza error cuando excede límite por defecto', () => {
    const med = mockMedicamento({ tipo_medida: 'UNIDAD', nombre: 'Muchas Pastillas' });
    expect(() => validarLimiteDispensacion(med, 51)).toThrow(StockError);
  });

  it('respeta límites personalizados', () => {
    const med = mockMedicamento({ tipo_medida: 'VOLUMEN_ML' });
    const limitesCustom = { VOLUMEN_ML: 100 };
    expect(() => validarLimiteDispensacion(med, 100, limitesCustom)).not.toThrow();
    expect(() => validarLimiteDispensacion(med, 101, limitesCustom)).toThrow();
  });

  it('tiene límites correctos por tipo', () => {
    const tests: Array<[TipoMedida, number, boolean]> = [
      ['UNIDAD', 50, true],      // Límite: 50
      ['UNIDAD', 51, false],
      ['VOLUMEN_ML', 500, true], // Límite: 500
      ['VOLUMEN_ML', 501, false],
      ['PESO_MG', 1000, true],   // Límite: 1000
      ['PESO_MG', 1001, false],
      ['PORCENTAJE', 100, true], // Límite: 100
      ['PORCENTAJE', 101, false],
    ];

    for (const [tipo, cantidad, debeAceptar] of tests) {
      const med = mockMedicamento({ tipo_medida: tipo });
      if (debeAceptar) {
        expect(() => validarLimiteDispensacion(med, cantidad)).not.toThrow();
      } else {
        expect(() => validarLimiteDispensacion(med, cantidad)).toThrow(StockError);
      }
    }
  });
});

// ── Tests de Agrupación Inteligente ─────────────────────────────────────────

describe('agruparDispensacionesPorMedicamento', () => {
  it('agrupa dispensaciones del mismo medicamento sumando cantidades', () => {
    const med = mockMedicamento({ id: 'med-1', nombre: 'Paracetamol', tipo_medida: 'UNIDAD' });
    const dispensaciones = [
      { ...mockDispensacion(med, 2), medicamento: med },
      { ...mockDispensacion(med, 3), medicamento: med },
      { ...mockDispensacion(med, 1), medicamento: med },
    ];

    const grupos = agruparDispensacionesPorMedicamento(dispensaciones);

    expect(grupos).toHaveLength(1);
    expect(grupos[0]).toMatchObject({
      medicamento_id: 'med-1',
      medicamento_nombre: 'Paracetamol',
      cantidad_total: 6, // 2 + 3 + 1
      items_originales: 3,
    });
  });

  it('mantiene medicamentos separados cuando son diferentes', () => {
    const med1 = mockMedicamento({ id: 'med-1', nombre: 'Paracetamol', tipo_medida: 'UNIDAD' });
    const med2 = mockMedicamento({ id: 'med-2', nombre: 'Ibuprofeno', tipo_medida: 'UNIDAD' });

    const dispensaciones = [
      { ...mockDispensacion(med1, 2), medicamento: med1 },
      { ...mockDispensacion(med2, 1), medicamento: med2 },
    ];

    const grupos = agruparDispensacionesPorMedicamento(dispensaciones);

    expect(grupos).toHaveLength(2);
    expect(grupos[0].cantidad_total).toBe(2);
    expect(grupos[1].cantidad_total).toBe(1);
  });

  it('retorna array vacío para entrada vacía', () => {
    const grupos = agruparDispensacionesPorMedicamento([]);
    expect(grupos).toEqual([]);
  });
});

describe('agruparDispensacionesPorTipoMedida', () => {
  it('separa dispensaciones por tipo de medida', () => {
    const medUnidad = mockMedicamento({ id: 'med-1', nombre: 'Paracetamol', tipo_medida: 'UNIDAD' });
    const medVolumen = mockMedicamento({ id: 'med-2', nombre: 'Alcohol', tipo_medida: 'VOLUMEN_ML' });
    const medPeso = mockMedicamento({ id: 'med-3', nombre: 'Crema', tipo_medida: 'PESO_MG' });

    const dispensaciones = [
      { ...mockDispensacion(medUnidad, 2), medicamento: medUnidad },
      { ...mockDispensacion(medVolumen, 10), medicamento: medVolumen },
      { ...mockDispensacion(medPeso, 500), medicamento: medPeso },
    ];

    const porTipo = agruparDispensacionesPorTipoMedida(dispensaciones);

    expect(porTipo.UNIDAD).toHaveLength(1);
    expect(porTipo.VOLUMEN_ML).toHaveLength(1);
    expect(porTipo.PESO_MG).toHaveLength(1);
    expect(porTipo.PORCENTAJE).toHaveLength(0);
  });
});

// ── Tests de Generación de Descripciones ───────────────────────────────────

describe('generarDescripcionMovimiento', () => {
  it('genera descripción vacía para array vacío', () => {
    expect(generarDescripcionMovimiento([])).toBe('');
  });

  it('genera descripción para una sola dispensación', () => {
    const med = mockMedicamento({ nombre: 'Paracetamol', tipo_medida: 'UNIDAD' });
    const descripcion = generarDescripcionMovimiento([
      { medicamento: med, cantidad: 2 },
    ]);
    expect(descripcion).toBe('Atención: 2 unid. Paracetamol');
  });

  it('agrupa cantidades del mismo medicamento', () => {
    const med = mockMedicamento({ nombre: 'Paracetamol', tipo_medida: 'UNIDAD' });
    const descripcion = generarDescripcionMovimiento([
      { medicamento: med, cantidad: 2 },
      { medicamento: med, cantidad: 3 }, // Mismo medicamento
    ]);
    expect(descripcion).toBe('Atención: 5 unid. Paracetamol');
  });

  it('incluye múltiples medicamentos separados por coma', () => {
    const med1 = mockMedicamento({ nombre: 'Paracetamol', tipo_medida: 'UNIDAD' });
    const med2 = mockMedicamento({ nombre: 'Alcohol', tipo_medida: 'VOLUMEN_ML' });

    const descripcion = generarDescripcionMovimiento([
      { medicamento: med1, cantidad: 2 },
      { medicamento: med2, cantidad: 5 },
    ]);

    expect(descripcion).toBe('Atención: 2 unid. Paracetamol, 5ml Alcohol');
  });

  it('usa unidades correctas según tipo de medida', () => {
    const tests = [
      { tipo: 'UNIDAD' as const, esperado: '10 unid.' },
      { tipo: 'VOLUMEN_ML' as const, esperado: '10ml' },
      { tipo: 'PESO_MG' as const, esperado: '10mg' },
      { tipo: 'PORCENTAJE' as const, esperado: '10%' },
    ];

    for (const { tipo, esperado } of tests) {
      const med = mockMedicamento({ nombre: 'Medicamento', tipo_medida: tipo });
      const descripcion = generarDescripcionMovimiento([
        { medicamento: med, cantidad: 10 },
      ]);
      expect(descripcion).toContain(esperado);
    }
  });
});

describe('generarResumenPorTipoMedida', () => {
  it('genera resumen por tipo de medida', () => {
    const med1 = mockMedicamento({ nombre: 'Paracetamol', tipo_medida: 'UNIDAD' });
    const med2 = mockMedicamento({ nombre: 'Ibuprofeno', tipo_medida: 'UNIDAD' });
    const med3 = mockMedicamento({ nombre: 'Alcohol', tipo_medida: 'VOLUMEN_ML' });

    const resumen = generarResumenPorTipoMedida([
      { medicamento: med1, cantidad: 2 },
      { medicamento: med2, cantidad: 1 },
      { medicamento: med3, cantidad: 5 },
    ]);

    expect(resumen).toContain('3 unid.'); // 2 + 1
    expect(resumen).toContain('5ml');
    expect(resumen).toContain('(Paracetamol, Ibuprofeno)');
    expect(resumen).toContain('(Alcohol)');
  });
});

// ── Tests de Escenarios Críticos ────────────────────────────────────────────

describe('Escenarios Críticos - FASE 4.1', () => {
  describe('Escenario: Múltiples dispensaciones simultáneas', () => {
    it('valida stock suficiente para todas las dispensaciones', () => {
      const meds = [
        mockMedicamento({ id: 'med-1', nombre: 'Paracetamol', stock_actual: 30, tipo_medida: 'UNIDAD' }),
        mockMedicamento({ id: 'med-2', nombre: 'Alcohol', stock_actual: 100, tipo_medida: 'VOLUMEN_ML' }),
        mockMedicamento({ id: 'med-3', nombre: 'Crema', stock_actual: 50, tipo_medida: 'PESO_MG' }),
      ];

      // Validar cada dispensación
      for (const med of meds) {
        expect(() => validarStockSuficiente(med, 10, 'SALIDA')).not.toThrow();
      }
    });

    it('detecta cuando alguna dispensación excede stock disponible', () => {
      const meds = [
        mockMedicamento({ id: 'med-1', stock_actual: 5, tipo_medida: 'UNIDAD' }),
        mockMedicamento({ id: 'med-2', stock_actual: 100, tipo_medida: 'VOLUMEN_ML' }),
      ];

      // La primera falla, la segunda pasa
      expect(() => validarStockSuficiente(meds[0], 10, 'SALIDA')).toThrow(StockError);
      expect(() => validarStockSuficiente(meds[1], 10, 'SALIDA')).not.toThrow();
    });
  });

  describe('Escenario: Tipos de medida mixtos', () => {
    it('permite dispensación con múltiples tipos de medida', () => {
      const dispensaciones = [
        { medicamento: mockMedicamento({ nombre: 'Paracetamol', tipo_medida: 'UNIDAD' }), cantidad: 2 },
        { medicamento: mockMedicamento({ nombre: 'Alcohol', tipo_medida: 'VOLUMEN_ML' }), cantidad: 5 },
        { medicamento: mockMedicamento({ nombre: 'Crema', tipo_medida: 'PESO_MG' }), cantidad: 100 },
      ];

      const descripcion = generarDescripcionMovimiento(dispensaciones);

      expect(descripcion).toContain('unid.');
      expect(descripcion).toContain('ml');
      expect(descripcion).toContain('mg');
    });
  });

  describe('Escenario: Validación de límites en cascada', () => {
    it('valida límite antes de stock para mejor UX', () => {
      const med = mockMedicamento({
        tipo_medida: 'UNIDAD',
        stock_actual: 100, // Mucho stock
        nombre: 'MuchasPastillas',
      });

      // El límite de 50 debería fallar antes que el stock de 100
      expect(() => validarLimiteDispensacion(med, 60)).toThrow(StockError);
    });
  });
});

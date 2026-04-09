/**
 * @module features/inventario/types
 *
 * Tipos del módulo Inventario (Medicamentos + Movimientos de Stock).
 * Alineados con el esquema SQL real de Supabase.
 * BaseEntity y SyncStatus se importan desde el núcleo — NO redefinir aquí.
 */
import { BaseEntity } from '@/core/db/dexie/types';

// ── Enumeraciones ──────────────────────────────────────────────────────────

/** Tipos de movimiento de stock — mapea con el CHECK SQL `tipo = ANY(ARRAY['ENTRADA','SALIDA'])`. */
export type TipoMovimiento = 'ENTRADA' | 'SALIDA';

// Re-exportar desde core para compatibilidad con importadores existentes.
export type { BaseEntity, SyncStatus } from '@/core/db/dexie/types';

// ── Entidades ──────────────────────────────────────────────────────────────

/**
 * Medicamento — mapea 1:1 con `public.medicamentos` en Supabase.
 *
 * Campos gestionados automáticamente por `useDexieCrud`:
 *   id, business_id, creado_at, activo, actualizado_at, sync_status
 *
 * Nota: `stock_actual` se mantiene localmente (calculado desde movimientos).
 * El trigger SQL en Supabase actualiza este campo automáticamente en el servidor.
 */
export interface Medicamento extends BaseEntity {
  /** Multi-tenancy: FK a public.instituciones */
  business_id: string;
  nombre: string;
  descripcion?: string;
  /** Unidad de medida: 'unidad', 'ml', 'mg', 'comprimido', etc. */
  unidad_medida: string;
  /** Tipo de medida para lógica de inventario mixto */
  tipo_medida: 'UNIDAD' | 'VOLUMEN_ML' | 'PESO_MG' | 'PORCENTAJE';
  /** Presentación comercial: "Caja x 20", "Frasco 500ml" */
  presentacion?: string;
  /** Ubicación física en el tópico: p.ej. "Anaquel A-3" */
  anaquel?: string;
  /** Stock real calculado (suma entradas − salidas) */
  stock_actual: number;
  /** Umbral de alerta: se notifica cuando stock_actual < stock_minimo */
  stock_minimo: number;
  imagen_url?: string;
  creado_at: string;
  activo: number; // 0 | 1 para indexación
}

/**
 * MovimientoStock — mapea 1:1 con `public.movimientos_stock` en Supabase.
 *
 * - ENTRADA: reposición manual (compra/donación).
 * - SALIDA:  dispensación durante una atención médica.
 */
export interface MovimientoStock extends BaseEntity {
  /** Multi-tenancy: FK a public.instituciones */
  business_id: string;
  medicamento_id: string;
  /** FK a atenciones — null si es una entrada manual de inventario */
  atencion_id?: string | null;
  tipo: TipoMovimiento;
  cantidad: number;
  /** Tipo de medida para compatibilidad con medicamento.tipo_medida */
  tipo_medida?: 'UNIDAD' | 'VOLUMEN_ML' | 'PESO_MG' | 'PORCENTAJE';
  /** Descripción generada automáticamente para movimientos consolidados */
  descripcion_movimiento?: string;
  fecha_movimiento: string; // ISO string
}

// ── DTOs / Form types ──────────────────────────────────────────────────────

/**
 * Tipo para el formulario de creación/edición de medicamentos.
 */
export type MedicamentoFormData = Omit<
  Medicamento,
  'id' | 'business_id' | 'creado_at' | 'activo' | 'sync_status' | 'actualizado_at' | 'deleted_at'
>;

/**
 * Tipo para registrar un movimiento de stock (entrada o salida).
 */
export type MovimientoFormData = Omit<
  MovimientoStock,
  'id' | 'business_id' | 'creado_at' | 'sync_status' | 'actualizado_at' | 'deleted_at'
>;

// ── Tipos de Dispensación (Nuevos para Atenciones Múltiples) ───────────────────

/**
 * Tipo de medida para lógica de inventario mixta.
 * Permite distinguir entre pastillas (unidades) y líquidos (volúmenes).
 */
export type TipoMedida = 'UNIDAD' | 'VOLUMEN_ML' | 'PESO_MG' | 'PORCENTAJE';

/**
 * Dispensación de medicamento en una atención.
 * Usado para representar cada medicamento dispensado en una atención múltiple.
 */
export interface DispensacionMedicamento {
  /** FK al medicamento */
  medicamento_id: string;
  /** Cantidad dispensada */
  cantidad: number;
  /** Tipo de medida (debe coincidir con medicamento.tipo_medida) */
  tipo_medida: TipoMedida;
  /** Descripción de cómo se entregó: "2 pastillas", "5ml en vasito" */
  presentacion_entregada?: string;
}

/**
 * Configuración de visualización por tipo de medida.
 * Para UI que muestra unidades apropiadas según el tipo.
 */
export interface ConfiguracionMedida {
  tipo: TipoMedida;
  etiqueta: string;
  unidad: string;
  icono: string;
  ejemplos: string[];
}

/**
 * Configuraciones predefinidas para cada tipo de medida.
 */
export const CONFIGURACIONES_MEDIDA: Record<TipoMedida, ConfiguracionMedida> = {
  UNIDAD: {
    tipo: 'UNIDAD',
    etiqueta: 'Unidades',
    unidad: 'unid.',
    icono: '💊',
    ejemplos: ['pastillas', 'cápsulas', 'comprimidos', 'tabletas']
  },
  VOLUMEN_ML: {
    tipo: 'VOLUMEN_ML',
    etiqueta: 'Volumen',
    unidad: 'ml',
    icono: '🧪',
    ejemplos: ['jarabe', 'solución', 'inyectable', 'gotas']
  },
  PESO_MG: {
    tipo: 'PESO_MG',
    etiqueta: 'Peso',
    unidad: 'mg',
    icono: '⚖️',
    ejemplos: ['polvo', 'gránulos', 'crema tópica']
  },
  PORCENTAJE: {
    tipo: 'PORCENTAJE',
    etiqueta: 'Porcentaje',
    unidad: '%',
    icono: '📊',
    ejemplos: ['alcohol', 'antiséptico', 'solución concentrada']
  }
};

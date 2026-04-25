import { BaseEntity } from '@/core/db/dexie/types';

export type TipoMovimiento = 'ENTRADA' | 'SALIDA';
export type TipoMedida = 'UNIDAD' | 'VOLUMEN_ML' | 'PESO_MG' | 'PORCENTAJE';

export interface Medicamento extends BaseEntity {
  business_id: string;
  nombre: string;
  descripcion?: string;
  unidad_medida: string;
  tipo_medida: TipoMedida;
  presentacion?: string;
  anaquel?: string;
  stock_actual: number;
  stock_minimo: number;
  imagen_url?: string;
  creado_at: string;
  activo: number;
}

export interface MovimientoStock extends BaseEntity {
  business_id: string;
  medicamento_id: string;
  atencion_id?: string | null;
  tipo: TipoMovimiento;
  cantidad: number;
  tipo_medida: TipoMedida;
  descripcion_movimiento?: string;
  fecha_movimiento: string;
  fecha_vencimiento?: string | null;
}

export type MedicamentoFormData = Omit<
  Medicamento,
  'id' | 'business_id' | 'creado_at' | 'activo' | 'sync_status' | 'actualizado_at' | 'deleted_at'
>;

export type MovimientoFormData = Omit<
  MovimientoStock,
  'id' | 'business_id' | 'creado_at' | 'sync_status' | 'actualizado_at' | 'deleted_at'
>;

export interface DispensacionMedicamento {
  medicamento_id: string;
  cantidad: number;
  tipo_medida: TipoMedida;
  presentacion_entregada?: string;
}

export interface ConfiguracionMedida {
  tipo: TipoMedida;
  etiqueta: string;
  unidad: string;
  icono: string;
  ejemplos: string[];
}

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

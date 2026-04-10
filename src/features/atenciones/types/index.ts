import { BaseEntity } from '@/core/db/dexie/types';
import type { DispensacionMedicamento as DispensacionType } from '@/features/inventario/types';

export type { BaseEntity, SyncStatus } from '@/core/db/dexie/types';

// ═══════════════════════════════════════════════════════════════════════════════
// ENTIDADES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SignosVitales {
  temp: string;
  presion: string;
  saturacion: string;
}

export const SIGNOS_VITALES_VACIO: SignosVitales = {
  temp: '',
  presion: '',
  saturacion: '',
};

export interface Atencion extends BaseEntity {
  business_id: string;
  paciente_id: string;
  perfil_id: string;
  motivo_consulta: string;
  signos_vitales: SignosVitales;
  observacion?: string;
  activo: number;
  fecha_atencion: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DTOs / FORMULARIOS
// ═══════════════════════════════════════════════════════════════════════════════

export type AtencionFormData = Omit<
  Atencion,
  'id' | 'business_id' | 'perfil_id' | 'activo' | 'creado_at' | 'sync_status' | 'actualizado_at' | 'deleted_at'
>;

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS EXTENDIDOS
// ═══════════════════════════════════════════════════════════════════════════════

export type DispensacionMedicamento = DispensacionType;

export interface AtencionExtendida extends Atencion {
  dispensaciones: DispensacionMedicamento[];
}

export interface AtencionConDetalles extends Atencion {
  pacienteNombre: string;
  staffNombre: string;
}

export interface AtencionProcesada {
  atencion: Atencion;
  movimientos_generados: {
    medicamento_id: string;
    medicamento_nombre: string;
    cantidad_total: number;
    tipo_medida: string;
    descripcion_movimiento: string;
  }[];
}

export interface ConfiguracionAgrupacion {
  por_medicamento: boolean;
  por_tipo_medida: boolean;
  generar_descripciones: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPOSITORY PATTERN (Clean Architecture)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Contexto necesario para crear una atención
 * Incluye datos de autenticación y autorización
 */
export interface AtencionContext {
  businessId: string;
  perfilId: string;
}

/**
 * Resultado de la operación de crear atención
 * Incluye metadatos útiles para tracking y UI
 */
export interface AtencionResultado {
  atencionId: string;
  movimientosCreados: number;
  stockActualizado: string[];
  descripcionConsolidada?: string;
}

/**
 * Error específico de operaciones de atención
 */
export class AtencionError extends Error {
  constructor(
    message: string,
    public readonly code: 'PACIENTE_NO_ENCONTRADO' | 'STOCK_INSUFICIENTE' | 'PERFIL_NO_ENCONTRADO' | 'VALIDACION_FALLIDA',
    public readonly detalles?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AtencionError';
  }
}

/**
 * Contrato del repositorio de atenciones (Puerto en Clean Architecture)
 * Define las operaciones disponibles sin especificar implementación
 */
export interface AtencionRepository {
  /**
   * Crea una nueva atención con sus dispensaciones asociadas
   * Ejecuta todo en una transacción atómica
   * @throws {AtencionError} Si hay errores de validación
   * @throws {StockError} Si hay errores de stock
   */
  crear(
    datos: AtencionFormData,
    dispensaciones: DispensacionMedicamento[],
    contexto: AtencionContext
  ): Promise<AtencionResultado>;

  /**
   * Lista atenciones con detalles de paciente y staff
   * Útil para vistas de listado con información enriquecida
   */
  listarConDetalles(businessId: string, limite?: number): Promise<AtencionConDetalles[]>;

  /**
   * Obtiene una atención completa con sus dispensaciones
   */
  obtenerPorId(id: string): Promise<AtencionExtendida | null>;

  /**
   * Actualiza campos de una atención existente
   */
  actualizar(id: string, cambios: Partial<Atencion>, businessId: string): Promise<void>;

  /**
   * Obtiene estadísticas de atenciones por período
   */
  obtenerEstadisticas(
    businessId: string,
    dias: number
  ): Promise<{ fecha: string; cantidad: number }[]>;
}

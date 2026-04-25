import { BaseEntity } from '@/core/db/dexie/types';
import type { DispensacionMedicamento as DispensacionType } from '@/features/inventario/types';
export type { BaseEntity, SyncStatus } from '@/core/db/dexie/types';

// ───────────────────────────────────────────────────────────────────────────────
// ENTIDADES CORE
// ───────────────────────────────────────────────────────────────────────────────

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

// ───────────────────────────────────────────────────────────────────────────────
// FORM DATA TYPES
// ───────────────────────────────────────────────────────────────────────────────

export type AtencionFormData = Omit<
  Atencion,
  'id' | 'business_id' | 'perfil_id' | 'activo' | 'creado_at' | 'sync_status' | 'actualizado_at' | 'deleted_at'
>;

// ───────────────────────────────────────────────────────────────────────────────
// TIPOS EXTENDIDOS
// ───────────────────────────────────────────────────────────────────────────────

export type DispensacionMedicamento = DispensacionType;
export interface AtencionExtendida extends Atencion {
  dispensaciones: DispensacionMedicamento[];
}

export interface AtencionConDetalles extends Atencion {
  pacienteNombre: string;
  pacienteDNI: string;
  staffNombre: string;
}

export interface AtencionConDetallesExtendida extends AtencionConDetalles {
  dispensaciones: DispensacionMedicamentoConNombre[];
}

export interface DispensacionMedicamentoConNombre extends DispensacionMedicamento {
  medicamento_nombre: string;
}

// ───────────────────────────────────────────────────────────────────────────────
// REPOSITORY PATTERN (Clean Architecture)
// ───────────────────────────────────────────────────────────────────────────────

export interface AtencionContext {
  businessId: string;
  perfilId: string;
}

export interface AtencionResultado {
  atencionId: string;
  movimientosCreados: number;
  stockActualizado: string[];
  descripcionConsolidada?: string;
}

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

export interface AtencionRepository {
  crear(
    datos: AtencionFormData,
    dispensaciones: DispensacionMedicamento[],
    contexto: AtencionContext
  ): Promise<AtencionResultado>;
  listarConDetalles(businessId: string, limite?: number): Promise<AtencionConDetalles[]>;
  obtenerPorId(id: string): Promise<AtencionExtendida | null>;
  actualizar(id: string, cambios: Partial<Atencion>, businessId: string): Promise<void>;
  obtenerEstadisticas(
    businessId: string,
    dias: number
  ): Promise<{ fecha: string; cantidad: number }[]>;
}

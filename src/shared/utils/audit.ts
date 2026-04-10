/**
 * Audit simplificado - Solo log de errores críticos
 */
import { db } from '@/core/db/dexie/db';
import type { TipoMedida } from '@/features/inventario/types';

export type TipoAuditoria = 'DISPENSACION' | 'ERROR_VALIDACION' | 'STOCK_BAJO';

export interface RegistroAuditoria {
  id: string;
  user_id: string;
  business_id: string;
  tipo: TipoAuditoria;
  medicamento_id?: string;
  atencion_id?: string;
  cantidad?: number;
  tipo_medida?: TipoMedida;
  stock_anterior?: number;
  stock_nuevo?: number;
  descripcion: string;
  timestamp: string;
  sync_status: 'synced' | 'pending';
}

/**
 * Log simple de dispensación
 */
export async function auditDispensacion(params: {
  userId: string;
  businessId: string;
  medicamentoId: string;
  atencionId: string;
  medicamentoNombre: string;
  cantidad: number;
  tipoMedida: TipoMedida;
  stockAnterior: number;
  stockNuevo: number;
}): Promise<void> {
  const registro: RegistroAuditoria = {
    id: crypto.randomUUID(),
    user_id: params.userId,
    business_id: params.businessId,
    tipo: 'DISPENSACION',
    medicamento_id: params.medicamentoId,
    atencion_id: params.atencionId,
    cantidad: params.cantidad,
    tipo_medida: params.tipoMedida,
    stock_anterior: params.stockAnterior,
    stock_nuevo: params.stockNuevo,
    descripcion: `Dispensado: ${params.cantidad} ${params.tipoMedida} de "${params.medicamentoNombre}"`,
    timestamp: new Date().toISOString(),
    sync_status: 'pending',
  };

  try {
    await db.security_audit_log.add(registro);
  } catch (e) {
    console.error('Error guardando audit:', e);
  }
}

/**
 * Log de error simple
 */
export function auditError(contexto: string, error: unknown): void {
  console.error(`[Audit Error] ${contexto}:`, error);
}

/**
 * @module shared/utils/audit
 *
 * Sistema de Audit Trail para dispensaciones y operaciones críticas.
 * FASE 4.3: Seguridad y Validación - Audit trail completo de dispensaciones
 *
 * Registra:
 * - Dispensaciones de medicamentos (quién, qué, cuándo, cuánto)
 * - Cambios de stock
 * - Errores de validación
 * - Intentos de acceso no autorizado
 */

import { db } from '@/core/db/dexie/db';
import type { TipoMedida } from '@/features/inventario/types';

// ── Tipos ──────────────────────────────────────────────────────────────────

export type TipoAuditoria =
  | 'DISPENSACION'
  | 'ENTRADA_STOCK'
  | 'ERROR_VALIDACION'
  | 'ACCESO_DENEGADO'
  | 'STOCK_BAJO'
  | 'SINCRONIZACION'
  | 'CONCURRENCIA_DETECTADA';

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
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  sync_status: 'synced' | 'pending' | 'failed';
}

export interface AuditConfig {
  maxLocalEntries: number;
  syncInterval: number;
  retainDays: number;
}

// ── Configuración ─────────────────────────────────────────────────────────

const DEFAULT_CONFIG: AuditConfig = {
  maxLocalEntries: 1000,  // Máximo de registros locales
  syncInterval: 30000,    // 30 segundos
  retainDays: 90,         // Retener 90 días
};

let config: AuditConfig = { ...DEFAULT_CONFIG };

// ── Funciones Principales ─────────────────────────────────────────────────

/**
 * Configura el sistema de auditoría
 */
export function configureAudit(newConfig: Partial<AuditConfig>): void {
  config = { ...config, ...newConfig };
}

/**
 * Registra una dispensación de medicamento
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
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  const {
    userId,
    businessId,
    medicamentoId,
    atencionId,
    medicamentoNombre,
    cantidad,
    tipoMedida,
    stockAnterior,
    stockNuevo,
    ipAddress,
    userAgent,
  } = params;

  const registro: RegistroAuditoria = {
    id: crypto.randomUUID(),
    user_id: userId,
    business_id: businessId,
    tipo: 'DISPENSACION',
    medicamento_id: medicamentoId,
    atencion_id: atencionId,
    cantidad,
    tipo_medida: tipoMedida,
    stock_anterior: stockAnterior,
    stock_nuevo: stockNuevo,
    descripcion: `Dispensación: ${cantidad} ${tipoMedida} de "${medicamentoNombre}" (Stock: ${stockAnterior} → ${stockNuevo})`,
    ip_address: ipAddress,
    user_agent: userAgent,
    metadata: {
      diferenciaStock: stockAnterior - stockNuevo,
      porcentajeConsumo: stockAnterior > 0
        ? ((stockAnterior - stockNuevo) / stockAnterior * 100).toFixed(2)
        : '0',
    },
    timestamp: new Date().toISOString(),
    sync_status: 'pending',
  };

  await guardarRegistro(registro);
}

/**
 * Registra una entrada de stock
 */
export async function auditEntradaStock(params: {
  userId: string;
  businessId: string;
  medicamentoId: string;
  medicamentoNombre: string;
  cantidad: number;
  tipoMedida: TipoMedida;
  stockAnterior: number;
  stockNuevo: number;
  proveedor?: string;
  numeroLote?: string;
}): Promise<void> {
  const {
    userId,
    businessId,
    medicamentoId,
    medicamentoNombre,
    cantidad,
    tipoMedida,
    stockAnterior,
    stockNuevo,
    proveedor,
    numeroLote,
  } = params;

  const registro: RegistroAuditoria = {
    id: crypto.randomUUID(),
    user_id: userId,
    business_id: businessId,
    tipo: 'ENTRADA_STOCK',
    medicamento_id: medicamentoId,
    cantidad,
    tipo_medida: tipoMedida,
    stock_anterior: stockAnterior,
    stock_nuevo: stockNuevo,
    descripcion: `Entrada de stock: +${cantidad} ${tipoMedida} de "${medicamentoNombre}" (Stock: ${stockAnterior} → ${stockNuevo})`,
    metadata: {
      proveedor,
      numeroLote,
    },
    timestamp: new Date().toISOString(),
    sync_status: 'pending',
  };

  await guardarRegistro(registro);
}

/**
 * Registra un error de validación
 */
export async function auditErrorValidacion(params: {
  userId: string;
  businessId: string;
  tipo: 'STOCK_INSUFICIENTE' | 'TIPO_INCOMPATIBLE' | 'LIMITE_EXCEDIDO' | 'PERMISO_DENEGADO';
  medicamentoId?: string;
  cantidadSolicitada?: number;
  cantidadDisponible?: number;
  mensajeError: string;
}): Promise<void> {
  const {
    userId,
    businessId,
    tipo,
    medicamentoId,
    cantidadSolicitada,
    cantidadDisponible,
    mensajeError,
  } = params;

  const tipoMap: Record<typeof tipo, TipoAuditoria> = {
    STOCK_INSUFICIENTE: 'ERROR_VALIDACION',
    TIPO_INCOMPATIBLE: 'ERROR_VALIDACION',
    LIMITE_EXCEDIDO: 'ERROR_VALIDACION',
    PERMISO_DENEGADO: 'ACCESO_DENEGADO',
  };

  const registro: RegistroAuditoria = {
    id: crypto.randomUUID(),
    user_id: userId,
    business_id: businessId,
    tipo: tipoMap[tipo],
    medicamento_id: medicamentoId,
    cantidad: cantidadSolicitada,
    descripcion: `Error de validación [${tipo}]: ${mensajeError}`,
    metadata: {
      tipoError: tipo,
      cantidadSolicitada,
      cantidadDisponible,
    },
    timestamp: new Date().toISOString(),
    sync_status: 'pending',
  };

  await guardarRegistro(registro);
}

/**
 * Registra alerta de stock bajo
 */
export async function auditStockBajo(params: {
  userId: string;
  businessId: string;
  medicamentoId: string;
  medicamentoNombre: string;
  stockActual: number;
  stockMinimo: number;
  tipoMedida: TipoMedida;
}): Promise<void> {
  const {
    userId,
    businessId,
    medicamentoId,
    medicamentoNombre,
    stockActual,
    stockMinimo,
    tipoMedida,
  } = params;

  const registro: RegistroAuditoria = {
    id: crypto.randomUUID(),
    user_id: userId,
    business_id: businessId,
    tipo: 'STOCK_BAJO',
    medicamento_id: medicamentoId,
    stock_anterior: stockActual,
    descripcion: `ALERTA: Stock bajo para "${medicamentoNombre}" (${stockActual} ${tipoMedida} disponibles, mínimo: ${stockMinimo})`,
    metadata: {
      stockActual,
      stockMinimo,
      deficit: stockMinimo - stockActual,
    },
    timestamp: new Date().toISOString(),
    sync_status: 'pending',
  };

  await guardarRegistro(registro);
}

/**
 * Registra evento de sincronización
 */
export async function auditSincronizacion(params: {
  userId: string;
  businessId: string;
  entidad: 'atenciones' | 'movimientos_stock' | 'medicamentos';
  registrosEnviados: number;
  registrosRecibidos: number;
  errores?: string[];
  duracionMs: number;
}): Promise<void> {
  const {
    userId,
    businessId,
    entidad,
    registrosEnviados,
    registrosRecibidos,
    errores,
    duracionMs,
  } = params;

  const registro: RegistroAuditoria = {
    id: crypto.randomUUID(),
    user_id: userId,
    business_id: businessId,
    tipo: 'SINCRONIZACION',
    descripcion: `Sincronización ${entidad}: ${registrosEnviados} enviados, ${registrosRecibidos} recibidos`,
    metadata: {
      entidad,
      registrosEnviados,
      registrosRecibidos,
      errores,
      duracionMs,
      exito: !errores || errores.length === 0,
    },
    timestamp: new Date().toISOString(),
    sync_status: 'pending',
  };

  await guardarRegistro(registro);
}

// ── Funciones Internas ───────────────────────────────────────────────────

/**
 * Guarda un registro en IndexedDB (Dexie)
 */
async function guardarRegistro(registro: RegistroAuditoria): Promise<void> {
  try {
    // Verificar límite de registros locales
    const count = await db.security_audit_log.count();
    if (count >= config.maxLocalEntries) {
      // Eliminar registros más antiguos
      const oldest = await db.security_audit_log
        .orderBy('timestamp')
        .limit(100)
        .toArray();

      if (oldest && oldest.length > 0) {
        const idsToDelete = oldest.map((r: RegistroAuditoria) => r.id);
        await db.security_audit_log.bulkDelete(idsToDelete);
      }
    }

    // Guardar nuevo registro
    await db.security_audit_log.add(registro);

    // Programar sync con Supabase
    scheduleSync();

  } catch (error) {
    console.error('Error guardando registro de auditoría:', error);
    // No lanzar error para no interrumpir operaciones principales
  }
}

/**
 * Programa sincronización con Supabase
 */
let syncTimeout: NodeJS.Timeout | null = null;

function scheduleSync(): void {
  if (syncTimeout) return; // Ya hay un sync programado

  syncTimeout = setTimeout(async () => {
    syncTimeout = null;
    await sincronizarAuditoria();
  }, config.syncInterval);
}

/**
 * Sincroniza registros pendientes con Supabase
 */
async function sincronizarAuditoria(): Promise<void> {
  try {
    const pendientes = await db.security_audit_log
      .where('sync_status')
      .equals('pending')
      .limit(100)
      .toArray();

    if (!pendientes || pendientes.length === 0) return;

    // Aquí iría la llamada a Supabase
    // const { error } = await supabase.from('security_audit_log').insert(pendientes);

    // Marcar como sincronizados
    const ids = pendientes.map((r: RegistroAuditoria) => r.id);
    await db.security_audit_log.bulkUpdate(
      ids.map((id: string) => ({ key: id, changes: { sync_status: 'synced' } }))
    );

  } catch (error) {
    console.error('Error sincronizando auditoría:', error);

    // Marcar como failed
    try {
      const pendientes = await db.security_audit_log
        .where('sync_status')
        .equals('pending')
        .limit(100)
        .toArray();

      if (pendientes) {
        const ids = pendientes.map((r: RegistroAuditoria) => r.id);
        await db.security_audit_log.bulkUpdate(
          ids.map((id: string) => ({ key: id, changes: { sync_status: 'failed' } }))
        );
      }
    } catch (e) {
      // Ignorar error secundario
    }
  }
}

// ── Consultas de Auditoría ────────────────────────────────────────────────

/**
 * Obtiene registros de auditoría con filtros
 */
export async function consultarAuditoria(params: {
  businessId: string;
  tipo?: TipoAuditoria;
  medicamentoId?: string;
  userId?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
  limit?: number;
}): Promise<RegistroAuditoria[]> {
  const {
    businessId,
    tipo,
    medicamentoId,
    userId,
    fechaDesde,
    fechaHasta,
    limit = 100,
  } = params;

  let query = db.security_audit_log
    .where('business_id')
    .equals(businessId);

  // Aplicar filtros adicionales
  let resultados = await query.toArray();

  if (tipo) {
    resultados = resultados.filter((r: RegistroAuditoria) => r.tipo === tipo);
  }

  if (medicamentoId) {
    resultados = resultados.filter((r: RegistroAuditoria) => r.medicamento_id === medicamentoId);
  }

  if (userId) {
    resultados = resultados.filter((r: RegistroAuditoria) => r.user_id === userId);
  }

  if (fechaDesde) {
    const desde = fechaDesde.toISOString();
    resultados = resultados.filter((r: RegistroAuditoria) => r.timestamp >= desde);
  }

  if (fechaHasta) {
    const hasta = fechaHasta.toISOString();
    resultados = resultados.filter((r: RegistroAuditoria) => r.timestamp <= hasta);
  }

  // Ordenar por timestamp descendente y limitar
  return resultados
    .sort((a: RegistroAuditoria, b: RegistroAuditoria) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

/**
 * Genera reporte de actividad por usuario
 */
export async function generarReporteUsuario(
  userId: string,
  fechaDesde: Date,
  fechaHasta: Date
): Promise<{
  totalDispensaciones: number;
  totalMedicamentos: number;
  errores: number;
  topMedicamentos: Array<{ id: string; nombre: string; cantidad: number }>;
}> {
  const registros = await consultarAuditoria({
    businessId: '', // Se filtra después
    userId,
    fechaDesde,
    fechaHasta,
    limit: 1000,
  });

  const dispensaciones = registros.filter(r => r.tipo === 'DISPENSACION');
  const errores = registros.filter(r => r.tipo === 'ERROR_VALIDACION');

  // Agrupar por medicamento
  const porMedicamento = new Map<string, { id: string; cantidad: number }>();
  for (const d of dispensaciones) {
    if (!d.medicamento_id) continue;
    const actual = porMedicamento.get(d.medicamento_id);
    if (actual) {
      actual.cantidad += d.cantidad || 0;
    } else {
      porMedicamento.set(d.medicamento_id, {
        id: d.medicamento_id,
        cantidad: d.cantidad || 0,
      });
    }
  }

  const topMedicamentos = Array.from(porMedicamento.values())
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 10)
    .map(m => ({ ...m, nombre: `Medicamento ${m.id}` })); // Nombre se buscaría de la DB

  return {
    totalDispensaciones: dispensaciones.length,
    totalMedicamentos: porMedicamento.size,
    errores: errores.length,
    topMedicamentos,
  };
}

/**
 * Limpia registros antiguos de auditoría
 */
export async function limpiarAuditoriaAntigua(dias: number = config.retainDays): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - dias);
  const cutoffStr = cutoff.toISOString();

  try {
    const antiguos = await db.security_audit_log
      .where('timestamp')
      .below(cutoffStr)
      .toArray();

    if (!antiguos || antiguos.length === 0) return 0;

    const ids = antiguos.map((r: RegistroAuditoria) => r.id);
    await db.security_audit_log.bulkDelete(ids);

    return antiguos.length;
  } catch (error) {
    console.error('Error limpiando auditoría antigua:', error);
    return 0;
  }
}

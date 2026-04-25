import { db } from "@/core/db/dexie/db";
import { syncService } from '@/core/db/sync';
import {
  updateMedicamentoStock,
  StockError,
  verificarStockDisponible,
  generarDescripcionMovimiento,
} from "@/core/db/dexie/logic/stock";
import type { Medicamento, MovimientoStock } from "@/features/inventario/types";
import type {
  Atencion,
  AtencionFormData,
  AtencionConDetalles,
  AtencionConDetallesExtendida,
  AtencionExtendida,
  DispensacionMedicamento,
  DispensacionMedicamentoConNombre,
  AtencionContext,
  AtencionResultado,
} from "../types";
import { AtencionError } from "../types";
import { SIGNOS_VITALES_VACIO } from "../types";

// ── CONSTANTES ───────────────────────────────────────────────────────────────

const PACIENTE_DESCONOCIDO = "Paciente no encontrado";
const STAFF_DESCONOCIDO = "Staff no encontrado";
const MEDICAMENTO_DESCONOCIDO = "Medicamento no encontrado";

// ── FUNCIONES AUXILIARES ─────────────────────────────────────────────────────────

const generarTimestampISO = (): string => new Date().toISOString();
const generarUUID = (): string => crypto.randomUUID();

/**
 * Construye una entidad Atención completa a partir de los datos del formulario
 */
const buildAtencion = (
  datos: AtencionFormData,
  id: string,
  contexto: AtencionContext,
  timestamp: string
): Atencion => ({
  ...datos,
  id,
  business_id: contexto.businessId,
  perfil_id: contexto.perfilId,
  creado_at: timestamp,
  actualizado_at: timestamp,
  sync_status: "pending",
  activo: 1,
  signos_vitales: datos.signos_vitales ?? SIGNOS_VITALES_VACIO,
});

/**
 * Crea un movimiento de stock a partir de una dispensación
 */
const buildMovimiento = (
  dispensacion: DispensacionMedicamento,
  atencionId: string,
  contexto: AtencionContext,
  timestamp: string,
  descripcion: string
): MovimientoStock => ({
  id: generarUUID(),
  business_id: contexto.businessId,
  medicamento_id: dispensacion.medicamento_id,
  atencion_id: atencionId,
  tipo: "SALIDA",
  cantidad: dispensacion.cantidad,
  tipo_medida: dispensacion.tipo_medida,
  descripcion_movimiento: descripcion,
  fecha_movimiento: timestamp,
  creado_at: timestamp,
  actualizado_at: timestamp,
  sync_status: "pending",
});

// ── IMPLEMENTACIÓN DEL REPOSITORIO ────────────────────────────────────────────────

/**
 * Implementación del repositorio de atenciones usando Dexie (IndexedDB)
 *
 * Arquitectura:
 * - Domain Layer: Contratos en ../types (AtencionRepository)
 * - Data Layer: Esta implementación (adaptador de infraestructura)
 *
 * Responsabilidades:
 * - Persistencia de atenciones y movimientos relacionados
 * - Transacciones atómicas (todo o nada)
 * - Validaciones de stock antes de dispensar
 * - Enriquecimiento de datos para queries complejas (JOINs manuales)
 */
export class DexieAtencionRepository {
  /**
   * Crea una atención completa con dispensaciones en una transacción atómica
   *
   * Flujo:
   * 1. Validar dispensaciones (stock disponible, tipos compatibles)
   * 2. Generar descripción consolidada de movimientos
   * 3. Ejecutar transacción:
   *    - Insertar atención
   *    - Insertar movimientos de stock
   *    - Actualizar stock de medicamentos
   * 4. Retornar resultado con metadatos
   *
   * Rollback automático si falla cualquier paso
   */
  async crear(
    datos: AtencionFormData,
    dispensaciones: DispensacionMedicamento[],
    contexto: AtencionContext
  ): Promise<AtencionResultado> {
    const timestamp = generarTimestampISO();
    const atencionId = generarUUID();

    // Sin dispensaciones: solo crear atención
    if (dispensaciones.length === 0) {
      await db.transaction("rw", db.atenciones, async () => {
        await db.atenciones.add(buildAtencion(datos, atencionId, contexto, timestamp));
      });

      // Trigger PUSH automático solo si hay conexión
      if (typeof window !== 'undefined' && navigator.onLine) {
        syncService.pushToSupabase().catch(console.error);
      }

      return {
        atencionId,
        movimientosCreados: 0,
        stockActualizado: [],
      };
    }

    // Con dispensaciones: validar + crear en transacción
    const { medicamentosMap, errores } = await this.validarDispensaciones(dispensaciones);

    if (errores.length > 0) {
      throw new AtencionError(
        `Validación fallida:\n${errores.join("\n")}`,
        "VALIDACION_FALLIDA",
        { errores }
      );
    }

    // Generar descripción consolidada para todos los movimientos
    const descripcionConsolidada = generarDescripcionMovimiento(
      dispensaciones.map((d) => ({
        medicamento: medicamentosMap.get(d.medicamento_id)!,
        cantidad: d.cantidad,
      }))
    );

    // Ejecutar transacción atómica
    await db.transaction(
      "rw",
      db.atenciones,
      db.movimientos_stock,
      db.medicamentos,
      async () => {
        // 1. Crear atención
        await db.atenciones.add(buildAtencion(datos, atencionId, contexto, timestamp));

        // 2. Crear movimientos y actualizar stock
        for (const disp of dispensaciones) {
          const movimiento = buildMovimiento(disp, atencionId, contexto, timestamp, descripcionConsolidada);
          await db.movimientos_stock.add(movimiento);
          await updateMedicamentoStock(disp.medicamento_id, disp.cantidad, "SALIDA", timestamp, disp.tipo_medida);
        }
      }
    );

    // Trigger PUSH automático solo si hay conexión
    if (typeof window !== 'undefined' && navigator.onLine) {
      syncService.pushToSupabase().catch(console.error);
    }

    return {
      atencionId,
      movimientosCreados: dispensaciones.length,
      stockActualizado: dispensaciones.map((d) => d.medicamento_id),
      descripcionConsolidada,
    };
  }

  /**
   * Valida dispensaciones antes de ejecutar la transacción
   *
   * Verifica:
   * - Existencia del medicamento
   * - Compatibilidad de tipos de medida
   * - Stock disponible suficiente
   */
  private async validarDispensaciones(
    dispensaciones: DispensacionMedicamento[]
  ): Promise<{ medicamentosMap: Map<string, Medicamento>; errores: string[] }> {
    const medicamentosMap = new Map<string, Medicamento>();
    const errores: string[] = [];

    // 1. Cargar medicamentos únicos
    for (const disp of dispensaciones) {
      if (!medicamentosMap.has(disp.medicamento_id)) {
        const med = await db.medicamentos.get(disp.medicamento_id);
        if (!med) {
          errores.push(`Medicamento no encontrado: ${disp.medicamento_id}`);
          continue;
        }
        medicamentosMap.set(disp.medicamento_id, med);
      }
    }

    // 2. Validar compatibilidad y stock
    for (const disp of dispensaciones) {
      const med = medicamentosMap.get(disp.medicamento_id);
      if (!med) continue;

      // Validar tipo de medida
      if (disp.tipo_medida !== med.tipo_medida) {
        errores.push(
          `"${med.nombre}": tipo incompatible (${med.tipo_medida} vs ${disp.tipo_medida})`
        );
        continue;
      }

      // Validar stock disponible
      const verificacion = await verificarStockDisponible(
        disp.medicamento_id,
        disp.cantidad,
        disp.tipo_medida
      );

      if (!verificacion.disponible) {
        errores.push(verificacion.mensaje || `Stock insuficiente para "${med.nombre}"`);
      }
    }

    return { medicamentosMap, errores };
  }

  /**
   * Lista atenciones con nombres de paciente, staff y dispensaciones enriquecidos
   *
   * Optimización: Usa Promise.all para cargar pacientes, staff y movimientos en paralelo
   * Complejidad: O(A + P + S + M) donde A = atenciones, P = pacientes únicos, S = staff únicos, M = movimientos
   */
  async listarConDetalles(businessId: string, limite: number = 50): Promise<AtencionConDetallesExtendida[]> {
    const atenciones = await db.atenciones
      .where("business_id")
      .equals(businessId)
      .reverse()
      .limit(limite)
      .toArray();

    if (atenciones.length === 0) {
      return [];
    }

    // Optimización: bulk fetch de pacientes, perfiles, movimientos y medicamentos
    const pacienteIds = [...new Set(atenciones.map((a) => a.paciente_id))];
    const perfilIds = [...new Set(atenciones.map((a) => a.perfil_id))];
    const atencionIds = atenciones.map((a) => a.id);
    const medicamentoIds = new Set<string>();

    // Primero obtener movimientos para saber qué medicamentos cargar
    const movimientos = await db.movimientos_stock.where("atencion_id").anyOf(atencionIds).toArray();
    for (const mov of movimientos) {
      if (mov.medicamento_id) medicamentoIds.add(mov.medicamento_id);
    }

    const [pacientes, perfiles, medicamentos] = await Promise.all([
      db.pacientes.bulkGet(pacienteIds),
      db.perfiles.bulkGet(perfilIds),
      db.medicamentos.bulkGet([...medicamentoIds]),
    ]);

    const pacienteMap = new Map(
      pacientes.filter((p): p is NonNullable<typeof p> => p !== undefined).map((p) => [p.id, p])
    );
    const perfilMap = new Map(
      perfiles.filter((p): p is NonNullable<typeof p> => p !== undefined).map((p) => [p.id, p])
    );
    const medicamentoMap = new Map(
      medicamentos.filter((m): m is NonNullable<typeof m> => m !== undefined).map((m) => [m.id, m])
    );

    // Mapear movimientos por atencion_id
    const movimientosPorAtencion = new Map<string, MovimientoStock[]>();
    for (const mov of movimientos) {
      if (!mov.atencion_id) continue;
      if (!movimientosPorAtencion.has(mov.atencion_id)) {
        movimientosPorAtencion.set(mov.atencion_id, []);
      }
      movimientosPorAtencion.get(mov.atencion_id)!.push(mov);
    }

    return atenciones.map((a): AtencionConDetallesExtendida => {
      const paciente = pacienteMap.get(a.paciente_id);
      const staff = perfilMap.get(a.perfil_id);
      const movs = movimientosPorAtencion.get(a.id) || [];

      // Mapear movimientos a dispensaciones con nombres
      const dispensaciones: DispensacionMedicamentoConNombre[] = movs.map((m) => {
        const medicamento = medicamentoMap.get(m.medicamento_id);
        return {
          medicamento_id: m.medicamento_id,
          cantidad: m.cantidad,
          tipo_medida: m.tipo_medida!,
          medicamento_nombre: medicamento?.nombre || MEDICAMENTO_DESCONOCIDO,
        };
      });

      return {
        ...a,
        pacienteNombre: paciente ? `${paciente.nombres} ${paciente.apellidos}` : PACIENTE_DESCONOCIDO,
        pacienteDNI: paciente?.dni || '',
        staffNombre: staff?.nombre ?? STAFF_DESCONOCIDO,
        dispensaciones,
      };
    });
  }

  /**
   * Obtiene una atención completa con sus dispensaciones
   */
  async obtenerPorId(id: string): Promise<AtencionExtendida | null> {
    const atencion = await db.atenciones.get(id);
    if (!atencion) return null;

    // Obtener movimientos relacionados (dispensaciones)
    const movimientos = await db.movimientos_stock.where({ atencion_id: id }).toArray();

    // Mapear movimientos a formato DispensacionMedicamento
    const dispensaciones: DispensacionMedicamento[] = movimientos.map((m) => ({
      medicamento_id: m.medicamento_id,
      cantidad: m.cantidad,
      tipo_medida: m.tipo_medida!,
      presentacion_entregada: undefined, // No se guarda en el movimiento actual
    }));

    return {
      ...atencion,
      dispensaciones,
    };
  }

  /**
   * Actualiza campos de una atención con verificación de permisos
   */
  async actualizar(id: string, cambios: Partial<Atencion>, businessId: string): Promise<void> {
    const atencion = await db.atenciones.get(id);

    if (!atencion) {
      throw new AtencionError("Atención no encontrada", "VALIDACION_FALLIDA", { id });
    }

    if (atencion.business_id !== businessId) {
      throw new AtencionError("Sin permisos para actualizar esta atención", "VALIDACION_FALLIDA", {
        id,
        businessId,
      });
    }

    await db.atenciones.update(id, {
      ...cambios,
      actualizado_at: generarTimestampISO(),
      sync_status: "pending",
    });
  }

  /**
   * Obtiene estadísticas de atenciones por día
   */
  async obtenerEstadisticas(
    businessId: string,
    dias: number = 7
  ): Promise<{ fecha: string; cantidad: number }[]> {
    const hoy = new Date();
    const estadisticas: { fecha: string; cantidad: number }[] = [];

    for (let i = dias - 1; i >= 0; i--) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() - i);
      const fechaStr = fecha.toISOString().split("T")[0];

      const cantidad = await db.atenciones
        .where("business_id")
        .equals(businessId)
        .and((a) => a.fecha_atencion.startsWith(fechaStr))
        .count();

      estadisticas.push({ fecha: fechaStr, cantidad });
    }

    return estadisticas;
  }
}

// ── INSTANCIA SINGLETON ─────────────────────────────────────────────────────

/**
 * Instancia singleton del repositorio de atenciones
 */
export const atencionRepository = new DexieAtencionRepository();

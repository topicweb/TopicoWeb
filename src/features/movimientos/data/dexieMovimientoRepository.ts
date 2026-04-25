import { db } from "@/core/db/dexie/db";
import { syncService } from '@/core/db/sync';
import { updateMedicamentoStock, StockError } from "@/core/db/dexie/logic/stock";
import { MovimientoStock } from "@/features/inventario/types";
import { Atencion } from "@/features/atenciones/types";
import { Paciente } from "@/features/pacientes/types";
import {
  MovimientoRepository,
  CrearMovimientoInput,
  MovimientoConMedicamento,
  RegistroMovimientoResult,
} from "../types";

// ───────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ───────────────────────────────────────────────────────────────────────────────

const MEDICAMENTO_DESCONOCIDO = "Medicamento no encontrado";

// ───────────────────────────────────────────────────────────────────────────────
// FUNCIONES AUXILIARES
// ───────────────────────────────────────────────────────────────────────────────

const generarTimestampISO = (): string => new Date().toISOString();
const generarUUID = (): string => crypto.randomUUID();

// ───────────────────────────────────────────────────────────────────────────────
// IMPLEMENTACIÓN DEL REPOSITORIO
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Repositorio de movimientos usando Dexie (IndexedDB)
 * Implementa Clean Architecture con transacciones atómicas y JOINs optimizados
 */
export class DexieMovimientoRepository implements MovimientoRepository {
  /**
   * Registra movimiento y actualiza stock en transacción atómica
   */
  async registrar(
    input: CrearMovimientoInput,
    businessId: string
  ): Promise<RegistroMovimientoResult> {
    const timestamp = generarTimestampISO();
    const movimientoId = generarUUID();

    const movimiento: MovimientoStock = {
      ...input,
      id: movimientoId,
      business_id: businessId,
      creado_at: timestamp,
      actualizado_at: timestamp,
      sync_status: "pending",
    };

    await db.transaction("rw", db.movimientos_stock, db.medicamentos, async () => {
      await db.movimientos_stock.add(movimiento);
      await updateMedicamentoStock(
        input.medicamento_id,
        input.cantidad,
        input.tipo,
        timestamp,
        input.tipo_medida
      );
    });

    // Trigger PUSH automático solo si hay conexión
    if (typeof window !== 'undefined' && navigator.onLine) {
      syncService.pushToSupabase().catch(console.error);
    }

    const medicamento = await db.medicamentos.get(input.medicamento_id);
    const stockAnterior = (medicamento?.stock_actual ?? 0) - (input.tipo === "ENTRADA" ? input.cantidad : -input.cantidad);

    return {
      movimientoId,
      medicamentoId: input.medicamento_id,
      stockAnterior,
      stockNuevo: medicamento?.stock_actual ?? 0,
      tipo: input.tipo,
    };
  }

  /**
   * Obtiene movimientos con nombre de medicamento y paciente
   * Usa bulkGet para optimizar queries y Maps para lookup O(1)
   */
  async listarTodosConMedicamento(
    businessId: string
  ): Promise<MovimientoConMedicamento[]> {
    const movimientos = await db.movimientos_stock
      .where("business_id")
      .equals(businessId)
      .reverse()
      .sortBy("fecha_movimiento");

    if (movimientos.length === 0) {
      return [];
    }

    const medicamentoIds = [...new Set(movimientos.map((m) => m.medicamento_id))];
    const atencionIds = [...new Set(
      movimientos
        .map((m) => m.atencion_id)
        .filter((id): id is string => id !== null && id !== undefined)
    )];

    const [medicamentos, atenciones] = await Promise.all([
      db.medicamentos.bulkGet(medicamentoIds),
      atencionIds.length > 0 ? db.atenciones.bulkGet(atencionIds) : Promise.resolve([]),
    ]);

    const atencionesValidas = atenciones.filter(Boolean) as Atencion[];
    const pacienteIds = [...new Set(atencionesValidas.map((a) => a.paciente_id))];
    const pacientes = pacienteIds.length > 0 ? await db.pacientes.bulkGet(pacienteIds) : [];

    const medicamentosValidos = medicamentos.filter(Boolean) as NonNullable<typeof medicamentos[number]>[];
    const medicamentoMap = new Map(medicamentosValidos.map((m) => [m.id, m]));
    const atencionMap = new Map(atencionesValidas.map((a) => [a.id, a]));
    const pacientesValidos = pacientes.filter(Boolean) as Paciente[];
    const pacienteMap = new Map(pacientesValidos.map((p) => [p.id, p]));

    return movimientos.map((movimiento): MovimientoConMedicamento => {
      const medicamento = medicamentoMap.get(movimiento.medicamento_id);
      const atencion = movimiento.atencion_id ? atencionMap.get(movimiento.atencion_id) : undefined;
      const paciente = atencion ? pacienteMap.get(atencion.paciente_id) : undefined;

      return {
        ...movimiento,
        medicamentoNombre: medicamento?.nombre ?? MEDICAMENTO_DESCONOCIDO,
        atencionPacienteNombre: paciente?.nombres ?? undefined,
      };
    });
  }
}

// ── Singleton Instance ─────────────────────────────────────────────────────

export const movimientoRepository = new DexieMovimientoRepository();

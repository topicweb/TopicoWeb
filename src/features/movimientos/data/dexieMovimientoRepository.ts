import { db } from "@/core/db/dexie/db";
import { updateMedicamentoStock, StockError } from "@/core/db/dexie/logic/stock";
import { MovimientoStock } from "@/features/inventario/types";
import {
  MovimientoRepository,
  CrearMovimientoInput,
  MovimientoConMedicamento,
  RegistroMovimientoResult,
  EstadisticaDispensacion,
} from "../types";

// ── Constantes ───────────────────────────────────────────────────────────────

const MEDICAMENTO_DESCONOCIDO = "Medicamento no encontrado";

// ── Helper Functions ───────────────────────────────────────────────────────────

const generarTimestampISO = (): string => new Date().toISOString();

const generarUUID = (): string => crypto.randomUUID();

// ── Repository Implementation ─────────────────────────────────────────────────

/**
 * Implementación del repositorio de movimientos usando Dexie (IndexedDB)
 *
 * Esta clase implementa el patrón Repository de Clean Architecture,
 * actuando como un Adapter entre el dominio y la infraestructura de persistencia.
 *
 * Responsabilidades:
 * - Abstrae el acceso a datos (Dexie/IndexedDB)
 * - Maneja transacciones para garantizar consistencia
 * - Enriquece datos con información relacionada (JOINs)
 * - Delega validaciones de negocio a la capa de lógica de stock
 */
export class DexieMovimientoRepository implements MovimientoRepository {
  /**
   * Registra un movimiento y actualiza el stock en una transacción atómica
   *
   * @param input - Datos del movimiento a registrar
   * @param businessId - ID del negocio/institución
   * @returns Resultado con detalles de la operación
   * @throws {StockError} Si falla la validación de stock o tipo de medida
   * @throws {Error} Si falla la transacción de base de datos
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

    // Ejecutar en transacción para garantizar atomicidad
    // Si falla el registro del movimiento, no se actualiza el stock
    await db.transaction("rw", db.movimientos_stock, db.medicamentos, async () => {
      // 1. Registrar el movimiento
      await db.movimientos_stock.add(movimiento);

      // 2. Actualizar stock (validaciones incluidas)
      // Esta función lanza StockError si hay problemas de validación
      await updateMedicamentoStock(
        input.medicamento_id,
        input.cantidad,
        input.tipo,
        timestamp,
        input.tipo_medida
      );
    });

    // Obtener stock actualizado para el resultado
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
   * Lista movimientos filtrados por medicamento
   * Ordenados por fecha descendente (más recientes primero)
   */
  async listarPorMedicamento(
    medicamentoId: string,
    businessId: string
  ): Promise<MovimientoStock[]> {
    return db.movimientos_stock
      .where({ business_id: businessId, medicamento_id: medicamentoId })
      .reverse()
      .sortBy("fecha_movimiento");
  }

  /**
   * Obtiene todos los movimientos con nombre del medicamento
   *
   * Optimización: Usa bulkGet para reducir N queries a 1 query + lookup en memoria
   * Complejidad: O(M + U) donde M = movimientos, U = medicamentos únicos
   */
  async listarTodosConMedicamento(
    businessId: string
  ): Promise<MovimientoConMedicamento[]> {
    // 1. Obtener movimientos del business
    const movimientos = await db.movimientos_stock
      .where("business_id")
      .equals(businessId)
      .reverse()
      .toArray();

    if (movimientos.length === 0) {
      return [];
    }

    // 2. Obtener IDs únicos de medicamentos para optimizar queries
    const medicamentoIds = [...new Set(movimientos.map((m) => m.medicamento_id))];

    // 3. Bulk fetch de medicamentos (una sola query)
    const medicamentos = await db.medicamentos.bulkGet(medicamentoIds);

    // 4. Crear Map para lookup O(1)
    const medicamentoMap = new Map(
      medicamentos
        .filter((m): m is NonNullable<typeof m> => m !== undefined)
        .map((m) => [m.id, m])
    );

    // 5. Enriquecer movimientos con nombre del medicamento
    return movimientos.map((movimiento): MovimientoConMedicamento => {
      const medicamento = medicamentoMap.get(movimiento.medicamento_id);

      return {
        ...movimiento,
        medicamentoNombre: medicamento?.nombre ?? MEDICAMENTO_DESCONOCIDO,
      };
    });
  }

  /**
   * Calcula estadísticas de dispensación por medicamento
   *
   * Agrega cantidades dispensadas (SALIDA) agrupadas por medicamento
   * y ordena por cantidad total descendente.
   */
  async obtenerEstadisticasDispensados(
    businessId: string,
    limite: number = 10
  ): Promise<EstadisticaDispensacion[]> {
    // 1. Obtener solo movimientos de tipo SALIDA
    const movimientos = await db.movimientos_stock
      .where({ business_id: businessId, tipo: "SALIDA" })
      .toArray();

    if (movimientos.length === 0) {
      return [];
    }

    // 2. Agregar por medicamento
    const agregacion = new Map<
      string,
      { cantidadTotal: number; conteo: number }
    >();

    for (const mov of movimientos) {
      const actual = agregacion.get(mov.medicamento_id);

      if (actual) {
        actual.cantidadTotal += mov.cantidad;
        actual.conteo += 1;
      } else {
        agregacion.set(mov.medicamento_id, {
          cantidadTotal: mov.cantidad,
          conteo: 1,
        });
      }
    }

    // 3. Obtener nombres de medicamentos
    const medicamentoIds = [...agregacion.keys()];
    const medicamentos = await db.medicamentos.bulkGet(medicamentoIds);
    const medicamentoMap = new Map(
      medicamentos
        .filter((m): m is NonNullable<typeof m> => m !== undefined)
        .map((m) => [m.id, m])
    );

    // 4. Construir resultado y ordenar
    const estadisticas: EstadisticaDispensacion[] = [...agregacion.entries()].map(
      ([medicamentoId, datos]) => ({
        medicamentoId,
        medicamentoNombre:
          medicamentoMap.get(medicamentoId)?.nombre ?? MEDICAMENTO_DESCONOCIDO,
        cantidadTotal: datos.cantidadTotal,
        numeroMovimientos: datos.conteo,
      })
    );

    // 5. Ordenar por cantidad total descendente y limitar
    return estadisticas
      .sort((a, b) => b.cantidadTotal - a.cantidadTotal)
      .slice(0, limite);
  }
}

// ── Singleton Instance ───────────────────────────────────────────────────────

/**
 * Instancia singleton del repositorio
 * Garantiza una única instancia en toda la aplicación
 */
export const movimientoRepository = new DexieMovimientoRepository();

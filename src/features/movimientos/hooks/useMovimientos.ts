import { useState, useCallback, useMemo, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useAuth } from "@/core/providers/AuthProvider";
import { StockError } from "@/core/db/dexie/logic/stock";
import {
  CrearMovimientoInput,
  MovimientoConMedicamento,
  RegistroMovimientoResult,
} from "../types";
import { movimientoRepository } from "../data/dexieMovimientoRepository";

// ── Types ────────────────────────────────────────────────────────────────────

export interface MovimientosEstado {
  /** Lista de movimientos con información del medicamento */
  movimientos: MovimientoConMedicamento[];
  /** Indica si hay operaciones en progreso */
  loading: boolean;
  /** Error actual de la operación, si existe */
  error: string | null;
}

export interface UseMovimientosReturn extends MovimientosEstado {
  /**
   * Registra un nuevo movimiento de stock
   * @returns Resultado de la operación o null si falla
   */
  registrarMovimiento: (
    input: CrearMovimientoInput
  ) => Promise<RegistroMovimientoResult | null>;
  /** Limpia el error actual */
  clearError: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ERROR_MESSAGES = {
  AUTH_REQUIRED: "Se requiere autenticación para registrar movimientos",
  STOCK_INSUFICIENTE: (detalle: string) => `Stock insuficiente: ${detalle}`,
  VALIDACION_FALLIDA: (detalle: string) => `Error de validación: ${detalle}`,
  REGISTRO_FALLIDO: "No se pudo registrar el movimiento. Intente nuevamente.",
} as const;

/**
 * Hook para gestionar movimientos de stock
 *
 * Arquitectura:
 * - Presentation Layer: Este hook (orquestación de UI)
 * - Domain Layer: Tipos y contratos en ../types
 * - Data Layer: DexieMovimientoRepository en ../data
 *
 * El hook delega todas las operaciones de datos al repositorio,
 * manteniendo solo estado de UI y manejo de errores.
 */
export function useMovimientos(): UseMovimientosReturn {
  const { businessId } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref para tracking de montado (evita setState en componente desmontado)
  const isMountedRef = useRef(true);

  // Query reactiva: se actualiza automáticamente cuando cambian los datos
  const movimientosData = useLiveQuery(async () => {
    if (typeof window === "undefined" || !businessId) {
      return [];
    }

    return movimientoRepository.listarTodosConMedicamento(businessId);
  }, [businessId]);

  const movimientos = movimientosData ?? [];

  // El estado de carga es true si:
  // - Hay una operación de escritura en progreso (isSubmitting)
  // - Los datos aún no han cargado por primera vez (undefined)
  // NOTA: Lista vacía ([] ) es un estado válido, no de carga
  const loading = isSubmitting || movimientosData === undefined;

  /**
   * Manejo centralizado de errores del StockError
   */
  const handleStockError = useCallback((err: StockError): string => {
    switch (err.code) {
      case "STOCK_INSUFICIENTE":
        return ERROR_MESSAGES.STOCK_INSUFICIENTE(err.message);
      case "TIPO_MEDIDA_INVALIDO":
      case "INCOMPATIBILIDAD_TIPO":
      case "CANTIDAD_INVALIDA":
        return ERROR_MESSAGES.VALIDACION_FALLIDA(err.message);
      case "MEDICAMENTO_NO_ENCONTRADO":
        return `Medicamento no encontrado: ${err.medicamentoId ?? "desconocido"}`;
      default:
        return err.message;
    }
  }, []);

  /**
   * Registra un nuevo movimiento de stock
   *
   * Flujo:
   * 1. Valida autenticación
   * 2. Ejecuta registro vía repositorio (con transacción)
   * 3. Maneja errores específicos de StockError
   * 4. Actualiza estado de UI
   */
  const registrarMovimiento = useCallback(
    async (input: CrearMovimientoInput): Promise<RegistroMovimientoResult | null> => {
      // Guard: requiere autenticación
      if (!businessId) {
        setError(ERROR_MESSAGES.AUTH_REQUIRED);
        return null;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const resultado = await movimientoRepository.registrar(input, businessId);

        if (isMountedRef.current) {
          setError(null);
        }

        return resultado;
      } catch (err) {
        const errorMessage =
          err instanceof StockError
            ? handleStockError(err)
            : err instanceof Error
              ? err.message
              : ERROR_MESSAGES.REGISTRO_FALLIDO;

        if (isMountedRef.current) {
          setError(errorMessage);
        }

        console.error("[useMovimientos] Error al registrar:", err);
        return null;
      } finally {
        if (isMountedRef.current) {
          setIsSubmitting(false);
        }
      }
    },
    [businessId, handleStockError]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Estado memoizado para evitar re-renders innecesarios
  const estado = useMemo(
    () => ({
      movimientos,
      loading,
      error,
      registrarMovimiento,
      clearError,
    }),
    [movimientos, loading, error, registrarMovimiento, clearError]
  );

  return estado;
}
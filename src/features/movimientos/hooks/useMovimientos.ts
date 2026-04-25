// ───────────────────────────────────────────────────────────────────────────────
// TIPOS PARA HOOK DE MOVIMIENTOS
// Define la estructura de estado y retorno del hook useMovimientos
// ───────────────────────────────────────────────────────────────────────────────

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

// ───────────────────────────────────────────────────────────────────────────────
// Estado de movimientos
// ───────────────────────────────────────────────────────────────────────────────

export interface MovimientosEstado {
  movimientos: MovimientoConMedicamento[];
  loading: boolean;
  error: string | null;
}

// ───────────────────────────────────────────────────────────────────────────────
// Retorno del hook useMovimientos
// ───────────────────────────────────────────────────────────────────────────────

export interface UseMovimientosReturn extends MovimientosEstado {
  registrarMovimiento: (
    input: CrearMovimientoInput
  ) => Promise<RegistroMovimientoResult | null>;
  clearError: () => void;
}

// ───────────────────────────────────────────────────────────────────────────────
// Mensajes de error
// ───────────────────────────────────────────────────────────────────────────────

const ERROR_MESSAGES = {
  AUTH_REQUIRED: "Se requiere autenticación para registrar movimientos",
  STOCK_INSUFICIENTE: (detalle: string) => `Stock insuficiente: ${detalle}`,
  VALIDACION_FALLIDA: (detalle: string) => `Error de validación: ${detalle}`,
  REGISTRO_FALLIDO: "No se pudo registrar el movimiento. Intente nuevamente.",
} as const;

// ───────────────────────────────────────────────────────────────────────────────
// Hook useMovimientos
// Gestiona movimientos de stock con queries reactivas y manejo de errores
// ───────────────────────────────────────────────────────────────────────────────

export function useMovimientos(): UseMovimientosReturn {
  const { businessId } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const movimientosData = useLiveQuery(async () => {
    if (typeof window === "undefined" || !businessId) {
      return [];
    }
    return movimientoRepository.listarTodosConMedicamento(businessId);
  }, [businessId]);

  const movimientos = movimientosData ?? [];
  const loading = isSubmitting || movimientosData === undefined;

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

  const registrarMovimiento = useCallback(
    async (input: CrearMovimientoInput): Promise<RegistroMovimientoResult | null> => {
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
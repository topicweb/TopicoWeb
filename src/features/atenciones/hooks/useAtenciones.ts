import { useState, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/core/providers/AuthProvider';
import { StockError } from '@/core/db/dexie/logic/stock';
import { atencionRepository } from '../data';
import type {
  Atencion,
  AtencionFormData,
  AtencionConDetalles,
  DispensacionMedicamento,
  AtencionResultado,
} from '../types';
import { AtencionError } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface UseAtencionesReturn {
  atenciones: Atencion[];
  atencionesConDetalles: AtencionConDetalles[];
  isLoading: boolean;
  error: string | null;
  registrarAtencion: (datos: AtencionFormData, dispensaciones?: DispensacionMedicamento[]) => Promise<AtencionResultado | null>;
  actualizarAtencion: (id: string, cambios: Partial<Atencion>) => Promise<void>;
  getStatsLast7Days: () => Promise<{ fecha: string; cantidad: number }[]>;
  clearError: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAtenciones(): UseAtencionesReturn {
  const { businessId, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Queries reactivas via repositorio - undefined mientras carga
  const atencionesData = useLiveQuery<AtencionConDetalles[]>(
    async () => {
      if (!businessId) return [];
      return atencionRepository.listarConDetalles(businessId, 1000);
    },
    [businessId]
  );

  const atencionesConDetalles = atencionesData ?? [];
  const atenciones: Atencion[] = atencionesConDetalles;
  const isLoading = atencionesData === undefined;

  const handleError = (err: unknown): string => {
    if (err instanceof AtencionError) return err.message;
    if (err instanceof StockError) return err.message;
    if (err instanceof Error) return err.message;
    return 'Error inesperado';
  };

  const registrarAtencion = useCallback(
    async (datos: AtencionFormData, dispensaciones: DispensacionMedicamento[] = []): Promise<AtencionResultado | null> => {
      if (!businessId || !user?.id) {
        setError('Usuario no autenticado');
        return null;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const resultado = await atencionRepository.crear(datos, dispensaciones, {
          businessId,
          perfilId: user.id,
        });
        return resultado;
      } catch (err) {
        const msg = handleError(err);
        setError(msg);
        console.error('[useAtenciones] Error:', err);
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [businessId, user?.id]
  );

  const actualizarAtencion = useCallback(
    async (id: string, cambios: Partial<Atencion>): Promise<void> => {
      if (!businessId) return;
      await atencionRepository.actualizar(id, cambios, businessId);
    },
    [businessId]
  );

  const getStatsLast7Days = useCallback(async (): Promise<{ fecha: string; cantidad: number }[]> => {
    if (!businessId) return [];
    return atencionRepository.obtenerEstadisticas(businessId, 7);
  }, [businessId]);

  const clearError = useCallback(() => setError(null), []);

  return useMemo(
    () => ({
      atenciones,
      atencionesConDetalles,
      isLoading: isLoading || isSubmitting,
      error,
      registrarAtencion,
      actualizarAtencion,
      getStatsLast7Days,
      clearError,
    }),
    [atenciones, atencionesConDetalles, isLoading, isSubmitting, error, registrarAtencion, actualizarAtencion, getStatsLast7Days, clearError]
  );
}
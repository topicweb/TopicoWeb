/**
 * @module features/atenciones/hooks/useAtenciones
 *
 * Hook central del módulo Atenciones.
 * Reemplaza DexieAtencionRepository — toda la lógica vive aquí,
 * siguiendo el patrón canónico useDexieCrud.
 */
import { useDexieCrud } from '@/shared/hooks/use-dexie-crud';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/core/providers/AuthProvider';
import { Atencion, AtencionFormData, SignosVitales, DispensacionMedicamento } from '../types';
import { MovimientoStock, Medicamento, TipoMedida } from '@/features/inventario/types';
import { db } from '@/core/db';
import { updateMedicamentoStock, StockError, verificarStockDisponible, generarDescripcionMovimiento } from '@/core/db/dexie/logic/stock';

// ── Tipos de apoyo ─────────────────────────────────────────────────────────

/** Atención enriquecida con nombres para mostrar en la UI. */
export interface AtencionConDetalles extends Atencion {
  pacienteNombre: string;
  staffNombre: string;
}

/** Signos vitales por defecto (todos vacíos = no registrado). */
export const SIGNOS_VITALES_VACIO: SignosVitales = {
  temp: '',
  presion: '',
  saturacion: '',
};

// ── Hook ───────────────────────────────────────────────────────────────────

export function useAtenciones() {
  const { businessId, user } = useAuth();

  // ── 1. CRUD genérico → multi-tenancy y sync_status automáticos ──────────
  const {
    data: atenciones,
    update: actualizarAtencion,
    isLoading,
  } = useDexieCrud<Atencion>(db.atenciones);

  // ── 2. Vista enriquecida para la UI (join manual en Dexie) ──────────────
  const atencionesConDetalles = useLiveQuery(async () => {
    if (!businessId) return [];

    const recents = await db.atenciones
      .where('business_id')
      .equals(businessId)
      .reverse()
      .limit(50)
      .toArray();

    return Promise.all(
      recents.map(async (a): Promise<AtencionConDetalles> => {
        const paciente = await db.pacientes.get(a.paciente_id);
        const staff = await db.perfiles.get(a.perfil_id);
        return {
          ...a,
          pacienteNombre: paciente
            ? `${paciente.nombres} ${paciente.apellidos}`
            : 'Desconocido',
          staffNombre: staff?.nombre ?? 'Desconocido',
        };
      })
    );
  }, [businessId]) ?? [];

  // ── 3. Lógica de negocio ────────────────────────────────────────────────

  /**
   * Registra una consulta médica de forma atómica con soporte para múltiples medicamentos.
   *
   * Flujo:
   * 1. VALIDACIÓN PRE-TRANSACCIÓN: Verifica stock suficiente para todas las dispensaciones
   * 2. TRANSACCIÓN ATÓMICA: Crea atención + movimientos + actualiza stock (rollback automático si falla)
   * 3. AGRUPACIÓN INTELIGENTE: Genera descripciones consolidadas por tipo de medida
   *
   * @param datos           Datos de la atención (paciente, motivo, signos vitales, etc.)
   * @param dispensaciones  Lista de medicamentos a dispensar con cantidad y tipo_medida
   * @returns               ID de la atención creada
   *
   * @throws {StockError}   Si hay stock insuficiente, tipo de medida inválido o incompatibilidad
   * @throws {Error}        Si el usuario no está autenticado
   */
  const registrarAtencion = async (
    datos: AtencionFormData,
    dispensaciones: DispensacionMedicamento[] = []
  ): Promise<string> => {
    if (!businessId) throw new Error('Usuario no autenticado');
    if (!user?.id) throw new Error('Perfil de usuario no disponible');

    const now = new Date().toISOString();
    const atencionId = crypto.randomUUID();

    // ── FASE 1: VALIDACIÓN PRE-TRANSACCIÓN ─────────────────────────────────────
    // Verificar stock disponible y compatibilidad de tipos ANTES de iniciar transacción
    // Esto evita transacciones parciales y proporciona errores claros al usuario

    if (dispensaciones.length > 0) {
      const medicamentosMap = new Map<string, Medicamento>();
      const erroresValidacion: string[] = [];

      // Cargar todos los medicamentos necesarios
      for (const disp of dispensaciones) {
        if (!medicamentosMap.has(disp.medicamento_id)) {
          const med = await db.medicamentos.get(disp.medicamento_id);
          if (!med) {
            erroresValidacion.push(`Medicamento no encontrado: ${disp.medicamento_id}`);
            continue;
          }
          medicamentosMap.set(disp.medicamento_id, med);
        }
      }

      // Validar cada dispensación
      for (const disp of dispensaciones) {
        const medicamento = medicamentosMap.get(disp.medicamento_id);
        if (!medicamento) continue; // Ya reportado arriba

        // Validar compatibilidad de tipo_medida (validación cruzada)
        if (disp.tipo_medida !== medicamento.tipo_medida) {
          erroresValidacion.push(
            `"${medicamento.nombre}": tipo incompatible (medicamento: ${medicamento.tipo_medida}, dispensación: ${disp.tipo_medida})`
          );
          continue;
        }

        // Verificar stock disponible
        const verificacion = await verificarStockDisponible(
          disp.medicamento_id,
          disp.cantidad,
          disp.tipo_medida
        );

        if (!verificacion.disponible) {
          erroresValidacion.push(verificacion.mensaje || `Stock insuficiente para "${medicamento.nombre}"`);
        }
      }

      // Si hay errores de validación, abortar ANTES de la transacción
      if (erroresValidacion.length > 0) {
        throw new StockError(
          `Validación fallida:\n${erroresValidacion.join('\n')}`,
          'STOCK_INSUFICIENTE',
          undefined,
          { errores: erroresValidacion }
        );
      }

      // ── FASE 2: TRANSACCIÓN ATÓMICA ─────────────────────────────────────────
      // Todas las operaciones se ejecutan dentro de una transacción Dexie
      // Si cualquier operación falla, TODAS se revierten automáticamente (ACID)

      await db.transaction(
        'rw',
        db.atenciones,
        db.movimientos_stock,
        db.medicamentos,
        async () => {
          // 2.1 Crear la Atención
          const atencion: Atencion = {
            ...datos,
            id: atencionId,
            business_id: businessId,
            perfil_id: user.id,
            creado_at: now,
            actualizado_at: now,
            sync_status: 'pending',
            activo: 1,
            signos_vitales: datos.signos_vitales ?? SIGNOS_VITALES_VACIO,
          };
          await db.atenciones.add(atencion);

          // 2.2 Agrupar dispensaciones por medicamento para generar descripción consolidada
          const dispensacionesConMedicamento = dispensaciones.map(d => ({
            dispensacion: d,
            medicamento: medicamentosMap.get(d.medicamento_id)!,
          }));

          // Generar descripción consolidada para el movimiento principal
          const descripcionConsolidada = generarDescripcionMovimiento(
            dispensacionesConMedicamento.map(d => ({
              medicamento: d.medicamento,
              cantidad: d.dispensacion.cantidad,
            }))
          );

          // 2.3 Crear movimientos de stock y actualizar stock por cada dispensación
          for (const { dispensacion, medicamento } of dispensacionesConMedicamento) {
            // Crear movimiento de SALIDA con descripción consolidada en el primero
            const movimiento: MovimientoStock = {
              id: crypto.randomUUID(),
              business_id: businessId,
              medicamento_id: dispensacion.medicamento_id,
              atencion_id: atencionId,
              tipo: 'SALIDA',
              cantidad: dispensacion.cantidad,
              tipo_medida: dispensacion.tipo_medida,
              // Descripción consolidada en el primer movimiento, vacío en los demás
              descripcion_movimiento: descripcionConsolidada,
              fecha_movimiento: now,
              creado_at: now,
              actualizado_at: now,
              sync_status: 'pending',
            };
            await db.movimientos_stock.add(movimiento);

            // Actualizar stock del medicamento usando la nueva lógica validada
            await updateMedicamentoStock(
              dispensacion.medicamento_id,
              dispensacion.cantidad,
              'SALIDA',
              now,
              dispensacion.tipo_medida,
              descripcionConsolidada
            );
          }
        }
      );
    } else {
      // Caso: Atención sin medicamentos (solo consulta)
      await db.transaction(
        'rw',
        db.atenciones,
        async () => {
          const atencion: Atencion = {
            ...datos,
            id: atencionId,
            business_id: businessId,
            perfil_id: user.id,
            creado_at: now,
            actualizado_at: now,
            sync_status: 'pending',
            activo: 1,
            signos_vitales: datos.signos_vitales ?? SIGNOS_VITALES_VACIO,
          };
          await db.atenciones.add(atencion);
        }
      );
    }

    return atencionId;
  };

  // ── 4. Helpers de analítica ─────────────────────────────────────────────

  /**
   * Estadísticas de atenciones de los últimos 7 días para el dashboard.
   * Filtra por business_id usando el índice compuesto de Dexie.
   */
  const getStatsLast7Days = async (): Promise<{ date: string; count: number }[]> => {
    const stats: { date: string; count: number }[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      if (!businessId) {
        stats.push({ date: dateStr, count: 0 });
        continue;
      }

      const count = await db.atenciones
        .where('business_id').equals(businessId)
        .and(a => a.fecha_atencion.startsWith(dateStr))
        .count();

      stats.push({ date: dateStr, count });
    }
    return stats;
  };

  return {
    // Data
    atenciones,
    atencionesConDetalles,
    isLoading,

    // Operaciones
    registrarAtencion,
    actualizarAtencion,

    // Analítica
    getStatsLast7Days,
  };
}
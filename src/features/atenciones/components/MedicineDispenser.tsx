"use client";

/**
 * @module features/atenciones/components/MedicineDispenser
 *
 * Componente visual para dispensación de medicamentos con soporte multi-medida.
 * Permite seleccionar múltiples medicamentos con validaciones en tiempo real.
 *
 * FASE 3.1: Componente MedicineDispenser
 * - Tarjetas visuales por tipo de medicamento
 * - Indicadores de stock con unidades apropiadas
 * - Selección múltiple con validaciones en tiempo real
 * - Previsualización de dispensación antes de guardar
 */

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pill, Droplets, Scale, Percent, AlertCircle, Check, X, Plus, Minus } from "lucide-react";
import { Medicamento, TipoMedida, DispensacionMedicamento, CONFIGURACIONES_MEDIDA } from "@/features/inventario/types";
import { verificarStockDisponible, validarLimiteDispensacion, StockError } from "@/core/db/dexie/logic/stock";

// ── Tipos ────────────────────────────────────────────────────────────────────

interface MedicineDispenserProps {
  /** Lista de medicamentos disponibles para dispensar */
  medicamentos: Medicamento[];
  /** Dispensaciones actualmente seleccionadas */
  seleccionadas: DispensacionMedicamento[];
  /** Callback cuando cambia la selección */
  onChange: (dispensaciones: DispensacionMedicamento[]) => void;
  /** Límites máximos opcionales por tipo de medida */
  limitesPorTipo?: Partial<Record<TipoMedida, number>>;
  /** Mostrar preview de la dispensación */
  mostrarPreview?: boolean;
}

interface MedicamentoSeleccionado extends DispensacionMedicamento {
  medicamento: Medicamento;
  error?: string;
  warning?: string;
}

// ── Iconos por Tipo de Medida ────────────────────────────────────────────────

const ICONOS_POR_TIPO: Record<TipoMedida, React.ReactNode> = {
  UNIDAD: <Pill className="w-5 h-5" />,
  VOLUMEN_ML: <Droplets className="w-5 h-5" />,
  PESO_MG: <Scale className="w-5 h-5" />,
  PORCENTAJE: <Percent className="w-5 h-5" />,
};

const COLORES_POR_TIPO: Record<TipoMedida, { bg: string; border: string; text: string; icon: string }> = {
  UNIDAD: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-700 dark:text-blue-300",
    icon: "text-blue-500",
  },
  VOLUMEN_ML: {
    bg: "bg-cyan-50 dark:bg-cyan-950/30",
    border: "border-cyan-200 dark:border-cyan-800",
    text: "text-cyan-700 dark:text-cyan-300",
    icon: "text-cyan-500",
  },
  PESO_MG: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-300",
    icon: "text-amber-500",
  },
  PORCENTAJE: {
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-200 dark:border-purple-800",
    text: "text-purple-700 dark:text-purple-300",
    icon: "text-purple-500",
  },
};

// ── Funciones Auxiliares ───────────────────────────────────────────────────

function getUnidad(tipo: TipoMedida): string {
  return CONFIGURACIONES_MEDIDA[tipo].unidad;
}

function getEtiqueta(tipo: TipoMedida): string {
  return CONFIGURACIONES_MEDIDA[tipo].etiqueta;
}

// ── Componente ───────────────────────────────────────────────────────────────

export function MedicineDispenser({
  medicamentos,
  seleccionadas,
  onChange,
  limitesPorTipo,
  mostrarPreview = true,
}: MedicineDispenserProps) {
  const [busqueda, setBusqueda] = useState("");
  const [validando, setValidando] = useState<Set<string>>(new Set());

  // Medicamentos filtrados por búsqueda
  const medicamentosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return medicamentos.filter((m) => m.activo === 1);
    const term = busqueda.toLowerCase();
    return medicamentos.filter(
      (m) =>
        m.activo === 1 &&
        (m.nombre.toLowerCase().includes(term) ||
          m.descripcion?.toLowerCase().includes(term) ||
          m.anaquel?.toLowerCase().includes(term))
    );
  }, [medicamentos, busqueda]);

  // Medicamentos agrupados por tipo
  const porTipo = useMemo(() => {
    const grupos: Record<TipoMedida, Medicamento[]> = {
      UNIDAD: [],
      VOLUMEN_ML: [],
      PESO_MG: [],
      PORCENTAJE: [],
    };
    for (const med of medicamentosFiltrados) {
      grupos[med.tipo_medida].push(med);
    }
    return grupos;
  }, [medicamentosFiltrados]);

  // Verificar si un medicamento está seleccionado
  const estaSeleccionado = useCallback(
    (medId: string) => seleccionadas.some((s) => s.medicamento_id === medId),
    [seleccionadas]
  );

  // Obtener cantidad seleccionada de un medicamento
  const getCantidad = useCallback(
    (medId: string) => {
      const sel = seleccionadas.find((s) => s.medicamento_id === medId);
      return sel?.cantidad || 0;
    },
    [seleccionadas]
  );

  // Agregar medicamento a la selección
  const agregarMedicamento = useCallback(
    async (medicamento: Medicamento) => {
      if (estaSeleccionado(medicamento.id)) return;

      setValidando((prev) => new Set(prev).add(medicamento.id));

      try {
        // Validar límite de dispensación
        validarLimiteDispensacion(medicamento, 1, limitesPorTipo);

        // Verificar stock disponible
        const verificacion = await verificarStockDisponible(
          medicamento.id,
          1,
          medicamento.tipo_medida
        );

        if (!verificacion.disponible) {
          console.warn(`Stock insuficiente para ${medicamento.nombre}`);
        }

        const nuevaDispensacion: DispensacionMedicamento = {
          medicamento_id: medicamento.id,
          cantidad: 1,
          tipo_medida: medicamento.tipo_medida,
          presentacion_entregada: medicamento.presentacion,
        };

        onChange([...seleccionadas, nuevaDispensacion]);
      } catch (error) {
        if (error instanceof StockError) {
          console.error(`Error al agregar ${medicamento.nombre}:`, error.message);
        }
      } finally {
        setValidando((prev) => {
          const next = new Set(prev);
          next.delete(medicamento.id);
          return next;
        });
      }
    },
    [estaSeleccionado, limitesPorTipo, onChange, seleccionadas]
  );

  // Remover medicamento de la selección
  const removerMedicamento = useCallback(
    (medId: string) => {
      onChange(seleccionadas.filter((s) => s.medicamento_id !== medId));
    },
    [onChange, seleccionadas]
  );

  // Actualizar cantidad de un medicamento seleccionado
  const actualizarCantidad = useCallback(
    async (medId: string, nuevaCantidad: number) => {
      const cantidad = Math.max(1, Math.floor(nuevaCantidad));
      const medicamento = medicamentos.find((m) => m.id === medId);
      if (!medicamento) return;

      // Validar límite
      try {
        validarLimiteDispensacion(medicamento, cantidad, limitesPorTipo);
      } catch (error) {
        if (error instanceof StockError) {
          // Mostrar warning pero permitir (la validación final bloqueará)
          console.warn(error.message);
        }
      }

      onChange(
        seleccionadas.map((s) =>
          s.medicamento_id === medId ? { ...s, cantidad } : s
        )
      );
    },
    [medicamentos, limitesPorTipo, onChange, seleccionadas]
  );

  // Calcular totales por tipo para preview
  const totalesPorTipo = useMemo(() => {
    const totales: Record<TipoMedida, number> = {
      UNIDAD: 0,
      VOLUMEN_ML: 0,
      PESO_MG: 0,
      PORCENTAJE: 0,
    };

    for (const sel of seleccionadas) {
      totales[sel.tipo_medida] += sel.cantidad;
    }

    return totales;
  }, [seleccionadas]);

  // Renderizar tarjeta de medicamento
  const renderTarjeta = (med: Medicamento) => {
    const colores = COLORES_POR_TIPO[med.tipo_medida];
    const seleccionado = estaSeleccionado(med.id);
    const cantidad = getCantidad(med.id);
    const unidad = getUnidad(med.tipo_medida);
    const stockBajo = (med.stock_actual ?? 0) <= (med.stock_minimo ?? 5);

    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`
          relative rounded-xl border-2 p-4 cursor-pointer transition-all
          ${colores.bg} ${colores.border}
          ${seleccionado ? "ring-2 ring-offset-2 ring-indigo-500 shadow-lg" : "hover:shadow-md"}
        `}
        onClick={() => !seleccionado && agregarMedicamento(med)}
      >
        {/* Icono y tipo */}
        <div className="flex items-start justify-between mb-2">
          <div className={`${colores.icon}`}>{ICONOS_POR_TIPO[med.tipo_medida]}</div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${colores.bg} ${colores.text}`}>
            {getEtiqueta(med.tipo_medida)}
          </span>
        </div>

        {/* Nombre y presentación */}
        <h4 className={`font-semibold ${colores.text} mb-1 line-clamp-2`}>
          {med.nombre}
        </h4>
        {med.presentacion && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{med.presentacion}</p>
        )}

        {/* Stock indicator */}
        <div className="flex items-center gap-2 mt-3">
          <div
            className={`
              flex-1 h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700
            `}
          >
            <div
              className={`
                h-full rounded-full transition-all
                ${stockBajo ? "bg-rose-500" : "bg-emerald-500"}
              `}
              style={{
                width: `${Math.min(100, ((med.stock_actual ?? 0) / Math.max(med.stock_minimo * 2, 1)) * 100)}%`,
              }}
            />
          </div>
          <span
            className={`
              text-xs font-medium
              ${stockBajo ? "text-rose-600 dark:text-rose-400" : "text-slate-600 dark:text-slate-400"}
            `}
          >
            {med.stock_actual ?? 0}
            {unidad}
          </span>
        </div>

        {stockBajo && (
          <div className="flex items-center gap-1 mt-2 text-rose-500 text-xs">
            <AlertCircle className="w-3 h-3" />
            <span>Stock bajo</span>
          </div>
        )}

        {/* Controles si está seleccionado */}
        <AnimatePresence>
          {seleccionado && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 rounded-xl flex flex-col items-center justify-center p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => actualizarCantidad(med.id, cantidad - 1)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className={`text-2xl font-bold ${colores.text}`}>
                  {cantidad}
                  <span className="text-sm font-normal text-slate-500 ml-1">{unidad}</span>
                </span>
                <button
                  onClick={() => actualizarCantidad(med.id, cantidad + 1)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => removerMedicamento(med.id)}
                className="flex items-center gap-1 text-rose-500 text-sm hover:text-rose-600 transition-colors"
              >
                <X className="w-4 h-4" />
                Remover
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Badge de seleccionado */}
        {seleccionado && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-md">
            <Check className="w-4 h-4" />
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Búsqueda */}
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar medicamento..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
        />
        {busqueda && (
          <button
            onClick={() => setBusqueda("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Grid de medicamentos por tipo */}
      <div className="space-y-6">
        {(
          [
            ["UNIDAD", "Unidades (Pastillas, Cápsulas)"] as const,
            ["VOLUMEN_ML", "Líquidos (Jarabes, Soluciones)"] as const,
            ["PESO_MG", "Peso (Polvos, Cremas)"] as const,
            ["PORCENTAJE", "Porcentaje (Alcohol, Antisépticos)"] as const,
          ] as const
        ).map(([tipo, titulo]) => {
          const meds = porTipo[tipo];
          if (meds.length === 0) return null;

          return (
            <div key={tipo}>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                {ICONOS_POR_TIPO[tipo]}
                {titulo}
                <span className="text-xs font-normal text-slate-400">({meds.length})</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <AnimatePresence mode="popLayout">
                  {meds.map((med) => (
                    <motion.div key={med.id} layout>{renderTarjeta(med)}</motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview de dispensación */}
      {mostrarPreview && seleccionadas.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4"
        >
          <h4 className="font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-500" />
            Resumen de Dispensación
          </h4>

          <div className="space-y-2">
            {seleccionadas.map((sel) => {
              const med = medicamentos.find((m) => m.id === sel.medicamento_id);
              if (!med) return null;

              const unidad = getUnidad(sel.tipo_medida);
              const colores = COLORES_POR_TIPO[sel.tipo_medida];

              return (
                <div
                  key={sel.medicamento_id}
                  className={`flex items-center justify-between p-2 rounded-lg ${colores.bg}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={colores.icon}>{ICONOS_POR_TIPO[sel.tipo_medida]}</span>
                    <span className={`font-medium ${colores.text}`}>{med.nombre}</span>
                  </div>
                  <span className={`font-bold ${colores.text}`}>
                    {sel.cantidad} {unidad}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Totales por tipo */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["UNIDAD", "Unid."] as const,
                  ["VOLUMEN_ML", "ml"] as const,
                  ["PESO_MG", "mg"] as const,
                  ["PORCENTAJE", "%"] as const,
                ] as const
              ).map(([tipo, label]) => {
                const total = totalesPorTipo[tipo];
                if (total === 0) return null;
                const colores = COLORES_POR_TIPO[tipo];

                return (
                  <span
                    key={tipo}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${colores.bg} ${colores.text}`}
                  >
                    {total} {label}
                  </span>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Mensaje vacío */}
      {medicamentosFiltrados.length === 0 && (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <Pill className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No se encontraron medicamentos</p>
          {busqueda && <p className="text-sm mt-1">Intenta con otra búsqueda</p>}
        </div>
      )}
    </div>
  );
}

export default MedicineDispenser;

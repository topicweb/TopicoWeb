"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Pill, Droplets, Scale, Percent, AlertCircle, Check, X, Plus, Minus } from "lucide-react";
import { Medicamento, TipoMedida, DispensacionMedicamento, CONFIGURACIONES_MEDIDA } from "@/features/inventario/types";
import { verificarStockDisponible, validarLimiteDispensacion, StockError } from "@/core/db/dexie/logic/stock";

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

interface MedicineDispenserProps {
  medicamentos: Medicamento[];
  seleccionadas: DispensacionMedicamento[];
  onChange: (dispensaciones: DispensacionMedicamento[]) => void;
  limitesPorTipo?: Partial<Record<TipoMedida, number>>;
  mostrarPreview?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

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

const TIPO_LABELS: Record<TipoMedida, string> = {
  UNIDAD: "Unidades (Pastillas, Cápsulas)",
  VOLUMEN_ML: "Líquidos (Jarabes, Soluciones)",
  PESO_MG: "Peso (Polvos, Cremas)",
  PORCENTAJE: "Porcentaje (Alcohol, Antisépticos)",
};

const TIPO_ABREV: Record<TipoMedida, string> = {
  UNIDAD: "Unid.",
  VOLUMEN_ML: "ml",
  PESO_MG: "mg",
  PORCENTAJE: "%",
};

const getUnidad = (tipo: TipoMedida) => CONFIGURACIONES_MEDIDA[tipo].unidad;
const getEtiqueta = (tipo: TipoMedida) => CONFIGURACIONES_MEDIDA[tipo].etiqueta;

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════════

export function MedicineDispenser({
  medicamentos,
  seleccionadas,
  onChange,
  limitesPorTipo,
  mostrarPreview = true,
}: MedicineDispenserProps) {
  const [busqueda, setBusqueda] = useState("");
  const [validando, setValidando] = useState<Set<string>>(new Set());

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

  const porTipo = useMemo(() => {
    const grupos: Record<TipoMedida, Medicamento[]> = { UNIDAD: [], VOLUMEN_ML: [], PESO_MG: [], PORCENTAJE: [] };
    for (const med of medicamentosFiltrados) {
      if (med.tipo_medida && grupos[med.tipo_medida]) {
        grupos[med.tipo_medida].push(med);
      }
    }
    return grupos;
  }, [medicamentosFiltrados]);

  const totalesPorTipo = useMemo(() => {
    const totales: Record<TipoMedida, number> = { UNIDAD: 0, VOLUMEN_ML: 0, PESO_MG: 0, PORCENTAJE: 0 };
    for (const sel of seleccionadas) totales[sel.tipo_medida] += sel.cantidad;
    return totales;
  }, [seleccionadas]);

  const estaSeleccionado = useCallback(
    (medId: string) => seleccionadas.some((s) => s.medicamento_id === medId),
    [seleccionadas]
  );

  const getCantidad = useCallback(
    (medId: string) => seleccionadas.find((s) => s.medicamento_id === medId)?.cantidad || 0,
    [seleccionadas]
  );

  const agregarMedicamento = useCallback(
    async (medicamento: Medicamento) => {
      if (estaSeleccionado(medicamento.id)) return;

      setValidando((prev) => new Set(prev).add(medicamento.id));

      try {
        validarLimiteDispensacion(medicamento, 1, limitesPorTipo);
        await verificarStockDisponible(medicamento.id, 1, medicamento.tipo_medida);

        onChange([
          ...seleccionadas,
          {
            medicamento_id: medicamento.id,
            cantidad: 1,
            tipo_medida: medicamento.tipo_medida,
            presentacion_entregada: medicamento.presentacion,
          },
        ]);
      } catch (error) {
        if (error instanceof StockError) console.error(`Error: ${medicamento.nombre}:`, error.message);
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

  const removerMedicamento = useCallback(
    (medId: string) => onChange(seleccionadas.filter((s) => s.medicamento_id !== medId)),
    [onChange, seleccionadas]
  );

  const actualizarCantidad = useCallback(
    (medId: string, nuevaCantidad: number) => {
      const cantidad = Math.max(1, Math.floor(nuevaCantidad));
      onChange(seleccionadas.map((s) => (s.medicamento_id === medId ? { ...s, cantidad } : s)));
    },
    [onChange, seleccionadas]
  );

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
        className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all ${colores.bg} ${colores.border} ${seleccionado ? "ring-2 ring-offset-2 ring-indigo-500 shadow-lg" : "hover:shadow-md"
          }`}
        onClick={() => !seleccionado && agregarMedicamento(med)}
      >
        <div className="flex items-start justify-between mb-2">
          <div className={colores.icon}>{ICONOS_POR_TIPO[med.tipo_medida]}</div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${colores.bg} ${colores.text}`}>
            {getEtiqueta(med.tipo_medida)}
          </span>
        </div>

        <h4 className={`font-semibold ${colores.text} mb-1 line-clamp-2`}>{med.nombre}</h4>
        {med.presentacion && <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{med.presentacion}</p>}

        {stockBajo && (
          <div className="flex items-center gap-1 mt-2 text-rose-500 text-xs">
            <AlertCircle className="w-3 h-3" />
            <span>Stock bajo</span>
          </div>
        )}

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
                  type="button"
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
                  type="button"
                  onClick={() => actualizarCantidad(med.id, cantidad + 1)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => removerMedicamento(med.id)}
                className="flex items-center gap-1 text-rose-500 text-sm hover:text-rose-600 transition-colors"
              >
                <X className="w-4 h-4" />
                Remover
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {seleccionado && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-md">
            <Check className="w-4 h-4" />
          </div>
        )}
      </motion.div>
    );
  };

  const hayMedicamentosSinTipo =
    medicamentosFiltrados.length > 0 &&
    porTipo.UNIDAD.length === 0 &&
    porTipo.VOLUMEN_ML.length === 0 &&
    porTipo.PESO_MG.length === 0 &&
    porTipo.PORCENTAJE.length === 0;

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
            type="button"
            onClick={() => setBusqueda("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Grid por tipo */}
      <div className="space-y-6">
        {(Object.keys(TIPO_LABELS) as TipoMedida[]).map((tipo) => {
          const meds = porTipo[tipo];
          if (meds.length === 0) return null;

          return (
            <div key={tipo}>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                {ICONOS_POR_TIPO[tipo]}
                {TIPO_LABELS[tipo]}
                <span className="text-xs font-normal text-slate-400">({meds.length})</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <AnimatePresence mode="popLayout">
                  {meds.map((med) => (
                    <motion.div key={med.id} layout>
                      {renderTarjeta(med)}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}

        {hayMedicamentosSinTipo && (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-1">Medicamentos sin categoría</h4>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Se encontraron {medicamentosFiltrados.length} medicamentos sin <strong>tipo de medida</strong> definido.
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-2">
                  Edítalos en el{" "}
                  <Link href="/dashboard/inventory" className="underline font-medium hover:text-amber-900">
                    Inventario
                  </Link>{" "}
                  y asigna un tipo.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
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
                    {sel.cantidad} {getUnidad(sel.tipo_medida)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TIPO_ABREV) as TipoMedida[]).map((tipo) => {
                const total = totalesPorTipo[tipo];
                if (total === 0) return null;
                const colores = COLORES_POR_TIPO[tipo];
                return (
                  <span
                    key={tipo}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${colores.bg} ${colores.text}`}
                  >
                    {total} {TIPO_ABREV[tipo]}
                  </span>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Vacío */}
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

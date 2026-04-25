import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { AlertCircle, Pill } from "lucide-react";
import { TipoMedida } from "@/features/inventario/types";
import { ICONOS_POR_TIPO, TIPO_LABELS } from "@/features/atenciones/constants/medicamento";
import { MedicamentoCard } from "./MedicamentoCard";

interface MedicamentoGridProps {
  porTipo: Record<TipoMedida, any[]>;
  seleccionadas: any[];
  validando: Set<string>;
  onAgregar: (medicamento: any) => void;
  onRemover: (medId: string) => void;
  onActualizarCantidad: (medId: string, nuevaCantidad: number) => void;
  getCantidad: (medId: string) => number;
  hayMedicamentosSinTipo: boolean;
  medicamentosFiltrados: any[];
}

export function MedicamentoGrid({
  porTipo,
  seleccionadas,
  validando,
  onAgregar,
  onRemover,
  onActualizarCantidad,
  getCantidad,
  hayMedicamentosSinTipo,
  medicamentosFiltrados,
}: MedicamentoGridProps) {
  return (
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
                    <MedicamentoCard
                      medicamento={med}
                      seleccionado={seleccionadas.some((s) => s.medicamento_id === med.id)}
                      cantidad={getCantidad(med.id)}
                      validando={validando.has(med.id)}
                      onAgregar={() => onAgregar(med)}
                      onRemover={() => onRemover(med.id)}
                      onActualizarCantidad={(nuevaCantidad) => onActualizarCantidad(med.id, nuevaCantidad)}
                    />
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

      {medicamentosFiltrados.length === 0 && (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <Pill className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No se encontraron medicamentos</p>
        </div>
      )}
    </div>
  );
}

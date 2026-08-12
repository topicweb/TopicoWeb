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
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              {ICONOS_POR_TIPO[tipo]}
              {TIPO_LABELS[tipo]}
              <span className="text-xs font-normal text-muted">({meds.length})</span>
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
        <div className="rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-soft)] p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div>
              <h4 className="mb-1 font-medium text-foreground">Medicamentos sin categoría</h4>
              <p className="text-sm text-muted">
                Se encontraron {medicamentosFiltrados.length} medicamentos sin tipo de medida definido.
              </p>
              <p className="mt-2 text-sm text-muted">
                Edítalos en el{" "}
                <Link href="/dashboard/inventory" className="font-medium text-primary underline hover:text-primary-hover">
                  Inventario
                </Link>{" "}
                y asigna un tipo.
              </p>
            </div>
          </div>
        </div>
      )}

      {medicamentosFiltrados.length === 0 && (
        <div className="py-8 text-center text-muted">
          <Pill className="mx-auto mb-3 h-12 w-12 opacity-40" />
          <p>No se encontraron medicamentos</p>
        </div>
      )}
    </div>
  );
}

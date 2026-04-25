import { Paciente } from "@/features/pacientes/types";
import { DispensacionMedicamento } from "@/features/inventario/types";
import { User, AlertCircle } from "lucide-react";
import { MedicineDispenser } from "@/features/atenciones/components/MedicineDispenser";
import { motion, AnimatePresence } from "framer-motion";

interface MedicamentosStepProps {
  selectedPatient: Paciente | null;
  formData: {
    motivo: string;
    observacion: string;
  };
  medicamentos: any[];
  dispensedMeds: DispensacionMedicamento[];
  onDispensedMedsChange: (meds: DispensacionMedicamento[]) => void;
  error?: string | null;
}

export function MedicamentosStep({
  selectedPatient,
  formData,
  medicamentos,
  dispensedMeds,
  onDispensedMedsChange,
  error,
}: MedicamentosStepProps) {
  return (
    <div className="p-4 md:p-6 pb-32 h-full flex flex-col max-w-6xl mx-auto">
      {/* Header simple sin subtítulo */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Dispensación</h2>

        {dispensedMeds.length > 0 && (
          <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-bold rounded-full">
            {dispensedMeds.length} medicamentos
          </span>
        )}
      </div>

      {/* Resumen paciente */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 mb-3 shrink-0">
        <div className="h-10 w-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
          <User size={20} className="text-teal-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-slate-800 dark:text-white truncate">
            {selectedPatient?.nombres} {selectedPatient?.apellidos}
          </p>
          <p className="text-xs text-slate-500 truncate">{formData.motivo || "Sin motivo"}</p>
        </div>
      </div>

      {/* Error display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-rose-700 dark:text-rose-300 shrink-0"
          >
            <AlertCircle size={18} />
            <span className="text-sm">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Medicine Dispenser - ocupa todo el espacio restante */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm overflow-hidden min-h-0">
        <MedicineDispenser
          medicamentos={medicamentos}
          seleccionadas={dispensedMeds}
          onChange={onDispensedMedsChange}
          mostrarPreview={true}
        />
      </div>
    </div>
  );
}

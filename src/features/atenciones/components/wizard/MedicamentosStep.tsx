import { Paciente } from "@/features/pacientes/types";
import { DispensacionMedicamento } from "@/features/inventario/types";
import { User, AlertCircle } from "lucide-react";
import { MedicineDispenser } from "@/features/atenciones/components/MedicineDispenser";
import { motion, AnimatePresence } from "framer-motion";

interface MedicamentosStepProps {
  selectedPatient: Paciente | null;
  formData: { motivo: string; observacion: string };
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
    <div className="mx-auto flex h-full max-w-6xl flex-col p-4 pb-32 md:p-6">
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Dispensación</h2>
        {dispensedMeds.length > 0 && (
          <span className="badge-accent">{dispensedMeds.length} medicamentos</span>
        )}
      </div>

      <div className="mb-3 flex shrink-0 items-center gap-3 rounded-xl bg-muted p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary-soft)]">
          <User size={20} className="text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {selectedPatient?.nombres} {selectedPatient?.apellidos}
          </p>
          <p className="truncate text-xs text-muted">{formData.motivo || "Sin motivo"}</p>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 flex shrink-0 items-center gap-2 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4 text-danger"
          >
            <AlertCircle size={18} />
            <span className="text-sm">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-card min-h-0 flex-1 overflow-hidden p-4">
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

import { Paciente } from "@/features/pacientes/types";
import { Search, Plus, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PatientSelectorStepProps {
  selectedPatient: Paciente | null;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onPatientSelect: (patient: Paciente) => void;
  onPatientClear: () => void;
  filteredPacientes: Paciente[];
  onNextStep: () => void;
}

export function PatientSelectorStep({
  selectedPatient,
  searchTerm,
  onSearchChange,
  onPatientSelect,
  onPatientClear,
  filteredPacientes,
  onNextStep,
}: PatientSelectorStepProps) {
  return (
    <div className="flex h-full flex-col items-center p-4 pb-25 pt-8 lg:p-2 lg:pb-32 lg:pt-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center lg:mb-3">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-soft)] lg:mb-3 lg:h-12 lg:w-12">
            <User size={28} className="text-primary lg:size-6" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-foreground lg:mb-1 lg:text-lg">Seleccionar Paciente</h2>
          <p className="text-sm text-muted lg:text-xs">Busque por DNI o nombre del paciente</p>
        </div>

        {!selectedPatient ? (
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
            <input
              type="text"
              placeholder="Buscar DNI o nombre..."
              className="input-premium w-full border-l-4 border-l-primary py-3 pl-12 pr-4 text-base lg:py-2.5"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              autoFocus
            />
            <AnimatePresence>
              {searchTerm.length > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute z-50 mt-2 max-h-48 w-full overflow-auto rounded-xl border border-border bg-white shadow-lg"
                >
                  {filteredPacientes.map((p: Paciente) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => {
                        onPatientSelect(p);
                        onSearchChange("");
                        setTimeout(() => onNextStep(), 300);
                      }}
                      className="w-full border-b border-border px-4 py-3.5 text-left transition-colors last:border-0 hover:bg-[var(--primary-soft)]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-foreground">
                            {p.nombres} {p.apellidos}
                          </span>
                          <span className="text-xs text-muted">
                            {p.categoria} • DNI: {p.dni}
                          </span>
                        </div>
                        <Plus size={20} className="ml-2 shrink-0 text-accent" />
                      </div>
                    </button>
                  ))}
                  {filteredPacientes.length === 0 && (
                    <div className="p-6 text-center text-muted">
                      <p className="font-medium">Sin resultados</p>
                      <p className="mt-1 text-xs">Intente con otro término</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-2xl bg-linear-to-br from-primary to-[var(--primary-hover)] p-5 text-white shadow-lg lg:p-4"
          >
            <div className="flex items-center gap-4 lg:gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 lg:h-10 lg:w-10">
                <User size={24} className="text-white lg:size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold lg:text-base">
                  {selectedPatient.nombres} {selectedPatient.apellidos}
                </p>
                <p className="text-sm text-white/80 lg:text-xs">
                  {selectedPatient.categoria} • DNI: {selectedPatient.dni}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onPatientClear}
              className="mt-4 w-full rounded-lg bg-white/10 py-2.5 text-sm font-medium transition-colors hover:bg-white/20 lg:mt-3 lg:py-2 lg:text-xs"
            >
              Cambiar paciente
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

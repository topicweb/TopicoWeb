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
    <div className="h-full flex flex-col items-center p-4 lg:p-2 pt-8 lg:pt-4 pb-25 lg:pb-32">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 lg:mb-3">
          <div className="h-14 w-14 lg:h-12 lg:w-12 mx-auto rounded-2xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mb-4 lg:mb-3">
            <User size={28} className="text-teal-600 lg:size-24" />
          </div>
          <h2 className="text-xl lg:text-lg font-bold text-slate-900 dark:text-white mb-2 lg:mb-1">Seleccionar Paciente</h2>
          <p className="text-sm lg:text-xs text-slate-500">Busque por DNI o nombre del paciente</p>
        </div>

        {!selectedPatient ? (
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar DNI o nombre..."
              className="w-full rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 py-4 lg:py-3 pl-12 pr-4 text-base text-slate-700 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all dark:text-white shadow-sm"
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
                  className="absolute z-50 mt-2 max-h-48 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:bg-slate-800 dark:border-slate-700"
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
                      className="w-full px-4 py-3.5 text-left hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                    >
                      <div className="flex justify-between items-center">
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-slate-800 dark:text-white block truncate">
                            {p.nombres} {p.apellidos}
                          </span>
                          <span className="text-xs text-slate-500">
                            {p.categoria} • DNI: {p.dni}
                          </span>
                        </div>
                        <Plus size={20} className="text-teal-500 shrink-0 ml-2" />
                      </div>
                    </button>
                  ))}
                  {filteredPacientes.length === 0 && (
                    <div className="p-6 text-center text-slate-500">
                      <p className="font-medium">Sin resultados</p>
                      <p className="text-xs mt-1">Intente con otro término</p>
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
            className="rounded-2xl bg-linear-to-br from-teal-500 to-teal-600 p-5 lg:p-4 text-white shadow-xl shadow-teal-500/25"
          >
            <div className="flex items-center gap-4 lg:gap-3">
              <div className="h-12 w-12 lg:h-10 lg:w-10 rounded-xl bg-white/20 flex items-center justify-center">
                <User size={24} className="text-white lg:size-20" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg lg:text-base truncate">
                  {selectedPatient.nombres} {selectedPatient.apellidos}
                </p>
                <p className="text-teal-100 text-sm lg:text-xs">
                  {selectedPatient.categoria} • DNI: {selectedPatient.dni}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onPatientClear}
              className="mt-4 lg:mt-3 w-full py-2.5 lg:py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm lg:text-xs font-medium transition-colors"
            >
              Cambiar paciente
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

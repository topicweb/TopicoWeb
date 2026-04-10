"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DispensacionMedicamento } from "@/features/inventario/types";
import { Paciente } from "@/features/pacientes/types";
import { useAtenciones } from "@/features/atenciones/hooks/useAtenciones";
import { useMedicamentos } from "@/features/inventario/hooks/useMedicamentos";
import { usePacientes } from "@/features/pacientes/hooks/usePacientes";
import { useUsuarios } from "@/features/usuarios/hooks/useUsuarios";
import { MedicineDispenser } from "@/features/atenciones/components/MedicineDispenser";
import { SignosVitalesInput } from "@/features/atenciones/components/SignosVitalesInput";
import { SIGNOS_VITALES_VACIO } from "@/features/atenciones/types";
import { Search, Loader2, Save, ArrowLeft, User, AlertCircle, Plus, Pill, ChevronRight, ChevronLeft, Stethoscope, FileText, PillBottle } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  { id: 1, label: "Paciente", icon: User },
  { id: 2, label: "Consulta", icon: Stethoscope },
  { id: 3, label: "Medicamentos", icon: PillBottle },
];

export default function NewAttentionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Paciente | null>(null);

  const { registrarAtencion, error: atencionError, clearError } = useAtenciones();
  const { medicamentos } = useMedicamentos();
  const { pacientes } = usePacientes();
  const { usuarios } = useUsuarios();

  const [formData, setFormData] = useState({
    motivo: "",
    observacion: "",
    signos_vitales: SIGNOS_VITALES_VACIO,
  });

  const [dispensedMeds, setDispensedMeds] = useState<DispensacionMedicamento[]>([]);

  const filteredPacientes =
    searchTerm.length > 1
      ? pacientes
        .filter(
          (p: Paciente) =>
            p.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.dni.includes(searchTerm),
        )
        .slice(0, 5)
      : [];

  const canAdvance = () => {
    if (currentStep === 1) return selectedPatient !== null;
    if (currentStep === 2) return formData.motivo.trim().length > 0;
    return true;
  };

  const nextStep = () => {
    if (currentStep < 3 && canAdvance()) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !user) return;
    setLoading(true);
    clearError();

    const profile = usuarios.find((u) => u.email === (user.email || ""));
    if (!profile) {
      alert("Error: No se encontró perfil de personal asociado a su usuario.");
      setLoading(false);
      return;
    }

    const resultado = await registrarAtencion(
      {
        paciente_id: selectedPatient.id,
        fecha_atencion: new Date().toISOString(),
        motivo_consulta: formData.motivo,
        observacion: formData.observacion,
        signos_vitales: formData.signos_vitales,
      },
      dispensedMeds
    );

    if (resultado) {
      router.push("/dashboard/attentions");
    } else {
      setLoading(false);
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  const [[page, direction], setPage] = useState([1, 0]);

  const paginate = (newDirection: number) => {
    const newStep = currentStep + newDirection;
    if (newStep >= 1 && newStep <= 3 && canAdvance()) {
      setPage([newStep, newDirection]);
      setCurrentStep(newStep);
    }
  };

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4 shrink-0">
        <Link
          href="/dashboard/attentions"
          className="h-9 w-9 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-teal-600 transition-all"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Nueva Atención
          </h1>
          <p className="text-xs md:text-sm text-slate-500">Paso {currentStep} de 3</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-2 md:gap-4 mb-6 shrink-0 px-2">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const isPending = currentStep < step.id;

          return (
            <div key={step.id} className="flex items-center gap-2 md:gap-4">
              <button
                type="button"
                onClick={() => {
                  if (step.id < currentStep) {
                    setPage([step.id, -1]);
                    setCurrentStep(step.id);
                  }
                }}
                disabled={step.id > currentStep}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${isActive
                  ? "bg-teal-600 text-white shadow-lg shadow-teal-500/25"
                  : isCompleted
                    ? "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  } ${step.id < currentStep ? "cursor-pointer hover:bg-teal-200" : "cursor-default"}`}
              >
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? "bg-white/20" : isCompleted ? "bg-teal-200 dark:bg-teal-800" : "bg-slate-200 dark:bg-slate-700"
                  }`}>
                  {isCompleted ? "✓" : step.id}
                </div>
                <span className="hidden md:block text-sm font-semibold">{step.label}</span>
              </button>
              {idx < STEPS.length - 1 && (
                <ChevronRight size={16} className="text-slate-300 dark:text-slate-700 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Content - Carrusel */}
      <form onSubmit={handleSubmit} onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()} className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="h-full overflow-y-auto"
          >
            {/* Paso 1: Paciente */}
            {currentStep === 1 && (
              <div className="h-full flex flex-col items-center justify-center p-4 pb-24">
                <div className="w-full max-w-md">
                  <div className="text-center mb-8">
                    <div className="h-16 w-16 mx-auto rounded-2xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mb-4">
                      <User size={32} className="text-teal-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Seleccionar Paciente</h2>
                    <p className="text-sm text-slate-500">Busque por DNI o nombre del paciente</p>
                  </div>

                  {!selectedPatient ? (
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar DNI o nombre..."
                        className="w-full rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 py-4 pl-12 pr-4 text-base text-slate-700 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all dark:text-white shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
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
                                  setSelectedPatient(p);
                                  setSearchTerm("");
                                  setTimeout(nextStep, 300);
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
                      className="rounded-2xl bg-linear-to-br from-teal-500 to-teal-600 p-6 text-white shadow-xl shadow-teal-500/25"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-xl bg-white/20 flex items-center justify-center">
                          <User size={28} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-lg truncate">
                            {selectedPatient.nombres} {selectedPatient.apellidos}
                          </p>
                          <p className="text-teal-100 text-sm">
                            {selectedPatient.categoria} • DNI: {selectedPatient.dni}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedPatient(null)}
                        className="mt-4 w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors"
                      >
                        Cambiar paciente
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {/* Paso 2: Consulta */}
            {currentStep === 2 && (
              <div className="p-4 md:p-6 pb-24 space-y-4 max-w-5xl mx-auto">
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Datos de la Consulta</h2>
                  <p className="text-sm text-slate-500">Ingrese el motivo, observaciones y signos vitales</p>
                </div>

                {/* Paciente seleccionado (resumen compacto) */}
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/50 max-w-fit mx-auto">
                  <div className="h-8 w-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                    <User size={16} className="text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 dark:text-white truncate">
                      {selectedPatient?.nombres} {selectedPatient?.apellidos}
                    </p>
                    <p className="text-xs text-slate-500">{selectedPatient?.dni}</p>
                  </div>
                </div>

                {/* Grid de 2 columnas en PC */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Motivo */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                      <FileText size={16} className="text-teal-500" />
                      Motivo <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-3 text-sm text-slate-800 dark:text-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 outline-none transition-all h-24 resize-none"
                      value={formData.motivo}
                      onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                      placeholder="Describa el motivo de consulta..."
                      autoFocus
                    />
                  </div>

                  {/* Observación */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Tratamiento / Observación
                    </label>
                    <textarea
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-3 text-sm text-slate-800 dark:text-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 outline-none transition-all h-24 resize-none"
                      value={formData.observacion}
                      onChange={(e) => setFormData({ ...formData, observacion: e.target.value })}
                      placeholder="Describa el tratamiento..."
                    />
                  </div>
                </div>

                {/* Signos Vitales - Centrado */}
                <div className="max-w-2xl mx-auto">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 text-center">
                      Signos Vitales
                    </label>
                    <SignosVitalesInput
                      value={formData.signos_vitales}
                      onChange={(signos) => setFormData({ ...formData, signos_vitales: signos })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Paso 3: Medicamentos */}
            {currentStep === 3 && (
              <div className="p-4 md:p-6 pb-24 max-w-4xl mx-auto">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Dispensación</h2>
                  <p className="text-sm text-slate-500">Seleccione los medicamentos a dispensar</p>
                </div>

                {/* Resumen paciente */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                    <User size={20} className="text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 dark:text-white truncate">
                      {selectedPatient?.nombres} {selectedPatient?.apellidos}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{formData.motivo || "Sin motivo"}</p>
                  </div>
                  {dispensedMeds.length > 0 && (
                    <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full">
                      {dispensedMeds.length} meds
                    </span>
                  )}
                </div>

                {/* Error display */}
                <AnimatePresence>
                  {atencionError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-rose-700 dark:text-rose-300"
                    >
                      <AlertCircle size={18} />
                      <span className="text-sm">{atencionError}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Medicine Dispenser */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                  <MedicineDispenser
                    medicamentos={medicamentos}
                    seleccionadas={dispensedMeds}
                    onChange={setDispensedMeds}
                    mostrarPreview={true}
                  />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm border-t border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-center max-w-3xl mx-auto">
            <button
              type="button"
              onClick={() => paginate(-1)}
              disabled={currentStep === 1}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all ${currentStep === 1
                ? "opacity-0 pointer-events-none"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                }`}
            >
              <ChevronLeft size={18} />
              Anterior
            </button>

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={() => paginate(1)}
                disabled={!canAdvance()}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-600 text-white font-semibold shadow-lg shadow-teal-500/25 hover:bg-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading || !selectedPatient}
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-indigo-600 text-white font-bold shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}
                {loading ? "Guardando..." : "Guardar"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

import { useAuth } from "@/core/providers/AuthProvider";

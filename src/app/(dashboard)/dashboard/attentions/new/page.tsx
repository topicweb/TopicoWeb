"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/core/providers/AuthProvider";
import { useAtenciones } from "@/features/atenciones/hooks/useAtenciones";
import { useMedicamentos } from "@/features/inventario/hooks/useMedicamentos";
import { usePacientes } from "@/features/pacientes/hooks/usePacientes";
import { useUsuarios } from "@/features/usuarios/hooks/useUsuarios";
import { useAttentionWizard } from "@/features/atenciones/hooks/useAttentionWizard";
import { PatientSelectorStep } from "@/features/atenciones/components/wizard/PatientSelectorStep";
import { ConsultaFormStep } from "@/features/atenciones/components/wizard/ConsultaFormStep";
import { MedicamentosStep } from "@/features/atenciones/components/wizard/MedicamentosStep";
import { WizardStepper } from "@/features/atenciones/components/wizard/WizardStepper";
import { WizardNavigation } from "@/features/atenciones/components/wizard/WizardNavigation";
import { ArrowLeft, User, Stethoscope, PillBottle } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// ───────────────────────────────────────────────────────────────────────────────
// NEW ATTENTION WIZARD PAGE
// Flujo guiado de 3 pasos para registrar nuevas atenciones médicas
// ───────────────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Paciente", icon: User },
  { id: 2, label: "Consulta", icon: Stethoscope },
  { id: 3, label: "Medicamentos", icon: PillBottle },
];

export default function NewAttentionPage() {
  const router = useRouter();
  const { user } = useAuth();

  // ── WIZARD HOOK ───────────────────────────────────────────────────────────────
  const {
    currentStep,
    direction,
    loading,
    setLoading,
    selectedPatient,
    setSelectedPatient,
    searchTerm,
    setSearchTerm,
    formData,
    setFormData,
    dispensedMeds,
    setDispensedMeds,
    goToStep,
    canAdvance,
    getFilteredPacientes,
    slideVariants,
  } = useAttentionWizard();

  // ── DATA HOOKS ───────────────────────────────────────────────────────────────
  const { registrarAtencion, error: atencionError, clearError } = useAtenciones();
  const { medicamentos } = useMedicamentos();
  const { pacientes } = usePacientes();
  const { usuarios } = useUsuarios();

  // ── FILTERING ─────────────────────────────────────────────────────────────────
  const filteredPacientes = getFilteredPacientes(pacientes);

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

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto">
      {/* Header con navegación */}
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

      {/* Stepper de navegación */}
      <WizardStepper steps={STEPS} currentStep={currentStep} onStepClick={goToStep} />

      {/* Content del wizard con animaciones */}
      <form onSubmit={handleSubmit} onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex-1 overflow-y-auto"
          >
            {/* Paso 1: Selección de paciente */}
            {currentStep === 1 && (
              <PatientSelectorStep
                selectedPatient={selectedPatient}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onPatientSelect={setSelectedPatient}
                onPatientClear={() => setSelectedPatient(null)}
                filteredPacientes={filteredPacientes}
                onNextStep={() => goToStep(2)}
              />
            )}

            {/* Paso 2: Datos de consulta */}
            {currentStep === 2 && (
              <ConsultaFormStep
                selectedPatient={selectedPatient}
                formData={formData}
                onFormDataChange={setFormData}
              />
            )}

            {/* Paso 3: Dispensación de medicamentos */}
            {currentStep === 3 && (
              <MedicamentosStep
                selectedPatient={selectedPatient}
                formData={formData}
                medicamentos={medicamentos}
                dispensedMeds={dispensedMeds}
                onDispensedMedsChange={setDispensedMeds}
                error={atencionError}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Botones de navegación del wizard */}
        <WizardNavigation
          currentStep={currentStep}
          totalSteps={3}
          canAdvance={canAdvance()}
          loading={loading}
          onPrevious={() => goToStep(currentStep - 1)}
          onNext={() => goToStep(currentStep + 1)}
          onSubmit={handleSubmit}
        />
      </form>
    </div>
  );
}

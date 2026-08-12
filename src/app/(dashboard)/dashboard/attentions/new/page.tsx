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

const STEPS = [
  { id: 1, label: "Paciente", icon: User },
  { id: 2, label: "Consulta", icon: Stethoscope },
  { id: 3, label: "Medicamentos", icon: PillBottle },
];

export default function NewAttentionPage() {
  const router = useRouter();
  const { user } = useAuth();

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

  const { registrarAtencion, error: atencionError, clearError } = useAtenciones();
  const { medicamentos } = useMedicamentos();
  const { pacientes } = usePacientes();
  const { usuarios } = useUsuarios();

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
    <div className="mx-auto flex h-full max-w-5xl flex-col">
      <div className="mb-4 flex shrink-0 items-center gap-3 border-b border-border pb-4">
        <Link
          href="/dashboard/attentions"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground shadow-sm transition-all hover:border-primary/30 hover:bg-[var(--primary-soft)] hover:text-primary"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
            Nueva <span className="text-gradient">Atención</span>
          </h1>
          <p className="text-xs text-muted md:text-sm">Paso {currentStep} de 3</p>
        </div>
      </div>

      <WizardStepper steps={STEPS} currentStep={currentStep} onStepClick={goToStep} />

      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
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
            {currentStep === 2 && (
              <ConsultaFormStep
                selectedPatient={selectedPatient}
                formData={formData}
                onFormDataChange={setFormData}
              />
            )}
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

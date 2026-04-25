import { useState } from "react";
import { Paciente } from "@/features/pacientes/types";
import { DispensacionMedicamento } from "@/features/inventario/types";
import { SIGNOS_VITALES_VACIO, SignosVitales } from "@/features/atenciones/types";

// ───────────────────────────────────────────────────────────────────────────────
// HOOK DE ASISTENTE DE ATENCIÓN
// Encapsula toda la lógica del wizard de creación de atención
// ───────────────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Paciente" },
  { id: 2, label: "Consulta" },
  { id: 3, label: "Medicamentos" },
];

interface UseAttentionWizardReturn {
  // Estado del asistente
  currentStep: number;
  direction: number;
  loading: boolean;
  setLoading: (loading: boolean) => void;

  // Datos del formulario
  selectedPatient: Paciente | null;
  setSelectedPatient: (patient: Paciente | null) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  formData: {
    motivo: string;
    observacion: string;
    signos_vitales: SignosVitales;
  };
  setFormData: (data: UseAttentionWizardReturn["formData"]) => void;
  dispensedMeds: DispensacionMedicamento[];
  setDispensedMeds: (meds: DispensacionMedicamento[]) => void;

  // Navegación
  goToStep: (step: number) => void;
  canAdvance: () => boolean;

  // Filtrado
  getFilteredPacientes: (pacientes: Paciente[]) => Paciente[];

  // Animación
  slideVariants: {
    enter: (direction: number) => { x: number; opacity: number };
    center: { x: number; opacity: number };
    exit: (direction: number) => { x: number; opacity: number };
  };

  // Constantes
  STEPS: typeof STEPS;
}

export function useAttentionWizard(): UseAttentionWizardReturn {
  // ── ESTADO DEL ASISTENTE ───────────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const [loading, setLoading] = useState(false);

  // ── DATOS DEL FORMULARIO ─────────────────────────────────────────────────────────────────
  const [selectedPatient, setSelectedPatient] = useState<Paciente | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    motivo: "",
    observacion: "",
    signos_vitales: SIGNOS_VITALES_VACIO,
  });

  const [dispensedMeds, setDispensedMeds] = useState<DispensacionMedicamento[]>([]);

  // ── LÓGICA DE NAVEGACIÓN ─────────────────────────────────────────────────────────
  const goToStep = (newStep: number) => {
    if (newStep >= 1 && newStep <= 3 && canAdvance()) {
      const newDirection = newStep > currentStep ? 1 : -1;
      setDirection(newDirection);
      setCurrentStep(newStep);
    }
  };

  // ── VALIDACIÓN ────────────────────────────────────────────────────────────────
  const canAdvance = () => {
    if (currentStep === 1) return selectedPatient !== null;
    if (currentStep === 2) return formData.motivo.trim().length > 0;
    return true;
  };

  // ── LÓGICA DE FILTRADO ────────────────────────────────────────────────────────────
  const getFilteredPacientes = (pacientes: Paciente[]) => {
    if (searchTerm.length <= 1) return [];

    return pacientes
      .filter(
        (p: Paciente) =>
          p.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.dni.includes(searchTerm),
      )
      .slice(0, 5);
  };

  // ── VARIANTES DE ANIMACIÓN ─────────────────────────────────────────────────────────
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

  return {
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
    STEPS,
  };
}

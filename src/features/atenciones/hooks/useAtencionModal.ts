import { useState, useEffect, useCallback } from "react";
import { AtencionFormData, SignosVitales, DispensacionMedicamento, SIGNOS_VITALES_VACIO } from "@/features/atenciones/types";

// ───────────────────────────────────────────────────────────────────────────────
// HOOK DE MODAL DE ATENCIÓN
// Encapsula la lógica del modal de creación de atención
// ───────────────────────────────────────────────────────────────────────────────

interface FormState {
  motivo_consulta: string;
  observacion: string;
  signos_vitales: SignosVitales;
  fecha_atencion: string;
}

const DEFAULT_FORM: FormState = {
  motivo_consulta: "",
  observacion: "",
  signos_vitales: SIGNOS_VITALES_VACIO,
  fecha_atencion: new Date().toISOString().split("T")[0],
};

interface UseAtencionModalReturn {
  form: FormState;
  dispensaciones: DispensacionMedicamento[];
  saving: boolean;
  error: string | null;
  activeTab: "datos" | "medicamentos";
  updateField: <K extends keyof FormState>(field: K, value: FormState[K]) => void;
  setDispensaciones: (dispensaciones: DispensacionMedicamento[]) => void;
  setActiveTab: (tab: "datos" | "medicamentos") => void;
  handleSubmit: (e: React.FormEvent, pacienteId: string, onSave: (atencion: AtencionFormData, dispensaciones: DispensacionMedicamento[]) => Promise<void>, onClose: () => void) => Promise<void>;
  reset: () => void;
}

export function useAtencionModal(isOpen: boolean): UseAtencionModalReturn {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [dispensaciones, setDispensaciones] = useState<DispensacionMedicamento[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"datos" | "medicamentos">("datos");

  useEffect(() => {
    if (isOpen) {
      reset();
    }
  }, [isOpen]);

  const updateField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = async (
    e: React.FormEvent,
    pacienteId: string,
    onSave: (atencion: AtencionFormData, dispensaciones: DispensacionMedicamento[]) => Promise<void>,
    onClose: () => void
  ) => {
    e.preventDefault();
    setError(null);

    if (!form.motivo_consulta.trim()) {
      setError("El motivo de consulta es requerido");
      return;
    }

    setSaving(true);
    try {
      const atencionData: AtencionFormData = {
        paciente_id: pacienteId,
        motivo_consulta: form.motivo_consulta,
        observacion: form.observacion,
        signos_vitales: form.signos_vitales,
        fecha_atencion: form.fecha_atencion,
      };

      await onSave(atencionData, dispensaciones);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar la atención");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setForm(DEFAULT_FORM);
    setDispensaciones([]);
    setError(null);
    setActiveTab("datos");
  };

  return {
    form,
    dispensaciones,
    saving,
    error,
    activeTab,
    updateField,
    setDispensaciones,
    setActiveTab,
    handleSubmit,
    reset,
  };
}

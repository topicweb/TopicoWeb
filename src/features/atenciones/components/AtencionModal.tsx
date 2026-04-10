"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Save, ClipboardList, Stethoscope, Pill, AlertCircle } from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useMedicamentos } from "@/features/inventario";
import { SignosVitalesInput } from "./SignosVitalesInput";
import { MedicineDispenser } from "./MedicineDispenser";
import { AtencionFormData, SignosVitales, DispensacionMedicamento, SIGNOS_VITALES_VACIO } from "../types";

interface AtencionModalProps {
  isOpen: boolean;
  onClose: () => void;
  pacienteId: string;
  pacienteNombre: string;
  onSave: (atencion: AtencionFormData, dispensaciones: DispensacionMedicamento[]) => Promise<void>;
}

interface FormState {
  motivo_consulta: string;
  observacion: string;
  signos_vitales: SignosVitales;
  fecha_atencion: string;
}

const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", damping: 25, stiffness: 300 },
  },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } },
};

const DEFAULT_FORM: FormState = {
  motivo_consulta: "",
  observacion: "",
  signos_vitales: SIGNOS_VITALES_VACIO,
  fecha_atencion: new Date().toISOString().split("T")[0],
};

const inputBaseClass =
  "w-full rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-4 text-base font-medium text-slate-800 dark:text-white shadow-sm focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/5 transition-all outline-none";

const textareaBaseClass = `${inputBaseClass} min-h-[100px] resize-none`;

export function AtencionModal({ isOpen, onClose, pacienteId, pacienteNombre, onSave }: AtencionModalProps) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [dispensaciones, setDispensaciones] = useState<DispensacionMedicamento[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"datos" | "medicamentos">("datos");

  const { medicamentos, loading: loadingMedicamentos } = useMedicamentos();

  useEffect(() => {
    if (isOpen) {
      setForm(DEFAULT_FORM);
      setDispensaciones([]);
      setError(null);
      setActiveTab("datos");
    }
  }, [isOpen]);

  const updateField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        />

        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900 border border-white dark:border-slate-800 shadow-2xl flex flex-col"
        >
          {/* Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-32 bg-linear-to-b from-teal-500/5 to-transparent" />
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl" />
            <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl" />
          </div>

          {/* Header */}
          <div className="relative p-8 pb-4 shrink-0">
            <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none">
              <Stethoscope size={120} className="text-teal-500 transform -rotate-12" />
            </div>
            <div className="flex justify-between items-center relative z-10">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Nueva Atención
                </h2>
                <p className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest mt-1">
                  Paciente: {pacienteNombre}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-10 w-10 flex items-center justify-center rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-all text-slate-500"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mt-6 relative z-10">
              <TabButton
                active={activeTab === "datos"}
                onClick={() => setActiveTab("datos")}
                icon={<ClipboardList size={16} />}
                label="Datos Clínicos"
              />
              <TabButton
                active={activeTab === "medicamentos"}
                onClick={() => setActiveTab("medicamentos")}
                icon={<Pill size={16} />}
                label="Medicamentos"
                badge={dispensaciones.length > 0 ? dispensaciones.length : undefined}
              />
            </div>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 pt-4 space-y-5 relative z-10">
            <AnimatePresence mode="wait">
              {activeTab === "datos" ? (
                <motion.div
                  key="datos"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-5"
                >
                  {/* Fecha */}
                  <FormField label="Fecha de Atención" icon={<ClipboardList size={14} className="text-teal-500" />}>
                    <input
                      type="date"
                      required
                      className={inputBaseClass}
                      value={form.fecha_atencion}
                      onChange={(e) => updateField("fecha_atencion", e.target.value)}
                    />
                  </FormField>

                  {/* Motivo */}
                  <FormField
                    label="Motivo de Consulta"
                    icon={<Stethoscope size={14} className="text-teal-500" />}
                  >
                    <textarea
                      required
                      rows={3}
                      placeholder="Describa el motivo de la consulta..."
                      className={textareaBaseClass}
                      value={form.motivo_consulta}
                      onChange={(e) => updateField("motivo_consulta", e.target.value)}
                    />
                  </FormField>

                  {/* Signos Vitales */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      <ActivityIcon />
                      Signos Vitales
                    </label>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <SignosVitalesInput
                        value={form.signos_vitales}
                        onChange={(sv) => updateField("signos_vitales", sv)}
                      />
                    </div>
                  </div>

                  {/* Observaciones */}
                  <FormField label="Observaciones (Opcional)">
                    <textarea
                      rows={3}
                      placeholder="Notas adicionales, diagnóstico, recomendaciones..."
                      className={textareaBaseClass}
                      value={form.observacion}
                      onChange={(e) => updateField("observacion", e.target.value)}
                    />
                  </FormField>
                </motion.div>
              ) : (
                <motion.div
                  key="medicamentos"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  {loadingMedicamentos ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="h-8 w-8 border-2 border-teal-500/30 border-t-teal-500 animate-spin rounded-full" />
                    </div>
                  ) : (
                    <MedicineDispenser
                      medicamentos={medicamentos}
                      seleccionadas={dispensaciones}
                      onChange={setDispensaciones}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-4 flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-2xl bg-linear-to-r from-teal-600 to-teal-500 px-8 py-4 text-sm font-bold text-white hover:shadow-xl hover:shadow-teal-500/30 transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                ) : (
                  <Save size={18} />
                )}
                {saving ? "PROCESANDO..." : "GUARDAR ATENCIÓN"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTES
// ═══════════════════════════════════════════════════════════════════════════════

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

function TabButton({ active, onClick, icon, label, badge }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${active
        ? "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        }`}
    >
      {icon}
      {label}
      {badge !== undefined && (
        <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-teal-500 text-white">{badge}</span>
      )}
    </button>
  );
}

interface FormFieldProps {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

function FormField({ label, icon, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

function ActivityIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-teal-500"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

export default AtencionModal;

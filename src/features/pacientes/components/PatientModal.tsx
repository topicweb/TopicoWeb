"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { X, Save, User, Fingerprint, BookOpen, Clock, Users } from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import type { Paciente, CategoriaPaciente, ProgramaEstudio } from "../types";

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Paciente | null;
  programas: ProgramaEstudio[];
  onSave: (data: Partial<Paciente>) => Promise<void>;
}

interface FormState {
  dni: string;
  nombres: string;
  apellidos: string;
  categoria: CategoriaPaciente;
  programa_id: string | null;
  sexo: "M" | "F";
  metadata: {
    turno?: string;
    ciclo?: string;
  };
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
  dni: "",
  nombres: "",
  apellidos: "",
  categoria: "estudiante",
  programa_id: "",
  sexo: "M",
  metadata: { turno: "Mañana" },
};

const CATEGORIAS: { value: CategoriaPaciente; label: string }[] = [
  { value: "estudiante", label: "Estudiante" },
  { value: "docente", label: "Docente" },
  { value: "administrativo", label: "Administrativo" },
  { value: "limpieza", label: "Limpieza" },
];

const CICLOS = ["I", "II", "III", "IV", "V", "VI"] as const;
const TURNOS = ["Mañana", "Tarde", "Noche"] as const;

const inputBaseClass =
  "w-full rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-4 text-base font-medium text-slate-800 dark:text-white shadow-sm focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/5 transition-all outline-none";

export function PatientModal({ isOpen, onClose, item, programas, onSave }: PatientModalProps) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      const metadata = item.metadata as FormState["metadata"];
      setForm({
        dni: item.dni,
        nombres: item.nombres,
        apellidos: item.apellidos,
        categoria: item.categoria,
        programa_id: item.programa_id ?? null,
        sexo: item.sexo,
        metadata: { turno: metadata?.turno ?? "Mañana", ciclo: metadata?.ciclo },
      });
    } else {
      setForm({
        ...DEFAULT_FORM,
        programa_id: programas[0]?.id ?? null,
      });
    }
  }, [item, isOpen, programas]);

  const showProgram = useMemo(
    () => form.categoria === "estudiante" || form.categoria === "docente",
    [form.categoria]
  );

  const showCiclo = useMemo(() => form.categoria === "estudiante", [form.categoria]);

  const updateField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "categoria") {
        const cat = value as CategoriaPaciente;
        if (cat !== "estudiante" && cat !== "docente") {
          next.programa_id = null;
        } else if (!prev.programa_id && programas.length > 0) {
          next.programa_id = programas[0].id;
        }
        next.metadata = {
          turno: prev.metadata.turno ?? "Mañana",
          ...(cat === "estudiante" && { ciclo: prev.metadata.ciclo ?? "I" }),
        };
      }

      return next;
    });
  }, [programas]);

  const updateMetadata = useCallback((key: keyof FormState["metadata"], value: string) => {
    setForm((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, [key]: value },
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        metadata: form.metadata as Record<string, unknown>,
      });
      onClose();
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
          className="relative w-full max-w-[95vw] md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl md:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl"
        >
          {/* Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-40 bg-linear-to-b from-teal-500/5 to-transparent" />
            <div className="absolute -right-24 -top-24 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl" />
            <div className="absolute -left-24 -bottom-24 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl" />
          </div>

          {/* Header - Compacto en móvil */}
          <div className="px-4 md:px-8 pt-4 md:pt-8 pb-3 md:pb-4 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-20 border-b border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {item ? "Actualizar Paciente" : "Registrar Paciente"}
                </h2>
                <p className="text-[10px] md:text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest mt-0.5">
                  Ficha Médica
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-9 w-9 md:h-10 md:w-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-all text-slate-500"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-4 md:px-8 pt-4 pb-4 md:pb-6 space-y-4 md:space-y-6 relative z-10">
            {/* DNI - Compacto */}
            <div className="bg-linear-to-b from-teal-50/50 to-white dark:from-teal-900/10 dark:to-slate-900 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-teal-100 dark:border-teal-900/30 shadow-sm">
              <label className="flex items-center gap-2 text-[10px] md:text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-2 md:mb-3">
                <Fingerprint size={14} />
                DNI
              </label>
              <input
                required
                maxLength={8}
                placeholder="00000000"
                className="w-full bg-transparent text-2xl md:text-3xl font-bold text-slate-900 dark:text-white placeholder-slate-200 dark:placeholder-slate-800 outline-none tracking-[0.15em] focus:text-teal-600 transition-colors"
                value={form.dni}
                onChange={(e) => updateField("dni", e.target.value.replace(/\D/g, ""))}
              />
            </div>

            {/* Nombres / Apellidos - Más compacto en móvil */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <FormField label="Nombres">
                <input
                  required
                  placeholder="Ej. María"
                  className={`${inputBaseClass} py-3 md:p-4 text-sm md:text-base`}
                  value={form.nombres}
                  onChange={(e) => updateField("nombres", e.target.value)}
                />
              </FormField>
              <FormField label="Apellidos">
                <input
                  required
                  placeholder="Ej. García"
                  className={`${inputBaseClass} py-3 md:p-4 text-sm md:text-base`}
                  value={form.apellidos}
                  onChange={(e) => updateField("apellidos", e.target.value)}
                />
              </FormField>
            </div>

            {/* Categoría / Sexo - En una fila en desktop, apilado en móvil pequeño */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <FormField label="Categoría" icon={<Users size={14} className="text-teal-500" />}>
                <select
                  className={`${inputBaseClass} appearance-none cursor-pointer py-3 md:p-4 text-sm md:text-base`}
                  value={form.categoria}
                  onChange={(e) => updateField("categoria", e.target.value as CategoriaPaciente)}
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Sexo">
                <GenderToggle value={form.sexo} onChange={(v) => updateField("sexo", v)} />
              </FormField>
            </div>

            {/* Programa - Compacto */}
            {showProgram && (
              <FormField label="Programa" icon={<BookOpen size={14} className="text-teal-500" />}>
                <select
                  className={`${inputBaseClass} py-3 md:p-4 text-sm md:text-base`}
                  value={form.programa_id ?? ""}
                  onChange={(e) => updateField("programa_id", e.target.value || null)}
                >
                  {programas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            {/* Ciclo / Turno - Compacto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              {showCiclo && (
                <FormField label="Ciclo">
                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                    {CICLOS.map((c) => (
                      <CycleButton
                        key={c}
                        value={c}
                        selected={form.metadata.ciclo === c}
                        onClick={() => updateMetadata("ciclo", c)}
                      />
                    ))}
                  </div>
                </FormField>
              )}
              <FormField
                label="Turno"
                icon={<Clock size={14} className="text-teal-500" />}
                className={!showCiclo ? "sm:col-span-2" : ""}
              >
                <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-xl md:rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
                  {TURNOS.map((t) => (
                    <ShiftButton
                      key={t}
                      value={t}
                      selected={form.metadata.turno === t}
                      onClick={() => updateMetadata("turno", t)}
                    />
                  ))}
                </div>
              </FormField>
            </div>

            {/* Actions - Sticky en móvil para siempre visible */}
            <div className="sticky bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-slate-100 dark:border-slate-800 p-3 md:p-0 md:pt-4 -mx-4 md:mx-0 px-4 md:px-0 mt-4 md:mt-6 flex justify-end gap-2 md:gap-3 z-20">
              <button
                type="button"
                onClick={onClose}
                className="px-4 md:px-6 py-2.5 md:py-3 text-xs md:text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors uppercase tracking-wider md:tracking-widest"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 md:gap-2 rounded-xl md:rounded-2xl bg-linear-to-r from-teal-600 to-teal-500 px-5 md:px-10 py-2.5 md:py-4 text-xs md:text-sm font-bold text-white hover:shadow-lg hover:shadow-teal-500/30 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
              >
                {saving ? (
                  <div className="h-3.5 w-3.5 md:h-4 md:w-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                ) : (
                  <Save size={16} className="md:w-18px md:h-18px" />
                )}
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// Subcomponents

interface FormFieldProps {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function FormField({ label, icon, children, className = "" }: FormFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

interface GenderToggleProps {
  value: "M" | "F";
  onChange: (value: "M" | "F") => void;
}

function GenderToggle({ value, onChange }: GenderToggleProps) {
  return (
    <div className="flex bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
      {[
        { key: "M", label: "MASCULINO", activeColor: "text-teal-600 dark:text-teal-400" },
        { key: "F", label: "FEMENINO", activeColor: "text-pink-600 dark:text-pink-400" },
      ].map(({ key, label, activeColor }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key as "M" | "F")}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${value === key
            ? `bg-white dark:bg-slate-800 shadow-md ${activeColor} scale-[1.02]`
            : "text-slate-400"
            }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

interface CycleButtonProps {
  value: string;
  selected: boolean;
  onClick: () => void;
}

function CycleButton({ value, selected, onClick }: CycleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 w-10 text-xs font-bold rounded-xl transition-all border ${selected
        ? "bg-teal-600 border-teal-600 text-white shadow-lg shadow-teal-500/30 scale-110"
        : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-teal-500/30"
        }`}
    >
      {value}
    </button>
  );
}

interface ShiftButtonProps {
  value: string;
  selected: boolean;
  onClick: () => void;
}

function ShiftButton({ value, selected, onClick }: ShiftButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${selected
        ? "bg-white dark:bg-slate-800 shadow-md text-teal-600 dark:text-teal-400 scale-[1.02]"
        : "text-slate-400"
        }`}
    >
      {value.toUpperCase()}
    </button>
  );
}

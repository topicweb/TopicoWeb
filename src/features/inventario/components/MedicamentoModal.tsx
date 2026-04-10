"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Save, Package, Info, Pill } from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import type { Medicamento } from "../types";

interface MedicamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicamento?: Medicamento | null;
  onSave: (med: Partial<Medicamento>) => Promise<void>;
}

interface FormState {
  nombre: string;
  unidad_medida: string;
  anaquel: string;
  stock_minimo: number;
  descripcion: string;
  tipo_medida: 'UNIDAD' | 'VOLUMEN_ML' | 'PESO_MG' | 'PORCENTAJE';
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
  nombre: "",
  unidad_medida: "unidad",
  anaquel: "",
  stock_minimo: 10,
  descripcion: "",
  tipo_medida: "UNIDAD",
};

const UNIDADES_MEDIDA = [
  { value: "unidad", label: "Unidad" },
  { value: "ml", label: "mL (mililitros)" },
  { value: "mg", label: "mg (miligramos)" },
  { value: "comprimido", label: "Comprimido" },
  { value: "ampolla", label: "Ampolla" },
  { value: "sobre", label: "Sobre" },
  { value: "frasco", label: "Frasco" },
] as const;

const TIPOS_MEDIDA = [
  { value: "UNIDAD" as const, label: "Unidad (pastillas, cápsulas)", icon: "💊" },
  { value: "VOLUMEN_ML" as const, label: "Volumen (jarabe, gotas)", icon: "🧪" },
  { value: "PESO_MG" as const, label: "Peso (polvo, crema)", icon: "⚖️" },
  { value: "PORCENTAJE" as const, label: "Porcentaje (alcohol)", icon: "📊" },
] as const;

const inputBaseClass =
  "w-full rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm font-medium text-slate-800 dark:text-white shadow-sm focus:border-teal-500/50 focus:ring-3 focus:ring-teal-500/5 transition-all outline-none md:rounded-2xl md:p-4 md:text-base";

export function MedicamentoModal({ isOpen, onClose, medicamento, onSave }: MedicamentoModalProps) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (medicamento) {
      setForm({
        nombre: medicamento.nombre,
        unidad_medida: medicamento.unidad_medida ?? "unidad",
        anaquel: medicamento.anaquel ?? "",
        stock_minimo: medicamento.stock_minimo,
        descripcion: medicamento.descripcion || "",
        tipo_medida: medicamento.tipo_medida ?? "UNIDAD",
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [medicamento, isOpen]);

  const updateField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        ...(medicamento ? {} : { activo: 1, stock_actual: 0 }),
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
          className="relative w-full max-w-lg md:max-w-2xl lg:max-w-4xl overflow-hidden rounded-2xl md:rounded-[2.5rem] bg-white dark:bg-slate-900 border border-white dark:border-slate-800 shadow-2xl max-h-[95dvh] md:max-h-[90vh] flex flex-col"
        >
          {/* Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-32 bg-linear-to-b from-teal-500/5 to-transparent" />
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl" />
            <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl" />
          </div>

          {/* Header */}
          <div className="relative px-5 py-4 md:p-8 md:pb-4 shrink-0">
            <div className="absolute top-0 right-0 p-4 md:p-8 opacity-[0.05] pointer-events-none">
              <Pill size={80} className="text-teal-500 transform -rotate-12 md:size-32" />
            </div>
            <div className="flex justify-between items-center relative z-10">
              <div>
                <h2 className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {medicamento ? "Editar Medicamento" : "Nuevo Medicamento"}
                </h2>
                <p className="text-[10px] md:text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest mt-0.5 md:mt-1">
                  {medicamento ? "Modificar detalles del item" : "Registrar entrada al inventario"}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-9 w-9 md:h-10 md:w-10 flex items-center justify-center rounded-xl md:rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-all text-slate-500"
              >
                <X size={18} className="md:size-5" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 min-h-0 px-5 py-4 md:p-8 md:pt-4 space-y-3 md:space-y-5 relative z-10 overflow-y-auto overscroll-contain">
            {/* Nombre */}
            <FormField label="Nombre del Medicamento" icon={<Package size={14} className="text-teal-500" />}>
              <input
                required
                placeholder="Ej: Paracetamol 500mg"
                className={inputBaseClass}
                value={form.nombre}
                onChange={(e) => updateField("nombre", e.target.value)}
              />
            </FormField>

            {/* Tipo de Medida */}
            <FormField label="Tipo de Medida" icon={<Pill size={14} className="text-teal-500" />}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {TIPOS_MEDIDA.map(({ value, label, icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateField("tipo_medida", value)}
                    className={`flex items-center gap-2 p-2 md:p-3 rounded-lg md:rounded-xl border transition-all text-left ${form.tipo_medida === value
                      ? "border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
                      : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-teal-300 dark:hover:border-teal-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                  >
                    <span className="text-base md:text-lg">{icon}</span>
                    <span className="text-xs font-medium leading-tight">{label}</span>
                  </button>
                ))}
              </div>
            </FormField>

            {/* Grid: Unidad, Anaquel y Stock Mínimo - Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              <FormField label="Unidad de Medida">
                <select
                  className={`${inputBaseClass} appearance-none cursor-pointer`}
                  value={form.unidad_medida}
                  onChange={(e) => updateField("unidad_medida", e.target.value)}
                >
                  {UNIDADES_MEDIDA.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Anaquel / Ubicación">
                <input
                  placeholder="Ej: A-3"
                  className={inputBaseClass}
                  value={form.anaquel}
                  onChange={(e) => updateField("anaquel", e.target.value)}
                />
              </FormField>
              <FormField label="Stock Mínimo">
                <input
                  type="number"
                  min="0"
                  className={inputBaseClass}
                  value={form.stock_minimo}
                  onChange={(e) => updateField("stock_minimo", parseInt(e.target.value) || 0)}
                />
              </FormField>
            </div>

            {/* Descripción - Compacto en móvil */}
            <FormField label="Descripción (Opcional)">
              <textarea
                rows={2}
                placeholder="Detalles adicionales..."
                className={`${inputBaseClass} min-h-14 md:min-h-24 resize-none`}
                value={form.descripcion}
                onChange={(e) => updateField("descripcion", e.target.value)}
              />
            </FormField>

            {/* Info Stock Actual - Solo desktop */}
            {medicamento && (
              <div className="hidden md:flex items-start gap-3 rounded-2xl bg-teal-50 dark:bg-teal-900/20 p-4 text-teal-800 dark:text-teal-200">
                <Info size={20} className="shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold mb-1">
                    Stock Actual: {medicamento.stock_actual ?? 0} {medicamento.unidad_medida}
                  </p>
                  <p className="opacity-90">
                    Para modificar la cantidad física, utiliza <span className="font-bold">&quot;Ajustar Stock&quot;</span>.
                  </p>
                </div>
              </div>
            )}

            {/* Actions - Siempre visibles al final del scroll */}
            <div className="flex justify-end gap-2 md:gap-3 pt-4 md:pt-6 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 md:px-6 md:py-3 text-xs md:text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors uppercase tracking-wider md:tracking-widest"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 md:gap-2 rounded-xl md:rounded-2xl bg-linear-to-r from-teal-600 to-teal-500 px-5 py-2.5 md:px-8 md:py-4 text-xs md:text-sm font-bold text-white hover:shadow-lg md:hover:shadow-xl hover:shadow-teal-500/20 md:hover:shadow-teal-500/30 transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? (
                  <div className="h-3.5 w-3.5 md:h-4 md:w-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                ) : (
                  <Save size={16} className="md:size-5" />
                )}
                {saving ? "PROCESANDO..." : "GUARDAR"}
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

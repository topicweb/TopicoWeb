"use client";

import { useState, useCallback } from "react";
import { X, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft } from "lucide-react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import type { Medicamento, TipoMovimiento } from "../types";

interface MovimientoStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicamento: Medicamento | null;
  onGuardar: (tipo: TipoMovimiento, cantidad: number, motivo: string, fechaVencimiento?: string) => Promise<void>;
}

interface FormState {
  tipo: TipoMovimiento;
  cantidad: number;
  motivo: string;
  fechaVencimiento: string;
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
  tipo: "ENTRADA",
  cantidad: 1,
  motivo: "",
  fechaVencimiento: "",
};

const TIPO_CONFIG = {
  ENTRADA: {
    label: "Entrada",
    color: "emerald",
    icon: ArrowUpCircle,
    bgGradient: "from-emerald-500 to-teal-500",
    shadowColor: "shadow-emerald-500/30",
  },
  SALIDA: {
    label: "Salida",
    color: "rose",
    icon: ArrowDownCircle,
    bgGradient: "from-rose-500 to-pink-500",
    shadowColor: "shadow-rose-500/30",
  },
} as const;

const inputBaseClass =
  "input-premium w-full px-3 py-2.5 text-sm font-medium md:rounded-2xl md:p-4 md:text-base";

export function MovimientoStockModal({ isOpen, onClose, medicamento, onGuardar }: MovimientoStockModalProps) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const updateField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setForm(DEFAULT_FORM);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicamento) return;

    setSaving(true);
    try {
      await onGuardar(form.tipo, form.cantidad, form.motivo, form.fechaVencimiento);
      onClose();
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !medicamento) return null;

  const config = TIPO_CONFIG[form.tipo];
  const StockIcon = config.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onClose}
          className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        />

        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="glass-modal relative flex max-h-[95dvh] w-full max-w-md flex-col overflow-hidden lg:max-w-lg"
        >
          {/* Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className={`absolute top-0 left-0 w-full h-32 bg-linear-to-b ${config.bgGradient} opacity-5 to-transparent`} />
            <div className={`absolute -right-20 -top-20 w-64 h-64 ${config.color === "emerald" ? "bg-emerald-500" : "bg-rose-500"} opacity-5 rounded-full blur-3xl`} />
            <div className={`absolute -left-20 -bottom-20 w-64 h-64 ${config.color === "emerald" ? "bg-teal-500" : "bg-pink-500"} opacity-5 rounded-full blur-3xl`} />
          </div>

          {/* Header */}
          <div className="relative px-5 py-4 md:p-8 md:pb-4 shrink-0">
            <div className="absolute top-0 right-0 p-4 md:p-8 opacity-[0.05] pointer-events-none">
              <ArrowRightLeft size={80} className="transform -rotate-12 text-primary md:size-32" />
            </div>
            <div className="flex justify-between items-center relative z-10">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold tracking-tight text-foreground md:text-2xl">
                  Ajustar Stock
                </h2>
                <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-widest text-primary md:mt-1 md:text-xs">
                  {medicamento.nombre}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-all hover:bg-[var(--primary-soft)] hover:text-primary md:h-10 md:w-10 md:rounded-2xl"
              >
                <X size={18} className="md:size-5" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 min-h-0 px-5 py-4 md:p-8 md:pt-4 space-y-3 md:space-y-6 relative z-10 overflow-y-auto overscroll-contain">
            {/* Stock Actual Info */}
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted p-3 md:gap-3 md:rounded-2xl md:p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-soft)] md:h-10 md:w-10 md:rounded-xl">
                <StockIcon size={18} className="text-primary md:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase text-muted-foreground md:text-xs">Stock Actual</p>
                <p className="truncate text-base font-bold text-foreground md:text-lg">
                  {medicamento.stock_actual} {medicamento.unidad_medida}
                </p>
              </div>
            </div>

            {/* Selector de Tipo */}
            <div className="grid grid-cols-2 gap-2 md:gap-3">
              <TypeSelector
                type="ENTRADA"
                selected={form.tipo}
                onSelect={(t) => updateField("tipo", t)}
              />
              <TypeSelector
                type="SALIDA"
                selected={form.tipo}
                onSelect={(t) => updateField("tipo", t)}
              />
            </div>

            {/* Cantidad */}
            <FormField label="Cantidad">
              <input
                type="number"
                min="1"
                required
                className={inputBaseClass}
                value={form.cantidad}
                onChange={(e) => updateField("cantidad", parseInt(e.target.value) || 0)}
              />
            </FormField>

            {/* Fecha de Vencimiento para ENTRADA */}
            {form.tipo === "ENTRADA" && (
              <FormField label="Fecha de Vencimiento">
                <input
                  type="date"
                  required
                  className={inputBaseClass}
                  value={form.fechaVencimiento}
                  onChange={(e) => updateField("fechaVencimiento", e.target.value)}
                />
              </FormField>
            )}

            {/* Descripción/Motivo */}
            <FormField label={form.tipo === "ENTRADA" ? "Descripción (Opcional)" : "Motivo de Salida (Opcional)"}>
              <input
                type="text"
                placeholder={form.tipo === "ENTRADA" ? "Ej: Lote #123, Proveedor..." : "Ej: Dañado, Vencido, Ajuste..."}
                className={inputBaseClass}
                value={form.motivo}
                onChange={(e) => updateField("motivo", e.target.value)}
              />
            </FormField>

            {/* Actions */}
            <div className="flex justify-end gap-2 md:gap-3 pt-4 md:pt-6 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted transition-colors hover:text-foreground md:px-6 md:py-3 md:text-sm md:tracking-widest"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`flex items-center gap-1.5 md:gap-2 rounded-xl md:rounded-2xl bg-linear-to-r ${config.bgGradient} px-5 py-2.5 md:px-8 md:py-4 text-xs md:text-sm font-bold text-white hover:shadow-lg md:hover:shadow-xl ${config.shadowColor} transition-all active:scale-95 disabled:opacity-50`}
              >
                {saving ? (
                  <div className="h-3.5 w-3.5 md:h-4 md:w-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                ) : (
                  <StockIcon size={16} className="md:size-5" />
                )}
                {saving ? "PROCESANDO..." : `Registrar ${config.label}`}
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
  children: React.ReactNode;
}

function FormField({ label, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

interface TypeSelectorProps {
  type: TipoMovimiento;
  selected: TipoMovimiento;
  onSelect: (type: TipoMovimiento) => void;
}

function TypeSelector({ type, selected, onSelect }: TypeSelectorProps) {
  const config = TIPO_CONFIG[type];
  const Icon = config.icon;
  const isSelected = selected === type;

  return (
    <button
      type="button"
      onClick={() => onSelect(type)}
      className={`relative flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all duration-200 md:gap-2 md:rounded-xl md:p-4 ${isSelected
        ? type === "ENTRADA"
          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
          : "border-rose-500 bg-rose-50 text-rose-700"
        : "border-border bg-surface text-foreground hover:border-border hover:bg-muted"
        }`}
    >
      <Icon size={24} className="md:size-7" />
      <span className="font-bold text-xs md:text-sm">{config.label}</span>
      {isSelected && (
        <div
          className={`absolute top-1.5 right-1.5 md:top-2 md:right-2 h-1.5 w-1.5 md:h-2 md:w-2 rounded-full ${type === "ENTRADA" ? "bg-emerald-500" : "bg-rose-500"
            }`}
        />
      )}
    </button>
  );
}

"use client";

import { useState, useEffect } from "react";
import { X, Save, UserPlus, Mail, Shield, ShieldCheck, LucideIcon } from "lucide-react";
import { Perfil } from "../types";
import { motion, AnimatePresence } from "framer-motion";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: Perfil | null;
  onSave: (data: Partial<Perfil> & { password?: string }) => Promise<void>;
}

// Componente interno para reducir duplicación
function InputField({
  icon: Icon,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  minLength,
  autoComplete,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
}) {
  const baseInputClass = "w-full rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-4 text-base font-medium text-slate-800 dark:text-white shadow-sm focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/5 transition-all outline-none";

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        <Icon size={14} className="text-teal-500" />
        {label}
      </label>
      <input
        type={type}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={baseInputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export const UserModal = ({ isOpen, onClose, item, onSave }: UserModalProps) => {
  const [formData, setFormData] = useState<Partial<Perfil> & { password?: string }>({
    nombre: "",
    email: "",
    rol: "personal",
    activo: 1,
    password: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData(
      item
        ? { nombre: item.nombre, email: item.email, rol: item.rol, activo: item.activo, password: "" }
        : { nombre: "", email: "", rol: "personal", activo: 1, password: "" }
    );
  }, [item, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: "spring", damping: 25, stiffness: 300 }
    },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
  } as const;

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900 border border-white dark:border-slate-800 shadow-2xl"
          >
            {/* Background Aesthetic Decoration for Modal */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-32 bg-linear-to-b from-teal-500/5 to-transparent" />
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl" />
              <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl" />
            </div>

            {/* Header */}
            <div className="relative p-8 pb-4">
              <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none">
                <UserPlus size={120} className="text-teal-500 transform -rotate-12" />
              </div>

              <div className="flex justify-between items-center relative z-10">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {item ? "Actualizar Perfil" : "Añadir Usuario"}
                  </h2>
                  <p className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest mt-1">
                    Control de Personal Médico
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
            </div>

            <form onSubmit={handleSubmit} className="p-8 pt-4 space-y-5 relative z-10">
              <InputField
                icon={UserPlus}
                label="Nombre Completo"
                value={formData.nombre || ""}
                onChange={(v) => setFormData({ ...formData, nombre: v })}
                placeholder="Ej. Juan Pérez"
                required
                autoComplete="name"
              />

              <InputField
                icon={Mail}
                label="Correo Institucional"
                type="email"
                value={formData.email || ""}
                onChange={(v) => setFormData({ ...formData, email: v })}
                placeholder="usuario@institucion.edu.pe"
                required
                autoComplete="email"
              />

              {!item && (
                <InputField
                  icon={Shield}
                  label="Contraseña de Acceso"
                  type="password"
                  value={formData.password || ""}
                  onChange={(v) => setFormData({ ...formData, password: v })}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              )}

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <ShieldCheck size={14} className="text-teal-500" />
                  Privilegios de Sistema
                </label>
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, rol: "personal" })}
                    className={`px-4 py-3 rounded-xl text-sm font-bold transition-all ${formData.rol === "personal"
                      ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-md scale-[1.02]"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-400"
                      }`}
                  >
                    PERSONAL
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, rol: "admin" })}
                    className={`px-4 py-3 rounded-xl text-sm font-bold transition-all ${formData.rol === "admin"
                      ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-md scale-[1.02]"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-400"
                      }`}
                  >
                    ADMIN
                  </button>
                </div>
              </div>

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
                  {saving ? "PROCESANDO..." : "GUARDAR CAMBIOS"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

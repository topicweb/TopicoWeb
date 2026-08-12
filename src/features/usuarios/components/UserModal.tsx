"use client";

import { useState, useEffect } from "react";
import { X, Save, UserPlus, Mail, Shield, ShieldCheck, LucideIcon } from "lucide-react";
import { Perfil } from "../types";
import { motion, AnimatePresence, Variants } from "framer-motion";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: Perfil | null;
  onSave: (data: Partial<Perfil> & { password?: string }) => Promise<void>;
}

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
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon size={14} className="text-accent" />
        {label}
      </label>
      <input
        type={type}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="input-premium w-full px-4 py-3 text-sm font-medium"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

const overlayVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", damping: 25, stiffness: 300 } },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } },
};

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
            className="absolute inset-0 bg-[var(--foreground)]/20 backdrop-blur-sm"
          />

          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="glass-modal relative max-h-[90vh] w-full max-w-md overflow-y-auto"
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--primary-glow)] blur-3xl" />
              <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-[var(--accent-soft)] blur-3xl" />
            </div>

            <div className="sticky top-0 z-20 border-b border-border bg-white/95 px-6 pb-4 pt-6 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    {item ? "Actualizar Perfil" : "Añadir Usuario"}
                  </h2>
                  <p className="badge-accent mt-1.5">Control de personal</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors hover:bg-[var(--primary-soft)] hover:text-primary"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="relative z-10 space-y-5 px-6 py-5">
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
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <ShieldCheck size={14} className="text-accent" />
                  Privilegios de Sistema
                </label>
                <div className="flex rounded-xl border border-border bg-muted p-1 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, rol: "personal" })}
                    className={`flex-1 rounded-lg py-2.5 text-xs font-semibold transition-all ${
                      formData.rol === "personal"
                        ? "scale-[1.02] bg-white text-accent shadow-sm"
                        : "text-[var(--slate-400)]"
                    }`}
                  >
                    Personal
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, rol: "admin" })}
                    className={`flex-1 rounded-lg py-2.5 text-xs font-semibold transition-all ${
                      formData.rol === "admin"
                        ? "scale-[1.02] bg-white text-primary shadow-sm"
                        : "text-[var(--slate-400)]"
                    }`}
                  >
                    Admin
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-border pt-5">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50"
                >
                  {saving ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <Save size={16} />
                  )}
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

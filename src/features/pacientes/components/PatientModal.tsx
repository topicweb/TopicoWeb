"use client";

import React, { useState, useEffect } from "react";
import { X, Save, User, Fingerprint, BookOpen, Clock, Users } from "lucide-react";
import { Paciente, CategoriaPaciente, ProgramaEstudio } from "@/features/pacientes/types";
import { motion, AnimatePresence } from "framer-motion";

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Paciente | null;
  programas: ProgramaEstudio[];
  onSave: (data: Partial<Paciente>, newProgramaName?: string) => Promise<void>;
}

export const PatientModal = ({
  isOpen,
  onClose,
  item,
  programas,
  onSave,
}: PatientModalProps) => {
  const [formData, setFormData] = useState<Partial<Paciente>>({
    dni: "",
    nombres: "",
    apellidos: "",
    categoria: "estudiante",
    programa_id: "",
    sexo: "M",
    metadata: {},
  });
  const [newPrograma, setNewPrograma] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        dni: item.dni,
        nombres: item.nombres,
        apellidos: item.apellidos,
        categoria: item.categoria,
        programa_id: item.programa_id,
        sexo: item.sexo,
        metadata: item.metadata || {},
      });
      setNewPrograma("");
    } else {
      setFormData({
        dni: "",
        nombres: "",
        apellidos: "",
        categoria: "estudiante",
        programa_id: programas.length > 0 ? programas[0].id : "",
        sexo: "M",
        metadata: { turno: "Mañana" },
      });
    }
  }, [item, isOpen, programas]);

  const handleCategoryChange = (cat: CategoriaPaciente) => {
    const newData: Partial<Paciente> = { ...formData, categoria: cat };
    if (cat !== 'estudiante' && cat !== 'docente') {
      newData.programa_id = null;
    } else if (!newData.programa_id && programas.length > 0) {
      newData.programa_id = programas[0].id;
    }
    const currentMetadata = (formData.metadata as Record<string, any>) || {};
    const newMetadata: Record<string, any> = { turno: currentMetadata.turno || "Mañana" };
    if (cat === 'estudiante') {
      newMetadata.ciclo = currentMetadata.ciclo || "I";
    }
    newData.metadata = newMetadata;
    setFormData(newData);
  };

  const updateMetadata = (key: string, value: string) => {
    setFormData({
      ...formData,
      metadata: {
        ...(formData.metadata as Record<string, any>),
        [key]: value,
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData, newPrograma);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const showProgram = formData.categoria === 'estudiante' || formData.categoria === 'docente';
  const showCiclo = formData.categoria === 'estudiante';

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
            className="relative w-full max-w-lg overflow-hidden rounded-[3rem] bg-white dark:bg-slate-900 border border-white dark:border-slate-800 shadow-2xl my-8 px-2"
          >
            {/* Background Aesthetic Decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-teal-500/5 to-transparent" />
              <div className="absolute -right-24 -top-24 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl" />
              <div className="absolute -left-24 -bottom-24 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl" />
            </div>

            {/* Header */}
            <div className="relative p-8 pb-4">
              <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none">
                <User size={120} className="text-teal-500 transform -rotate-12" />
              </div>
              
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {item ? "Actualizar Paciente" : "Registrar Paciente"}
                  </h2>
                  <p className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest mt-1">
                    Ficha Médica Institucional
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

            <form onSubmit={handleSubmit} className="p-8 pt-4 space-y-6 relative z-10">
              {/* DNI Field - Premium look */}
              <div className="bg-gradient-to-br from-teal-50/50 to-white dark:from-teal-900/10 dark:to-slate-900 p-6 rounded-[2rem] border border-teal-100 dark:border-teal-900/30 shadow-sm shadow-teal-500/5">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-3">
                  <Fingerprint size={16} />
                  Nro. Documento de Identidad (DNI)
                </label>
                <input
                  required
                  maxLength={8}
                  placeholder="00000000"
                  className="w-full bg-transparent text-3xl font-bold text-slate-900 dark:text-white placeholder-slate-200 dark:placeholder-slate-800 outline-none tracking-[0.2em] focus:text-teal-600 transition-colors"
                  value={formData.dni}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setFormData({ ...formData, dni: val });
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Nombres
                  </label>
                  <input
                    required
                    placeholder="Ej. María"
                    className="w-full rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-4 text-base font-medium text-slate-800 dark:text-white shadow-sm focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/5 transition-all outline-none"
                    value={formData.nombres}
                    onChange={(e) =>
                      setFormData({ ...formData, nombres: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Apellidos
                  </label>
                  <input
                    required
                    placeholder="Ej. García"
                    className="w-full rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-4 text-base font-medium text-slate-800 dark:text-white shadow-sm focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/5 transition-all outline-none"
                    value={formData.apellidos}
                    onChange={(e) =>
                      setFormData({ ...formData, apellidos: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <Users size={14} className="text-teal-500" />
                    Categoría
                  </label>
                  <select
                    className="w-full rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-4 text-base font-medium text-slate-800 dark:text-white shadow-sm focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/5 transition-all outline-none appearance-none cursor-pointer"
                    value={formData.categoria}
                    onChange={(e) => handleCategoryChange(e.target.value as CategoriaPaciente)}
                  >
                    <option value="estudiante">Estudiante</option>
                    <option value="docente">Docente</option>
                    <option value="administrativo">Administrativo</option>
                    <option value="limpieza">Limpieza</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Sexo / Género
                  </label>
                  <div className="flex bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, sexo: "M" })}
                      className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${formData.sexo === "M" ? "bg-white dark:bg-slate-800 shadow-md text-teal-600 dark:text-teal-400 scale-[1.02]" : "text-slate-400"}`}
                    >
                      MASCULINO
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, sexo: "F" })}
                      className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${formData.sexo === "F" ? "bg-white dark:bg-slate-800 shadow-md text-pink-600 dark:text-pink-400 scale-[1.02]" : "text-slate-400"}`}
                    >
                      FEMENINO
                    </button>
                  </div>
                </div>
              </div>

              {showProgram && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <BookOpen size={14} className="text-teal-500" />
                    Programa de Estudio
                  </label>
                  <select
                    className="w-full rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-4 text-base font-medium text-slate-800 dark:text-white shadow-sm focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/5 transition-all outline-none"
                    value={formData.programa_id || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, programa_id: e.target.value })
                    }
                  >
                    {programas.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {showCiclo && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                      Ciclo Académico
                    </label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {["I", "II", "III", "IV", "V", "VI"].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => updateMetadata("ciclo", c)}
                          className={`h-10 w-10 text-xs font-bold rounded-xl transition-all border ${
                            (formData.metadata as any)?.ciclo === c 
                              ? "bg-teal-600 border-teal-600 text-white shadow-lg shadow-teal-500/30 scale-110" 
                              : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-teal-500/30"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className={`space-y-2 ${!showCiclo ? 'col-span-2' : ''}`}>
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <Clock size={14} className="text-teal-500" />
                    Turno Horario
                  </label>
                  <div className="flex bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
                    {["Mañana", "Tarde", "Noche"].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => updateMetadata("turno", t)}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                          (formData.metadata as any)?.turno === t 
                            ? "bg-white dark:bg-slate-800 shadow-md text-teal-600 dark:text-teal-400 scale-[1.02]" 
                            : "text-slate-400"
                        }`}
                      >
                        {t.toUpperCase()}
                      </button>
                    ))}
                  </div>
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
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-teal-500 px-10 py-4 text-sm font-bold text-white hover:shadow-2xl hover:shadow-teal-500/30 transition-all active:scale-95 disabled:opacity-50"
                >
                  {saving ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                  ) : (
                    <Save size={18} />
                  )}
                  {saving ? "PROCESANDO..." : "GUARDAR PACIENTE"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

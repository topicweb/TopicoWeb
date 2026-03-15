"use client";

import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
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
            className="relative w-full max-w-lg overflow-hidden rounded-[2.5rem] bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl shadow-2xl border border-white/50 dark:border-gray-700/50 my-8"
          >
            {/* Header with decorative element */}
            <div className="relative p-8 pb-4">
              <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none">
                <Save size={120} className="text-indigo-500 transform -rotate-12" />
              </div>
              
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {item ? "Editar Perfil" : "Nuevo Paciente"}
                  </h2>
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-1">
                    Información del Paciente
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 w-10 flex items-center justify-center rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300 transition-all text-gray-500"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 pt-4 space-y-6 relative z-10">
              {/* DNI Field - Distinctive look */}
              <div className="bg-indigo-50/30 dark:bg-indigo-900/10 p-4 rounded-3xl border border-indigo-100/50 dark:border-indigo-900/30">
                <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">
                  Documento de Identidad (DNI)
                </label>
                <input
                  required
                  maxLength={8}
                  placeholder="Ej. 70123456"
                  className="w-full bg-transparent text-xl font-black text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none tracking-widest"
                  value={formData.dni}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setFormData({ ...formData, dni: val });
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Nombres
                  </label>
                  <input
                    required
                    className="w-full rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 p-3 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 outline-none transition-all"
                    value={formData.nombres}
                    onChange={(e) =>
                      setFormData({ ...formData, nombres: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Apellidos
                  </label>
                  <input
                    required
                    className="w-full rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 p-3 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 outline-none transition-all"
                    value={formData.apellidos}
                    onChange={(e) =>
                      setFormData({ ...formData, apellidos: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Categoría
                  </label>
                  <select
                    className="w-full rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 p-3 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 outline-none transition-all appearance-none cursor-pointer"
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
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Sexo / Género
                  </label>
                  <div className="flex bg-gray-50 dark:bg-gray-900/50 p-1 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, sexo: "M" })}
                      className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${formData.sexo === "M" ? "bg-white dark:bg-gray-800 shadow-sm text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`}
                    >
                      MASCULINO
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, sexo: "F" })}
                      className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${formData.sexo === "F" ? "bg-white dark:bg-gray-800 shadow-sm text-pink-600 dark:text-pink-400" : "text-slate-400"}`}
                    >
                      FEMENINO
                    </button>
                  </div>
                </div>
              </div>

              {showProgram && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Programa de Estudio
                  </label>
                  <select
                    className="w-full rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 p-3 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 outline-none transition-all"
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
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      Ciclo Académico
                    </label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {["I", "II", "III", "IV", "V", "VI"].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => updateMetadata("ciclo", c)}
                          className={`h-8 w-8 text-[10px] font-black rounded-lg transition-all border ${
                            (formData.metadata as any)?.ciclo === c 
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30" 
                              : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-slate-400 hover:border-indigo-500/30"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className={`space-y-2 ${!showCiclo ? 'col-span-2' : ''}`}>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Turno Horario
                  </label>
                  <div className="flex bg-gray-50 dark:bg-gray-900/50 p-1 rounded-2xl border border-gray-100 dark:border-gray-700">
                    {["Mañana", "Tarde", "Noche"].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => updateMetadata("turno", t)}
                        className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${
                          (formData.metadata as any)?.turno === t 
                            ? "bg-white dark:bg-gray-800 shadow-sm text-indigo-600 dark:text-indigo-400" 
                            : "text-slate-400"
                        }`}
                      >
                        {t.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 text-xs font-black text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-[1.25rem] bg-indigo-600 px-8 py-3 text-xs font-black text-white hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {saving ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                  ) : (
                    <Save size={16} />
                  )}
                  {saving ? "PROCESANDO..." : "GUARDAR REGISTRO"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

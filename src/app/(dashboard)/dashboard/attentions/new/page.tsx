"use client";

import { useState } from "react";
import { useAuth } from "@/core/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { Medicamento } from "@/features/inventario/types";
import { Paciente } from "@/features/pacientes/types";
import { useAtenciones } from "@/features/atenciones/hooks/useAtenciones";
import { useMedicamentos } from "@/features/inventario/hooks/useMedicamentos";
import { usePacientes } from "@/features/pacientes/hooks/usePacientes";
import { useUsuarios } from "@/features/usuarios/hooks/useUsuarios";
import { Search, Loader2, Plus, Trash2, Save, ArrowLeft, ClipboardList, Pill, User } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function NewAttentionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Paciente | null>(null);

  const { registrarAtencion } = useAtenciones();
  const { medicamentos } = useMedicamentos();
  const { pacientes } = usePacientes();
  const { usuarios } = useUsuarios();

  const [formData, setFormData] = useState({
    motivo: "",
    observacion: "",
  });

  const [dispensedMeds, setDispensedMeds] = useState<
    { medId: string; cantidad: number; medName: string }[]
  >([]);
  const [medSearch, setMedSearch] = useState("");

  const filteredPacientes =
    searchTerm.length > 1
      ? pacientes
          .filter(
            (p: Paciente) =>
              p.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.dni.includes(searchTerm),
          )
          .slice(0, 5)
      : [];

  const filteredMeds = medicamentos.filter((m: Medicamento) =>
    m.nombre.toLowerCase().includes(medSearch.toLowerCase()),
  );

  const handleAddMed = (med: Medicamento) => {
    if (dispensedMeds.find((d) => d.medId === med.id)) return;
    setDispensedMeds([
      ...dispensedMeds,
      {
        medId: med.id,
        cantidad: 1,
        medName: med.nombre,
      },
    ]);
    setMedSearch("");
  };

  const updateMedQuantity = (index: number, quantity: number) => {
    const newMeds = [...dispensedMeds];
    newMeds[index].cantidad = Math.max(1, quantity);
    setDispensedMeds(newMeds);
  };

  const removeMed = (index: number) => {
    setDispensedMeds(dispensedMeds.filter((_, i: number) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !user) return;
    setLoading(true);
    const profile = usuarios.find((u) => u.email === (user.email || ""));
    if (!profile) {
      alert("Error: No se encontró perfil de personal asociado a su usuario.");
      setLoading(false);
      return;
    }

    await registrarAtencion(
      {
        paciente_id: selectedPatient.id,
        fecha_atencion: new Date().toISOString(),
        motivo_consulta: formData.motivo,
        observacion: formData.observacion,
        signos_vitales: { temp: "", presion: "", saturacion: "" },
      },
      dispensedMeds,
    );
    router.push("/dashboard/attentions");
  };

  const container = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-3xl space-y-6 pb-12"
    >
      <div className="flex items-center gap-4 border-b border-gray-100 dark:border-gray-800 pb-5 mb-8">
        <Link
          href="/dashboard/attentions"
          className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            Nueva Atención
          </h1>
          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-1">Registro de Consulta Médica</p>
        </div>
      </div>

      <div className="rounded-[2.5rem] bg-white/70 dark:bg-gray-800/70 backdrop-blur-2xl p-8 border border-white/50 dark:border-gray-700/50 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
          <ClipboardList size={180} className="text-indigo-500 transform rotate-12" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
          {/* Patient Selection */}
          <motion.div variants={item} className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
               <User size={16} className="text-indigo-500" />
               <h2 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Paciente</h2>
            </div>
            
            {!selectedPatient ? (
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar paciente por DNI o nombre..."
                  className="w-full rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 py-4 pl-12 pr-4 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <AnimatePresence>
                  {searchTerm.length > 1 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute z-50 mt-2 max-h-60 w-full overflow-auto rounded-2xl border border-white/50 bg-white/90 backdrop-blur-xl shadow-2xl dark:bg-gray-800/90 dark:border-gray-700/50"
                    >
                      {filteredPacientes.map((p: Paciente) => (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => {
                            setSelectedPatient(p);
                            setSearchTerm("");
                          }}
                          className="w-full px-6 py-4 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                                <span className="font-black text-slate-800 dark:text-white block">
                                  {p.nombres} {p.apellidos}
                                </span>
                                <span className="text-[10px] font-black uppercase text-indigo-500 tracking-tighter">
                                  {p.categoria} • {p.dni}
                                </span>
                            </div>
                            <Plus size={16} className="text-indigo-400" />
                          </div>
                        </button>
                      ))}
                      {filteredPacientes.length === 0 && (
                        <div className="p-8 text-center">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sin resultados</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center justify-between rounded-3xl bg-indigo-50/50 dark:bg-indigo-900/20 p-6 border border-indigo-100/50 dark:border-indigo-900/30"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center text-indigo-500 shadow-sm">
                    <User size={24} />
                  </div>
                  <div>
                    <p className="font-black text-indigo-900 dark:text-indigo-100 text-lg">
                      {selectedPatient.nombres} {selectedPatient.apellidos}
                    </p>
                    <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">
                      {selectedPatient.categoria} • {selectedPatient.dni}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="px-4 py-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all"
                >
                  CAMBIAR
                </button>
              </motion.div>
            )}
          </motion.div>

          {/* Motivo & Observaciones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div variants={item} className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Motivo de Consulta
              </label>
              <textarea
                required
                className="w-full rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 p-4 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all h-32 resize-none"
                value={formData.motivo}
                onChange={(e) =>
                  setFormData({ ...formData, motivo: e.target.value })
                }
                placeholder="Ej. Dolor abdominal agudo..."
              />
            </motion.div>

            <motion.div variants={item} className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Tratamiento / Observación
              </label>
              <textarea
                className="w-full rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 p-4 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all h-32 resize-none"
                value={formData.observacion}
                onChange={(e) =>
                  setFormData({ ...formData, observacion: e.target.value })
                }
                placeholder="Ej. Descanso médico y paracetamol cada 8h..."
              />
            </motion.div>
          </div>

          {/* Medicine Dispensing */}
          <motion.div variants={item} className="pt-6 border-t border-gray-100 dark:border-gray-700/50 space-y-4">
            <div className="flex items-center justify-between mb-2">
               <div className="flex items-center gap-2">
                  <Pill size={16} className="text-emerald-500" />
                  <h2 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Medicamentos</h2>
               </div>
               <span className="text-[10px] font-black px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full">
                 ENTREGA DE STOCK
               </span>
            </div>

            <div className="relative">
              <select
                className="w-full rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 p-4 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all appearance-none cursor-pointer"
                onChange={(e) => {
                  const med = medicamentos?.find(
                    (m: Medicamento) => m.id === e.target.value,
                  );
                  if (med) handleAddMed(med);
                }}
                value=""
              >
                <option value="">Seleccionar medicamento para agregar...</option>
                {filteredMeds
                  .filter((m) => !dispensedMeds.find((d) => d.medId === m.id))
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre} (Stock: {m.stock_actual ?? 0} {m.unidad_medida})
                    </option>
                  ))}
              </select>
              <Plus className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
            </div>

            <AnimatePresence>
              {dispensedMeds.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 mt-4"
                >
                  {dispensedMeds.map((item, idx) => (
                    <motion.div
                      key={item.medId}
                      layout
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-4 rounded-2xl bg-emerald-50/30 dark:bg-emerald-900/10 p-4 border border-emerald-100/50 dark:border-emerald-900/30 group/med"
                    >
                      <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center text-emerald-500 shadow-sm group-hover/med:rotate-12 transition-transform">
                        <Pill size={18} />
                      </div>
                      <div className="flex-1">
                        <span className="font-bold text-slate-800 dark:text-white block">
                          {item.medName}
                        </span>
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">Disponible para entrega</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="1"
                          className="w-16 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-gray-800 p-2 text-center font-black text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                          value={item.cantidad}
                          onChange={(e) =>
                            updateMedQuantity(idx, parseInt(e.target.value))
                          }
                        />
                        <button
                          type="button"
                          onClick={() => removeMed(idx)}
                          className="h-10 w-10 flex items-center justify-center rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div variants={item} className="flex justify-end pt-6">
            <button
              type="submit"
              disabled={loading || !selectedPatient}
              className="flex items-center gap-3 rounded-[1.5rem] bg-indigo-600 px-10 py-4 font-black text-white hover:bg-indigo-700 shadow-xl shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              {loading ? "Registrando..." : "Guardar Atención Médica"}
            </button>
          </motion.div>
        </form>
      </div>
    </motion.div>
  );
}

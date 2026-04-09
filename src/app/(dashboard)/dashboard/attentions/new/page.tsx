"use client";

import { useState } from "react";
import { useAuth } from "@/core/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { DispensacionMedicamento } from "@/features/inventario/types";
import { Paciente } from "@/features/pacientes/types";
import { useAtenciones } from "@/features/atenciones/hooks/useAtenciones";
import { useMedicamentos } from "@/features/inventario/hooks/useMedicamentos";
import { usePacientes } from "@/features/pacientes/hooks/usePacientes";
import { useUsuarios } from "@/features/usuarios/hooks/useUsuarios";
import { MedicineDispenser } from "@/features/atenciones/components/MedicineDispenser";
import { Search, Loader2, Save, ArrowLeft, ClipboardList, User, AlertCircle, Plus, Pill, Trash2 } from "lucide-react";
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

  const [dispensedMeds, setDispensedMeds] = useState<DispensacionMedicamento[]>([]);
  const [error, setError] = useState<string | null>(null);

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
      dispensedMeds
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
      <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-5 mb-8">
        <Link
          href="/dashboard/attentions"
          className="h-9 w-9 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-teal-600 transition-all"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Nueva Atención
          </h1>
          <p className="text-sm text-slate-500 mt-1">Registro de consulta médica</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-8 border border-slate-200 shadow-sm relative overflow-hidden group dark:bg-slate-900 dark:border-slate-800">
        <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
          <ClipboardList size={180} className="text-indigo-500 transform rotate-12" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
          {/* Patient Selection */}
          <motion.div variants={item} className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <User size={16} className="text-teal-600" />
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">Paciente</h2>
            </div>

            {!selectedPatient ? (
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por DNI o nombre..."
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 py-3 pl-11 pr-4 text-sm font-medium text-slate-700 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all dark:bg-slate-800/50 dark:border-slate-700 dark:text-white"
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
                              <span className="font-bold text-slate-800 dark:text-white block">
                                {p.nombres} {p.apellidos}
                              </span>
                              <span className="text-xs text-slate-500">
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
                    <p className="font-bold text-slate-800 dark:text-white text-lg">
                      {selectedPatient.nombres} {selectedPatient.apellidos}
                    </p>
                    <p className="text-xs text-slate-500">
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
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                Motivo de Consulta
              </label>
              <textarea
                required
                className="w-full rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 p-4 text-sm font-bold text-slate-800 dark:text-white input-premium transition-all h-32 resize-none"
                value={formData.motivo}
                onChange={(e) =>
                  setFormData({ ...formData, motivo: e.target.value })
                }
                placeholder="Ej. Dolor abdominal agudo..."
              />
            </motion.div>

            <motion.div variants={item} className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                Tratamiento / Observación
              </label>
              <textarea
                className="w-full rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 p-4 text-sm font-bold text-slate-800 dark:text-white input-premium transition-all h-32 resize-none"
                value={formData.observacion}
                onChange={(e) =>
                  setFormData({ ...formData, observacion: e.target.value })
                }
                placeholder="Ej. Descanso médico y paracetamol cada 8h..."
              />
            </motion.div>
          </div>

          {/* Medicine Dispensing - Componente MedicineDispenser FASE 3.1 */}
          <motion.div variants={item} className="pt-6 border-t border-gray-100 dark:border-gray-700/50 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Pill size={16} className="text-emerald-500" />
                <h2 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                  Medicamentos
                </h2>
              </div>
              <span className="text-[10px] font-black px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full">
                ENTREGA DE STOCK
              </span>
            </div>

            {/* Error display */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-rose-700 dark:text-rose-300"
                >
                  <AlertCircle size={18} />
                  <span className="text-sm">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Componente MedicineDispenser */}
            <MedicineDispenser
              medicamentos={medicamentos}
              seleccionadas={dispensedMeds}
              onChange={setDispensedMeds}
              mostrarPreview={true}
            />
          </motion.div>

          <motion.div variants={item} className="flex justify-end pt-6">
            <button
              type="submit"
              disabled={loading || !selectedPatient}
              className="flex items-center gap-3 rounded-3xl bg-indigo-600 px-10 py-4 font-black text-white hover:bg-indigo-700 shadow-xl shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs"
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

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
import { Search, Loader2, Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

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

  // Queries
  const filteredPacientes =
    searchTerm.length > 2
      ? pacientes
          .filter(
            (p: Paciente) =>
              p.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.dni.includes(searchTerm),
          )
          .slice(0, 10)
      : [];

  const filteredMeds = medicamentos.filter((m: Medicamento) =>
    m.nombre.toLowerCase().includes(medSearch.toLowerCase()),
  );

  const handleAddMed = (med: Medicamento) => {
    // Check if already added
    if (dispensedMeds.find((d) => d.medId === med.id)) return;

    setDispensedMeds([
      ...dispensedMeds,
      {
        medId: med.id,
        cantidad: 1,
        medName: med.nombre,
      },
    ]);
    setMedSearch(""); // clear search
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

    // Find user profile ID based on auth user email
    // This is a weak link if profile doesn't exist.
    // Ideally valid session means profile exists.
    // We'll search sync'd profiles for the email.
    const profile = usuarios.find((u) => u.email === (user.email || ""));
    // If no profile found locally, we might have an issue. Fallback to a placeholder or fail.
    if (!profile) {
      alert("Error: No se encontró perfil de personal asociado a su usuario.");
      setLoading(false);
      return;
    }

    // Usamos el hook para registrar todo (atención + movimientos) en una transacción
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/attentions"
          className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Nueva Atención
        </h1>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-800">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Paciente
            </label>
            {!selectedPatient ? (
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar paciente por DNI o nombre..."
                  className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm.length > 2 && (
                  <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-white shadow-lg dark:bg-gray-700">
                    {filteredPacientes.map((p: Paciente) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => {
                          setSelectedPatient(p);
                          setSearchTerm("");
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-white"
                      >
                        <span className="font-bold">
                          {p.nombres} {p.apellidos}
                        </span>
                        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                          ({p.categoria}) - {p.dni}
                        </span>
                      </button>
                    ))}
                    {filteredPacientes.length === 0 && (
                      <div className="p-4 text-center text-gray-500">
                        No se encontraron pacientes.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-1 flex items-center justify-between rounded-lg border bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-900/20">
                <div>
                  <p className="font-bold text-blue-900 dark:text-blue-100">
                    {selectedPatient.nombres} {selectedPatient.apellidos}
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {selectedPatient.categoria} - {selectedPatient.dni}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                >
                  Cambiar
                </button>
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Motivo de Consulta
            </label>
            <textarea
              required
              className="mt-1 w-full rounded-lg border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              rows={2}
              value={formData.motivo}
              onChange={(e) =>
                setFormData({ ...formData, motivo: e.target.value })
              }
              placeholder="Describe el motivo principal..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Observaciones / Tratamiento
            </label>
            <textarea
              className="mt-1 w-full rounded-lg border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              rows={3}
              value={formData.observacion}
              onChange={(e) =>
                setFormData({ ...formData, observacion: e.target.value })
              }
            />
          </div>

          {/* Medicine Dispensing */}
          <div className="border-t pt-4 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Medicamentos Entregados
            </label>

            <div className="mt-2 flex gap-2">
              <select
                className="flex-1 rounded-lg border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                onChange={(e) => {
                  const med = medicamentos?.find(
                    (m: Medicamento) => m.id === e.target.value,
                  );
                  if (med) handleAddMed(med);
                }}
                value=""
              >
                <option value="">
                  Seleccionar medicamento para agregar...
                </option>
                {filteredMeds
                  .filter((m) => !dispensedMeds.find((d) => d.medId === m.id))
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre} (Stock: {m.stock_actual ?? 0} {m.unidad_medida})
                    </option>
                  ))}
              </select>
            </div>

            {dispensedMeds.length > 0 && (
              <div className="mt-4 space-y-2">
                {dispensedMeds.map((item, idx) => (
                  <div
                    key={item.medId}
                    className="flex items-center gap-4 rounded-lg bg-gray-50 p-2 dark:bg-gray-700/50"
                  >
                    <span className="flex-1 font-medium text-gray-900 dark:text-white">
                      {item.medName}
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        className="w-20 rounded border p-1 text-center dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                        value={item.cantidad}
                        onChange={(e) =>
                          updateMedQuantity(idx, parseInt(e.target.value))
                        }
                      />
                      <button
                        type="button"
                        onClick={() => removeMed(idx)}
                        className="p-2 text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading || !selectedPatient}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Save />}
              Guardar Atención
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

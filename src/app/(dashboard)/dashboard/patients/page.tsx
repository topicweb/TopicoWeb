"use client";

import { useState, useEffect } from "react";
import { usePacientes } from "@/features/pacientes/hooks/usePacientes";
import { PatientModal } from "@/features/pacientes/components/PatientModal";
import { Plus, Search, Edit2, User } from "lucide-react";
import { Skeleton } from "@/shared/ui/Skeleton";
import { PacienteSchema } from "@/shared/schemas/validation";
import { toast } from "sonner";
import { Paciente } from "@/features/pacientes/types";

// Definimos tus 2 programas fijos aquí.
const PROGRAMAS_FIJOS = [
  {
    id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", // UUID válido generado
    nombre: "Enfermería Técnica",
    activo: 1,
    creado_at: new Date().toISOString(),
    actualizado_at: new Date().toISOString(),
    sync_status: "synced" as const,
  },
  {
    id: "b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a12", // UUID válido generado
    nombre: "Desarrollo de Sistemas de Información",
    activo: 1,
    creado_at: new Date().toISOString(),
    actualizado_at: new Date().toISOString(),
    sync_status: "synced" as const,
  },
];

export default function PatientsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Paciente | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Usamos el hook para obtener datos y funciones (Clean Architecture)
  const { pacientes, crearPaciente, actualizarPaciente, asegurarPrograma } =
    usePacientes();

  // 1. RENDIMIENTO: Implementación de Debounce
  // Espera 300ms después de que el usuario deja de escribir para filtrar
  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 2. INICIALIZACIÓN: Asegurar que los programas fijos existan en la BD
  useEffect(() => {
    PROGRAMAS_FIJOS.forEach((p) => {
      asegurarPrograma(p.nombre, p.id);
    });
  }, []);

  const filteredPacientes = pacientes.filter((p: Paciente) => {
    if (!debouncedTerm) return true;
    const term = debouncedTerm.toLowerCase();
    return (
      p.nombres.toLowerCase().includes(term) ||
      p.apellidos.toLowerCase().includes(term) ||
      p.dni.includes(term)
    );
  });

  const handleEdit = (item: Paciente) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleSave = async (
    data: Partial<Paciente>,
    // newProgramaName ya no es necesario porque la lista es fija
  ) => {
    // 1. VALIDACIÓN CON ZOD
    // Combinamos con los datos existentes si es edición para validar el objeto completo
    const dataToValidate = editingItem ? { ...editingItem, ...data } : data;

    const result = PacienteSchema.safeParse(dataToValidate);

    if (!result.success) {
      // Mostramos el primer error encontrado
      toast.error(result.error.issues[0].message);
      return; // Detenemos el guardado
    }

    // 2. Lógica de programa_id según categoría
    const isAcademic = data.categoria === 'estudiante' || data.categoria === 'docente';
    // Si es académico y no tiene programa, usamos el primero por defecto.
    // Si no es académico, programa_id ya debería ser null desde el modal.
    let progId = data.programa_id;
    if (isAcademic && !progId) {
      progId = PROGRAMAS_FIJOS[0].id;
    }

    if (editingItem) {
      await actualizarPaciente(editingItem.id, {
        ...data,
        programa_id: progId,
      });
      toast.success("Paciente actualizado correctamente");
    } else {
      await crearPaciente({
        ...(data as any),
        programa_id: progId,
      });
      toast.success("Paciente registrado correctamente");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Gestión de Pacientes
          </h1>
          <p className="text-sm text-slate-500 mt-1">Directorio y fichas clínicas</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 shadow-lg shadow-teal-600/20 transition-all active:scale-95"
        >
          <Plus size={18} />
          <span>Registrar Paciente</span>
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por DNI o nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all dark:border-slate-800 dark:bg-slate-900 dark:text-white"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* 2. UX: Estado de Carga con Skeletons */}
        {isSearching ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800"
            >
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          ))
        ) : filteredPacientes.length > 0 ? (
          filteredPacientes.map((patient: Paciente) => (
            <div
              key={patient.id}
              className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20">
                    <User size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {patient.nombres} {patient.apellidos}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {patient.dni}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300 capitalize">
                        {patient.categoria}
                      </span>
                      {(patient.metadata as any)?.ciclo && (
                        <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                          Ciclo {(patient.metadata as any).ciclo}
                        </span>
                      )}
                      {(patient.metadata as any)?.turno && (
                        <span className="inline-flex items-center rounded-md bg-purple-100 px-2 py-1 text-xs font-medium text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                          {(patient.metadata as any).turno}
                        </span>
                      )}
                      {/* Indicador visual de sincronización */}
                      <span
                        className={`inline-flex h-2 w-2 rounded-full ${
                          patient.sync_status === "synced"
                            ? "bg-green-500"
                            : "bg-amber-500"
                        }`}
                        title={
                          patient.sync_status === "synced"
                            ? "Sincronizado"
                            : "Pendiente de subir"
                        }
                      />
                    </div>
                  </div>
                </div>
                {/* 3. DISEÑO MÓVIL: Botón de editar más accesible */}
                <button
                  onClick={() => handleEdit(patient)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-700"
                  aria-label="Editar paciente"
                >
                  <Edit2 size={20} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="col-span-full py-8 text-center text-gray-500">
            No se encontraron pacientes con "{searchTerm}".
          </p>
        )}
      </div>

      {isModalOpen && (
        <PatientModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          item={editingItem}
          programas={PROGRAMAS_FIJOS}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

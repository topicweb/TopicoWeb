"use client";

import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { Paciente, CategoriaPaciente, ProgramaEstudio } from "@/core/entities";

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
      });
    }
  }, [item, isOpen, programas]);

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 dark:bg-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold dark:text-white">
            {item ? "Editar Paciente" : "Nuevo Paciente"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium dark:text-gray-300">
              DNI
            </label>
            <input
              required
              maxLength={8}
              className="w-full rounded-lg border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={formData.dni}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setFormData({ ...formData, dni: val });
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium dark:text-gray-300">
                Nombres
              </label>
              <input
                required
                className="w-full rounded-lg border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={formData.nombres}
                onChange={(e) =>
                  setFormData({ ...formData, nombres: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium dark:text-gray-300">
                Apellidos
              </label>
              <input
                required
                className="w-full rounded-lg border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={formData.apellidos}
                onChange={(e) =>
                  setFormData({ ...formData, apellidos: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium dark:text-gray-300">
                Categoría
              </label>
              <select
                className="w-full rounded-lg border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={formData.categoria}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    categoria: e.target.value as CategoriaPaciente,
                  })
                }
              >
                <option value="estudiante">Estudiante</option>
                <option value="docente">Docente</option>
                <option value="administrativo">Administrativo</option>
                <option value="limpieza">Limpieza</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium dark:text-gray-300">
                Sexo
              </label>
              <select
                className="w-full rounded-lg border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={formData.sexo}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sexo: e.target.value as "M" | "F",
                  })
                }
              >
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium dark:text-gray-300">
              Programa de Estudio
            </label>
            {programas.length > 0 ? (
              <select
                className="w-full rounded-lg border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={formData.programa_id || ""}
                onChange={(e) =>
                  setFormData({ ...formData, programa_id: e.target.value })
                }
              >
                {programas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            ) : (
              <input
                placeholder="Nombre del Programa (Crear nuevo)"
                className="w-full rounded-lg border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={newPrograma}
                onChange={(e) => setNewPrograma(e.target.value)}
              />
            )}
            {programas.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Si no hay programas, aparecerá un campo para crear uno.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              <Save size={18} />
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

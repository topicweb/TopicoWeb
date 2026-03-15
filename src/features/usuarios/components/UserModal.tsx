"use client";

import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { Perfil, RolUsuario } from "../types";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: Perfil | null;
  onSave: (data: Partial<Perfil> & { password?: string }) => Promise<void>;
}

export const UserModal = ({
  isOpen,
  onClose,
  item,
  onSave,
}: UserModalProps) => {
  const [formData, setFormData] = useState<
    Partial<Perfil> & { password?: string }
  >({
    nombre: "",
    email: "",
    rol: "personal",
    activo: 1,
    password: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        nombre: item.nombre,
        email: item.email,
        rol: item.rol,
        activo: item.activo,
        password: "",
      });
    } else {
      setFormData({
        nombre: "",
        email: "",
        rol: "personal",
        activo: 1,
        password: "",
      });
    }
  }, [item, isOpen]);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 dark:bg-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold dark:text-white">
            {item ? "Editar Usuario" : "Nuevo Usuario"}
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
              Nombre
            </label>
            <input
              required
              className="w-full rounded-lg border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={formData.nombre || ""}
              onChange={(e) =>
                setFormData({ ...formData, nombre: e.target.value })
              }
            />
          </div>
          {!item && (
            <div>
              <label className="block text-sm font-medium dark:text-gray-300">
                Contraseña
              </label>
              <input
                required
                type="password"
                className="w-full rounded-lg border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={formData.password || ""}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Mínimo 6 caracteres"
                minLength={6}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium dark:text-gray-300">
              Email
            </label>
            <input
              required
              type="email"
              className="w-full rounded-lg border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={formData.email || ""}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium dark:text-gray-300">
              Rol
            </label>
            <select
              className="w-full rounded-lg border p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={formData.rol || "personal"}
              onChange={(e) =>
                setFormData({ ...formData, rol: e.target.value as RolUsuario })
              }
            >
              <option value="personal">Personal</option>
              <option value="admin">Administrador</option>
            </select>
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

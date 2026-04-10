"use client";

import { useState } from "react";
import { Perfil } from "@/features/usuarios/types";
import { useUsuarios } from "@/features/usuarios/hooks/useUsuarios";
import { UserModal } from "@/features/usuarios/components/UserModal";
import { Plus, Search, Trash2, Edit2 } from "lucide-react";
import { useAuth } from "@/core/providers/AuthProvider";
import { ConfirmationModal } from "@/shared/ui/ConfirmationModal";
import { toast } from "sonner";

export default function UsersPage() {
  const { role } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Perfil | null>(null);
  // Estado para el modal de eliminación
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({
    isOpen: false,
    id: null,
  });
  const [searchTerm, setSearchTerm] = useState("");

  // Usamos el hook para obtener datos y funciones (Clean Architecture)
  const { usuarios, crearUsuario, actualizarUsuario, eliminarUsuario } =
    useUsuarios();

  const filteredUsers = usuarios.filter(
    (u) =>
      u.activo !== 0 &&
      ((u.nombre || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const handleDeleteClick = (id: string) => {
    setDeleteModal({ isOpen: true, id });
  };

  const handleConfirmDelete = async () => {
    if (deleteModal.id) {
      try {
        await eliminarUsuario(deleteModal.id);
        toast.success("Usuario eliminado correctamente");
        setDeleteModal({ isOpen: false, id: null });
      } catch (error: any) {
        toast.error(error.message || "Error al eliminar usuario");
      }
    }
  };

  const handleEdit = (user: Perfil) => {
    setEditingItem(user);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleSave = async (data: Partial<Perfil> & { password?: string }) => {
    try {
      if (editingItem) {
        const { password, ...rest } = data;
        await actualizarUsuario(editingItem.id, rest);
        toast.success("Usuario actualizado correctamente");
      } else {
        await crearUsuario(data);
        toast.success("Usuario creado correctamente");
      }
      setIsModalOpen(false);
    } catch (error: any) {
      // Mostrar error como toast
      toast.error(error.message || "Error al guardar usuario");
      // No cerrar el modal para que el usuario pueda corregir
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Gestión de Usuarios
        </h1>
        {role === "admin" && (
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={20} />
            Nuevo Usuario
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {/* Users List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                <span className="text-lg font-bold">
                  {(user.nombre || user.email || "?").charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {user.nombre}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {user.email}
                </p>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                  {user.rol}
                </span>
                <span
                  className={`ml-2 text-xs ${(!user.sync_status || user.sync_status === "synced") ? "text-green-500" : "text-amber-500"}`}
                >
                  {(!user.sync_status || user.sync_status === "synced") ? "Sincronizado" : "Pendiente"}
                </span>
              </div>
            </div>
            {role === "admin" && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(user)}
                  className="p-2 text-gray-400 hover:text-blue-500"
                  title="Editar"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDeleteClick(user.id)}
                  className="p-2 text-gray-400 hover:text-red-500"
                  title="Eliminar"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            )}
          </div>
        ))}
        {filteredUsers.length === 0 && (
          <p className="col-span-full text-center text-gray-500">
            No se encontraron usuarios.
          </p>
        )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <UserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          item={editingItem}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={handleConfirmDelete}
        title="Eliminar Usuario"
        message="¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer y eliminará su acceso al sistema."
      />
    </div>
  );
}

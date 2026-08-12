"use client";

import { useState } from "react";
import { Perfil } from "@/features/usuarios/types";
import { useUsuarios } from "@/features/usuarios/hooks/useUsuarios";
import { UserModal } from "@/features/usuarios/components/UserModal";
import { Plus, Search, Trash2, Edit2, Users } from "lucide-react";
import { useAuth } from "@/core/providers/AuthProvider";
import { ConfirmationModal } from "@/shared/ui/ConfirmationModal";
import { toast } from "sonner";

export default function UsersPage() {
  const { role } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Perfil | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null,
  });
  const [searchTerm, setSearchTerm] = useState("");

  const { usuarios, crearUsuario, actualizarUsuario, eliminarUsuario } = useUsuarios();

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
      toast.error(error.message || "Error al guardar usuario");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Gestión de <span className="text-gradient">Usuarios</span>
          </h1>
          <p className="mt-1 text-sm text-muted">Personal y accesos al sistema de farmacia</p>
        </div>
        {role === "admin" && (
          <button
            onClick={handleAddNew}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-hover active:scale-[0.98]"
          >
            <Plus size={18} />
            Nuevo Usuario
          </button>
        )}
      </div>

      <div className="relative w-full max-w-md">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
          aria-hidden="true"
        />
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-premium w-full border-l-4 border-l-primary py-2.5 pl-10 pr-4 text-sm"
        />
      </div>

      {filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted py-16 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary-soft)] text-primary">
            <Users size={28} />
          </div>
          <p className="font-medium text-foreground">No se encontraron usuarios</p>
          <p className="mt-1 text-sm text-muted">
            {searchTerm ? `Sin resultados para "${searchTerm}"` : "Agrega el primer usuario para comenzar"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => {
            const synced = !user.sync_status || user.sync_status === "synced";
            return (
              <div
                key={user.id}
                className="glass-card group p-5 transition-all hover:border-primary/20 hover:shadow-[var(--card-shadow)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-lg font-bold text-primary">
                      {(user.nombre || user.email || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{user.nombre}</p>
                      <p className="truncate text-sm text-muted">{user.email}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span
                          className={
                            user.rol === "admin"
                              ? "inline-flex items-center rounded-md bg-[var(--primary-soft)] px-2 py-0.5 text-xs font-medium capitalize text-primary"
                              : "badge-accent capitalize"
                          }
                        >
                          {user.rol}
                        </span>
                        <span
                          className={`h-2 w-2 rounded-full ${synced ? "bg-accent" : "bg-warning"}`}
                          title={synced ? "Sincronizado" : "Pendiente"}
                        />
                      </div>
                    </div>
                  </div>
                  {role === "admin" && (
                    <div className="flex shrink-0 gap-0.5">
                      <button
                        onClick={() => handleEdit(user)}
                        className="rounded-lg p-2 text-[var(--slate-400)] transition-colors hover:bg-[var(--primary-soft)] hover:text-primary"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(user.id)}
                        className="rounded-lg p-2 text-[var(--slate-400)] transition-colors hover:bg-[var(--danger-soft)] hover:text-danger"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <UserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          item={editingItem}
          onSave={handleSave}
        />
      )}

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={handleConfirmDelete}
        title="Eliminar Usuario"
        message="¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer y eliminará su acceso al sistema."
      />
    </div>
  );
};

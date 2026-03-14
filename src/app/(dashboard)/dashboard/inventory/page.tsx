"use client";

import { useState, useEffect } from "react";
import { useMedicamentos } from "@/features/inventario/hooks/useMedicamentos";
import { useMovimientos } from "@/features/movimientos/hooks/useMovimientos";
import { MedicamentoModal } from "@/features/inventario/components/MedicamentoModal";
import { MovimientoStockModal } from "@/features/inventario/components/MovimientoStockModal";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  ArrowRightLeft,
} from "lucide-react";
import { Skeleton } from "@/shared/ui/Skeleton";
import { MedicamentoSchema } from "@/shared/schemas/validation";
import { toast } from "sonner";
import { Medicamento, TipoMovimiento } from "@/features/inventario/types";
import { useAuth } from "@/core/providers/AuthProvider";

export default function InventoryPage() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Medicamento | null>(null);
  const [stockItem, setStockItem] = useState<Medicamento | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const {
    medicamentos,
    crearMedicamento,
    actualizarMedicamento,
    eliminarMedicamento,
  } = useMedicamentos();

  const { registrarMovimiento } = useMovimientos();

  // 1. RENDIMIENTO: Debounce para el buscador
  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredMedicamentos = medicamentos.filter((m: Medicamento) => {
    if (m.activo === false) return false;
    if (!debouncedTerm) return true;
    return m.nombre.toLowerCase().includes(debouncedTerm.toLowerCase());
  });

  const handleDelete = async (id: string) => {
    if (confirm("¿Eliminar medicamento?")) {
      // Usamos borrado lógico actualizando el campo activo
      await actualizarMedicamento(id, {
        activo: false,
        sync_status: "pending",
      });
      toast.success("Medicamento eliminado");
    }
  };

  const handleEdit = (item: Medicamento) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleAdjustStock = (item: Medicamento) => {
    setStockItem(item);
    setIsStockModalOpen(true);
  };

  const handleSave = async (data: Partial<Medicamento>) => {
    // 1. VALIDACIÓN CON ZOD
    const dataToValidate = editingItem ? { ...editingItem, ...data } : data;
    const result = MedicamentoSchema.safeParse(dataToValidate);

    if (!result.success) {
      // CORRECCIÓN: Usamos .issues en lugar de .errors
      toast.error(result.error.issues[0].message);
      return;
    }

    if (editingItem) {
      await actualizarMedicamento(editingItem.id, data);
      toast.success("Medicamento actualizado correctamente");
    } else {
      // El repositorio se encarga de generar ID, fechas y estado de sincronización
      await crearMedicamento(data as any);
      toast.success("Medicamento registrado correctamente");
    }
  };

  const handleSaveStock = async (
    tipo: TipoMovimiento,
    cantidad: number,
    motivo: string,
  ) => {
    if (stockItem) {
      await registrarMovimiento({
        medicamento_id: stockItem.id,
        tipo,
        cantidad,
        fecha_movimiento: new Date().toISOString(),
      });
      toast.success("Stock actualizado correctamente");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Inventario de Medicamentos
        </h1>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={20} />
          Nuevo Medicamento
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar medicamento..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th className="px-6 py-3">Nombre</th>
                <th className="px-6 py-3">Anaquel</th>
                <th className="px-6 py-3">Stock Actual</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {/* 2. UX: Skeletons durante la búsqueda */}
              {isSearching ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b dark:border-gray-700">
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-20" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-5 w-24 rounded-full" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-8 w-24" />
                    </td>
                  </tr>
                ))
              ) : filteredMedicamentos.length > 0 ? (
                filteredMedicamentos.map((item: Medicamento) => (
                  <tr
                    key={item.id}
                    className="border-b hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {item.nombre}
                      {item.descripcion && (
                        <p className="text-xs text-gray-500">
                          {item.descripcion}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {item.anaquel || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold ${(item.stock_actual ?? 0) <= item.stock_minimo ? "text-red-500" : "text-gray-900 dark:text-gray-100"}`}
                        >
                          {item.stock_actual ?? 0}
                        </span>
                        {(item.stock_actual ?? 0) <= item.stock_minimo && (
                          <AlertTriangle size={16} className="text-red-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${item.sync_status === "synced" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                      >
                        {item.sync_status === "synced"
                          ? "Sincronizado"
                          : "Pendiente"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAdjustStock(item)}
                          className="text-green-600 hover:text-green-900 dark:hover:text-green-400"
                          title="Ajustar Stock"
                        >
                          <ArrowRightLeft size={18} />
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900 dark:hover:text-red-400"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center">
                    No se encontraron medicamentos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <MedicamentoModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          medicamento={editingItem}
          onSave={handleSave}
        />
      )}

      {isStockModalOpen && (
        <MovimientoStockModal
          isOpen={isStockModalOpen}
          onClose={() => setIsStockModalOpen(false)}
          medicamento={stockItem}
          onGuardar={handleSaveStock}
        />
      )}
    </div>
  );
}

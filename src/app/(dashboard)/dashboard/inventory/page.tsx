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
    if (m.activo === 0) return false;
    if (!debouncedTerm) return true;
    return m.nombre.toLowerCase().includes(debouncedTerm.toLowerCase());
  });

  const handleDelete = async (id: string) => {
    if (confirm("¿Eliminar medicamento?")) {
      // Usamos borrado lógico actualizando el campo activo
      await actualizarMedicamento(id, {
        activo: 0,
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
        tipo_medida: stockItem.tipo_medida,
        descripcion_movimiento: motivo || undefined,
        fecha_movimiento: new Date().toISOString(),
      });
      toast.success("Stock actualizado correctamente");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Inventario de Farmacia
          </h1>
          <p className="text-sm text-slate-500 mt-1">Control de stock y suministros</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 shadow-lg shadow-teal-600/20 transition-all active:scale-95"
        >
          <Plus size={18} />
          <span>Nuevo Medicamento</span>
        </button>
      </div>

      <div className="relative w-full md:max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar medicamento..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all dark:border-slate-800 dark:bg-slate-900 dark:text-white"
        />
      </div>

      {/* Vista Desktop: Tabla */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500">
              <tr>
                <th className="px-6 py-4">Medicamento</th>
                <th className="px-6 py-4">Ubicación</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
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
                      <Skeleton className="h-6 w-20" />
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
                        <p className="text-xs text-gray-500 mt-0.5">
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
                          {item.stock_actual ?? 0} {item.unidad_medida}
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
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleAdjustStock(item)}
                          className="p-2 rounded-lg text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/20 dark:hover:text-green-400 transition-colors"
                          title="Ajustar Stock"
                        >
                          <ArrowRightLeft size={18} />
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No se encontraron medicamentos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vista Mobile: Tarjetas */}
      <div className="md:hidden space-y-3">
        {isSearching ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-3" />
              <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          ))
        ) : filteredMedicamentos.length > 0 ? (
          filteredMedicamentos.map((item: Medicamento) => {
            const isLowStock = (item.stock_actual ?? 0) <= item.stock_minimo;
            return (
              <div
                key={item.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                {/* Header: Nombre y Estado */}
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-base leading-tight">
                      {item.nombre}
                    </h3>
                    {item.descripcion && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                        {item.descripcion}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 ${item.sync_status === "synced" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                  >
                    {item.sync_status === "synced" ? "Sync" : "Pendiente"}
                  </span>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Stock</p>
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold text-sm ${isLowStock ? "text-red-500" : "text-gray-900 dark:text-white"}`}>
                        {item.stock_actual ?? 0}
                      </span>
                      <span className="text-xs text-slate-500">{item.unidad_medida}</span>
                      {isLowStock && <AlertTriangle size={14} className="text-red-500" />}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Ubicación</p>
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {item.anaquel || "-"}
                    </p>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => handleAdjustStock(item)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-green-50 text-green-700 text-xs font-semibold dark:bg-green-900/20 dark:text-green-400"
                  >
                    <ArrowRightLeft size={14} />
                    Stock
                  </button>
                  <button
                    onClick={() => handleEdit(item)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold dark:bg-blue-900/20 dark:text-blue-400"
                  >
                    <Edit2 size={14} />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-red-50 text-red-700 text-xs font-semibold dark:bg-red-900/20 dark:text-red-400"
                  >
                    <Trash2 size={14} />
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
            <p className="text-slate-500">No se encontraron medicamentos.</p>
          </div>
        )}
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

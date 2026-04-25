import { useState } from "react";
import { Edit2, Trash2, AlertTriangle, ArrowRightLeft, Calendar } from "lucide-react";
import { Skeleton } from "@/shared/ui/Skeleton";
import { ConfirmationModal } from "@/shared/ui/ConfirmationModal";
import { Medicamento } from "../types";

// Función auxiliar para obtener color según fecha de vencimiento
function getVencimientoColor(fecha: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const vencimiento = new Date(fecha);
  const diffDays = Math.ceil((vencimiento.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "text-gray-400 line-through";
  if (diffDays <= 7) return "text-red-600 font-bold";
  if (diffDays <= 30) return "text-amber-600";
  return "text-gray-600";
}

// Función auxiliar para formatear fecha
function formatDate(fecha: string): string {
  return new Date(fecha).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Props para el componente tabla
interface InventoryTableProps {
  medicamentos: Medicamento[];
  isSearching: boolean;
  onEdit: (item: Medicamento) => void;
  onDelete: (id: string) => void;
  onAdjustStock: (item: Medicamento) => void;
  proximoVencimiento?: Record<string, string | null>;
}

// Tabla desktop del inventario con skeletons y acciones
export function InventoryTable({
  medicamentos,
  isSearching,
  onEdit,
  onDelete,
  onAdjustStock,
  proximoVencimiento = {},
}: InventoryTableProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (deletingId) {
      setIsDeleting(true);
      try {
        await onDelete(deletingId);
        setShowConfirmModal(false);
        setDeletingId(null);
      } finally {
        setIsDeleting(false);
      }
    }
  };
  return (
    <>
      <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500">
              <tr>
                <th className="px-6 py-4">Medicamento</th>
                <th className="px-6 py-4">Ubicación</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4">Próximo Vencimiento</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isSearching ? (
                // Skeletons durante búsqueda
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
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-6 w-20" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-8 w-24" />
                    </td>
                  </tr>
                ))
              ) : medicamentos.length > 0 ? (
                // Lista de medicamentos
                medicamentos.map((item: Medicamento) => (
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
                      {proximoVencimiento[item.id] ? (
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          <span
                            className={`text-xs font-medium ${getVencimientoColor(proximoVencimiento[item.id]!)
                              }`}
                          >
                            {formatDate(proximoVencimiento[item.id]!)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
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
                          onClick={() => onAdjustStock(item)}
                          className="p-2 rounded-lg text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/20 dark:hover:text-green-400 transition-colors"
                          title="Ajustar Stock"
                        >
                          <ArrowRightLeft size={18} />
                        </button>
                        <button
                          onClick={() => onEdit(item)}
                          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(item.id)}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                // Estado vacío
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No se encontraron medicamentos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setDeletingId(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Eliminar Medicamento"
        message="¿Estás seguro de eliminar este medicamento?"
        isLoading={isDeleting}
      />
    </>
  );
}

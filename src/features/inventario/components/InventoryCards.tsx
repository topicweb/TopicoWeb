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

// Props para el componente cards
interface InventoryCardsProps {
  medicamentos: Medicamento[];
  isSearching: boolean;
  onEdit: (item: Medicamento) => void;
  onDelete: (id: string) => void;
  onAdjustStock: (item: Medicamento) => void;
  proximoVencimiento?: Record<string, string | null>;
}

// Vista mobile en tarjetas del inventario
export function InventoryCards({
  medicamentos,
  isSearching,
  onEdit,
  onDelete,
  onAdjustStock,
  proximoVencimiento = {},
}: InventoryCardsProps) {
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
    <div className="md:hidden space-y-3">
      {isSearching ? (
        // Skeletons durante búsqueda
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
      ) : medicamentos.length > 0 ? (
        // Lista de medicamentos en tarjetas
        medicamentos.map((item: Medicamento) => {
          const isLowStock = (item.stock_actual ?? 0) <= item.stock_minimo;
          return (
            <div
              key={item.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
            >
              {/* Header: nombre y estado de sincronización */}
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

              {/* Grid de información */}
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

              {/* Próximo vencimiento */}
              {proximoVencimiento[item.id] && (
                <div className="flex items-center gap-1.5 mb-3 px-2">
                  <Calendar size={12} className="text-slate-400" />
                  <span className="text-xs text-slate-600 dark:text-slate-400">Vence:</span>
                  <span
                    className={`text-xs font-medium ${getVencimientoColor(proximoVencimiento[item.id]!)}`}
                  >
                    {formatDate(proximoVencimiento[item.id]!)}
                  </span>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => onAdjustStock(item)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-green-50 text-green-700 text-xs font-semibold dark:bg-green-900/20 dark:text-green-400"
                >
                  <ArrowRightLeft size={14} />
                  Stock
                </button>
                <button
                  onClick={() => onEdit(item)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold dark:bg-blue-900/20 dark:text-blue-400"
                >
                  <Edit2 size={14} />
                  Editar
                </button>
                <button
                  onClick={() => handleDeleteClick(item.id)}
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
        // Estado vacío
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-slate-500">No se encontraron medicamentos.</p>
        </div>
      )}

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
    </div>
  );
}

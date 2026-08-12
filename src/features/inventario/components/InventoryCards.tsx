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

  if (diffDays < 0) return "text-muted-foreground line-through";
  if (diffDays <= 7) return "text-danger font-bold";
  if (diffDays <= 30) return "text-warning";
  return "text-muted-foreground";
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
          <div key={i} className="glass-card p-4">
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
              className="glass-card p-4 transition-all hover:border-primary/20 hover:shadow-[var(--card-shadow)]"
            >
              {/* Header: nombre y estado de sincronización */}
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold leading-tight text-foreground">
                    {item.nombre}
                  </h3>
                  {item.descripcion && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted">
                      {item.descripcion}
                    </p>
                  )}
                </div>
                <span
                  className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${item.sync_status === "synced" ? "bg-[var(--success-soft)] text-success" : "bg-[var(--warning-soft)] text-warning"}`}
                >
                  {item.sync_status === "synced" ? "Sync" : "Pendiente"}
                </span>
              </div>

              {/* Grid de información */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="rounded-lg bg-muted p-2">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Stock</p>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-bold ${isLowStock ? "text-red-500" : "text-foreground"}`}>
                      {item.stock_actual ?? 0}
                    </span>
                    <span className="text-xs text-muted">{item.unidad_medida}</span>
                    {isLowStock && <AlertTriangle size={14} className="text-red-500" />}
                  </div>
                </div>
                <div className="rounded-lg bg-muted p-2">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Ubicación</p>
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.anaquel || "-"}
                  </p>
                </div>
              </div>

              {/* Próximo vencimiento */}
              {proximoVencimiento[item.id] && (
                <div className="flex items-center gap-1.5 mb-3 px-2">
                  <Calendar size={12} className="text-muted-foreground" />
                  <span className="text-xs text-muted">Vence:</span>
                  <span
                    className={`text-xs font-medium ${getVencimientoColor(proximoVencimiento[item.id]!)}`}
                  >
                    {formatDate(proximoVencimiento[item.id]!)}
                  </span>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex gap-2 border-t border-border pt-2">
                <button
                  onClick={() => onAdjustStock(item)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700"
                >
                  <ArrowRightLeft size={14} />
                  Stock
                </button>
                <button
                  onClick={() => onEdit(item)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--primary-soft)] px-3 py-2 text-xs font-semibold text-primary"
                >
                  <Edit2 size={14} />
                  Editar
                </button>
                <button
                  onClick={() => handleDeleteClick(item.id)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-xs font-semibold text-danger"
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
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted p-8 text-center">
          <p className="text-muted">No se encontraron medicamentos.</p>
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

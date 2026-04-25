"use client";
import { AlertTriangle } from "lucide-react";

// ───────────────────────────────────────────────────────────────────────────────
// MODAL DE CONFIRMACIÓN
// Componente reutilizable para acciones destructivas con estado de carga
// ───────────────────────────────────────────────────────────────────────────────

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isLoading?: boolean;
}

export const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  isLoading,
}: ConfirmationModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800 transform transition-all scale-100">
        <div className="flex items-center gap-3 text-red-600 dark:text-red-500 mb-4">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-lg font-bold">{title}</h3>
        </div>

        <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            {isLoading ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
};

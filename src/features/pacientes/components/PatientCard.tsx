import { useState } from 'react';
import { Edit2, Trash2, User } from 'lucide-react';
import type { Paciente } from '../types';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';

// ───────────────────────────────────────────────────────────────────────────────
// TARJETA DE PACIENTE
// Muestra información del paciente con acciones de edición y eliminación
// ───────────────────────────────────────────────────────────────────────────────

interface PatientCardProps {
  patient: Paciente;
  onEdit: (patient: Paciente) => void;
  onDelete?: (patient: Paciente) => void;
  canDelete?: boolean;
}

export function PatientCard({ patient, onEdit, onDelete, canDelete = false }: PatientCardProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = async () => {
    if (onDelete) {
      setIsDeleting(true);
      try {
        await onDelete(patient);
        setShowConfirmModal(false);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <>
      <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20">
              <User size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {patient.nombres} {patient.apellidos}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{patient.dni}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300 capitalize">
                  {patient.categoria}
                </span>
                {(patient.metadata as any)?.ciclo && (
                  <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    Ciclo {(patient.metadata as any).ciclo}
                  </span>
                )}
                {(patient.metadata as any)?.turno && (
                  <span className="inline-flex items-center rounded-md bg-purple-100 px-2 py-1 text-xs font-medium text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                    {(patient.metadata as any).turno}
                  </span>
                )}
                <span
                  className={`inline-flex h-2 w-2 rounded-full ${patient.sync_status === 'synced' ? 'bg-green-500' : 'bg-amber-500'
                    }`}
                  title={patient.sync_status === 'synced' ? 'Sincronizado' : 'Pendiente de subir'}
                />
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => onEdit(patient)}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-700"
              aria-label="Editar paciente"
            >
              <Edit2 size={20} />
            </button>
            {canDelete && onDelete && (
              <button
                onClick={handleDelete}
                className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                aria-label="Eliminar paciente"
              >
                <Trash2 size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Paciente"
        message={`¿Estás seguro de eliminar a ${patient.nombres} ${patient.apellidos}?`}
        isLoading={isDeleting}
      />
    </>
  );
}

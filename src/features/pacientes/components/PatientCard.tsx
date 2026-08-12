import { useState } from 'react';
import { Edit2, Trash2, User } from 'lucide-react';
import type { Paciente } from '../types';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';

interface PatientCardProps {
  patient: Paciente;
  onEdit: (patient: Paciente) => void;
  onDelete?: (patient: Paciente) => void;
  canDelete?: boolean;
}

export function PatientCard({ patient, onEdit, onDelete, canDelete = false }: PatientCardProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const meta = patient.metadata as { ciclo?: string; turno?: string } | undefined;

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(patient);
      setShowConfirmModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="glass-card group p-5 transition-all hover:border-primary/20 hover:shadow-[var(--card-shadow)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-primary">
              <User size={22} />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-foreground">
                {patient.nombres} {patient.apellidos}
              </h3>
              <p className="text-sm text-muted">{patient.dni}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium capitalize text-muted-foreground">
                  {patient.categoria}
                </span>
                {meta?.ciclo && (
                  <span className="inline-flex items-center rounded-md bg-[var(--primary-soft)] px-2 py-0.5 text-xs font-medium text-primary">
                    Ciclo {meta.ciclo}
                  </span>
                )}
                {meta?.turno && <span className="badge-accent">{meta.turno}</span>}
                <span
                  className={`h-2 w-2 rounded-full ${patient.sync_status === 'synced' ? 'bg-accent' : 'bg-warning'}`}
                  title={patient.sync_status === 'synced' ? 'Sincronizado' : 'Pendiente de subir'}
                />
              </div>
            </div>
          </div>
          <div className="flex shrink-0 gap-0.5">
            <button
              onClick={() => onEdit(patient)}
              className="rounded-lg p-2 text-[var(--slate-400)] transition-colors hover:bg-[var(--primary-soft)] hover:text-primary"
              aria-label="Editar paciente"
            >
              <Edit2 size={18} />
            </button>
            {canDelete && onDelete && (
              <button
                onClick={() => setShowConfirmModal(true)}
                className="rounded-lg p-2 text-[var(--slate-400)] transition-colors hover:bg-[var(--danger-soft)] hover:text-danger"
                aria-label="Eliminar paciente"
              >
                <Trash2 size={18} />
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

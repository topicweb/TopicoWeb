import { Users } from 'lucide-react';
import { Skeleton } from '@/shared/ui/Skeleton';
import type { Paciente } from '../types';
import { PatientCard } from './PatientCard';

interface PatientsGridProps {
  pacientes: Paciente[];
  isSearching: boolean;
  searchTerm: string;
  onEdit: (patient: Paciente) => void;
  onDelete?: (patient: Paciente) => void;
  canDelete?: boolean;
}

export function PatientsGrid({ pacientes, isSearching, searchTerm, onEdit, onDelete, canDelete = false }: PatientsGridProps) {
  if (isSearching) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-card p-5">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (pacientes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--muted)] py-16 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
          <Users size={28} />
        </div>
        <p className="font-medium text-[var(--foreground)]">No se encontraron pacientes</p>
        <p className="mt-1 text-sm text-muted">
          {searchTerm ? `Sin resultados para "${searchTerm}"` : 'Registra el primer paciente para comenzar'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {pacientes.map((patient) => (
        <PatientCard
          key={patient.id}
          patient={patient}
          onEdit={onEdit}
          onDelete={onDelete}
          canDelete={canDelete}
        />
      ))}
    </div>
  );
}

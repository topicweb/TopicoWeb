import { Skeleton } from '@/shared/ui/Skeleton';
import type { Paciente } from '../types';
import { PatientCard } from './PatientCard';

// ───────────────────────────────────────────────────────────────────────────────
// GRID DE PACIENTES
// Muestra lista de pacientes en tarjetas con estados de carga y búsqueda
// ───────────────────────────────────────────────────────────────────────────────

interface PatientsGridProps {
  pacientes: Paciente[];
  isSearching: boolean;
  searchTerm: string;
  onEdit: (patient: Paciente) => void;
  onDelete?: (patient: Paciente) => void;
  canDelete?: boolean;
}

export function PatientsGrid({ pacientes, isSearching, searchTerm, onEdit, onDelete, canDelete = false }: PatientsGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {isSearching ? (
        Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        ))
      ) : pacientes.length > 0 ? (
        pacientes.map((patient) => (
          <PatientCard
            key={patient.id}
            patient={patient}
            onEdit={onEdit}
            onDelete={onDelete}
            canDelete={canDelete}
          />
        ))
      ) : (
        <p className="col-span-full py-8 text-center text-gray-500">
          No se encontraron pacientes con "{searchTerm}".
        </p>
      )}
    </div>
  );
}

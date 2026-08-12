import { Plus } from 'lucide-react';

interface PatientsHeaderProps {
  onAddNew: () => void;
}

export function PatientsHeader({ onAddNew }: PatientsHeaderProps) {
  return (
    <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 md:flex-row md:items-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Gestión de <span className="text-gradient">Pacientes</span>
        </h1>
        <p className="mt-1 text-sm text-muted">Directorio y fichas clínicas de la farmacia</p>
      </div>
      <button
        onClick={onAddNew}
        className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-hover active:scale-[0.98]"
      >
        <Plus size={18} />
        Registrar Paciente
      </button>
    </div>
  );
}

import { Plus } from 'lucide-react';

// ───────────────────────────────────────────────────────────────────────────────
// ENCABEZADO DE PACIENTES
// Título y botón para registrar nuevos pacientes
// ───────────────────────────────────────────────────────────────────────────────

interface PatientsHeaderProps {
  onAddNew: () => void;
}

export function PatientsHeader({ onAddNew }: PatientsHeaderProps) {
  return (
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center border-b border-slate-100 dark:border-slate-800 pb-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Gestión de Pacientes
        </h1>
        <p className="text-sm text-slate-500 mt-1">Directorio y fichas clínicas</p>
      </div>
      <button
        onClick={onAddNew}
        className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 shadow-lg shadow-teal-600/20 transition-all active:scale-95"
      >
        <Plus size={18} />
        <span>Registrar Paciente</span>
      </button>
    </div>
  );
}

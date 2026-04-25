import { Search } from 'lucide-react';

// ───────────────────────────────────────────────────────────────────────────────
// BÚSQUEDA DE PACIENTES
// Campo de búsqueda por DNI o nombre
// ───────────────────────────────────────────────────────────────────────────────

interface PatientSearchProps {
  searchTerm: string;
  onChange: (value: string) => void;
}

export function PatientSearch({ searchTerm, onChange }: PatientSearchProps) {
  return (
    <div className="relative max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        placeholder="Buscar por DNI o nombre..."
        value={searchTerm}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all dark:border-slate-800 dark:bg-slate-900 dark:text-white"
      />
    </div>
  );
}

import { Search } from 'lucide-react';

interface PatientSearchProps {
  searchTerm: string;
  onChange: (value: string) => void;
}

export function PatientSearch({ searchTerm, onChange }: PatientSearchProps) {
  return (
    <div className="relative w-full max-w-md">
      <Search
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
        aria-hidden="true"
      />
      <input
        type="text"
        placeholder="Buscar por DNI o nombre..."
        value={searchTerm}
        onChange={(e) => onChange(e.target.value)}
        className="input-premium w-full border-l-4 border-l-primary py-2.5 pl-10 pr-4 text-sm"
      />
    </div>
  );
}

import { Search, X } from "lucide-react";

interface MedicamentoSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function MedicamentoSearchBar({ value, onChange }: MedicamentoSearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
      <input
        type="text"
        placeholder="Buscar medicamento..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-premium w-full border-l-4 border-l-primary py-2.5 pl-10 pr-10 text-sm"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--slate-400)] transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

import { X } from "lucide-react";

interface MedicamentoSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function MedicamentoSearchBar({ value, onChange }: MedicamentoSearchBarProps) {
  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Buscar medicamento..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 py-4 lg:py-3 pl-12 pr-4 text-base text-slate-700 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all dark:text-white shadow-sm"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-100 hover:text-slate-600"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

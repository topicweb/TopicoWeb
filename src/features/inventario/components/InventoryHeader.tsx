import { Plus, Search } from "lucide-react";

// Props para el componente header
interface InventoryHeaderProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onAddNew: () => void;
}

// Header del inventario con título, descripción, búsqueda y botón de agregar
export function InventoryHeader({ searchTerm, onSearchChange, onAddNew }: InventoryHeaderProps) {
  return (
    <>
      {/* Header principal */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Inventario de Farmacia
          </h1>
          <p className="text-sm text-slate-500 mt-1">Control de stock y suministros</p>
        </div>
        <button
          onClick={onAddNew}
          className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 shadow-lg shadow-teal-600/20 transition-all active:scale-95"
        >
          <Plus size={18} />
          <span>Nuevo Medicamento</span>
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="relative w-full md:max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar medicamento..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all dark:border-slate-800 dark:bg-slate-900 dark:text-white"
        />
      </div>
    </>
  );
}

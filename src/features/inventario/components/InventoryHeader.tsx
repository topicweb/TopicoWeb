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
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Inventario de <span className="text-gradient">Farmacia</span>
          </h1>
          <p className="mt-1 text-sm text-muted">Control de stock y suministros</p>
        </div>
        <button
          onClick={onAddNew}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-hover active:scale-[0.98]"
        >
          <Plus size={18} />
          <span>Nuevo Medicamento</span>
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="relative w-full md:max-w-md">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
          aria-hidden="true"
        />
        <input
          type="text"
          placeholder="Buscar medicamento..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="input-premium w-full border-l-4 border-l-primary py-2.5 pl-10 pr-4 text-sm"
        />
      </div>
    </>
  );
}

"use client";

import { Search, X, ArrowDown, ArrowUp, ArrowLeftRight } from "lucide-react";

interface SearchFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterType: "all" | "entrada" | "salida";
  onFilterChange: (type: "all" | "entrada" | "salida") => void;
}

export function SearchFilter({
  searchTerm,
  onSearchChange,
  filterType,
  onFilterChange,
}: SearchFilterProps) {
  return (
    <div className="glass-card space-y-4 p-5">
      {/* Search Input */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
          aria-hidden="true"
        />
        <input
          type="text"
          placeholder="Buscar por insumo..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="input-premium w-full border-l-4 border-l-primary py-2.5 pl-10 pr-10 text-sm"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onFilterChange("all")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
            filterType === "all"
              ? "bg-primary text-white"
              : "bg-muted text-muted-foreground hover:bg-[var(--slate-100)]"
          }`}
        >
          <ArrowLeftRight size={14} />
          Todos
        </button>
        <button
          onClick={() => onFilterChange("entrada")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
            filterType === "entrada"
              ? "bg-emerald-600 text-white"
              : "bg-muted text-muted-foreground hover:bg-[var(--slate-100)]"
          }`}
        >
          <ArrowDown size={14} />
          Entradas
        </button>
        <button
          onClick={() => onFilterChange("salida")}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
            filterType === "salida"
              ? "bg-rose-600 text-white"
              : "bg-muted text-muted-foreground hover:bg-[var(--slate-100)]"
          }`}
        >
          <ArrowUp size={14} />
          Salidas
        </button>
      </div>
    </div>
  );
}

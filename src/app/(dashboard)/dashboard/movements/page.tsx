"use client";

import { useState, useEffect } from "react";
import { useMovimientos } from "@/features/movimientos/hooks/useMovimientos";
import { ArrowDown, ArrowUp, Calendar, Search } from "lucide-react";
import { Skeleton } from "@/shared/ui/Skeleton";

export default function MovementsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { movimientos } = useMovimientos();

  // Debounce para el buscador
  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filtramos en memoria (el hook ya nos da la lista completa y reactiva)
  const filteredMovements = movimientos.filter(
    (m) =>
      !debouncedTerm ||
      m.medicamento_nombre?.toLowerCase().includes(debouncedTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Historial de Movimientos
          </h1>
          <p className="text-sm text-slate-500 mt-1">Kardex de entradas y salidas</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por insumo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all dark:border-slate-800 dark:bg-slate-900 dark:text-white"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-500">
              <tr>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Insumo</th>
                <th className="px-6 py-4">Operación</th>
                <th className="px-6 py-4">Cantidad</th>
                <th className="px-6 py-4">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {isSearching ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b dark:border-gray-700">
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-36" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-40" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-5 w-24 rounded-full" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-8" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-28" />
                    </td>
                  </tr>
                ))
              ) : filteredMovements.length > 0 ? (
                filteredMovements.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        {new Date(item.fecha_movimiento).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {item.medicamento_nombre}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          item.tipo === "ENTRADA"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                        }`}
                      >
                        {item.tipo === "ENTRADA" ? (
                          <ArrowDown size={12} />
                        ) : (
                          <ArrowUp size={12} />
                        )}
                        {item.tipo.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold">{item.cantidad}</td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {item.atencion_id
                        ? `Atención: ...${item.atencion_id.slice(-6)}`
                        : "Ajuste Manual"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center">
                    {searchTerm
                      ? `No se encontraron movimientos para "${searchTerm}"`
                      : "No hay movimientos registrados."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

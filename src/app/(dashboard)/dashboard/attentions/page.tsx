"use client";

import { useState } from "react";
import { useAtenciones } from "@/features/atenciones/hooks/useAtenciones";
import Link from "next/link";
import { Plus, Search, Calendar, User, FileText } from "lucide-react";

export default function AttentionsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { atencionesConDetalles } = useAtenciones();

  const filteredAttentions = atencionesConDetalles.filter(
    (a) =>
      a.pacienteNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.motivo_consulta.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Atenciones y Consultas
        </h1>
        <Link
          href="/dashboard/attentions/new"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={20} />
          Nueva Atención
        </Link>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por paciente o motivo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredAttentions.map((item) => (
          <div
            key={item.id}
            className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Calendar size={14} />
                  {new Date(item.fecha_atencion).toLocaleString()}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <User size={16} className="text-blue-500" />
                  <span className="font-bold text-gray-900 dark:text-white">
                    {item.pacienteNombre}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                  <span className="font-medium">Motivo:</span>{" "}
                  {item.motivo_consulta}
                </p>
                <div className="mt-2 text-xs text-gray-500">
                  Atendido por: {item.staffNombre}
                </div>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${item.sync_status === "synced" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
              >
                {item.sync_status === "synced" ? "S" : "P"}
              </span>
            </div>
          </div>
        ))}
        {filteredAttentions.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-8 text-center text-gray-500">
            <FileText size={48} className="mb-4 text-gray-300" />
            <p>No hay atenciones registradas.</p>
          </div>
        )}
      </div>
    </div>
  );
}

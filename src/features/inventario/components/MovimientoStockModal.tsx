"use client";

import React, { useState } from "react";
import {
  X,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowRightLeft,
} from "lucide-react";
import { Medicamento, TipoMovimiento } from "../types";

interface MovimientoStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicamento: Medicamento | null;
  onGuardar: (
    tipo: TipoMovimiento,
    cantidad: number,
    motivo: string,
  ) => Promise<void>;
}

export const MovimientoStockModal = ({
  isOpen,
  onClose,
  medicamento,
  onGuardar,
}: MovimientoStockModalProps) => {
  const [tipo, setTipo] = useState<TipoMovimiento>("ENTRADA");
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState(""); // Puede ser fecha vencimiento si es entrada, o motivo si es salida manual
  const [saving, setSaving] = useState(false);

  if (!isOpen || !medicamento) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onGuardar(tipo, cantidad, motivo);
      onClose();
      setCantidad(1);
      setMotivo("");
      setTipo("ENTRADA");
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all animate-in fade-in duration-200">
      <div
        className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all dark:bg-gray-800 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
              <ArrowRightLeft size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Ajustar Stock
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {medicamento.nombre}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200 transition-colors"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Selector de Tipo */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setTipo("ENTRADA")}
              className={`relative p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all duration-200 ${
                tipo === "ENTRADA"
                  ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 dark:border-green-500/50"
                  : "border-gray-200 bg-white text-gray-600 hover:border-green-200 hover:bg-green-50/50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              <ArrowUpCircle
                size={28}
                className={tipo === "ENTRADA" ? "animate-bounce-subtle" : ""}
              />
              <span className="font-bold text-sm">Entrada</span>
              {tipo === "ENTRADA" && (
                <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-green-500"></div>
              )}
            </button>
            <button
              type="button"
              onClick={() => setTipo("SALIDA")}
              className={`relative p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all duration-200 ${
                tipo === "SALIDA"
                  ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 dark:border-red-500/50"
                  : "border-gray-200 bg-white text-gray-600 hover:border-red-200 hover:bg-red-50/50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              <ArrowDownCircle
                size={28}
                className={tipo === "SALIDA" ? "animate-bounce-subtle" : ""}
              />
              <span className="font-bold text-sm">Salida</span>
              {tipo === "SALIDA" && (
                <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500"></div>
              )}
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Cantidad
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                required
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:bg-gray-700"
                value={cantidad}
                onChange={(e) => setCantidad(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          {tipo === "ENTRADA" ? (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Fecha de Vencimiento (Opcional)
              </label>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:bg-gray-700 dark:color-scheme:dark"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Motivo de Salida (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: Dañado, Vencido, Ajuste..."
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:bg-gray-700"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed ${
                tipo === "ENTRADA"
                  ? "bg-green-600 hover:bg-green-700 focus:ring-green-300 dark:focus:ring-green-900"
                  : "bg-red-600 hover:bg-red-700 focus:ring-red-300 dark:focus:ring-red-900"
              }`}
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  {tipo === "ENTRADA" ? (
                    <ArrowUpCircle size={18} />
                  ) : (
                    <ArrowDownCircle size={18} />
                  )}
                  <span>
                    {tipo === "ENTRADA"
                      ? "Registrar Entrada"
                      : "Registrar Salida"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

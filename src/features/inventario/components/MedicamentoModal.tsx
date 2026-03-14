"use client";

import React, { useState, useEffect } from "react";
import { X, Save, Package, Info } from "lucide-react";
import { Medicamento } from "@/core/entities";

interface MedicamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicamento?: Medicamento | null;
  onSave: (med: Partial<Medicamento>) => Promise<void>;
}

export const MedicamentoModal = ({
  isOpen,
  onClose,
  medicamento,
  onSave,
}: MedicamentoModalProps) => {
  const [formData, setFormData] = useState({
    nombre: "",
    unidad_medida: "unidad",
    anaquel: "",
    stock_minimo: 10,
    descripcion: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (medicamento) {
      setFormData({
        nombre: medicamento.nombre,
        unidad_medida: medicamento.unidad_medida ?? 'unidad',
        anaquel: medicamento.anaquel ?? '',
        stock_minimo: medicamento.stock_minimo,
        descripcion: medicamento.descripcion || "",
      });
    } else {
      setFormData({
        nombre: "",
        unidad_medida: "unidad",
        anaquel: "",
        stock_minimo: 10,
        descripcion: "",
      });
    }
  }, [medicamento, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...formData,
        // En nuevo registro, stock_actual empieza en 0 (se gestiona con movimientos)
        ...(medicamento ? {} : { activo: true, stock_actual: 0 }),
      });
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all dark:bg-gray-800 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${medicamento ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"}`}
            >
              <Package size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {medicamento ? "Editar Medicamento" : "Nuevo Medicamento"}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {medicamento
                  ? "Modificar detalles del item"
                  : "Registrar entrada al inventario"}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Nombre del Medicamento
            </label>
            <input
              required
              type="text"
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:bg-gray-700"
              value={formData.nombre}
              onChange={(e) =>
                setFormData({ ...formData, nombre: e.target.value })
              }
              placeholder="Ej: Paracetamol 500mg"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Unidad de Medida
              </label>
              <div className="relative">
                <select
                  className="w-full appearance-none rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:bg-gray-700"
                  value={formData.unidad_medida}
                  onChange={(e) =>
                    setFormData({ ...formData, unidad_medida: e.target.value })
                  }
                >
                  <option value="unidad">Unidad</option>
                  <option value="ml">mL (mililitros)</option>
                  <option value="mg">mg (miligramos)</option>
                  <option value="comprimido">Comprimido</option>
                  <option value="ampolla">Ampolla</option>
                  <option value="sobre">Sobre</option>
                  <option value="frasco">Frasco</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-gray-400">
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Anaquel / Ubicación
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:bg-gray-700"
                value={formData.anaquel}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    anaquel: e.target.value,
                  })
                }
                placeholder="Ej: A-3 o Refrigerador"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Stock Mínimo (Alerta)
              </label>
              <input
                type="number"
                min="0"
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:bg-gray-700"
                value={formData.stock_minimo}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    stock_minimo: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Descripción (Opcional)
            </label>
            <textarea
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:bg-gray-700 min-h-90px"
              rows={3}
              value={formData.descripcion}
              onChange={(e) =>
                setFormData({ ...formData, descripcion: e.target.value })
              }
              placeholder="Detalles adicionales, ubicación, etc..."
            />
          </div>

          {medicamento && (
            <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-4 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
              <Info className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold mb-1">
                  Stock Actual: {medicamento.stock_actual ?? 0} {medicamento.unidad_medida}
                </p>
                <p className="opacity-90">
                  Para modificar la cantidad física, utiliza el botón{" "}
                  <span className="font-bold">"Ajustar Stock"</span> (flechas)
                  en la tabla principal.
                </p>
              </div>
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
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>Guardar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

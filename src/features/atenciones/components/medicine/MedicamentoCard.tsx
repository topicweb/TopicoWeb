import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Check, Plus, Minus, X } from "lucide-react";
import { Medicamento, TipoMedida } from "@/features/inventario/types";
import { COLORES_POR_TIPO, ICONOS_POR_TIPO, getUnidad, getEtiqueta } from "@/features/atenciones/constants/medicamento";

interface MedicamentoCardProps {
  medicamento: Medicamento;
  seleccionado: boolean;
  cantidad: number;
  validando: boolean;
  onAgregar: () => void;
  onRemover: () => void;
  onActualizarCantidad: (nuevaCantidad: number) => void;
}

export function MedicamentoCard({
  medicamento,
  seleccionado,
  cantidad,
  validando,
  onAgregar,
  onRemover,
  onActualizarCantidad,
}: MedicamentoCardProps) {
  const colores = COLORES_POR_TIPO[medicamento.tipo_medida];
  const stockBajo = (medicamento.stock_actual ?? 0) <= (medicamento.stock_minimo ?? 5);
  const unidad = getUnidad(medicamento.tipo_medida);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all ${colores.bg} ${colores.border} ${seleccionado ? "ring-2 ring-offset-2 ring-indigo-500 shadow-lg" : "hover:shadow-md"
        }`}
      onClick={() => !seleccionado && !validando && onAgregar()}
    >
      <div className="flex items-start justify-between mb-2">
        <div className={colores.icon}>{ICONOS_POR_TIPO[medicamento.tipo_medida]}</div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${colores.bg} ${colores.text}`}>
          {getEtiqueta(medicamento.tipo_medida)}
        </span>
      </div>

      <h4 className={`font-semibold ${colores.text} mb-1 line-clamp-2`}>{medicamento.nombre}</h4>
      {medicamento.presentacion && <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{medicamento.presentacion}</p>}

      {stockBajo && (
        <div className="flex items-center gap-1 mt-2 text-rose-500 text-xs">
          <AlertCircle className="w-3 h-3" />
          <span>Stock bajo</span>
        </div>
      )}

      <AnimatePresence>
        {seleccionado && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 rounded-xl flex flex-col items-center justify-center p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <button
                type="button"
                onClick={() => onActualizarCantidad(cantidad - 1)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className={`text-2xl font-bold ${colores.text}`}>
                {cantidad}
                <span className="text-sm font-normal text-slate-500 ml-1">{unidad}</span>
              </span>
              <button
                type="button"
                onClick={() => onActualizarCantidad(cantidad + 1)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={onRemover}
              className="flex items-center gap-1 text-rose-500 text-sm hover:text-rose-600 transition-colors"
            >
              <X className="w-4 h-4" />
              Remover
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {seleccionado && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-md">
          <Check className="w-4 h-4" />
        </div>
      )}
    </motion.div>
  );
}

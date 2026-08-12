import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Check, Plus, Minus, X } from "lucide-react";
import { Medicamento } from "@/features/inventario/types";
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
      className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${colores.bg} ${colores.border} ${
        seleccionado ? "shadow-md ring-2 ring-primary ring-offset-2" : "hover:shadow-sm"
      }`}
      onClick={() => !seleccionado && !validando && onAgregar()}
    >
      <div className="mb-2 flex items-start justify-between">
        <div className={colores.icon}>{ICONOS_POR_TIPO[medicamento.tipo_medida]}</div>
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${colores.bg} ${colores.text}`}>
          {getEtiqueta(medicamento.tipo_medida)}
        </span>
      </div>

      <h4 className={`mb-1 line-clamp-2 font-semibold ${colores.text}`}>{medicamento.nombre}</h4>
      {medicamento.presentacion && (
        <p className="mb-2 text-xs text-muted">{medicamento.presentacion}</p>
      )}

      {stockBajo && (
        <div className="mt-2 flex items-center gap-1 text-xs text-danger">
          <AlertCircle className="h-3 w-3" />
          <span>Stock bajo</span>
        </div>
      )}

      <AnimatePresence>
        {seleccionado && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-white/95 p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => onActualizarCantidad(cantidad - 1)}
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 shadow-sm transition-all hover:opacity-80 ${colores.bg} ${colores.border}`}
              >
                <Minus className={`h-5 w-5 ${colores.text}`} />
              </button>
              <span className={`min-w-[3ch] text-center text-2xl font-bold ${colores.text}`}>
                {cantidad}
                <span className="ml-1 text-sm font-normal text-muted">{unidad}</span>
              </span>
              <button
                type="button"
                onClick={() => onActualizarCantidad(cantidad + 1)}
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 shadow-sm transition-all hover:opacity-80 ${colores.bg} ${colores.border}`}
              >
                <Plus className={`h-5 w-5 ${colores.text}`} />
              </button>
            </div>
            <button
              type="button"
              onClick={onRemover}
              className="flex items-center gap-1 text-sm text-danger transition-colors hover:text-[var(--danger)]"
            >
              <X className="h-4 w-4" />
              Remover
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {seleccionado && (
        <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white shadow-sm">
          <Check className="h-4 w-4" />
        </div>
      )}
    </motion.div>
  );
}

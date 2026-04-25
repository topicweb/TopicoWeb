import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { TipoMedida } from "@/features/inventario/types";
import { COLORES_POR_TIPO, ICONOS_POR_TIPO, TIPO_ABREV, getUnidad } from "@/features/atenciones/constants/medicamento";

interface DispensacionPreviewProps {
  seleccionadas: any[];
  medicamentos: any[];
  totalesPorTipo: Record<TipoMedida, number>;
}

export function DispensacionPreview({
  seleccionadas,
  medicamentos,
  totalesPorTipo,
}: DispensacionPreviewProps) {
  if (seleccionadas.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4"
    >
      <h4 className="font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
        <Check className="w-5 h-5 text-emerald-500" />
        Resumen de Dispensación
      </h4>

      <div className="space-y-2">
        {seleccionadas.map((sel) => {
          const med = medicamentos.find((m) => m.id === sel.medicamento_id);
          if (!med) return null;

          const tipoMedida = sel.tipo_medida as TipoMedida;
          const colores = COLORES_POR_TIPO[tipoMedida];
          return (
            <div
              key={sel.medicamento_id}
              className={`flex items-center justify-between p-2 rounded-lg ${colores.bg}`}
            >
              <div className="flex items-center gap-2">
                <span className={colores.icon}>{ICONOS_POR_TIPO[tipoMedida]}</span>
                <span className={`font-medium ${colores.text}`}>{med.nombre}</span>
              </div>
              <span className={`font-bold ${colores.text}`}>
                {sel.cantidad} {getUnidad(tipoMedida)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TIPO_ABREV) as TipoMedida[]).map((tipo) => {
            const total = totalesPorTipo[tipo];
            if (total === 0) return null;
            const colores = COLORES_POR_TIPO[tipo];
            return (
              <span
                key={tipo}
                className={`px-3 py-1 rounded-full text-sm font-medium ${colores.bg} ${colores.text}`}
              >
                {total} {TIPO_ABREV[tipo]}
              </span>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

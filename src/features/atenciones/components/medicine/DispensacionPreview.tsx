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
      className="rounded-xl border border-border bg-muted p-4"
    >
      <h4 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
        <Check className="h-5 w-5 text-accent" />
        Resumen de Dispensación
      </h4>

      <div className="space-y-2">
        {seleccionadas.map((sel) => {
          const med = medicamentos.find((m) => m.id === sel.medicamento_id);
          if (!med) return null;

          const tipoMedida = sel.tipo_medida as TipoMedida;
          const colores = COLORES_POR_TIPO[tipoMedida];
          return (
            <div key={sel.medicamento_id} className={`flex items-center justify-between rounded-lg p-2 ${colores.bg}`}>
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

      <div className="mt-4 border-t border-border pt-4">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TIPO_ABREV) as TipoMedida[]).map((tipo) => {
            const total = totalesPorTipo[tipo];
            if (total === 0) return null;
            const colores = COLORES_POR_TIPO[tipo];
            return (
              <span key={tipo} className={`rounded-full px-3 py-1 text-sm font-medium ${colores.bg} ${colores.text}`}>
                {total} {TIPO_ABREV[tipo]}
              </span>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

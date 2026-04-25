import { Pill, Droplets, Scale, Percent } from "lucide-react";
import { TipoMedida, CONFIGURACIONES_MEDIDA } from "@/features/inventario/types";

// ───────────────────────────────────────────────────────────────────────────────
// CONSTANTES DE MEDICAMENTOS
// Configuración visual y etiquetas para tipos de medida de medicamentos
// ───────────────────────────────────────────────────────────────────────────────

export const ICONOS_POR_TIPO: Record<TipoMedida, React.ReactNode> = {
  UNIDAD: <Pill className="w-5 h-5" />,
  VOLUMEN_ML: <Droplets className="w-5 h-5" />,
  PESO_MG: <Scale className="w-5 h-5" />,
  PORCENTAJE: <Percent className="w-5 h-5" />,
};

export const COLORES_POR_TIPO: Record<TipoMedida, { bg: string; border: string; text: string; icon: string }> = {
  UNIDAD: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-700 dark:text-blue-300",
    icon: "text-blue-500",
  },
  VOLUMEN_ML: {
    bg: "bg-cyan-50 dark:bg-cyan-950/30",
    border: "border-cyan-200 dark:border-cyan-800",
    text: "text-cyan-700 dark:text-cyan-300",
    icon: "text-cyan-500",
  },
  PESO_MG: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-300",
    icon: "text-amber-500",
  },
  PORCENTAJE: {
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-200 dark:border-purple-800",
    text: "text-purple-700 dark:text-purple-300",
    icon: "text-purple-500",
  },
};

export const TIPO_LABELS: Record<TipoMedida, string> = {
  UNIDAD: "Unidades (Pastillas, Cápsulas)",
  VOLUMEN_ML: "Líquidos (Jarabes, Soluciones)",
  PESO_MG: "Peso (Polvos, Cremas)",
  PORCENTAJE: "Porcentaje (Alcohol, Antisépticos)",
};

export const TIPO_ABREV: Record<TipoMedida, string> = {
  UNIDAD: "Unid.",
  VOLUMEN_ML: "ml",
  PESO_MG: "mg",
  PORCENTAJE: "%",
};

export const getUnidad = (tipo: TipoMedida) => CONFIGURACIONES_MEDIDA[tipo].unidad;
export const getEtiqueta = (tipo: TipoMedida) => CONFIGURACIONES_MEDIDA[tipo].etiqueta;

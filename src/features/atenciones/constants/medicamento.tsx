import { Pill, Droplets, Scale, Percent } from "lucide-react";
import { TipoMedida, CONFIGURACIONES_MEDIDA } from "@/features/inventario/types";

export const ICONOS_POR_TIPO: Record<TipoMedida, React.ReactNode> = {
  UNIDAD: <Pill className="w-5 h-5" />,
  VOLUMEN_ML: <Droplets className="w-5 h-5" />,
  PESO_MG: <Scale className="w-5 h-5" />,
  PORCENTAJE: <Percent className="w-5 h-5" />,
};

/** Tonos claros alineados al design system — legibles sobre fondo blanco */
export const COLORES_POR_TIPO: Record<TipoMedida, { bg: string; border: string; text: string; icon: string }> = {
  UNIDAD: {
    bg: "bg-[var(--primary-soft)]",
    border: "border-primary/20",
    text: "text-primary",
    icon: "text-primary",
  },
  VOLUMEN_ML: {
    bg: "bg-[var(--accent-soft)]",
    border: "border-accent/20",
    text: "text-accent",
    icon: "text-accent",
  },
  PESO_MG: {
    bg: "bg-[var(--warning-soft)]",
    border: "border-warning/20",
    text: "text-warning",
    icon: "text-warning",
  },
  PORCENTAJE: {
    bg: "bg-muted",
    border: "border-border",
    text: "text-foreground",
    icon: "text-[var(--slate-500)]",
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

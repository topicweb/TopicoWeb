import { useMedicamentos } from "@/features/inventario";
import { MedicineDispenser } from "@/features/atenciones/components/MedicineDispenser";
import { DispensacionMedicamento } from "@/features/inventario/types";

interface MedicamentosTabProps {
  dispensaciones: DispensacionMedicamento[];
  onDispensacionesChange: (dispensaciones: DispensacionMedicamento[]) => void;
}

export function MedicamentosTab({ dispensaciones, onDispensacionesChange }: MedicamentosTabProps) {
  const { medicamentos, loading: loadingMedicamentos } = useMedicamentos();

  if (loadingMedicamentos) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 border-2 border-teal-500/30 border-t-teal-500 animate-spin rounded-full" />
      </div>
    );
  }

  return (
    <MedicineDispenser
      medicamentos={medicamentos}
      seleccionadas={dispensaciones}
      onChange={onDispensacionesChange}
    />
  );
}

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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
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

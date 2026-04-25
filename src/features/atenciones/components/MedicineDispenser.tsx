"use client";

import { Medicamento, TipoMedida, DispensacionMedicamento } from "@/features/inventario/types";
import { useMedicineDispenser } from "@/features/atenciones/hooks/useMedicineDispenser";
import { MedicamentoSearchBar } from "@/features/atenciones/components/medicine/MedicamentoSearchBar";
import { MedicamentoGrid } from "@/features/atenciones/components/medicine/MedicamentoGrid";
import { DispensacionPreview } from "@/features/atenciones/components/medicine/DispensacionPreview";

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

interface MedicineDispenserProps {
  medicamentos: Medicamento[];
  seleccionadas: DispensacionMedicamento[];
  onChange: (dispensaciones: DispensacionMedicamento[]) => void;
  limitesPorTipo?: Partial<Record<TipoMedida, number>>;
  mostrarPreview?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════════

export function MedicineDispenser({
  medicamentos,
  seleccionadas,
  onChange,
  limitesPorTipo,
  mostrarPreview = true,
}: MedicineDispenserProps) {
  const {
    busqueda,
    setBusqueda,
    validando,
    medicamentosFiltrados,
    porTipo,
    totalesPorTipo,
    estaSeleccionado,
    getCantidad,
    agregarMedicamento,
    removerMedicamento,
    actualizarCantidad,
    hayMedicamentosSinTipo,
  } = useMedicineDispenser({
    medicamentos,
    seleccionadas,
    onChange,
    limitesPorTipo,
  });

  return (
    <div className="space-y-6">
      {/* Búsqueda */}
      <MedicamentoSearchBar value={busqueda} onChange={setBusqueda} />

      {/* Grid por tipo */}
      <MedicamentoGrid
        porTipo={porTipo}
        seleccionadas={seleccionadas}
        validando={validando}
        onAgregar={agregarMedicamento}
        onRemover={removerMedicamento}
        onActualizarCantidad={actualizarCantidad}
        getCantidad={getCantidad}
        hayMedicamentosSinTipo={hayMedicamentosSinTipo}
        medicamentosFiltrados={medicamentosFiltrados}
      />

      {/* Preview */}
      {mostrarPreview && (
        <DispensacionPreview
          seleccionadas={seleccionadas}
          medicamentos={medicamentos}
          totalesPorTipo={totalesPorTipo}
        />
      )}
    </div>
  );
}

export default MedicineDispenser;

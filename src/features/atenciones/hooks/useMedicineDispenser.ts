import { useState, useMemo, useCallback } from "react";
import { Medicamento, TipoMedida, DispensacionMedicamento } from "@/features/inventario/types";
import { verificarStockDisponible, validarLimiteDispensacion, StockError } from "@/core/db/dexie/logic/stock";

// ───────────────────────────────────────────────────────────────────────────────
// HOOK DE DISPENSADOR DE MEDICAMENTOS
// Encapsula la lógica de búsqueda, filtrado y selección de medicamentos
// ───────────────────────────────────────────────────────────────────────────────

interface UseMedicineDispenserProps {
  medicamentos: Medicamento[];
  seleccionadas: DispensacionMedicamento[];
  onChange: (dispensaciones: DispensacionMedicamento[]) => void;
  limitesPorTipo?: Partial<Record<TipoMedida, number>>;
}

interface UseMedicineDispenserReturn {
  // Estado de búsqueda
  busqueda: string;
  setBusqueda: (term: string) => void;
  validando: Set<string>;

  // Datos filtrados
  medicamentosFiltrados: Medicamento[];
  porTipo: Record<TipoMedida, Medicamento[]>;
  totalesPorTipo: Record<TipoMedida, number>;

  // Auxiliares de selección
  estaSeleccionado: (medId: string) => boolean;
  getCantidad: (medId: string) => number;

  // Acciones
  agregarMedicamento: (medicamento: Medicamento) => Promise<void>;
  removerMedicamento: (medId: string) => void;
  actualizarCantidad: (medId: string, nuevaCantidad: number) => void;

  // Validación
  hayMedicamentosSinTipo: boolean;
}

export function useMedicineDispenser({
  medicamentos,
  seleccionadas,
  onChange,
  limitesPorTipo,
}: UseMedicineDispenserProps): UseMedicineDispenserReturn {
  // ── ESTADO DE BÚSQUEDA ─────────────────────────────────────────────────────────────
  const [busqueda, setBusqueda] = useState("");
  const [validando, setValidando] = useState<Set<string>>(new Set());

  // ── LÓGICA DE FILTRADO ─────────────────────────────────────────────────────────
  const medicamentosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return medicamentos.filter((m) => m.activo === 1);
    const term = busqueda.toLowerCase();
    return medicamentos.filter(
      (m) =>
        m.activo === 1 &&
        (m.nombre.toLowerCase().includes(term) ||
          m.descripcion?.toLowerCase().includes(term) ||
          m.anaquel?.toLowerCase().includes(term))
    );
  }, [medicamentos, busqueda]);

  const porTipo = useMemo(() => {
    const grupos: Record<TipoMedida, Medicamento[]> = { UNIDAD: [], VOLUMEN_ML: [], PESO_MG: [], PORCENTAJE: [] };
    for (const med of medicamentosFiltrados) {
      if (med.tipo_medida && grupos[med.tipo_medida]) {
        grupos[med.tipo_medida].push(med);
      }
    }
    return grupos;
  }, [medicamentosFiltrados]);

  const totalesPorTipo = useMemo(() => {
    const totales: Record<TipoMedida, number> = { UNIDAD: 0, VOLUMEN_ML: 0, PESO_MG: 0, PORCENTAJE: 0 };
    for (const sel of seleccionadas) totales[sel.tipo_medida] += sel.cantidad;
    return totales;
  }, [seleccionadas]);

  // ── AUXILIARES DE SELECCIÓN ───────────────────────────────────────────────────────
  const estaSeleccionado = useCallback(
    (medId: string) => seleccionadas.some((s) => s.medicamento_id === medId),
    [seleccionadas]
  );

  const getCantidad = useCallback(
    (medId: string) => seleccionadas.find((s) => s.medicamento_id === medId)?.cantidad || 0,
    [seleccionadas]
  );

  // ── ACCIONES ─────────────────────────────────────────────────────────────────
  const agregarMedicamento = useCallback(
    async (medicamento: Medicamento) => {
      if (estaSeleccionado(medicamento.id)) return;

      setValidando((prev) => new Set(prev).add(medicamento.id));

      try {
        validarLimiteDispensacion(medicamento, 1, limitesPorTipo);
        await verificarStockDisponible(medicamento.id, 1, medicamento.tipo_medida);

        onChange([
          ...seleccionadas,
          {
            medicamento_id: medicamento.id,
            cantidad: 1,
            tipo_medida: medicamento.tipo_medida,
            presentacion_entregada: medicamento.presentacion,
          },
        ]);
      } catch (error) {
        if (error instanceof StockError) console.error(`Error: ${medicamento.nombre}:`, error.message);
      } finally {
        setValidando((prev) => {
          const next = new Set(prev);
          next.delete(medicamento.id);
          return next;
        });
      }
    },
    [estaSeleccionado, limitesPorTipo, onChange, seleccionadas]
  );

  const removerMedicamento = useCallback(
    (medId: string) => onChange(seleccionadas.filter((s) => s.medicamento_id !== medId)),
    [onChange, seleccionadas]
  );

  const actualizarCantidad = useCallback(
    (medId: string, nuevaCantidad: number) => {
      const cantidad = Math.max(1, Math.floor(nuevaCantidad));
      onChange(seleccionadas.map((s) => (s.medicamento_id === medId ? { ...s, cantidad } : s)));
    },
    [onChange, seleccionadas]
  );

  // ── VALIDACIÓN ─────────────────────────────────────────────────────────────
  const hayMedicamentosSinTipo =
    medicamentosFiltrados.length > 0 &&
    porTipo.UNIDAD.length === 0 &&
    porTipo.VOLUMEN_ML.length === 0 &&
    porTipo.PESO_MG.length === 0 &&
    porTipo.PORCENTAJE.length === 0;

  return {
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
  };
}

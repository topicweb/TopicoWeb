import { useState, useEffect, useMemo } from "react";
import { useMedicamentos } from "./useMedicamentos";
import { useMovimientos } from "@/features/movimientos/hooks/useMovimientos";
import { MedicamentoSchema } from "@/shared/schemas/validation";
import { toast } from "sonner";
import { Medicamento, TipoMovimiento } from "../types";
import { useAuth } from "@/core/providers/AuthProvider";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/core/db/dexie/db";

// Interface para el retorno del hook
interface UseInventoryUIReturn {
  // Estados
  isModalOpen: boolean;
  isStockModalOpen: boolean;
  editingItem: Medicamento | null;
  stockItem: Medicamento | null;
  searchTerm: string;
  debouncedTerm: string;
  isSearching: boolean;

  // Datos
  medicamentos: Medicamento[];
  filteredMedicamentos: Medicamento[];
  proximoVencimiento: Record<string, string | null>;
  loading: boolean;

  // Handlers
  handleDelete: (id: string) => Promise<void>;
  handleEdit: (item: Medicamento) => void;
  handleAddNew: () => void;
  handleAdjustStock: (item: Medicamento) => void;
  handleSave: (data: Partial<Medicamento>) => Promise<void>;
  handleSaveStock: (tipo: TipoMovimiento, cantidad: number, motivo: string, fechaVencimiento?: string) => Promise<void>;
  setSearchTerm: (term: string) => void;
  setIsModalOpen: (open: boolean) => void;
  setIsStockModalOpen: (open: boolean) => void;
}

// Hook personalizado para manejar toda la lógica de UI del inventario
export function useInventoryUI(): UseInventoryUIReturn {
  const { businessId } = useAuth();

  // Estados de modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Medicamento | null>(null);
  const [stockItem, setStockItem] = useState<Medicamento | null>(null);

  // Estados de búsqueda
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Hooks con lógica de negocio separada
  const {
    medicamentos,
    crearMedicamento,
    actualizarMedicamento,
    eliminarMedicamento,
  } = useMedicamentos();

  const { registrarMovimiento } = useMovimientos();

  // Calcular próximo vencimiento para cada medicamento
  const proximoVencimiento = useLiveQuery(async () => {
    if (!businessId || !medicamentos) return {};

    const result: Record<string, string | null> = {};

    for (const med of medicamentos) {
      // Buscar movimientos de entrada con fecha_vencimiento
      const movimientos = await db.movimientos_stock
        .where("[business_id+medicamento_id]")
        .equals([businessId, med.id])
        .filter((mov) => mov.tipo === 'ENTRADA' && !!mov.fecha_vencimiento)
        .toArray();

      if (movimientos.length > 0) {
        // Encontrar la fecha de vencimiento más cercana
        const fechasVencimiento = movimientos
          .map((m) => m.fecha_vencimiento!)
          .filter((f) => f)
          .sort();

        result[med.id] = fechasVencimiento[0] || null;
      } else {
        result[med.id] = null;
      }
    }

    return result;
  }, [businessId, medicamentos]) ?? {};

  // Debounce para búsqueda (300ms)
  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filtrado local de medicamentos activos
  const filteredMedicamentos = medicamentos.filter((m: Medicamento) => {
    if (m.activo === 0) return false;
    if (!debouncedTerm) return true;
    return m.nombre.toLowerCase().includes(debouncedTerm.toLowerCase());
  });

  const loading = medicamentos === undefined;

  // Event Handlers

  const handleDelete = async (id: string) => {
    // Borrado lógico (soft delete)
    await actualizarMedicamento(id, {
      activo: 0,
      sync_status: "pending",
    });
    toast.success("Medicamento eliminado");
  };

  const handleEdit = (item: Medicamento) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleAdjustStock = (item: Medicamento) => {
    setStockItem(item);
    setIsStockModalOpen(true);
  };

  const handleSave = async (data: Partial<Medicamento>) => {
    // Validación con Zod schema
    const dataToValidate = editingItem ? { ...editingItem, ...data } : data;
    const result = MedicamentoSchema.safeParse(dataToValidate);

    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }

    // Guardar según modo (crear/editar)
    if (editingItem) {
      await actualizarMedicamento(editingItem.id, data);
      toast.success("Medicamento actualizado correctamente");
    } else {
      await crearMedicamento(data as any);
      toast.success("Medicamento registrado correctamente");
    }
  };

  const handleSaveStock = async (
    tipo: TipoMovimiento,
    cantidad: number,
    motivo: string,
    fechaVencimiento?: string,
  ) => {
    if (stockItem) {
      await registrarMovimiento({
        medicamento_id: stockItem.id,
        tipo,
        cantidad,
        tipo_medida: stockItem.tipo_medida,
        descripcion_movimiento: motivo || undefined,
        fecha_movimiento: new Date().toISOString(),
        fecha_vencimiento: tipo === 'ENTRADA' ? fechaVencimiento : undefined,
      });
      toast.success("Stock actualizado correctamente");
    }
  };

  return {
    // Estados
    isModalOpen,
    isStockModalOpen,
    editingItem,
    stockItem,
    searchTerm,
    debouncedTerm,
    isSearching,

    // Datos
    medicamentos,
    filteredMedicamentos,
    proximoVencimiento,
    loading,

    // Handlers
    handleDelete,
    handleEdit,
    handleAddNew,
    handleAdjustStock,
    handleSave,
    handleSaveStock,
    setSearchTerm,
    setIsModalOpen,
    setIsStockModalOpen,
  };
}

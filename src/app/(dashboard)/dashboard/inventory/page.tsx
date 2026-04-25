"use client";

import { useAuth } from "@/core/providers/AuthProvider";
import { MedicamentoModal } from "@/features/inventario/components/MedicamentoModal";
import { MovimientoStockModal } from "@/features/inventario/components/MovimientoStockModal";
import { InventoryHeader } from "@/features/inventario/components/InventoryHeader";
import { InventoryTable } from "@/features/inventario/components/InventoryTable";
import { InventoryCards } from "@/features/inventario/components/InventoryCards";
import { useInventoryUI } from "@/features/inventario/hooks/useInventoryUI";

// ───────────────────────────────────────────────────────────────────────────────
// INVENTORY MANAGEMENT PAGE
// Control de stock de farmacia con ajustes y alertas de bajo stock
// ───────────────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const { user } = useAuth();

  // Hook con toda la lógica de UI separada
  const {
    isModalOpen,
    isStockModalOpen,
    editingItem,
    stockItem,
    searchTerm,
    filteredMedicamentos,
    proximoVencimiento,
    isSearching,
    handleDelete,
    handleEdit,
    handleAddNew,
    handleAdjustStock,
    handleSave,
    handleSaveStock,
    setSearchTerm,
    setIsModalOpen,
    setIsStockModalOpen,
  } = useInventoryUI();

  return (
    <div className="space-y-6">
      {/* Header con búsqueda y botón de agregar */}
      <InventoryHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onAddNew={handleAddNew}
      />

      {/* Vista desktop: tabla detallada */}
      <InventoryTable
        medicamentos={filteredMedicamentos}
        isSearching={isSearching}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAdjustStock={handleAdjustStock}
        proximoVencimiento={proximoVencimiento}
      />

      {/* Vista mobile: tarjetas compactas */}
      <InventoryCards
        medicamentos={filteredMedicamentos}
        isSearching={isSearching}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAdjustStock={handleAdjustStock}
        proximoVencimiento={proximoVencimiento}
      />

      {/* Modal de creación/edición de medicamentos */}
      {isModalOpen && (
        <MedicamentoModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          medicamento={editingItem}
          onSave={handleSave}
        />
      )}

      {/* Modal de ajuste de stock */}
      {isStockModalOpen && (
        <MovimientoStockModal
          isOpen={isStockModalOpen}
          onClose={() => setIsStockModalOpen(false)}
          medicamento={stockItem}
          onGuardar={handleSaveStock}
        />
      )}
    </div>
  );
}

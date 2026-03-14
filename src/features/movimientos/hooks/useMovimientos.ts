import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useAuth } from "@/core/providers/AuthProvider";
import { MovimientoStock } from "@/features/inventario/types";
import { db } from "@/core/db/dexie/db";

// Tipo de retorno con el nombre inyectado del join manual
export interface MovimientoStockConMedicamento extends MovimientoStock {
  medicamento_nombre?: string;
}

export function useMovimientos() {
  const { businessId } = useAuth();
  const [loading, setLoading] = useState(false);

  // Reemplazo del repositorio: manual join a db.medicamentos con filtro de business_id
  const movimientos = useLiveQuery(async () => {
    if (typeof window === "undefined" || !businessId) return [];
    
    const movs = await db.movimientos_stock
      .where("business_id")
      .equals(businessId)
      .reverse()
      .toArray();

    // Hacemos el JOIN manual
    const joined = await Promise.all(
      movs.map(async (mov) => {
        const med = await db.medicamentos.get(mov.medicamento_id);
        return {
          ...mov,
          medicamento_nombre: med?.nombre || "Desconocido",
        } as MovimientoStockConMedicamento;
      }),
    );
    return joined;
  }, [businessId]) ?? [];

  const registrarMovimiento = async (
    movimiento: Omit<MovimientoStock, "id" | "creado_at" | "actualizado_at" | "sync_status" | "business_id">
  ) => {
    if (!businessId) throw new Error("No hay Business ID");
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const newMov: MovimientoStock = {
        ...movimiento,
        business_id: businessId,
        id: crypto.randomUUID(),
        creado_at: now,
        actualizado_at: now,
        sync_status: "pending",
      };
      
      await db.transaction("rw", db.movimientos_stock, db.medicamentos, async () => {
        await db.movimientos_stock.add(newMov);

        // Actualizar el stock del medicamento asociado si es necesario
        const med = await db.medicamentos.get(newMov.medicamento_id);
        if (med) {
          const delta = newMov.tipo === "ENTRADA" ? newMov.cantidad : -newMov.cantidad;
          const currentStock = med.stock_actual || 0;
          await db.medicamentos.update(med.id, {
            stock_actual: currentStock + delta,
            actualizado_at: new Date().toISOString(),
            sync_status: "pending",
          });
        }
      });
    } catch (error) {
      console.error("Error al registrar movimiento:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    movimientos,
    registrarMovimiento,
    loading: loading || !movimientos.length,
  };
}
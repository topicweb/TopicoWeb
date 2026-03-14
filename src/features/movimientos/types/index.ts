import { MovimientoStock } from "@/features/inventario/types";

export interface MovimientoRepository {
  registrarMovimiento(movimiento: Omit<MovimientoStock, "id" | "creado_at" | "actualizado_at" | "sync_status">): Promise<void>;
  getByMedicamentoId(medicamentoId: string): Promise<MovimientoStock[]>;
  // Nuevo método para el historial completo
  findAllWithMedicines(): Promise<(MovimientoStock & { medicamentoNombre: string })[]>;
  // Método para estadísticas
  getTopDispensed(limit?: number): Promise<{ name: string; value: number }[]>;
}

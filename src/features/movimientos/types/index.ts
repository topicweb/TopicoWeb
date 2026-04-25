// ───────────────────────────────────────────────────────────────────────────────
// TIPOS DE DOMINIO DE MOVIMIENTOS
// Define interfaces para movimientos, inputs y repositorio
// ───────────────────────────────────────────────────────────────────────────────

import { MovimientoStock, TipoMovimiento } from "@/features/inventario/types";

// ───────────────────────────────────────────────────────────────────────────────
// Movimiento con información enriquecida
// ───────────────────────────────────────────────────────────────────────────────

export interface MovimientoConMedicamento extends MovimientoStock {
  medicamentoNombre: string;
  atencionPacienteNombre?: string;
}

// ───────────────────────────────────────────────────────────────────────────────
// Input para crear movimiento
// ───────────────────────────────────────────────────────────────────────────────

export type CrearMovimientoInput = Omit<
  MovimientoStock,
  "id" | "business_id" | "creado_at" | "actualizado_at" | "sync_status"
>;

// ───────────────────────────────────────────────────────────────────────────────
// Resultado de registro de movimiento
// ───────────────────────────────────────────────────────────────────────────────

export interface RegistroMovimientoResult {
  movimientoId: string;
  medicamentoId: string;
  stockAnterior: number;
  stockNuevo: number;
  tipo: TipoMovimiento;
}

// ───────────────────────────────────────────────────────────────────────────────
// Interface del repositorio (Clean Architecture)
// ───────────────────────────────────────────────────────────────────────────────

export interface MovimientoRepository {
  registrar(input: CrearMovimientoInput, businessId: string): Promise<RegistroMovimientoResult>;
  listarTodosConMedicamento(businessId: string): Promise<MovimientoConMedicamento[]>;
}

import { z } from "zod";

// ───────────────────────────────────────────────────────────────────────────────
// ESQUEMAS DE VALIDACIÓN
// Define reglas de validación para formularios usando Zod
// ───────────────────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────────────────
// Validación de Pacientes
// ───────────────────────────────────────────────────────────────────────────────
export const PacienteSchema = z.object({
  nombres: z.string().min(2, "El nombre debe tener al menos 2 letras"),
  apellidos: z.string().min(2, "El apellido debe tener al menos 2 letras"),
  dni: z.string().regex(/^\d{8}$/, "El DNI debe tener exactamente 8 números"),
  sexo: z.enum(["M", "F"]),
  categoria: z.string().min(1, "La categoría de paciente es requerida"),
  programa_id: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

// ───────────────────────────────────────────────────────────────────────────────
// Validación de Medicamentos
// ───────────────────────────────────────────────────────────────────────────────
export const MedicamentoSchema = z.object({
  nombre: z.string().min(3, "El nombre del medicamento es muy corto"),
  descripcion: z.string().optional(),
  unidad_medida: z.string().min(1, "La unidad de medida es requerida"),
  stock_minimo: z.coerce.number().min(0, "El stock mínimo no puede ser negativo"),
});

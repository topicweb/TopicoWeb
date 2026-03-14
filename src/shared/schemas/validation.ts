import { z } from "zod";

// Esquema para Pacientes
export const PacienteSchema = z.object({
  nombres: z.string().min(2, "El nombre debe tener al menos 2 letras"),
  apellidos: z.string().min(2, "El apellido debe tener al menos 2 letras"),
  dni: z.string().regex(/^\d{8}$/, "El DNI debe tener exactamente 8 números"),
  categoria: z.string().min(1, "La categoría de paciente es requerida"),
  // programa_id es opcional o null en la validación estricta porque lo manejamos con un valor por defecto si falta
  programa_id: z.string().nullable().optional(),
});

// Esquema para Medicamentos
export const MedicamentoSchema = z.object({
  nombre: z.string().min(3, "El nombre del medicamento es muy corto"),
  descripcion: z.string().optional(),
  unidad_medida: z.string().min(1, "La unidad de medida es requerida"),
  // Usamos coerce para transformar strings numéricos a números
  stock_minimo: z.coerce.number().min(0, "El stock mínimo no puede ser negativo"),
});

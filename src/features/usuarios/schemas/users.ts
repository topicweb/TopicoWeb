import { z } from 'zod';
import { RolSchema } from '@/shared/schemas/validation';

const NombreSchema = z.string().trim().min(1, 'El nombre es requerido').max(150, 'El nombre es demasiado largo');
const EmailSchema = z.string().trim().email('Email inválido').max(254, 'El email es demasiado largo');

/** Campos que el usuario puede editar en su propio perfil. */
export const SelfProfileUpdateSchema = z.object({
  nombre: NombreSchema.optional(),
  email: EmailSchema.optional(),
});

/** Campos editables por administración después de validar actor y tenant. */
export const AdminProfileUpdateSchema = z.object({
  nombre: NombreSchema.optional(),
  email: EmailSchema.optional(),
  rol: RolSchema.optional(),
  activo: z.union([z.boolean(), z.literal(0), z.literal(1)]).optional(),
});

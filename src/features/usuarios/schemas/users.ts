import { z } from 'zod';
import { PasswordSchema, RolSchema } from '@/shared/schemas/validation';

const NombreSchema = z.string().trim().min(1, 'El nombre es requerido').max(150, 'El nombre es demasiado largo');
const EmailSchema = z.string().trim().email('Email inválido').max(254, 'El email es demasiado largo');

export const CreateProfileSchema = z.object({
  nombre: NombreSchema,
  email: EmailSchema.transform(email => email.toLowerCase()),
  password: PasswordSchema,
  business_id: z.string().uuid('Institución inválida'),
  rol: RolSchema.default('personal'),
  activo: z.union([z.boolean(), z.literal(0), z.literal(1)]).nullish()
    .transform(value => value == null || value === true || value === 1),
  request_id: z.string().uuid('Solicitud inválida').optional(),
});
export type CreateProfileInput = z.infer<typeof CreateProfileSchema>;

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

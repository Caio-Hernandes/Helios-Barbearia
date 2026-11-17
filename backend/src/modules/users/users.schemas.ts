import { z } from 'zod';
import { Role } from '@prisma/client';

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('E-mail inválido.'));

// bcrypt considera no máximo 72 bytes
export const passwordSchema = z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.').max(72);

export const createUserBodySchema = z.strictObject({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  phone: z.string().trim().min(8).max(20).optional(),
  password: passwordSchema,
});
export type CreateUserInput = z.infer<typeof createUserBodySchema>;

export const listUsersQuerySchema = z.strictObject({
  role: z.enum(Role).optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

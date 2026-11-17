import { z } from 'zod';
import { createUserBodySchema, emailSchema } from '../users/users.schemas';

export const registerBodySchema = createUserBodySchema;
export type RegisterInput = z.infer<typeof registerBodySchema>;

export const loginBodySchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1, 'Informe a senha.'),
});
export type LoginInput = z.infer<typeof loginBodySchema>;

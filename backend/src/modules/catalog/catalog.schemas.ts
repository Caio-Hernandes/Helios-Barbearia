import { z } from 'zod';

export const catalogIdParamsSchema = z.strictObject({ catalogId: z.uuid() });
export type CatalogIdParams = z.infer<typeof catalogIdParamsSchema>;

export const listCatalogQuerySchema = z.strictObject({
  includeInactive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});
export type ListCatalogQuery = z.infer<typeof listCatalogQuerySchema>;

export const createCatalogBodySchema = z.strictObject({
  name: z.string().trim().min(2).max(100),
  /** Preço em centavos: R$ 50,00 = 5000 */
  priceCents: z.number().int().min(0),
  /** Múltiplo de 15 para casar com a grade de horários */
  durationMinutes: z
    .number()
    .int()
    .min(15)
    .max(480)
    .refine((value) => value % 15 === 0, 'A duração deve ser múltipla de 15 minutos.'),
  active: z.boolean().optional(),
});
export type CreateCatalogInput = z.infer<typeof createCatalogBodySchema>;

export const updateCatalogBodySchema = createCatalogBodySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Informe ao menos um campo para atualizar.');
export type UpdateCatalogInput = z.infer<typeof updateCatalogBodySchema>;

import { z } from 'zod';
import { AppointmentStatus } from '@prisma/client';

export const appointmentParamsSchema = z.strictObject({ appointmentId: z.uuid() });
export type AppointmentParams = z.infer<typeof appointmentParamsSchema>;

export const createAppointmentBodySchema = z.strictObject({
  barberId: z.uuid(),
  catalogId: z.uuid(),
  /** Use o `startsAt` devolvido pela rota de disponibilidade. */
  startsAt: z.iso.datetime({ offset: true, message: 'Use data/hora ISO 8601 (ex.: 2026-11-20T14:00:00-03:00).' }),
  notes: z.string().trim().max(500).optional(),
});
export type CreateAppointmentInput = z.infer<typeof createAppointmentBodySchema>;

export const listAppointmentsQuerySchema = z
  .strictObject({
    /** Um dia específico (YYYY-MM-DD, fuso da barbearia) */
    date: z.iso.date().optional(),
    /** Ou um período (inclusivo) */
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    barberId: z.uuid().optional(),
    status: z.enum(AppointmentStatus).optional(),
  })
  .refine((q) => !(q.date && (q.from || q.to)), 'Use "date" ou "from/to", não ambos.')
  .refine((q) => !(q.from && q.to && q.from > q.to), '"from" deve ser anterior ou igual a "to".');
export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;

export const updateStatusBodySchema = z.strictObject({
  status: z.enum([AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW]),
});
export type UpdateStatusInput = z.infer<typeof updateStatusBodySchema>;

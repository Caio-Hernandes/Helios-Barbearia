import { z } from 'zod';

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use o formato HH:mm (ex.: 09:00).');
const isoDateTime = z.iso.datetime({ offset: true, message: 'Use data/hora ISO 8601 (ex.: 2026-11-20T14:00:00-03:00).' });

export const barberParamsSchema = z.strictObject({ barberId: z.uuid() });
export type BarberParams = z.infer<typeof barberParamsSchema>;

export const timeOffParamsSchema = barberParamsSchema.extend({ timeOffId: z.uuid() });
export type TimeOffParams = z.infer<typeof timeOffParamsSchema>;

export const availabilityQuerySchema = z.strictObject({
  /** Opcional: sem ele, considera o dia de hoje no fuso da barbearia. */
  date: z.iso.date('Use o formato YYYY-MM-DD.').optional(),
  /** Opcional: sem ele a resposta traz as janelas livres; com ele, os horários em que o serviço cabe. */
  catalogId: z.uuid().optional(),
});
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

export const workingHoursBodySchema = z.strictObject({
  workingHours: z
    .array(
      z
        .strictObject({
          /** 0 = domingo ... 6 = sábado */
          weekday: z.number().int().min(0).max(6),
          startTime: hhmm,
          endTime: hhmm,
        })
        .refine((wh) => wh.startTime < wh.endTime, {
          message: 'startTime deve ser anterior a endTime.',
          path: ['endTime'],
        }),
    )
    .max(50),
  /**
   * Confirma a troca mesmo que agendamentos futuros fiquem fora do novo expediente
   * (eles continuam marcados). Sem isso, a API responde 409 listando esses agendamentos.
   */
  confirm: z.boolean().optional(),
});
export type WorkingHoursInput = z.infer<typeof workingHoursBodySchema>;

export const createTimeOffBodySchema = z
  .strictObject({
    startsAt: isoDateTime,
    endsAt: isoDateTime,
    reason: z.string().trim().max(200).optional(),
  })
  .refine((v) => new Date(v.startsAt) < new Date(v.endsAt), {
    message: 'endsAt deve ser posterior a startsAt.',
    path: ['endsAt'],
  });
export type CreateTimeOffInput = z.infer<typeof createTimeOffBodySchema>;

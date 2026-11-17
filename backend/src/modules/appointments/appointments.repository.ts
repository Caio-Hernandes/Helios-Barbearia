import { Prisma } from '@prisma/client';
import { prisma } from '../../shared/database/prisma';

const appointmentInclude = {
  catalog: { select: { id: true, name: true, durationMinutes: true } },
  client: { select: { id: true, name: true, phone: true } },
  barber: { select: { id: true, name: true } },
} satisfies Prisma.AppointmentInclude;

export type AppointmentDetails = Prisma.AppointmentGetPayload<{ include: typeof appointmentInclude }>;

/** Detecta a violação da constraint de exclusão criada na migration (código Postgres 23P01). */
export function isOverlapConstraintError(error: unknown): boolean {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientUnknownRequestError
  ) {
    return error.message.includes('appointment_no_overlap') || error.message.includes('23P01');
  }
  return false;
}

export const appointmentsRepository = {
  create(data: Prisma.AppointmentUncheckedCreateInput) {
    return prisma.appointment.create({ data, include: appointmentInclude });
  },

  findById(id: string) {
    return prisma.appointment.findUnique({ where: { id }, include: appointmentInclude });
  },

  list(where: Prisma.AppointmentWhereInput) {
    return prisma.appointment.findMany({ where, include: appointmentInclude, orderBy: { startsAt: 'asc' } });
  },

  update(id: string, data: Prisma.AppointmentUncheckedUpdateInput) {
    return prisma.appointment.update({ where: { id }, data, include: appointmentInclude });
  },
};

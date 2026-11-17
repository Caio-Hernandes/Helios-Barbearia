import { AppointmentStatus } from '@prisma/client';
import { prisma } from '../../shared/database/prisma';

/** Consultas usadas para calcular disponibilidade e validar novos agendamentos. */
export const schedulingRepository = {
  workingHoursOn(barberId: string, weekday: number) {
    return prisma.workingHours.findMany({
      where: { barberId, weekday },
      orderBy: { startTime: 'asc' },
    });
  },

  timeOffsOverlapping(barberId: string, start: Date, end: Date) {
    return prisma.timeOff.findMany({
      where: { barberId, startsAt: { lt: end }, endsAt: { gt: start } },
      select: { id: true, startsAt: true, endsAt: true },
    });
  },

  /** Agendamentos ativos que se sobrepõem a [start, end), por barbeiro ou por cliente. */
  scheduledAppointmentsOverlapping(owner: { barberId: string } | { clientId: string }, start: Date, end: Date) {
    return prisma.appointment.findMany({
      where: {
        ...owner,
        status: AppointmentStatus.SCHEDULED,
        startsAt: { lt: end },
        endsAt: { gt: start },
      },
      select: { id: true, startsAt: true, endsAt: true },
      orderBy: { startsAt: 'asc' },
    });
  },
};

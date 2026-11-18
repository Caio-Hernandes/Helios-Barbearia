import { AppointmentStatus } from '@prisma/client';
import { prisma } from '../../shared/database/prisma';
import type { WorkingHoursInput } from './barbers.schemas';

export const barbersRepository = {
  listWorkingHours(barberId: string) {
    return prisma.workingHours.findMany({
      where: { barberId },
      select: { id: true, weekday: true, startTime: true, endTime: true },
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
    });
  },

  /** Substitui todo o expediente semanal do barbeiro de forma atômica. */
  async replaceWorkingHours(barberId: string, items: WorkingHoursInput['workingHours']) {
    await prisma.$transaction([
      prisma.workingHours.deleteMany({ where: { barberId } }),
      prisma.workingHours.createMany({ data: items.map((item) => ({ ...item, barberId })) }),
    ]);
    return this.listWorkingHours(barberId);
  },

  /** Agendamentos ativos do barbeiro a partir de `from`, com nome do cliente e do serviço. */
  listUpcomingScheduled(barberId: string, from: Date) {
    return prisma.appointment.findMany({
      where: { barberId, status: AppointmentStatus.SCHEDULED, startsAt: { gte: from } },
      select: { id: true, startsAt: true, endsAt: true, client: { select: { name: true } }, catalog: { select: { name: true } } },
      orderBy: { startsAt: 'asc' },
    });
  },

  listUpcomingTimeOffs(barberId: string, from: Date) {
    return prisma.timeOff.findMany({
      where: { barberId, endsAt: { gt: from } },
      orderBy: { startsAt: 'asc' },
    });
  },

  createTimeOff(data: { barberId: string; startsAt: Date; endsAt: Date; reason?: string }) {
    return prisma.timeOff.create({ data });
  },

  findTimeOff(barberId: string, id: string) {
    return prisma.timeOff.findFirst({ where: { id, barberId } });
  },

  deleteTimeOff(id: string) {
    return prisma.timeOff.delete({ where: { id } });
  },
};

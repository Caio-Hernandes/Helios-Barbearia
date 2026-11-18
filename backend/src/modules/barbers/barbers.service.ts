import { Role } from '@prisma/client';
import { DateTime } from 'luxon';
import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/app-error';
import { usersRepository } from '../users/users.repository';
import { catalogRepository } from '../catalog/catalog.repository';
import { schedulingRepository } from '../../domain/scheduling/scheduling.repository';
import { schedulingService } from '../../domain/scheduling/scheduling.service';
import { fitsWorkingHours, localDay, todayLocalDate } from '../../domain/scheduling/scheduling.rules';
import { barbersRepository } from './barbers.repository';
import type { CreateTimeOffInput, WorkingHoursInput } from './barbers.schemas';

type Actor = { id: string; role: Role };

async function ensureBarber(barberId: string) {
  const barber = await usersRepository.findBarberById(barberId);
  if (!barber) throw new NotFoundError('Barbeiro não encontrado.');
  return barber;
}

/** O dono gerencia a agenda de todos; o funcionário, só a própria. */
function assertCanManage(actor: Actor, barberId: string) {
  if (actor.role !== Role.OWNER && actor.id !== barberId) {
    throw new ForbiddenError('Você só pode gerenciar a sua própria agenda.');
  }
}

export const barbersService = {
  list() {
    return usersRepository.listBarbers();
  },

  /**
   * Sem catalogId: janelas livres da agenda (independe do serviço).
   * Com catalogId: horários de início em que aquele serviço cabe inteiro.
   */
  async getAvailability(barberId: string, requestedDate?: string, catalogId?: string) {
    const barber = await ensureBarber(barberId);
    const date = requestedDate ?? todayLocalDate();

    if (!catalogId) {
      const windows = await schedulingService.getFreeWindows(barberId, localDay(date));
      return { barber, date, windows };
    }

    const catalogItem = await catalogRepository.findActiveById(catalogId);
    if (!catalogItem) throw new NotFoundError('Serviço não encontrado.');

    const slots = await schedulingService.getAvailableSlots(barberId, localDay(date), catalogItem.durationMinutes);

    return {
      barber,
      catalog: { id: catalogItem.id, name: catalogItem.name, durationMinutes: catalogItem.durationMinutes, priceCents: catalogItem.priceCents },
      date,
      slots,
    };
  },

  async getWorkingHours(barberId: string) {
    await ensureBarber(barberId);
    return barbersRepository.listWorkingHours(barberId);
  },

  async replaceWorkingHours(barberId: string, { workingHours, confirm }: WorkingHoursInput) {
    await ensureBarber(barberId);

    // Intervalos do mesmo dia não podem se sobrepor
    const sorted = [...workingHours].sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (prev.weekday === curr.weekday && curr.startTime < prev.endTime) {
        throw new BusinessRuleError(
          `Intervalos sobrepostos no dia ${curr.weekday}: ${prev.startTime}-${prev.endTime} e ${curr.startTime}-${curr.endTime}.`,
        );
      }
    }

    // Agendamentos futuros que ficariam fora do novo expediente continuam marcados,
    // mas quem altera precisa saber disso e confirmar
    if (!confirm) {
      const upcoming = await barbersRepository.listUpcomingScheduled(barberId, new Date());
      const outside = upcoming.filter(
        (a) => !fitsWorkingHours(sorted, DateTime.fromJSDate(a.startsAt), DateTime.fromJSDate(a.endsAt)),
      );
      if (outside.length > 0) {
        throw new ConflictError(
          outside.length === 1
            ? '1 agendamento futuro fica fora do novo expediente.'
            : `${outside.length} agendamentos futuros ficam fora do novo expediente.`,
          {
            appointments: outside.map((a) => ({
              id: a.id,
              startsAt: a.startsAt,
              endsAt: a.endsAt,
              clientName: a.client.name,
              catalogName: a.catalog.name,
            })),
          },
        );
      }
    }

    return barbersRepository.replaceWorkingHours(barberId, sorted);
  },

  async listTimeOffs(actor: Actor, barberId: string) {
    assertCanManage(actor, barberId);
    await ensureBarber(barberId);
    return barbersRepository.listUpcomingTimeOffs(barberId, new Date());
  },

  async createTimeOff(actor: Actor, barberId: string, input: CreateTimeOffInput) {
    assertCanManage(actor, barberId);
    await ensureBarber(barberId);

    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);

    // Não bloqueia por cima de clientes já agendados: é preciso cancelar antes
    const conflicts = await schedulingRepository.scheduledAppointmentsOverlapping({ barberId }, startsAt, endsAt);
    if (conflicts.length > 0) {
      throw new ConflictError('Existem agendamentos ativos nesse período. Cancele-os antes de criar o bloqueio.', {
        appointments: conflicts,
      });
    }

    return barbersRepository.createTimeOff({ barberId, startsAt, endsAt, reason: input.reason });
  },

  async deleteTimeOff(actor: Actor, barberId: string, timeOffId: string) {
    assertCanManage(actor, barberId);
    const timeOff = await barbersRepository.findTimeOff(barberId, timeOffId);
    if (!timeOff) throw new NotFoundError('Bloqueio não encontrado.');
    await barbersRepository.deleteTimeOff(timeOff.id);
  },
};

import { AppointmentStatus, Prisma, Role } from '@prisma/client';
import { DateTime } from 'luxon';
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors/app-error';
import { usersRepository } from '../users/users.repository';
import { catalogRepository } from '../catalog/catalog.repository';
import { schedulingService } from '../../domain/scheduling/scheduling.service';
import { CLIENT_CANCEL_LIMIT_MINUTES, canClientCancel, localDay } from '../../domain/scheduling/scheduling.rules';
import { appointmentsRepository, isOverlapConstraintError, type AppointmentDetails } from './appointments.repository';
import type { CreateAppointmentInput, ListAppointmentsQuery, UpdateStatusInput } from './appointments.schemas';

type Actor = { id: string; role: Role };

function canView(actor: Actor, appointment: AppointmentDetails) {
  return actor.role === Role.OWNER || appointment.clientId === actor.id || appointment.barberId === actor.id;
}

async function findVisible(actor: Actor, id: string) {
  const appointment = await appointmentsRepository.findById(id);
  if (!appointment) throw new NotFoundError('Agendamento não encontrado.');
  if (!canView(actor, appointment)) throw new ForbiddenError('Você não tem acesso a este agendamento.');
  return appointment;
}

function assertScheduled(appointment: AppointmentDetails) {
  if (appointment.status !== AppointmentStatus.SCHEDULED) {
    throw new BusinessRuleError(`Este agendamento já está com status ${appointment.status}.`);
  }
}

export const appointmentsService = {
  async create(clientId: string, input: CreateAppointmentInput) {
    const [catalogItem, barber] = await Promise.all([
      catalogRepository.findActiveById(input.catalogId),
      usersRepository.findBarberById(input.barberId),
    ]);
    if (!catalogItem) throw new NotFoundError('Serviço não encontrado.');
    if (!barber) throw new NotFoundError('Barbeiro não encontrado.');

    const start = DateTime.fromISO(input.startsAt);
    const end = start.plus({ minutes: catalogItem.durationMinutes });

    await schedulingService.assertSlotIsBookable({ barberId: barber.id, clientId, start, end });

    try {
      return await appointmentsRepository.create({
        clientId,
        barberId: barber.id,
        catalogId: catalogItem.id,
        startsAt: start.toJSDate(),
        endsAt: end.toJSDate(),
        priceCents: catalogItem.priceCents,
        notes: input.notes,
      });
    } catch (error) {
      // Duas reservas simultâneas: a checagem acima passou para ambas, o banco barrou a segunda
      if (isOverlapConstraintError(error)) {
        throw new ConflictError('Horário já reservado com esse barbeiro.');
      }
      throw error;
    }
  },

  /**
   * Cliente vê os seus; funcionário vê os atribuídos a si; dono vê todos
   * (e pode filtrar por barberId — inclusive o próprio).
   */
  async list(actor: Actor, query: ListAppointmentsQuery) {
    const where: Prisma.AppointmentWhereInput = {};

    if (actor.role === Role.CLIENT) {
      where.clientId = actor.id;
      if (query.barberId) where.barberId = query.barberId;
    } else if (actor.role === Role.EMPLOYEE) {
      if (query.barberId && query.barberId !== actor.id) {
        throw new ForbiddenError('Você só pode ver os seus próprios agendamentos.');
      }
      where.barberId = actor.id;
    } else if (query.barberId) {
      where.barberId = query.barberId;
    }

    if (query.status) where.status = query.status;

    if (query.date) {
      const day = localDay(query.date);
      where.startsAt = { gte: day.toJSDate(), lt: day.plus({ days: 1 }).toJSDate() };
    } else if (query.from || query.to) {
      where.startsAt = {
        ...(query.from && { gte: localDay(query.from).toJSDate() }),
        ...(query.to && { lt: localDay(query.to).plus({ days: 1 }).toJSDate() }),
      };
    }

    return appointmentsRepository.list(where);
  },

  getById(actor: Actor, id: string) {
    return findVisible(actor, id);
  },

  async cancel(actor: Actor, id: string) {
    const appointment = await findVisible(actor, id);
    assertScheduled(appointment);

    if (actor.role === Role.CLIENT && !canClientCancel(DateTime.fromJSDate(appointment.startsAt))) {
      throw new BusinessRuleError(
        `Cancelamentos só são permitidos com até ${CLIENT_CANCEL_LIMIT_MINUTES} minutos de antecedência. Entre em contato com a barbearia.`,
      );
    }

    return appointmentsRepository.update(id, { status: AppointmentStatus.CANCELED, canceledAt: new Date() });
  },

  /** Barbeiro do agendamento (ou o dono) marca como concluído ou não comparecimento. */
  async updateStatus(actor: Actor, id: string, { status }: UpdateStatusInput) {
    const appointment = await findVisible(actor, id);
    if (actor.role !== Role.OWNER && appointment.barberId !== actor.id) {
      throw new ForbiddenError('Apenas o barbeiro do agendamento ou o dono podem alterar o status.');
    }
    assertScheduled(appointment);

    if (appointment.startsAt > new Date()) {
      throw new BusinessRuleError('Só é possível concluir ou marcar falta depois do horário de início.');
    }

    return appointmentsRepository.update(id, { status });
  },
};

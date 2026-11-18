import { DateTime, Interval } from 'luxon';
import { BusinessRuleError, ConflictError } from '../../shared/errors/app-error';
import { schedulingRepository } from './scheduling.repository';
import {
  MAX_BOOKING_ADVANCE_DAYS,
  MIN_BOOKING_LEAD_MINUTES,
  SLOT_STEP_MINUTES,
  TIMEZONE,
  atTime,
  bookingWindowViolation,
  toWeekday,
} from './scheduling.rules';

type Range = { startsAt: Date; endsAt: Date };

const toInterval = ({ startsAt, endsAt }: Range) =>
  Interval.fromDateTimes(DateTime.fromJSDate(startsAt), DateTime.fromJSDate(endsAt));

/** Arredonda para cima até o próximo ponto da grade (09:00, 09:15...) no fuso da barbearia. */
function ceilToSlotStep(date: DateTime): DateTime {
  const minute = date.setZone(TIMEZONE).startOf('minute');
  const base = minute < date ? minute.plus({ minutes: 1 }) : minute;
  return base.plus({ minutes: (SLOT_STEP_MINUTES - (base.minute % SLOT_STEP_MINUTES)) % SLOT_STEP_MINUTES });
}

const minutesBetween = (start: DateTime, end: DateTime) => Math.round(end.diff(start, 'minutes').minutes);

/**
 * Carrega o expediente do dia e tudo que ocupa a agenda do barbeiro nesse dia.
 * Disponível = expediente − bloqueios (TimeOff) − agendamentos ativos.
 */
async function loadBarberDay(barberId: string, day: DateTime) {
  const dayStart = day.setZone(TIMEZONE).startOf('day');
  const dayEnd = dayStart.plus({ days: 1 });

  const [workingHours, timeOffs, appointments] = await Promise.all([
    schedulingRepository.workingHoursOn(barberId, toWeekday(dayStart)),
    schedulingRepository.timeOffsOverlapping(barberId, dayStart.toJSDate(), dayEnd.toJSDate()),
    schedulingRepository.scheduledAppointmentsOverlapping({ barberId }, dayStart.toJSDate(), dayEnd.toJSDate()),
  ]);

  return {
    // Une intervalos que se encostam ou se sobrepõem (ex.: 09:00-18:00 + 18:00-19:00 = 09:00-19:00),
    // para um serviço poder atravessar a emenda
    shifts: Interval.merge(
      workingHours.map((wh) => Interval.fromDateTimes(atTime(dayStart, wh.startTime), atTime(dayStart, wh.endTime))),
    ),
    timeOffs: timeOffs.map(toInterval),
    appointments: appointments.map(toInterval),
  };
}

export const schedulingService = {
  /**
   * Janelas livres do barbeiro no dia, sem considerar serviço:
   * expediente − bloqueios − agendamentos, respeitando a antecedência mínima e máxima.
   */
  async getFreeWindows(barberId: string, day: DateTime) {
    const { shifts, timeOffs, appointments } = await loadBarberDay(barberId, day);
    const busy = [...timeOffs, ...appointments];
    const now = DateTime.now();
    const earliestStart = ceilToSlotStep(now.plus({ minutes: MIN_BOOKING_LEAD_MINUTES }));
    const latestStart = now.plus({ days: MAX_BOOKING_ADVANCE_DAYS });
    const windows: { startsAt: string; endsAt: string; start: string; end: string; minutes: number }[] = [];

    for (const shift of shifts) {
      if (!shift.isValid) continue;

      for (const free of shift.difference(...busy)) {
        if (!free.start || !free.end) continue;
        const start = DateTime.max(free.start, earliestStart).setZone(TIMEZONE);
        const end = free.end.setZone(TIMEZONE);
        if (start > latestStart || minutesBetween(start, end) < SLOT_STEP_MINUTES) continue;

        windows.push({
          startsAt: start.toUTC().toISO()!,
          endsAt: end.toUTC().toISO()!,
          start: start.toFormat('HH:mm'),
          end: end.toFormat('HH:mm'),
          minutes: minutesBetween(start, end),
        });
      }
    }

    return windows;
  },

  /** Horários de início livres em um dia para um serviço com a duração informada. */
  async getAvailableSlots(barberId: string, day: DateTime, durationMinutes: number) {
    const { shifts, timeOffs, appointments } = await loadBarberDay(barberId, day);
    const busy = [...timeOffs, ...appointments];
    const now = DateTime.now();
    const slots: { startsAt: string; endsAt: string; time: string }[] = [];

    for (const shift of shifts) {
      if (!shift.isValid || !shift.start || !shift.end) continue;

      for (
        let start = shift.start;
        start.plus({ minutes: durationMinutes }) <= shift.end;
        start = start.plus({ minutes: SLOT_STEP_MINUTES })
      ) {
        const slot = Interval.after(start, { minutes: durationMinutes });
        if (bookingWindowViolation(start, now)) continue;
        if (busy.some((b) => b.overlaps(slot))) continue;

        slots.push({
          startsAt: start.toUTC().toISO()!,
          endsAt: start.plus({ minutes: durationMinutes }).toUTC().toISO()!,
          time: start.toFormat('HH:mm'),
        });
      }
    }

    return slots;
  },

  /** Lança erro descritivo se o intervalo não puder ser reservado. */
  async assertSlotIsBookable(params: { barberId: string; clientId: string; start: DateTime; end: DateTime }) {
    const { barberId, clientId, start, end } = params;
    const localStart = start.setZone(TIMEZONE);

    const windowError = bookingWindowViolation(start);
    if (windowError) throw new BusinessRuleError(windowError);

    if (localStart.minute % SLOT_STEP_MINUTES !== 0 || localStart.second !== 0 || localStart.millisecond !== 0) {
      throw new BusinessRuleError(`O horário deve seguir a grade de ${SLOT_STEP_MINUTES} minutos (ex.: 09:00, 09:15).`);
    }

    const requested = Interval.fromDateTimes(start, end);
    const { shifts, timeOffs, appointments } = await loadBarberDay(barberId, localStart);

    if (!shifts.some((shift) => shift.engulfs(requested))) {
      throw new BusinessRuleError('Horário fora do expediente do barbeiro.');
    }
    if (timeOffs.some((off) => off.overlaps(requested))) {
      throw new ConflictError('O barbeiro está indisponível nesse horário.');
    }
    if (appointments.some((appt) => appt.overlaps(requested))) {
      throw new ConflictError('Horário já reservado com esse barbeiro.');
    }

    const clientConflicts = await schedulingRepository.scheduledAppointmentsOverlapping(
      { clientId },
      start.toJSDate(),
      end.toJSDate(),
    );
    if (clientConflicts.length > 0) {
      throw new ConflictError('Você já tem um agendamento nesse horário.');
    }
  },
};

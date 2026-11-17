import { DateTime } from 'luxon';

/** Fuso de referência da barbearia (expedientes e datas "YYYY-MM-DD"). */
export const TIMEZONE = 'America/Sao_Paulo';

/** Grade de horários oferecidos: 09:00, 09:15, 09:30... */
export const SLOT_STEP_MINUTES = 15;

/** Antecedência mínima para agendar. */
export const MIN_BOOKING_LEAD_MINUTES = 60;

/** Antecedência máxima para agendar. */
export const MAX_BOOKING_ADVANCE_DAYS = 30;

/** Até quanto tempo antes do horário o CLIENTE pode cancelar. */
export const CLIENT_CANCEL_LIMIT_MINUTES = 60;

/** Retorna a mensagem da regra violada, ou null se o horário pode ser agendado. */
export function bookingWindowViolation(start: DateTime, now: DateTime = DateTime.now()): string | null {
  if (start <= now) {
    return 'Não é possível agendar em um horário que já passou.';
  }
  if (start < now.plus({ minutes: MIN_BOOKING_LEAD_MINUTES })) {
    return `Agendamentos exigem antecedência mínima de ${MIN_BOOKING_LEAD_MINUTES} minutos.`;
  }
  if (start > now.plus({ days: MAX_BOOKING_ADVANCE_DAYS })) {
    return `Agendamentos podem ser feitos com no máximo ${MAX_BOOKING_ADVANCE_DAYS} dias de antecedência.`;
  }
  return null;
}

export function canClientCancel(start: DateTime, now: DateTime = DateTime.now()): boolean {
  return start >= now.plus({ minutes: CLIENT_CANCEL_LIMIT_MINUTES });
}

/** Converte o dia da semana do Luxon (1 = seg ... 7 = dom) para 0 = dom ... 6 = sáb. */
export function toWeekday(date: DateTime): number {
  return date.weekday % 7;
}

/** Data "YYYY-MM-DD" interpretada no fuso da barbearia, às 00:00. */
export function localDay(date: string): DateTime {
  return DateTime.fromISO(date, { zone: TIMEZONE }).startOf('day');
}

/** Aplica um horário "HH:mm" a um dia local. */
export function atTime(day: DateTime, hhmm: string): DateTime {
  const [hour, minute] = hhmm.split(':').map(Number);
  return day.set({ hour, minute, second: 0, millisecond: 0 });
}

/** Data de hoje ("YYYY-MM-DD") no fuso da barbearia. */
export function todayLocalDate(): string {
  return DateTime.now().setZone(TIMEZONE).toISODate()!;
}

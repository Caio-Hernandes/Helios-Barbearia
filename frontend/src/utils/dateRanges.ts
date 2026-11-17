import { addDays, todayLocalDate } from './format';

/** Intervalo de datas "YYYY-MM-DD" (inclusivo). `undefined` = sem limite. */
export interface DateRange {
  from?: string;
  to?: string;
}

const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

export const firstDayOfMonth = (date: string) => `${date.slice(0, 8)}01`;

export function lastDayOfMonth(date: string): string {
  const [y, m] = date.split('-').map(Number);
  const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  return addDays(nextMonth, -1);
}

export function addMonths(date: string, months: number): string {
  const [y, m] = date.split('-').map(Number);
  const total = y * 12 + (m - 1) + months;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}-01`;
}

/** Semana de domingo a sábado que contém a data. */
export function weekOf(date: string): Required<DateRange> {
  const from = addDays(date, -weekdayOf(date));
  return { from, to: addDays(from, 6) };
}

export function monthOf(date: string): Required<DateRange> {
  return { from: firstDayOfMonth(date), to: lastDayOfMonth(date) };
}

/** Últimos N dias até hoje (inclusive). */
export function lastDays(days: number): Required<DateRange> {
  const today = todayLocalDate();
  return { from: addDays(today, -(days - 1)), to: today };
}

export function isInRange(date: string, range: DateRange): boolean {
  return (!range.from || date >= range.from) && (!range.to || date <= range.to);
}

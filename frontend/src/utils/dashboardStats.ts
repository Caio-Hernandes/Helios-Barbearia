import type { ColumnDatum } from '../components/charts/ColumnChart';
import type { Appointment, AppointmentStatus } from '../types';
import { weekOf } from './dateRanges';
import { addDays, formatCurrency, formatLongDate, formatTime, toLocalDate } from './format';

export const percent = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Indicadores do histórico (atendimentos que já aconteceram). */
export function computeStats(list: Appointment[]) {
  const byStatus: Record<AppointmentStatus, number> = { SCHEDULED: 0, COMPLETED: 0, CANCELED: 0, NO_SHOW: 0 };
  list.forEach((a) => (byStatus[a.status] += 1));

  const completed = list.filter((a) => a.status === 'COMPLETED');
  const revenue = completed.reduce((sum, a) => sum + a.priceCents, 0);
  const notCanceled = list.filter((a) => a.status !== 'CANCELED');

  const barbers = new Map<string, { name: string; completed: number; revenue: number; noShow: number }>();
  for (const a of list) {
    const b = barbers.get(a.barberId) ?? { name: a.barber.name, completed: 0, revenue: 0, noShow: 0 };
    if (a.status === 'COMPLETED') {
      b.completed += 1;
      b.revenue += a.priceCents;
    }
    if (a.status === 'NO_SHOW') b.noShow += 1;
    barbers.set(a.barberId, b);
  }

  const services = new Map<string, number>();
  notCanceled.forEach((a) => services.set(a.catalog.name, (services.get(a.catalog.name) ?? 0) + 1));

  const clients = new Map<string, { name: string; visits: number; spent: number }>();
  for (const a of completed) {
    const c = clients.get(a.clientId) ?? { name: a.client.name, visits: 0, spent: 0 };
    c.visits += 1;
    c.spent += a.priceCents;
    clients.set(a.clientId, c);
  }

  return {
    total: list.length,
    booked: notCanceled.length,
    byStatus,
    completed,
    revenue,
    avgTicket: completed.length ? Math.round(revenue / completed.length) : 0,
    uniqueClients: clients.size,
    noShowRate: percent(byStatus.NO_SHOW, byStatus.COMPLETED + byStatus.NO_SHOW),
    byBarber: [...barbers.values()].sort((a, b) => b.completed - a.completed || a.name.localeCompare(b.name)),
    byService: [...services.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    topClients: [...clients.values()].sort((a, b) => b.visits - a.visits || b.spent - a.spent).slice(0, 5),
    history: [...list].sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
  };
}

const shortDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

/**
 * Atendimentos concluídos por dia entre `from` e `to` (até hoje).
 * Períodos longos (mais de 62 dias) são agrupados por semana.
 */
export function completedOverTime(list: Appointment[], from: string, to: string): ColumnDatum[] {
  if (from > to) return [];
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
  const weekly = days > 62;
  const bucketOf = (date: string) => (weekly ? weekOf(date).from : date);

  const buckets = new Map<string, { completed: number; revenue: number; noShow: number }>();
  for (let d = bucketOf(from); d <= to; d = addDays(d, weekly ? 7 : 1)) {
    buckets.set(d, { completed: 0, revenue: 0, noShow: 0 });
  }
  for (const a of list) {
    const bucket = buckets.get(bucketOf(toLocalDate(a.startsAt)));
    if (!bucket) continue;
    if (a.status === 'COMPLETED') {
      bucket.completed += 1;
      bucket.revenue += a.priceCents;
    }
    if (a.status === 'NO_SHOW') bucket.noShow += 1;
  }

  return [...buckets.entries()].map(([key, b]) => ({
    key,
    label: shortDate(key),
    value: b.completed,
    title: weekly ? `Semana de ${shortDate(key)} a ${shortDate(addDays(key, 6))}` : formatLongDate(key),
    details: [
      `${formatCurrency(b.revenue)} de faturamento`,
      ...(b.noShow ? [plural(b.noShow, 'falta', 'faltas')] : []),
    ],
  }));
}

/** Agendamentos (não cancelados) por hora de início — os horários de pico. */
export function byHourOfDay(list: Appointment[]): ColumnDatum[] {
  const counts = new Map<number, number>();
  for (const a of list) {
    if (a.status === 'CANCELED') continue;
    const hour = Number(formatTime(a.startsAt).slice(0, 2));
    counts.set(hour, (counts.get(hour) ?? 0) + 1);
  }
  const hours = [...counts.keys()];
  const first = Math.min(9, ...hours);
  const last = Math.max(18, ...hours);
  return Array.from({ length: last - first + 1 }, (_, i) => {
    const h = first + i;
    return {
      key: String(h),
      label: `${String(h).padStart(2, '0')}h`,
      value: counts.get(h) ?? 0,
      title: `Das ${String(h).padStart(2, '0')}h às ${String(h + 1).padStart(2, '0')}h`,
    };
  });
}

const WEEKDAYS = [
  ['Dom', 'Domingo'],
  ['Seg', 'Segunda-feira'],
  ['Ter', 'Terça-feira'],
  ['Qua', 'Quarta-feira'],
  ['Qui', 'Quinta-feira'],
  ['Sex', 'Sexta-feira'],
  ['Sáb', 'Sábado'],
];

/** Agendamentos (não cancelados) por dia da semana. */
export function byWeekday(list: Appointment[]): ColumnDatum[] {
  const counts = Array<number>(7).fill(0);
  for (const a of list) {
    if (a.status === 'CANCELED') continue;
    counts[new Date(`${toLocalDate(a.startsAt)}T12:00:00Z`).getUTCDay()] += 1;
  }
  return WEEKDAYS.map(([label, title], i) => ({ key: label, label, title, value: counts[i] }));
}

export const formatCompleted = (n: number) => plural(n, 'atendimento concluído', 'atendimentos concluídos');
export const formatBooked = (n: number) => plural(n, 'agendamento', 'agendamentos');

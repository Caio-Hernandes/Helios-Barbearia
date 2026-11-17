import { TIMEZONE } from '../config';
import type { AppointmentStatus, Role } from '../types';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const timeFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: TIMEZONE, day: '2-digit', month: '2-digit', year: 'numeric' });
const isoDateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

export const formatCurrency = (cents: number) => currency.format(cents / 100);

/** "09:30" no fuso da barbearia */
export const formatTime = (isoDateTime: string) => timeFmt.format(new Date(isoDateTime));

/** "18/11/2026" no fuso da barbearia */
export const formatDate = (isoDateTime: string) => dateFmt.format(new Date(isoDateTime));

export const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
};

// ---- Datas "YYYY-MM-DD" (dia no fuso da barbearia) ----

/** Dia de um instante, no fuso da barbearia. */
export const toLocalDate = (isoDateTime: string | Date) => isoDateFmt.format(new Date(isoDateTime));

export const todayLocalDate = () => toLocalDate(new Date());

/** Soma dias a uma data "YYYY-MM-DD". */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const fromLocalDate = (date: string) => new Date(`${date}T12:00:00Z`);

/** "qua" */
export const weekdayShort = (date: string) =>
  fromLocalDate(date).toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' }).replace('.', '');

/** "18" */
export const dayOfMonth = (date: string) => String(fromLocalDate(date).getUTCDate());

/** "nov" */
export const monthShort = (date: string) =>
  fromLocalDate(date).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '');

const capitalizeFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "Quarta-feira, 18 de novembro" */
export const formatLongDate = (date: string) =>
  capitalizeFirst(
    fromLocalDate(date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }),
  );

// ---- Rótulos ----

export const roleLabel: Record<Role, string> = {
  CLIENT: 'Cliente',
  EMPLOYEE: 'Barbeiro',
  OWNER: 'Proprietário',
};

export const statusLabel: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Agendado',
  COMPLETED: 'Concluído',
  CANCELED: 'Cancelado',
  NO_SHOW: 'Não compareceu',
};

/** Iniciais para avatar: "João da Silva" -> "JS" */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '?';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

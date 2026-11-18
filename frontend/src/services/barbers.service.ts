import type {
  Barber,
  CreateTimeOffInput,
  SlotsAvailability,
  TimeOff,
  WindowsAvailability,
  WorkingHours,
  WorkingHoursItem,
} from '../types';
import { apiRequest } from './http';

export const barbersService = {
  list: () => apiRequest<Barber[]>('/barbers'),

  /** Horários de início em que o serviço cabe inteiro. */
  getSlots: (barberId: string, date: string, catalogId: string) =>
    apiRequest<SlotsAvailability>(`/barbers/${barberId}/availability`, { query: { date, catalogId } }),

  /** Janelas livres do dia, independentes do serviço. */
  getFreeWindows: (barberId: string, date: string) =>
    apiRequest<WindowsAvailability>(`/barbers/${barberId}/availability`, { query: { date } }),

  // ---- Expediente semanal ----

  getWorkingHours: (barberId: string) => apiRequest<WorkingHours[]>(`/barbers/${barberId}/working-hours`),

  /**
   * Substitui o expediente inteiro (apenas o dono). Sem `confirm`, a API responde 409
   * se algum agendamento futuro ficar fora do novo expediente (details.appointments).
   */
  replaceWorkingHours: (barberId: string, workingHours: WorkingHoursItem[], confirm = false) =>
    apiRequest<WorkingHours[]>(`/barbers/${barberId}/working-hours`, {
      method: 'PUT',
      body: confirm ? { workingHours, confirm } : { workingHours },
    }),

  // ---- Folgas e bloqueios (dono para todos, barbeiro para si) ----

  listTimeOffs: (barberId: string) => apiRequest<TimeOff[]>(`/barbers/${barberId}/time-offs`),

  createTimeOff: (barberId: string, input: CreateTimeOffInput) =>
    apiRequest<TimeOff>(`/barbers/${barberId}/time-offs`, { method: 'POST', body: input }),

  deleteTimeOff: (barberId: string, timeOffId: string) =>
    apiRequest<void>(`/barbers/${barberId}/time-offs/${timeOffId}`, { method: 'DELETE' }),
};

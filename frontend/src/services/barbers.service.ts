import type { Barber, SlotsAvailability, WindowsAvailability } from '../types';
import { apiRequest } from './http';

export const barbersService = {
  list: () => apiRequest<Barber[]>('/barbers'),

  /** Horários de início em que o serviço cabe inteiro. */
  getSlots: (barberId: string, date: string, catalogId: string) =>
    apiRequest<SlotsAvailability>(`/barbers/${barberId}/availability`, { query: { date, catalogId } }),

  /** Janelas livres do dia, independentes do serviço. */
  getFreeWindows: (barberId: string, date: string) =>
    apiRequest<WindowsAvailability>(`/barbers/${barberId}/availability`, { query: { date } }),
};

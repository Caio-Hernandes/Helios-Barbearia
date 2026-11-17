import type { Appointment, AppointmentFilters, CreateAppointmentInput } from '../types';
import { apiRequest } from './http';

export const appointmentsService = {
  create: (input: CreateAppointmentInput) => apiRequest<Appointment>('/appointments', { method: 'POST', body: input }),

  /** A API decide a visibilidade pelo papel: cliente vê os seus, funcionário os atribuídos, dono todos. */
  list: (filters: AppointmentFilters = {}) => apiRequest<Appointment[]>('/appointments', { query: { ...filters } }),

  cancel: (id: string) => apiRequest<Appointment>(`/appointments/${id}/cancel`, { method: 'PATCH' }),

  updateStatus: (id: string, status: 'COMPLETED' | 'NO_SHOW') =>
    apiRequest<Appointment>(`/appointments/${id}/status`, { method: 'PATCH', body: { status } }),
};

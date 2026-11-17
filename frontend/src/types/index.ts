// Tipos espelhando as respostas da API (backend/).

export type Role = 'CLIENT' | 'EMPLOYEE' | 'OWNER';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  priceCents: number;
  durationMinutes: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Barber {
  id: string;
  name: string;
}

export interface Slot {
  startsAt: string;
  endsAt: string;
  /** "HH:mm" no fuso da barbearia */
  time: string;
}

export interface FreeWindow {
  startsAt: string;
  endsAt: string;
  start: string;
  end: string;
  minutes: number;
}

export interface SlotsAvailability {
  barber: Barber;
  catalog: Pick<CatalogItem, 'id' | 'name' | 'durationMinutes' | 'priceCents'>;
  date: string;
  slots: Slot[];
}

export interface WindowsAvailability {
  barber: Barber;
  date: string;
  windows: FreeWindow[];
}

export type AppointmentStatus = 'SCHEDULED' | 'CANCELED' | 'COMPLETED' | 'NO_SHOW';

export interface Appointment {
  id: string;
  clientId: string;
  barberId: string;
  catalogId: string;
  startsAt: string;
  endsAt: string;
  priceCents: number;
  status: AppointmentStatus;
  notes: string | null;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
  catalog: { id: string; name: string; durationMinutes: number };
  client: { id: string; name: string; phone: string | null };
  barber: Barber;
}

export interface CreateAppointmentInput {
  barberId: string;
  catalogId: string;
  startsAt: string;
  notes?: string;
}

export interface AppointmentFilters {
  date?: string;
  from?: string;
  to?: string;
  barberId?: string;
  status?: AppointmentStatus;
}

/** Formato de erro da API: { error, details? } */
export interface ApiErrorBody {
  error: string;
  details?: unknown;
}

import type { Role, User } from '../types';
import { apiRequest } from './http';

export const usersService = {
  /** Apenas para o dono. */
  list: (role?: Role) => apiRequest<User[]>('/users', { query: { role } }),
};

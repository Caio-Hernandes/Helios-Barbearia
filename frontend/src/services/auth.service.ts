import type { AuthResponse, LoginInput, RegisterInput, User } from '../types';
import { apiRequest } from './http';

export const authService = {
  login: (input: LoginInput) => apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: input, auth: false }),

  register: (input: RegisterInput) =>
    apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: input, auth: false }),

  logout: () => apiRequest<void>('/auth/logout', { method: 'POST', auth: false }),

  me: () => apiRequest<User>('/auth/me'),
};

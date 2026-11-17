/** Endereço da API. Configure com VITE_API_URL no arquivo .env do frontend. */
export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3333';

/** Fuso de referência da barbearia (o mesmo do backend). */
export const TIMEZONE = 'America/Sao_Paulo';

/** Mesmas regras do backend, usadas só para orientar a interface. */
export const MAX_BOOKING_ADVANCE_DAYS = 30;
export const CLIENT_CANCEL_LIMIT_MINUTES = 60;

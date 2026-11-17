import { API_URL } from '../config';
import type { ApiErrorBody, AuthResponse } from '../types';

/** Erro padronizado de chamadas à API. */
export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }

  /** Mensagens de validação ({ field, message }[]) devolvidas pela API, se houver. */
  get fieldMessages(): string[] {
    if (!Array.isArray(this.details)) return [];
    return this.details
      .map((d) => (d && typeof d === 'object' && 'message' in d ? String((d as { message: unknown }).message) : null))
      .filter((m): m is string => Boolean(m));
  }
}

/** Mensagem amigável a partir de qualquer erro. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const fields = error.fieldMessages;
    return fields.length ? `${error.message} ${fields.join(' ')}` : error.message;
  }
  return 'Algo deu errado. Tente novamente.';
}

// O access token fica só em memória (não em localStorage). O refresh token
// fica num cookie httpOnly que o navegador envia sozinho para /auth.
let accessToken: string | null = null;
let sessionExpiredHandler: (() => void) | null = null;
let refreshInFlight: Promise<AuthResponse | null> | null = null;

export const session = {
  getToken: () => accessToken,
  setToken: (token: string | null) => {
    accessToken = token;
  },
  /** Chamado quando o refresh falha (sessão expirada). */
  onExpired: (handler: (() => void) | null) => {
    sessionExpiredHandler = handler;
  },
};

type QueryValue = string | number | boolean | undefined | null;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, QueryValue>;
  /** Envia o access token e tenta renovar a sessão em caso de 401. Padrão: true. */
  auth?: boolean;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  // API_URL pode ser absoluta (http://localhost:3333) ou relativa ao site (/api, atrás do nginx)
  const url = new URL(`${API_URL.replace(/\/+$/, '')}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toApiError(response: Response, body: unknown): ApiError {
  const data = body as Partial<ApiErrorBody> | undefined;
  const message = typeof data?.error === 'string' ? data.error : `Erro ${response.status}.`;
  return new ApiError(message, response.status, data?.details);
}

/**
 * Renova a sessão usando o cookie de refresh. Chamadas simultâneas
 * compartilham a mesma requisição.
 */
export function refreshSession(): Promise<AuthResponse | null> {
  refreshInFlight ??= (async () => {
    try {
      const response = await fetch(buildUrl('/auth/refresh'), { method: 'POST', credentials: 'include' });
      if (!response.ok) {
        accessToken = null;
        return null;
      }
      const data = (await response.json()) as AuthResponse;
      accessToken = data.accessToken;
      return data;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

/** Requisição à API com fetch nativo, JSON e renovação automática do token. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const { method = 'GET', body, query, auth = true } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor. Verifique se a API está rodando.', 0);
  }

  // Access token expirado: renova uma vez e repete a requisição
  if (response.status === 401 && auth && !isRetry) {
    const refreshed = await refreshSession();
    if (refreshed) return apiRequest<T>(path, options, true);
    sessionExpiredHandler?.();
  }

  const data = await parseBody(response);
  if (!response.ok) throw toApiError(response, data);
  return data as T;
}

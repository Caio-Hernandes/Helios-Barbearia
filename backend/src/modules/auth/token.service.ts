import jwt from 'jsonwebtoken';
import type { CookieOptions } from 'express';
import { Role } from '@prisma/client';
import { env, isProduction } from '../../config/env';
import { AppError, UnauthorizedError } from '../../shared/errors/app-error';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutos
export const REFRESH_TOKEN_TTL_SECONDS = 15 * 24 * 60 * 60; // 15 dias

export const REFRESH_COOKIE_NAME = 'refresh_token';

/**
 * O refresh token vive só no cookie httpOnly (o JavaScript do navegador não o lê)
 * e só é enviado para as rotas /auth.
 */
export const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE ?? isProduction, // em produção, apenas HTTPS (salvo COOKIE_SECURE=false)
  sameSite: 'strict',
  path: env.COOKIE_PATH,
  maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
};

export const clearRefreshCookieOptions: CookieOptions = {
  httpOnly: refreshCookieOptions.httpOnly,
  secure: refreshCookieOptions.secure,
  sameSite: refreshCookieOptions.sameSite,
  path: refreshCookieOptions.path,
};

type TokenUser = { id: string; role: Role };

export function signAccessToken(user: TokenUser): string {
  return jwt.sign({ role: user.role, type: 'access' }, env.JWT_ACCESS_SECRET, {
    subject: user.id,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    algorithm: 'HS256',
  });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    subject: userId,
    expiresIn: REFRESH_TOKEN_TTL_SECONDS,
    algorithm: 'HS256',
  });
}

export function verifyAccessToken(token: string): { userId: string; role: Role } {
  const payload = verify(token, env.JWT_ACCESS_SECRET, 'access');
  const role = payload.role;
  if (typeof role !== 'string' || !(role in Role)) {
    throw new UnauthorizedError('Token inválido.');
  }
  return { userId: payload.sub, role: role as Role };
}

export function verifyRefreshToken(token: string): { userId: string } {
  const payload = verify(token, env.JWT_REFRESH_SECRET, 'refresh');
  return { userId: payload.sub };
}

function verify(token: string, secret: string, expectedType: 'access' | 'refresh') {
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || payload.type !== expectedType || !payload.sub) {
      throw new UnauthorizedError('Token inválido.');
    }
    return payload as jwt.JwtPayload & { sub: string };
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError(expectedType === 'access' ? 'Token de acesso expirado.' : 'Sessão expirada. Faça login novamente.');
    }
    throw new UnauthorizedError('Token inválido.');
  }
}

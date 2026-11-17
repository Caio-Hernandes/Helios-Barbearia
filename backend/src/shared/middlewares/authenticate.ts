import type { Request, RequestHandler } from 'express';
import { UnauthorizedError } from '../errors/app-error';
import { verifyAccessToken } from '../../modules/auth/token.service';

/** Exige `Authorization: Bearer <accessToken>` válido e preenche `req.user`. */
export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token de acesso ausente.');
  }

  const payload = verifyAccessToken(header.slice('Bearer '.length).trim());
  req.user = { id: payload.userId, role: payload.role };
  next();
};

/** Retorna o usuário autenticado (use apenas em rotas com `authenticate`). */
export function getAuthUser(req: Request) {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}

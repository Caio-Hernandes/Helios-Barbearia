import type { RequestHandler } from 'express';
import type { Role } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from '../errors/app-error';

/** Restringe a rota aos papéis informados. Use depois de `authenticate`. */
export const authorize =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) throw new UnauthorizedError();
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('Você não tem permissão para esta ação.');
    }
    next();
  };

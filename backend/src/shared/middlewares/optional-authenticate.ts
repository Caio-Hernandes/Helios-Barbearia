import type { RequestHandler } from 'express';
import { authenticate } from './authenticate';

/**
 * Para rotas públicas que se comportam diferente quando há usuário logado.
 * Sem header Authorization segue anônimo; com header, ele precisa ser válido.
 */
export const optionalAuthenticate: RequestHandler = (req, res, next) => {
  if (!req.headers.authorization) {
    next();
    return;
  }
  authenticate(req, res, next);
};

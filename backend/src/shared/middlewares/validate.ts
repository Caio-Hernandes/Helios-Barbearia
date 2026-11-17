import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

type Schemas = {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
};

/**
 * Valida e normaliza body/query/params com Zod. Em caso de erro, o ZodError
 * segue para o errorHandler, que responde 400 com os detalhes.
 * Depois deste middleware, os controllers podem confiar nos tipos dos schemas.
 */
export const validate =
  (schemas: Schemas): RequestHandler =>
  (req, _res, next) => {
    if (schemas.params) {
      req.params = schemas.params.parse(req.params) as typeof req.params;
    }
    if (schemas.query) {
      // No Express 5, req.query é um getter: precisa ser redefinido.
      Object.defineProperty(req, 'query', {
        value: schemas.query.parse(req.query),
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
    if (schemas.body) {
      req.body = schemas.body.parse(req.body ?? {});
    }
    next();
  };

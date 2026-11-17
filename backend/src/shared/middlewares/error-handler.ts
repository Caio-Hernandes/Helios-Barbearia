import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../errors/app-error';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: `Rota ${req.method} ${req.path} não encontrada.` });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.details !== undefined && { details: err.details }),
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Dados inválidos.',
      details: err.issues.map((issue) => ({
        field: issue.path.join('.') || undefined,
        message: issue.message,
      })),
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Registro duplicado.', details: err.meta?.target });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Recurso não encontrado.' });
      return;
    }
  }

  // JSON malformado no corpo da requisição
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'JSON inválido no corpo da requisição.' });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
};

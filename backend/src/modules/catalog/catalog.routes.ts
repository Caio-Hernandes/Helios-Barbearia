import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import { optionalAuthenticate } from '../../shared/middlewares/optional-authenticate';
import { validate } from '../../shared/middlewares/validate';
import { catalogController } from './catalog.controller';
import {
  createCatalogBodySchema,
  listCatalogQuerySchema,
  catalogIdParamsSchema,
  updateCatalogBodySchema,
} from './catalog.schemas';

export const catalogRoutes = Router();

catalogRoutes.get('/', optionalAuthenticate, validate({ query: listCatalogQuerySchema }), catalogController.list);

catalogRoutes.post(
  '/',
  authenticate,
  authorize(Role.OWNER),
  validate({ body: createCatalogBodySchema }),
  catalogController.create,
);

catalogRoutes.patch(
  '/:catalogId',
  authenticate,
  authorize(Role.OWNER),
  validate({ params: catalogIdParamsSchema, body: updateCatalogBodySchema }),
  catalogController.update,
);

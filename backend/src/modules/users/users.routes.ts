import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import { validate } from '../../shared/middlewares/validate';
import { usersController } from './users.controller';
import { createUserBodySchema, listUsersQuerySchema } from './users.schemas';

export const usersRoutes = Router();

// Todas as rotas de gestão de usuários são exclusivas do dono
usersRoutes.use(authenticate, authorize(Role.OWNER));

usersRoutes.get('/', validate({ query: listUsersQuerySchema }), usersController.list);
usersRoutes.post('/employees', validate({ body: createUserBodySchema }), usersController.createEmployee);

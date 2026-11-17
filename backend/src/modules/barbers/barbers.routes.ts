import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import { validate } from '../../shared/middlewares/validate';
import { barbersController } from './barbers.controller';
import {
  availabilityQuerySchema,
  barberParamsSchema,
  createTimeOffBodySchema,
  timeOffParamsSchema,
  workingHoursBodySchema,
} from './barbers.schemas';

export const barbersRoutes = Router();

// Públicas: o cliente consulta barbeiros e horários antes mesmo de logar
barbersRoutes.get('/', barbersController.list);
barbersRoutes.get(
  '/:barberId/availability',
  validate({ params: barberParamsSchema, query: availabilityQuerySchema }),
  barbersController.availability,
);
barbersRoutes.get('/:barberId/working-hours', validate({ params: barberParamsSchema }), barbersController.getWorkingHours);

// Expediente: só o dono altera
barbersRoutes.put(
  '/:barberId/working-hours',
  authenticate,
  authorize(Role.OWNER),
  validate({ params: barberParamsSchema, body: workingHoursBodySchema }),
  barbersController.replaceWorkingHours,
);

// Bloqueios (folgas etc.): o dono para todos, o funcionário para si
barbersRoutes.get(
  '/:barberId/time-offs',
  authenticate,
  authorize(Role.EMPLOYEE, Role.OWNER),
  validate({ params: barberParamsSchema }),
  barbersController.listTimeOffs,
);
barbersRoutes.post(
  '/:barberId/time-offs',
  authenticate,
  authorize(Role.EMPLOYEE, Role.OWNER),
  validate({ params: barberParamsSchema, body: createTimeOffBodySchema }),
  barbersController.createTimeOff,
);
barbersRoutes.delete(
  '/:barberId/time-offs/:timeOffId',
  authenticate,
  authorize(Role.EMPLOYEE, Role.OWNER),
  validate({ params: timeOffParamsSchema }),
  barbersController.deleteTimeOff,
);

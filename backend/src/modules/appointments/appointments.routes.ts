import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import { validate } from '../../shared/middlewares/validate';
import { appointmentsController } from './appointments.controller';
import {
  appointmentParamsSchema,
  createAppointmentBodySchema,
  listAppointmentsQuerySchema,
  updateStatusBodySchema,
} from './appointments.schemas';

export const appointmentsRoutes = Router();

appointmentsRoutes.use(authenticate);

// Só clientes agendam
appointmentsRoutes.post(
  '/',
  authorize(Role.CLIENT),
  validate({ body: createAppointmentBodySchema }),
  appointmentsController.create,
);

// A visibilidade é decidida no service conforme o papel
appointmentsRoutes.get('/', validate({ query: listAppointmentsQuerySchema }), appointmentsController.list);
appointmentsRoutes.get('/:appointmentId', validate({ params: appointmentParamsSchema }), appointmentsController.getById);

appointmentsRoutes.patch(
  '/:appointmentId/cancel',
  validate({ params: appointmentParamsSchema }),
  appointmentsController.cancel,
);

appointmentsRoutes.patch(
  '/:appointmentId/status',
  authorize(Role.EMPLOYEE, Role.OWNER),
  validate({ params: appointmentParamsSchema, body: updateStatusBodySchema }),
  appointmentsController.updateStatus,
);

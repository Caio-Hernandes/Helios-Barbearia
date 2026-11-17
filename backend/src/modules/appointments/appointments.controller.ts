import type { Request, Response } from 'express';
import { getAuthUser } from '../../shared/middlewares/authenticate';
import { appointmentsService } from './appointments.service';
import type {
  AppointmentParams,
  CreateAppointmentInput,
  ListAppointmentsQuery,
  UpdateStatusInput,
} from './appointments.schemas';

export const appointmentsController = {
  async create(req: Request, res: Response) {
    const appointment = await appointmentsService.create(getAuthUser(req).id, req.body as CreateAppointmentInput);
    res.status(201).json(appointment);
  },

  async list(req: Request, res: Response) {
    res.json(await appointmentsService.list(getAuthUser(req), req.query as ListAppointmentsQuery));
  },

  async getById(req: Request, res: Response) {
    const { appointmentId } = req.params as AppointmentParams;
    res.json(await appointmentsService.getById(getAuthUser(req), appointmentId));
  },

  async cancel(req: Request, res: Response) {
    const { appointmentId } = req.params as AppointmentParams;
    res.json(await appointmentsService.cancel(getAuthUser(req), appointmentId));
  },

  async updateStatus(req: Request, res: Response) {
    const { appointmentId } = req.params as AppointmentParams;
    res.json(await appointmentsService.updateStatus(getAuthUser(req), appointmentId, req.body as UpdateStatusInput));
  },
};

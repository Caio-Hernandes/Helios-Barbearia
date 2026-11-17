import type { Request, Response } from 'express';
import { getAuthUser } from '../../shared/middlewares/authenticate';
import { barbersService } from './barbers.service';
import type {
  AvailabilityQuery,
  BarberParams,
  CreateTimeOffInput,
  TimeOffParams,
  WorkingHoursInput,
} from './barbers.schemas';

export const barbersController = {
  async list(_req: Request, res: Response) {
    res.json(await barbersService.list());
  },

  async availability(req: Request, res: Response) {
    const { barberId } = req.params as BarberParams;
    const { date, catalogId } = req.query as AvailabilityQuery;
    res.json(await barbersService.getAvailability(barberId, date, catalogId));
  },

  async getWorkingHours(req: Request, res: Response) {
    const { barberId } = req.params as BarberParams;
    res.json(await barbersService.getWorkingHours(barberId));
  },

  async replaceWorkingHours(req: Request, res: Response) {
    const { barberId } = req.params as BarberParams;
    res.json(await barbersService.replaceWorkingHours(barberId, req.body as WorkingHoursInput));
  },

  async listTimeOffs(req: Request, res: Response) {
    const { barberId } = req.params as BarberParams;
    res.json(await barbersService.listTimeOffs(getAuthUser(req), barberId));
  },

  async createTimeOff(req: Request, res: Response) {
    const { barberId } = req.params as BarberParams;
    const timeOff = await barbersService.createTimeOff(getAuthUser(req), barberId, req.body as CreateTimeOffInput);
    res.status(201).json(timeOff);
  },

  async deleteTimeOff(req: Request, res: Response) {
    const { barberId, timeOffId } = req.params as TimeOffParams;
    await barbersService.deleteTimeOff(getAuthUser(req), barberId, timeOffId);
    res.status(204).end();
  },
};

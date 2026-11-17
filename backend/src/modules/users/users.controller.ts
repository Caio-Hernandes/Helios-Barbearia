import type { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { usersService } from './users.service';
import type { CreateUserInput, ListUsersQuery } from './users.schemas';

export const usersController = {
  async createEmployee(req: Request, res: Response) {
    const user = await usersService.create(req.body as CreateUserInput, Role.EMPLOYEE);
    res.status(201).json(user);
  },

  async list(req: Request, res: Response) {
    const { role } = req.query as ListUsersQuery;
    res.json(await usersService.list(role));
  },
};

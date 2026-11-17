import { Role } from '@prisma/client';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error';
import { hashPassword } from '../../shared/security/password';
import { usersRepository } from './users.repository';
import type { CreateUserInput } from './users.schemas';

export const usersService = {
  async create(input: CreateUserInput, role: Role) {
    if (await usersRepository.existsByEmail(input.email)) {
      throw new ConflictError('E-mail já cadastrado.');
    }

    const { password, ...data } = input;
    return usersRepository.create({ ...data, role, passwordHash: await hashPassword(password) });
  },

  async getById(id: string) {
    const user = await usersRepository.findById(id);
    if (!user) throw new NotFoundError('Usuário não encontrado.');
    return user;
  },

  list(role?: Role) {
    return usersRepository.list(role);
  },
};

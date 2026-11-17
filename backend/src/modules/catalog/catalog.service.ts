import { Role } from '@prisma/client';
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '../../shared/errors/app-error';
import { catalogRepository } from './catalog.repository';
import type { CreateCatalogInput, UpdateCatalogInput } from './catalog.schemas';

type Actor = { id: string; role: Role };

export const catalogService = {
  /** Lista pública; itens inativos só para o dono (pedir sem permissão é erro, não é ignorado). */
  list(actor: Actor | undefined, includeInactive: boolean) {
    if (includeInactive) {
      if (!actor) throw new UnauthorizedError('Faça login como dono para ver itens inativos.');
      if (actor.role !== Role.OWNER) throw new ForbiddenError('Apenas o dono pode ver itens inativos.');
    }
    return catalogRepository.list(includeInactive);
  },

  async create(input: CreateCatalogInput) {
    if (await catalogRepository.findByName(input.name)) {
      throw new ConflictError('Já existe um serviço com esse nome.');
    }
    return catalogRepository.create(input);
  },

  async update(id: string, input: UpdateCatalogInput) {
    if (!(await catalogRepository.findById(id))) {
      throw new NotFoundError('Serviço não encontrado.');
    }
    if (input.name) {
      const sameName = await catalogRepository.findByName(input.name);
      if (sameName && sameName.id !== id) throw new ConflictError('Já existe um serviço com esse nome.');
    }
    // Agendamentos existentes guardam o próprio preço e horário de fim, então não são afetados.
    return catalogRepository.update(id, input);
  },
};

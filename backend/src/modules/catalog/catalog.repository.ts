import type { Prisma } from '@prisma/client';
import { prisma } from '../../shared/database/prisma';

export const catalogRepository = {
  list(includeInactive = false) {
    return prisma.catalog.findMany({
      where: includeInactive ? undefined : { active: true },
      orderBy: [{ priceCents: 'asc' }, { durationMinutes: 'asc' }],
    });
  },

  findById(id: string) {
    return prisma.catalog.findUnique({ where: { id } });
  },

  findActiveById(id: string) {
    return prisma.catalog.findFirst({ where: { id, active: true } });
  },

  findByName(name: string) {
    return prisma.catalog.findUnique({ where: { name } });
  },

  create(data: Prisma.CatalogCreateInput) {
    return prisma.catalog.create({ data });
  },

  update(id: string, data: Prisma.CatalogUpdateInput) {
    return prisma.catalog.update({ where: { id }, data });
  },
};

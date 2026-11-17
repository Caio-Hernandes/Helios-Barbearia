import { Prisma, Role } from '@prisma/client';
import { prisma } from '../../shared/database/prisma';
import { BARBER_ROLES } from '../../shared/constants/roles';

/** Campos seguros para devolver na API (nunca o passwordHash). */
export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

export const usersRepository = {
  /** Inclui passwordHash: use só para autenticação. */
  findByEmailWithPassword(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  existsByEmail(email: string) {
    return prisma.user.count({ where: { email } }).then((count) => count > 0);
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id }, select: publicUserSelect });
  },

  create(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data, select: publicUserSelect });
  },

  list(role?: Role) {
    return prisma.user.findMany({
      where: role ? { role } : undefined,
      select: publicUserSelect,
      orderBy: { name: 'asc' },
    });
  },

  listBarbers() {
    return prisma.user.findMany({
      where: { role: { in: BARBER_ROLES } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  },

  findBarberById(id: string) {
    return prisma.user.findFirst({
      where: { id, role: { in: BARBER_ROLES } },
      select: { id: true, name: true },
    });
  },
};

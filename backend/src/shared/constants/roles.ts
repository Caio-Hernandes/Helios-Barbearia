import { Role } from '@prisma/client';

/** Papéis que atendem clientes (Hélio, o dono, também corta cabelo). */
export const BARBER_ROLES: Role[] = [Role.EMPLOYEE, Role.OWNER];

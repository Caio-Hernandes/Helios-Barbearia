import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/** Senha de todos os usuários de teste. Troque antes de qualquer uso real. */
const SEED_PASSWORD = 'Helios@2026';

const catalog = [
  { name: 'Barba', priceCents: 5000, durationMinutes: 30 },
  { name: 'Corte na tesoura', priceCents: 5000, durationMinutes: 45 },
  { name: 'Corte na máquina', priceCents: 5000, durationMinutes: 30 },
  { name: 'Corte na tesoura e Barba', priceCents: 8000, durationMinutes: 75 },
  { name: 'Corte na máquina e Barba', priceCents: 8000, durationMinutes: 60 },
];

const users = [
  { name: 'Hélio', email: 'helio@helios.test', phone: '11999990000', role: Role.OWNER },
  { name: 'Rafael', email: 'rafael@helios.test', phone: '11999990001', role: Role.EMPLOYEE },
  { name: 'Bruno', email: 'bruno@helios.test', phone: '11999990002', role: Role.EMPLOYEE },
  { name: 'Cliente Teste', email: 'cliente@helios.test', phone: '11988880000', role: Role.CLIENT },
];

/** Terça a sábado, com pausa de almoço. 0 = domingo ... 6 = sábado */
const WORK_DAYS = [2, 3, 4, 5, 6];
const SHIFTS = [
  { startTime: '09:00', endTime: '12:00' },
  { startTime: '13:00', endTime: '19:00' },
];

async function main() {
  for (const item of catalog) {
    await prisma.catalog.upsert({ where: { name: item.name }, update: item, create: item });
  }
  console.log(`✔ ${catalog.length} itens no catálogo`);

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  for (const user of users) {
    const saved = await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, phone: user.phone, role: user.role },
      create: { ...user, passwordHash },
    });

    if (user.role !== Role.CLIENT) {
      await prisma.workingHours.deleteMany({ where: { barberId: saved.id } });
      await prisma.workingHours.createMany({
        data: WORK_DAYS.flatMap((weekday) => SHIFTS.map((shift) => ({ ...shift, weekday, barberId: saved.id }))),
      });
    }
  }
  console.log(`✔ ${users.length} usuários (senha: ${SEED_PASSWORD}) e expedientes ter–sáb 09–12h / 13–19h`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

/**
 * Dados de demonstração: clientes fictícios e um movimento realista de agendamentos
 * (histórico passado + horários marcados), para apresentações e prints.
 *
 *   npm run db:seed:demo                 -> cria ~100 agendamentos
 *   npm run db:seed:demo -- 150          -> quantidade aproximada
 *
 * Respeita o expediente de cada barbeiro, a grade de 15 min e não sobrepõe horários
 * do mesmo barbeiro nem do mesmo cliente. NÃO apaga agendamentos existentes: os
 * horários já ocupados são considerados e evitados.
 * Rode antes o seed principal (npm run db:seed): ele cria serviços, barbeiros e expedientes.
 */
import { AppointmentStatus, PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();

const TIMEZONE = 'America/Sao_Paulo';
const STEP = 15;
const PAST_DAYS = 45;
const FUTURE_DAYS = 21;
const MIN_LEAD_MINUTES = 60;
/** Mesma senha do seed principal, para dar para entrar como qualquer cliente fictício. */
const DEMO_PASSWORD = 'Helios@2026';

const DEMO_CLIENTS = [
  'Marcos Oliveira',
  'Pedro Henrique Alves',
  'Lucas Ferreira',
  'André Costa',
  'Felipe Rocha',
  'Gustavo Lima',
  'Rodrigo Martins',
  'Thiago Ribeiro',
  'Bruno Carvalho',
  'Eduardo Santos',
  'Vinícius Almeida',
  'Leonardo Gomes',
];

const NOTES = [
  'Degradê baixo, por favor',
  'Barba desenhada',
  'Só aparar as pontas',
  'Primeira vez na barbearia',
  'Prefiro máquina 2 nas laterais',
  'Pode usar navalha no acabamento',
  'Chego uns 5 min antes',
];

/** Gerador pseudoaleatório com semente: o mesmo resultado a cada execução. */
function createRandom(seed: number) {
  let state = seed;
  const next = () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: T[]): T => items[Math.floor(next() * items.length)],
    chance: (p: number) => next() < p,
  };
}

type Interval = { start: number; end: number };
const overlaps = (list: Interval[], it: Interval) => list.some((o) => it.start < o.end && o.start < it.end);

const slug = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '.');

async function main() {
  const target = Number(process.argv[2]) || 100;
  const random = createRandom(20261117);

  const [barbers, catalog, workingHours] = await Promise.all([
    prisma.user.findMany({ where: { role: { in: [Role.EMPLOYEE, Role.OWNER] } }, orderBy: { name: 'asc' } }),
    prisma.catalog.findMany({ where: { active: true } }),
    prisma.workingHours.findMany(),
  ]);
  if (!barbers.length || !catalog.length || !workingHours.length) {
    throw new Error('Faltam barbeiros, serviços ou expedientes. Rode antes: npm run db:seed');
  }

  // Clientes fictícios (idempotente) + o cliente de teste do seed principal
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const demoClients = [];
  for (const [i, name] of DEMO_CLIENTS.entries()) {
    const email = `${slug(name)}@demo.helios.test`;
    demoClients.push(
      await prisma.user.upsert({
        where: { email },
        update: {},
        create: { name, email, phone: `1198${String(1000000 + i * 7919).slice(0, 7)}`, passwordHash, role: Role.CLIENT },
      }),
    );
  }
  const testClient = await prisma.user.findUnique({ where: { email: 'cliente@helios.test' } });
  // O cliente de teste aparece com mais frequência (bom para os prints da visão do cliente)
  const clientPool = testClient ? [...demoClients, testClient, testClient] : demoClients;

  // Horários já ocupados, para não criar sobreposição com o que existe
  const now = DateTime.now().setZone(TIMEZONE);
  const from = now.minus({ days: PAST_DAYS }).startOf('day');
  const to = now.plus({ days: FUTURE_DAYS }).endOf('day');
  const existing = await prisma.appointment.findMany({
    where: { startsAt: { gte: from.toJSDate(), lte: to.toJSDate() }, status: { not: AppointmentStatus.CANCELED } },
    select: { barberId: true, clientId: true, startsAt: true, endsAt: true },
  });
  const busyBarber = new Map<string, Interval[]>();
  const busyClient = new Map<string, Interval[]>();
  const mark = (map: Map<string, Interval[]>, key: string, it: Interval) => map.set(key, [...(map.get(key) ?? []), it]);
  existing.forEach((a) => {
    const it = { start: a.startsAt.getTime(), end: a.endsAt.getTime() };
    mark(busyBarber, a.barberId, it);
    mark(busyClient, a.clientId, it);
  });

  // Quantos agendamentos por barbeiro/dia, calibrado para chegar perto do alvo
  const workDays: DateTime[] = [];
  for (let d = from; d <= to; d = d.plus({ days: 1 })) {
    if (workingHours.some((w) => w.weekday === d.weekday % 7)) workDays.push(d);
  }
  const perBarberDay = target / (workDays.length * barbers.length);

  const rows = [];
  for (const day of workDays) {
    const isFuture = day.startOf('day') > now.startOf('day');
    for (const barber of barbers) {
      // Futuro um pouco mais vazio que o passado, como numa agenda real
      const expected = perBarberDay * (isFuture ? 0.75 : 1.15);
      const count = Math.floor(expected) + (random.chance(expected % 1) ? 1 : 0);
      const shifts = workingHours
        .filter((w) => w.barberId === barber.id && w.weekday === day.weekday % 7)
        .map((w) => {
          const [sh, sm] = w.startTime.split(':').map(Number);
          const [eh, em] = w.endTime.split(':').map(Number);
          return { start: day.set({ hour: sh, minute: sm }), end: day.set({ hour: eh, minute: em }) };
        });

      for (let n = 0, attempts = 0; n < count && attempts < 40; attempts++) {
        const shift = random.pick(shifts);
        if (!shift) break;
        const item = random.pick(catalog);
        const slots = Math.floor((shift.end.diff(shift.start, 'minutes').minutes - item.durationMinutes) / STEP);
        if (slots < 0) continue;
        const start = shift.start.plus({ minutes: random.int(0, slots) * STEP });
        const end = start.plus({ minutes: item.durationMinutes });
        const it = { start: start.toMillis(), end: end.toMillis() };

        // Futuro só a partir de agora + antecedência mínima; passado só até agora
        const upcoming = start > now;
        if (upcoming && start < now.plus({ minutes: MIN_LEAD_MINUTES })) continue;
        if (!upcoming && end > now) continue;
        if (overlaps(busyBarber.get(barber.id) ?? [], it)) continue;

        const client = random.pick(clientPool);
        if (overlaps(busyClient.get(client.id) ?? [], it)) continue;

        let status: AppointmentStatus = AppointmentStatus.SCHEDULED;
        let autoCompleted = false;
        if (!upcoming) {
          const roll = random.next();
          status =
            roll < 0.08 ? AppointmentStatus.NO_SHOW : roll < 0.15 ? AppointmentStatus.CANCELED : AppointmentStatus.COMPLETED;
          autoCompleted = status === AppointmentStatus.COMPLETED && random.chance(0.15);
        } else if (random.chance(0.06)) {
          status = AppointmentStatus.CANCELED;
        }

        rows.push({
          clientId: client.id,
          barberId: barber.id,
          catalogId: item.id,
          startsAt: start.toJSDate(),
          endsAt: end.toJSDate(),
          priceCents: item.priceCents,
          status,
          autoCompleted,
          notes: random.chance(0.3) ? random.pick(NOTES) : null,
          canceledAt: status === AppointmentStatus.CANCELED ? start.minus({ hours: random.int(2, 48) }).toJSDate() : null,
        });
        // Cancelados não ocupam a agenda
        if (status !== AppointmentStatus.CANCELED) {
          mark(busyBarber, barber.id, it);
          mark(busyClient, client.id, it);
        }
        n++;
      }
    }
  }

  await prisma.appointment.createMany({ data: rows });

  const byStatus = rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});
  const future = rows.filter((r) => r.startsAt > now.toJSDate()).length;
  console.log(`✔ ${demoClients.length} clientes fictícios (senha: ${DEMO_PASSWORD})`);
  console.log(`✔ ${rows.length} agendamentos: ${rows.length - future} passados e ${future} futuros`, byStatus);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

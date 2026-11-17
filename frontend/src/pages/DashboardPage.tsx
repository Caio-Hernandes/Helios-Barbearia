import { useMemo, useState } from 'react';
import { EmptyState, ErrorAlert, Spinner } from '../components/ui/Feedback';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useAsync } from '../hooks/useAsync';
import { appointmentsService } from '../services/appointments.service';
import { usersService } from '../services/users.service';
import type { Appointment, AppointmentStatus } from '../types';
import { addDays, formatCurrency, formatDate, formatTime, statusLabel, todayLocalDate } from '../utils/format';
import styles from './DashboardPage.module.css';

const PERIODS = [7, 30, 90] as const;
type Period = (typeof PERIODS)[number];

const STATUS_ORDER: AppointmentStatus[] = ['COMPLETED', 'SCHEDULED', 'NO_SHOW', 'CANCELED'];
const STATUS_COLOR: Record<AppointmentStatus, string> = {
  COMPLETED: 'var(--chart-1)',
  SCHEDULED: 'var(--chart-2)',
  NO_SHOW: 'var(--chart-3)',
  CANCELED: 'var(--text-subtle)',
};

const percent = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);

/** Indicadores básicos para o dono: atendimentos, faturamento, profissionais, serviços e clientes. */
export function DashboardPage() {
  const [period, setPeriod] = useState<Period>(30);
  const today = todayLocalDate();
  const from = addDays(today, -(period - 1));

  const appointments = useAsync(() => appointmentsService.list({ from, to: today }), [from, today]);
  const clients = useAsync(() => usersService.list('CLIENT'), []);

  const stats = useMemo(() => computeStats(appointments.data ?? []), [appointments.data]);

  return (
    <div className="page">
      <PageHeader
        title="Painel"
        description="Visão geral dos atendimentos, profissionais e serviços."
        actions={
          <div className={styles.periods} role="group" aria-label="Período">
            {PERIODS.map((p) => (
              <button key={p} type="button" className="chip" aria-pressed={p === period} onClick={() => setPeriod(p)}>
                {p} dias
              </button>
            ))}
          </div>
        }
      />

      {appointments.error && <ErrorAlert message={appointments.error} />}
      {appointments.loading && !appointments.data && <Spinner />}

      {appointments.data && (
        <>
          <div className={styles.kpis}>
            <Kpi label="Atendimentos concluídos" value={String(stats.completed.length)} />
            <Kpi label="Faturamento" value={formatCurrency(stats.revenue)} />
            <Kpi label="Ticket médio" value={formatCurrency(stats.avgTicket)} />
            <Kpi label="Clientes atendidos" value={String(stats.uniqueClients)} hint={`${clients.data?.length ?? '–'} cadastrados`} />
            <Kpi label="Taxa de faltas" value={`${stats.noShowRate}%`} hint={`${stats.byStatus.NO_SHOW} faltas`} />
            <Kpi label="Cancelamentos" value={String(stats.byStatus.CANCELED)} />
          </div>

          {stats.total === 0 ? (
            <div className="card">
              <EmptyState
                title="Sem atendimentos no período"
                description="Os indicadores aparecem conforme os clientes agendam e os atendimentos são concluídos."
              />
            </div>
          ) : (
            <div className={styles.grid}>
              <section className="card">
                <h2 className="section-title">Por profissional</h2>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Profissional</th>
                        <th>Concluídos</th>
                        <th>Faturamento</th>
                        <th>Faltas</th>
                        <th className={styles.shareCol}>Participação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.byBarber.map((b) => (
                        <tr key={b.name}>
                          <td>{b.name}</td>
                          <td>{b.completed}</td>
                          <td>{formatCurrency(b.revenue)}</td>
                          <td>{b.noShow}</td>
                          <td className={styles.shareCol}>
                            <Bar value={percent(b.completed, stats.completed.length)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="card">
                <h2 className="section-title">Serviços mais pedidos</h2>
                <ul className={styles.barList}>
                  {stats.byService.map((s, i) => (
                    <li key={s.name}>
                      <div className={styles.barLabel}>
                        <span>{s.name}</span>
                        <span className="muted">
                          {s.count} · {percent(s.count, stats.booked)}%
                        </span>
                      </div>
                      <Bar value={percent(s.count, stats.booked)} color={`var(--chart-${(i % 5) + 1})`} />
                    </li>
                  ))}
                </ul>
              </section>

              <section className="card">
                <h2 className="section-title">Status dos agendamentos</h2>
                <div className={styles.stacked} role="img" aria-label="Proporção por status">
                  {STATUS_ORDER.filter((s) => stats.byStatus[s] > 0).map((s) => (
                    <span
                      key={s}
                      style={{ width: `${(stats.byStatus[s] / stats.total) * 100}%`, background: STATUS_COLOR[s] }}
                      title={`${statusLabel[s]}: ${stats.byStatus[s]}`}
                    />
                  ))}
                </div>
                <ul className={styles.legend}>
                  {STATUS_ORDER.map((s) => (
                    <li key={s}>
                      <i style={{ background: STATUS_COLOR[s] }} />
                      {statusLabel[s]}
                      <strong>
                        {stats.byStatus[s]} ({percent(stats.byStatus[s], stats.total)}%)
                      </strong>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="card">
                <h2 className="section-title">Clientes mais frequentes</h2>
                {stats.topClients.length === 0 ? (
                  <p className="muted">Nenhum atendimento concluído no período.</p>
                ) : (
                  <ol className={styles.ranking}>
                    {stats.topClients.map((c) => (
                      <li key={c.name}>
                        <span>{c.name}</span>
                        <span className="muted">
                          {c.visits} {c.visits === 1 ? 'visita' : 'visitas'} · {formatCurrency(c.spent)}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section className={`card ${styles.full}`}>
                <h2 className="section-title">Histórico recente</h2>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Cliente</th>
                        <th>Serviço</th>
                        <th>Profissional</th>
                        <th>Valor</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recent.map((a) => (
                        <tr key={a.id}>
                          <td>
                            {formatDate(a.startsAt)} <span className="muted">{formatTime(a.startsAt)}</span>
                          </td>
                          <td>{a.client.name}</td>
                          <td>{a.catalog.name}</td>
                          <td>{a.barber.name}</td>
                          <td>{formatCurrency(a.priceCents)}</td>
                          <td>
                            <StatusBadge status={a.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={styles.kpi}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}

function Bar({ value, color = 'var(--chart-1)' }: { value: number; color?: string }) {
  return (
    <div className={styles.bar} aria-label={`${value}%`}>
      <span style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

function computeStats(list: Appointment[]) {
  const byStatus: Record<AppointmentStatus, number> = { SCHEDULED: 0, COMPLETED: 0, CANCELED: 0, NO_SHOW: 0 };
  list.forEach((a) => (byStatus[a.status] += 1));

  const completed = list.filter((a) => a.status === 'COMPLETED');
  const revenue = completed.reduce((sum, a) => sum + a.priceCents, 0);
  const notCanceled = list.filter((a) => a.status !== 'CANCELED');

  const barbers = new Map<string, { name: string; completed: number; revenue: number; noShow: number }>();
  for (const a of list) {
    const b = barbers.get(a.barberId) ?? { name: a.barber.name, completed: 0, revenue: 0, noShow: 0 };
    if (a.status === 'COMPLETED') {
      b.completed += 1;
      b.revenue += a.priceCents;
    }
    if (a.status === 'NO_SHOW') b.noShow += 1;
    barbers.set(a.barberId, b);
  }

  const services = new Map<string, number>();
  notCanceled.forEach((a) => services.set(a.catalog.name, (services.get(a.catalog.name) ?? 0) + 1));

  const clients = new Map<string, { name: string; visits: number; spent: number }>();
  for (const a of completed) {
    const c = clients.get(a.clientId) ?? { name: a.client.name, visits: 0, spent: 0 };
    c.visits += 1;
    c.spent += a.priceCents;
    clients.set(a.clientId, c);
  }

  const attended = byStatus.COMPLETED + byStatus.NO_SHOW;

  return {
    total: list.length,
    booked: notCanceled.length,
    byStatus,
    completed,
    revenue,
    avgTicket: completed.length ? Math.round(revenue / completed.length) : 0,
    uniqueClients: clients.size,
    noShowRate: percent(byStatus.NO_SHOW, attended),
    byBarber: [...barbers.values()].sort((a, b) => b.completed - a.completed || a.name.localeCompare(b.name)),
    byService: [...services.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    topClients: [...clients.values()].sort((a, b) => b.visits - a.visits || b.spent - a.spent).slice(0, 5),
    recent: [...list].sort((a, b) => b.startsAt.localeCompare(a.startsAt)).slice(0, 10),
  };
}

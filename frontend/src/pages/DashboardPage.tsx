import { X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ColumnChart } from '../components/charts/ColumnChart';
import { EmptyState, ErrorAlert, Spinner } from '../components/ui/Feedback';
import { PageHeader } from '../components/ui/PageHeader';
import { PeriodFilter } from '../components/ui/PeriodFilter';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useAsync } from '../hooks/useAsync';
import { useNow } from '../hooks/useNow';
import { usePeriod, type PeriodPreset } from '../hooks/usePeriod';
import { appointmentsService } from '../services/appointments.service';
import { barbersService } from '../services/barbers.service';
import { catalogService } from '../services/catalog.service';
import { usersService } from '../services/users.service';
import type { Appointment, AppointmentStatus } from '../types';
import {
  byHourOfDay,
  byWeekday,
  completedOverTime,
  computeStats,
  formatBooked,
  formatCompleted,
  percent,
} from '../utils/dashboardStats';
import { lastDays, monthOf } from '../utils/dateRanges';
import { addDays, formatCurrency, formatDate, formatTime, statusLabel, todayLocalDate } from '../utils/format';
import styles from './DashboardPage.module.css';

const PERIODS: PeriodPreset[] = [
  { key: '7', label: '7 dias', range: () => lastDays(7) },
  { key: '30', label: '30 dias', range: () => lastDays(30) },
  { key: '90', label: '90 dias', range: () => lastDays(90) },
  { key: 'month', label: 'Este mês', range: () => monthOf(todayLocalDate()) },
];

/** Até quantos dias à frente o painel mostra os próximos agendamentos. */
const UPCOMING_DAYS = 60;
const HISTORY_ROWS = 20;

const STATUS_ORDER: AppointmentStatus[] = ['COMPLETED', 'SCHEDULED', 'NO_SHOW', 'CANCELED'];
const STATUS_COLOR: Record<AppointmentStatus, string> = {
  COMPLETED: 'var(--chart-1)',
  SCHEDULED: 'var(--chart-2)',
  NO_SHOW: 'var(--chart-3)',
  CANCELED: 'var(--text-subtle)',
};

interface Filters {
  barberId: string;
  catalogId: string;
  clientId: string;
}
const NO_FILTERS: Filters = { barberId: '', catalogId: '', clientId: '' };

const matches = (a: Appointment, f: Filters) =>
  (!f.barberId || a.barberId === f.barberId) &&
  (!f.catalogId || a.catalogId === f.catalogId) &&
  (!f.clientId || a.clientId === f.clientId);

/** Indicadores para o dono: atendimentos, faturamento, profissionais, serviços e clientes. */
export function DashboardPage() {
  const period = usePeriod(PERIODS, '30');
  const { from, to } = period.range;
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const now = useNow();
  const today = todayLocalDate();

  // Histórico do período (o que já aconteceu) e próximos agendamentos (o que vem pela frente)
  const appointments = useAsync(() => appointmentsService.list({ from, to }), [from, to]);
  const upcomingQuery = useAsync(
    () => appointmentsService.list({ from: today, to: addDays(today, UPCOMING_DAYS), status: 'SCHEDULED' }),
    [today],
  );
  const barbers = useAsync(() => barbersService.list(), []);
  const catalog = useAsync(() => catalogService.list(), []);
  const clients = useAsync(() => usersService.list('CLIENT'), []);

  // Os filtros valem para tudo abaixo deles: indicadores, gráficos e tabelas
  const past = useMemo(
    () => (appointments.data ?? []).filter((a) => new Date(a.startsAt).getTime() < now && matches(a, filters)),
    [appointments.data, now, filters],
  );
  const upcoming = useMemo(
    () => (upcomingQuery.data ?? []).filter((a) => new Date(a.startsAt).getTime() >= now && matches(a, filters)),
    [upcomingQuery.data, now, filters],
  );

  const stats = useMemo(() => computeStats(past), [past]);
  const historyEnd = to && to < today ? to : today;
  const overTime = useMemo(() => (from ? completedOverTime(past, from, historyEnd) : []), [past, from, historyEnd]);
  const peakHours = useMemo(() => byHourOfDay(past), [past]);
  const weekdays = useMemo(() => byWeekday(past), [past]);
  const upcomingValue = upcoming.reduce((sum, a) => sum + a.priceCents, 0);
  // Status considera o período e também os próximos agendamentos (por isso fica fora do histórico)
  const statusCounts = useMemo(() => countByStatus([...past, ...upcoming]), [past, upcoming]);

  const hasFilters = filters.barberId || filters.catalogId || filters.clientId;
  const setFilter = (key: keyof Filters) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    setFilters((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="page">
      <PageHeader title="Painel" description="Visão geral dos atendimentos, profissionais e serviços." />

      {/* Filtros: uma fileira acima de tudo que eles afetam */}
      <div className={styles.filters}>
        <PeriodFilter period={period} />
        <div className={styles.selects}>
          <select className={`input ${styles.select}`} value={filters.barberId} onChange={setFilter('barberId')} aria-label="Profissional">
            <option value="">Todos os profissionais</option>
            {barbers.data?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select className={`input ${styles.select}`} value={filters.catalogId} onChange={setFilter('catalogId')} aria-label="Serviço">
            <option value="">Todos os serviços</option>
            {catalog.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select className={`input ${styles.select}`} value={filters.clientId} onChange={setFilter('clientId')} aria-label="Cliente">
            <option value="">Todos os clientes</option>
            {clients.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.email}
              </option>
            ))}
          </select>
          {hasFilters && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFilters(NO_FILTERS)}>
              <X size={16} /> Limpar filtros
            </button>
          )}
        </div>
      </div>

      {appointments.error && <ErrorAlert message={appointments.error} />}
      {appointments.loading && !appointments.data && <Spinner />}

      {appointments.data && (
        // Ao trocar o período, mantém o conteúdo anterior esmaecido em vez de piscar
        <div className={`${styles.content} ${appointments.loading ? styles.refreshing : ''}`}>
          <div className={styles.kpis}>
            <Kpi label="Atendimentos concluídos" value={String(stats.completed.length)} />
            <Kpi label="Faturamento" value={formatCurrency(stats.revenue)} />
            <Kpi label="Ticket médio" value={formatCurrency(stats.avgTicket)} />
            <Kpi label="Clientes atendidos" value={String(stats.uniqueClients)} hint={`${clients.data?.length ?? '–'} cadastrados`} />
            <Kpi
              label="Taxa de faltas"
              value={`${stats.noShowRate}%`}
              hint={`${stats.byStatus.NO_SHOW} faltas · ${stats.byStatus.CANCELED} cancelamentos`}
            />
            <Kpi label="Próximos agendamentos" value={String(upcoming.length)} hint={`${formatCurrency(upcomingValue)} previstos`} />
          </div>

          <section className={`card ${styles.section}`}>
            <div className={styles.sectionHeader}>
              <h2 className="section-title">Atendimentos concluídos ao longo do tempo</h2>
              <span className="muted">passe o mouse ou toque numa coluna para ver o faturamento</span>
            </div>
            {stats.total === 0 ? (
              <p className="muted">Nenhum atendimento no período com esses filtros.</p>
            ) : (
              <ColumnChart data={overTime} ariaLabel="Atendimentos concluídos por dia" formatValue={formatCompleted} />
            )}
          </section>

          <div className={styles.grid}>
            <section className={`card ${styles.section}`}>
              <h2 className="section-title">Horários de pico</h2>
              {stats.booked === 0 ? (
                <p className="muted">Sem agendamentos no período.</p>
              ) : (
                <ColumnChart data={peakHours} ariaLabel="Agendamentos por hora de início" formatValue={formatBooked} height={180} />
              )}
            </section>
            <section className={`card ${styles.section}`}>
              <h2 className="section-title">Movimento por dia da semana</h2>
              {stats.booked === 0 ? (
                <p className="muted">Sem agendamentos no período.</p>
              ) : (
                <ColumnChart data={weekdays} ariaLabel="Agendamentos por dia da semana" formatValue={formatBooked} height={180} />
              )}
            </section>
          </div>

          <section className={`card ${styles.section}`}>
            <div className={styles.sectionHeader}>
              <h2 className="section-title">Próximos agendamentos</h2>
              <span className="muted">próximos {UPCOMING_DAYS} dias</span>
            </div>
            {upcomingQuery.error && <ErrorAlert message={upcomingQuery.error} />}
            {upcomingQuery.data && upcoming.length === 0 && <p className="muted">Nenhum horário marcado com esses filtros.</p>}
            {upcoming.length > 0 && (
              <AppointmentsTable appointments={upcoming} limit={HISTORY_ROWS} showStatus={false} />
            )}
          </section>

          <StatusCard counts={statusCounts} />

          {stats.total === 0 ? (
            <div className="card">
              <EmptyState
                title="Sem histórico no período"
                description="Os indicadores mostram o que já aconteceu. Os horários futuros aparecem em Próximos agendamentos."
              />
            </div>
          ) : (
            <div className={styles.grid}>
              <section className={`card ${styles.section}`}>
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

              <section className={`card ${styles.section}`}>
                <h2 className="section-title">Serviços mais pedidos</h2>
                <ul className={styles.barList}>
                  {stats.byService.map((s) => (
                    <li key={s.name}>
                      <div className={styles.barLabel}>
                        <span>{s.name}</span>
                        <span className="muted">
                          {s.count} · {percent(s.count, stats.booked)}%
                        </span>
                      </div>
                      <Bar value={percent(s.count, stats.booked)} />
                    </li>
                  ))}
                </ul>
              </section>

              <section className={`card ${styles.section}`}>
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

              <section className={`card ${styles.section} ${styles.full}`}>
                <div className={styles.sectionHeader}>
                  <h2 className="section-title">Histórico do período</h2>
                  <span className="muted">{formatBooked(stats.total)}</span>
                </div>
                <AppointmentsTable appointments={stats.history} limit={HISTORY_ROWS} showStatus />
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function countByStatus(list: Appointment[]): Record<AppointmentStatus, number> {
  const counts: Record<AppointmentStatus, number> = { SCHEDULED: 0, COMPLETED: 0, CANCELED: 0, NO_SHOW: 0 };
  list.forEach((a) => (counts[a.status] += 1));
  return counts;
}

/** Proporção por status: histórico do período + próximos agendamentos. */
function StatusCard({ counts }: { counts: Record<AppointmentStatus, number> }) {
  const total = STATUS_ORDER.reduce((sum, s) => sum + counts[s], 0);
  return (
    <section className={`card ${styles.section}`}>
      <div className={styles.sectionHeader}>
        <h2 className="section-title">Status dos agendamentos</h2>
        <span className="muted">período selecionado + próximos agendamentos</span>
      </div>
      {total === 0 ? (
        <p className="muted">Nenhum agendamento com esses filtros.</p>
      ) : (
        <>
          <div className={styles.stacked} role="img" aria-label="Proporção por status">
            {STATUS_ORDER.filter((s) => counts[s] > 0).map((s) => (
              <span
                key={s}
                style={{ width: `${(counts[s] / total) * 100}%`, background: STATUS_COLOR[s] }}
                title={`${statusLabel[s]}: ${counts[s]}`}
              />
            ))}
          </div>
          <ul className={styles.legend}>
            {STATUS_ORDER.map((s) => (
              <li key={s}>
                <i style={{ background: STATUS_COLOR[s] }} />
                {statusLabel[s]}
                <strong>
                  {counts[s]} ({percent(counts[s], total)}%)
                </strong>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function AppointmentsTable({ appointments, limit, showStatus }: { appointments: Appointment[]; limit: number; showStatus: boolean }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Data</th>
            <th>Cliente</th>
            <th>Serviço</th>
            <th>Profissional</th>
            <th>Valor</th>
            {showStatus && <th>Status</th>}
          </tr>
        </thead>
        <tbody>
          {appointments.slice(0, limit).map((a) => (
            <tr key={a.id}>
              <td>
                {formatDate(a.startsAt)} <span className="muted">{formatTime(a.startsAt)}</span>
              </td>
              <td>{a.client.name}</td>
              <td>{a.catalog.name}</td>
              <td>{a.barber.name}</td>
              <td>{formatCurrency(a.priceCents)}</td>
              {showStatus && (
                <td>
                  <StatusBadge status={a.status} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {appointments.length > limit && <p className={`muted ${styles.more}`}>e mais {appointments.length - limit}.</p>}
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

/** Barra de proporção numa cor só (barras ranqueadas não ganham uma cor por item). */
function Bar({ value }: { value: number }) {
  return (
    <div className={styles.bar} aria-label={`${value}%`}>
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

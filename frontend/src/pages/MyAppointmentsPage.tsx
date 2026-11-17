import { CalendarPlus, Clock, Scissors, StickyNote, User } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { EmptyState, ErrorAlert, Spinner } from '../components/ui/Feedback';
import { PeriodFilter } from '../components/ui/PeriodFilter';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { CLIENT_CANCEL_LIMIT_MINUTES } from '../config';
import { useAsync } from '../hooks/useAsync';
import { useNow } from '../hooks/useNow';
import { usePeriod, type PeriodPreset } from '../hooks/usePeriod';
import { appointmentsService } from '../services/appointments.service';
import { errorMessage } from '../services/http';
import type { Appointment } from '../types';
import { isInRange, monthOf, weekOf } from '../utils/dateRanges';
import { formatCurrency, formatLongDate, formatTime, toLocalDate, todayLocalDate } from '../utils/format';
import styles from './MyAppointmentsPage.module.css';

type Tab = 'upcoming' | 'history';

const PERIODS: PeriodPreset[] = [
  { key: 'all', label: 'Qualquer data', range: () => ({}) },
  { key: 'today', label: 'Hoje', range: () => ({ from: todayLocalDate(), to: todayLocalDate() }) },
  { key: 'week', label: 'Esta semana', range: () => weekOf(todayLocalDate()) },
  { key: 'month', label: 'Este mês', range: () => monthOf(todayLocalDate()) },
];

export function MyAppointmentsPage() {
  const { data, loading, error, reload } = useAsync(() => appointmentsService.list(), []);
  const now = useNow();
  const [tab, setTab] = useState<Tab>('upcoming');
  const period = usePeriod(PERIODS, 'all');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { upcoming, history } = useMemo(() => {
    const all = (data ?? []).filter((a) => isInRange(toLocalDate(a.startsAt), period.range));
    const isUpcoming = (a: Appointment) => a.status === 'SCHEDULED' && new Date(a.endsAt).getTime() >= now;
    return {
      upcoming: all.filter(isUpcoming),
      history: all.filter((a) => !isUpcoming(a)).reverse(),
    };
  }, [data, now, period.range]);

  const list = tab === 'upcoming' ? upcoming : history;

  async function cancel(id: string) {
    setBusyId(id);
    setActionError(null);
    try {
      await appointmentsService.cancel(id);
      setConfirmingId(null);
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Meus agendamentos"
        description="Acompanhe seus próximos horários e o histórico de atendimentos."
        actions={
          <Link to="/agendar" className="btn btn-primary">
            <CalendarPlus size={18} /> Novo agendamento
          </Link>
        }
      />

      <div className={styles.toolbar}>
        <div className={styles.tabs} role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'upcoming'} onClick={() => setTab('upcoming')}>
            Próximos <span>{upcoming.length}</span>
          </button>
          <button type="button" role="tab" aria-selected={tab === 'history'} onClick={() => setTab('history')}>
            Histórico <span>{history.length}</span>
          </button>
        </div>
        <PeriodFilter period={period} align="right" />
      </div>

      {actionError && <ErrorAlert message={actionError} />}
      {loading && !data && <Spinner />}
      {error && <ErrorAlert message={error} />}

      {data && list.length === 0 && (
        <div className="card">
          <EmptyState
            title={tab === 'upcoming' ? 'Nenhum horário agendado' : 'Nenhum atendimento no histórico'}
            description={
              period.selected !== 'all'
                ? 'Nada neste período. Tente outro intervalo de datas.'
                : tab === 'upcoming'
                  ? 'Que tal reservar seu próximo corte?'
                  : undefined
            }
            action={
              tab === 'upcoming' && (
                <Link to="/agendar" className="btn btn-primary btn-sm">
                  Agendar agora
                </Link>
              )
            }
          />
        </div>
      )}

      <div className={styles.list}>
        {list.map((a) => {
          const minutesUntil = (new Date(a.startsAt).getTime() - now) / 60000;
          const canCancel = a.status === 'SCHEDULED' && minutesUntil >= CLIENT_CANCEL_LIMIT_MINUTES;
          const lateToCancel = a.status === 'SCHEDULED' && !canCancel && minutesUntil > 0;

          return (
            <article key={a.id} className={`card ${styles.item}`}>
              <div className={styles.date}>
                <strong>{formatTime(a.startsAt)}</strong>
                <span>{formatLongDate(toLocalDate(a.startsAt))}</span>
              </div>

              <div className={styles.details}>
                <div className={styles.titleRow}>
                  <h3>
                    <Scissors size={16} /> {a.catalog.name}
                  </h3>
                  <StatusBadge status={a.status} />
                </div>
                <p className={styles.meta}>
                  <span>
                    <User size={14} /> {a.barber.name}
                  </span>
                  <span>
                    <Clock size={14} /> {formatTime(a.startsAt)} – {formatTime(a.endsAt)}
                  </span>
                  <span>{formatCurrency(a.priceCents)}</span>
                </p>
                {a.notes && (
                  <p className={styles.notes}>
                    <StickyNote size={14} /> {a.notes}
                  </p>
                )}
              </div>

              {canCancel && (
                <div className={styles.actions}>
                  {confirmingId === a.id ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        disabled={busyId === a.id}
                        onClick={() => cancel(a.id)}
                      >
                        Confirmar cancelamento
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmingId(null)}>
                        Voltar
                      </button>
                    </>
                  ) : (
                    <button type="button" className="btn btn-sm" onClick={() => setConfirmingId(a.id)}>
                      Cancelar
                    </button>
                  )}
                </div>
              )}
              {lateToCancel && (
                <p className={`subtle ${styles.lateHint}`}>
                  Cancelamento só com 1h de antecedência. Fale com a barbearia.
                </p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

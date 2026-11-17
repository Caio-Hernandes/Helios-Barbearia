import { ChevronLeft, ChevronRight, Phone, Scissors, StickyNote, User } from 'lucide-react';
import { useState } from 'react';
import { EmptyState, ErrorAlert, Spinner } from '../components/ui/Feedback';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../hooks/useAuth';
import { useNow } from '../hooks/useNow';
import { appointmentsService } from '../services/appointments.service';
import { barbersService } from '../services/barbers.service';
import { errorMessage } from '../services/http';
import type { Appointment, AppointmentStatus, Barber } from '../types';
import { addDays, formatCurrency, formatDuration, formatLongDate, formatTime, todayLocalDate } from '../utils/format';
import styles from './SchedulePage.module.css';

const NO_BARBERS: Barber[] = [];

/**
 * Agenda do dia. O barbeiro vê a própria; o dono (Hélio) vê a de todos
 * e pode filtrar por profissional.
 */
export function SchedulePage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';
  const now = useNow();

  const [date, setDate] = useState(todayLocalDate);
  const [barberFilter, setBarberFilter] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const barbers = useAsync(() => (isOwner ? barbersService.list() : Promise.resolve(NO_BARBERS)), [isOwner]);
  const appointments = useAsync(
    () => appointmentsService.list({ date, barberId: isOwner && barberFilter ? barberFilter : undefined }),
    [date, barberFilter, isOwner],
  );

  // Janelas livres: do próprio barbeiro, ou do profissional filtrado pelo dono
  const windowsBarberId = isOwner ? barberFilter : user?.id;
  const freeWindows = useAsync(
    () => (windowsBarberId ? barbersService.getFreeWindows(windowsBarberId, date) : Promise.resolve(undefined)),
    [windowsBarberId, date],
  );

  const list = appointments.data ?? [];
  const count = (status: AppointmentStatus) => list.filter((a) => a.status === status).length;
  const showBarber = isOwner && !barberFilter;

  async function runAction(appointment: Appointment, action: 'cancel' | 'COMPLETED' | 'NO_SHOW') {
    setBusyId(appointment.id);
    setActionError(null);
    try {
      if (action === 'cancel') await appointmentsService.cancel(appointment.id);
      else await appointmentsService.updateStatus(appointment.id, action);
      setConfirmingId(null);
      appointments.reload();
      freeWindows.reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page">
      <PageHeader
        title={isOwner ? 'Agenda da barbearia' : 'Minha agenda'}
        description={isOwner ? 'Atendimentos de todos os profissionais.' : 'Seus atendimentos do dia.'}
        actions={
          isOwner && (
            <select
              className={`input ${styles.select}`}
              value={barberFilter}
              onChange={(e) => setBarberFilter(e.target.value)}
              aria-label="Profissional"
            >
              <option value="">Todos os profissionais</option>
              {barbers.data?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )
        }
      />

      {/* Navegação de datas */}
      <div className={styles.dateBar}>
        <div className={styles.dateNav}>
          <button type="button" className="icon-btn" onClick={() => setDate((d) => addDays(d, -1))} aria-label="Dia anterior">
            <ChevronLeft size={20} />
          </button>
          <input
            type="date"
            className={`input ${styles.dateInput}`}
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            aria-label="Data"
          />
          <button type="button" className="icon-btn" onClick={() => setDate((d) => addDays(d, 1))} aria-label="Próximo dia">
            <ChevronRight size={20} />
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setDate(todayLocalDate())} disabled={date === todayLocalDate()}>
            Hoje
          </button>
        </div>
        <p className={styles.longDate}>{formatLongDate(date)}</p>
      </div>

      <div className={styles.stats}>
        <Stat label="Total" value={list.length} />
        <Stat label="Agendados" value={count('SCHEDULED')} />
        <Stat label="Concluídos" value={count('COMPLETED')} />
        <Stat label="Cancelados" value={count('CANCELED')} />
        <Stat label="Faltas" value={count('NO_SHOW')} />
      </div>

      {actionError && <ErrorAlert message={actionError} />}

      <div className={styles.layout}>
        <section className={styles.timeline}>
          {appointments.loading && !appointments.data && <Spinner />}
          {appointments.error && <ErrorAlert message={appointments.error} />}
          {appointments.data && list.length === 0 && (
            <div className="card">
              <EmptyState title="Nenhum atendimento neste dia" description="Os agendamentos dos clientes aparecem aqui." />
            </div>
          )}

          {list.map((a) => {
            const started = new Date(a.startsAt).getTime() <= now;
            const isScheduled = a.status === 'SCHEDULED';
            const busy = busyId === a.id;

            return (
              <article key={a.id} className={`card ${styles.item} ${a.status === 'CANCELED' ? styles.canceled : ''}`}>
                <div className={styles.time}>
                  <strong>{formatTime(a.startsAt)}</strong>
                  <span>{formatTime(a.endsAt)}</span>
                </div>

                <div className={styles.details}>
                  <div className={styles.titleRow}>
                    <h3>{a.client.name}</h3>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className={styles.meta}>
                    <span>
                      <Scissors size={14} /> {a.catalog.name} · {formatDuration(a.catalog.durationMinutes)}
                    </span>
                    <span>{formatCurrency(a.priceCents)}</span>
                    {a.client.phone && (
                      <a href={`tel:${a.client.phone}`}>
                        <Phone size={14} /> {a.client.phone}
                      </a>
                    )}
                    {showBarber && (
                      <span>
                        <User size={14} /> {a.barber.name}
                      </span>
                    )}
                  </p>
                  {a.notes && (
                    <p className={styles.notes}>
                      <StickyNote size={14} /> {a.notes}
                    </p>
                  )}
                </div>

                {isScheduled && (
                  <div className={styles.actions}>
                    {confirmingId === a.id ? (
                      <>
                        <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => runAction(a, 'cancel')}>
                          Confirmar cancelamento
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmingId(null)}>
                          Voltar
                        </button>
                      </>
                    ) : (
                      <>
                        {started && (
                          <>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={busy}
                              onClick={() => runAction(a, 'COMPLETED')}
                            >
                              Concluir
                            </button>
                            <button type="button" className="btn btn-sm" disabled={busy} onClick={() => runAction(a, 'NO_SHOW')}>
                              Não compareceu
                            </button>
                          </>
                        )}
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmingId(a.id)}>
                          Cancelar
                        </button>
                      </>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </section>

        <aside className={`card ${styles.freePanel}`}>
          <h2 className="section-title">Horários livres</h2>
          {!windowsBarberId && <p className="muted">Escolha um profissional para ver os horários livres.</p>}
          {windowsBarberId && freeWindows.loading && !freeWindows.data && <Spinner />}
          {windowsBarberId && freeWindows.error && <ErrorAlert message={freeWindows.error} />}
          {windowsBarberId && freeWindows.data && freeWindows.data.windows.length === 0 && (
            <p className="muted">Sem horários livres neste dia.</p>
          )}
          <ul className={styles.windows}>
            {windowsBarberId &&
              freeWindows.data?.windows.map((w) => (
                <li key={w.startsAt}>
                  <span>
                    {w.start} – {w.end}
                  </span>
                  <span className="subtle">{formatDuration(w.minutes)}</span>
                </li>
              ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.stat}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

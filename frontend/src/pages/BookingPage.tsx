import { CalendarCheck, Clock, LoaderCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Avatar } from '../components/ui/Avatar';
import { EmptyState, ErrorAlert, Spinner, SuccessAlert } from '../components/ui/Feedback';
import { PageHeader } from '../components/ui/PageHeader';
import { MAX_BOOKING_ADVANCE_DAYS } from '../config';
import { useAsync } from '../hooks/useAsync';
import { useDelayedFlag } from '../hooks/useDelayedFlag';
import { appointmentsService } from '../services/appointments.service';
import { barbersService } from '../services/barbers.service';
import { catalogService } from '../services/catalog.service';
import { ApiError, errorMessage } from '../services/http';
import type { Appointment, Slot } from '../types';
import {
  addDays,
  dayOfMonth,
  formatCurrency,
  formatDate,
  formatDuration,
  formatLongDate,
  formatTime,
  monthShort,
  todayLocalDate,
  weekdayShort,
} from '../utils/format';
import styles from './BookingPage.module.css';

export function BookingPage() {
  const catalog = useAsync(() => catalogService.list(), []);
  const barbers = useAsync(() => barbersService.list(), []);

  const [catalogId, setCatalogId] = useState<string>();
  const [barberId, setBarberId] = useState<string>();
  const [date, setDate] = useState(todayLocalDate);
  const [slot, setSlot] = useState<Slot>();
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [booked, setBooked] = useState<Appointment | null>(null);

  const days = useMemo(() => {
    const today = todayLocalDate();
    return Array.from({ length: MAX_BOOKING_ADVANCE_DAYS + 1 }, (_, i) => addDays(today, i));
  }, []);

  const ready = Boolean(catalogId && barberId);
  const availability = useAsync(
    () => (catalogId && barberId ? barbersService.getSlots(barberId, date, catalogId) : Promise.resolve(undefined)),
    [barberId, date, catalogId],
  );

  const slotsData = availability.data;
  const refreshingSlots = availability.loading;
  // Spinner só na primeira busca e se demorar: respostas rápidas não piscam nada na tela
  const showSlotsSpinner = useDelayedFlag(ready && availability.loading && !slotsData, 300);

  const service = catalog.data?.find((c) => c.id === catalogId);
  const barber = barbers.data?.find((b) => b.id === barberId);

  // Trocar serviço, profissional ou dia invalida o horário escolhido
  const choose = {
    service: (id: string) => {
      setCatalogId(id);
      setSlot(undefined);
    },
    barber: (id: string) => {
      setBarberId(id);
      setSlot(undefined);
    },
    date: (value: string) => {
      setDate(value);
      setSlot(undefined);
    },
  };

  async function confirm() {
    if (!slot || !catalogId || !barberId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const appointment = await appointmentsService.create({
        barberId,
        catalogId,
        startsAt: slot.startsAt,
        notes: notes.trim() || undefined,
      });
      setBooked(appointment);
      setSlot(undefined);
      setNotes('');
      availability.reload();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setSubmitError(errorMessage(err));
      // Alguém reservou antes: atualiza os horários
      if (err instanceof ApiError && err.status === 409) availability.reload();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <PageHeader title="Agendar horário" description="Escolha o serviço, o profissional e o melhor horário para você." />

      {booked && (
        <SuccessAlert>
          Horário confirmado: <strong>{booked.catalog.name}</strong> com {booked.barber.name} em{' '}
          {formatDate(booked.startsAt)} às {formatTime(booked.startsAt)}.{' '}
          <Link to="/meus-agendamentos">Ver meus agendamentos</Link>
        </SuccessAlert>
      )}

      <div className={styles.layout}>
        {/* 1. Serviço */}
        <section className={`card ${styles.step} ${styles.areaService}`}>
          <StepTitle number={1} title="Serviço" />
          {catalog.loading && <Spinner />}
          {catalog.error && <ErrorAlert message={catalog.error} />}
          <div className={styles.serviceGrid}>
            {catalog.data?.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.option}
                aria-pressed={item.id === catalogId}
                onClick={() => choose.service(item.id)}
              >
                <strong>{item.name}</strong>
                <span className={styles.optionMeta}>
                  <span>
                    <Clock size={14} /> {formatDuration(item.durationMinutes)}
                  </span>
                  <span className={styles.price}>{formatCurrency(item.priceCents)}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* 2. Profissional */}
        <section className={`card ${styles.step} ${styles.areaBarber}`}>
          <StepTitle number={2} title="Profissional" />
          {barbers.loading && <Spinner />}
          {barbers.error && <ErrorAlert message={barbers.error} />}
          <div className={styles.barberGrid}>
            {barbers.data?.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`${styles.option} ${styles.barberOption}`}
                aria-pressed={b.id === barberId}
                onClick={() => choose.barber(b.id)}
              >
                <Avatar name={b.name} size={34} />
                <strong>{b.name}</strong>
              </button>
            ))}
          </div>
        </section>

        {/* 3. Dia e horário */}
        <section className={`card ${styles.step} ${styles.areaTime}`}>
          <StepTitle number={3} title="Dia e horário" />
          <div className={styles.days} role="listbox" aria-label="Dia">
            {days.map((d) => (
              <button
                key={d}
                type="button"
                role="option"
                aria-selected={d === date}
                className={styles.day}
                onClick={() => choose.date(d)}
              >
                <span>{weekdayShort(d)}</span>
                <strong>{dayOfMonth(d)}</strong>
                <span>{monthShort(d)}</span>
              </button>
            ))}
          </div>

          <p className={styles.dateLabel}>{formatLongDate(date)}</p>

          {!ready && <p className="muted">Escolha o serviço e o profissional para ver os horários livres.</p>}
          {ready && showSlotsSpinner && <Spinner label="Buscando horários..." />}
          {ready && availability.error && <ErrorAlert message={availability.error} />}
          {/* Enquanto recarrega, mantém os horários anteriores esmaecidos em vez de piscar um loading */}
          {ready && slotsData && (
            <div className={`${styles.slotsArea} ${refreshingSlots ? styles.refreshing : ''}`} aria-busy={refreshingSlots}>
              {slotsData.slots.length === 0 ? (
                <EmptyState title="Nenhum horário livre neste dia" description="Tente outro dia ou outro profissional." />
              ) : (
                <div className={styles.slots}>
                  {slotsData.slots.map((s) => (
                    <button
                      key={s.startsAt}
                      type="button"
                      className="chip"
                      aria-pressed={slot?.startsAt === s.startsAt}
                      disabled={refreshingSlots}
                      onClick={() => setSlot(s)}
                    >
                      {s.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Resumo: ocupa a altura de Serviço + Profissional */}
        <aside className={`card ${styles.summary} ${styles.areaSummary}`}>
          <h2 className="section-title">Resumo</h2>
          <dl className={styles.summaryList}>
            <div>
              <dt>Serviço</dt>
              <dd>{service ? `${service.name} · ${formatDuration(service.durationMinutes)}` : '—'}</dd>
            </div>
            <div>
              <dt>Profissional</dt>
              <dd>{barber?.name ?? '—'}</dd>
            </div>
            <div>
              <dt>Data</dt>
              <dd>{formatLongDate(date)}</dd>
            </div>
            <div>
              <dt>Horário</dt>
              <dd>{slot ? `${formatTime(slot.startsAt)} – ${formatTime(slot.endsAt)}` : '—'}</dd>
            </div>
            <div className={styles.total}>
              <dt>Valor</dt>
              <dd>{service ? formatCurrency(service.priceCents) : '—'}</dd>
            </div>
          </dl>

          <label className={`field ${styles.notesField}`}>
            <span className="label">
              Observações <span className="subtle">(opcional)</span>
            </span>
            <textarea
              className="input"
              value={notes}
              maxLength={500}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex.: degradê baixo, barba desenhada"
            />
          </label>

          {submitError && <ErrorAlert message={submitError} />}

          <button type="button" className="btn btn-primary btn-block" disabled={!slot || submitting} onClick={confirm}>
            {submitting ? <LoaderCircle size={18} className="spin" /> : <CalendarCheck size={18} />}
            Confirmar agendamento
          </button>
          <p className={`subtle ${styles.hint}`}>Você pode cancelar até 1 hora antes do horário.</p>
        </aside>
      </div>
    </div>
  );
}

function StepTitle({ number, title }: { number: number; title: string }) {
  return (
    <h2 className={styles.stepTitle}>
      <span>{number}</span>
      {title}
    </h2>
  );
}

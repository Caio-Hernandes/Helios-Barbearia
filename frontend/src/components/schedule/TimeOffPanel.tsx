import { CalendarOff, LoaderCircle } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { TIMEZONE_OFFSET } from '../../config';
import { useAsync } from '../../hooks/useAsync';
import { barbersService } from '../../services/barbers.service';
import { ApiError, errorMessage } from '../../services/http';
import type { TimeOff } from '../../types';
import { addDays, formatDate, formatShortDate, formatTime, toLocalDate, todayLocalDate } from '../../utils/format';
import { DatePicker } from '../ui/DatePicker';
import { EmptyState, ErrorAlert, Spinner } from '../ui/Feedback';
import styles from './Schedule.module.css';
import { TIME_OPTIONS } from './timeOptions';

const toIso = (date: string, time: string) => `${date}T${time}:00${TIMEZONE_OFFSET}`;

/** Bloqueio que começa à meia-noite e termina à meia-noite de outro dia = dia(s) inteiro(s). */
function describe(timeOff: TimeOff): string {
  const startDate = toLocalDate(timeOff.startsAt);
  const endDate = toLocalDate(timeOff.endsAt);
  const startTime = formatTime(timeOff.startsAt);
  const endTime = formatTime(timeOff.endsAt);

  if (startTime === '00:00' && endTime === '00:00') {
    const lastDay = addDays(endDate, -1);
    return lastDay === startDate
      ? `${formatShortDate(startDate)} · dia inteiro`
      : `De ${formatShortDate(startDate)} a ${formatShortDate(lastDay)} · dias inteiros`;
  }
  if (startDate === endDate) return `${formatShortDate(startDate)} · ${startTime} – ${endTime}`;
  return `De ${formatShortDate(startDate)} ${startTime} a ${formatShortDate(endDate)} ${endTime}`;
}

/** Horários de clientes que impedem o bloqueio (a API devolve em details.appointments). */
function conflictTimes(error: unknown): string[] {
  if (!(error instanceof ApiError) || error.status !== 409) return [];
  const list = (error.details as { appointments?: { startsAt: string }[] } | undefined)?.appointments ?? [];
  return list.map((a) => `${formatDate(a.startsAt)} às ${formatTime(a.startsAt)}`);
}

/** Folgas e bloqueios pontuais na agenda de um barbeiro. */
export function TimeOffPanel({ barberId }: { barberId: string }) {
  const timeOffs = useAsync(() => barbersService.listTimeOffs(barberId), [barberId]);
  const today = todayLocalDate();

  const [date, setDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [wholeDay, setWholeDay] = useState(true);
  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState('13:00');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const invalidRange = wholeDay ? endDate < date : startTime >= endTime;

  async function create(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    setConflicts([]);
    try {
      await barbersService.createTimeOff(barberId, {
        startsAt: wholeDay ? toIso(date, '00:00') : toIso(date, startTime),
        endsAt: wholeDay ? toIso(addDays(endDate, 1), '00:00') : toIso(date, endTime),
        reason: reason.trim() || undefined,
      });
      setReason('');
      timeOffs.reload();
    } catch (err) {
      setFormError(errorMessage(err));
      setConflicts(conflictTimes(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    try {
      await barbersService.deleteTimeOff(barberId, id);
      setConfirmingId(null);
      timeOffs.reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className={`card ${styles.section}`}>
      <div>
        <h2 className="section-title">Folgas e bloqueios</h2>
        <p className="muted">Períodos em que o profissional não atende. Esses horários somem da agenda dos clientes.</p>
      </div>

      <form className={styles.timeOffForm} onSubmit={create}>
        <div className={styles.formRow}>
          <label className={styles.checkbox}>
            <input type="checkbox" checked={wholeDay} onChange={(e) => setWholeDay(e.target.checked)} />
            Dia inteiro
          </label>
        </div>

        <div className={styles.formRow}>
          <DatePicker
            label={wholeDay ? 'De' : 'Dia'}
            showLabel
            value={date}
            min={today}
            onChange={(value) => {
              setDate(value);
              if (endDate < value) setEndDate(value);
            }}
          />
          {wholeDay ? (
            <DatePicker label="Até" showLabel value={endDate} min={date} onChange={setEndDate} />
          ) : (
            <>
              <select className={`input ${styles.timeSelect}`} value={startTime} onChange={(e) => setStartTime(e.target.value)} aria-label="Início">
                {TIME_OPTIONS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <span className="subtle">até</span>
              <select className={`input ${styles.timeSelect}`} value={endTime} onChange={(e) => setEndTime(e.target.value)} aria-label="Fim">
                {TIME_OPTIONS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </>
          )}
        </div>

        <div className={styles.formRow}>
          <input
            className={`input ${styles.reason}`}
            value={reason}
            maxLength={200}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo (opcional): férias, consulta médica..."
            aria-label="Motivo"
          />
          <button type="submit" className="btn btn-primary" disabled={saving || invalidRange}>
            {saving ? <LoaderCircle size={18} className="spin" /> : <CalendarOff size={18} />}
            Bloquear período
          </button>
        </div>

        {invalidRange && <span className={styles.problem}>O fim precisa ser depois do início.</span>}
        {formError && <ErrorAlert message={formError} />}
        {conflicts.length > 0 && (
          <p className={styles.conflicts}>
            Clientes marcados nesse período: {conflicts.join(', ')}. Cancele ou remarque esses horários na Agenda antes de bloquear.
          </p>
        )}
      </form>

      {timeOffs.loading && !timeOffs.data && <Spinner />}
      {timeOffs.error && <ErrorAlert message={timeOffs.error} />}
      {timeOffs.data && timeOffs.data.length === 0 && <EmptyState title="Nenhuma folga ou bloqueio programado" />}

      <ul className={styles.timeOffList}>
        {timeOffs.data?.map((t) => (
          <li key={t.id}>
            <div>
              <strong>{describe(t)}</strong>
              {t.reason && <span className="muted">{t.reason}</span>}
            </div>
            {confirmingId === t.id ? (
              <div className={styles.headerActions}>
                <button type="button" className="btn btn-danger btn-sm" disabled={busyId === t.id} onClick={() => remove(t.id)}>
                  Remover
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmingId(null)}>
                  Voltar
                </button>
              </div>
            ) : (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmingId(t.id)}>
                Remover
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

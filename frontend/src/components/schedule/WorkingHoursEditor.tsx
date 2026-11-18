import { LoaderCircle, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAsync } from '../../hooks/useAsync';
import { barbersService } from '../../services/barbers.service';
import { errorMessage } from '../../services/http';
import type { WorkingHoursItem } from '../../types';
import { ErrorAlert, Spinner, SuccessAlert } from '../ui/Feedback';
import styles from './Schedule.module.css';
import { TIME_OPTIONS, WEEKDAY_NAMES } from './timeOptions';

type Interval = { startTime: string; endTime: string };
type Week = Interval[][]; // índice = dia da semana (0 = domingo)

/** Ordem de exibição: segunda a domingo. */
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DEFAULT_INTERVAL: Interval = { startTime: '09:00', endTime: '18:00' };

function toWeek(items: WorkingHoursItem[]): Week {
  const week: Week = Array.from({ length: 7 }, () => []);
  items.forEach(({ weekday, startTime, endTime }) => week[weekday].push({ startTime, endTime }));
  week.forEach((day) => day.sort((a, b) => a.startTime.localeCompare(b.startTime)));
  return week;
}

const toItems = (week: Week): WorkingHoursItem[] =>
  week.flatMap((day, weekday) => day.map((interval) => ({ weekday, ...interval })));

/** Problemas de um dia: início depois do fim, ou períodos sobrepostos. */
function dayProblem(day: Interval[]): string | null {
  if (day.some((i) => i.startTime >= i.endTime)) return 'O início precisa ser antes do fim.';
  const sorted = [...day].sort((a, b) => a.startTime.localeCompare(b.startTime));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startTime < sorted[i - 1].endTime) return 'Os períodos de atendimento não podem se sobrepor.';
  }
  return null;
}

interface WorkingHoursEditorProps {
  barberId: string;
  /** Só o dono altera o expediente. */
  editable: boolean;
}

/** Expediente semanal de um barbeiro: dias abertos/fechados e períodos de atendimento (a pausa do almoço é o espaço entre dois períodos). */
export function WorkingHoursEditor({ barberId, editable }: WorkingHoursEditorProps) {
  const saved = useAsync(() => barbersService.getWorkingHours(barberId), [barberId]);
  const [week, setWeek] = useState<Week>(() => toWeek([]));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const original = useMemo(() => toWeek(saved.data ?? []), [saved.data]);

  // Ao carregar (ou recarregar depois de salvar), o rascunho volta ao que está salvo
  useEffect(() => {
    setWeek(original);
    setError(null);
  }, [original]);

  // Trocar de barbeiro limpa a mensagem de sucesso anterior
  useEffect(() => setSuccess(false), [barberId]);

  const dirty = JSON.stringify(week) !== JSON.stringify(original);
  const problems = week.map(dayProblem);
  const hasProblems = problems.some(Boolean);

  function update(weekday: number, change: (day: Interval[]) => Interval[]) {
    setWeek((w) => w.map((day, i) => (i === weekday ? change(day) : day)));
    setSuccess(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await barbersService.replaceWorkingHours(barberId, toItems(week));
      setSuccess(true);
      saved.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={`card ${styles.section}`}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className="section-title">Horário semanal</h2>
          <p className="muted">
            {editable ? 'Dias e períodos de atendimento. Para a pausa do almoço, use dois períodos (ex.: 09:00–12:00 e 13:00–19:00).' : 'Seu expediente. Só o dono pode alterar.'}
          </p>
        </div>
        {editable && dirty && (
          <div className={styles.headerActions}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setWeek(original)} disabled={saving}>
              Descartar
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={saving || hasProblems}>
              {saving && <LoaderCircle size={16} className="spin" />}
              Salvar alterações
            </button>
          </div>
        )}
      </div>

      {saved.loading && !saved.data && <Spinner />}
      {saved.error && <ErrorAlert message={saved.error} />}
      {error && <ErrorAlert message={error} />}
      {success && !dirty && <SuccessAlert>Expediente salvo. Os horários disponíveis para agendamento já foram atualizados.</SuccessAlert>}

      {saved.data && (
        <ul className={styles.week}>
          {DISPLAY_ORDER.map((weekday) => {
            const day = week[weekday];
            const open = day.length > 0;
            return (
              <li key={weekday} className={styles.day}>
                <div className={styles.dayName}>
                  {editable ? (
                    <label className={styles.toggle}>
                      <input
                        type="checkbox"
                        checked={open}
                        onChange={(e) => update(weekday, () => (e.target.checked ? [{ ...DEFAULT_INTERVAL }] : []))}
                      />
                      <span className={styles.switch} aria-hidden="true" />
                      <strong>{WEEKDAY_NAMES[weekday]}</strong>
                    </label>
                  ) : (
                    <strong>{WEEKDAY_NAMES[weekday]}</strong>
                  )}
                </div>

                <div className={styles.intervals}>
                  {!open && <span className="subtle">Fechado</span>}
                  {day.map((interval, index) => (
                    <div key={index} className={styles.interval}>
                      {editable ? (
                        <>
                          <TimeSelect
                            label={`${WEEKDAY_NAMES[weekday]}: início do período ${index + 1}`}
                            value={interval.startTime}
                            onChange={(startTime) =>
                              update(weekday, (d) => d.map((it, i) => (i === index ? { ...it, startTime } : it)))
                            }
                          />
                          <span className="subtle">até</span>
                          <TimeSelect
                            label={`${WEEKDAY_NAMES[weekday]}: fim do período ${index + 1}`}
                            value={interval.endTime}
                            onChange={(endTime) => update(weekday, (d) => d.map((it, i) => (i === index ? { ...it, endTime } : it)))}
                          />
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label="Remover período"
                            title="Remover período"
                            onClick={() => update(weekday, (d) => d.filter((_, i) => i !== index))}
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <span className={styles.readonlyInterval}>
                          {interval.startTime} – {interval.endTime}
                        </span>
                      )}
                    </div>
                  ))}
                  {editable && open && (
                    <button
                      type="button"
                      className={`btn btn-ghost btn-sm ${styles.addInterval}`}
                      onClick={() =>
                        update(weekday, (d) => {
                          // Novo período começa onde o último termina e dura 1h
                          const start = d[d.length - 1]?.endTime ?? DEFAULT_INTERVAL.startTime;
                          const index = Math.max(0, TIME_OPTIONS.indexOf(start));
                          const end = TIME_OPTIONS[Math.min(index + 4, TIME_OPTIONS.length - 1)];
                          return [...d, { startTime: start, endTime: end }];
                        })
                      }
                    >
                      <Plus size={16} /> Adicionar período
                    </button>
                  )}
                  {problems[weekday] && <span className={styles.problem}>{problems[weekday]}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function TimeSelect({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  // Mantém valores fora da grade (ex.: vindos da API) visíveis na lista
  const options = TIME_OPTIONS.includes(value) ? TIME_OPTIONS : [...TIME_OPTIONS, value].sort();
  return (
    <select className={`input ${styles.timeSelect}`} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      {options.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}

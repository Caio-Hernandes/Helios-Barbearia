import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { addMonths, firstDayOfMonth } from '../../utils/dateRanges';
import { addDays, dayOfMonth, formatShortDate, monthYearLabel, todayLocalDate } from '../../utils/format';
import styles from './DatePicker.module.css';

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

interface DatePickerProps {
  /** Data "YYYY-MM-DD" */
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  /** Rótulo acessível e, se `showLabel`, texto antes da data (ex.: "De"). */
  label: string;
  showLabel?: boolean;
  /** Lado em que o calendário abre (use "right" perto da borda direita). */
  align?: 'left' | 'right';
}

/** Seletor de data com calendário próprio, no visual do app (substitui o input nativo). */
export function DatePicker({ value, onChange, min, max, label, showLabel = false, align = 'left' }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => firstDayOfMonth(value));
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();
  const today = todayLocalDate();

  // Fecha ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const isDisabled = (date: string) => Boolean((min && date < min) || (max && date > max));

  function toggle() {
    if (!open) setMonth(firstDayOfMonth(value));
    setOpen((o) => !o);
  }

  function select(date: string) {
    if (isDisabled(date)) return;
    onChange(date);
    setOpen(false);
  }

  // 6 semanas a partir do domingo anterior ao dia 1
  const firstWeekday = new Date(`${month}T12:00:00Z`).getUTCDay();
  const gridStart = addDays(month, -firstWeekday);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const currentMonth = month.slice(0, 7);

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popoverId}
        aria-label={`${label}: ${formatShortDate(value)}`}
      >
        <CalendarDays size={16} />
        {showLabel && <span className={styles.triggerLabel}>{label}</span>}
        <span>{formatShortDate(value)}</span>
      </button>

      {open && (
        <div id={popoverId} role="dialog" aria-label={label} className={`${styles.popover} ${align === 'right' ? styles.right : ''}`}>
          <div className={styles.header}>
            <button type="button" className="icon-btn" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="Mês anterior">
              <ChevronLeft size={18} />
            </button>
            <strong>{monthYearLabel(month)}</strong>
            <button type="button" className="icon-btn" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Próximo mês">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className={styles.grid}>
            {WEEKDAYS.map((w, i) => (
              <span key={i} className={styles.weekday}>
                {w}
              </span>
            ))}
            {cells.map((date) => {
              const classes = [
                styles.day,
                date.slice(0, 7) !== currentMonth && styles.outside,
                date === today && styles.today,
                date === value && styles.selected,
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <button
                  key={date}
                  type="button"
                  className={classes}
                  disabled={isDisabled(date)}
                  aria-pressed={date === value}
                  onClick={() => select(date)}
                >
                  {dayOfMonth(date)}
                </button>
              );
            })}
          </div>

          <div className={styles.footer}>
            <button type="button" className="btn btn-ghost btn-sm" disabled={isDisabled(today)} onClick={() => select(today)}>
              Hoje
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

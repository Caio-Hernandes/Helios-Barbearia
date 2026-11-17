import { CUSTOM_PERIOD, type PeriodState } from '../../hooks/usePeriod';
import { DatePicker } from './DatePicker';
import styles from './PeriodFilter.module.css';

/** Atalhos de período + "Personalizado" com datas De/Até. */
export function PeriodFilter({ period, align = 'left' }: { period: PeriodState; align?: 'left' | 'right' }) {
  const { presets, selected, setSelected, custom, setCustom } = period;

  return (
    <div className={`${styles.filter} ${align === 'right' ? styles.alignRight : ''}`}>
      <div className={styles.chips} role="group" aria-label="Período">
        {presets.map((p) => (
          <button key={p.key} type="button" className="chip" aria-pressed={selected === p.key} onClick={() => setSelected(p.key)}>
            {p.label}
          </button>
        ))}
        <button
          type="button"
          className="chip"
          aria-pressed={selected === CUSTOM_PERIOD}
          onClick={() => setSelected(CUSTOM_PERIOD)}
        >
          Personalizado
        </button>
      </div>

      {selected === CUSTOM_PERIOD && (
        <div className={styles.custom}>
          <DatePicker
            label="De"
            showLabel
            value={custom.from}
            max={custom.to}
            onChange={(from) => setCustom((c) => ({ ...c, from }))}
            align={align}
          />
          <DatePicker
            label="Até"
            showLabel
            value={custom.to}
            min={custom.from}
            onChange={(to) => setCustom((c) => ({ ...c, to }))}
            align="right"
          />
        </div>
      )}
    </div>
  );
}

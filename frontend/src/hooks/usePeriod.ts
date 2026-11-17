import { useMemo, useState } from 'react';
import type { DateRange } from '../utils/dateRanges';
import { addDays, todayLocalDate } from '../utils/format';

export interface PeriodPreset {
  key: string;
  label: string;
  /** Intervalo do atalho, calculado na hora (depende de "hoje"). */
  range: () => DateRange;
}

export const CUSTOM_PERIOD = 'custom';

/** Estado de um filtro de período: atalho escolhido ou intervalo personalizado. */
export function usePeriod(presets: PeriodPreset[], defaultKey: string) {
  const [selected, setSelected] = useState(defaultKey);
  const [custom, setCustom] = useState<Required<DateRange>>(() => {
    const today = todayLocalDate();
    return { from: addDays(today, -6), to: today };
  });

  const range = useMemo<DateRange>(() => {
    if (selected === CUSTOM_PERIOD) return custom;
    return presets.find((p) => p.key === selected)?.range() ?? {};
  }, [selected, custom, presets]);

  return { presets, selected, setSelected, custom, setCustom, range };
}

export type PeriodState = ReturnType<typeof usePeriod>;

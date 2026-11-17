import { useEffect, useState } from 'react';

/**
 * Fica true só depois que `flag` permanece true por `delayMs`.
 * Útil para não mostrar loading em respostas rápidas (evita "piscar").
 */
export function useDelayedFlag(flag: boolean, delayMs = 300): boolean {
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    if (!flag) return;
    const id = window.setTimeout(() => setElapsed(true), delayMs);
    return () => {
      window.clearTimeout(id);
      setElapsed(false);
    };
  }, [flag, delayMs]);

  return flag && elapsed;
}

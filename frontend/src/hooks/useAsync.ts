import { useCallback, useEffect, useState, type DependencyList } from 'react';
import { errorMessage } from '../services/http';

interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  /** Executa a busca de novo (ex.: depois de uma alteração). */
  reload: () => void;
}

/**
 * Executa uma função assíncrona quando as dependências mudam.
 * Ignora respostas antigas se as dependências mudarem no meio da requisição.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  // `deps` controla quando buscar de novo (como no useEffect)
  const run = useCallback(fn, deps);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    run()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err: unknown) => {
        if (active) setError(errorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [run, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return { data, loading, error, reload };
}

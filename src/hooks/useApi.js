import { useState, useEffect, useCallback, useRef } from 'react';
import { api, unwrap } from '../lib/api.js';

/** One-shot GET with loading/error state and a manual refetch. */
export const useApi = (url, { skip = false, deps = [] } = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState(null);
  const alive = useRef(true);

  const refetch = useCallback(async () => {
    if (!url) return null;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(url);
      const value = unwrap(res);
      if (alive.current) setData(value);
      return value;
    } catch (e) {
      if (alive.current) setError(e);
      return null;
    } finally {
      if (alive.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => {
    alive.current = true;
    if (!skip) refetch();
    return () => { alive.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, skip, ...deps]);

  return { data, loading, error, refetch, setData };
};

/** Mutation with loading + error, surfacing the server's message via toast. */
export const useMutation = (fn, { onSuccess, onError } = {}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn(...args);
      onSuccess?.(result);
      return result;
    } catch (e) {
      setError(e);
      onError?.(e);
      throw e;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fn, onSuccess, onError]);

  return { mutate, loading, error };
};

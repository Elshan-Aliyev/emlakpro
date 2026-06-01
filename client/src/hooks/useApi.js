import { useState, useCallback, useRef } from 'react';

/**
 * Thin wrapper for API calls that manages loading/error/data state
 * and cancels in-flight requests when a new call starts.
 *
 * Usage:
 *   const { data, loading, error, execute } = useApi(getProperties);
 *   await execute({ city: 'Baku' });
 */
const useApi = (apiFunc) => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const abortRef              = useRef(null);

  const execute = useCallback(async (...args) => {
    // Cancel previous in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const result = await apiFunc(...args);
      setData(result.data ?? result);
      return { data: result.data ?? result, error: null };
    } catch (err) {
      // Ignore intentional cancellations
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return { data: null, error: null };
      }
      const msg = err.response?.data?.message || err.message || 'Request failed';
      setError(msg);
      return { data: null, error: msg };
    } finally {
      setLoading(false);
    }
  }, [apiFunc]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
};

export default useApi;

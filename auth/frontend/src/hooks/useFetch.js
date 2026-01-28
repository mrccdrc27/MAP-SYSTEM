import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for data fetching with loading and error states
 * @param {Function} apiCall - Function that returns a promise with the API response
 * @param {Array} dependencies - Dependencies that should trigger a re-fetch
 * @param {boolean} immediate - Whether to fetch immediately on mount
 */
const useFetch = (apiCall, dependencies = [], immediate = true) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiCall(...args);
      if (response.ok) {
        setData(response.data);
        return response.data;
      } else {
        const errorMsg = response.data?.detail || response.data?.message || 'An error occurred';
        setError(errorMsg);
        return null;
      }
    } catch (err) {
      console.error('Fetch error:', err);
      const errorMsg = err.message || 'An error occurred';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, dependencies);

  return { data, loading, error, execute, setData };
};

export default useFetch;

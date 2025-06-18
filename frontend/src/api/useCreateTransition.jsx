// hooks/useCreateTransition.js
import { useState } from 'react';
import api from './axios'; // your configured Axios instance

export default function useCreateTransition() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);

  const createTransition = async (data) => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/workflow/steps/step-transitions/', data); // adjust endpoint if different
      setResponse(res.data);
      return res.data;
    } catch (err) {
      setError(err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    createTransition,
    loading,
    error,
    response,
  };
}

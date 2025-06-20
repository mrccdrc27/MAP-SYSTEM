// hooks/useCreateStep.js
import { useState } from 'react';
import api from './axios';

export default function useCreateStep() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);

  const createStep = async (data) => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('workflow/steps/', data); // ✅ Corrected endpoint
      setResponse(res.data);
      return res.data;
    } catch (err) {
      setError(err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    createStep,
    loading,
    error,
    response,
  };
}

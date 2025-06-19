// src/api/useCreateWorkflow.js
import { useState } from 'react';
import api from './axios'; // adjust this import if your axios instance is elsewhere

const useCreateWorkflow = () => {
  const [loading, setLoading] = useState(false);
  const [workflow, setWorkflow] = useState(null);
  const [error, setError] = useState(null);

  const createWorkflow = async (data) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/workflow/workflows/', data);
      setWorkflow(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data || 'An error occurred.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    createWorkflow,
    loading,
    workflow,
    error,
  };
};

export default useCreateWorkflow;

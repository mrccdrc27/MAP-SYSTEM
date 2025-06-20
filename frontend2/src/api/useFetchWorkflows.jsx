// src/api/useFetchWorkflows.js
import { useState, useEffect } from 'react';
import api from './axios'; // Make sure this points to your configured Axios instance

const useFetchWorkflows = () => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const response = await api.get('/workflow/workflows/');
      setWorkflows(response.data);
    } catch (err) {
      setError(err.response?.data || 'Failed to fetch workflows.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  return { workflows, loading, error, refetch: fetchWorkflows };
};

export default useFetchWorkflows;

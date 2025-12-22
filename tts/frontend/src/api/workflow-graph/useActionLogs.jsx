// src/api/useFetchActionLogs.js
import { useState, useCallback } from 'react';
import api from '../axios'; // your pre-configured axios instance

const useFetchActionLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchActionLogs = useCallback(async (ticketId) => {
    if (!ticketId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/tasks/logs/', {
        params: { ticket_id: ticketId },
      });
      // Extract the logs array from the response object
      const logsArray = response.data.logs || [];
      setLogs(logsArray);
      return logsArray;
    } catch (err) {
      setError(err.response?.data || 'An error occurred.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    fetchActionLogs,
    logs,
    loading,
    error,
  };
};

export default useFetchActionLogs;



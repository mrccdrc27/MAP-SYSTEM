import { useState, useEffect } from 'react';
import api from './axios';

export const useWorkflowRoles = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRoles = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get('/roles/');
        setRoles(response.data);
      } catch (err) {
        const errorMsg = err.response?.data?.error || 'Failed to fetch roles';
        setError(errorMsg);
        console.error('Error fetching roles:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, []);

  return { roles, loading, error };
};

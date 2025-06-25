// src/api/useCreateWorkflow.js
import { useState } from 'react';
import api from './axios';
import { useAuth } from './AuthContext';

const useWorkflow = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [workflow, setWorkflow] = useState(null);
  const [error, setError] = useState(null);

  const createWorkflow = async (data) => {
    if (!user?.id) {
      setError('User not authenticated');
      return null;
    }

    const payload = {
      ...data,
      user_id: user.id,
      low_sla: data.low_sla || null,
      medium_sla: data.medium_sla || null,
      high_sla: data.high_sla || null,
      urgent_sla: data.urgent_sla || null,
    };

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('workflow/', payload);
      setWorkflow(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data || 'An error occurred.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateWorkflow = async (id, data) => {
    if (!user?.id) {
      setError('User not authenticated');
      return null;
    }

    const payload = {
      ...data,
      user_id: user.id,
    };

    setLoading(true);
    setError(null);

    try {
      const response = await api.patch(`workflow/${id}/`, payload);
      setWorkflow(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data || 'An error occurred.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteWorkflow = async (id) => {
    if (!user?.id) {
      setError('User not authenticated');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      await api.delete(`workflow/${id}/`);
      setWorkflow(null);
      return true;
    } catch (err) {
      setError(err.response?.data || 'An error occurred.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    loading,
    workflow,
    error,
  };
};

export default useWorkflow;

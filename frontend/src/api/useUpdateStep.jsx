// src/api/useStepUpdater.js
import { useEffect, useState } from 'react';
import api from './axios';

const useStepUpdater = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateStep = async ({ stepId, name, role_id }) => {
    setLoading(true);
    try {
      const res = await api.patch(`steps/${stepId}/`, { name, role_id });
      setData(res.data);
      return res.data;
    } catch (err) {
      setError("Failed to update step.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteStep = async (stepId) => {
    setLoading(true);
    try {
      await api.delete(`steps/${stepId}/`);
      setData(null);  // Step is deleted
      return true;
    } catch (err) {
      setError("Failed to delete step.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { updateStep, deleteStep, data, loading, error };
};

export default useStepUpdater;

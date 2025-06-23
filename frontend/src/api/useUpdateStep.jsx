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

  return { updateStep, data, loading, error };
};

export default useStepUpdater;

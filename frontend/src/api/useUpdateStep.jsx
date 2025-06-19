// src/api/useStepUpdater.js
import { useEffect, useState } from 'react';
import api from './axios';

const useStepUpdater = ({ stepId, name, role_id, trigger = false }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (trigger && stepId && name && role_id) {
      setLoading(true);
      api
        .patch(`workflow/steps/${stepId}/`, {
          name,
          role_id
        })
        .then((res) => {
          setData(res.data);
        })
        .catch(() => {
          setError("Failed to update step.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [trigger, stepId, name, role_id]);

  return { data, loading, error };
};

export default useStepUpdater;

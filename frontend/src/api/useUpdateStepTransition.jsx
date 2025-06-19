// src/api/useUpdateStepTransition.js
import { useState } from 'react';
import api from './axios';

const useUpdateStepTransition = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState(null);

  const updateTransition = async (transitionId, updateData) => {
    setLoading(true);
    setError('');
    setUpdated(null);

    try {
      const res = await api.patch(`workflow/steps/step-transitions/${transitionId}`, {
        from_step_id: updateData.from_step_id,
        to_step_id: updateData.to_step_id,
        action: {
          name: updateData.action_name,
        }
      });
      setUpdated(res.data);
    } catch (err) {
      console.error(err);
      if (err.response?.data) {
        setError(JSON.stringify(err.response.data, null, 2));
      } else {
        setError('Failed to update step transition.');
      }
    } finally {
      setLoading(false);
    }
  };

  return { updateTransition, loading, error, updated };
};

export default useUpdateStepTransition;

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
      const res = await api.patch(`steps/step-transitions/${transitionId}/`, {
        from_step_id: updateData.from_step_id,
        to_step_id: updateData.to_step_id,
        action: {
          name: updateData.action_name,
        },
      });
      setUpdated(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data ? JSON.stringify(err.response.data, null, 2) : 'Failed to update step transition.');
    } finally {
      setLoading(false);
    }
  };

  const deleteTransition = async (transitionId) => {
    setLoading(true);
    setError('');

    try {
      await api.delete(`steps/step-transitions/${transitionId}/`);
      return true;
    } catch (err) {
      console.error(err);
      setError('Failed to delete transition.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    updateTransition,
    deleteTransition,
    loading,
    error,
    updated,
  };
};

export default useUpdateStepTransition;

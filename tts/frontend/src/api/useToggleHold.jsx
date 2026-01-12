import { useState } from "react";
import api from "./axios";

/**
 * Hook to toggle the On Hold status for a task/ticket.
 * 
 * This toggles between 'In Progress' and 'On Hold' status.
 * The status change is automatically synced to HDTS.
 * 
 * @returns {Object} - { toggleHold, loading, error, result }
 */
const useToggleHold = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  /**
   * Toggle the hold status for a task.
   * 
   * @param {number|string} taskId - The task ID
   * @param {string} notes - Optional notes for the status change
   * @returns {Promise<Object>} - The result of the toggle operation
   */
  const toggleHold = async (taskId, notes = "") => {
    setLoading(true);
    setError("");
    setResult(null);
    
    try {
      const response = await api.post(`tasks/${taskId}/toggle-hold/`, {
        notes: notes
      });
      
      setResult(response.data);
      return response.data;
    } catch (err) {
      console.error('Failed to toggle hold status:', err);
      
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          "Failed to toggle hold status";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { toggleHold, loading, error, result };
};

export default useToggleHold;

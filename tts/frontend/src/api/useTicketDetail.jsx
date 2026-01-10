import { useState, useEffect } from "react";
import api from "./axios";

/**
 * Hook to fetch ticket details by ticket_number and optionally task_item_id.
 * The backend resolves the ticket_number to the current user's TaskItem.
 * 
 * When task_item_id is provided, it fetches that specific TaskItem instead of
 * the most recent one. This is critical when a user has multiple TaskItems
 * for the same ticket (e.g., assigned at step 1, rejected, assigned again at step 3).
 * 
 * @param {string} ticketNumber - The ticket number (e.g., "TX20251227638396")
 * @param {string|number|null} taskItemId - Optional specific task item ID to fetch
 */
const useTicketDetail = (ticketNumber, taskItemId = null) => {
  const [stepInstance, setStepInstance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ticketNumber) {
      setStepInstance(null);
      setLoading(false);
      return;
    }

    const fetchStepInstance = async () => {
      setLoading(true);
      setError("");
      
      try {
        // Build URL - include task_item_id as query param if provided
        let url = `tasks/detail/by-ticket/${ticketNumber}/`;
        if (taskItemId) {
          url += `?task_item_id=${taskItemId}`;
        }
        
        const response = await api.get(url);
        setStepInstance(response.data);
      } catch (err) {
        console.error('Failed to fetch ticket detail:', err);
        
        if (err.response?.status === 403) {
          setError("No authorization to handle this ticket");
        } else if (err.response?.status === 404) {
          setError(err.response?.data?.error || "Ticket not found or not assigned to you");
        } else if (err.response?.status === 401) {
          setError("Authentication required");
        } else {
          setError("Failed to fetch step instance data");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStepInstance();
  }, [ticketNumber, taskItemId]);

  const refetch = () => {
    if (ticketNumber) {
      setLoading(true);
      setError("");
      
      // Build URL - include task_item_id as query param if provided
      let url = `tasks/detail/by-ticket/${ticketNumber}/`;
      if (taskItemId) {
        url += `?task_item_id=${taskItemId}`;
      }
      
      api.get(url)
        .then(response => {
          setStepInstance(response.data);
        })
        .catch(err => {
          console.error('Failed to refetch ticket detail:', err);
          
          if (err.response?.status === 403) {
            setError("No authorization to handle this ticket");
          } else if (err.response?.status === 404) {
            setError(err.response?.data?.error || "Ticket not found or not assigned to you");
          } else if (err.response?.status === 401) {
            setError("Authentication required");
          } else {
            setError("Failed to fetch step instance data");
          }
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  return { stepInstance, loading, error, refetch };
};

export default useTicketDetail;
import { useState, useEffect } from "react";
import api from "./axios";

/**
 * Hook to fetch ticket details by ticket_number.
 * The backend resolves the ticket_number to the current user's TaskItem.
 * 
 * @param {string} ticketNumber - The ticket number (e.g., "TX20251227638396")
 */
const useTicketDetail = (ticketNumber) => {
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
        // Use the by-ticket endpoint that resolves ticket_number to user's TaskItem
        const response = await api.get(`tasks/detail/by-ticket/${ticketNumber}/`);
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
  }, [ticketNumber]);

  const refetch = () => {
    if (ticketNumber) {
      setLoading(true);
      setError("");
      
      api.get(`tasks/detail/by-ticket/${ticketNumber}/`)
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
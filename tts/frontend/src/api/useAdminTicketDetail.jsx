import { useState, useEffect, useCallback } from "react";
import api from "./axios";

/**
 * Hook to fetch ticket details for admin archive view.
 * This endpoint allows admins to view ANY ticket without ownership restrictions.
 * 
 * @param {string} ticketNumber - The ticket number (e.g., "TX20251227638396")
 */
const useAdminTicketDetail = (ticketNumber) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTicketDetail = useCallback(async () => {
    if (!ticketNumber) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      // Use the admin view endpoint that doesn't require ownership
      const response = await api.get(`tasks/admin/view/${ticketNumber}/`);
      setData(response.data);
    } catch (err) {
      console.error('Failed to fetch admin ticket detail:', err);
      
      if (err.response?.status === 403) {
        // Use the error message from the server if available
        const serverMessage = err.response?.data?.error;
        setError(serverMessage || "Admin access required to view this ticket");
      } else if (err.response?.status === 404) {
        setError(err.response?.data?.error || "Ticket not found");
      } else if (err.response?.status === 401) {
        setError("Authentication required");
      } else {
        setError("Failed to fetch ticket details");
      }
    } finally {
      setLoading(false);
    }
  }, [ticketNumber]);

  useEffect(() => {
    fetchTicketDetail();
  }, [fetchTicketDetail]);

  const refetch = useCallback(() => {
    fetchTicketDetail();
  }, [fetchTicketDetail]);

  return { data, loading, error, refetch };
};

/**
 * Hook to transfer a ticket to the current admin user.
 */
export const useAdminTransferToSelf = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const transferToSelf = async (taskItemId, notes = "Transferred to self by admin") => {
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const response = await api.post("tasks/admin/transfer-to-self/", {
        task_item_id: taskItemId,
        notes,
      });
      setSuccess(true);
      return response.data;
    } catch (err) {
      console.error("Failed to transfer ticket to self:", err);

      if (err.response?.status === 403) {
        setError("Admin access required");
      } else if (err.response?.status === 404) {
        setError("Task not found");
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.error || "Cannot transfer this ticket");
      } else if (err.response?.status === 401) {
        setError("Authentication required");
      } else {
        setError("Failed to transfer ticket");
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setError("");
    setSuccess(false);
  };

  return { transferToSelf, loading, error, success, reset };
};

export default useAdminTicketDetail;

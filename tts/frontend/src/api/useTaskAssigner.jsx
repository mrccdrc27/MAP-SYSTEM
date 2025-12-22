import { useState, useCallback } from "react";
import api from "./axios";

const useTaskAssigner = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const assignTask = useCallback(async ({ ticket_id, workflow_id }) => {
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      const response = await api.post("tickets/assign-task/", {
        ticket_id,
        workflow_id,
      });
      setSuccess(true);
      return { success: true, message: response.data.detail };
    } catch (err) {
      const message =
        err.response?.data?.detail || "Failed to assign task.";
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  return { assignTask, loading, error, success };
};

export default useTaskAssigner;

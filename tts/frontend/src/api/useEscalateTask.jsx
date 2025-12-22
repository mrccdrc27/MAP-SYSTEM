import { useState } from "react";
import api from "./axios";

const useEscalateTask = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const escalateTask = async (task_item_id, reason) => {
    setLoading(true);
    setError("");

    try {
      const response = await api.post("tasks/escalate/", {
        task_item_id,
        reason,
      });
      return response.data;
    } catch (err) {
      console.error("Failed to escalate task:", err);

      if (err.response?.status === 403) {
        setError("No authorization to escalate this task");
      } else if (err.response?.status === 404) {
        setError("Task not found");
      } else if (err.response?.status === 401) {
        setError("Authentication required");
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("Failed to escalate task");
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { escalateTask, loading, error };
};

export default useEscalateTask;

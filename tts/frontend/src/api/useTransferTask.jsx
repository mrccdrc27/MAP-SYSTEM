import { useState } from "react";
import api from "./axios";

const useTransferTask = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const transferTask = async (user_id, task_item_id, notes) => {
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const response = await api.post("tasks/transfer/", {
        user_id,
        task_item_id,
        notes,
      });
      setSuccess(true);
      return response.data;
    } catch (err) {
      console.error("Failed to transfer task:", err);

      if (err.response?.status === 403) {
        setError("No authorization to transfer this task");
      } else if (err.response?.status === 404) {
        setError("Task or user not found");
      } else if (err.response?.status === 401) {
        setError("Authentication required");
      } else if (err.response?.status === 405) {
        setError("Transfer endpoint not available (method not allowed)");
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError("Failed to transfer task");
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { transferTask, loading, error, success };
};

export default useTransferTask;

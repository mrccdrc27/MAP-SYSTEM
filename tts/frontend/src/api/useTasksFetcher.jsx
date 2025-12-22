import { useState, useCallback } from "react";
import api from "./axios";

const useTasksFetcher = () => {
  const [tasks, setTasks] = useState([]); // Initialize tasks as an empty array
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTasks = useCallback(async (task_id = null) => {
    setLoading(true);
    try {
      // Build query parameters
      const params = task_id ? { task_id } : {};
      const res = await api.get("/tasks/", { params }); // Pass query parameters
      setTasks(res.data);
      return res.data;
    } catch (err) {
      setError("Failed to fetch tasks.");
      return [];
    } finally {
      setLoading(false);
    }
  }, []); // Only created once

  return { fetchTasks, tasks, loading, error };
};

export default useTasksFetcher;

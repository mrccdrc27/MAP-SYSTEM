// hooks/useWorkflowProgress.js
import { useState, useEffect } from "react";
import api from "../axios"; // your custom axios instance

export function useWorkflowProgress(taskId) {
  const [tracker, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!taskId) return;

    setLoading(true);

    api
      .get(`/action_log/progress/?task_id=${taskId}`)
      .then((res) => {
        console.log("✅ API response:", res.data);
        setData(res.data); // <-- fix this line!
      })
      .catch((err) => {
        console.error("❌ API error:", err);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, [taskId]);

  return { tracker, loading, error };
}

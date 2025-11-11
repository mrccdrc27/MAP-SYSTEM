// hooks/useWorkflowProgress.js
import { useState, useEffect } from "react";
import api from "../axios"; // your custom axios instance

export function useWorkflowProgress(ticketID) {
  const [tracker, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!ticketID) return;

    setLoading(true);

    api
      .get(`/tasks/workflow-visualization/?ticket_id=${ticketID}`)
      .then((res) => {
        console.log("✅ API response:", res.data);
        setData(res.data); // <-- fix this line!
      })
      .catch((err) => {
        console.error("❌ API error:", err);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, [ticketID]);

  return { tracker, loading, error };
}

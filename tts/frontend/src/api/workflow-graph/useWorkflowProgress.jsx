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
    // decide whether to send task_id (numeric) or ticket_id (string like TX...)
    const isNumeric = !Number.isNaN(Number(ticketID)) && String(ticketID).trim() !== "";
    const paramName = isNumeric ? "task_id" : "ticket_id";
    const paramValue = encodeURIComponent(ticketID);

    api
      .get(`/tasks/workflow-visualization/?${paramName}=${paramValue}`)
      .then((res) => {
        console.log("✅ API response:", res.data);
        setData(res.data);
      })
      .catch((err) => {
        console.error("❌ API error:", err);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, [ticketID]);

  return { tracker, loading, error };
}

// hooks/useWorkflowProgress.js
// Hook to fetch workflow visualization data from the TTS workflow API
import { useState, useEffect } from "react";
import { API_CONFIG } from "../../config/environment";

/**
 * Get the access token from cookies (non-HttpOnly) or localStorage
 * @returns {string|null} The access token or null if not found
 */
const getAccessToken = () => {
  // Check for access_token in cookies (set by auth service)
  const tokenCookie = document.cookie
    .split('; ')
    .find(row => row.startsWith('access_token='));
  
  if (tokenCookie) {
    return tokenCookie.split('=')[1];
  }
  
  // Fallback to localStorage variants (for local dev or other auth methods)
  return localStorage.getItem('accessToken') 
    || localStorage.getItem('access_token')
    || sessionStorage.getItem('accessToken')
    || sessionStorage.getItem('access_token')
    || null;
};

export function useWorkflowProgress(ticketID) {
  const [tracker, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!ticketID) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Decide whether to send task_id (numeric) or ticket_id (string like TX...)
    const isNumeric = !Number.isNaN(Number(ticketID)) && String(ticketID).trim() !== "";
    const paramName = isNumeric ? "task_id" : "ticket_id";
    const paramValue = encodeURIComponent(ticketID);

    // Build the URL using the workflow API base URL from config
    // The Vite proxy will forward /workflow to workflow_api at localhost:8002
    const baseUrl = API_CONFIG.WORKFLOW?.BASE_URL || '/workflow';
    const url = `${baseUrl}/tasks/workflow-visualization/?${paramName}=${paramValue}`;

    // Build headers - try to get token for Authorization header
    const headers = {
      'Content-Type': 'application/json',
    };
    
    const token = getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Use credentials: 'include' to also send HttpOnly cookies
    fetch(url, { 
      credentials: 'include',
      headers
    })
      .then((res) => {
        if (!res.ok) {
          // Try to parse JSON error body for more details, fall back to statusText
          return res.text().then((text) => {
            try {
              const json = JSON.parse(text);
              const msg = json.detail || json.message || JSON.stringify(json);
              throw new Error(`HTTP ${res.status}: ${msg}`);
            } catch (e) {
              // Not JSON or parsing failed
              const fallback = text || res.statusText;
              throw new Error(`HTTP ${res.status}: ${fallback}`);
            }
          });
        }
        return res.json();
      })
      .then((data) => {
        console.log("✅ Workflow visualization response:", data);
        setData(data);
      })
      .catch((err) => {
        console.error("❌ Workflow visualization error:", err);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, [ticketID]);

  return { tracker, loading, error };
}

export default useWorkflowProgress;

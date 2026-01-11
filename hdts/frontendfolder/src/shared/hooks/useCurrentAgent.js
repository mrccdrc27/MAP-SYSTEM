// hooks/useCurrentAgent.js
// Hook to fetch current agent and ticket owner information from TTS workflow API /tasks/logs/
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

/**
 * Hook to fetch the current agent and ticket owner from TTS workflow API
 * 
 * @param {string} ticketId - The ticket ID (e.g., TX20260110595094)
 * @returns {Object} { currentAgent, ticketOwner, loading, error }
 * 
 * currentAgent shape when available:
 * {
 *   user_id: number,
 *   user_full_name: string,
 *   role: string,
 *   assigned_on: string (ISO date),
 *   status: string
 * }
 * 
 * ticketOwner shape when available:
 * {
 *   user_id: number,
 *   user_full_name: string,
 *   role: string,
 *   assigned_at: string (ISO date)
 * }
 */
export function useCurrentAgent(ticketId) {
  const [currentAgent, setCurrentAgent] = useState(null);
  const [ticketOwner, setTicketOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!ticketId) {
      setLoading(false);
      setCurrentAgent(null);
      setTicketOwner(null);
      return;
    }

    setLoading(true);
    setError(null);

    // Build the URL using the workflow API base URL from config
    // The Vite proxy will forward /workflow to workflow_api at localhost:8002
    const baseUrl = API_CONFIG.WORKFLOW?.BASE_URL || '/workflow';
    const url = `${baseUrl}/tasks/logs/?ticket_id=${encodeURIComponent(ticketId)}`;

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
          // Try to parse JSON error body for more details
          return res.text().then((text) => {
            throw new Error(text || res.statusText || `HTTP ${res.status}`);
          });
        }
        return res.json();
      })
      .then((data) => {
        // The API returns { task_id, ticket_id, workflow_id, ticket_owner: {...}, logs: [...] }
        // Find the current agent - the most recent log entry that is still active
        // (status is 'new' or 'in progress', not 'resolved', 'transferred', etc.)
        const logs = data.logs || [];
        
        // Extract ticket owner from the response
        if (data.ticket_owner) {
          setTicketOwner({
            user_id: data.ticket_owner.user_id,
            user_full_name: data.ticket_owner.user_full_name,
            role: data.ticket_owner.role,
            assigned_at: data.ticket_owner.assigned_at,
          });
        } else {
          setTicketOwner(null);
        }
        
        if (logs.length === 0) {
          setCurrentAgent(null);
          setLoading(false);
          return;
        }
        
        // Find the most recent active agent (status is 'new' or 'in progress')
        // The logs are ordered by assigned_on, so reverse to get most recent first
        const reversedLogs = [...logs].reverse();
        
        // First, try to find an agent currently working (status 'in progress')
        let activeAgent = reversedLogs.find(log => 
          log.status === 'in progress' || log.status === 'in_progress'
        );
        
        // If no one is in progress, find the most recently assigned agent with 'new' status
        if (!activeAgent) {
          activeAgent = reversedLogs.find(log => 
            log.status === 'new' || log.status === 'assigned'
          );
        }
        
        // If still no active agent, just get the most recent log entry
        // (could be resolved, transferred, etc. - still shows who last worked on it)
        if (!activeAgent && reversedLogs.length > 0) {
          activeAgent = reversedLogs[0];
        }
        
        if (activeAgent) {
          setCurrentAgent({
            user_id: activeAgent.user_id,
            user_full_name: activeAgent.user_full_name,
            role: activeAgent.role,
            assigned_on: activeAgent.assigned_on,
            status: activeAgent.status,
            step_name: activeAgent.assigned_on_step_name,
          });
        } else {
          setCurrentAgent(null);
        }
        
        setLoading(false);
      })
      .catch((err) => {
        console.warn('useCurrentAgent: Failed to fetch current agent:', err.message);
        setError(err.message);
        setCurrentAgent(null);
        setTicketOwner(null);
        setLoading(false);
      });
  }, [ticketId]);

  return { currentAgent, ticketOwner, loading, error };
}

export default useCurrentAgent;

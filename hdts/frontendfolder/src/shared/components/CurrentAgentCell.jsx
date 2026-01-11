// components/CurrentAgentCell.jsx
// A cell component that fetches and displays the current agent from TTS for a ticket
import { useCurrentAgent } from '../hooks/useCurrentAgent';

/**
 * Component to display the current agent for a ticket in table cells
 * Fetches from TTS /tasks/logs/ API
 * 
 * @param {string} ticketId - The ticket number (e.g., TX20260110595094)
 * @param {string} fallback - Fallback text to show if no agent is found (default: 'Unassigned')
 */
export function CurrentAgentCell({ ticketId, fallback = 'Unassigned' }) {
  const { currentAgent, loading, error } = useCurrentAgent(ticketId);

  if (loading) {
    return <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Loading...</span>;
  }

  if (error || !currentAgent) {
    return <span>{fallback}</span>;
  }

  return <span>{currentAgent.user_full_name}</span>;
}

export default CurrentAgentCell;

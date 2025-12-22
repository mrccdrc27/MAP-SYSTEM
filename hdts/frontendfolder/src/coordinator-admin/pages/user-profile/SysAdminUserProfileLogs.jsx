import React from 'react';
import LogsPanel from '../../../shared/components/LogsPanel';

// Component to adapt user activity logs into the shared LogsPanel shape
export default function SysAdminUserProfileLogs({ activityLogs = [] }) {
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const mapped = (activityLogs || []).map((log) => ({
    id: log.id,
    user: log.user || 'System',
    action: log.action,
    text: (() => {
      if (log.action) {
        const t = String(log.action).replace(/_/g, ' ').toLowerCase();
        return t.charAt(0).toUpperCase() + t.slice(1);
      }
      return log.text || '';
    })(),
    timestamp: formatTimestamp(log.timestamp),
    highlight: log.highlight,
  }));

  return <LogsPanel logs={mapped} />;
}

const ACTIVITY_LOGS = [
  {
    id: 1,
    userId: 1,
    userName: "Zoey Martinez",
    timestamp: "2025-06-01T09:15:00",
    action: "ticket_created",
    targetType: "ticket",
    targetId: "TCK-2025-001",
    details: "Created new ticket: Unable to Access Payroll System",
  },
  {
    id: 2,
    userId: 3,
    userName: "Rumi Nakamura",
    timestamp: "2025-06-01T10:30:00",
    action: "ticket_assigned",
    targetType: "ticket",
    targetId: "TCK-2025-001",
    details: "Assigned ticket to Rumi Nakamura",
  },
  {
    id: 3,
    userId: 3,
    userName: "Rumi Nakamura",
    timestamp: "2025-06-01T10:35:00",
    action: "status_changed",
    targetType: "ticket",
    targetId: "TCK-2025-001",
    details: "Changed status from New to In Progress",
  },
  {
    id: 4,
    userId: 3,
    userName: "Rumi Nakamura",
    timestamp: "2025-06-04T14:20:00",
    action: "status_changed",
    targetType: "ticket",
    targetId: "TCK-2025-001",
    details: "Changed status from In Progress to Resolved. Resolution: Password reset performed.",
  },
  {
    id: 5,
    userId: 1,
    userName: "Zoey Martinez",
    timestamp: "2025-06-05T16:30:00",
    action: "csat_submitted",
    targetType: "ticket",
    targetId: "TCK-2025-001",
    details: "Submitted CSAT rating: 5 stars. Ticket closed.",
  },
  {
    id: 6,
    userId: 2,
    userName: "Mira Chen",
    timestamp: "2025-06-10T10:30:00",
    action: "ticket_created",
    targetType: "ticket",
    targetId: "TCK-2025-002",
    details: "Created new ticket: Request New Marketing Software License",
  },
  {
    id: 7,
    userId: 3,
    userName: "Rumi Nakamura",
    timestamp: "2025-06-10T14:20:00",
    action: "ticket_assigned",
    targetType: "ticket",
    targetId: "TCK-2025-002",
    details: "Assigned ticket to Rumi Nakamura",
  },
  {
    id: 8,
    userId: 3,
    userName: "Rumi Nakamura",
    timestamp: "2025-06-10T14:25:00",
    action: "status_changed",
    targetType: "ticket",
    targetId: "TCK-2025-002",
    details: "Changed status from New to In Progress",
  },
  {
    id: 9,
    userId: 1,
    userName: "Zoey Martinez",
    timestamp: "2025-06-11T14:00:00",
    action: "ticket_created",
    targetType: "ticket",
    targetId: "TCK-2025-003",
    details: "Created new ticket: Printer Not Working - 3rd Floor",
  },
  {
    id: 10,
    userId: 3,
    userName: "Rumi Nakamura",
    timestamp: "2025-06-11T15:30:00",
    action: "ticket_assigned",
    targetType: "ticket",
    targetId: "TCK-2025-003",
    details: "Assigned ticket to Rumi Nakamura",
  },
  {
    id: 11,
    userId: 3,
    userName: "Rumi Nakamura",
    timestamp: "2025-06-12T09:00:00",
    action: "status_changed",
    targetType: "ticket",
    targetId: "TCK-2025-003",
    details: "Changed status from New to In Progress",
  },
  {
    id: 12,
    userId: 3,
    userName: "Rumi Nakamura",
    timestamp: "2025-06-12T09:30:00",
    action: "status_changed",
    targetType: "ticket",
    targetId: "TCK-2025-003",
    details: "Changed status from In Progress to Resolved. Resolution: Cleared internal paper jam sensor.",
  },
  {
    id: 13,
    userId: 2,
    userName: "Mira Chen",
    timestamp: "2025-06-12T15:45:00",
    action: "ticket_created",
    targetType: "ticket",
    targetId: "TCK-2025-004",
    details: "Created new ticket: Email Attachment Size Limit Issue",
  },
];

export const getUserActivityLogs = (userId) => {
  const stored = localStorage.getItem("activityLogs");
  const logs = stored ? JSON.parse(stored) : ACTIVITY_LOGS;
  if (!stored) localStorage.setItem("activityLogs", JSON.stringify(ACTIVITY_LOGS));
  return userId ? logs.filter(log => log.userId === userId) : logs;
};

export const getAllActivityLogs = () => {
  return getUserActivityLogs();
};

export const getActivityLogsByTicket = (ticketId) => {
  return getUserActivityLogs().filter(log => log.targetId === ticketId);
};

export const getRecentActivityLogs = (limit = 10) => {
  const logs = getUserActivityLogs();
  return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
};

export const logActivity = (userId, userName, action, targetType, targetId, details) => {
  const logs = getUserActivityLogs();
  const newLog = {
    id: logs.length > 0 ? Math.max(...logs.map(l => l.id)) + 1 : 1,
    userId,
    userName,
    timestamp: new Date().toISOString(),
    action,
    targetType,
    targetId,
    details,
  };
  logs.push(newLog);
  localStorage.setItem("activityLogs", JSON.stringify(logs));
  return newLog;
};

export const getActivityLogsByDateRange = (startDate, endDate) => {
  const logs = getUserActivityLogs();
  return logs.filter(log => {
    const logDate = new Date(log.timestamp);
    return logDate >= new Date(startDate) && logDate <= new Date(endDate);
  });
};

export default ACTIVITY_LOGS;

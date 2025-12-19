// notificationStorage.js - Comprehensive Notification System for Ticket Lifecycle
// Tracks all notifications from submission to resolution/closure/withdrawal

const NOTIFICATION_TYPES = {
  TICKET_SUBMITTED: "ticket_submitted",
  TICKET_ASSIGNED: "ticket_assigned",
  TICKET_ASSIGNED_TO_AGENT: "ticket_assigned_to_agent",
  STATUS_UPDATED: "status_updated",
  TICKET_IN_PROGRESS: "ticket_in_progress",
  TICKET_ON_HOLD: "ticket_on_hold",
  TICKET_RESOLVED: "ticket_resolved",
  TICKET_CLOSED: "ticket_closed",
  TICKET_REJECTED: "ticket_rejected",
  TICKET_WITHDRAWN: "ticket_withdrawn",
  CSAT_REQUESTED: "csat_requested",
  COMMENT_ADDED: "comment_added",
  FILE_ATTACHED: "file_attached",
  PRIORITY_CHANGED: "priority_changed",
  SLA_BREACH_WARNING: "sla_breach_warning",
  SLA_BREACHED: "sla_breached",
};

// Initial notification data
const NOTIFICATIONS = [
  {
    id: 1,
    userId: 1, // Zoey Martinez
    ticketNumber: "TCK-2025-001",
    type: NOTIFICATION_TYPES.TICKET_SUBMITTED,
    title: "Ticket Submitted Successfully",
    message: "Your ticket TCK-2025-001 'Unable to Access Payroll System' has been submitted and is awaiting coordinator review.",
    read: true,
    createdAt: "2025-06-01T09:15:00",
  },
  {
    id: 2,
    userId: 3, // Rumi Nakamura (Coordinator)
    ticketNumber: "TCK-2025-001",
    type: NOTIFICATION_TYPES.TICKET_SUBMITTED,
    title: "New Ticket Requires Review",
    message: "High priority ticket TCK-2025-001 from Zoey Martinez (Finance) requires coordinator review and assignment.",
    read: true,
    createdAt: "2025-06-01T09:15:00",
  },
  {
    id: 3,
    userId: 1, // Zoey Martinez
    ticketNumber: "TCK-2025-001",
    type: NOTIFICATION_TYPES.TICKET_ASSIGNED,
    title: "Ticket Assigned",
    message: "Your ticket TCK-2025-001 has been assigned to Rumi Nakamura (IT Support). Expected resolution by Jun 2, 2025.",
    read: true,
    createdAt: "2025-06-01T10:30:00",
  },
  {
    id: 4,
    userId: 3, // Rumi Nakamura (Agent)
    ticketNumber: "TCK-2025-001",
    type: NOTIFICATION_TYPES.TICKET_ASSIGNED_TO_AGENT,
    title: "New Ticket Assigned to You",
    message: "High priority ticket TCK-2025-001 'Unable to Access Payroll System' has been assigned to you. Due: Jun 2, 2025 9:15 AM.",
    read: true,
    createdAt: "2025-06-01T10:30:00",
  },
  {
    id: 5,
    userId: 1, // Zoey Martinez
    ticketNumber: "TCK-2025-001",
    type: NOTIFICATION_TYPES.TICKET_IN_PROGRESS,
    title: "Ticket In Progress",
    message: "Rumi Nakamura has started working on your ticket TCK-2025-001.",
    read: true,
    createdAt: "2025-06-01T11:00:00",
  },
  {
    id: 6,
    userId: 1, // Zoey Martinez
    ticketNumber: "TCK-2025-001",
    type: NOTIFICATION_TYPES.TICKET_RESOLVED,
    title: "Ticket Resolved",
    message: "Your ticket TCK-2025-001 has been resolved. Resolution: 'Password reset performed. User credentials updated in Active Directory.' Please rate your experience.",
    read: true,
    createdAt: "2025-06-04T14:20:00",
  },
  {
    id: 7,
    userId: 1, // Zoey Martinez
    ticketNumber: "TCK-2025-001",
    type: NOTIFICATION_TYPES.CSAT_REQUESTED,
    title: "Please Rate Your Experience",
    message: "Your ticket TCK-2025-001 is resolved. We'd love to hear your feedback! Please submit a CSAT rating.",
    read: true,
    createdAt: "2025-06-04T14:20:00",
  },
  {
    id: 8,
    userId: 3, // Rumi Nakamura
    ticketNumber: "TCK-2025-001",
    type: NOTIFICATION_TYPES.TICKET_CLOSED,
    title: "Ticket Closed",
    message: "Ticket TCK-2025-001 has been closed by Zoey Martinez after CSAT submission (5 stars).",
    read: true,
    createdAt: "2025-06-05T16:30:00",
  },
  {
    id: 9,
    userId: 2, // Mira Chen
    ticketNumber: "TCK-2025-002",
    type: NOTIFICATION_TYPES.TICKET_SUBMITTED,
    title: "Ticket Submitted Successfully",
    message: "Your ticket TCK-2025-002 'Request New Software License' has been submitted and is awaiting coordinator review.",
    read: true,
    createdAt: "2025-06-02T10:30:00",
  },
  {
    id: 10,
    userId: 2, // Mira Chen
    ticketNumber: "TCK-2025-002",
    type: NOTIFICATION_TYPES.TICKET_ASSIGNED,
    title: "Ticket Assigned",
    message: "Your ticket TCK-2025-002 has been assigned to Rumi Nakamura (IT Support). Expected resolution by Jun 4, 2025.",
    read: true,
    createdAt: "2025-06-02T14:30:00",
  },
  {
    id: 11,
    userId: 2, // Mira Chen
    ticketNumber: "TCK-2025-002",
    type: NOTIFICATION_TYPES.SLA_BREACH_WARNING,
    title: "SLA Breach Warning",
    message: "Your ticket TCK-2025-002 is approaching SLA deadline. Expected resolution by Jun 4, 2025.",
    read: true,
    createdAt: "2025-06-04T08:00:00",
  },
  {
    id: 12,
    userId: 2, // Mira Chen
    ticketNumber: "TCK-2025-002",
    type: NOTIFICATION_TYPES.TICKET_RESOLVED,
    title: "Ticket Resolved",
    message: "Your ticket TCK-2025-002 has been resolved. Resolution: 'Adobe Creative Cloud license procured and activated.' Please rate your experience.",
    read: false,
    createdAt: "2025-06-08T11:15:00",
  },
  {
    id: 13,
    userId: 2, // Mira Chen
    ticketNumber: "TCK-2025-002",
    type: NOTIFICATION_TYPES.CSAT_REQUESTED,
    title: "Please Rate Your Experience",
    message: "Your ticket TCK-2025-002 is resolved. We'd love to hear your feedback! Please submit a CSAT rating.",
    read: false,
    createdAt: "2025-06-08T11:15:00",
  },
  {
    id: 14,
    userId: 1, // Zoey Martinez
    ticketNumber: "TCK-2025-003",
    type: NOTIFICATION_TYPES.TICKET_SUBMITTED,
    title: "Ticket Submitted Successfully",
    message: "Your ticket TCK-2025-003 'Office Space Too Cold' has been submitted and is awaiting coordinator review.",
    read: true,
    createdAt: "2025-06-03T09:00:00",
  },
  {
    id: 15,
    userId: 1, // Zoey Martinez
    ticketNumber: "TCK-2025-003",
    type: NOTIFICATION_TYPES.TICKET_ASSIGNED,
    title: "Ticket Assigned",
    message: "Your ticket TCK-2025-003 has been assigned to Bobby Kim (Facilities). Expected resolution by Jun 6, 2025.",
    read: true,
    createdAt: "2025-06-03T11:30:00",
  },
  {
    id: 16,
    userId: 4, // Bobby Kim (Agent)
    ticketNumber: "TCK-2025-003",
    type: NOTIFICATION_TYPES.TICKET_ASSIGNED_TO_AGENT,
    title: "New Ticket Assigned to You",
    message: "Low priority ticket TCK-2025-003 'Office Space Too Cold' has been assigned to you. Due: Jun 6, 2025 9:00 AM.",
    read: false,
    createdAt: "2025-06-03T11:30:00",
  },
  {
    id: 17,
    userId: 1, // Zoey Martinez
    ticketNumber: "TCK-2025-003",
    type: NOTIFICATION_TYPES.TICKET_IN_PROGRESS,
    title: "Ticket In Progress",
    message: "Bobby Kim has started working on your ticket TCK-2025-003.",
    read: false,
    createdAt: "2025-06-03T15:20:00",
  },
  {
    id: 18,
    userId: 2, // Mira Chen
    ticketNumber: "TCK-2025-004",
    type: NOTIFICATION_TYPES.TICKET_SUBMITTED,
    title: "Ticket Submitted Successfully",
    message: "Your ticket TCK-2025-004 'Conference Room Booking System Not Working' has been submitted and is awaiting coordinator review.",
    read: false,
    createdAt: "2025-06-04T08:45:00",
  },
  {
    id: 19,
    userId: 3, // Rumi Nakamura (Coordinator)
    ticketNumber: "TCK-2025-004",
    type: NOTIFICATION_TYPES.TICKET_SUBMITTED,
    title: "New Ticket Requires Review",
    message: "Medium priority ticket TCK-2025-004 from Mira Chen (Marketing) requires coordinator review and assignment.",
    read: false,
    createdAt: "2025-06-04T08:45:00",
  },
];

// Helper function to get notifications from localStorage
const getNotificationsFromStorage = () => {
  const stored = localStorage.getItem("smartsupport_notifications");
  return stored ? JSON.parse(stored) : NOTIFICATIONS;
};

// Helper function to save notifications to localStorage
const saveNotificationsToStorage = (notifications) => {
  localStorage.setItem("smartsupport_notifications", JSON.stringify(notifications));
};

// Create a new notification
export const createNotification = (notificationData) => {
  const notifications = getNotificationsFromStorage();
  const newNotification = {
    id: notifications.length > 0 ? Math.max(...notifications.map(n => n.id)) + 1 : 1,
    ...notificationData,
    read: false,
    createdAt: new Date().toISOString(),
  };
  notifications.push(newNotification);
  saveNotificationsToStorage(notifications);
  return newNotification;
};

// Get all notifications for a specific user
export const getNotificationsByUser = (userId) => {
  const notifications = getNotificationsFromStorage();
  return notifications
    .filter(notification => notification.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

// Get unread notifications count for a user
export const getUnreadCount = (userId) => {
  const notifications = getNotificationsByUser(userId);
  return notifications.filter(notification => !notification.read).length;
};

// Get recent notifications (last 10)
export const getRecentNotifications = (userId) => {
  const notifications = getNotificationsByUser(userId);
  return notifications.slice(0, 10);
};

// Get notifications by ticket number
export const getNotificationsByTicket = (ticketNumber) => {
  const notifications = getNotificationsFromStorage();
  return notifications
    .filter(notification => notification.ticketNumber === ticketNumber)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

// Mark a notification as read
export const markAsRead = (notificationId) => {
  const notifications = getNotificationsFromStorage();
  const notification = notifications.find(n => n.id === notificationId);
  if (notification) {
    notification.read = true;
    saveNotificationsToStorage(notifications);
    return true;
  }
  return false;
};

// Mark all notifications as read for a user
export const markAllAsRead = (userId) => {
  const notifications = getNotificationsFromStorage();
  const updated = notifications.map(n => {
    if (n.userId === userId && !n.read) {
      return { ...n, read: true };
    }
    return n;
  });
  saveNotificationsToStorage(updated);
  return true;
};

// Delete a notification
export const deleteNotification = (notificationId) => {
  const notifications = getNotificationsFromStorage();
  const filtered = notifications.filter(n => n.id !== notificationId);
  saveNotificationsToStorage(filtered);
  return true;
};

// Clear all notifications for a user
export const clearAllNotifications = (userId) => {
  const notifications = getNotificationsFromStorage();
  const filtered = notifications.filter(n => n.userId !== userId);
  saveNotificationsToStorage(filtered);
  return true;
};

// Get all notifications (for admin/debugging)
export const getAllNotifications = () => {
  return getNotificationsFromStorage();
};

// Notification trigger functions for ticket lifecycle events

// Trigger when ticket is submitted
export const triggerTicketSubmittedNotifications = (ticket, employeeUser) => {
  // Notification to employee
  createNotification({
    userId: ticket.employeeId,
    ticketNumber: ticket.ticketNumber,
    type: NOTIFICATION_TYPES.TICKET_SUBMITTED,
    title: "Ticket Submitted Successfully",
    message: `Your ticket ${ticket.ticketNumber} '${ticket.subject}' has been submitted and is awaiting coordinator review.`,
  });

  // Notification to all coordinators (role: "Coordinator")
  const { getEmployeeUsers } = require("./employeeUserStorage");
  const coordinators = getEmployeeUsers().filter(user => user.role === "Coordinator");
  coordinators.forEach(coordinator => {
    createNotification({
      userId: coordinator.id,
      ticketNumber: ticket.ticketNumber,
      type: NOTIFICATION_TYPES.TICKET_SUBMITTED,
      title: "New Ticket Requires Review",
      message: `${ticket.priority} priority ticket ${ticket.ticketNumber} from ${ticket.employeeName} (${ticket.employeeDepartment}) requires coordinator review and assignment.`,
    });
  });
};

// Trigger when ticket is assigned
export const triggerTicketAssignedNotifications = (ticket, assignedUser) => {
  // Notification to employee
  createNotification({
    userId: ticket.employeeId,
    ticketNumber: ticket.ticketNumber,
    type: NOTIFICATION_TYPES.TICKET_ASSIGNED,
    title: "Ticket Assigned",
    message: `Your ticket ${ticket.ticketNumber} has been assigned to ${assignedUser.name} (${assignedUser.department}). Expected resolution by ${new Date(ticket.dueDate).toLocaleDateString()}.`,
  });

  // Notification to assigned agent
  createNotification({
    userId: ticket.assignedTo,
    ticketNumber: ticket.ticketNumber,
    type: NOTIFICATION_TYPES.TICKET_ASSIGNED_TO_AGENT,
    title: "New Ticket Assigned to You",
    message: `${ticket.priority} priority ticket ${ticket.ticketNumber} '${ticket.subject}' has been assigned to you. Due: ${new Date(ticket.dueDate).toLocaleString()}.`,
  });
};

// Trigger when ticket status changes to In Progress
export const triggerTicketInProgressNotification = (ticket) => {
  createNotification({
    userId: ticket.employeeId,
    ticketNumber: ticket.ticketNumber,
    type: NOTIFICATION_TYPES.TICKET_IN_PROGRESS,
    title: "Ticket In Progress",
    message: `${ticket.assignedToName} has started working on your ticket ${ticket.ticketNumber}.`,
  });
};

// Trigger when ticket is put On Hold
export const triggerTicketOnHoldNotification = (ticket, reason) => {
  createNotification({
    userId: ticket.employeeId,
    ticketNumber: ticket.ticketNumber,
    type: NOTIFICATION_TYPES.TICKET_ON_HOLD,
    title: "Ticket On Hold",
    message: `Your ticket ${ticket.ticketNumber} has been put on hold. Reason: ${reason || "Awaiting additional information."}`,
  });
};

// Trigger when ticket is resolved
export const triggerTicketResolvedNotifications = (ticket) => {
  // Notification to employee
  createNotification({
    userId: ticket.employeeId,
    ticketNumber: ticket.ticketNumber,
    type: NOTIFICATION_TYPES.TICKET_RESOLVED,
    title: "Ticket Resolved",
    message: `Your ticket ${ticket.ticketNumber} has been resolved. Resolution: '${ticket.resolutionNotes}' Please rate your experience.`,
  });

  // CSAT request notification
  createNotification({
    userId: ticket.employeeId,
    ticketNumber: ticket.ticketNumber,
    type: NOTIFICATION_TYPES.CSAT_REQUESTED,
    title: "Please Rate Your Experience",
    message: `Your ticket ${ticket.ticketNumber} is resolved. We'd love to hear your feedback! Please submit a CSAT rating.`,
  });
};

// Trigger when ticket is closed
export const triggerTicketClosedNotification = (ticket, closedBy) => {
  // Notification to assigned agent if closed by employee
  if (ticket.assignedTo && closedBy !== ticket.assignedTo) {
    createNotification({
      userId: ticket.assignedTo,
      ticketNumber: ticket.ticketNumber,
      type: NOTIFICATION_TYPES.TICKET_CLOSED,
      title: "Ticket Closed",
      message: `Ticket ${ticket.ticketNumber} has been closed by ${ticket.employeeName}${ticket.csatRating ? ` with CSAT rating: ${ticket.csatRating} stars` : ""}.`,
    });
  }

  // Notification to employee if closed by coordinator/admin
  if (closedBy !== ticket.employeeId) {
    createNotification({
      userId: ticket.employeeId,
      ticketNumber: ticket.ticketNumber,
      type: NOTIFICATION_TYPES.TICKET_CLOSED,
      title: "Ticket Closed",
      message: `Your ticket ${ticket.ticketNumber} has been closed by the system administrator.`,
    });
  }
};

// Trigger when ticket is rejected
export const triggerTicketRejectedNotification = (ticket, rejectionReason) => {
  createNotification({
    userId: ticket.employeeId,
    ticketNumber: ticket.ticketNumber,
    type: NOTIFICATION_TYPES.TICKET_REJECTED,
    title: "Ticket Rejected",
    message: `Your ticket ${ticket.ticketNumber} has been rejected. Reason: ${rejectionReason}`,
  });
};

// Trigger when ticket is withdrawn
export const triggerTicketWithdrawnNotification = (ticket) => {
  // Notification to assigned agent
  if (ticket.assignedTo) {
    createNotification({
      userId: ticket.assignedTo,
      ticketNumber: ticket.ticketNumber,
      type: NOTIFICATION_TYPES.TICKET_WITHDRAWN,
      title: "Ticket Withdrawn",
      message: `Ticket ${ticket.ticketNumber} has been withdrawn by ${ticket.employeeName}.`,
    });
  }

  // Notification to coordinators
  const { getEmployeeUsers } = require("./employeeUserStorage");
  const coordinators = getEmployeeUsers().filter(user => user.role === "Coordinator");
  coordinators.forEach(coordinator => {
    createNotification({
      userId: coordinator.id,
      ticketNumber: ticket.ticketNumber,
      type: NOTIFICATION_TYPES.TICKET_WITHDRAWN,
      title: "Ticket Withdrawn",
      message: `Ticket ${ticket.ticketNumber} from ${ticket.employeeName} has been withdrawn.`,
    });
  });
};

// Trigger when comment is added
export const triggerCommentAddedNotification = (ticket, commentedBy, comment) => {
  // Notify employee if comment is from agent
  if (commentedBy !== ticket.employeeId) {
    createNotification({
      userId: ticket.employeeId,
      ticketNumber: ticket.ticketNumber,
      type: NOTIFICATION_TYPES.COMMENT_ADDED,
      title: "New Comment on Your Ticket",
      message: `${ticket.assignedToName} added a comment to ticket ${ticket.ticketNumber}: "${comment.substring(0, 100)}${comment.length > 100 ? "..." : ""}"`,
    });
  }

  // Notify agent if comment is from employee
  if (ticket.assignedTo && commentedBy !== ticket.assignedTo) {
    createNotification({
      userId: ticket.assignedTo,
      ticketNumber: ticket.ticketNumber,
      type: NOTIFICATION_TYPES.COMMENT_ADDED,
      title: "New Comment from Employee",
      message: `${ticket.employeeName} added a comment to ticket ${ticket.ticketNumber}: "${comment.substring(0, 100)}${comment.length > 100 ? "..." : ""}"`,
    });
  }
};

// Trigger when priority changes
export const triggerPriorityChangedNotification = (ticket, oldPriority, newPriority) => {
  createNotification({
    userId: ticket.employeeId,
    ticketNumber: ticket.ticketNumber,
    type: NOTIFICATION_TYPES.PRIORITY_CHANGED,
    title: "Ticket Priority Updated",
    message: `Your ticket ${ticket.ticketNumber} priority has been changed from ${oldPriority} to ${newPriority}.`,
  });
};

// Trigger SLA breach warning (24 hours before due)
export const triggerSLABreachWarningNotification = (ticket) => {
  // Notify employee
  createNotification({
    userId: ticket.employeeId,
    ticketNumber: ticket.ticketNumber,
    type: NOTIFICATION_TYPES.SLA_BREACH_WARNING,
    title: "SLA Breach Warning",
    message: `Your ticket ${ticket.ticketNumber} is approaching SLA deadline. Expected resolution by ${new Date(ticket.dueDate).toLocaleString()}.`,
  });

  // Notify assigned agent
  if (ticket.assignedTo) {
    createNotification({
      userId: ticket.assignedTo,
      ticketNumber: ticket.ticketNumber,
      type: NOTIFICATION_TYPES.SLA_BREACH_WARNING,
      title: "SLA Breach Warning",
      message: `Ticket ${ticket.ticketNumber} is approaching SLA deadline (Due: ${new Date(ticket.dueDate).toLocaleString()}). Please prioritize.`,
    });
  }
};

// Trigger SLA breach notification
export const triggerSLABreachedNotification = (ticket) => {
  // Notify employee
  createNotification({
    userId: ticket.employeeId,
    ticketNumber: ticket.ticketNumber,
    type: NOTIFICATION_TYPES.SLA_BREACHED,
    title: "SLA Breached",
    message: `Your ticket ${ticket.ticketNumber} has exceeded its SLA target resolution time.`,
  });

  // Notify assigned agent
  if (ticket.assignedTo) {
    createNotification({
      userId: ticket.assignedTo,
      ticketNumber: ticket.ticketNumber,
      type: NOTIFICATION_TYPES.SLA_BREACHED,
      title: "SLA Breached",
      message: `Ticket ${ticket.ticketNumber} has breached SLA. Immediate action required.`,
    });
  }

  // Notify coordinators
  const { getEmployeeUsers } = require("./employeeUserStorage");
  const coordinators = getEmployeeUsers().filter(user => user.role === "Coordinator");
  coordinators.forEach(coordinator => {
    createNotification({
      userId: coordinator.id,
      ticketNumber: ticket.ticketNumber,
      type: NOTIFICATION_TYPES.SLA_BREACHED,
      title: "SLA Breached",
      message: `Ticket ${ticket.ticketNumber} has breached SLA. Review required.`,
    });
  });
};

export { NOTIFICATION_TYPES };

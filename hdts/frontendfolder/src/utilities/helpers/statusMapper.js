// statusMapper.js
// Centralized status mapping between Employee and Coordinator/Admin views

/**
 * Employee-visible statuses
 * - When coordinators/admins set a ticket to "New" or "Open", employees see "Pending"
 * - "In Progress" onwards are the same for both sides
 */
export const EMPLOYEE_STATUSES = [
  'Pending',
  'In Progress',
  'On Hold',
  'Withdrawn',
  'Resolved',
  'Closed',
  'Rejected'
];

/**
 * Coordinator/Admin-visible statuses
 * - "New" replaces "Submitted" (newly created tickets awaiting review)
 * - "Open" means ticket has been reviewed and assigned
 * - No "Resolved" status (goes straight from "In Progress" to "Closed")
 */
export const COORDINATOR_ADMIN_STATUSES = [
  'New',
  'Open',
  'In Progress',
  'On Hold',
  'Withdrawn',
  'Closed',
  'Rejected'
];

/**
 * Convert a status from Coordinator/Admin view to Employee view
 * @param {string} adminStatus - Status as stored/shown in admin side
 * @returns {string} Status as shown to employees
 */
export const toEmployeeStatus = (adminStatus) => {
  if (!adminStatus) return 'Pending';
  
  const normalized = adminStatus.toLowerCase().trim();
  
  // Map "New" and "Open" to "Pending" for employees
  if (normalized === 'new' || normalized === 'open' || normalized === 'submitted') {
    return 'Pending';
  }
  
  // All other statuses remain the same
  return adminStatus;
};

/**
 * Convert a status from Employee view to Coordinator/Admin view
 * Note: Employees can't directly set "New" or "Open" - they create tickets which start as "New"
 * @param {string} employeeStatus - Status as shown to employees
 * @returns {string} Status as stored/shown in admin side
 */
export const toAdminStatus = (employeeStatus) => {
  if (!employeeStatus) return 'New';
  
  const normalized = employeeStatus.toLowerCase().trim();
  
  // If employee somehow has "Pending", treat as "New" on admin side
  // (though in practice, admins change from New -> Open)
  if (normalized === 'pending') {
    return 'New';
  }
  
  // All other statuses remain the same
  return employeeStatus;
};

/**
 * Get the appropriate status label for display based on user role
 * @param {string} status - The stored status value
 * @param {string} userRole - 'Employee', 'Ticket Coordinator', or 'System Admin'
 * @returns {string} Display-friendly status label
 */
export const getDisplayStatus = (status, userRole) => {
  if (!status) return 'Pending';
  
  const isEmployee = userRole === 'Employee';
  
  if (isEmployee) {
    return toEmployeeStatus(status);
  }
  
  return status;
};

/**
 * Check if a status is considered "active" (not final)
 * @param {string} status - Status to check
 * @returns {boolean} True if status is active
 */
export const isActiveStatus = (status) => {
  const normalized = status?.toLowerCase().trim();
  const finalStatuses = ['closed', 'rejected', 'withdrawn'];
  return !finalStatuses.includes(normalized);
};

/**
 * Check if a status is considered "actionable" (can be approved/rejected)
 * Only "New" tickets can be opened or rejected by coordinators/admins
 * @param {string} status - Status to check
 * @returns {boolean} True if status is actionable
 */
export const isActionableStatus = (status) => {
  const normalized = status?.toLowerCase().trim();
  return normalized === 'new' || normalized === 'submitted';
};

/**
 * Get the next logical status in the workflow
 * @param {string} currentStatus - Current status
 * @param {string} userRole - User role making the change
 * @returns {string[]} Array of possible next statuses
 */
export const getNextStatuses = (currentStatus, userRole) => {
  const normalized = currentStatus?.toLowerCase().trim();
  const isCoordinator = userRole === 'Ticket Coordinator' || userRole === 'System Admin';
  
  if (!isCoordinator) {
    // Employees can only withdraw or close (if resolved)
    if (normalized === 'pending' || normalized === 'new' || normalized === 'open') {
      return ['Withdrawn'];
    }
    if (normalized === 'resolved') {
      return ['Closed', 'Withdrawn'];
    }
    return [];
  }
  
  // Coordinator/Admin workflow
  switch (normalized) {
    case 'new':
      return ['Open', 'Rejected'];
    case 'open':
      return ['In Progress', 'On Hold', 'Rejected'];
    case 'in progress':
      return ['On Hold', 'Closed'];
    case 'on hold':
      return ['In Progress', 'Closed'];
    default:
      return [];
  }
};

export default {
  EMPLOYEE_STATUSES,
  COORDINATOR_ADMIN_STATUSES,
  toEmployeeStatus,
  toAdminStatus,
  getDisplayStatus,
  isActiveStatus,
  isActionableStatus,
  getNextStatuses
};

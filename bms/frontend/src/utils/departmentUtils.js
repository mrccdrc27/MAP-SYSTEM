// src/utils/departmentUtils.js

/**
 * Extract department information from user object
 * Handles multiple possible field names from JWT/API
 */
export const getDepartmentInfo = (user) => {
  if (!user) return null;
  
  return {
    id: user.department_id || user.dept_id || null,
    name: user.department_name || user.department || user.dept_name || 'Unknown Department',
    // Short name for compact displays
    shortName: getShortDepartmentName(user.department_name || user.department)
  };
};

/**
 * Get abbreviated department name for compact displays
 */
export const getShortDepartmentName = (departmentName) => {
  if (!departmentName) return 'Unknown';
  
  const abbreviations = {
    'Finance Department': 'Finance',
    'Human Resources': 'HR',
    'IT Application & Data': 'IT',
    'Operations Department': 'Operations',
    'Marketing / Marketing Communications': 'Marketing',
    'Sales / Store Operations': 'Sales',
    'Logistics Management': 'Logistics',
    'Merchandising / Merchandise Planning': 'Merchandising'
  };
  
  return abbreviations[departmentName] || departmentName;
};

/**
 * Get department badge color class based on department
 */
export const getDepartmentBadgeClass = (departmentName) => {
  if (!departmentName) return 'dept-badge-default';
  
  const colorMap = {
    'Finance Department': 'dept-badge-finance',
    'Human Resources': 'dept-badge-hr',
    'IT Application & Data': 'dept-badge-it',
    'Operations Department': 'dept-badge-operations',
    'Marketing / Marketing Communications': 'dept-badge-marketing',
    'Sales / Store Operations': 'dept-badge-sales',
    'Logistics Management': 'dept-badge-logistics',
    'Merchandising / Merchandise Planning': 'dept-badge-merchandising'
  };
  
  return colorMap[departmentName] || 'dept-badge-default';
};

/**
 * Format department with icon for display
 */
export const formatDepartmentWithIcon = (departmentName) => {
  const iconMap = {
    'Finance Department': '💰',
    'Human Resources': '👥',
    'IT Application & Data': '💻',
    'Operations Department': '⚙️',
    'Marketing / Marketing Communications': '📢',
    'Sales / Store Operations': '🛒',
    'Logistics Management': '🚚',
    'Merchandising / Merchandise Planning': '📦'
  };
  
  return {
    icon: iconMap[departmentName] || '🏢',
    name: departmentName || 'Unknown Department',
    shortName: getShortDepartmentName(departmentName)
  };
};
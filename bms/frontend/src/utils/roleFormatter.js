// src/utils/roleFormatter.js

/**
 * Formats BMS role codes into user-friendly display text
 * @param {string} roleCode - The role code from the backend (e.g., 'FINANCE_HEAD', 'ADMIN')
 * @returns {string} Formatted role name for display
 */
export const formatRoleForDisplay = (roleCode) => {
  if (!roleCode) return 'User';
  
  const roleMap = {
    'ADMIN': 'Administrator',
    'FINANCE_HEAD': 'Finance Head',
    'GENERAL_USER': 'General User',
    'FINANCE_MANAGER': 'Finance Manager',
    'BUDGET_ANALYST': 'Budget Analyst',
    'DEPARTMENT_HEAD': 'Department Head',
  };
  
  // If we have a direct mapping, use it
  if (roleMap[roleCode]) {
    return roleMap[roleCode];
  }
  
  // Otherwise, convert SNAKE_CASE to Title Case
  return roleCode
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Alternative: Format with descriptive context
 * @param {string} roleCode - The role code from the backend
 * @returns {object} Role with icon and formatted text
 */
export const formatRoleWithIcon = (roleCode) => {
  const iconMap = {
    'ADMIN': '👑',
    'FINANCE_HEAD': '💼',
    'GENERAL_USER': '👤',
    'FINANCE_MANAGER': '📊',
    'BUDGET_ANALYST': '📈',
    'DEPARTMENT_HEAD': '🏢',
  };
  
  return {
    icon: iconMap[roleCode] || '👤',
    text: formatRoleForDisplay(roleCode)
  };
};

/**
 * Gets a shorter version of the role for compact displays
 * @param {string} roleCode - The role code from the backend
 * @returns {string} Short role name
 */
export const formatRoleShort = (roleCode) => {
  if (!roleCode) return 'User';
  
  const shortRoleMap = {
    'ADMIN': 'Admin',
    'FINANCE_HEAD': 'Finance Head',
    'GENERAL_USER': 'User',
    'FINANCE_MANAGER': 'Manager',
    'BUDGET_ANALYST': 'Analyst',
    'DEPARTMENT_HEAD': 'Dept Head',
  };
  
  return shortRoleMap[roleCode] || formatRoleForDisplay(roleCode);
};

/**
 * Gets role badge styling class
 * @param {string} roleCode - The role code from the backend
 * @returns {string} CSS class name for role badge
 */
export const getRoleBadgeClass = (roleCode) => {
  if (!roleCode) return 'role-badge-default';
  
  const styleMap = {
    'ADMIN': 'role-badge-admin',
    'FINANCE_HEAD': 'role-badge-head',
    'GENERAL_USER': 'role-badge-user',
    'FINANCE_MANAGER': 'role-badge-manager',
  };
  
  return styleMap[roleCode] || 'role-badge-default';
};